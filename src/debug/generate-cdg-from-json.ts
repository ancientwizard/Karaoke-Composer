#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, writeFontBlock, VRAM, makeEmptyPacket } from '../cdg/encoder'
import { CDG_SCREEN, CDGCommand } from '../karaoke/renderers/cdg/CDGPacket'
import { CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'

function msToPacks(ms: number, pps = 75) {
  return Math.floor((ms / 1000) * pps)
}

  // Interpret time values from the parsed JSON: some fields are already in CDG packet
  // units (packs) while others may be in milliseconds. Heuristic: if value >= 1000
  // it's probably milliseconds; otherwise treat as packs.
  function timeToPacks(val: number | undefined, pps = 75) {
    if (val == null) return 0
    if (val >= 1000) return msToPacks(val, pps)
    return Math.floor(val)
  }

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 1) { console.error('Usage: npx tsx src/debug/generate-cdg-from-json.ts <parsed.json> [out.cdg]'); process.exit(2) }
  const inPath = argv[0]
  const outPath = argv[1] || path.join('diag', path.basename(inPath, path.extname(inPath)) + '.generated.cdg')
  const overrideDuration = argv[2] ? Number(argv[2]) : undefined
  // argv[3] may be either an numeric overrideReservedStart or the reference
  // CDG path depending on how the script is invoked. Be permissive and treat
  // argv[3] as a numeric override only when it parses to a finite number.
  const maybeArg3 = argv[3]
  const overrideReservedStart = (maybeArg3 && !Number.isNaN(Number(maybeArg3))) ? Number(maybeArg3) : undefined
  // Prefer explicit argv[4] for reference path; fall back to argv[3] when it
  // looks like a .cdg filename (common mistake in positional ordering).
  const referenceCdgPath = argv[4] ? argv[4] : (maybeArg3 && typeof maybeArg3 === 'string' && maybeArg3.toLowerCase().endsWith('.cdg') ? maybeArg3 : undefined)

  const buf = fs.readFileSync(inPath, 'utf8')
  const parsed = JSON.parse(buf)

  const pps = 75

  // Determine total duration in packet units from clips. The JSON times may be
  // expressed either as milliseconds or already in pack units; use timeToPacks
  // which auto-detects the unit.
  let maxEndPacks = 0
  for (const clip of parsed.clips || []) {
    const clipStart = clip.start || 0
    let clipMaxEventEnd = 0
    for (const ev of clip.events || []) {
      const evOff = ev.clip_time_offset || 0
      const evDur = ev.clip_time_duration || 0
      const evEnd = (evOff || 0) + (evDur || 0)
      clipMaxEventEnd = Math.max(clipMaxEventEnd, evEnd)
    }
    const clipEnd = (clipStart || 0) + Math.max(clipMaxEventEnd, clip.duration || 0)
    const clipEndPacks = timeToPacks(clipEnd, pps)
    maxEndPacks = Math.max(maxEndPacks, clipEndPacks)
  }
  const durationSeconds = overrideDuration || (Math.ceil((maxEndPacks || 75) / pps) + 1)

  // Build FontEvents from TextClips only (BMP clips not handled here)
  const textRenderer = new CDGTextRenderer()
  const palette = new CDGPalette()
  const paletteColors = palette.getColors()

  async function loadImage(filePath: string) {
    // Dynamically import Jimp to avoid ESM import shape issues in typings.
    const jm = await import('jimp')
    const dataBuf = fs.readFileSync(filePath)

    async function tryRead(arg: any) {
      if (typeof (jm as any).read === 'function') return await (jm as any).read(arg)
      if ((jm as any).default && typeof (jm as any).default.read === 'function') return await (jm as any).default.read(arg)
      if ((jm as any).Jimp && typeof (jm as any).Jimp.read === 'function') return await (jm as any).Jimp.read(arg)
      throw new Error('No readable Jimp API found')
    }

    let image: any
    try {
      image = await tryRead(filePath)
    } catch (e) {
      // fallback: try reading from a buffer
      image = await tryRead(dataBuf)
    }
    return {
      width: image.bitmap.width,
      height: image.bitmap.height,
      pixels: image.bitmap.data,
    }
  }

  function findNearestPaletteIndex(r: number, g: number, b: number) {
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < paletteColors.length; i++) {
      const col = paletteColors[i] || 0
      const pr = (col >> 8) & 0x0F
      const pg = (col >> 4) & 0x0F
      const pb = col & 0x0F
      const sr = pr * 17
      const sg = pg * 17
      const sb = pb * 17
      const d = (sr - r) * (sr - r) + (sg - g) * (sg - g) + (sb - b) * (sb - b)
      if (d < bestDist) { bestDist = d; best = i }
    }
    return best
  }

  const events: any[] = []
  for (const clip of parsed.clips || []) {
    if (clip.type === 'TextClip') {
      const clipStart = clip.start || 0
      const fg = (clip.foreground_color != null) ? clip.foreground_color : 1
      const bg = (clip.background_color != null) ? clip.background_color : 0
      for (const ev of clip.events || []) {
        const evOff = ev.clip_time_offset || 0
        // clip.start and clip_time_offset may already be expressed in packet units in the JSON
        const startPack = timeToPacks((clipStart || 0) + (evOff || 0), pps)
        // Prefer explicit event/clip durations when available. Fall back to a small
        // default (2s) rather than reserving the remainder of the entire timeline,
        // which spreads packets across too large a window and makes placements
        // diverge from the reference neighborhood.
        let evDurPacks = 0
        if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, pps)
        else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, pps)
        else evDurPacks = Math.ceil(pps * 2) // default to 2 seconds
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
              rowArr.push(bit ? fg : bg)
            }
            pixels.push(rowArr)
          }
          events.push({
 blockX: t.col, blockY: t.row, pixels, startPack, durationPacks 
})
        }
      }
      continue
    }

    // BMP clips: render bitmap into 6x12 tiles and map to nearest palette indices
    if (clip.type === 'BMPClip') {
      const clipStart = clip.start || 0
      for (const ev of clip.events || []) {
        const bmpRel = ev.bmp_path || clip.bmp_path
        if (!bmpRel) continue
        // Try several fallbacks for BMP path: relative to JSON dir, basename in that dir,
        // and the reference sample files directory.
  const candidates = []
  const relNorm = bmpRel.replace(/\\/g, '/')
  candidates.push(path.join(path.dirname(inPath), relNorm))
  candidates.push(path.join(path.dirname(inPath), path.basename(relNorm)))
  candidates.push(path.join('reference', 'cd+g-magic', 'Sample_Files', path.basename(relNorm)))
        let bmpPath: string | null = null
        for (const cand of candidates) {
          if (fs.existsSync(cand)) { bmpPath = cand; break }
        }
        try {
          if (!bmpPath) throw new Error('BMP not found in candidate paths: ' + candidates.join(', '))
          const bmp = await loadImage(bmpPath)
          const startCol = Math.floor((ev.x_offset || clip.x_offset || 0) / CDG_SCREEN.TILE_WIDTH)
          const startRow = Math.floor((ev.y_offset || clip.y_offset || 0) / CDG_SCREEN.TILE_HEIGHT)
          const tilesX = Math.ceil(bmp.width / CDG_SCREEN.TILE_WIDTH)
          const tilesY = Math.ceil(bmp.height / CDG_SCREEN.TILE_HEIGHT)
          for (let by = 0; by < tilesY; by++) {
            for (let bx = 0; bx < tilesX; bx++) {
              const pixels: number[][] = []
              for (let y = 0; y < CDG_SCREEN.TILE_HEIGHT; y++) {
                const rowArr: number[] = []
                for (let x = 0; x < CDG_SCREEN.TILE_WIDTH; x++) {
                  const px = bx * CDG_SCREEN.TILE_WIDTH + x
                  const py = by * CDG_SCREEN.TILE_HEIGHT + y
                  let idx = 0
                  if (px < bmp.width && py < bmp.height) {
                    const off = (py * bmp.width + px) * 4
                    const r = bmp.pixels[off + 0]
                    const g = bmp.pixels[off + 1]
                    const bcol = bmp.pixels[off + 2]
                    idx = findNearestPaletteIndex(r, g, bcol)
                  }
                  rowArr.push(idx)
                }
                pixels.push(rowArr)
              }
            const startPack = timeToPacks((clipStart || 0) + (ev.clip_time_offset || 0), pps)
            let evDurPacks = 0
            if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, pps)
            else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, pps)
            else evDurPacks = Math.ceil(pps * 2)
            const durationPacks = Math.max(1, evDurPacks)
              events.push({
 blockX: startCol + bx, blockY: startRow + by, pixels, startPack, durationPacks 
})
            }
          }
        } catch (e) {
          console.warn('Failed to load BMP', bmpPath, (e as any).message || e)
        }
      }
      continue
    }
    // other clip types ignored
  }

  if (events.length === 0) {
    console.error('No text events found in JSON input. Nothing to render.')
    process.exit(2)
  }

  console.log('Built events:', events.length)
  if (events.length > 0) {
    console.log('Sample event[0]:', JSON.stringify({
      blockX: events[0].blockX,
      blockY: events[0].blockY,
      startPack: events[0].startPack,
    }))
  }

  // Quick packet-production sanity check (without compositor) for first N events
  try {
    const vv = new VRAM()
    let produced = 0
    const maxCheck = Math.min(2000, events.length)
    for (let i = 0; i < maxCheck; i++) {
      const ev = events[i]
      const pk = writeFontBlock(vv, ev.blockX, ev.blockY, ev.pixels)
      produced += pk.length
    }
    console.log('Produced packets (first', maxCheck, 'events):', produced)
  } catch (e) {
    console.warn('Packet production sanity check failed:', (e as any).message || e)
  }

  // initial packets
  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(1)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  // Determine reservedStart: allow an override but fall back to initPkts.length
  let reservedStart = overrideReservedStart != null ? overrideReservedStart : initPkts.length
  if (!Number.isFinite(reservedStart)) {
    console.warn('Invalid reservedStart (not a finite number); falling back to initPkts.length')
    reservedStart = initPkts.length
  }
  console.log('Reserved start slots:', reservedStart, '(initPkts.length=', initPkts.length, ')')
  // If a reference CDG is provided and we can read it, detect where the
  // first tile packets (COPY/XOR) begin in the reference stream. Use that
  // index as the reservedStart so our placed font packets land in the same
  // neighborhood as the reference. This avoids collisions when the reference
  // has a long prelude of palette/memory/border packets.
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const pktSize = 24
      const refPktCount = Math.floor(refBuf.length / pktSize)
      // Find the first packet that contains any non-zero data in bytes 1..18
      let firstNonEmptyIdx: number | null = null
      let firstTileIdx: number | null = null
      for (let i = 0; i < refPktCount; i++) {
        // check for any non-zero data bytes (heuristic for meaningful packets)
        let any = false
        for (let j = 1; j < 19; j++) { if (refBuf[i * pktSize + j] !== 0) { any = true; break } }
        if (any && firstNonEmptyIdx == null) firstNonEmptyIdx = i
        const cmd = refBuf[i * pktSize + 1] & 0x3F
        if ((cmd === CDGCommand.CDG_TILE_BLOCK || cmd === CDGCommand.CDG_TILE_BLOCK_XOR) && firstTileIdx == null) firstTileIdx = i
        if (firstNonEmptyIdx != null && firstTileIdx != null) break
      }
      if (firstNonEmptyIdx != null) console.log('Reference CDG first non-empty packet at index:', firstNonEmptyIdx)
      if (firstTileIdx != null) console.log('Reference CDG first tile packet at index:', firstTileIdx)
      // Also detect where important init packets (palette, memory, border) occur
      // so we can include them in the copied prelude. Some references place
      // palette/memory packets later than the first non-empty packet; in that
      // case we must copy through the last init packet so the generated CDG
      // preserves the palette and memory presets players expect.
      let lastInitIdx: number | null = null;
      for (let i = 0; i < refPktCount; i++) {
        const cmd = refBuf[i * pktSize + 1] & 0x3F
        if (cmd === CDGCommand.CDG_MEMORY_PRESET || cmd === CDGCommand.CDG_BORDER_PRESET || cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_LOW || cmd === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH) {
          lastInitIdx = i
        }
      }
      if (lastInitIdx != null) console.log('Reference CDG last init packet (palette/memory/border) at index:', lastInitIdx)
      // Prefer using the first non-empty packet as part of the reserved prelude.
      // That means reserve the slots up through that packet (inclusive) so our
      // placements start after the reference's first meaningful packet. Use
      // firstNonEmptyIdx+1 to include that packet in the copied prelude.
      if (firstNonEmptyIdx != null) {
        if (overrideReservedStart == null) reservedStart = firstNonEmptyIdx + 1
      } else if (firstTileIdx != null) {
        if (overrideReservedStart == null) reservedStart = firstTileIdx
      } else {
        console.log('Reference CDG contains no meaningful packets; leaving reservedStart =', reservedStart)
      }
      // Ensure we reserve/copy through any init packets (palette/memory/border)
      if (lastInitIdx != null && overrideReservedStart == null) {
        reservedStart = Math.max(reservedStart, lastInitIdx + 1)
      }
    } catch (e) {
      console.warn('Could not read reference CDG to detect tile start:', (e as any).message || e)
    }
  }

  // Build an initial packetSlots array and, if a reference CDG is provided, copy the
  // reference prelude (packets before reservedStart) into these slots. Doing this
  // before calling the scheduler ensures the scheduler treats the prelude as occupied
  // and avoids placing font packets into that neighborhood.
  const pktSize = 24
  const totalPacks = Math.max(1, Math.ceil((durationSeconds || 1) * pps))
  const initialPacketSlots = new Array(totalPacks).fill(null).map(() => makeEmptyPacket())
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      const copyCount = Math.min(Math.max(0, Math.floor(reservedStart)), refPktCount)
      for (let i = 0; i < copyCount; i++) {
        const slice = refBuf.slice(i * pktSize, (i + 1) * pktSize)
        initialPacketSlots[i] = Uint8Array.from(slice)
      }
      // If reservedStart is smaller than our generated init packets, fill remaining init slots
      for (let i = copyCount; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
    } catch (e) {
      console.warn('Could not read reference CDG for init packet copy (pre-schedule):', (e as any).message || e)
      for (let i = 0; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
    }
  } else {
    for (let i = 0; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
  }

  // --- Match-by-pattern pre-scheduling pass ---
  // For each FontEvent produce the exact packets (via writeFontBlock) and
  // search the reference CDG for an exact contiguous occurrence. If found
  // and the corresponding slots in initialPacketSlots are free (or already
  // equal to the reference bytes), reserve those indices by copying the
  // reference packets into initialPacketSlots. Save a mapping file under tmp/.
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      const matches: any[] = []
      const searchStart = Math.max(0, Math.floor(reservedStart))
      for (let ei = 0; ei < events.length; ei++) {
        const ev = events[ei]
        try {
          const vv = new VRAM()
          const pktArr: Uint8Array[] = writeFontBlock(vv, ev.blockX, ev.blockY, ev.pixels)
          if (!pktArr || pktArr.length === 0) {
            matches.push({
              eventIndex: ei,
              matchedIndex: null,
            })
            continue
          }
          const needed = pktArr.length
          let foundIndex = -1
          // Search reference packet-aligned for an exact contiguous match
          for (let s = searchStart; s <= refPktCount - needed; s++) {
            let ok = true
            for (let k = 0; k < needed; k++) {
              const refSlice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
              const want = Buffer.from(pktArr[k])
              if (refSlice.length !== pktSize || Buffer.compare(refSlice, want) !== 0) { ok = false; break }
            }
            if (ok) { foundIndex = s; break }
          }
          if (foundIndex >= 0) {
            // Ensure we can reserve these slots (they must be empty or equal to ref)
            let canReserve = true
            for (let k = 0; k < needed; k++) {
              const slot = initialPacketSlots[foundIndex + k]
              if (!slot) continue
              const slotBuf = Buffer.from(slot)
              const empty = slotBuf.every((b) => b === 0)
              if (!empty) {
                const refSlice = refBuf.slice((foundIndex + k) * pktSize, (foundIndex + k + 1) * pktSize)
                if (Buffer.compare(slotBuf, refSlice) !== 0) { canReserve = false; break }
              }
            }
            if (canReserve) {
              for (let k = 0; k < needed; k++) {
                const slice = refBuf.slice((foundIndex + k) * pktSize, (foundIndex + k + 1) * pktSize)
                initialPacketSlots[foundIndex + k] = Uint8Array.from(slice)
              }
              matches.push({
                eventIndex: ei,
                blockX: ev.blockX,
                blockY: ev.blockY,
                startPack: ev.startPack,
                matchedIndex: foundIndex,
                length: needed,
              })
              continue
            }
          }
          matches.push({
            eventIndex: ei,
            blockX: ev.blockX,
            blockY: ev.blockY,
            startPack: ev.startPack,
            matchedIndex: null,
          })
        } catch (e) {
          matches.push({
            eventIndex: ei,
            matchedIndex: null,
            error: (e as any).message || String(e),
          })
        }
      }
      fs.mkdirSync('tmp', { recursive: true })
      const outObj = {
        reservedStart,
        matches,
      }
      fs.writeFileSync(path.join('tmp', 'match_by_pattern_map.json'), JSON.stringify(outObj, null, 2))
      const reservedCount = matches.filter((m) => m.matchedIndex != null).length
      console.log('Match-by-pattern pass complete. Reserved matches:', reservedCount)
    } catch (e) {
      console.warn('Match-by-pattern pass failed:', (e as any).message || e)
    }
  }

  const { packetSlots } = scheduleFontEvents(
    events,
    {
      durationSeconds,
      pps
    },
    reservedStart,
    initialPacketSlots
  )
  // Debug: count non-empty packet slots produced by scheduler before we place init packets
  const nonEmpty = packetSlots.reduce((acc, pkt) => acc + (pkt.some((b) => b !== 0) ? 1 : 0), 0)
  console.log('Scheduler produced non-empty slots before init copy:', nonEmpty)
  // find first non-empty index
  let firstNon = -1
  for (let i = 0; i < packetSlots.length; i++) {
    if (packetSlots[i].some((b) => b !== 0)) { firstNon = i; break }
  }
  console.log('First non-empty packet index (scheduler):', firstNon)
  // (init packets were pre-copied into initialPacketSlots before scheduling)

  // Write a diagnostic map of any match-by-pattern reservations we made (if any).
  // This file is populated by the pre-scheduling pass below. If it doesn't
  // exist then no matches were found/reserved.
  try {
    const mapPath = path.join('tmp', 'match_by_pattern_map.json')
    if (fs.existsSync(mapPath)) console.log('Match-by-pattern map:', mapPath)
  } catch (e) {
    // ignore
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)
}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
