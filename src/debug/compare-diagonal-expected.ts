#!/usr/bin/env -S npx tsx

import fs from 'fs'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function analyze(cdgPath: string, durationSeconds = 60, pps = 300) {
  const buf = fs.readFileSync(cdgPath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const totalPacks = Math.ceil(durationSeconds * pps)
  console.log('Packets in file:', packets, 'expected slots:', totalPacks)

  const cols = 50
  const rows = 18
  const totalTiles = cols

  const expected: { col: number; row: number; startPack: number }[] = []
  for (let cx = 0; cx < cols; cx++) {
    const x = cx
    const y = Math.round(cx * (rows - 1) / (cols - 1))
    const startPack = Math.floor(cx * totalPacks / totalTiles)
    expected.push({
 col: x, row: y, startPack 
})
  }

  const actual: { idx: number; row: number; col: number }[] = []
  for (let i = 0; i < packets; i++) {
  const off = i * CDG_PACKET_SIZE
  const pkt = buf.slice(off, off + CDG_PACKET_SIZE)
    const cmd = pkt[1] & 0x3F
    if (cmd === 6 || cmd === 38) {
      const data = pkt.slice(3, 19)
      const row = data[2] & 0x1F
      const col = data[3] & 0x3F
      actual.push({
 idx: i, row, col 
})
    }
  }

  // For each expected col, find nearest actual packet by idx around startPack
  const results: Array<{ col:number; expRow:number; found:boolean; foundRow?:number; foundIdx?:number; delta?:number }> = []
  const halfWindow = Math.floor(totalPacks / totalTiles / 2) || 1
  for (const e of expected) {
    // search actual for packet with matching col within a window around startPack
    let best: { idx:number; row:number; delta:number } | null = null
    for (const a of actual) {
      const delta = Math.abs(a.idx - e.startPack)
      if (delta > halfWindow) continue
      if (!best || delta < best.delta) best = {
 idx: a.idx, row: a.row, delta 
}
    }
    if (best) {
      results.push({
 col: e.col, expRow: e.row, found:true, foundRow: best.row, foundIdx: best.idx, delta: best.delta 
})
    } else {
      results.push({
 col: e.col, expRow: e.row, found:false 
})
    }
  }

  // Print a concise table of mismatches
  let mismatches = 0
  for (const r of results) {
    if (!r.found || r.foundRow !== r.expRow) {
      mismatches++
      console.log('Mismatch col', r.col, 'expectedRow', r.expRow, 'found', r.found? `${r.foundRow}@${r.foundIdx} (Δ${r.delta})` : 'NONE')
    }
  }
  console.log('Total expected tiles:', results.length, 'mismatches:', mismatches)
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/compare-diagonal-expected.ts <cdg-file>')
  process.exit(2)
}

analyze(process.argv[2])
