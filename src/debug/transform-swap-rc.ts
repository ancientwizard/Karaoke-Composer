#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'

const PACKET_SIZE = 24

function swapRowCol(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / PACKET_SIZE)
  const out = Buffer.from(buf)
  for (let i = 0; i < packets; i++) {
    const off = i * PACKET_SIZE
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

try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) {}
