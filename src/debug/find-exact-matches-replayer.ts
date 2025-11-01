#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { writeFontBlock, VRAM } from '../cdg/encoder'
import ReferenceReplayer from '../cdg/referenceReplayer'
import { CDG_SCREEN } from '../karaoke/renderers/cdg/CDGPacket'
import { CDG_PPS } from '../cdg/constants'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'

function usage() {
  console.error('Usage: npx tsx src/debug/find-exact-matches-replayer.ts <parsed.json> <reference.cdg> [startEventIndex] [count]')
  process.exit(2)
}

const argv = process.argv.slice(2)
if (argv.length < 2) usage()
const parsedPath = argv[0]
const referencePath = argv[1]
const startEvent = argv[2] ? Number(argv[2]) : 0
const count = argv[3] ? Number(argv[3]) : 100
// optional fifth arg: output path for matches (used by parallel runner)
const outputPath = argv[4] || path.join('tmp', 'match_by_replayer_map.json')

if (!fs.existsSync(parsedPath)) { console.error('Parsed JSON not found:', parsedPath); process.exit(2) }
if (!fs.existsSync(referencePath)) { console.error('Reference CDG not found:', referencePath); process.exit(2) }

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf8'))
const pps = CDG_PPS
const textRenderer = new CDGTextRenderer()
const events: any[] = []
// Time units: treat numeric values as milliseconds by default. Use
// --times-in-packs if the caller passes pack indices directly. This avoids
// the previous brittle heuristic that flipped at >=1000.
const timesInPacksFlag = argv.includes('--times-in-packs')
const timesInMsFlag = argv.includes('--times-in-ms')
if (timesInPacksFlag && timesInMsFlag) console.warn('Both --times-in-packs and --times-in-ms provided; defaulting to --times-in-ms')
function timeToPacks(val: number | undefined, pps = CDG_PPS) {
  if (val == null) return 0
  if (timesInPacksFlag) return Math.floor(val)
  // default: milliseconds -> packs
  return Math.floor((val / 1000) * pps)
}

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

const refBuf = fs.readFileSync(referencePath)
const pktSize = 24
const refPktCount = Math.floor(refBuf.length / pktSize)

// reservedStart detection (same heuristics as generator)
let firstNonEmptyIdx: number | null = null
let lastInitIdx: number | null = null
for (let i = 0; i < refPktCount; i++) {
  let any = false
  for (let j = 1; j < 19; j++) if (refBuf[i * pktSize + j] !== 0) { any = true; break }
  if (any && firstNonEmptyIdx == null) firstNonEmptyIdx = i
  const cmd = refBuf[i * pktSize + 1] & 0x3F
  if (cmd === 1 || cmd === 2 || cmd === 30 || cmd === 31) lastInitIdx = i
}
let reservedStart = (firstNonEmptyIdx != null) ? firstNonEmptyIdx + 1 : 0
if (lastInitIdx != null) reservedStart = Math.max(reservedStart, lastInitIdx + 1)
console.log('Reference refPktCount=', refPktCount, 'reservedStart=', reservedStart)

const snapshotInterval = Number(process.env.REPLAYER_SNAPSHOT_INTERVAL) || 128
console.log('ReferenceReplayer: snapshotInterval=', snapshotInterval)
const replayer = new ReferenceReplayer(referencePath, pktSize, snapshotInterval)

const outMatches: any[] = []
const MAX_SEARCH = Number(process.env.MATCH_SEARCH_CAP) || 50000
const end = Math.min(events.length, startEvent + count)
for (let ei = startEvent; ei < end; ei++) {
  const ev = events[ei]
  console.log(`Event ${ei}: block=(${ev.blockX},${ev.blockY}) startPack=${ev.startPack}`)
  let foundAt: number | null = null
  // search window
  const start = Math.max(0, reservedStart)
  const limit = (MAX_SEARCH > 0) ? Math.min(refPktCount - 1, start + MAX_SEARCH) : (refPktCount - 1)
  for (let s = start; s <= limit; s++) {
    const vv = replayer.getVRAMAt(s)
    const tryPkts = writeFontBlock(vv, ev.blockX, ev.blockY, ev.pixels)
    if (!tryPkts || tryPkts.length === 0) continue
    const needed = tryPkts.length
    if (s + needed > refPktCount) continue
    let ok = true
    for (let k = 0; k < needed; k++) {
      const refSlice = refBuf.slice((s + k) * pktSize, (s + k + 1) * pktSize)
      if (refSlice.length !== pktSize || !Buffer.from(tryPkts[k]).slice(0, 19).equals(refSlice.slice(0, 19))) { ok = false; break }
    }
    if (ok) { foundAt = s; console.log(` Found exact match at ${s} for event ${ei}`); break }
  }
  outMatches.push({ eventIndex: ei, blockX: ev.blockX, blockY: ev.blockY, startPack: ev.startPack, matchedIndex: foundAt })
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify({ reservedStart, matches: outMatches }, null, 2))
console.log('Wrote', outputPath)
