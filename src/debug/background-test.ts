#!/usr/bin/env -S npx tsx
import path from 'path'
import fs from 'fs'
import { CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'
import { writePacketsToFile, generateMemoryPresetPackets, generatePaletteLoadPackets } from '../cdg/encoder'

// Build a minimal CDG that: load default palette, memory preset to index 11 (magenta), write.
const out = path.join('diag','background-test.cdg')
const pal = new CDGPalette()
const palPkts = generatePaletteLoadPackets(pal)
const memPkts = generateMemoryPresetPackets(11)
const all = [...palPkts, ...memPkts]
fs.mkdirSync('diag',{recursive:true})
writePacketsToFile(out, all)
console.log('Wrote', out, 'pkts=', all.length)
// dump first packets
const buf = fs.readFileSync(out)
const PS = 24
for(let i=0;i+PS<=buf.length;i+=PS){const p=buf.slice(i,i+PS);const inst=p[1]&0x3F;console.log('pkt',i/PS,'inst=0x'+inst.toString(16),'d0=',p[3],'d1=',p[4])}
