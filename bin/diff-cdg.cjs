#!/usr/bin/env node
const fs = require('fs')

if (process.argv.length !== 4) {
  console.error('Usage: diff-cdg.cjs ui.cdg cli.cdg')
  process.exit(2)
}
const a = fs.readFileSync(process.argv[2])
const b = fs.readFileSync(process.argv[3])
const pa = Math.floor(a.length/24)
const pb = Math.floor(b.length/24)
const pmin = Math.min(pa,pb)
console.log('fileA',process.argv[2], 'size', a.length, 'packets', pa)
console.log('fileB',process.argv[3], 'size', b.length, 'packets', pb)
let firstDiff = -1
for (let i=0;i<pmin;i++){
  const off = i*24
  let diff = false
  for (let j=0;j<24;j++){
    if (a[off+j] !== b[off+j]){ diff=true; break }
  }
  if (diff){ firstDiff = i; break }
}
if (firstDiff === -1){
  if (pa !== pb) {
    console.log('No packet-by-packet differences in common range; packet counts differ. First extra packet index in longer file:', pmin)
  } else {
    console.log('Files identical up to', pmin, 'packets')
  }
  process.exit(0)
}
console.log('First differing packet index:', firstDiff)
function hex(buf, off){ return Array.from(buf.slice(off, off+24)).map(x=>x.toString(16).padStart(2,'0')).join(' ') }
console.log('A packet hex:', hex(a, firstDiff*24))
console.log('B packet hex:', hex(b, firstDiff*24))
// print context +-5
const start = Math.max(0, firstDiff-5)
const end = Math.min(pmin-1, firstDiff+5)
console.log('\nContext around first difference:')
for (let i=start;i<=end;i++){
  const marker = i===firstDiff? '<<' : '  '
  console.log(marker, i.toString().padStart(5), hex(a,i*24), ' | ', hex(b,i*24))
}
