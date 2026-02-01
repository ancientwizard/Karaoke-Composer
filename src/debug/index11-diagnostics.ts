#!/usr/bin/env -S npx tsx

import path from 'path'
import GeneratorByFunction from './generate-by-function'

async function makeFiles() {
  const cases = [
    {
      name: 'R',
      rgb: [255, 0, 0]
    },
    {
      name: 'G',
      rgb: [0, 255, 0]
    },
    {
      name: 'B',
      rgb: [0, 0, 255]
    }
  ]

  for (const c of cases) {
    // Explicit fill (tile packets) version
    const g = new GeneratorByFunction(
      {
        pps: 300,
        autoRenderBlocks: false,
        autoEmitPaletteOnChange: false,
        emitPaletteOnWrite: false
      }
    )
  g.advancePacks(10)
    // Set index 11 (absolute) to the RGB and emit palette load at this point
    g.setColor(11, c.rgb[0], c.rgb[1], c.rgb[2])
    g.schedulePaletteLoad()
    // Allow a few empty packets and then paint the whole screen via explicit blocks
    g.advancePacks(5)
    g.fillScreen(11, false)
    const outExp = path.join('diag', `index11-explicit-${c.name}.cdg`)
    g.write(outExp)
    console.log('Wrote', outExp)

    // Memory-preset version
    const g2 = new GeneratorByFunction(
      {
        pps: 300,
        autoRenderBlocks: false,
        autoEmitPaletteOnChange: false,
        emitPaletteOnWrite: false
      }
    )
  g2.advancePacks(10)
    g2.setColor(11, c.rgb[0], c.rgb[1], c.rgb[2])
    g2.schedulePaletteLoad()
    g2.advancePacks(5)
    g2.scheduleClear(11)
    const outMem = path.join('diag', `index11-mempreset-${c.name}.cdg`)
    g2.write(outMem)
    console.log('Wrote', outMem)
  }
}

;(async () => {
  try {
    await makeFiles()
    console.log('Done')
  } catch (e) {
    console.error('Failed:', e)
    process.exit(2)
  }
})()

// VIM: ts=2 sw=2 et
// END
