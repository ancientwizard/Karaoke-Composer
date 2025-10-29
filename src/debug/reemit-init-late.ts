#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'

import { CDG_PACKET_SIZE } from '@/cdg/constants'

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const arr: Buffer[] = []
  for (let i = 0; i < packets; i++) arr.push(buf.slice(i * CDG_PACKET_SIZE, i * CDG_PACKET_SIZE + CDG_PACKET_SIZE))
  return arr
}

function writePackets(filePath: string, arr: Buffer[]) {
  const out = Buffer.concat(arr)
  fs.writeFileSync(filePath, out)
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/reemit-init-late.ts <cdg-file> [targetStart]')
  process.exit(2)
}

const inPath = process.argv[2]
const targetStart = process.argv[3] ? parseInt(process.argv[3],10) : 600
const pkts = readPackets(inPath)

// collect first N non-empty packets from start
const nonEmpty: Buffer[] = []
for (let i = 0; i < pkts.length; i++) {
  const p = pkts[i]
  const empty = p.every((b)=>b===0)
  if (!empty) nonEmpty.push(p)
  else break
}

if (nonEmpty.length === 0) {
  console.error('No initial non-empty packets found')
  process.exit(2)
}

// zero out the first nonEmpty.length packets
for (let i = 0; i < nonEmpty.length; i++) pkts[i] = Buffer.alloc(CDG_PACKET_SIZE)

// place them starting at targetStart (overwrite if needed)
for (let i = 0; i < nonEmpty.length; i++) {
  const idx = targetStart + i
  if (idx < pkts.length) pkts[idx] = nonEmpty[i]
}

const outPath = path.join(path.dirname(inPath), path.basename(inPath, path.extname(inPath)) + `-late-init.cdg`)
writePackets(outPath, pkts)
console.log('Wrote', outPath)

try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) { console.error('render preview failed', e) }
