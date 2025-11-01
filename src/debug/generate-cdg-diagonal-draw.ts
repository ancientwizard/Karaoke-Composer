#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { CDG_PPS } from '../cdg/constants'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 60
  const pps = CDG_PPS
  const totalPacks = Math.ceil(durationSeconds * pps)

  // CDG tile grid: 50 cols x 18 rows
  const cols = 50
  const rows = 18

  // We'll draw one tile per column, mapping column -> row to form a diagonal
  const totalTiles = cols

  // Build a single filled 6x12 tile (foreground color index 1)
  const tilePixels: number[][] = []
  for (let y = 0; y < 12; y++) {
    const row: number[] = []
    for (let x = 0; x < 6; x++) row.push(1)
    tilePixels.push(row)
  }

  const events: any[] = []
  for (let cx = 0; cx < cols; cx++) {
    const x = cx
    // map x in [0,cols-1] to y in [0,rows-1]
    const y = Math.round(cx * (rows - 1) / (cols - 1))
    // schedule startPack spaced evenly across totalPacks
    const startPack = Math.floor(cx * totalPacks / totalTiles)
    const durationPacks = Math.max(1, Math.floor(totalPacks / totalTiles))
    events.push({
 blockX: x, blockY: y, pixels: tilePixels, startPack, durationPacks 
})
  }

  // initial packets: palette, border, memory preset 0
  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(0)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds, pps 
}, initPkts.length)

  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  // Ensure last slot non-empty
  const lastIndex = packetSlots.length - 1
  let lastNonEmpty = -1
  for (let i = packetSlots.length - 1; i >= 0; i--) if (!packetSlots[i].every((b: number) => b === 0)) { lastNonEmpty = i; break }
  if (lastNonEmpty === -1) packetSlots[lastIndex] = palettePkts[palettePkts.length - 1] || packetSlots[lastIndex]
  else if (lastNonEmpty !== lastIndex) packetSlots[lastIndex] = packetSlots[lastNonEmpty]

  const outPath = path.join(outDir, `scheduled-demo-diagonal-60s.cdg`)
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  // Try to render PPM for quick verification
  try {
    const cp = await import('child_process')
    ;(cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' })
  } catch (e) {
    // ignore render errors
  }
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
