#!/usr/bin/env -S npx tsx

/*
# diff-cdg

Summary: Find the Nth differing 24-byte packet between two .cdg files and show surrounding context.

Usage:
  $ diff-cdg.ts --run [--packet N] a.cdg b.cdg

Options:
  --help     Show this help (outputs this comment block as markdown)
  --run      Execute the diff (without this the script prints usage)
  --packet N Look for the Nth differing packet (default: 1 — the first difference)
*/
import fs from 'fs'
import { readScriptMd     } from '@/utils/bin-utils'
import { CDG_PACKET_SIZE  } from '@/cdg/constants'
import { fileURLToPath    } from 'url'

const scriptPath = fileURLToPath(import.meta.url)

const raw = process.argv.slice(2)
let packetTarget = 1
const files: string[] = []
for (let i = 0; i < raw.length; i++)
{
  const v = raw[i]
  if (v === '--help') { console.log(readScriptMd(scriptPath).join('\n')); process.exit(0) }
  if (v === '--run') continue
  if (v.startsWith('--packet=')) { packetTarget = Number(v.split('=')[1]); continue }
  if (v === '--packet')
  {
    const next = raw[i + 1]
    if (!next) { console.error('Missing value for --packet'); process.exit(2) }
    packetTarget = Number(next)
    i++
    continue
  }
  if (v.startsWith('--')) continue
  files.push(v)
}
const shouldRun = raw.includes('--run')
if (!shouldRun)
{
  console.log('Usage: diff-cdg.ts --run [--packet N] a.cdg b.cdg')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}
if (files.length !== 2)
{
  console.error('Usage: diff-cdg.ts a.cdg b.cdg --run')
  process.exit(2)
}
if (!Number.isFinite(packetTarget) || packetTarget < 1)
{
  console.error('Invalid --packet value:', packetTarget)
  process.exit(2)
}
const a = fs.readFileSync(files[0])
const b = fs.readFileSync(files[1])
const pa = Math.floor(a.length / CDG_PACKET_SIZE)
const pb = Math.floor(b.length / CDG_PACKET_SIZE)
const pmin = Math.min(pa, pb)
console.log('fileA', files[0], 'size', a.length, 'packets', pa)
console.log('fileB', files[1], 'size', b.length, 'packets', pb)
let found = 0
let targetIndex = -1
for (let i = 0; i < pmin; i++)
{
  const off = i * CDG_PACKET_SIZE
  let diff = false
  for (let j = 0; j < CDG_PACKET_SIZE; j++)
  {
    if (a[off + j] !== b[off + j]) { diff = true; break }
  }
  if (diff)
  {
    found++
    if (found === packetTarget) { targetIndex = i; break }
  }
}
if (targetIndex === -1)
{
  if (found === 0 && pa !== pb)
  {
    console.log('No packet-by-packet differences in common range; packet counts differ. First extra packet index in longer file:', pmin)
    process.exit(0)
  }
  console.error(`Found only ${found} differing packets (requested ${packetTarget}).`)
  process.exit(2)
}
console.log('Differing packet index (0-based):', targetIndex)
function hex(buf: Buffer, off: number)
{
  return Array.from(buf.slice(off, off + CDG_PACKET_SIZE)).map(x => x.toString(16).padStart(2, '0')).join(' ')
}
console.log('A packet hex:', hex(a, targetIndex * 24))
console.log('B packet hex:', hex(b, targetIndex * 24))
const start = Math.max(0, targetIndex - 5)
const end = Math.min(pmin - 1, targetIndex + 5)
console.log(`\nContext around differing packet #${targetIndex} (0-based):`)
for (let i = start; i <= end; i++)
{
  const marker = i === targetIndex ? '<<' : '  '
  console.log(marker, i.toString().padStart(5), hex(a, i * CDG_PACKET_SIZE), ' | ', hex(b, i * CDG_PACKET_SIZE))
}

// VIM: set filetype=typescript :
// END