#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { CDG_PPS } from '../cdg/constants'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from '../cdg/encoder'
import { CDGFont } from '../karaoke/renderers/cdg/CDGFont'

// Render a word using scaled glyphs (2x horizontal, 2x vertical) so each character occupies 2x2 tiles
// This produces much larger, easily readable letters.

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const word = process.argv[2] || 'WORKS'
  const durationSeconds = 30
  const pps = CDG_PPS

  const font = new CDGFont()

  // Build scaled bitmaps for each character (each glyph is 6x12 -> scaled 12x24)
  const charBitmaps: { tilesWide: number; tilesHigh: number; tiles: number[][][] }[] = []
  for (const ch of word) {
    const glyph = font.getGlyph(ch)
    // glyph.rows is 12 rows of up to 6-bit data
    // Scale each pixel 2x horizontally and vertically into a 12x24 bitmap
    const scaled: number[][] = []
    for (let gy = 0; gy < 12; gy++) {
      const rowBits = glyph.rows[gy] || 0
      // produce two identical scaled rows
      const outRowA: number[] = []
      const outRowB: number[] = []
      for (let gx = 0; gx < 6; gx++) {
        const bit = (rowBits >> (5 - gx)) & 1
        outRowA.push(bit)
        outRowA.push(bit)
        outRowB.push(bit)
        outRowB.push(bit)
      }
      scaled.push(outRowA)
      scaled.push(outRowB)
    }

    // Now split scaled bitmap into 6x12 tiles (width 12 -> 2 tiles, height 24 -> 2 tiles)
    const tilesWide = 2
    const tilesHigh = 2
    const tiles: number[][][] = []
    for (let ty = 0; ty < tilesHigh; ty++) {
      for (let tx = 0; tx < tilesWide; tx++) {
        const tile: number[][] = []
        const startY = ty * 12
        const startX = tx * 6
        for (let y = 0; y < 12; y++) {
          const row: number[] = []
          for (let x = 0; x < 6; x++) {
            const v = scaled[startY + y][startX + x] ? 1 : 0
            row.push(v)
          }
          tile.push(row)
        }
        tiles.push(tile)
      }
    }
    charBitmaps.push({ tilesWide, tilesHigh, tiles })
  }

  // Layout: place characters next to each other with 1 tile gap
  let totalTilesWide = 0
  for (const cb of charBitmaps) totalTilesWide += cb.tilesWide + 1
  totalTilesWide = Math.max(1, totalTilesWide - 1)

  // choose row to place top of characters (tile row). Place around row 4
  const topTileRow = 4
  // starting column for centered layout
  const startCol = Math.floor((50 - totalTilesWide) / 2)

  const events: any[] = []
  let cursor = startCol
  for (let ci = 0; ci < charBitmaps.length; ci++) {
    const cb = charBitmaps[ci]
    // for each tile within character
    for (let t = 0; t < cb.tiles.length; t++) {
      const tx = t % cb.tilesWide
      const ty = Math.floor(t / cb.tilesWide)
      const blockX = cursor + tx
      const blockY = topTileRow + ty
      events.push({ blockX, blockY, pixels: cb.tiles[t], startPack: 0, durationPacks: Math.ceil(durationSeconds * pps) })
    }
    cursor += cb.tilesWide + 1
  }

  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(0)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, { durationSeconds, pps }, initPkts.length)
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

  // Repeat tiles every second
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

  const outPath = path.join(outDir, `scheduled-demo-word-${word}-scaled-30s.cdg`)
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)

  const mp3dst = path.join(outDir, `scheduled-demo-word-${word}-scaled-30s.mp3`)
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

  try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) {}
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
