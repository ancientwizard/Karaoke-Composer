#!/usr/bin/env node
/*
# compare-cdg-stats

Summary: Compare two .cdg files for packet-count differences and where one file has empty packets while the other has tile blocks.

Usage:
  $ compare-cdg-stats.cjs --run a.cdg b.cdg

Options:
  --help   Show this help (outputs this comment block as markdown)
  --run    Execute the comparison (without this the script prints usage)
*/
const fs = require('fs')
const { readScriptMd } = require('../src/utils/bin-utils.cjs')
const { CDG_PACKET_SIZE } = require('../src/cdg/constants.cjs')

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log(readScriptMd(__filename).join('\n'))
  process.exit(0)
}
const shouldRun = args.includes('--run')
if (!shouldRun) {
  console.log('Usage: compare-cdg-stats.cjs --run a.cdg b.cdg')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}
const files = args.filter(a=>!a.startsWith('--'))
if (files.length !== 2) { console.error('Usage: compare-cdg-stats.cjs a.cdg b.cdg --run'); process.exit(2) }
const A = fs.readFileSync(files[0])
const B = fs.readFileSync(files[1])
function cmdAt(buf, idx){ return buf[idx*CDG_PACKET_SIZE+1] & 0x3F }
const pa = Math.floor(A.length / CDG_PACKET_SIZE), pb = Math.floor(B.length / CDG_PACKET_SIZE)
console.log('packets A',pa,'packets B',pb,'diff',pb-pa)
let countAemptyBtile=0
let countBemptyAtile=0
let indicesAemptyBtile=[]
let indicesBemptyAtile=[]
for (let i=0;i<Math.min(pa,pb);i++){
  const ca = cmdAt(A,i)
  const cb = cmdAt(B,i)
  if (ca===0 && cb===6) { countAemptyBtile++; if (indicesAemptyBtile.length<20) indicesAemptyBtile.push(i) }
  if (cb===0 && ca===6) { countBemptyAtile++; if (indicesBemptyAtile.length<20) indicesBemptyAtile.push(i) }
}
console.log('A empty & B tile6 count:', countAemptyBtile, 'sample indices:', indicesAemptyBtile.join(', '))
console.log('B empty & A tile6 count:', countBemptyAtile, 'sample indices:', indicesBemptyAtile.join(', '))
// also report total tile counts
function totalTiles(buf){
  let c=0
  for (let i=0;i<Math.floor(buf.length / CDG_PACKET_SIZE);i++){
    if ((buf[i*CDG_PACKET_SIZE+1]&0x3F)===6) c++
  }
  return c
}
console.log('tile blocks A:', totalTiles(A),'B:', totalTiles(B))
