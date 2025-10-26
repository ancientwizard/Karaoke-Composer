#!/usr/bin/env node
/*
# diff-cdg

Summary: Find the Nth differing 24-byte packet between two .cdg files and show surrounding context.

Usage:
  $ diff-cdg.cjs --run [--packet N] a.cdg b.cdg

Options:
  --help     Show this help (outputs this comment block as markdown)
  --run      Execute the diff (without this the script prints usage)
  --packet N Look for the Nth differing packet (default: 1 — the first difference)
*/
const fs = require('fs')
const { readScriptMd } = require('../src/utils/bin-utils.cjs')

const raw = process.argv.slice(2)
// parse flags and positional args while allowing flags before args
let packetTarget = 1
let files = []
for (let i = 0; i < raw.length; i++) {
  const v = raw[i]
  if (v === '--help') { console.log(readScriptMd(__filename).join('\n')); process.exit(0) }
  if (v === '--run') continue
  if (v.startsWith('--packet=')) { packetTarget = Number(v.split('=')[1]); continue }
  if (v === '--packet') { const next = raw[i+1]; if (!next) { console.error('Missing value for --packet'); process.exit(2) } packetTarget = Number(next); i++; continue }
  if (v.startsWith('--')) continue
  files.push(v)
}
const shouldRun = raw.includes('--run')
if (!shouldRun) { console.log('Usage: diff-cdg.cjs --run [--packet N] a.cdg b.cdg'); console.log('Use --help to show extended usage (markdown).'); process.exit(0) }
if (files.length !== 2) { console.error('Usage: diff-cdg.cjs a.cdg b.cdg --run'); process.exit(2) }
if (!Number.isFinite(packetTarget) || packetTarget < 1) { console.error('Invalid --packet value:', packetTarget); process.exit(2) }
const a = fs.readFileSync(files[0])
const b = fs.readFileSync(files[1])
const pa = Math.floor(a.length/24)
const pb = Math.floor(b.length/24)
const pmin = Math.min(pa,pb)
console.log('fileA', files[0], 'size', a.length, 'packets', pa)
console.log('fileB', files[1], 'size', b.length, 'packets', pb)
let found = 0
let targetIndex = -1
for (let i = 0; i < pmin; i++) {
  const off = i * 24
  let diff = false
  for (let j = 0; j < 24; j++) {
    if (a[off + j] !== b[off + j]) { diff = true; break }
  }
  if (diff) {
    found++
    if (found === packetTarget) { targetIndex = i; break }
  }
}
if (targetIndex === -1) {
  if (found === 0 && pa !== pb) {
    console.log('No packet-by-packet differences in common range; packet counts differ. First extra packet index in longer file:', pmin)
    process.exit(0)
  }
  console.error(`Found only ${found} differing packets (requested ${packetTarget}).`)
  process.exit(2)
}
console.log('Differing packet index (0-based):', targetIndex)
function hex(buf, off){ return Array.from(buf.slice(off, off+24)).map(x=>x.toString(16).padStart(2,'0')).join(' ') }
console.log('A packet hex:', hex(a, targetIndex*24))
console.log('B packet hex:', hex(b, targetIndex*24))
// print context +-5
const start = Math.max(0, targetIndex - 5)
const end = Math.min(pmin - 1, targetIndex + 5)
console.log(`\nContext around differing packet #${targetIndex} (0-based):`)
for (let i = start; i <= end; i++) {
  const marker = i === targetIndex ? '<<' : '  '
  console.log(marker, i.toString().padStart(5), hex(a, i * 24), ' | ', hex(b, i * 24))
}
