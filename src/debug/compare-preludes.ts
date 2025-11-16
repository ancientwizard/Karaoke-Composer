#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { ReferenceReplayer } from '../cdg/referenceReplayer'

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 2) { console.error('Usage: npx tsx src/debug/compare-preludes.ts <a.cdg> <b.cdg> [--packs N]'); process.exit(2) }
  const aPath = argv[0]
  const bPath = argv[1]
  const packsIdx = argv.indexOf('--packs')
  const packs = (packsIdx !== -1 && argv.length > packsIdx + 1) ? Number(argv[packsIdx + 1]) : undefined

  if (!fs.existsSync(aPath)) { console.error('A path not found:', aPath); process.exit(2) }
  if (!fs.existsSync(bPath)) { console.error('B path not found:', bPath); process.exit(2) }

  const reA = new ReferenceReplayer(aPath, 24, 512)
  const reB = new ReferenceReplayer(bPath, 24, 512)
  const maxCompare = Math.min(reA.refPktCount, reB.refPktCount, packs || Math.max(reA.refPktCount, reB.refPktCount))

  console.log(`Comparing first ${maxCompare} packets: ${path.basename(aPath)} vs ${path.basename(bPath)}`)

  // Packet-level header+data comparison (bytes 0..18)
  let diffCount = 0
  const diffs: number[] = []
  for (let i = 0; i < maxCompare; i++) {
    const sa = reA.getPacketSlice(i, 1)
    const sb = reB.getPacketSlice(i, 1)
    if (sa.length !== sb.length) {
      diffCount++
      if (diffs.length < 20) diffs.push(i)
      continue
    }
    const aHdr = sa.slice(0, 19)
    const bHdr = sb.slice(0, 19)
    if (!aHdr.equals(bHdr)) {
      diffCount++
      if (diffs.length < 20) diffs.push(i)
    }
  }

  console.log(`Packet-level differences in first ${maxCompare} packets: ${diffCount}`)
  if (diffs.length > 0) console.log('First differing packet indices:', diffs.join(','))

  // VRAM snapshot comparison after applying first maxCompare packets
  const vramA = reA.getVRAMAt(maxCompare)
  const vramB = reB.getVRAMAt(maxCompare)
  const aData = vramA.data
  const bData = vramB.data
  let vdiff = 0
  for (let i = 0; i < Math.min(aData.length, bData.length); i++) if (aData[i] !== bData[i]) vdiff++
  const total = Math.max(aData.length, bData.length)
  console.log(`VRAM byte differences after ${maxCompare} packets: ${vdiff}/${total} (${(vdiff / total * 100).toFixed(2)}%)`)

  // Command-type summary for the prelude region
  function cmdSummary(refBuf: Buffer, upto: number) {
    const pktSize = 24
    const counts: Record<number, number> = {}
    for (let i = 0; i < upto; i++) {
      const base = i * pktSize
      if (base + pktSize > refBuf.length) break
      const cmd = refBuf[base + 1] & 0x3F
      counts[cmd] = (counts[cmd] || 0) + 1
    }
    return counts
  }

  const aBuf = fs.readFileSync(aPath)
  const bBuf = fs.readFileSync(bPath)
  const aSummary = cmdSummary(aBuf, maxCompare)
  const bSummary = cmdSummary(bBuf, maxCompare)
  console.log('Command-type counts (first packets) A:')
  console.log(aSummary)
  console.log('Command-type counts (first packets) B:')
  console.log(bSummary)

}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
