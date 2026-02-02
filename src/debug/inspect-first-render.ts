#!/usr/bin/env -S npx tsx

import fs from 'fs'
import { CDG_PACKET_SIZE, CDG_PPS } from '@/cdg/constants'
import { CDGCommand               } from '@/karaoke/renderers/cdg/CDGPacket'

class CdgFirstRenderInspector
{
  private filePath: string

  constructor(filePath: string)
  {
    this.filePath = filePath
  }

  run(): void
  {
    const buf = fs.readFileSync(this.filePath)
    const packetCount = Math.floor(buf.length / CDG_PACKET_SIZE)

    let firstTileIndex = -1
    let firstMemoryPresetIndex = -1

    for (let i = 0; i < packetCount; i++)
    {
      const offset = i * CDG_PACKET_SIZE
      const cmd = buf[offset + 1] & 0x3f

      if (firstMemoryPresetIndex === -1 && cmd === CDGCommand.CDG_MEMORY_PRESET)
      {
        firstMemoryPresetIndex = i
      }

      if (cmd === CDGCommand.CDG_TILE_BLOCK || cmd === CDGCommand.CDG_TILE_BLOCK_XOR)
      {
        firstTileIndex = i
        break
      }
    }

    console.log(`File: ${this.filePath}`)
    console.log(`Total packets: ${packetCount}`)

    if (firstMemoryPresetIndex >= 0)
    {
      console.log(`First memory preset at packet ${firstMemoryPresetIndex} (${this.toSeconds(firstMemoryPresetIndex)}s)`) 
    }
    else
    {
      console.log('No memory preset packet found.')
    }

    if (firstTileIndex >= 0)
    {
      console.log(`First tile block at packet ${firstTileIndex} (${this.toSeconds(firstTileIndex)}s)`) 
      const initialGapPackets = Math.max(0, firstTileIndex - 4)
      console.log(`Initial gap packets after prelude: ${initialGapPackets} (${this.toSeconds(initialGapPackets)}s)`) 
    }
    else
    {
      console.log('No tile block packets found.')
    }
  }

  private toSeconds(packetIndex: number): string
  {
    return (packetIndex / CDG_PPS).toFixed(3)
  }
}

function main(): void
{
  const filePath = process.argv[2]
  if (!filePath)
  {
    console.error('Usage: npx tsx src/debug/inspect-first-render.ts <cdg-file>')
    process.exit(2)
  }

  const inspector = new CdgFirstRenderInspector(filePath)
  inspector.run()
}

main()

// VIM: set filetype=typescript :
// END
