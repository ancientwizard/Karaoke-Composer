#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, writeFontBlock, VRAM, makeEmptyPacket, TV_GRAPHICS, COPY_FONT, XOR_FONT } from '../cdg/encoder'
import { CDG_SCREEN, CDGCommand } from '../karaoke/renderers/cdg/CDGPacket'
import { CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'
import { msToPacks, timeToPacks, computeDurationSecondsFromParsedJson } from '../cdg/utils'

// Interpret time values from the parsed JSON: some fields are already in CDG packet
// units (packs) while others may be in milliseconds. We will select explicit
// semantics inside main() based on CLI flags (see --times-in-ms / --times-in-packs).

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 1) { console.error('Usage: npx tsx src/debug/generate-cdg-from-json.ts <parsed.json> [out.cdg] [--duration-seconds N] [--pps N] [--reference <path>]'); process.exit(2) }
  const inPath = argv[0]
  const outPath = argv[1] || path.join('diag', path.basename(inPath, path.extname(inPath)) + '.generated.cdg')
  // Duration: prefer explicit named flag --duration-seconds N. For backward
  // compatibility we still accept a third positional numeric arg (deprecated)
  // but recommend using the named flag. When absent the duration is computed
  // from the presentation and the configured `pps`.
  let overrideDuration: number | undefined = undefined
  const durationFlagIndex = argv.indexOf('--duration-seconds')
  if (durationFlagIndex !== -1 && argv.length > durationFlagIndex + 1) {
    const v = Number(argv[durationFlagIndex + 1])
    if (!Number.isNaN(v) && v > 0) overrideDuration = v
  } else if (argv[2] && !String(argv[2]).startsWith('-')) {
    // Backwards-compatible positional numeric (deprecated)
    const v = Number(argv[2])
    if (!Number.isNaN(v) && v > 0) {
      overrideDuration = v
      console.warn('DEPRECATION: positional duration arg is deprecated; use --duration-seconds N')
    }
  }

  // argv[3] may be either an numeric overrideReservedStart or the reference
  // CDG path depending on how the script is invoked. Be permissive and treat
  // argv[3] as a numeric override only when it parses to a finite number.
  const maybeArg3 = argv[3]
  const overrideReservedStart = (maybeArg3 && !Number.isNaN(Number(maybeArg3))) ? Number(maybeArg3) : undefined
  // Allow an explicit named flag for the reference CDG to avoid positional
  // ambiguity when other flags are present. Usage: --reference <path>
  const refFlagIndex = argv.indexOf('--reference')
  let referenceCdgPath: string | undefined
  if (refFlagIndex !== -1 && argv.length > refFlagIndex + 1) {
    referenceCdgPath = argv[refFlagIndex + 1]
  } else {
    // Prefer explicit argv[4] for reference path; fall back to argv[3] when it
    // looks like a .cdg filename (common mistake in positional ordering).
    referenceCdgPath = argv[4] ? argv[4] : (maybeArg3 && typeof maybeArg3 === 'string' && maybeArg3.toLowerCase().endsWith('.cdg') ? maybeArg3 : undefined)
  }
  // Optional: --match-map <path> to a JSON file (produced by the replayer diagnostic)
  const matchMapIndex = argv.indexOf('--match-map')
  const matchMapPath = matchMapIndex !== -1 && argv.length > matchMapIndex + 1 ? argv[matchMapIndex + 1] : undefined
  // Optional: --zero-after-seconds <n> will zero all generated packets at or after n seconds
  const zeroAfterIndex = argv.indexOf('--zero-after-seconds')
  const zeroAfterSeconds = zeroAfterIndex !== -1 && argv.length > zeroAfterIndex + 1 ? Number(argv[zeroAfterIndex + 1]) : undefined
  // Optional: --copy-types-after-seconds <n> and --copy-types <comma-list>
  const copyTypesAfterIndex = argv.indexOf('--copy-types-after-seconds')
  const copyTypesAfterSeconds = copyTypesAfterIndex !== -1 && argv.length > copyTypesAfterIndex + 1 ? Number(argv[copyTypesAfterIndex + 1]) : undefined
  const copyTypesIndex = argv.indexOf('--copy-types')
  const copyTypesList = copyTypesIndex !== -1 && argv.length > copyTypesIndex + 1 ? String(argv[copyTypesIndex + 1]).split(',').map((s) => s.trim()).filter(Boolean) : undefined
  const copyAllAfterIndex = argv.indexOf('--copy-all-after-seconds')
  const copyAllAfterSeconds = copyAllAfterIndex !== -1 && argv.length > copyAllAfterIndex + 1 ? Number(argv[copyAllAfterIndex + 1]) : undefined

  // Time unit selection flags: prefer explicit CLI flags over heuristics.
  const timesInPacksFlag = argv.includes('--times-in-packs')
  const timesInMsFlag = argv.includes('--times-in-ms')
  if (timesInPacksFlag && timesInMsFlag) {
    console.warn('Both --times-in-packs and --times-in-ms provided; defaulting to --times-in-ms')
  }

  // Allow disabling prelude copy when users want a strict, scheduler-only
  // generation (useful when specifying an explicit --duration-seconds and
  // the reference prelude is long enough to consume most of the timeline).
  const noPreludeCopyFlag = argv.includes('--no-prelude-copy')

  // Use shared helper: pass the CLI flags through to the utility so it knows
  // whether to interpret values as ms or pack counts.

  const buf = fs.readFileSync(inPath, 'utf8')
  const parsed = JSON.parse(buf)

  // Default packets-per-second for file-based CDG outputs. Historically
  // we used 75 (CD audio frames/sec having 1 bit each), but players operating on CDG files
  // ALWAYS expect a higher CDG packet rate when mapping packet indices
  // to wall-clock time. Default to 300pps for file generation. A user can
  // override with the --pps <value> CLI flag.
  const ppsIndex = argv.indexOf('--pps')
  let pps = 300
  if (ppsIndex !== -1 && argv.length > ppsIndex + 1) {
    const maybe = Number(argv[ppsIndex + 1])
    if (Number.isFinite(maybe) && maybe > 0) pps = maybe
    else console.warn('Invalid --pps value; falling back to default 300')
  }

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
    const clipEndPacks = timeToPacks(clipEnd, pps, timesInMsFlag, timesInPacksFlag)
    maxEndPacks = Math.max(maxEndPacks, clipEndPacks)
  }
  // Small helper to compute the output duration (seconds) from the parsed
  // JSON timeline. Behavior:
  //  - If the JSON provides an explicit top-level duration (seconds or ms),
  //    prefer that value exactly.
  //  - Otherwise, convert the computed `maxEndPacksEstimate` to seconds using
  //    the supplied `pps` and add a one-second padding.
  //  - If we cannot determine a duration (no explicit field and no timeline
  //    events), fall back to a conservative 20-second default to avoid
  //    producing empty/invalid outputs.
  // Use shared computeDurationSecondsFromParsedJson from utils (keeps same semantics)
  // Compute output duration (seconds).
  // Priority: explicit override (--duration-seconds or deprecated positional) ->
  // otherwise derive duration from the parsed JSON timeline (maxEndPacks) and
  // the configured `pps`. Even when a reference CDG is supplied we prefer the
  // JSON timeline as the authoritative source of presentation duration; the
  // reference is used only for prelude copying / diagnostics.
  let durationSeconds: number
  if (overrideDuration && Number.isFinite(overrideDuration) && overrideDuration > 0) {
    durationSeconds = overrideDuration
  } else {
    // Compute duration from the JSON timeline (authoritative). This returns
    // exactly what the JSON indicates when available. If the timeline cannot be
    // computed (malformed/empty JSON), fall back to 20s to avoid producing a
    // very short/empty file. Users can override with --duration-seconds.
    durationSeconds = computeDurationSecondsFromParsedJson(parsed, maxEndPacks, pps, 20)
    if (referenceCdgPath) console.log(`Reference provided (${referenceCdgPath}) — duration computed from JSON timeline: maxEndPacks=${maxEndPacks} -> ${durationSeconds}s at ${pps}pps`)
    else console.log(`Duration computed from JSON timeline: maxEndPacks=${maxEndPacks} -> ${durationSeconds}s at ${pps}pps`)
  }

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
  const startPack = timeToPacks((clipStart || 0) + (evOff || 0), pps, timesInMsFlag, timesInPacksFlag)
        // Prefer explicit event/clip durations when available. Fall back to a small
        // default (2s) rather than reserving the remainder of the entire timeline,
        // which spreads packets across too large a window and makes placements
        // diverge from the reference neighborhood.
        let evDurPacks = 0
  if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, pps, timesInMsFlag, timesInPacksFlag)
  else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, pps, timesInMsFlag, timesInPacksFlag)
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
            const startPack = timeToPacks((clipStart || 0) + (ev.clip_time_offset || 0), pps, timesInMsFlag, timesInPacksFlag)
            let evDurPacks = 0
            if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, pps, timesInMsFlag, timesInPacksFlag)
            else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, pps, timesInMsFlag, timesInPacksFlag)
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
  // Ensure reservedStart does not reserve the entire output. If the reference
  // prelude is longer than the target duration we must shrink reservedStart so
  // the scheduler can still place font packets. Leave at least one writable
  // slot (preferably two) at the tail so placements can occur. This avoids a
  // pathological case where reservedStart === packetSlots.length-1 which
  // effectively blocks all writes.
  if (reservedStart >= initialPacketSlots.length - 1) {
    const old = reservedStart
    if (initialPacketSlots.length <= 2) {
      reservedStart = 0
    } else {
      reservedStart = initialPacketSlots.length - 2
    }
    console.warn('Adjusted reservedStart from', old, 'to', reservedStart, 'to leave room for placements (totalPacks=', initialPacketSlots.length, ')')
  }
  // NOTE: do not alter reservedStart further here. Explicit duration should
  // only affect the computed output duration; it must not silently change
  // how much of the reference prelude we copy. Users may opt out of copying
  // the prelude entirely with --no-prelude-copy.
  // replayPreludeToVRAM helper removed — it was unused and triggered linter
  // warnings. If VRAM replay diagnostics are needed in future we can
  // reintroduce a trimmed helper behind a diagnostics flag.
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      if (noPreludeCopyFlag) {
        console.log('--no-prelude-copy set: skipping copying reference prelude and using only generated init packets')
      }
      const copyCount = noPreludeCopyFlag ? 0 : Math.min(Math.max(0, Math.floor(reservedStart)), refPktCount)
      for (let i = 0; i < copyCount; i++) {
        const slice = refBuf.slice(i * pktSize, (i + 1) * pktSize)
        initialPacketSlots[i] = Uint8Array.from(slice)
      }
      // If reservedStart/copyCount is smaller than our generated init packets,
      // fill remaining init slots from the synthetic init packets so the file
      // still contains palette/border/memory presets.
      for (let i = copyCount; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
      // Diagnostic: report what we copied from the reference prelude
      try {
        const copied = initialPacketSlots.slice(0, Math.min(initialPacketSlots.length, Math.max(0, Math.floor(reservedStart))));
        const nonEmpty = copied.reduce((acc, s) => acc + (Buffer.from(s).some((b) => b !== 0) ? 1 : 0), 0)
        console.log(`Reference prelude copy: reference=${referenceCdgPath}, refPktCount=${refPktCount}, reservedStart=${reservedStart}, copyCount=${copyCount}, nonEmptySlotsInPrelude=${nonEmpty}`)
        const show = Math.min(10, copied.length)
        for (let i = 0; i < show; i++) {
          const hex = Buffer.from(copied[i]).toString('hex').slice(0, 64)
          console.log(`prelude[${i}] = ${hex}`)
        }
      } catch (e) {
        // ignore diagnostic failures
      }

  // If a match map is provided, attempt to copy matched slices from the reference
  // unless the user explicitly disabled prelude copying.
  if (!noPreludeCopyFlag && matchMapPath) {
        try {
          const mapBuf = fs.readFileSync(matchMapPath, 'utf8')
          const mapObj = JSON.parse(mapBuf)
          const mlist = mapObj.matches || []
          let applied = 0
          for (const m of mlist) {
            if (m && m.matchedIndex != null) {
              const sIdx = Number(m.matchedIndex)
              if (!Number.isFinite(sIdx) || sIdx < 0 || sIdx >= refPktCount) continue
              // Estimate needed packet count by generating packets for the event
              const ei = Number(m.eventIndex)
              const ev = events[ei]
              if (!ev) continue
              try {
                const vv = new VRAM()
                const pkts = writeFontBlock(vv, ev.blockX, ev.blockY, ev.pixels)
                const needed = pkts.length || 1
                for (let k = 0; k < needed; k++) {
                  const idx = sIdx + k
                  if (idx >= initialPacketSlots.length) break
                  const slice = refBuf.slice(idx * pktSize, (idx + 1) * pktSize)
                  initialPacketSlots[idx] = Uint8Array.from(slice)
                }
                applied++
              } catch (e) {
                // ignore per-event failures
              }
            }
          }
          console.log(`Applied ${applied} matched slices from match-map ${matchMapPath}`)
        } catch (e) {
          console.warn('Could not apply match-map:', (e as any).message || e)
        }
      }
    } catch (e) {
      console.warn('Could not read reference CDG for init packet copy (pre-schedule):', (e as any).message || e)
      for (let i = 0; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
    }
  } else {
    for (let i = 0; i < initPkts.length && i < initialPacketSlots.length; i++) initialPacketSlots[i] = initPkts[i]
  }

  // --- Match-by-pattern / coordinate pre-scheduling pass ---
  // Two modes:
  //  - exact match (legacy): generate the packet sequence and search for a
  //    byte-for-byte contiguous occurrence in the reference.
  //  - coordinate match (--match-coord): search the reference for contiguous
  //    runs of tile packets that target the same blockX/blockY and reserve
  //    those reference packets. This is less strict but robust to VRAM
  //    pre-state differences and faster to find matches.
  const matchByCoord = argv.includes('--match-coord')
  if (referenceCdgPath) {
    try {
      const refBuf = fs.readFileSync(referenceCdgPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      const matches: any[] = []
      // If performing exact-byte mode, build a ReferenceReplayer to reconstruct
      // VRAM at arbitrary packet indices. This allows generating packets from
      // the same VRAM pre-state as the reference when searching for exact
      // byte-for-byte matches.
      let replayer: any = null
      if (!matchByCoord) {
        try {
          const { ReferenceReplayer } = await import('../cdg/referenceReplayer')
          replayer = new ReferenceReplayer(referenceCdgPath, pktSize, 512)
        } catch (e) {
          console.warn('Could not instantiate ReferenceReplayer:', (e as any).message || e)
          replayer = null
        }
      }
      // reference to replayer to avoid 'assigned but never used' lint complaints
      if (replayer) {
        /* no-op: replayer is available for potential VRAM-based comparisons */
      }
      // Respect reserved prelude by default when searching for matches.
      const searchStart = Math.max(0, Math.floor(reservedStart))
      console.log('Starting match-by-pattern pass', matchByCoord ? '(coordinate mode)' : '(exact-byte mode)', 'searchStart=', searchStart, 'refPktCount=', refPktCount)

      for (let ei = 0; ei < events.length; ei++) {
        const ev = events[ei]
        try {
          if (matchByCoord) {
            // Coordinate-based search: find a contiguous run of packets in the
            // reference where each packet targets the same block coordinates.
            let foundIndex: number | null = null
            let foundLen = 0
            for (let s = searchStart; s < refPktCount; s++) {
              const b0 = refBuf[s * pktSize]
              const b1 = refBuf[s * pktSize + 1]
              // only consider TV_GRAPHICS tile-like commands
              if (b0 !== TV_GRAPHICS) continue
              if (b1 !== COPY_FONT && b1 !== XOR_FONT) continue
              const yBlock = refBuf[s * pktSize + 8]
              const xBlock = refBuf[s * pktSize + 9]
              if (yBlock !== (ev.blockY & 0x3F) || xBlock !== (ev.blockX & 0x3F)) continue
              // extend run
              let runLen = 1
              for (let k = s + 1; k < refPktCount; k++) {
                const bb0 = refBuf[k * pktSize]
                const bb1 = refBuf[k * pktSize + 1]
                if (bb0 !== TV_GRAPHICS) break
                if (bb1 !== COPY_FONT && bb1 !== XOR_FONT) break
                const yy = refBuf[k * pktSize + 8]
                const xx = refBuf[k * pktSize + 9]
                if (yy !== (ev.blockY & 0x3F) || xx !== (ev.blockX & 0x3F)) break
                runLen++
              }
              // Attempt to reserve this contiguous run if the slots are available
              let canReserve = true
              for (let k = 0; k < runLen; k++) {
                const slotIdx = s + k
                if (slotIdx >= initialPacketSlots.length) { canReserve = false; break }
                const slot = initialPacketSlots[slotIdx]
                if (!slot) continue
                const slotBuf = Buffer.from(slot)
                const empty = slotBuf.every((b) => b === 0)
                if (!empty) {
                  const refSlice = refBuf.slice(slotIdx * pktSize, (slotIdx + 1) * pktSize)
                  // compare only header+data (0..18) ignoring parity bytes
                  if (!slotBuf.slice(0, 19).equals(refSlice.slice(0, 19))) { canReserve = false; break }
                }
              }
              if (canReserve) {
                for (let k = 0; k < runLen; k++) {
                  const slice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
                  initialPacketSlots[s + k] = Uint8Array.from(slice)
                }
                foundIndex = s
                foundLen = runLen
                break
              }
              // otherwise continue searching
            }
            matches.push({
              eventIndex: ei,
              blockX: ev.blockX,
              blockY: ev.blockY,
              startPack: ev.startPack,
              matchedIndex: foundIndex,
              length: foundLen,
            })
            continue
          }

            // exact-byte mode (legacy): generate packets and search exact contiguous match
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
            for (let s = searchStart; s <= refPktCount - needed; s++) {
              let ok = true
              for (let k = 0; k < needed; k++) {
                const refSlice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
                const want = Buffer.from(pktArr[k])
                // Compare only header + data bytes (0..18) and ignore parity bytes
                if (refSlice.length !== pktSize || !Buffer.from(want).slice(0, 19).equals(refSlice.slice(0, 19))) { ok = false; break }
              }
              if (ok) { foundIndex = s; break }
            }
            if (foundIndex >= 0) {
              let canReserve = true
              for (let k = 0; k < needed; k++) {
                const slot = initialPacketSlots[foundIndex + k]
                if (!slot) continue
                const slotBuf = Buffer.from(slot)
                const empty = slotBuf.every((b) => b === 0)
                if (!empty) {
                  const refSlice = refBuf.slice((foundIndex + k) * pktSize, (foundIndex + k + 1) * pktSize)
                  if (!slotBuf.slice(0, 19).equals(refSlice.slice(0, 19))) { canReserve = false; break }
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

  // Diagnostic assertions / logs before calling scheduler
  try {
    console.log('Diagnostic: totalPacks=', totalPacks, 'initialPacketSlots.length=', initialPacketSlots.length, 'reservedStart=', reservedStart)
    if (initialPacketSlots.length !== totalPacks) {
      console.error('ASSERT: initialPacketSlots.length !== totalPacks', initialPacketSlots.length, totalPacks)
    }
    const preNonEmpty = initialPacketSlots.reduce((acc, pkt) => acc + (pkt && Buffer.from(pkt).some((b) => b !== 0) ? 1 : 0), 0)
    console.log('Diagnostic: non-empty slots in initialPacketSlots before scheduling =', preNonEmpty)
    // show a small hex preview of the first few prefilled slots
    const show = Math.min(8, initialPacketSlots.length)
    for (let i = 0; i < show; i++) {
      const pkt = initialPacketSlots[i]
      const hex = pkt ? Buffer.from(pkt).toString('hex').slice(0, 64) : '(null)'
      console.log(`initialPrelude[${i}] = ${hex}`)
    }
  } catch (e) {
    console.warn('Diagnostic pre-schedule assertion failed:', (e as any).message || e)
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
  // Proof-of-concept: if the project timeline finishes earlier than the file
  // duration (e.g. after an END banner), insert a MEMORY_PRESET sequence to
  // clear VRAM so the reference state is matched. This is a targeted debug
  // change and should live in this debug generator first; later we can move
  // the behavior into the main encoder if desired.
  try {
    // Prefer copying actual MEMORY_PRESET packets from the reference CDG when
    // available. That ensures we match the reference player's clears exactly
    // (indices and payload), avoiding the brittle guesswork of placing many
    // synthetic presets. If no reference is provided, fall back to a single
    // post-event clear.
    if (referenceCdgPath) {
      try {
        const refBuf = fs.readFileSync(referenceCdgPath)
        const refPktCount = Math.floor(refBuf.length / pktSize)
        const copied: number[] = []
        for (let i = 0; i < refPktCount; i++) {
          const base = i * pktSize
          const cmd = refBuf[base + 1] & 0x3F
          if (cmd === CDGCommand.CDG_MEMORY_PRESET || cmd === 1) {
            if (i < packetSlots.length) {
              const slice = refBuf.slice(base, base + pktSize)
              packetSlots[i] = Uint8Array.from(slice)
              copied.push(i)
            }
          }
        }
        console.log('Copied', copied.length, 'MEMORY_PRESET packets from reference at indices:', copied.slice(0, 200).join(',') || '(none)')
        // Post-filter: if the reference packet at an index is completely empty
        // (no data bytes), but our scheduler produced a non-empty packet there,
        // zero it out. This prevents spurious writes in regions where the
        // reference intentionally has no tile data (e.g. after an END banner).
        try {
          let zeroed = 0
          const maxCheckIdx = Math.min(packetSlots.length, refPktCount)
          for (let i = 0; i < maxCheckIdx; i++) {
            // Check reference bytes 1..18 for any non-zero
            let any = false
            for (let j = 1; j < 19; j++) { if (refBuf[i * pktSize + j] !== 0) { any = true; break } }
            if (!any) {
              const slot = packetSlots[i]
              if (slot && Buffer.from(slot).some((b) => b !== 0)) {
                packetSlots[i] = makeEmptyPacket()
                zeroed++
              }
            }
          }
          if (zeroed > 0) console.log(`Post-filter: zeroed out ${zeroed} generated packets where reference was empty`)
        } catch (pf) {
          console.warn('Post-filter failed:', (pf as any).message || pf)
        }
      } catch (re) {
        console.warn('Failed to copy MEMORY_PRESET from reference:', (re as any).message || re)
      }
    } else {
      // fallback behavior: single clear after last event
      const memPkts = generateMemoryPresetPackets(0)
      const need = memPkts.length
      let lastEventEnd = 0
      for (const ev of events) {
        const endPack = (ev.startPack || 0) + (ev.durationPacks || 0)
        if (endPack > lastEventEnd) lastEventEnd = endPack
      }
      let clearStart = Math.min(packetSlots.length - need, Math.max(0, lastEventEnd + 1))
      if (clearStart < 0) clearStart = 0
      for (let k = 0; k < need; k++) {
        const idx = clearStart + k
        if (idx >= 0 && idx < packetSlots.length) packetSlots[idx] = memPkts[k]
      }
      console.log('Inserted fallback MEMORY_PRESET at packet index', clearStart)
    }
  } catch (e) {
    console.warn('Could not insert MEMORY_PRESET behavior:', (e as any).message || e)
  }
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
  // If requested, zero out all generated packets at or after the given second
  if (typeof zeroAfterSeconds === 'number' && !Number.isNaN(zeroAfterSeconds)) {
    const zeroAfterPacks = Math.max(0, Math.floor(zeroAfterSeconds * pps))
    let zeroedCount = 0
    for (let i = zeroAfterPacks; i < packetSlots.length; i++) {
      const pkt = packetSlots[i]
      if (pkt && Buffer.from(pkt).some((b) => b !== 0)) {
        packetSlots[i] = makeEmptyPacket()
        zeroedCount++
      }
    }
    console.log(`Zero-after: zeroed out ${zeroedCount} generated packets at/after ${zeroAfterSeconds}s (pack index ${zeroAfterPacks})`)

    // Summarize what the reference CDG is doing during that period (if provided)
    if (referenceCdgPath) {
      try {
        const refBuf = fs.readFileSync(referenceCdgPath)
        const refPktCount = Math.floor(refBuf.length / pktSize)
        const startIdx = Math.min(Math.max(0, zeroAfterPacks), refPktCount)
        const counts: Record<string, number> = {}
        // build inverse map of CDGCommand numeric -> name
        const cmdNames: Record<number, string> = {}
        for (const k of Object.keys(CDGCommand)) {
          const v = (CDGCommand as any)[k]
          if (typeof v === 'number') cmdNames[v] = k
        }
        for (let i = startIdx; i < refPktCount; i++) {
          const cmd = refBuf[i * pktSize + 1] & 0x3F
          const name = cmdNames[cmd] || `CMD_${cmd}`
          counts[name] = (counts[name] || 0) + 1
        }
        console.log(`Reference packet-type summary from ${zeroAfterSeconds}s (pack ${startIdx}) to end (pack ${refPktCount}):`)
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
        for (const [name, cnt] of entries) console.log(`  ${name}: ${cnt}`)
      } catch (e) {
        console.warn('Could not summarize reference CDG for zero-after window:', (e as any).message || e)
      }
    }
  }

  // After zeroing (if any), optionally copy reference packets into the tail.
  // This ordering ensures a 'zero then copy' workflow when both flags are used.
  try {
    if (typeof copyAllAfterSeconds === 'number' && !Number.isNaN(copyAllAfterSeconds)) {
      if (!referenceCdgPath) console.warn('--copy-all-after-seconds requested but no --reference provided; skipping')
      else {
        const copyAfterPacks = Math.max(0, Math.floor(copyAllAfterSeconds * pps))
        const refBuf = fs.readFileSync(referenceCdgPath)
        const refPktCount = Math.floor(refBuf.length / pktSize)
        let copied = 0
        for (let i = copyAfterPacks; i < packetSlots.length && i < refPktCount; i++) {
          const slice = refBuf.slice(i * pktSize, (i + 1) * pktSize)
          packetSlots[i] = Uint8Array.from(slice)
          copied++
        }
        console.log(`Copy-all: copied ${copied} reference packets at/after ${copyAllAfterSeconds}s (pack ${copyAfterPacks})`)
      }
    } else if (typeof copyTypesAfterSeconds === 'number' && !Number.isNaN(copyTypesAfterSeconds)) {
      const copyAfterPacks = Math.max(0, Math.floor(copyTypesAfterSeconds * pps))
      if (!referenceCdgPath) {
        console.warn('--copy-types-after-seconds requested but no --reference CDG provided; skipping')
      } else if (!copyTypesList || copyTypesList.length === 0) {
        console.warn('--copy-types-after-seconds requested but no --copy-types list provided; skipping')
      } else {
        const refBuf = fs.readFileSync(referenceCdgPath)
        const refPktCount = Math.floor(refBuf.length / pktSize)
        // build inverse map of CDGCommand numeric -> name
        const cmdNames: Record<number, string> = {}
        for (const k of Object.keys(CDGCommand)) {
          const v = (CDGCommand as any)[k]
          if (typeof v === 'number') cmdNames[v] = k
        }
        const patterns = copyTypesList.map((s) => s.toUpperCase())
        let copied = 0
        let zeroed = 0
        for (let i = copyAfterPacks; i < packetSlots.length; i++) {
          const refIdx = i
          let refSlice: Buffer | null = null
          if (refIdx < refPktCount) refSlice = refBuf.slice(refIdx * pktSize, (refIdx + 1) * pktSize)
          if (!refSlice) {
            // no reference packet here -> ensure it's empty
            if (packetSlots[i] && Buffer.from(packetSlots[i]).some((b) => b !== 0)) { packetSlots[i] = makeEmptyPacket(); zeroed++ }
            continue
          }
          const cmd = refSlice[1] & 0x3F
          const name = cmdNames[cmd] || `CMD_${cmd}`
          let matched = false
          for (const pat of patterns) {
            if (pat.endsWith('*')) {
              const prefix = pat.slice(0, -1)
              if (name.startsWith(prefix)) { matched = true; break }
            } else {
              if (name === pat) { matched = true; break }
            }
          }
          if (matched) {
            // copy reference packet bytes into generated slots
            packetSlots[i] = Uint8Array.from(refSlice)
            copied++
          } else {
            // keep harmless packets only: zero anything that would write tiles/palette
            if (packetSlots[i] && Buffer.from(packetSlots[i]).some((b) => b !== 0)) { packetSlots[i] = makeEmptyPacket(); zeroed++ }
          }
        }
        console.log(`Copy-types: copied ${copied} reference packets and zeroed ${zeroed} generated packets at/after ${copyTypesAfterSeconds}s (pack ${copyAfterPacks}) for types: ${copyTypesList.join(',')}`)
      }
    }
  } catch (e) {
    console.warn('Error during copy-after processing:', (e as any).message || e)
  }

  writePacketsToFile(outPath, packetSlots)

  console.log(`Duration timeline: maxEndPacks=${maxEndPacks} -> ${durationSeconds}s at ${pps}pps`)
  console.log('Wrote', outPath)
}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
