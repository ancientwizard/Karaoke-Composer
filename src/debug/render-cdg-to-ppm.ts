#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'
import { CDG_SCREEN } from '../karaoke/renderers/cdg/CDGPacket'
import { CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'

// Simple CDG -> PPM renderer (final frame)
// Usage: npx tsx src/debug/render-cdg-to-ppm.ts diag/sample-generated.cdg

function cdgColorToRgb(color12: number): [number, number, number] {
  const r4 = (color12 >> 8) & 0x0F
  const g4 = (color12 >> 4) & 0x0F
  const b4 = color12 & 0x0F
  const r8 = (r4 << 4) | r4
  const g8 = (g4 << 4) | g4
  const b8 = (b4 << 4) | b4
  return [r8, g8, b8]
}

function render(filePath: string) {
  const outName = path.basename(filePath, path.extname(filePath)) + '.ppm'
  const buf = fs.readFileSync(filePath)
  const packetSize = 24
  const packets = Math.floor(buf.length / packetSize)

  // Screen: palette indices per pixel (300x216)
  const width = CDG_SCREEN.WIDTH
  const height = CDG_SCREEN.HEIGHT
  const screen = new Uint8Array(width * height).fill(0) // color indices 0-15

  const palette = new CDGPalette()
  palette.setDefaultPalette()

  // helper to set tile at row/col
  function setTile(row: number, col: number, color0: number, color1: number, pixels: number[]) {
    // tile origin in pixels
    const tileX = col * CDG_SCREEN.TILE_WIDTH
    const tileY = row * CDG_SCREEN.TILE_HEIGHT
    for (let r = 0; r < 12; r++) {
      const byte = pixels[r] || 0
      for (let c = 0; c < 6; c++) {
        const bit = (byte >> (5 - c)) & 1
        const color = bit ? color1 : color0
        const px = tileX + c
        const py = tileY + r
        if (px >= 0 && px < width && py >= 0 && py < height) {
          screen[py * width + px] = color & 0x0F
        }
      }
    }
  }

  for (let i = 0; i < packets; i++) {
    const off = i * packetSize
    const pkt = buf.slice(off, off + packetSize)
    const cmd = pkt[1] & 0x3F
    // data bytes start at offset 3
    const data = pkt.slice(3, 19)
    switch (cmd) {
      case 30: // load color table low
        // 8 colors, each 2 bytes
        for (let j = 0; j < 8; j++) {
          const hi = data[j * 2]
          const lo = data[j * 2 + 1]
          const color12 = ((hi & 0x3F) << 8) | (lo & 0x3F)
          palette.getColors()[j] = color12
        }
        break
      case 31: // load color table high
        for (let j = 0; j < 8; j++) {
          const hi = data[j * 2]
          const lo = data[j * 2 + 1]
          const color12 = ((hi & 0x3F) << 8) | (lo & 0x3F)
          palette.getColors()[8 + j] = color12
        }
        break
      case 1: // memory preset
        {
          const color = data[0] & 0x0F
          // fill screen with color
          screen.fill(color)
        }
        break
      case 2: // border preset
        {
          const color = data[0] & 0x0F
          // fill border tiles (left/right 1 tile, top/bottom 1 tile)
          const cols = CDG_SCREEN.COLS
          const rows = CDG_SCREEN.ROWS
          // leftmost and rightmost columns are border tiles (0 and cols-1)
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < CDG_SCREEN.TILE_WIDTH; c++) {
              const y0 = r * CDG_SCREEN.TILE_HEIGHT
              const xL = 0 + c
              const xR = (cols - 1) * CDG_SCREEN.TILE_WIDTH + c
              for (let ry = 0; ry < CDG_SCREEN.TILE_HEIGHT; ry++) {
                const py = y0 + ry
                if (py >= 0 && py < height) {
                  if (xL >= 0 && xL < width) screen[py * width + xL] = color
                  if (xR >= 0 && xR < width) screen[py * width + xR] = color
                }
              }
            }
          }
          // top and bottom border rows
          for (let r = 0; r < CDG_SCREEN.TILE_HEIGHT; r++) {
            for (let c = 0; c < width; c++) {
              screen[r * width + c] = color
              screen[(height - 1 - r) * width + c] = color
            }
          }
        }
        break
      case 6: // tile block
      case 38: // tile block xor
        {
          const color0 = data[0] & 0x0F
          const color1 = data[1] & 0x0F
          const row = data[2] & 0x1F
          const col = data[3] & 0x3F
          const pixels: number[] = []
          for (let r = 0; r < 12; r++) pixels.push(data[4 + r] & 0x3F)
          setTile(row, col, color0, color1, pixels)
        }
        break
      default:
        // ignore
        break
    }
  }

  // produce PPM
  const out = Buffer.alloc(15 + width * height * 3)
  const header = `P6\n${width} ${height}\n255\n`
  out.write(header, 0, 'ascii')
  let ptr = header.length
  const colors = palette.getColors()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = screen[y * width + x] & 0x0F
      const color12 = colors[idx] || 0
      const [r, g, b] = cdgColorToRgb(color12)
      out[ptr++] = r
      out[ptr++] = g
      out[ptr++] = b
    }
  }

  fs.writeFileSync(outName, out.slice(0, ptr))
  console.log('Wrote', outName)
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/render-cdg-to-ppm.ts <cdg-file>')
  process.exit(2)
}

render(process.argv[2])
