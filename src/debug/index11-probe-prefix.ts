#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { CDG_PACKET_SIZE } from '../cdg/constants'
import { writePacketsToFile } from '../cdg/encoder'

function readPackets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const packets = Math.floor(buf.length / CDG_PACKET_SIZE)
  const arr: Uint8Array[] = []
  for (let i = 0; i < packets; i++) arr.push(new Uint8Array(buf.slice(i * CDG_PACKET_SIZE, i * CDG_PACKET_SIZE + CDG_PACKET_SIZE)))
  return arr
}

if (process.argv.length < 4) {
  console.error('Usage: npx tsx src/debug/index11-probe-prefix.ts <reference.cdg> <base-probe.cdg> [numPackets|nonempty]')
  console.error(' Example: npx tsx src/debug/index11-probe-prefix.ts ref.cdg diag/index11-probe-baseline.cdg 32')
  console.error(' Example (nonempty): npx tsx src/debug/index11-probe-prefix.ts ref.cdg diag/index11-probe-baseline.cdg nonempty')
  process.exit(2)
}

const refPath = process.argv[2]
const basePath = process.argv[3]
const selector = process.argv[4] || 'nonempty'

const refPkts = readPackets(refPath)
const basePkts = readPackets(basePath)

let prefix: Uint8Array[] = []
if (selector === 'nonempty') {
  // take first run of non-empty packets from ref
  for (let i = 0; i < refPkts.length; i++) {
    const p = refPkts[i]
    const empty = p.every((b) => b === 0)
    if (!empty) prefix.push(p)
    else break
  }
} else {
  const n = Math.max(0, parseInt(selector, 10) || 0)
  prefix = refPkts.slice(0, n)
}

if (prefix.length === 0) {
  console.error('No prefix packets extracted from reference; aborting')
  process.exit(2)
}

// Build new packet array: prepend prefix, then base packets (overwrite the first prefix.length of base with prefix to preserve length)
const outPkts: Uint8Array[] = []
outPkts.push(...prefix)
outPkts.push(...basePkts)

const outPath = path.join(path.dirname(basePath), path.basename(basePath, path.extname(basePath)) + `-withprefix.cdg`)
writePacketsToFile(outPath, outPkts)
console.log('Wrote', outPath, ' (prefix packets=', prefix.length, ')')
