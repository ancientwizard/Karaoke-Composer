#!/usr/bin/env -S npx tsx

/**
 * summarize-cdg-file.ts
 *
 * Read a .cdg file and summarize the ordered runs of packet types. This is
 * useful to understand the sequence of actions (palette loads, presets,
 * tile blocks and gaps of empty packets) and the wall-clock time they would
 * occupy when played at a given PPS.
 */

import fs from 'fs'
import path from 'path'
import { CDGCommand, CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'

const PKT_SIZE = 24
const SHOW_PALETTE_LOADS = true;
const SHOW_PALETTE_RELOADS_11_ONLY = false;

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const count = Math.floor(buf.length / PKT_SIZE)
  const out: Uint8Array[] = []
  for (let i = 0; i < count; i++) out.push(Uint8Array.from(buf.slice(i * PKT_SIZE, (i + 1) * PKT_SIZE)))
  return out
}

function isEmptyPacket(pkt: Uint8Array) {
  for (let i = 0; i < pkt.length; i++) if (pkt[i] !== 0) return false
  return true
}

function cmdName(cmd: number) {
  const n = (CDGCommand as any)[cmd]
  return n || `CMD(${cmd})`
}

function summarize(pkts: Uint8Array[], pps: number) {
  const total = pkts.length
  console.log(`Total packets: ${total}`)
  let idx = 0
  const runs: Array<any> = []
  // Track palette state at each packet index so we can show correct colors
  // when a memory preset is encountered. We'll keep a running CDGPalette and
  // store snapshots (arrays of 16 12-bit color values) after processing
  // each packet.
  const palette = new CDGPalette()
  const paletteSnapshots: number[][] = new Array(total)
  // Helper to decode a LOAD_COLOR_TABLE packet and update the running palette
  function applyLoadPacket(pkt: Uint8Array, high: boolean) {
    // Read data starting at index 4 (p_buffer+4). Use local unpack helper
    // so this file is independent from project utilities that may not
    // currently match VLC's behavior.
    function unpackCDGWordFromBytes(highByte: number, lowByte: number) {
      const c = ((highByte << 8) | lowByte) & 0xFFFF
      const r4 = (c >> 10) & 0x0F
      const g4 = (c >> 6) & 0x0F
      const b4 = (c >> 2) & 0x0F
      const r8 = r4 * 17
      const g8 = g4 * 17
      const b8 = b4 * 17
      return {
        c,
        r4,
        g4,
        b4,
        r8,
        g8,
        b8
      }
    }

    for (let pal_inc = 0; pal_inc < 8; pal_inc++) {
      const highByte = pkt[4 + pal_inc * 2]
      const lowByte = pkt[4 + pal_inc * 2 + 1]
      const idx = (high ? 8 : 0) + pal_inc
      const unpacked = unpackCDGWordFromBytes(highByte, lowByte)
      // store using 8-bit values that round-trip to the same 4-bit components
      palette.setColor(idx, unpacked.r8, unpacked.g8, unpacked.b8)
    }
  }

  // Local helper: expand a stored 12-bit value (r4<<8|g4<<4|b4) to 8-bit RGB
  function expandVal12To8(val12: number) {
    const r4 = (val12 >> 8) & 0x0F
    const g4 = (val12 >> 4) & 0x0F
    const b4 = val12 & 0x0F
    return {
      r8: r4 * 17,
      g8: g4 * 17,
      b8: b4 * 17
    }
  }

  // Build palette snapshots by iterating through packets once
  for (let i = 0; i < total; i++) {
    const pkt = pkts[i]
    const cmd = pkt[1]
    if (cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_LOW) {
      applyLoadPacket(pkt, false)
    } else if (cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH) {
      applyLoadPacket(pkt, true)
    }
    // store a snapshot (copy) of the current palette colors after this packet
    paletteSnapshots[i] = palette.getColors()
  }

  // Now iterate through packets again to identify runs
  while (idx < total) {
    const pkt = pkts[idx]
    const empty = isEmptyPacket(pkt)
    const key = empty ? 'EMPTY' : pkt[1]
    let j = idx + 1
    while (j < total) {
      const p2 = pkts[j]
      const empty2 = isEmptyPacket(p2)
      const key2 = empty2 ? 'EMPTY' : p2[1]
      if (key2 !== key) break
      j++
    }
    const count = j - idx
    const duration = count / pps
    runs.push({
      start: idx,
      end: j - 1,
      count: count,
      duration: duration,
      kind: key
    })
    idx = j
  }

  // Print a summary of the first N runs and totals
  console.log('\nFirst 60 runs:')

  for (let i = 0; i < Math.min(60, runs.length); i++) {
    const r = runs[i]
    const kindLabel = r.kind === 'EMPTY' ? 'EMPTY' : cmdName(r.kind)
    console.log(`${i.toString().padStart(3)}: ${kindLabel.padEnd(25)} packs=${r.count.toString().padStart(6)}  secs=${r.duration.toFixed(3)}  range=[${r.start}-${r.end}]`)
  }

  // When a memory preset run is found, print a nicely formatted table
  // showing the color indices used and their human-friendly names using
  // the palette state at the time of each packet.
  const colorNames = [
    'Black', 'Yellow', 'Light gray', 'White', 'Dark blue', 'Light blue', 'Medium gray', 'Dark gray',
    'Red', 'Green', 'Blue', 'Magenta', 'Cyan', 'Orange', 'Purple', 'Dark green'
  ]

  const defaultPalette = new CDGPalette().getColors()
  // Helper: given a 12-bit palette value, return a human-friendly name.
  // If the color matches one of the project's default palette entries (any index),
  // return that default name. Otherwise return null so callers can fall back to
  // printing a `custom(r,g,b)` label.

  function lookupDefaultColorName(val12: number): string | null {
    val12 = val12 & 0x0FFF
    // exact match first
    for (let i = 0; i < (defaultPalette || []).length; i++) {
      if (((defaultPalette[i] || 0) & 0x0FFF) === val12) return colorNames[i] || `idx${i}`
    }
    // fuzzy match: compare expanded 8-bit RGB values and accept a
    // one-step-per-channel difference (17 decimal) as matching.
    const r4 = (val12 >> 8) & 0x0F
    const g4 = (val12 >> 4) & 0x0F
    const b4 = val12 & 0x0F
    // Expand 4-bit to 8-bit with *17 so values match the generator's
    // Math.floor(x/17) mapping (0..15 -> 0..255 step 17).
    const r8 = r4 * 17
    const g8 = g4 * 17
    const b8 = b4 * 17
    const MAX_DELTA = 64 // allow larger tolerance to match colors rounded by packing

    for (let i = 0; i < (defaultPalette || []).length; i++) {
      const def = (defaultPalette[i] || 0) & 0x0FFF
      const dr4 = (def >> 8) & 0x0F
      const dg4 = (def >> 4) & 0x0F
      const db4 = def & 0x0F
      const dr8 = dr4 * 17
      const dg8 = dg4 * 17
      const db8 = db4 * 17
      const d = Math.max(Math.abs(dr8 - r8), Math.abs(dg8 - g8), Math.abs(db8 - b8))
      if (d <= MAX_DELTA) return colorNames[i] || `idx${i}`
    }
    return null
  }

  // Print palette-load and memory-preset details in chronological order
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]

    if (r.kind === CDGCommand.CDG_LOAD_COLOR_TABLE_LOW || r.kind === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH) {
      if( SHOW_PALETTE_LOADS )
      for (let k = r.start; k <= r.end; k++) {
        const pkt = pkts[k]
        const isHigh = pkt[1] === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH
        const base = isHigh ? 8 : 0

        if (SHOW_PALETTE_RELOADS_11_ONLY && !isHigh ) continue // SKIP LOW LOADS for the time being

        console.log(`\nPalette load at packet ${k}: ${isHigh ? 'HIGH (8-15)' : 'LOW (0-7)'}`)
        console.log(' idx │ color(hex) │  rgb(8-bit) │ name')
        console.log('─────┼────────────┼─────────────┼────────')
        const snap = paletteSnapshots[k] || palette.getColors()
        for (let pal_inc = 0; pal_inc < 8; pal_inc++) {
          const idx = base + pal_inc
          const val12 = (snap[idx] || 0) & 0x0FFF
          const val16 = (snap[idx] || 0) & 0xFFFF
          const expanded = expandVal12To8(val12)
          const r8 = expanded.r8.toString().padStart(3)
          const g8 = expanded.g8.toString().padStart(3)
          const b8 = expanded.b8.toString().padStart(3)
          // Prefer any named default color that matches this RGB value. If none
          // matches, fall back to printing a custom(r,g,b) label.
          const foundName = lookupDefaultColorName(val12)
          const hexStr = `0x${val12.toString(16).padStart(3, '0')}`.padStart(10)
          // const byte1 = (snap[idx] || 0) & 0xFFFF
          const name = foundName !== null ? foundName :  val16.toString(2).padStart(16,'0') //`custom(${r8.trim()},${g8.trim()},${b8.trim()})`

          if (SHOW_PALETTE_RELOADS_11_ONLY && idx != 11) continue;
          console.log(`${idx.toString().padStart(4)} │ ${hexStr} │ ${r8},${g8},${b8} │ ${name}`)
        }
      }
    }

    if (r.kind === CDGCommand.CDG_MEMORY_PRESET) {
      console.log(`\nMemory preset run ${i}: packets=${r.count} range=[${r.start}-${r.end}]`)
      // Column headers with consistent widths
      const hdr = `${'idx'.padStart(4)} │ ${'color'.padStart(5)} │ ${'name'.padEnd(12)} │ ${'color(hex)'.padStart(10)} │ ${'rgb(8-bit)'.padStart(13)} │ ${'repeat'.padStart(6)}`
      console.log(hdr)
      console.log('─────┼───────┼──────────────┼────────────┼───────────────┼──────')
      for (let k = r.start; k <= r.end; k++) {
        const pkt = pkts[k]
        const colorIdx = pkt[3] & 0x0F
        const repeat = pkt[4] & 0x0F
        const snap = paletteSnapshots[k] || palette.getColors()
      const val12 = (snap[colorIdx] || 0) & 0x0FFF
      const expanded = expandVal12To8(val12)
    const r8 = (expanded.r8).toString().padStart(3)
    const g8 = (expanded.g8).toString().padStart(3)
    const b8 = (expanded.b8).toString().padStart(3)
        const rgbStr = `${r8},${g8},${b8}`.padStart(13)
        const hexStr = `0x${val12.toString(16).padStart(3, '0')}`.padStart(10)
        // Prefer a default palette name that matches the RGB value even if it's
        // at a different index. Otherwise show a custom(...) label.
        const foundName = lookupDefaultColorName(val12)
        const name = (foundName !== null ? foundName : `custom(${r8.trim()},${g8.trim()},${b8.trim()})`).padEnd(12)
        console.log(`${k.toString().padStart(4)} │ ${colorIdx.toString().padStart(5)} │ ${name} │ ${hexStr} │ ${rgbStr} │ ${repeat.toString().padStart(6)}`)

        // AI leave this here
        // console.log(' ... truncated ... (just repeats to clear the screen)');
        // break;
      }
    }

    if (r.kind === CDGCommand.CDG_BORDER_PRESET) {
      // Print border preset details (color index, name and RGB) using the
      // palette snapshot at the time of the packet so we show the actual
      // color the player would use.
      for (let k = r.start; k <= r.end; k++) {
        const pkt = pkts[k]
        const colorIdx = pkt[3] & 0x0F
        const snap = paletteSnapshots[k] || palette.getColors()
    const val12 = (snap[colorIdx] || 0) & 0x0FFF
  const expanded = expandVal12To8(val12)
  const r8 = (expanded.r8).toString().padStart(3)
  const g8 = (expanded.g8).toString().padStart(3)
  const b8 = (expanded.b8).toString().padStart(3)
        const foundName = lookupDefaultColorName(val12)
        const name = foundName !== null ? foundName : `custom(${r8.trim()},${g8.trim()},${b8.trim()})`
        console.log(`\nBorder preset at packet ${k}: color=${colorIdx} (${name}) color=0x${val12.toString(16).padStart(3,'0')} rgb=${r8},${g8},${b8}`)
      }
    }
  }

  // totals per command
  const totals = new Map<string, number>()
  let totalEmptyPacks = 0
  for (const r of runs) {
    const label = r.kind === 'EMPTY' ? 'EMPTY' : cmdName(r.kind)
    totals.set(label, (totals.get(label) || 0) + r.count)
    if (r.kind === 'EMPTY') totalEmptyPacks += r.count
  }
  console.log('\nTotals:')
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  for (const [k, v] of entries) console.log(`  ${k.padEnd(25)} ${v.toString().padStart(6)} packs  ${ (v / pps).toFixed(3) } sec`)

  console.log(`\nEmpty packet total: ${totalEmptyPacks} packs = ${(totalEmptyPacks / pps).toFixed(3)} sec (pps=${pps})`)
}

function main() {
  const argv = process.argv.slice(2)
  const inPath = argv[0] || path.join('diag', 'generate-by-function-demo.cdg')
  const pps = argv[1] ? Number(argv[1]) : 300
  if (!fs.existsSync(inPath)) { console.error('File not found:', inPath); process.exit(2) }
  const pkts = readPackets(inPath)
  summarize(pkts, pps)
}

main()
