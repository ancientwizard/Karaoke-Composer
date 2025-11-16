#!/usr/bin/env -S npx tsx

/*
  index11-probe.ts

  Generates a small CDG that cycles palette index 11 through engineered
  4-bit patterns and emits a memory preset after each load so the visible
  area should update to palette index 11. Use this to test player
  palette unpacking / bit-order bugs.
*/

import path from 'path'
import GeneratorByFunction from './generate-by-function'

async function run() {
  const g = new GeneratorByFunction(
    {
      pps: 300,
      autoRenderBlocks: false,
      autoEmitPaletteOnChange: false,
      emitPaletteOnWrite: false
    }
  )
  g.advancePacks(30)

  // Patterns to write into index 11 (r4,g4,b4). We'll only vary r4 and
  // occasionally set a bit in blue/green to detect misreads.
  const patterns: Array<{r:number,g:number,b:number,label:string}> =
    [
      {
        r: 15,
        g: 0,
        b: 0,
        label: 'r15'
      },
      {
        r: 8,
        g: 0,
        b: 0,
        label: 'r8'
      },
      {
        r: 4,
        g: 0,
        b: 0,
        label: 'r4'
      },
      {
        r: 2,
        g: 0,
        b: 0,
        label: 'r2'
      },
      {
        r: 1,
        g: 0,
        b: 0,
        label: 'r1'
      },
      // engineered probes: set single low bits to see if they leak into other channels
      {
        r: 0,
        g: 1,
        b: 0,
        label: 'g1'
      },
      {
        r: 0,
        g: 0,
        b: 1,
        label: 'b1'
      },
      {
        r: 7,
        g: 3,
        b: 5,
        label: 'mixed'
      }
    ]

  for (const p of patterns) {
    // set palette entry 11
    g.setColor(11, p.r * 17, p.g * 17, p.b * 17)
    // emit the palette load now
    g.schedulePaletteLoad()
  // short pause
  g.advancePacks(6)
  // Do NOT emit memory preset or tile packets (they can confuse some players
  // and interfere with verifying pure palette-load encoding). We only emit
  // the LOAD_COLOR_TABLE_* packets and then wait so you can observe the
  // player's interpretation of the palette entry change for index 11.
  // leave a visible pause (lengthened so you have time to inspect each color)
  // 1500 packs @ 300 pps = 5 seconds
  g.advancePacks(1500)
  }

  const out = path.join('diag', 'index11-probe.cdg')
  g.write(out)
  console.log('Wrote', out)
}

;(async () => {
  try {
    await run()
  } catch (e) {
    console.error('probe failed', e)
    process.exit(2)
  }
})()

// VIM: ts=2 sw=2 et
// END
