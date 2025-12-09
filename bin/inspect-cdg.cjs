#!/usr/bin/env node
/*
# inspect-cdg

Summary: Inspect a .cdg file and report size, checksums, packet counts and hex dumps.

Usage:
  $ inspect-cdg.cjs --run <file1.cdg> [file2.cdg ...]
  $ inspect-cdg.cjs --run --range 600-700 <file.cdg>     (inspect packets 600-700 only)
  $ inspect-cdg.cjs --run --compare file1.cdg file2.cdg   (compare two files)

Options:
  --help      Show this help (outputs this comment block as markdown)
  --run       Execute the script (without this the script prints usage)
  --range     Inspect specific packet range (e.g., --range 600-700)
  --compare   Compare two files packet-by-packet
*/
const fs = require('fs')
const crypto = require('crypto')
const { readScriptMd } = require('../src/utils/bin-utils.cjs')
const { CDG_PACKET_SIZE, CDG_PPS } = require('../src/cdg/constants.cjs')

const args = process.argv.slice(2)
if (args.includes('--help')) {
  const md = readScriptMd(__filename)
  console.log(md.join('\n'))
  process.exit(0)
}
const shouldRun = args.includes('--run')
if (!shouldRun) {
  console.log('Usage: inspect-cdg.cjs --run <file1.cdg> [file2.cdg ...]')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}

// Parse command line args
const rangeIdx = args.indexOf('--range')
let range = null
if (rangeIdx !== -1 && rangeIdx + 1 < args.length) {
  const rangeStr = args[rangeIdx + 1]
  const parts = rangeStr.split('-')
  if (parts.length === 2) {
    range = [parseInt(parts[0], 10), parseInt(parts[1], 10)]
  }
}

const compareIdx = args.indexOf('--compare')
let compareMode = false
if (compareIdx !== -1) {
  compareMode = true
}

// filter out flags to get files
const files = args.filter(a => !a.startsWith('--') && !a.match(/^\d+-\d+$/))

function hexdump(buf, offset = 0, len = 24)
{
  return Array.from(buf.slice(offset, offset + len))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

function readPackets(buf)
{
  const packets = []
  for (let i = 0; i < buf.length; i += CDG_PACKET_SIZE) {
    packets.push(Buffer.from(buf.slice(i, i + CDG_PACKET_SIZE)))
  }
  return packets
}

function bufToHex(buf)
{
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

function pktEqual(a, b)
{
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function compareFiles(file1, file2)
{
  if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
    throw new Error(`Files not found: ${file1} or ${file2}`)
  }

  const buf1 = fs.readFileSync(file1)
  const buf2 = fs.readFileSync(file2)
  const pkts1 = readPackets(buf1)
  const pkts2 = readPackets(buf2)

  console.log(`\n=== COMPARISON: ${file1} vs ${file2} ===`)
  console.log(`File 1: ${pkts1.length} packets, ${buf1.length} bytes`)
  console.log(`File 2: ${pkts2.length} packets, ${buf2.length} bytes`)

  if (pkts1.length !== pkts2.length) {
    console.log(`WARNING: Different packet counts (${pkts1.length} vs ${pkts2.length})`)
  }

  const minLen = Math.min(pkts1.length, pkts2.length)
  let diffCount = 0
  const diffIndices = []

  for (let i = 0; i < minLen; i++) {
    if (!pktEqual(pkts1[i], pkts2[i])) {
      diffIndices.push(i)
      diffCount++
    }
  }

  if (diffCount === 0) {
    console.log(`✓ Files are IDENTICAL (first ${minLen} packets)`)
  } else {
    console.log(`✗ ${diffCount} packets differ`)
    console.log('\nFirst 10 differences:')
    for (let i = 0; i < Math.min(10, diffIndices.length); i++) {
      const idx = diffIndices[i]
      console.log(`\nPacket ${idx}:`)
      console.log(`  File 1: ${bufToHex(pkts1[idx])}`)
      console.log(`  File 2: ${bufToHex(pkts2[idx])}`)
    }
    if (diffCount > 10) {
      console.log(`\n... and ${diffCount - 10} more differences`)
    }
  }
}

function inspect(file, rangeSpec = null)
{
  const data = fs.readFileSync(file)
  const size = data.length
  const md5 = crypto.createHash('md5').update(data).digest('hex')
  const sha1 = crypto.createHash('sha1').update(data).digest('hex')
  const packets = Math.floor(size / CDG_PACKET_SIZE)
  const remainder = size % CDG_PACKET_SIZE

  console.log('\n===', file)
  console.log('size:', size, 'bytes')
  console.log('md5:', md5)
  console.log('sha1:', sha1)
  console.log('packets (' + CDG_PACKET_SIZE + 'B):', packets, 'remainder:', remainder)
  console.log('estimated duration:', (packets / CDG_PPS).toFixed(2), 's')

  const commandCounts = {}
  let emptyCount = 0
  let memPreset = 0
  let borderPreset = 0
  let paletteLow = 0
  let paletteHigh = 0
  let tileBlock = 0
  let tileXor = 0

  // Determine range to analyze
  let startPkt = 0
  let endPkt = packets
  if (rangeSpec) {
    startPkt = rangeSpec[0]
    endPkt = Math.min(rangeSpec[1] + 1, packets)
    console.log(`\nFocusing on packets ${startPkt}-${endPkt - 1} (${endPkt - startPkt} packets)`)
  }

  for (let i = startPkt; i < endPkt; i++) {
    const off = i * CDG_PACKET_SIZE
    const cmd = data[off + 1] & 0x3f
    commandCounts[cmd] = (commandCounts[cmd] || 0) + 1
    const allZero = (() => {
      for (let j = off + 1; j < off + 19; j++) {
        if (data[j] !== 0) return false
      }
      return true
    })()
    if (allZero) emptyCount++
    if (cmd === 1) memPreset++
    if (cmd === 2) borderPreset++
    if (cmd === 30) paletteLow++
    if (cmd === 31) paletteHigh++
    if (cmd === 6) tileBlock++
    if (cmd === 38) tileXor++
  }

  console.log('empty packets (heuristic):', emptyCount)
  console.log('memory preset:', memPreset, 'border preset:', borderPreset)
  console.log('palette low/high:', paletteLow, '/', paletteHigh)
  console.log('tile blocks (normal/xor):', tileBlock, '/', tileXor)

  console.log('\nTop command counts:')
  Object.entries(commandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([k, v]) => {
      console.log(' cmd', k.padStart(2), '=', v)
    })

  // Hex dumps
  const dumpStart = Math.min(32, endPkt)
  console.log(`\nFirst ${dumpStart} packets (hex):`)
  for (let i = startPkt; i < Math.min(startPkt + dumpStart, endPkt); i++) {
    const off = i * CDG_PACKET_SIZE
    console.log(i.toString().padStart(4), hexdump(data, off, CDG_PACKET_SIZE))
  }

  const dumpEnd = Math.min(32, packets)
  console.log(`\nLast ${dumpEnd} packets (hex):`)
  for (let i = Math.max(startPkt, packets - dumpEnd); i < endPkt; i++) {
    const off = i * CDG_PACKET_SIZE
    console.log(i.toString().padStart(4), hexdump(data, off, CDG_PACKET_SIZE))
  }
}

if (files.length === 0) {
  console.log('No files provided. Usage: inspect-cdg.cjs --run <file1.cdg> [file2.cdg ...]')
  process.exit(1)
}

if (compareMode) {
  if (files.length < 2) {
    console.error('--compare requires at least 2 files')
    process.exit(1)
  }
  compareFiles(files[0], files[1])
} else {
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!fs.existsSync(f)) {
      console.error('File not found:', f)
      continue
  }
  try {
    inspect(f, range)
  } catch (e) {
    console.error('Error inspecting', f, e)
  }
  }
}
