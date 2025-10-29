#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'

// Create a large visible demo: fill a rectangular region of tiles with alternating colors
// so it's unmistakable in VLC. Schedule writes to occur immediately so the screen shows
// the pattern for the duration.

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 4
  const pps = 75

  // Build tile blocks: each event writes a single 6x12 block of a uniform color or simple stripe
  const tileCoords: { bx: number; by: number; pixels: number[][] }[] = []
  // We'll draw a rectangle centered roughly in the screen tile grid: cols 8..26, rows 4..12
  for (let by = 4; by <= 12; by++) {
    for (let bx = 8; bx <= 26; bx++) {
      // Alternate color for contrast (1 and 14)
      const color = ((bx + by) % 2 === 0) ? 1 : 14
      // Create a 6x12 block of the chosen color
      const pixels: number[][] = []
      for (let y = 0; y < 12; y++) {
        const row: number[] = []
        for (let x = 0; x < 6; x++) row.push(color)
        pixels.push(row)
      }
      tileCoords.push({ bx, by, pixels })
    }
  }

  // Compute packet window and space events across the full duration to avoid early collisions
  const totalPacks = Math.max(1, Math.ceil(durationSeconds * pps))
  const events: any[] = []
  const count = tileCoords.length
  for (let i = 0; i < count; i++) {
    const { bx, by, pixels } = tileCoords[i]
    // spread starts evenly across totalPacks
    const startPack = Math.floor((i * totalPacks) / count)
    // allow the event to use the remaining packs so its write may get placed anywhere in the tail
    const durationPacks = Math.max(1, totalPacks - startPack)
    events.push({ blockX: bx, blockY: by, pixels, startPack, durationPacks })
  }

  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(1)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, { durationSeconds, pps }, initPkts.length)

  // place initial packets at the start
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  const outPath = path.join(outDir, 'scheduled-demo-text.cdg')
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  // write a 4s silent MP3 and copy to same basename so VLC loads it
  const mp3Src = path.join(outDir, 'silence-4s.mp3')
  if (!fs.existsSync(mp3Src)) {
    // try to create a minimal MP3 via ffmpeg if available by shelling out
    try {
      const { execSync } = await import('child_process')
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 4 -q:a 9 ${mp3Src}`, { stdio: 'ignore' })
      console.log('Created', mp3Src)
    } catch (e) {
      console.warn('Could not create MP3 (ffmpeg missing). Please copy a 4s MP3 to', mp3Src)
    }
  }
  try { fs.copyFileSync(mp3Src, path.join(outDir, 'scheduled-demo-text.mp3')) } catch (e) { /* ignore */ }

  // render PPM using existing renderer script if available
  try {
    const { spawnSync } = await import('child_process')
    spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' })
  } catch (e) {
    console.warn('Could not run PPM renderer automatically. You can run: npx tsx src/debug/render-cdg-to-ppm.ts', outPath)
  }
}

// Call run immediately under tsx/ESM
run().catch((e) => { console.error(e); process.exit(2) })

export default run
