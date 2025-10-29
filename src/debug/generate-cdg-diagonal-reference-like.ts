#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents } from '../cdg/scheduler'
import { writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, makeEmptyPacket } from '../cdg/encoder'

async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 60
  const pps = 75
  const totalPacks = Math.ceil(durationSeconds * pps)

  const cols = 50
  const rows = 18

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

  // initial packets (we'll insert them later at targetStart)
  const palettePkts = generatePaletteLoadPackets()
  const borderPkts = generateBorderPacket(0)
  const memoryPkts = generateMemoryPresetPackets(1)
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

  const { packetSlots } = scheduleFontEvents(events, {
 durationSeconds, pps 
}, 0)

  // Choose where to place init packets (match reference placement around 600)
  const targetStart = 600
  for (let i = 0; i < initPkts.length && (targetStart + i) < packetSlots.length; i++) packetSlots[targetStart + i] = initPkts[i]

  // Re-emit palette periodically (every second)
  for (let t = targetStart; t < packetSlots.length; t += pps) {
    const slot = t
    if (slot < packetSlots.length && packetSlots[slot].every((b: number) => b === 0)) packetSlots[slot] = palettePkts[palettePkts.length - 1]
  }

  // For each tile packet, create an XOR copy shortly after and repeat them every second
  const INTERVAL = pps
  const pkts = packetSlots
  for (let i = 0; i < pkts.length; i++) {
    const pkt = pkts[i]
    if (!pkt || pkt.every((b: number) => b === 0)) continue
    const cmd = pkt[1] & 0x3F
    if (cmd === 6) {
      // create XOR copy (set instruction to 38)
      const xorCopy = Buffer.from(pkt)
      xorCopy[1] = 38 & 0x3F
      // place xor copy 2 slots after if empty
      const pos = Math.min(pkts.length - 1, i + 2)
      if (pkts[pos].every((b: number) => b === 0)) pkts[pos] = new Uint8Array(xorCopy)

      // repeat both original and xor every INTERVAL
      for (let k = 1; k <= Math.floor((pkts.length - 1 - i) / INTERVAL); k++) {
        const rpos = i + k * INTERVAL
        const rposX = Math.min(pkts.length - 1, pos + k * INTERVAL)
        if (rpos < pkts.length && pkts[rpos].every((b: number) => b === 0)) pkts[rpos] = pkt
        if (rposX < pkts.length && pkts[rposX].every((b: number) => b === 0)) pkts[rposX] = new Uint8Array(xorCopy)
      }
    }
  }

  // Ensure last slot non-empty
  const lastIndex = pkts.length - 1
  let lastNonEmpty = -1
  for (let i = pkts.length - 1; i >= 0; i--) if (!pkts[i].every((b: number) => b === 0)) { lastNonEmpty = i; break }
  if (lastNonEmpty === -1) pkts[lastIndex] = palettePkts[palettePkts.length - 1]
  else if (lastNonEmpty !== lastIndex) pkts[lastIndex] = pkts[lastNonEmpty]

  const outPath = path.join(outDir, `scheduled-demo-diagonal-60s-reference-like.cdg`)
  writePacketsToFile(outPath, pkts)
  console.log('Wrote', outPath)

  try { const cp = await import('child_process'); (cp as any).spawnSync('npx', ['tsx', 'src/debug/render-cdg-to-ppm.ts', outPath], { stdio: 'inherit' }) } catch (e) {}
}

run().catch((e) => { console.error(e); process.exit(2) })

export default run
