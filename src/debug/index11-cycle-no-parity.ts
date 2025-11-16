#!/usr/bin/env -S npx tsx

/*
  index11-cycle-no-parity.ts

  Generate a simple CDG that cycles palette index 11 through the
  project's standard 16 colors, pausing ~2 seconds between each change.

  This script uses `GeneratorByFunction` and explicitly schedules
  palette LOAD packets (arg byte left zero). The output is a standard
  .cdg file (24-byte packets) with no extra parity/Q bytes.
*/

import path from 'path'
import GeneratorByFunction from './generate-by-function'

async function run() {
  const g = new GeneratorByFunction({
    pps: 300,
    autoEmitPaletteOnChange: false
  })

  // Standard 16-color palette (same defaults used elsewhere in the repo)
  const colors: Array<[number, number, number]> = [
    [0, 0, 0],
    [255, 255, 0],
    [200, 200, 200],
    [255, 255, 255],
    [0, 0, 128],
    [0, 128, 255],
    [128, 128, 128],
    [64, 64, 64],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 128, 0],
    [128, 0, 128],
    [0, 128, 0]
  ]

  // Reserve a short preamble so players have time to start
  g.advancePacks(30)

  for (const [r, gcol, b] of colors) {
    // set palette index 11 (absolute) and schedule an immediate palette load
    g.setColor(11, r, gcol, b)
    g.schedulePaletteLoad()
    // wait ~2 seconds (using instance PPS)
    g.advanceSeconds(2)
  }

  const out = path.join('diag', 'index11-cycle-no-parity.cdg')
  g.write(out)
  console.log('Wrote', out)
}

;(async () => {
  try {
    await run()
  } catch (e) {
    console.error('failed', e)
    process.exit(2)
  }
})()
