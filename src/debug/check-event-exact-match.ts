#!/usr/bin/env -S npx tsx

import fs from 'fs'
import { VRAM, writeFontBlock } from '../cdg/encoder'
import { CDGCommand } from '../karaoke/renderers/cdg/CDGPacket'

function usage() {
  console.error('Usage: npx tsx src/debug/check-event-exact-match.ts <parsed.json> <reference.cdg> [startEventIndex] [count]')
  process.exit(2)
}

const argv = process.argv.slice(2)
if (argv.length < 2) usage()
const parsedPath = argv[0]
const referencePath = argv[1]
const startEvent = argv[2] ? Number(argv[2]) : 0
const count = argv[3] ? Number(argv[3]) : 5

if (!fs.existsSync(parsedPath)) { console.error('Parsed JSON not found:', parsedPath); process.exit(2) }
if (!fs.existsSync(referencePath)) { console.error('Reference CDG not found:', referencePath); process.exit(2) }

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf8'))
// Reconstruct events similar to generate-cdg-from-json.ts (TextClip/BMPClip handling simplified)
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'
import { CDG_SCREEN } from '../karaoke/renderers/cdg/CDGPacket'
import { CDG_PPS } from '../cdg/constants'

// Treat numeric times as milliseconds by default. Accept --times-in-packs to
// opt into pack units. This matches the main generator behavior.
const timesInPacksFlag = argv.includes('--times-in-packs')
const timesInMsFlag = argv.includes('--times-in-ms')
if (timesInPacksFlag && timesInMsFlag) console.warn('Both --times-in-packs and --times-in-ms provided; defaulting to --times-in-ms')
function timeToPacks(val: number | undefined, pps = CDG_PPS) {
  if (val == null) return 0
  if (timesInPacksFlag) return Math.floor(val)
  return Math.floor((val / 1000) * pps)
}

const pps = CDG_PPS
const textRenderer = new CDGTextRenderer()
const events: any[] = []
for (const clip of parsed.clips || []) {
  if (clip.type === 'TextClip') {
    const clipStart = clip.start || 0
    for (const ev of clip.events || []) {
      const evOff = ev.clip_time_offset || 0
      const startPack = timeToPacks((clipStart || 0) + (evOff || 0), pps)
      let evDurPacks = 0
      if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, pps)
      else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, pps)
      else evDurPacks = Math.ceil(pps * 2)
      const durationPacks = Math.max(1, evDurPacks)
      const tileRow = Math.floor((ev.clip_y_offset || 0) / CDG_SCREEN.TILE_HEIGHT)
      const tileCol = Math.floor((ev.clip_x_offset || 0) / CDG_SCREEN.TILE_WIDTH)
      const tiles = textRenderer.renderAt(clip.text || '', tileRow, tileCol)
      for (const t of tiles) {
        const pixels: number[][] = []
        for (let r = 0; r < Math.min(12, t.tileData.length); r++) {
          const rowbits = t.tileData[r]
          const rowArr: number[] = []
          for (let c = 0; c < 6; c++) {
            const bit = (rowbits >> (5 - c)) & 1
            rowArr.push(bit ? 1 : 0)
          }
          pixels.push(rowArr)
        }
        events.push({ blockX: t.col, blockY: t.row, pixels, startPack, durationPacks })
      }
    }
  }
}

if (events.length === 0) { console.error('No text events'); process.exit(2) }

// Read reference
const refBuf = fs.readFileSync(referencePath)
const pktSize = 24
const refPktCount = Math.floor(refBuf.length / pktSize)

// Find reservedStart similarly to generator: first non-empty +1 and include last init
let firstNonEmptyIdx: number | null = null
let lastInitIdx: number | null = null
for (let i = 0; i < refPktCount; i++) {
  let any = false
  for (let j = 1; j < 19; j++) if (refBuf[i * pktSize + j] !== 0) { any = true; break }
  if (any && firstNonEmptyIdx == null) firstNonEmptyIdx = i
  const cmd = refBuf[i * pktSize + 1] & 0x3F
  if (cmd === CDGCommand.CDG_MEMORY_PRESET || cmd === CDGCommand.CDG_BORDER_PRESET || cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_LOW || cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH) lastInitIdx = i
}
let reservedStart = (firstNonEmptyIdx != null) ? firstNonEmptyIdx + 1 : 0
if (lastInitIdx != null) reservedStart = Math.max(reservedStart, lastInitIdx + 1)
console.log('Reference refPktCount=', refPktCount, 'reservedStart=', reservedStart)

function pktEquals(a: Uint8Array | Buffer, b: Buffer) {
  const aa = Buffer.from(a)
  // Compare only up through byte 18 (exclude parity bytes at 19..22)
  const la = Math.min(19, aa.length)
  const lb = Math.min(19, b.length)
  if (la !== lb) return false
  return aa.slice(0, 19).equals(b.slice(0, 19))
}

// Replay reference prelude into a VRAM instance (best-effort). Applies
// MEMORY_PRESET and TILE_BLOCK/TILE_BLOCK_XOR packets to reconstruct VRAM
// contents up to reservedStart so generated packets reflect the same VRAM
// pre-state as the reference.
function replayPreludeToVRAM(buf: Buffer, uptoIdx: number) {
  const v = new VRAM()
  try {
    const maxIdx = Math.min(uptoIdx, Math.floor(buf.length / pktSize))
    const CDGPacketModule = require('../karaoke/renderers/cdg/CDGPacket')
    for (let pi = 0; pi < maxIdx; pi++) {
      const base = pi * pktSize
      const cmd = buf[base + 1] & 0x3F
      if (cmd === (CDGPacketModule.CDGCommand || {}).CDG_MEMORY_PRESET || cmd === 1) {
        const color = buf[base + 3] & 0x3F
        v.clear(color & 0x0F)
        continue
      }
      if (cmd === (CDGPacketModule.CDGCommand || {}).CDG_TILE_BLOCK || cmd === 6 || cmd === (CDGPacketModule.CDGCommand || {}).CDG_TILE_BLOCK_XOR || cmd === 38) {
        const row = buf[base + 5] & 0x3F
        const col = buf[base + 6] & 0x3F
        const colorA = buf[base + 3] & 0x3F
        const colorB = buf[base + 4] & 0x3F
        const isXor = (cmd === 38)
        const blockPixels: number[][] = []
        for (let y = 0; y < 12; y++) {
          const lineMask = buf[base + 7 + y] & 0x3F
          const rowArr: number[] = []
          for (let x = 0; x < 6; x++) {
            const bit = (lineMask >> (5 - x)) & 0x01
            if (isXor) {
              const prev = v.getPixel(col * 6 + x, row * 12 + y) & 0xFF
              rowArr.push((prev ^ (colorB & 0x0F)) & 0x0F)
            } else {
              rowArr.push(bit ? (colorB & 0x0F) : (colorA & 0x0F))
            }
          }
          blockPixels.push(rowArr)
        }
        v.writeBlock(col, row, blockPixels)
        continue
      }
    }
  } catch (e) {
    // best-effort
  }
  return v
}

function copyVRAM(orig: VRAM) {
  const v = new VRAM()
  v.data = new Uint8Array(orig.data)
  return v
}

// For each sampled event, generate packets using a VRAM that has the reference
// prelude replayed so packet bytes reflect the player's pre-state.
const basePreludeVRAM = replayPreludeToVRAM(refBuf, reservedStart)
const end = Math.min(events.length, startEvent + count)
for (let ei = startEvent; ei < end; ei++) {
  const ev = events[ei]
  const vram = copyVRAM(basePreludeVRAM)
  const pkts: Uint8Array[] = writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels)
  console.log(`\nEvent ${ei}: block=(${ev.blockX},${ev.blockY}) startPack=${ev.startPack} produced pkts=${pkts.length}`)
  if (!pkts || pkts.length === 0) { console.log(' no packets produced'); continue }
  const needed = pkts.length
  let found = -1
  for (let s = reservedStart; s <= refPktCount - needed; s++) {
    let ok = true
    for (let k = 0; k < needed; k++) {
      const refSlice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
      if (!pktEquals(pkts[k], refSlice)) { ok = false; break }
    }
    if (ok) { found = s; break }
  }
  if (found >= 0) {
    console.log(` Exact match found at reference index ${found} (>= reservedStart ${reservedStart})`)
  } else {
    // try full search (debug)
    let foundAny = -1
    for (let s = 0; s <= refPktCount - needed; s++) {
      let ok = true
      for (let k = 0; k < needed; k++) {
        const refSlice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
        if (!pktEquals(pkts[k], refSlice)) { ok = false; break }
      }
      if (ok) { foundAny = s; break }
    }
    if (foundAny >= 0) console.log(` Exact match found at reference index ${foundAny} (but < reservedStart)`)
    else console.log(' No exact match found in reference for this event')
  }
}

console.log('\nDone')
