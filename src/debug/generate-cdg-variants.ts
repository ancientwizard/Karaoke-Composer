#!/usr/bin/env -S npx tsx

import path from 'path'
import fs from 'fs'
import { scheduleFontEvents, FontEvent } from '../cdg/scheduler'
import { makeEmptyPacket, writePacketsToFile, generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, demoBlockPixels } from '../cdg/encoder'

// Generate several CDG variants to test player heuristics (memory preset 0..7 and an early-palette variant)
async function run() {
  const outDir = path.join(process.cwd(), 'diag')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const durationSeconds = 4
  const pps = 75

  // demo event (single block) matching scheduler.demo
  const demoPixels = demoBlockPixels()
  const events: FontEvent[] = [
    {
      blockX: 4,
      blockY: 4,
      pixels: demoPixels,
      startPack: 0,
      durationPacks: Math.ceil(durationSeconds * pps),
    },
  ]

  const presets = Array.from({ length: 8 }, (_, i) => i)
  const outputs: string[] = []

  for (const preset of presets) {
    const palettePkts = generatePaletteLoadPackets()
    const borderPkts = generateBorderPacket(0)
    const memoryPkts = generateMemoryPresetPackets(preset)
    const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts]

    // schedule using same logic as scheduler.scheduleAndWriteDemo: reservedStart = initPkts.length
    const { packetSlots } = scheduleFontEvents(events, { durationSeconds, pps }, initPkts.length)

    // Place initial packets into reserved start slots
    for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) packetSlots[i] = initPkts[i]

    // Ensure tail palette similar to existing behavior
    const lastIndex = packetSlots.length - 1
    const paletteTail = palettePkts[palettePkts.length - 1]
    if (paletteTail) {
      let placed = false
      const preferred = Math.max(0, lastIndex - 2)
      for (let i = preferred; i >= Math.max(0, preferred - 4); i--) {
        if (packetSlots[i].every((b) => b === 0)) { packetSlots[i] = paletteTail; placed = true; break }
      }
      if (!placed) for (let i = preferred; i <= Math.min(lastIndex, preferred + 4); i++) {
        if (packetSlots[i].every((b) => b === 0)) { packetSlots[i] = paletteTail; placed = true; break }
      }
      if (!placed) packetSlots[lastIndex] = paletteTail
    }

    const outPath = path.join(outDir, `scheduled-demo-preset-${preset}.cdg`)
    writePacketsToFile(outPath, packetSlots)
    outputs.push(outPath)
    console.log('Wrote', outPath)

    // Also write an early-palette variant: attempt to place a palette packet immediately before first scheduled slot
    const packetSlotsEarly = packetSlots.map((p) => new Uint8Array(p))
    const earlySlot = initPkts.length
    if (earlySlot < packetSlotsEarly.length && packetSlotsEarly[earlySlot].every((b) => b === 0)) {
      packetSlotsEarly[earlySlot] = palettePkts[palettePkts.length - 1]
    } else if (earlySlot < packetSlotsEarly.length) {
      // try to shift forward a bit
      for (let i = earlySlot; i < Math.min(packetSlotsEarly.length, earlySlot + 4); i++) {
        if (packetSlotsEarly[i].every((b) => b === 0)) { packetSlotsEarly[i] = palettePkts[palettePkts.length - 1]; break }
      }
    }
    const outPathEarly = path.join(outDir, `scheduled-demo-preset-${preset}-early.cdg`)
    writePacketsToFile(outPathEarly, packetSlotsEarly)
    outputs.push(outPathEarly)
    console.log('Wrote', outPathEarly)
  }

  console.log('\nGenerated files:')
  outputs.forEach((p) => console.log(' ', p))
}

// Run immediately when executed with tsx
run().catch((e) => { console.error(e); process.exit(2) })

export default run
