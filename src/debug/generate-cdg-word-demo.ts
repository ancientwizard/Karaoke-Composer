#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { CDG_PPS } from '../cdg/constants'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'

// Render a short word as CDG tiles and produce a 30s demo that repeats tiles/palette to persist
async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const word = process.argv[2] || 'WORKS' // default word
  const durationSeconds = 30
  const pps = CDG_PPS

  const textRenderer = new CDGTextRenderer()
  // center vertically around row 6 (roughly middle)
  const row = 6
  const tiles = textRenderer.renderCentered(word, row)

  // Convert tiles to FontEvents for scheduler
  const totalPacks = Math.max(1, Math.ceil(durationSeconds * pps))
  const events: any[] = []
  const fgColor = 3 // white-ish in default palette
  const bgColor = 0 // black
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    const startPack = Math.floor((i * totalPacks) / tiles.length)
    const durationPacks = Math.max(1, totalPacks - startPack)
    events.push({ blockX: t.col, blockY: t.row, pixels: t.tileData.map((b: number) => {
        // tileData is 6-bit-per-row values; convert to 6-wide arrays of color indices (fg/bg)
        const arr: number[] = []
        for (let x = 0; x < 6; x++) {
          const bit = (b >> (5 - x)) & 1
          arr.push(bit ? fgColor : bgColor)
        }
        return arr
      }), startPack, durationPacks 
    })
  }

  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  // Use memory preset 0 (black) so text color contrasts with background
  const memoryPkts = generateMemoryPresetPackets(0)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, { durationSeconds, pps }, initPkts.length)
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  // Repeat tile packets every second and emit palette at start of each second
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

  // ensure last slot non-empty
  const lastIdx = packetSlots.length - 1
  if (packetSlots[lastIdx].every((b) => b === 0)) {
    for (let i = packetSlots.length - 1; i >= 0; i--) {
      if (!packetSlots[i].every((b) => b === 0)) { packetSlots[lastIdx] = packetSlots[i]; break }
    }
  }

  const outPath = path.join(outDir, `scheduled-demo-word-${word}-${durationSeconds}s.cdg`)
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  const mp3dst = path.join(outDir, `scheduled-demo-word-${word}-${durationSeconds}s.mp3`)
  const silence = path.join(outDir, 'silence-4s.mp3')
  if (fs.existsSync(silence)) {
    try {
      const cp = await import('child_process')
      const execSync = (cp as any).execSync
      const copies = Math.ceil(durationSeconds / 4)
      execSync(`ffmpeg -y -f concat -safe 0 -i <(for i in $(seq 1 ${copies}); do echo "file '${silence}'"; done) -c copy ${mp3dst}`, {
          stdio: 'ignore', shell: '/bin/bash' 
         })
    } catch (e) {
      try { fs.copyFileSync(silence, mp3dst) } catch (e) { /* ignore */ }
    }
  }

  // render PPM
  try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) {}
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
