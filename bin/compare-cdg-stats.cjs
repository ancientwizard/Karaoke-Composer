#!/usr/bin/env node
const fs = require('fs')
function cmdAt(buf, idx){return buf[idx*24+1] & 0x3F}
if (process.argv.length!==4){console.error('Usage: compare-cdg-stats.cjs a.cdg b.cdg'); process.exit(2)}
const A = fs.readFileSync(process.argv[2])
const B = fs.readFileSync(process.argv[3])
const pa = Math.floor(A.length/24), pb = Math.floor(B.length/24)
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
function totalTiles(buf){let c=0; for (let i=0;i<Math.floor(buf.length/24);i++){ if ((buf[i*24+1]&0x3F)===6) c++ } return c }
console.log('tile blocks A:', totalTiles(A),'B:', totalTiles(B))
