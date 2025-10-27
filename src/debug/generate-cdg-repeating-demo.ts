#!/usr/bin/env -S tsx
import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'

// Generate a CDG where tile packets are repeated every second (75 packets) to ensure
// players that sample intermittently continue to show tiles over the full duration.

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 4
  const pps = 75

  // Reuse the same rectangle as the text demo but compact: cols 10..22, rows 5..11
  const tileCoords: { bx: number; by: number; pixels: number[][] }[] = []
  for (let by = 5; by <= 11; by++) {
    for (let bx = 10; bx <= 22; bx++) {
      const color = ((bx + by) % 2 === 0) ? 1 : 14
      const pixels: number[][] = []
      for (let y = 0; y < 12; y++) {
        const row: number[] = []
        for (let x = 0; x < 6; x++) row.push(color)
        pixels.push(row)
      }
      tileCoords.push({
 bx, by, pixels 
})
    }
  }

  const totalPacks = Math.max(1, Math.ceil(durationSeconds * pps))
  // schedule events spread across full window
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

  // place initial packets at start
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  // Identify tile packets (cmd 6 or 38) and repeat them every 75 packets
  const INTERVAL = 75
  const tileCmds = new Set([6, 38])
  for (let idx = 0; idx < packetSlots.length; idx++) {
    const pkt = packetSlots[idx]
    if (!pkt || pkt.every((b) => b === 0)) continue
    const cmd = pkt[1] & 0x3F
    if (!tileCmds.has(cmd)) continue
    // repeat at 1s,2s,3s
    for (let k = 1; k <= Math.floor((packetSlots.length - 1 - idx) / INTERVAL); k++) {
      const pos = idx + k * INTERVAL
      if (pos >= packetSlots.length) break
      if (packetSlots[pos].every((b) => b === 0)) packetSlots[pos] = pkt
    }
  }

  // Also place palette packets at the start of each second to help players
  for (let s = 0; s < Math.floor(totalPacks / INTERVAL); s++) {
    const pos = s * INTERVAL
    if (pos < packetSlots.length && packetSlots[pos].every((b) => b === 0)) packetSlots[pos] = palettePkts[palettePkts.length - 1]
  }

  // ensure last slot non-empty
  const lastIdx = packetSlots.length - 1
  if (packetSlots[lastIdx].every((b) => b === 0)) {
    // find last non-empty and copy
    for (let i = packetSlots.length - 1; i >= 0; i--) {
      if (!packetSlots[i].every((b) => b === 0)) { packetSlots[lastIdx] = packetSlots[i]; break }
    }
  }

  const outPath = path.join(outDir, 'scheduled-demo-repeating.cdg')
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  // write mp3 if missing by copying existing silence
  const silence = path.join(outDir, 'silence-4s.mp3')
  if (fs.existsSync(silence)) fs.copyFileSync(silence, path.join(outDir, 'scheduled-demo-repeating.mp3'))

  // render ppm
  try {
    const { spawnSync } = await import('child_process')
    spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' })
  } catch (e) {
    console.warn('Could not render PPM automatically')
  }
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
