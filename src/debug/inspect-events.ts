#!/usr/bin/env -S npx tsx

import fs from 'fs'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'
import { CDG_SCREEN } from '../karaoke/renderers/cdg/CDGPacket'

function msToPacks(ms: number, pps = 300) {
  return Math.floor((ms / 1000) * pps)
}

function loadAndBuildEvents(inPath: string) {
  const buf = fs.readFileSync(inPath, 'utf8')
  const parsed = JSON.parse(buf)
  const pps = 300
  const textRenderer = new CDGTextRenderer()
  // palette/colors intentionally unused for this inspector script

  const events: any[] = []
  for (const clip of parsed.clips || []) {
    if (clip.type === 'TextClip') {
      const clipStart = clip.start || 0
      const fg = (clip.foreground_color != null) ? clip.foreground_color : 1
      const bg = (clip.background_color != null) ? clip.background_color : 0
      for (const ev of clip.events || []) {
        const evOffset = ev.clip_time_offset || 0
        const startPack = msToPacks(clipStart + evOffset, pps)
        const totalPacks = Math.max(1, Math.ceil((parsed.durationSeconds || Math.ceil((clip.duration||0)/1000)+1) * pps))
        const durationPacks = Math.max(1, totalPacks - startPack)

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
    // BMPClip handling omitted for brevity
  }
  return events
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 1) { console.error('Usage: npx tsx src/debug/inspect-events.ts <parsed.json>'); process.exit(2) }
  const inPath = argv[0]
  const events = loadAndBuildEvents(inPath)
  console.log('Total events:', events.length)
  if (events.length === 0) process.exit(0)
  const sample = events.slice(0, 50)
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i]
    // compute distinct colors
    const colors = new Set<number>()
    for (const row of e.pixels) for (const v of row) colors.add(v)
    console.log(i, `blockX=${e.blockX} blockY=${e.blockY} startPack=${e.startPack} dur=${e.durationPacks} colors=${[...colors].join(',')}`)
  }
}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
