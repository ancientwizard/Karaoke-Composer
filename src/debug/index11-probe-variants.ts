#!/usr/bin/env -S npx tsx

import path from 'path'
import GeneratorByFunction from './generate-by-function'
import { writePacketsToFile, generateMemoryPresetPackets } from '../cdg/encoder'

/**
 * several compatibility variants so you can test what your player expects.
 *
 * Variants written:
 * - diag/index11-probe-baseline.cdg       (loads only)
 * - diag/index11-probe-mempreset.cdg      (insert memory preset after each load)
 * - diag/index11-probe-swapped.cdg        (swap the two data bytes for index 11)
 * - diag/index11-probe-altpack.cdg        (repack bytes using an alternate byte2 layout)
 */

function clonePkt(pkt: Uint8Array) {
  return new Uint8Array(pkt)
}

function decodeColorFromLoadPair(byte1: number, byte2: number) {
  const r4 = (byte1 >> 2) & 0x0F
  const g4 = ((byte1 & 0x03) << 2) | ((byte2 >> 4) & 0x03)
  const b4 = byte2 & 0x0F
  const out = {
    r4: r4,
    g4: g4,
    b4: b4
  }
  return out
}

function packAltBytes(r4: number, g4: number, b4: number) {
  // Alternate packing some players appear to expect (observed variants in
  // reference code): byte1 = (r4<<2)|(g4>>2); byte2_alt = ((g4&0x03)<<6) | (b4<<2)
  const byte1 = ((r4 & 0x0F) << 2) | ((g4 & 0x0F) >> 2)
  const byte2 = ((g4 & 0x03) << 6) | ((b4 & 0x0F) << 2)
  const out = {
    byte1: byte1 & 0x3F,
    byte2: byte2 & 0x3F
  }
  return out
}

async function run() {
  const g = new GeneratorByFunction()

  g.advancePacks(30)

  const patterns = [
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
    g.setColor(11, p.r * 17, p.g * 17, p.b * 17)
    g.schedulePaletteLoad()
    g.advancePacks(1506) // ~5.02s pause
  }

  const basePkts = g.getPacketStream()

  // Baseline (loads only)
  const outBase = path.join('diag', 'index11-probe-baseline.cdg')
  writePacketsToFile(outBase, basePkts)
  console.log('Wrote', outBase)

  // Variant: memory preset after each HIGH load (force immediate visual update)
  const memPkts: Uint8Array[] = []
  for (let i = 0; i < basePkts.length; i++) {
    memPkts.push(clonePkt(basePkts[i]))
    const pkt = basePkts[i]
    if (pkt[1] === 31) {
      // After each LOAD_COLOR_TABLE_HIGH insert a memory preset that clears
      // the screen to palette index 11 (this is a small test: repeat=0)
      const m = generateMemoryPresetPackets(11)
      for (const mm of m) memPkts.push(clonePkt(mm))
    }
  }
  const outMem = path.join('diag', 'index11-probe-mempreset.cdg')
  writePacketsToFile(outMem, memPkts)
  console.log('Wrote', outMem)

  // Variant: swap the two data bytes for palette entry 11 (pal_inc=3)
  const swapped: Uint8Array[] = basePkts.map(clonePkt)
  for (let i = 0; i < swapped.length; i++) {
    const pkt = swapped[i]
    if (pkt[1] === 31) {
      const off = 3 + (3 * 2) // pal_inc 3
      const a = pkt[off]
      const b = pkt[off + 1]
      pkt[off] = b & 0x3F
      pkt[off + 1] = a & 0x3F
    }
  }
  const outSwap = path.join('diag', 'index11-probe-swapped.cdg')
  writePacketsToFile(outSwap, swapped)
  console.log('Wrote', outSwap)

  // Variant: alternate packing of byte2 (simulate some buggy decoders)
  const alt: Uint8Array[] = basePkts.map(clonePkt)
  for (let i = 0; i < alt.length; i++) {
    const pkt = alt[i]
    if (pkt[1] === 31) {
      const off = 3 + (3 * 2)
      const b1 = pkt[off]
      const b2 = pkt[off + 1]
      const {
        r4,
        g4,
        b4
      } = decodeColorFromLoadPair(b1, b2)
      const packed = packAltBytes(r4, g4, b4)
      pkt[off] = packed.byte1
      pkt[off + 1] = packed.byte2
    }
  }
  const outAlt = path.join('diag', 'index11-probe-altpack.cdg')
  writePacketsToFile(outAlt, alt)
  console.log('Wrote', outAlt)
}

;(async () => {
  try {
    await run()
  } catch (e) {
    console.error('variants failed', e)
    process.exit(2)
  }
})()

// VIM: ts=2 sw=2 et
// END
