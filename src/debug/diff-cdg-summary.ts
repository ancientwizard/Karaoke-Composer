#!/usr/bin/env -S npx tsx

import fs from 'fs'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function hex(buf: Buffer) { return Array.from(buf).map(b=>b.toString(16).padStart(2,'0')).join(' ') }

function summarize(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const counts = new Map<number, number>()
  const firstIndex = new Map<number, number>()
  for (let i = 0; i < packets; i++) {
  const off = i * CDG_PACKET_SIZE
    const cmd = buf[off + 1] & 0x3F
    counts.set(cmd, (counts.get(cmd)||0)+1)
    if (!firstIndex.has(cmd)) firstIndex.set(cmd, i)
  }
  return {
 packets, counts, firstIndex 
}
}

function diff(aPath: string, bPath: string, maxDiffs=64) {
  const a = fs.readFileSync(aPath)
  const b = fs.readFileSync(bPath)
  const aPackets = Math.floor(a.length / CDG_PACKET_SIZE)
  const bPackets = Math.floor(b.length / CDG_PACKET_SIZE)
  const minPk = Math.min(aPackets, bPackets)
  console.log('File A:', aPath, 'packets=', aPackets)
  console.log('File B:', bPath, 'packets=', bPackets)

  const aSum = summarize(aPath)
  const bSum = summarize(bPath)

  console.log('\nCommand counts (cmd -> A | B):')
  const cmds = new Set<number>([...aSum.counts.keys(), ...bSum.counts.keys()])
  for (const cmd of Array.from(cmds).sort((x,y)=>x-y)) {
    console.log(cmd.toString().padStart(2,' '), ' -> ', (aSum.counts.get(cmd)||0).toString().padStart(5),'|', (bSum.counts.get(cmd)||0).toString().padStart(5))
  }

  const keyCmds = [30,31,1,2]
  console.log('\nFirst indices of key commands (30 LO palette,31 HI palette,1 memory,2 border):')
  for (const k of keyCmds) {
    console.log(k, 'A@', aSum.firstIndex.get(k) ?? 'NA', 'B@', bSum.firstIndex.get(k) ?? 'NA')
  }

  console.log('\nFirst differing packets (up to', maxDiffs, '):')
  let diffs = 0
  for (let i = 0; i < minPk; i++) {
  const ao = i * CDG_PACKET_SIZE
  const bo = i * CDG_PACKET_SIZE
  const ap = a.slice(ao, ao + CDG_PACKET_SIZE)
  const bp = b.slice(bo, bo + CDG_PACKET_SIZE)
    if (!ap.equals(bp)) {
      console.log('idx', i, 'A_cmd', (ap[1]&0x3F), 'B_cmd', (bp[1]&0x3F))
      console.log(' A:', hex(ap.slice(0,8)))
      console.log(' B:', hex(bp.slice(0,8)))
      diffs++
      if (diffs >= maxDiffs) break
    }
  }
  if (diffs === 0) console.log('No byte-level differences in first', minPk, 'packets')
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/diff-cdg-summary.ts <fileA> <fileB>')
  process.exit(2)
}

diff(process.argv[2], process.argv[3])
