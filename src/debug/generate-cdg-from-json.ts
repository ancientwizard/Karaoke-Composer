#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, writeFontBlock, VRAM } from '../cdg/encoder'
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
  const overrideReservedStart = argv[3] ? Number(argv[3]) : undefined
  const referenceCdgPath = argv[4] ? argv[4] : undefined

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
      let firstTileIdx: number | null = null
      for (let i = 0; i < refPktCount; i++) {
        const cmd = refBuf[i * pktSize + 1]
        if (cmd === (CDGCommand.CDG_TILE_BLOCK & 0x3F) || cmd === (CDGCommand.CDG_TILE_BLOCK_XOR & 0x3F)) { firstTileIdx = i; break }
      }
      if (firstTileIdx != null) {
        console.log('Reference CDG first tile packet at index:', firstTileIdx)
        // adopt the reference tile start as reservedStart unless an explicit override was given
        if (overrideReservedStart == null) reservedStart = firstTileIdx
      } else {
        console.log('Reference CDG contains no tile packets; leaving reservedStart =', reservedStart)
      }
    } catch (e) {
      console.warn('Could not read reference CDG to detect tile start:', (e as any).message || e)
    }
  }

  const { packetSlots } = scheduleFontEvents(
    events,
    {
      durationSeconds,
      pps
    },
    reservedStart
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
  // place initial packets at the start of the stream (indices 0..initPkts.length-1)
  // If a reference CDG path is provided, copy its initial packets verbatim from the start of the
  // reference file to guarantee identical initial palette/memory/border state (useful when porting).
  const pktSize = 24
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      // Copy reference packets up to reservedStart so our scheduled packets align
      const copyCount = Math.min(Math.max(0, Math.floor(reservedStart)), refPktCount)
      for (let i = 0; i < copyCount; i++) {
        const slice = refBuf.slice(i * pktSize, (i + 1) * pktSize)
        packetSlots[i] = Uint8Array.from(slice)
      }
      // If reservedStart is smaller than our generated init packets, fill remaining init slots
      for (let i = copyCount; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]
    } catch (e) {
      console.warn('Could not read reference CDG for init packet copy:', (e as any).message || e)
      for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]
    }
  } else {
    for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)
}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
