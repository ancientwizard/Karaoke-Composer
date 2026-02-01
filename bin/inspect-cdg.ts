#!/usr/bin/env -S npx tsx

/*
# inspect-cdg

Summary: Inspect a .cdg file and report size, checksums, packet counts and hex dumps.

Usage:
  $ inspect-cdg.ts --run <file1.cdg> [file2.cdg ...]

Options:
  --help   Show this help (outputs this comment block as markdown)
  --run    Execute the script (without this the script prints usage)
*/
import fs from 'fs'
import crypto from 'crypto'
import { readScriptMd             } from '@/utils/bin-utils'
import { CDG_PACKET_SIZE, CDG_PPS } from '@/cdg/constants'
import { fileURLToPath            } from 'url'

const scriptPath = fileURLToPath(import.meta.url)

const args = process.argv.slice(2)
if (args.includes('--help'))
{
  const md = readScriptMd(scriptPath)
  console.log(md.join('\n'))
  process.exit(0)
}
const shouldRun = args.includes('--run')
if (!shouldRun)
{
  console.log('Usage: inspect-cdg.ts --run <file1.cdg> [file2.cdg ...]')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}
const files = args.filter(a => !a.startsWith('--'))

function hexdump(buf: Buffer, offset = 0, len = 24)
{
  return Array.from(buf.slice(offset, offset + len))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
}

function inspect(file: string)
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

  const commandCounts: Record<string, number> = {}
  let emptyCount = 0
  let memPreset = 0
  let borderPreset = 0
  let paletteLow = 0
  let paletteHigh = 0
  let tileBlock = 0
  let tileXor = 0

  for (let i = 0; i < packets; i++)
  {
    const off = i * CDG_PACKET_SIZE
    const cmd = data[off + 1] & 0x3F
    commandCounts[String(cmd)] = (commandCounts[String(cmd)] || 0) + 1
    const allZero = (() =>
    {
      for (let j = off + 1; j < off + 19; j++)
      {
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
    .forEach(([k, v]) =>
    {
      console.log(' cmd', k.padStart(2), '=', v)
    })

  const first = Math.min(32, packets)
  console.log('\nFirst', first, 'packets (hex):')
  for (let i = 0; i < first; i++)
  {
    const off = i * CDG_PACKET_SIZE
    console.log(i.toString().padStart(4), hexdump(data, off, CDG_PACKET_SIZE))
  }

  const last = Math.min(32, packets)
  console.log('\nLast', last, 'packets (hex):')
  for (let i = packets - last; i < packets; i++)
  {
    const off = i * CDG_PACKET_SIZE
    console.log(i.toString().padStart(4), hexdump(data, off, CDG_PACKET_SIZE))
  }
}

if (files.length === 0)
{
  console.log('No files provided. Usage: inspect-cdg.ts <file1.cdg> [file2.cdg ...] --run')
  process.exit(1)
}

for (let i = 0; i < files.length; i++)
{
  const f = files[i]
  if (!fs.existsSync(f))
  {
    console.error('File not found:', f)
    continue
  }
  try
  {
    inspect(f)
  }
  catch (e)
  {
    console.error('Error inspecting', f, e)
  }
}

// VIM: set filetype=typescript :
// END