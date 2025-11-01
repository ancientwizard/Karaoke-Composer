#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { CDG_PPS } from '../cdg/constants'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'

// Generate longer duration CDGs (20s and 30s) to observe player behavior over time.
// For each duration we produce two variants:
//  - solid: large checkerboard blocks repeated every second
//  - animated: a vertical bar that moves across the rectangle (clearly visible motion)

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durations = [20, 30]
  const pps = CDG_PPS

  for (const dur of durations) {
    // common tile region
    const colsStart = 8, colsEnd = 26
    const rowsStart = 4, rowsEnd = 12
    // build tile coords
    const tiles: { bx: number; by: number; pixels: number[][] }[] = []
    for (let by = rowsStart; by <= rowsEnd; by++) {
      for (let bx = colsStart; bx <= colsEnd; bx++) {
        const pixels: number[][] = []
        for (let y = 0; y < 12; y++) {
          const row: number[] = []
          for (let x = 0; x < 6; x++) row.push(0)
          pixels.push(row)
        }
        tiles.push({
 bx, by, pixels 
})
      }
    }

    // SOLID variant: fill tiles with alternating colors and repeat every 1s
    const solidEvents: any[] = []
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]
      const color = ((t.bx + t.by) % 2 === 0) ? 1 : 14
      for (let y = 0; y < 12; y++) for (let x = 0; x < 6; x++) t.pixels[y][x] = color
      const totalPacks = Math.max(1, Math.ceil(dur * pps))
      const startPack = Math.floor((i * totalPacks) / tiles.length)
      const durationPacks = Math.max(1, totalPacks - startPack)
      solidEvents.push({
 blockX: t.bx, blockY: t.by, pixels: t.pixels, startPack, durationPacks 
})
    }

    // ANIMATED variant: moving vertical bar across the region; we schedule frames across time
    const animatedEvents: any[] = []
    const totalPacksA = Math.max(1, Math.ceil(dur * pps))
    const regionCols = colsEnd - colsStart + 1
    const frames = Math.max(8, Math.floor(dur * 2)) // ~2 frames/sec minimum
    for (let f = 0; f < frames; f++) {
      const progress = f / Math.max(1, frames - 1)
      const colIdx = colsStart + Math.floor(progress * (regionCols - 1))
      // bar color alternates for contrast
      const color = (f % 2 === 0) ? 2 : 13
      // create block events for the bar column
      for (let by = rowsStart; by <= rowsEnd; by++) {
        const pixels: number[][] = []
        for (let y = 0; y < 12; y++) {
          const row: number[] = []
          for (let x = 0; x < 6; x++) row.push(color)
          pixels.push(row)
        }
        const startPack = Math.floor((f * totalPacksA) / frames)
        const durationPacks = Math.max(1, Math.floor(totalPacksA / frames))
        animatedEvents.push({
 blockX: colIdx, blockY: by, pixels, startPack, durationPacks 
})
      }
    }

    // helper to write a variant
    async function writeVariant(name: string, events: any[]) {
      const palettePkts = generatePaletteLoadPackets()
      const borderPkts = generateBorderPacket(0)
      const memoryPkts = generateMemoryPresetPackets(1)
      const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]
      const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds: dur, pps 
}, initPkts.length)
      for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

      // repeat tile packets every 1s and emit palette at each second
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
      for (let s = 0; s < Math.floor(packetSlots.length / INTERVAL); s++) {
        const pos = s * INTERVAL
        if (pos < packetSlots.length && packetSlots[pos].every((b) => b === 0)) packetSlots[pos] = palettePkts[palettePkts.length - 1]
      }

      // ensure last slot is non-empty
      const lastIdx = packetSlots.length - 1
      if (packetSlots[lastIdx].every((b) => b === 0)) {
        for (let i = packetSlots.length - 1; i >= 0; i--) {
          if (!packetSlots[i].every((b) => b === 0)) { packetSlots[lastIdx] = packetSlots[i]; break }
        }
      }

      const outPath = path.join(outDir, `scheduled-demo-${name}-${dur}s.cdg`)
      writePacketsToFile(outPath, packetSlots)
      console.log('Wrote', outPath)
      // copy/create mp3
      const mp3dst = path.join(outDir, `scheduled-demo-${name}-${dur}s.mp3`)
      const silence = path.join(outDir, 'silence-4s.mp3')
      if (fs.existsSync(silence)) {
        // create longer silence by repeating the 4s file if necessary
        try {
          const cp = await import('child_process')
          const execSync = (cp as any).execSync
          const copies = Math.ceil(dur / 4)
          execSync(`ffmpeg -y -f concat -safe 0 -i <(for i in $(seq 1 ${copies}); do echo "file '${silence}'"; done) -c copy ${mp3dst}`, {
 stdio: 'ignore', shell: '/bin/bash' 
})
        } catch (e) {
          try { fs.copyFileSync(silence, mp3dst) } catch (e) { /* ignore */ }
        }
      }
      // render ppm (final frame)
      try {
        const cp = await import('child_process')
        const spawnSync = (cp as any).spawnSync
        spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', path.join(outDir, `scheduled-demo-${name}-${dur}s.cdg`)], { stdio: 'inherit' })
      } catch (e) {
        console.warn('Could not render PPM automatically for', name, dur)
      }
    }

    await writeVariant('solid', solidEvents)
    await writeVariant('animated', animatedEvents)
  }
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
