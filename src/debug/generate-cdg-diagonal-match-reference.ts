#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'
import { scheduleFontEvents } from '@/cdg/scheduler'
import { writePacketsToFile, makeEmptyPacket } from '@/cdg/encoder'
import { CDG_PACKET_SIZE } from '@/cdg/constants'

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const arr: Buffer[] = []
  for (let i = 0; i < packets; i++) arr.push(buf.slice(i * CDG_PACKET_SIZE, i * CDG_PACKET_SIZE + CDG_PACKET_SIZE))
  return arr
}

function findFirstOfCmd(pkts: Buffer[], cmd: number) {
  for (let i = 0; i < pkts.length; i++) {
    if ((pkts[i][1] & 0x3F) === cmd) return {
 idx: i, pkt: pkts[i] 
}
  }
  return null
}

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const reference = 'reference/cd+g-magic/Sample_Files/sample_project_04.cdg'
  if (!fs.existsSync(reference)) {
    console.error('Reference file not found:', reference); process.exit(2)
  }
  const refPkts = readPackets(reference)
  const refPalLo = findFirstOfCmd(refPkts, 30)
  const refPalHi = findFirstOfCmd(refPkts, 31)
  const refMem = findFirstOfCmd(refPkts, 1)
  const refBorder = findFirstOfCmd(refPkts, 2)

  const durationSeconds = 60
  const pps = 75
  const totalPacks = Math.ceil(durationSeconds * pps)

  const cols = 50
  const rows = 18

  // simple filled tile
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

  // build base packetSlots
  const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds, pps 
}, 0)

  // Insert reference palette/memory/border packets at the same indices as the reference
  if (refPalLo) packetSlots[refPalLo.idx] = refPalLo.pkt
  if (refPalHi) packetSlots[refPalHi.idx] = refPalHi.pkt
  if (refMem) packetSlots[refMem.idx] = refMem.pkt
  if (refBorder) packetSlots[refBorder.idx] = refBorder.pkt

  // Aggressive density: for each tile packet found, duplicate it many times and add XOR variants
  const pkts = packetSlots
  const INTERVAL = Math.floor(pps/2) // repeat twice per second
  for (let i = 0; i < pkts.length; i++) {
    const pkt = pkts[i]
    if (!pkt || pkt.every((b:number)=>b===0)) continue
    const cmd = pkt[1] & 0x3F
    if (cmd === 6) {
      // Make multiple duplicates nearby
      for (let d = 0; d < 3; d++) {
        const pos = i + 1 + d
        if (pos < pkts.length && pkts[pos].every((b:number)=>b===0)) pkts[pos] = pkt
      }
      // create XOR copies at +4 and +5
      const xor = Buffer.from(pkt)
      xor[1] = 38 & 0x3F
      if (i+4 < pkts.length && pkts[i+4].every((b:number)=>b===0)) pkts[i+4] = new Uint8Array(xor)
      if (i+5 < pkts.length && pkts[i+5].every((b:number)=>b===0)) pkts[i+5] = new Uint8Array(xor)

      // repeat this cluster every INTERVAL
      for (let k = 1; k <= Math.floor((pkts.length - 1 - i)/INTERVAL); k++) {
        const base = i + k*INTERVAL
        const dests = [base, base+1, base+2, base+4, base+5]
        const samples = [pkt, pkt, pkt, new Uint8Array(xor), new Uint8Array(xor)]
        for (let j = 0; j < dests.length; j++) {
          const di = dests[j]
          if (di < pkts.length && pkts[di].every((b:number)=>b===0)) pkts[di] = samples[j]
        }
      }
    }
  }

  // Also pump palette reloads: copy ref palette packets at every second start offset
  if (refPalLo && refPalHi) {
    const palLo = refPalLo.pkt
    const palHi = refPalHi.pkt
    for (let t = refPalLo.idx; t < pkts.length; t += pps) {
      if (pkts[t].every((b:number)=>b===0)) pkts[t] = palLo
      if (t+1 < pkts.length && pkts[t+1].every((b:number)=>b===0)) pkts[t+1] = palHi
    }
  }

  // Ensure last slot non-empty
  let lastNonEmpty = -1
  for (let i = pkts.length-1; i >= 0; i--) if (!pkts[i].every((b:number)=>b===0)) { lastNonEmpty = i; break }
  if (lastNonEmpty === -1) pkts[pkts.length-1] = makeEmptyPacket()
  else if (lastNonEmpty !== pkts.length-1) pkts[pkts.length-1] = pkts[lastNonEmpty]

  const outPath = path.join(outDir, 'scheduled-demo-diagonal-60s-match-ref.cdg')
  writePacketsToFile(outPath, pkts)
  console.log('Wrote', outPath)

  try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx','src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) { console.error('preview failed', e) }
}

run().catch((e)=>{ console.error(e); process.exit(2) })

export default run
