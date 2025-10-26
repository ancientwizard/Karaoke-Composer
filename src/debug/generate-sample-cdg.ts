#!/usr/bin/env -S tsx
import fs from 'fs'
import { renderSimple } from '../cdg/renderer'
import type { TileDraw } from '../cdg/types'

async function main() {
  // A simple visible tile: a block with a few filled rows so players show something.
  // CDG tiles are 12 rows of 6 pixels; each element in `pixels` is a 6-bit row.
  const tile: TileDraw = {
    at: 0,
    coord: { row: 8, col: 20 },
  color0: 3,
  color1: 8,
    pixels: [
      0x3f, 0x3f, 0x3f, // three filled rows at top of tile
      0x00, 0x00, 0x00, 0x00, 0x00,
      0x3f, 0x3f, 0x3f, // three filled rows near bottom
      0x00
    ],
    xor: false
  }

  const result = await renderSimple([tile], { durationSeconds: 4 })
  const outPath = 'diag/sample-generated.cdg'
  fs.writeFileSync(outPath, Buffer.from(result.buffer))
  console.log('Wrote', outPath, 'packets=', result.packets, 'duration=', result.durationSeconds)
}

main().catch((e) => { console.error(e); process.exit(1) })
