#!/usr/bin/env -S npx tsx

/**
 * inspect-generate-by-function-demo.ts
 *
 * Reconstruct the demo packet stream produced by `generate-by-function --run`,
 * read the generated CDG file `diag/generate-by-function-demo.cdg`, and compare
 * the two packet streams. Print a short summary and first mismatches.
 */

import fs from 'fs'
import path from 'path'
import GeneratorByFunction from './generate-by-function'
import { CDGCommand } from '../karaoke/renderers/cdg/CDGPacket'

const PKT_SIZE = 24

function readPacketsFromFile(filePath: string): Uint8Array[] {
  const buf = fs.readFileSync(filePath)
  const count = Math.floor(buf.length / PKT_SIZE)
  const out: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    out.push(Uint8Array.from(buf.slice(i * PKT_SIZE, (i + 1) * PKT_SIZE)))
  }
  return out
}

function hexPreview(pkt: Uint8Array, n = 12) {
  return Array.from(pkt.slice(0, n)).map((b) => b.toString(16).padStart(2, '0')).join(' ')
}

function countCommands(pkts: Uint8Array[]) {
  const map = new Map<number, number>()
  for (const p of pkts) {
    const cmd = p[1]
    map.set(cmd, (map.get(cmd) || 0) + 1)
  }
  return map
}

function printCommandSummary(map: Map<number, number>) {
  const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  for (const [cmd, cnt] of entries) {
    const name = (CDGCommand as any)[cmd] || `CMD(${cmd})`
    console.log(`  ${name} (${cmd}): ${cnt}`)
  }
}

async function main() {
  const outPath = path.join('diag', 'generate-by-function-demo.cdg')
  if (!fs.existsSync(outPath)) {
    console.error('Demo CDG not found at', outPath)
    console.error('Run: npx tsx src/debug/generate-by-function.ts --run')
    process.exit(2)
  }

  // Reconstruct expected packet stream (same sequence as demo block)
  const g = new GeneratorByFunction({ pps: 300 })
  g.setLowerColor(1, 255, 255, 0)
  g.setBorderColor(1)
  g.clearScreen(0)
  g.setBlockBit(10, 5, 0, 0, 1)
  g.advanceSeconds(0.5)
  g.setBlockBit(10, 5, 1, 0, 1)
  g.renderAllBlocks()
  const expected = g.getPacketStream()

  const filePkts = readPacketsFromFile(outPath)

  console.log(`Expected packets: ${expected.length}`)
  console.log(`File packets:     ${filePkts.length}`)

  const min = Math.min(expected.length, filePkts.length)
  let matches = 0
  const mismatches: number[] = []
  for (let i = 0; i < min; i++) {
    const a = expected[i]
    const b = filePkts[i]
    let ok = true
    for (let j = 0; j < PKT_SIZE; j++) if (a[j] !== b[j]) { ok = false; break }
    if (ok) matches++
    else mismatches.push(i)
  }

  console.log(`Matching packets in overlap: ${matches}/${min}`)
  if (filePkts.length !== expected.length) console.log('Packet count mismatch between expected and file')

  if (mismatches.length > 0) {
    console.log('First mismatches (index, expected[0..11], file[0..11]):')
    for (let k = 0; k < Math.min(10, mismatches.length); k++) {
      const idx = mismatches[k]
      console.log(`- idx ${idx}:`)
      console.log(`   expected: ${hexPreview(expected[idx])}`)
      console.log(`   file:     ${hexPreview(filePkts[idx])}`)
    }
  } else {
    console.log('No byte-level mismatches in overlap region')
  }

  console.log('\nCommand summary for expected:')
  printCommandSummary(countCommands(expected))
  console.log('\nCommand summary for file:')
  printCommandSummary(countCommands(filePkts))

  if (mismatches.length === 0 && filePkts.length === expected.length) {
    console.log('\nFile matches expected packet stream exactly.')
    process.exit(0)
  } else {
    console.log('\nFile DOES NOT match expected packet stream exactly.')
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(2) })
