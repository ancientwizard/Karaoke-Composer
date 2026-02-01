#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import GeneratorByFunction from './generate-by-function'

async function run() {
  const out = path.join('diag', 'single-block-test.cdg')
  const g = new (GeneratorByFunction as any)({
 pps: 300, autoRenderBlocks: true 
})
  // ensure palette index 1 is bright
  g.setColor(1, 255, 0, 0)
  g.clearScreen(0)
  g.setBorderColor(2)

  // set a single pixel at top-left (0,0)
  g.setBlockBit(0, 0, 0, 0, 1)
  // set another pixel at (5,11) bottom-right of block 0,0 to test lines
  g.setBlockBit(0, 0, 5, 11, 1)

  g.advanceSeconds(0.5)
  g.write(out)
  console.log('Wrote', out)

  // read file and dump tile packets
  const buf = fs.readFileSync(out)
  const PS = 24
  for (let i = 0; i + PS <= buf.length; i += PS) {
    const pkt = buf.slice(i, i + PS)
    const cmd = pkt[0]
    const inst = pkt[1] & 0x3F
    if (cmd === 0x09 && (inst === 0x06 || inst === 0x26)) {
      // CDGPacket.setData places data starting at buffer[3] (CD+G Magic encoding).
      // The row/col are at offsets 5/6 and pixel lines occupy 7..18.
      const y = pkt[5] & 0x3F
      const x = pkt[6] & 0x3F
      const lines = Array.from(pkt.slice(7, 19)).map(b => b & 0x3F)
      console.log(`pkt@${i / PS} inst=0x${inst.toString(16)} block=${x},${y} lines=${lines.map(l=>l.toString(2).padStart(6,'0')).join(' ')}`)
    }
  }
}

run().catch((e)=>{ console.error(e); process.exit(2) })
