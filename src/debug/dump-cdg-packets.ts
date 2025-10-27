#!/usr/bin/env -S tsx
import fs from 'fs'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function dump(filePath: string, max=200) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  console.log('Packets:', packets)
  const countsByCol = new Map<number, number>()
  const countsByRow = new Map<number, number>()
  let seen = 0
  for (let i = 0; i < packets; i++) {
  const off = i * CDG_PACKET_SIZE
  const pkt = buf.slice(off, off + CDG_PACKET_SIZE)
    const cmd = pkt[1] & 0x3F
    if (cmd === 6 || cmd === 38) {
      const data = pkt.slice(3, 19)
      const color0 = data[0] & 0x0F
      const color1 = data[1] & 0x0F
      const row = data[2] & 0x1F
      const col = data[3] & 0x3F
      countsByCol.set(col, (countsByCol.get(col)||0)+1)
      countsByRow.set(row, (countsByRow.get(row)||0)+1)
      if (seen < max) console.log(i, cmd, 'row', row, 'col', col, 'c0', color0, 'c1', color1)
      seen++
    }
  }
  console.log('Tile packets total:', seen)
  const colArr = Array.from(countsByCol.entries()).sort((a,b)=>b[1]-a[1])
  const rowArr = Array.from(countsByRow.entries()).sort((a,b)=>b[1]-a[1])
  console.log('Top cols:', colArr.slice(0,10))
  console.log('Top rows:', rowArr.slice(0,10))
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx src/debug/dump-cdg-packets.ts <cdg-file> [max]')
  process.exit(2)
}
const max = process.argv[3] ? parseInt(process.argv[3],10) : 200
dump(process.argv[2], max)
