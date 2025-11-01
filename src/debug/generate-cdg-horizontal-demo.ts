#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { CDG_PPS } from '../cdg/constants'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'

// Generate a horizontal bar demo (bar spans columns, fixed row) so we can confirm X/Y orientation.

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 30
  const pps = CDG_PPS

  const row = 8 // fixed row where horizontal bar will be drawn
  const colsStart = 6
  const colsEnd = 42

  const tileCoords: { bx: number; by: number; pixels: number[][] }[] = []
  for (let bx = colsStart; bx <= colsEnd; bx++) {
    const pixels: number[][] = []
    const color = ((bx) % 2 === 0) ? 9 : 11
    for (let y = 0; y < 12; y++) {
      const rowArr: number[] = []
      for (let x = 0; x < 6; x++) rowArr.push(color)
      pixels.push(rowArr)
    }
    tileCoords.push({
 bx, by: row, pixels 
})
  }

  const totalPacks = Math.max(1, Math.ceil(durationSeconds * pps))
  const events: any[] = []
  for (let i = 0; i < tileCoords.length; i++) {
    const {
 bx, by, pixels 
} = tileCoords[i]
    const startPack = Math.floor((i * totalPacks) / tileCoords.length)
    const durationPacks = Math.max(1, totalPacks - startPack)
    events.push({
 blockX: bx, blockY: by, pixels, startPack, durationPacks 
})
  }

  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(1)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds, pps 
}, initPkts.length)
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  // repeat tile packets every second (1s -> pps packets)
  const INTERVAL = pps
  for (let idx = 0; idx < packetSlots.length; idx++) {
    const pkt = packetSlots[idx]
    if (!pkt || pkt.every((b) => b === 0)) continue
    const cmd = pkt[1] & 0x3F
    if (cmd === 6 || cmd === 38) {
      for (let k = 1; k <= Math.floor((packetSlots.length - 1 - idx) / INTERVAL); k++) {
        const pos = idx + k * INTERVAL
        if (pos >= packetSlots.length) break
        if (packetSlots[pos].every((b) => b === 0)) packetSlots[pos] = pkt
      }
    }
  }

  const outPath = path.join(outDir, 'scheduled-demo-horizontal-30s.cdg')
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  // copy silence
  const silence = path.join(outDir, 'silence-4s.mp3')
  if (fs.existsSync(silence)) {
    try { fs.copyFileSync(silence, path.join(outDir, 'scheduled-demo-horizontal-30s.mp3')) } catch (e) {}
  }

  // render final PPM
  try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) { }
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
