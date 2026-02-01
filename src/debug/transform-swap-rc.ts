#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function swapRowCol(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const out = Buffer.from(buf)
  for (let i = 0; i < packets; i++) {
  const off = i * CDG_PACKET_SIZE
    const cmd = out[off + 1] & 0x3F
    if (cmd === 6 || cmd === 38) {
      // data starts at off+3; data[2] is at off+5, data[3] at off+6
      const d2 = out[off + 5]
      const d3 = out[off + 6]
      out[off + 5] = d3
      out[off + 6] = d2
    }
  }
  return out
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/transform-swap-rc.ts <cdg-file>')
  process.exit(2)
}

const inPath = process.argv[2]
const outPath = path.join(path.dirname(inPath), path.basename(inPath, path.extname(inPath)) + '-swapped.cdg')
const outBuf = swapRowCol(inPath)
fs.writeFileSync(outPath, outBuf)
console.log('Wrote', outPath)

try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) { console.warn('render-cdg-to-ppm failed:', e) }
