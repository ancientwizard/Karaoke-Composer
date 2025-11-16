#!/usr/bin/env -S npx tsx

/*
  generate-by-function-simple.ts

  A tiny, self-contained CDG packet builder for focused diagnostics.
  - Minimal external dependencies (only constants)
  - Stages packets in exact call order (no re-ordering)
  - Methods: advancePacks/advanceSeconds, scheduleScrollCopy,
    setColorBit(index, bit), emitPaletteLoad(), write(outPath)
  - Default output: diag/generate-by-function-demo.cdg (override with first arg)

  This is intentionally minimal so you can step a single bit through the
  two palette data bytes and observe how players react.

  THE GOAL is to code packets that PLAY in VLC, not necessarily align with the CDG specification
    or our projects code. So stay focused on that goal when modifying this file.
*/

import fs from 'fs'
import path from 'path'
import { CDG_PPS } from '../cdg/constants'

const PACKET_SIZE = 24
const SUBCODE = 0x09

export enum CDGCommand {
  CDG_MEMORY_PRESET = 1,
  CDG_BORDER_PRESET = 2,
  CDG_TILE_BLOCK = 6,
  CDG_SCROLL_PRESET = 20,
  CDG_SCROLL_COPY = 24,
  CDG_LOAD_COLOR_TABLE_LOW = 30,
  CDG_LOAD_COLOR_TABLE_HIGH = 31
}

// same defaults used elsewhere in the project (8 lower, 8 upper)
const COLOR_DEFAULTS: Array<[number, number, number]> = [
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
  [255, 0, 255], // Magenta
  [0, 255, 255],
  [255, 128, 0],
  [128, 0, 128],
  [0, 128, 0]
]

const COLOR_VARIANT: Array<[number, number, number]> = [
   [0,  0,  0],   // Black
   [255,204,255], // White
   [0,136, 68],   // 0000000010000100
   [0,136,102],   // 0000000010000110
   [238,204,  0], // Yellow
   [238,136,204], // Light gray
   [0,136,119],   // 0000000010000111
   [170,136,221], // Light gray
   [238,204,136], // Light gray
   [102,136,170], // Medium gray
  [0,136, 85],    // 0000000010000101
  [204,136,204],  // Light gray
  [0,136,119],    // 0000000010000111
  [136,136,153],  // Light gray
  [68,136,102],   // Medium gray
  [0,136, 85],    // 0000000010000101
]

class SimpleGenerator {
  private packets: Uint8Array[]
  private palette: number[]
  private pps: number

  constructor(opts?: { pps?: number }) {
    this.packets = []
    this.pps = opts && opts.pps && opts.pps > 0 ? opts.pps : CDG_PPS
    this.palette = new Array(16).fill(0)
    this.setDefaultPalette()
  }

  // --------------------------------------------------
  // Defaults / helpers
  // --------------------------------------------------
  private setDefaultPalette() {
    for (let i = 0; i < 16; i++)
    {
      const [r, g, b] = COLOR_DEFAULTS[i]
      // store as numeric CDG value (12-bit in lower bits) so we can
      // later write the two 6-bit data bytes directly from this number.
      this.palette[i] = this.rgbToCDG(r, g, b)
    }
  }

  private rgbToCDG(r: number, g: number, b: number) {
    const r4 = Math.floor(r / 17) & 0x0F
    const g4 = Math.floor(g / 17) & 0x0F
    const b4 = Math.floor(b / 17) & 0x0F
    // Pack into canonical CDG layout so that when split into two bytes
    // and assembled by decoders as c = (high << 8) | low we get
    //   c = (r4 << 10) | (g4 << 6) | (b4 << 2)
    // The resulting value can occupy up to bit 13, so preserve those
    // bits (mask with 0x3FFF) rather than truncating to 12 bits.
    // However, for internal representation we store the project's
    // canonical 12-bit value: (r4<<8) | (g4<<4) | b4 so that the
    // same value can be used with CDGPacket.loadColorTable() and
    // lookup routines elsewhere.
    return ((r4 << 8) | (g4 << 4) | b4) & 0x0FFF
  }

  private makeEmptyPacket(){
    return new Uint8Array(PACKET_SIZE)
  }

  private makeCommandPacket(cmd: CDGCommand, instr: number = 0, data: number[] = [], vlc_shift: boolean = false ) {
    const buf = new Uint8Array(PACKET_SIZE)
    buf[0] = SUBCODE
    buf[1] = cmd & 0x3F
    buf[2] = instr & 0x3F
    for (let i = 0; i < Math.min(16, data.length); i++) {
      // write the full byte here; callers (emitPaletteLoad/etc.) are
      // responsible for packing the 12-bit color into the two output
      // bytes correctly. Masking to 0xFF preserves high bits used by
      // canonical CDG packing.
      buf[vlc_shift ? 4 + i : 3 + i] = data[i] & 0xFF
    }
    return buf
  }

  // --------------------------------------------------
  // Public staging API (order-preserving)
  // --------------------------------------------------
  advancePacks(count: number) {
    const n = Math.max(0, Math.floor(count || 0))
    for (let i = 0; i < n; i++) this.packets.push(this.makeEmptyPacket())
  }

  advanceSeconds(seconds: number) {
    const s = Math.max(0, Number(seconds) || 0)
    const packs = Math.ceil(s * this.pps)
    this.advancePacks(packs)
  }

  /**
   * Build a SCROLL_COPY packet exactly like the reference encoders use.
   * hField and vField should be pre-encoded (direction/offset bits).
   */
  scheduleScrollCopy(colorIndex: number = 0, hField: number = 0, vField: number = 0) {
    const data = new Array(16).fill(0)
    data[0] = colorIndex & 0x3F
    data[1] = hField & 0x3F
    data[2] = vField & 0x3F
    this.packets.push(this.makeCommandPacket(CDGCommand.CDG_SCROLL_COPY, 0, data))
  }

  /**
   * Set a single numeric bit in the stored palette entry for `index`.
   * We store palette entries as numbers (up to 16 bits). This function
   * sets the entry to a single-bit pattern: palette[index] = 1<<bit.
   * bit: 0..15 supported. Note: emitPaletteLoad() will split the stored
   * number into two 6-bit data bytes via byte1=(val>>6)&0x3F and
   * byte2=val&0x3F (so bits 0..11 affect the emitted bytes).
   */
  setColorBit(index: number, bit: number) {
    const idx = Math.max(0, Math.min(15, Math.floor(index)))
    const b = Math.max(0, Math.min(15, Math.floor(bit)))
    const value = (1 << b) & 0xFFFF
    this.palette[idx] = value
  }

  setColorValue(index: number, value_idx: number, use_variant: boolean = false) {
    const idx = Math.max(0, Math.min(15, Math.floor(index)))
    const [r, g, b] = use_variant ? COLOR_VARIANT[value_idx] : COLOR_DEFAULTS[value_idx]
    this.palette[idx] = this.rgbToCDG(r, g, b)
  }

  applyVariantPalette() {
    for (let i = 0; i < 16; i++)
    {
      const [r, g, b] = COLOR_VARIANT[i]
      this.palette[i] = this.rgbToCDG(r, g, b)
    }
  }

  emitPaletteLoad(vlc_align: boolean = true) {
    // emit LOW (0..7) then HIGH (8..15)
    for (let hi = 0; hi < 2; hi++) {
      const data = new Array(16).fill(0)
      const pal_offset = hi * 8
      for (let pal_inc = 0; pal_inc < 8; pal_inc++) {
        const actual_idx = pal_inc + pal_offset
        const val12 = (this.palette[actual_idx] || 0) & 0x0FFF
        const r4 = (val12 >> 8) & 0x0F
        const g4 = (val12 >> 4) & 0x0F
        const b4 = val12 & 0x0F

        // Build the canonical 16-bit CDG word exactly as VLC expects:
        //   c = (r4 << 10) | (g4 << 6) | (b4 << 2)
        // Then emit the two bytes as [highByte, lowByte] so a decoder that
        // reconstructs c = (high<<8)|low sees the same word.
        const c = ((r4 & 0x0F) << 10) | ((g4 & 0x0F) << 6) | ((b4 & 0x0F) << 2)
        const byte1 = (c >> 8) & 0xFF
        const byte2 = c & 0xFF

        data[pal_inc * 2 + 0] = byte1
        data[pal_inc * 2 + 1] = byte2
      }

      const cmd = hi ? CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH : CDGCommand.CDG_LOAD_COLOR_TABLE_LOW

      // Use vlc_shift=true so the 16 data bytes are written starting at
      // buffer[4] (p_buffer+4). VLC's decoder uses p_data = p_buffer+4,
      // so this placement ensures decoders that expect that framing read
      // the intended high/low byte pairs.

      if (vlc_align) {
        // insert the zero packets to align this packet on a VLC three packet index of 1
        const currentIdx = this.packets.length
        const mod3 = currentIdx % 3
        if (mod3 !== 1) {
          const toInsert = (mod3 === 0) ? 1 : 2
          for (let i = 0; i < toInsert; i++) {
            // this.packets.push(this.makeEmptyPacket())
            this.packets.push(this.makeCommandPacket(cmd, 0, data, true))
          }
        }
      }

      this.packets.push(this.makeCommandPacket(cmd, 0, data, true))
    }
  }

  write(outPath?: string) {
    const out = outPath || path.join('diag', 'generate-by-function-demo.cdg')
    fs.mkdirSync(path.dirname(out), { recursive: true })
    const bufs = this.packets.map((p) => Buffer.from(p))
    const outBuf = Buffer.concat(bufs)
    fs.writeFileSync(out, outBuf)
    return out
  }
}

// -------------------------------
// CLI demo -- runs when executed
// -------------------------------
if (process.argv.includes('--run')) {
  (async () => {
    try {
      const outArg = process.argv[2]
      const outPath = outArg && !outArg.startsWith('--') ? outArg : undefined
      const g = new SimpleGenerator()

      g.applyVariantPalette()

      // reserve a little preamble
      g.advancePacks(250)

      // emit a scroll copy no-op (reference-like)
      g.scheduleScrollCopy(0, 0, 0)
      g.advancePacks(349)
      g.emitPaletteLoad()
      g.advanceSeconds(2)

      // walk though palette index 11 all default colors
      // const use_variant = true
      // for (let i = 0; i < COLOR_DEFAULTS.length; i++) {
      //   g.setColorValue(11, i, use_variant)
      //   g.emitPaletteLoad()
      //   g.advanceSeconds(2)
      // }

      // walk a single bit through palette index 11
      // for (let bit = 15; bit >= 0; bit--) {
      //   g.setColorBit(11, bit)
      //   g.emitPaletteLoad()
      //   g.advanceSeconds(2)
      //   // break
      // }

      const wrote = g.write(outPath)
      console.log('Wrote', wrote)
    } catch (e) {
      console.error('demo failed', e)
      process.exit(2)
    }
  })()
}

export default SimpleGenerator

// VIM: ts=2 sw=2 et
// END
