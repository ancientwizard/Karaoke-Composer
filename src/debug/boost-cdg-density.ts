#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'

const PACKET_SIZE = 24

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / PACKET_SIZE)
  const arr: Buffer[] = []
  for (let i = 0; i < packets; i++) arr.push(buf.slice(i*PACKET_SIZE, i*PACKET_SIZE+PACKET_SIZE))
  return arr
}

function writePackets(filePath: string, arr: Buffer[]) {
  const out = Buffer.concat(arr)
  fs.writeFileSync(filePath, out)
}

function countCmds(pkts: Buffer[]) {
  const counts = new Map<number, number>()
  for (const p of pkts) {
    const cmd = p[1] & 0x3F
    counts.set(cmd, (counts.get(cmd)||0)+1)
  }
  return counts
}

if (process.argv.length < 4) {
  console.error('Usage: npx tsx src/debug/boost-cdg-density.ts <input-cdg> <reference-cdg>')
  process.exit(2)
}

const inPath = process.argv[2]
const refPath = process.argv[3]
const outPath = path.join(path.dirname(inPath), path.basename(inPath, path.extname(inPath)) + '-denser.cdg')

const pkts = readPackets(inPath)
const ref = readPackets(refPath)
const refCounts = countCmds(ref)
const currCounts = countCmds(pkts)

const targetCopy = Math.max(0, (refCounts.get(6) || 0))
const targetXor = Math.max(0, (refCounts.get(38) || 0))

console.log('Current COPY/XOR:', currCounts.get(6)||0, '/', currCounts.get(38)||0)
console.log('Target COPY/XOR:', targetCopy, '/', targetXor)

// gather sample COPY packets and XOR packets to clone
const copySamples: Buffer[] = []
const xorSamples: Buffer[] = []
for (const p of pkts) {
  const cmd = p[1] & 0x3F
  if (cmd === 6) copySamples.push(p)
  if (cmd === 38) xorSamples.push(p)
}
if (copySamples.length === 0) { console.error('No COPY samples found in input'); process.exit(2) }
if (xorSamples.length === 0) {
  // synthesize XOR from COPY by flipping instruction
  for (const p of copySamples) {
    const c = Buffer.from(p)
    c[1] = 38 & 0x3F
    xorSamples.push(c)
  }
}

// iterate over timeline and fill empty slots with copies until counts approach targets
let currCopy = currCounts.get(6) || 0
let currXor = currCounts.get(38) || 0
let copyIdx = 0
let xorIdx = 0

for (let i = 0; i < pkts.length && (currCopy < targetCopy || currXor < targetXor); i++) {
  if (!pkts[i].every((b)=>b===0)) continue
  // choose whether to place copy or xor to balance towards targets
  const needCopy = currCopy < targetCopy
  const needXor = currXor < targetXor
  if (needCopy && (!needXor || (targetCopy - currCopy) >= (targetXor - currXor))) {
    pkts[i] = copySamples[copyIdx % copySamples.length]
    copyIdx++
    currCopy++
  } else if (needXor) {
    pkts[i] = xorSamples[xorIdx % xorSamples.length]
    xorIdx++
    currXor++
  }
}

console.log('After fill COPY/XOR:', currCopy, '/', currXor)
writePackets(outPath, pkts)
console.log('Wrote', outPath)

try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx','src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) {}
