#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { scheduleFontEvents } from '@/cdg/scheduler'
import { CDG_PPS } from '@/cdg/constants'
import { writePacketsToFile, makeEmptyPacket } from '@/cdg/encoder'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets: Buffer[] = []
  for (let i = 0; i < Math.floor(buf.length / CDG_PACKET_SIZE); i++) packets.push(buf.slice(i * CDG_PACKET_SIZE, i * CDG_PACKET_SIZE + CDG_PACKET_SIZE))
  return packets
}

function extractFirstPalettePackets(samplePath: string) {
  const pkts = readPackets(samplePath)
  let lo: Buffer|null = null
  let hi: Buffer|null = null
  for (let i = 0; i < pkts.length; i++) {
    const p = pkts[i]
    const cmd = p[1] & 0x3F
    if (cmd === 30 && !lo) lo = p
    if (cmd === 31 && !hi) hi = p
    if (lo && hi) break
  }
  return {
 lo, hi 
}
}

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const sample = path.join(process.cwd(), 'reference', 'cd+g-magic', 'Sample_Files', 'sample_project_04.cdg')
  if (!fs.existsSync(sample)) throw new Error('Reference sample not found: ' + sample)

  const { lo: palLo, hi: palHi } = extractFirstPalettePackets(sample)
  if (!palLo || !palHi) throw new Error('Could not extract palette packets from sample')

  const durationSeconds = parseInt(process.env.DURATION_SECONDS || '60', 10)
  const pps = CDG_PPS
  const totalPacks = Math.ceil(durationSeconds * pps)

  const cols = 50
  const rows = 18

  // build a filled 6x12 tile
  const tilePixels: number[][] = []
  for (let y = 0; y < 12; y++) {
    const row: number[] = []
    for (let x = 0; x < 6; x++) row.push(1)
    tilePixels.push(row)
  }

  const events: any[] = []
  for (let cx = 0; cx < cols; cx++) {
    const x = cx
    const y = Math.round(cx * (rows - 1) / (cols - 1))
    const startPack = Math.floor(cx * totalPacks / cols)
    const durationPacks = Math.max(1, Math.floor(totalPacks / cols))
    events.push({
 blockX: x, blockY: y, pixels: tilePixels, startPack, durationPacks 
})
  }

  // schedule base packets (we'll post-process to densify)
  const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds, pps 
}, 0)

  // Insert exact palette packets from sample at 600/601
  const targetStart = 600
  if (palLo) packetSlots[targetStart] = new Uint8Array(palLo)
  if (palHi) packetSlots[targetStart + 1] = new Uint8Array(palHi)

  // also insert memory & border packets copied from sample if present near palette
  const samplePkts = readPackets(sample)
  // search for first memory (cmd 1) and border (2) near palette in sample
  let mem: Buffer|null = null
  let bord: Buffer|null = null
  for (let i = 0; i < samplePkts.length && i < 2000; i++) {
    const p = samplePkts[i]
    const cmd = p[1] & 0x3F
    if (cmd === 1 && !mem) mem = p
    if (cmd === 2 && !bord) bord = p
    if (mem && bord) break
  }
  if (bord) packetSlots[targetStart + 2] = new Uint8Array(bord)
  if (mem) {
    // place several memory preset packets following
    for (let i = 0; i < 8; i++) {
      if (targetStart + 3 + i < packetSlots.length) packetSlots[targetStart + 3 + i] = new Uint8Array(mem)
    }
  }

  // Densify tile packets to match reference-like counts
  // Target per-column repeats seconds
  const repeatSeconds = 16 // repeat each tile for 16 seconds => ~2 * 50 * 16 = 1600 packets
  for (let col = 0; col < cols; col++) {
    const basePos = Math.floor(col * totalPacks / cols)
    for (let s = 0; s < repeatSeconds; s++) {
      const pos = basePos + s * pps
      if (pos >= packetSlots.length) break
      // ensure COPY present: if empty, use nearby produced packet by scheduler or build a simple copy packet
      if (packetSlots[pos].every((b: number) => b === 0)) {
        // try to find original packet produced by scheduler for this block
        let found: Uint8Array|null = null
        for (let j = Math.max(0, pos - 8); j < Math.min(packetSlots.length, pos + 8); j++) {
          const p = packetSlots[j]
          if (!p.every((b:number)=>b===0) && ((p[1]&0x3F) === 6)) { found = p; break }
        }
        if (found) packetSlots[pos] = found
        else packetSlots[pos] = makeEmptyPacket()
      }
      // XOR shortly after
      const posX = Math.min(packetSlots.length - 1, pos + 2)
      if (packetSlots[posX].every((b:number)=>b===0)) {
        if (!packetSlots[pos].every((b:number)=>b===0)) {
          const copy = Buffer.from(packetSlots[pos])
          copy[1] = 38 & 0x3F
          packetSlots[posX] = new Uint8Array(copy)
        }
      }
    }
  }

  // Re-emit palette periodically with exact sample packets
  for (let t = targetStart; t < packetSlots.length; t += pps) {
    if (packetSlots[t].every((b:number)=>b===0)) packetSlots[t] = new Uint8Array(palLo)
    if (t+1 < packetSlots.length && packetSlots[t+1].every((b:number)=>b===0)) packetSlots[t+1] = new Uint8Array(palHi)
  }

  // Ensure last slot non-empty
  const lastIndex = packetSlots.length - 1
  let lastNonEmpty = -1
  for (let i = packetSlots.length - 1; i >= 0; i--) if (!packetSlots[i].every((b:number)=>b===0)) { lastNonEmpty = i; break }
  if (lastNonEmpty === -1) packetSlots[lastIndex] = makeEmptyPacket()
  else if (lastNonEmpty !== lastIndex) packetSlots[lastIndex] = packetSlots[lastNonEmpty]

  const outPath = path.join(outDir, `scheduled-demo-diagonal-60s-closer.cdg`)
  writePacketsToFile(outPath, packetSlots)
  console.log('Wrote', outPath)
}

run().catch((e)=>{ console.error(e); process.exit(2) })

export default run
