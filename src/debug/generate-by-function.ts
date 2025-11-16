#!/usr/bin/env -S npx tsx

/*
  generate-by-function.ts

  Lightweight programmatic CDG generator for experiments and diagnostics.
  It builds CDG packet streams using the project's encoder primitives
  (palette loads, border/memory presets, font block writers) while
  maintaining an internal VRAM model so emitted tile packets are
  incremental and deterministic.

  Key features (updated):
    - Controlled palette/border emission: use emitPaletteOnWrite /
      emitBorderOnWrite and autoEmitPaletteOnChange / autoEmitBorderOnChange
      to control whether palette/border packets are emitted automatically.
    - Preamble support: prependEmptyPacks(count) inserts leading empty
      packets that are emitted before palette/border/memory presets.
    - Scroll helper: scheduleScrollCopy(...) emits SCROLL_COPY /
      SCROLL_PRESET packets (defaults to the zero-offset no-op copy used
      in diagnostics).
    - Explicit clears and robust fills: scheduleClear(), clearScreen(),
      and fillScreen() update VRAM and emit memory-preset or explicit
      tile packets to ensure portable playback across players.

  Usage (typical):
    const g = new GeneratorByFunction({ pps: 300 })
    g.prependEmptyPacks(250)        // reserve leading empty packets
    g.scheduleScrollCopy()          // emit a SCROLL_COPY with zero fields
    g.setLowerColor(1, 255,255,0)   // optional palette change
    g.setBorderColor(2)
    g.fillScreen(4)                 // robust full-screen fill
    await g.write('diag/out.cdg')

  Notes:
    - Default PPS is 300 and instance configuration becomes immutable
      after write() is called.
    - This helper is intended for experimentation and diagnostics; it
      prefers explicit, deterministic packet emission over compactness.
*/

import fs from 'fs'
import path from 'path'
import { CDGPalette, CDGCommand } from '../karaoke/renderers/cdg/CDGPacket'
import {
  generatePaletteLoadPackets,
  generateBorderPacket,
  generateScrollPacket,
  generateMemoryPresetPackets,
  writeFontBlock,
  writePacketsToFile,
  VRAM,
  makeEmptyPacket
} from '../cdg/encoder'

export type GenOptions = {
  pps?: number
  autoRenderBlocks?: boolean
  // control whether palette load packets are automatically emitted at
  // the start of the output stream when write()/getPacketStream() run.
  emitPaletteOnWrite?: boolean
  // control whether a border preset packet is automatically emitted at
  // the start of the output stream when write()/getPacketStream() run.
  emitBorderOnWrite?: boolean
  // when true, changes to the palette (setColor / setLowerColor / setUpperColor
  // or resetPaletteToDefault) will immediately append palette load packets
  // into the timeline. If false, palette changes are only applied in memory
  // and will be emitted at write() if emitPaletteOnWrite is true.
  autoEmitPaletteOnChange?: boolean
  // when true, setBorderColor will append a border preset packet immediately.
  // If false, border preset will only be emitted by write() if emitBorderOnWrite
  // is enabled.
  autoEmitBorderOnChange?: boolean
}

export class GeneratorByFunction {
  private palette: CDGPalette
  private vram: VRAM
  private blocks: Map<string, number[][]>
  private timelinePackets: Uint8Array[]
  private started: boolean
  private _pps: number
  private autoRenderBlocks: boolean
  private borderColor: number
  private memPresetColor: number
  private timelineHasMemPreset: boolean
  private explicitFullFillScheduled: boolean
  private emitPaletteOnWrite: boolean
  private emitBorderOnWrite: boolean
  private autoEmitPaletteOnChange: boolean
  private autoEmitBorderOnChange: boolean
  private preamblePackets: Uint8Array[]
  private prePalettePackets: Uint8Array[]

  /**
   * Create a new generator instance.
   * @param opts.pps - packets per second mapping for duration calculations (default 300)
   * NOTE: once `write()` is called the instance is considered started and
   * further configuration (palette, pps, etc.) will throw.
   */
  constructor(opts: GenOptions = {}) {
    this.palette = new CDGPalette()
    this.vram = new VRAM()
    this.blocks = new Map()
    this.timelinePackets = []
    this.started = false
    this._pps = opts.pps && Number.isFinite(opts.pps) && opts.pps > 0 ? opts.pps : 300
    this.borderColor = 0
    this.memPresetColor = 0
    this.autoRenderBlocks = !!opts.autoRenderBlocks
    this.timelineHasMemPreset = false
    this.explicitFullFillScheduled = false
  // Do NOT auto-emit palette, border, or memory presets on write unless
  // the caller explicitly schedules them. This generator will only emit
  // packets that methods have explicitly staged to the timeline.
  this.emitPaletteOnWrite = !!opts.emitPaletteOnWrite
  this.emitBorderOnWrite = !!opts.emitBorderOnWrite
  this.autoEmitPaletteOnChange = !!opts.autoEmitPaletteOnChange
  this.autoEmitBorderOnChange = !!opts.autoEmitBorderOnChange
    this.preamblePackets = []
    this.prePalettePackets = []
  }

  /**
   * Prepend `count` empty (zero) CDG packets to the start of the internal
   * timeline. Useful to reserve playback time before other initialization
   * packets (palette, border, etc.) are emitted.
   */
  prependEmptyPacks() {
    // This operation was removed to enforce the invariant: the generator
    // must not emit any packets at write() time unless they were
    // explicitly staged via timeline methods. Use advancePacks() or
    // advanceSeconds() to insert empty packets into the timeline.
    throw new Error('prependEmptyPacks() removed: use advancePacks()/advanceSeconds() to stage empty packets into the timeline')
  }

  // NOTE: prependEmptyPacks is deprecated and removed from the public
  // API: callers should use advancePacks/advanceSeconds to stage empty
  // packets into the timeline. We keep this method for backward
  // compatibility but it does nothing now (to ensure no implicit
  // preamble packets are emitted unless the caller explicitly staged
  // them via timeline methods).

  /**
   * Schedule a SCROLL packet at the current timeline position.
   * By default this emits a CDG_SCROLL_COPY packet with zero offsets
   * (a no-op scroll matching the example). Provide `hOffset`/`vOffset`
   * and `hDir`/`vDir` to encode movement (hOffset 0..5, vOffset 0..11,
   * direction codes 0..3). If `useCopyVariant` is false, the SCROLL_PRESET
   * variant is emitted instead.
   */
  scheduleScrollCopy(opts: { colorIndex?: number; hOffset?: number; hDir?: number; vOffset?: number; vDir?: number; useCopyVariant?: boolean; beforePalette?: boolean } = {}) {
    this.ensureNotStarted()
    const colorIndex = (opts.colorIndex || 0) & 0x0F
    const hOffset = Math.max(0, Math.min(5, Math.floor(opts.hOffset || 0))) & 0x07
    const hDir = Math.max(0, Math.min(3, Math.floor(opts.hDir || 0))) & 0x03
    const vOffset = Math.max(0, Math.min(11, Math.floor(opts.vOffset || 0))) & 0x0F
    const vDir = Math.max(0, Math.min(3, Math.floor(opts.vDir || 0))) & 0x03
    const useCopy = opts.useCopyVariant !== undefined ? !!opts.useCopyVariant : true

    const hField = ((hDir & 0x03) << 4) | (hOffset & 0x07)
    const vField = ((vDir & 0x03) << 4) | (vOffset & 0x0F)

    const pkts = generateScrollPacket(colorIndex, hField, vField, useCopy)
    // If the caller specifically requested the scroll to appear before any
    // automatically-emitted palette/border/memory presets, push it into the
    // `prePalettePackets` list which `getPacketStream()` emits after the
    // preamble but before palette/border. Otherwise append to the normal
    // timeline so it sits after those initialization packets.
    if (opts.beforePalette) {
      for (const p of pkts) this.prePalettePackets.push(p)
    } else {
      for (const p of pkts) this.timelinePackets.push(p)
    }
  }

  // ------------------------------------------------------
  // Immutable-after-start helpers
  // ------------------------------------------------------
  private ensureNotStarted() {
    if (this.started) throw new Error('Generator is started; configuration is immutable after write()')
  }

  /**
   * Get the effective PPS for this instance.
   */
  get pps() {
    return this._pps
  }

  // ------------------------------------------------------
  // Palette helpers
  // ------------------------------------------------------
  /**
   * Return a copy of the current palette colors (12-bit CDG format per entry).
   */
  getPalette() {
    return this.palette.getColors()
  }

  /**
   * Reset the palette to the project's standard default colors.
   * This is a thin wrapper around CDGPalette.setDefaultPalette() and
   * is provided for convenience from the generator instance.
   */
  resetPaletteToDefault() {
    this.ensureNotStarted()
    this.palette.setDefaultPalette()
    // Emit the default palette load packets into the timeline so the reset
    // takes effect immediately in the packet stream.
    // Emit the default palette load packets into the timeline so the reset
    // takes effect immediately in the packet stream — but only if the
    // autoEmitPaletteOnChange option is enabled. Otherwise we only update
    // the in-memory palette and leave emission to write()/getPacketStream().
    if (this.autoEmitPaletteOnChange) {
      const palPkts = generatePaletteLoadPackets(this.palette)
      for (const p of palPkts) this.timelinePackets.push(p)
    }
  }

  /**
   * Set a color in the lower palette (indices 0..7).
   * Usage: setLowerColor(1, 255, 255, 0) to set index 1 to yellow.
   */
  setLowerColor(index: number, r: number, g: number, b: number) {
    this.ensureNotStarted()
    if (index < 0 || index > 7) throw new Error('lower color index must be 0..7')
    this.palette.setColor(index, r, g, b)
    // Emit current palette load packets at this point in the timeline so
    // palette changes become part of the packet sequence.
    if (this.autoEmitPaletteOnChange) {
      const palPkts = generatePaletteLoadPackets(this.palette)
      for (const p of palPkts) this.timelinePackets.push(p)
    }
  }

  /**
   * Set a color in the upper palette (indices 8..15).
   * Usage: setUpperColor(0, 128, 0, 0) sets palette index 8 (upper slot 0)
   */
  setUpperColor(slot: number, r: number, g: number, b: number) {
    this.ensureNotStarted()
    if (slot < 0 || slot > 7) throw new Error('upper slot must be 0..7')
    const idx = 8 + slot
    this.palette.setColor(idx, r, g, b)
    if (this.autoEmitPaletteOnChange) {
      const palPkts = generatePaletteLoadPackets(this.palette)
      for (const p of palPkts) this.timelinePackets.push(p)
    }
  }

  /**
   * Set a color by absolute palette index (0..15).
   */
  setColor(index: number, r: number, g: number, b: number) {
    this.ensureNotStarted()
    if (index < 0 || index > 15) throw new Error('color index must be 0..15')
    this.palette.setColor(index, r, g, b)
    if (this.autoEmitPaletteOnChange) {
      const palPkts = generatePaletteLoadPackets(this.palette)
      for (const p of palPkts) this.timelinePackets.push(p)
    }
  }

  // ------------------------------------------------------
  // Preset / clear helpers
  // ------------------------------------------------------
  /**
   * Queue a memory preset (screen clear) for the supplied color index.
   * This does not immediately write to packets; it records the chosen
   * memory preset which will be emitted during `renderAllBlocks()` or `write()`.
   */
  clearScreen(colorIndex: number = 0) {
    // Historically this only recorded the chosen preset and deferred
    // emission until write() to avoid palette-ordering surprises. The
    // method name `clearScreen` implies an immediate clear at the current
    // timeline position, so we now schedule the memory preset packets
    // at the current timeline position. This preserves the palette-safe
    // write-time default while making `clearScreen()` do what users expect.
    this.scheduleClear(colorIndex)
  }

  /**
   * Schedule a memory preset (screen clear) at the current timeline position.
   * Unlike `clearScreen()` which only sets the default memPreset applied at
   * write-time, this method appends the actual memory-preset CDG packets into
   * the internal timeline so repeated clears (with pauses) are preserved in
   * the packet stream.
   */
  scheduleClear(colorIndex: number = 0) {
    this.ensureNotStarted()
    const idx = colorIndex & 0x0F
    // remember default as well
    this.memPresetColor = idx
    // append the generated memory preset packets into the timeline so the
    // clear occurs at this point in playback.
    const pkts = generateMemoryPresetPackets(idx)
    for (const p of pkts) this.timelinePackets.push(p)
    this.timelineHasMemPreset = true
    // Update internal VRAM model to reflect the clear so subsequent
    // block rendering does not re-apply old pixels over the cleared screen.
    // This keeps the in-memory view consistent with the emitted packets.
    try {
      this.vram.clear(idx)
    } catch (e) {
      // ignore if VRAM isn't available for some reason
    }
  }

  /**
   * Force-fill the entire screen to `colorIndex` by emitting palette-safe
   * memory preset packets followed by explicit tile packets for every
   * block. This is heavier but robust: it works even with players that
   * ignore memory-preset packets or ignore palette loads. It will append
   * the packets at the current timeline position and update internal VRAM.
   */
  fillScreen(colorIndex: number = 0, emitMemoryPreset: boolean = false) {
    this.ensureNotStarted()
    const idx = colorIndex & 0x0F
    // Optionally emit the memory preset packets first. By default we do
    // NOT emit them because we immediately follow with explicit tile
    // packets that paint every block; the mem preset is therefore
    // redundant and can confuse players that treat it differently.
    if (emitMemoryPreset) {
      const memPkts = generateMemoryPresetPackets(idx)
      for (const p of memPkts) this.timelinePackets.push(p)
    }

    // Emit explicit block packets that paint every 6x12 tile to idx.
    // Use a temporary VRAM that's *not* already cleared to idx so
    // writeFontBlock will produce packets even if our current VRAM
    // already equals idx.
    const tempV = new VRAM()
    tempV.clear((idx + 1) & 0xFF)
    for (let by = 0; by < 18; by++) {
      for (let bx = 0; bx < 50; bx++) {
        const blk: number[][] = []
        for (let y = 0; y < 12; y++) {
          const row: number[] = []
          for (let x = 0; x < 6; x++) row.push(idx)
          blk.push(row)
        }
        const pkts = writeFontBlock(tempV, bx, by, blk)
        for (const p of pkts) this.timelinePackets.push(p)
      }
    }

    // mark that we emitted an explicit full-screen fill so write() will
    // not prepend an extra default memory preset (which would be redundant)
    this.explicitFullFillScheduled = true

    // Finally update our internal VRAM to match the emitted clear.
    try {
      this.vram.clear(idx)
    } catch (e) {
      // ignore
    }
  }


  /**
   * Set the border color that will be emitted on write.
   */
  setBorderColor(colorIndex: number) {
    this.ensureNotStarted()
    this.borderColor = colorIndex & 0x0F
    // Emit a border preset packet now so it becomes part of the timeline.
    const bpk = generateBorderPacket(this.borderColor)
    for (const p of bpk) this.timelinePackets.push(p)
  }

  /**
   * Schedule the current in-memory palette to be emitted at the current
   * timeline position. This lets callers control exactly where palette
   * load packets appear (useful if you disable emitPaletteOnWrite).
   */
  schedulePaletteLoad() {
    this.ensureNotStarted()
    const palPkts = generatePaletteLoadPackets(this.palette)
    for (const p of palPkts) this.timelinePackets.push(p)
  }

  // ------------------------------------------------------
  // Block drawing helpers (6x12 tiles)
  // ------------------------------------------------------
  private blockKey(bx: number, by: number) {
    return `${bx},${by}`
  }

  /**
   * Ensure a block structure exists for block coordinates (blockX 0..49, blockY 0..17).
   */
  ensureBlock(blockX: number, blockY: number) {
    const key = this.blockKey(blockX, blockY)
    if (!this.blocks.has(key)) {
      const arr: number[][] = []
      for (let y = 0; y < 12; y++) {
        const row: number[] = []
        for (let x = 0; x < 6; x++) row.push(0)
        arr.push(row)
      }
      this.blocks.set(key, arr)
    }
    return this.blocks.get(key) as number[][]
  }

  /**
   * Set a single pixel (bit) within a 6x12 block.
   * blockX: 0..49, blockY: 0..17, x:0..5, y:0..11
   */
  setBlockBit(blockX: number, blockY: number, x: number, y: number, colorIndex: number) {
    this.ensureNotStarted()
    if (x < 0 || x > 5) throw new Error('x must be 0..5')
    if (y < 0 || y > 11) throw new Error('y must be 0..11')
    const blk = this.ensureBlock(blockX, blockY)
    blk[y][x] = colorIndex & 0xFF
    // Optionally emit the block packets immediately so callers that expect
    // interleaved timing (advanceSeconds between draws) will see the
    // change in the timeline without an explicit renderAllBlocks() call.
    if (this.autoRenderBlocks) this.renderBlock(blockX, blockY)
  }

  /**
   * Replace an entire block's 6x12 pixel grid. The supplied array must be
   * 12 rows of 6 numbers each (row-major).
   */
  setBlock(blockX: number, blockY: number, pixels: number[][]) {
    this.ensureNotStarted()
    if (!pixels || pixels.length !== 12) throw new Error('pixels must be 12 rows')
    for (let r = 0; r < 12; r++) if (!pixels[r] || pixels[r].length !== 6) throw new Error('each row must have 6 columns')
    const key = this.blockKey(blockX, blockY)
    this.blocks.set(key, pixels.map((row) => row.map((c) => c & 0xFF)))
    if (this.autoRenderBlocks) this.renderBlock(blockX, blockY)
  }

  /**
   * Render a single block into CDG packets and append them to the internal
   * packets list. This updates the internal VRAM model as a side-effect so
   * subsequent writeFontBlock calls are incremental.
   */
  renderBlock(blockX: number, blockY: number) {
    const key = this.blockKey(blockX, blockY)
    const blk = this.blocks.get(key)
    if (!blk) return
    const pkts = writeFontBlock(this.vram, blockX, blockY, blk)
    for (const p of pkts) this.timelinePackets.push(p)
  }

  /**
   * Render all known blocks (in row-major order) into CDG packets. Call
   * this before write() if you want fine control over when block rendering
   * occurs. write() will also call this automatically.
   */
  renderAllBlocks() {
    // iterate by blockY then blockX for deterministic ordering
    const coords: Array<[number, number]> = []
    for (const k of this.blocks.keys()) {
      const [bxs, bys] = k.split(',').map((s) => Number(s))
      coords.push([Number(bxs), Number(bys)])
    }
    coords.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]))
    for (const [bx, by] of coords) this.renderBlock(bx, by)
  }

  // ------------------------------------------------------
  // Output / file writing
  // ------------------------------------------------------
  /**
   * Produce and write the .cdg file to disk. This will emit palette load
   * packets, optional border/memory preset, and any rendered block packets.
   * Once this is called the generator becomes immutable.
   */
  write(outPath: string) {
    if (!outPath) throw new Error('outPath required')
    // mark started (no further changes allowed)
    this.started = true
    // Delegate to getPacketStream() for packet ordering logic to avoid
    // duplicating the emission rules here. getPacketStream() already
    // applies the same mem-preset / explicit-fill logic.
    const outPkts = this.getPacketStream()

    // Ensure output directory exists and write
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    writePacketsToFile(outPath, outPkts)
  }

  /**
   * Build and return the packet stream (array of Uint8Array) that would be
   * written by `write()`, without writing to disk. Useful for unit tests.
   */
  getPacketStream(): Uint8Array[] {
    // Do not mark started here; allow callers to introspect before write()
    const outPkts: Uint8Array[] = []
    // Emit any pre-palette packets the caller explicitly scheduled
    // (e.g. scheduleScrollCopy(..., beforePalette:true)). These are
    // intentionally only emitted if the caller asked for them.
    if (this.prePalettePackets && this.prePalettePackets.length > 0) {
      for (const p of this.prePalettePackets) outPkts.push(p)
    }

    // Do NOT auto-emit palette, border, or memory preset packets here.
    // The generator will only emit packets the caller explicitly staged
    // into `timelinePackets` (via schedulePaletteLoad, scheduleClear,
    // renderBlock, advancePacks, etc.). This keeps write() fully
    // deterministic and free of implicit initialization.

    // If the user has already built a timeline (rendered blocks or inserted
    // empty packets via advancePacks/advanceSeconds) then use that timeline
    // (this.timelinePackets) to reflect exact ordering. Otherwise fall back
    // to rendering blocks deterministically into a temporary VRAM (no state
    // mutation) and return those packets.
    // detect if the timeline already contains a memory preset packet
    const hasMemPresetInTimeline = this.timelineHasMemPreset || this.timelinePackets.some((pkt) => ((pkt[1] & 0x3F) === CDGCommand.CDG_MEMORY_PRESET))

    if (this.timelinePackets.length > 0) {
      for (const p of this.timelinePackets) outPkts.push(p)
    } else {
      const tempVram = new VRAM()
      // If we emitted a default memory preset above, reflect it in the
      // temporary VRAM so deterministic block rendering uses the cleared
      // background rather than overwriting it with old pixels.
      if (!hasMemPresetInTimeline) {
        tempVram.clear(this.memPresetColor)
      }
      const coords: Array<[number, number]> = []
      for (const k of this.blocks.keys()) {
        const [bxs, bys] = k.split(',').map((s) => Number(s))
        coords.push([Number(bxs), Number(bys)])
      }
      coords.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]))
      for (const [bx, by] of coords) {
        const key = this.blockKey(bx, by)
        const blk = this.blocks.get(key)
        if (!blk) continue
        const pkts = writeFontBlock(tempVram, bx, by, blk)
        for (const p of pkts) outPkts.push(p)
      }
    }
    return outPkts
  }

  /**
   * Small convenience: reset rendered packets (keeps palette and blocks).
   * Useful if you want to re-render after changing internal state prior to
   * calling write(). Will throw if already started.
   */
  resetRendered() {
    this.ensureNotStarted()
    this.timelinePackets = []
    this.vram = new VRAM()
  }

  /**
   * Insert a number of empty packets (zero packets) into the packet stream.
   * This emulates the passage of time so that subsequent packets occur later
   * in the CDG playback timeline. `packs` must be a non-negative integer.
   */
  advancePacks(packs: number) {
    this.ensureNotStarted()
    const n = Math.max(0, Math.floor(packs))
    for (let i = 0; i < n; i++) {
      this.timelinePackets.push(makeEmptyPacket())
    }
  }

  /**
   * Advance playback time by `seconds` using the instance PPS mapping.
   * This appends ceil(seconds * pps) empty packets to the internal stream.
   */
  advanceSeconds(seconds: number) {
    this.ensureNotStarted()
    const s = Math.max(0, Number(seconds) || 0)
    const packs = Math.ceil(s * this._pps)
    this.advancePacks(packs)
  }
}

export default GeneratorByFunction

/* Example packet summary I want to be able to produce with this class:
 * as seen in diag/sample_project_04.chk-def.cdg
 *
  0: EMPTY                     packs=   250  secs=0.833  range=[0-249]
  1: CDG_SCROLL_COPY           packs=     1  secs=0.003  range=[250-250]
  2: EMPTY                     packs=   349  secs=1.163  range=[251-599]
  3: CDG_LOAD_COLOR_TABLE_LOW  packs=     1  secs=0.003  range=[600-600]
  4: CDG_LOAD_COLOR_TABLE_HIGH packs=     1  secs=0.003  range=[601-601]
  5: CDG_BORDER_PRESET         packs=     1  secs=0.003  range=[602-602]
  6: CDG_MEMORY_PRESET         packs=    16  secs=0.053  range=[603-618]
  7: CDG_TILE_BLOCK            packs=   121  secs=0.403  range=[619-739]
  8: EMPTY                     packs=     1  secs=0.003  range=[740-740]
*/

// color table examples removed (unused)

// If executed as a script with `--run`, perform a small demo. This block
// is intentionally guarded so importing the module does not execute it.
if (process.argv.includes('--run')) {
  (async () => {
    try {
      console.log('generate-by-function: demo run starting')
      const g = new GeneratorByFunction(
        {
          pps: 300,
          autoRenderBlocks: true,
          autoEmitBorderOnChange: true,
          emitPaletteOnWrite: false,
          emitBorderOnWrite: false
        }
      );

      g.prependEmptyPacks(600);
      // g.advanceSeconds(1);

      // Prove RED encoding is correct by cycling color 11 through
      // several RGB values including pure red.
      // [8,4,2,1].map((i) => i*17).forEach((red) => {
      //   g.setColor(11, red, 0, 0); console.log(`Set color 11 to RGB(${red},0,0)`);
      //   g.prependEmptyPacks(598);
      //   // g.advanceSeconds(1)
      // })

      my_colors.forEach((rgb, idx) => {
        const [r_col, g_col, b_col, name] = rgb
        g.setColor(11, r_col, g_col, b_col);
        console.log(`Set color 11 to RGB(${r_col},${g_col},${b_col}) ${name}`);
        g.prependEmptyPacks(598);
        // g.advanceSeconds(1)
      })

      // g.advanceSeconds(4);
      // g.advancePacks(1000);
      // g.setBorderColor(0)
      // g.scheduleScrollCopy({ beforePalette: true });
      // g.advanceSeconds(4);
      // g.advancePacks(349);
      // g.setUpperColor(3, 119, 0, 119) // PURPLE
      // g.setUpperColor(3, 0, 119, 0) // GREEN
      // g.setBorderColor(0)

      // for (let i = 0; i < 16; i++) {
      //   g.clearScreen(i);
      // }
      // g.advanceSeconds(4);

      // g.advancePacks(250);
      // g.advanceSeconds(2);
      // g.scheduleClear(9);
      // g.advanceSeconds(2);

      // for (let i = 8; i < 15; i++) {
        // scheduleClear appends actual memory-preset packets into the timeline
        // so the repeated clears are emitted at these points. clearScreen()
        // still sets the default mem preset used at write-time.
        // g.advanceSeconds(1)
      //   g.clearScreen(i);
      //   g.scheduleClear(i);
        // g.fillScreen(i,true);
      // }
      // g.advanceSeconds(3)

      // small demo: tweak palette, set border/memory, draw blocks with a pause
      // g.setLowerColor(1, 255, 255, 0)
      // g.advanceSeconds(0.25)
      // g.setBorderColor(2)
      // g.advanceSeconds(0.25)
      // g.clearScreen(2)
      // g.advanceSeconds(0.25)

      // ensure color 4 is visible (bright red) for the demo
      // g.setColor(4, 255, 0, 0)
      // g.advanceSeconds(0.25)

      // draw an initial pixel, wait half a second, then draw another to see progression
      // g.setBlockBit(10, 5, 0, 0, 1)
      // g.advanceSeconds(0.5)
      // g.setBlockBit(10, 5, 1, 0, 1)
      // g.advanceSeconds(0.5)

      // const W = 50 * 6
      // const H = 18 * 12
      // for (let i = 0; i < Math.min(W, H); i += 4) {
      //   const x = i
      //   const y = i
      //   // because autoRenderBlocks is true renderBlock is emitted for this block
      //   g.setBlockBit(Math.floor(x/6), Math.floor(y/12), x%6, y%12, 1) // color index 4
      //   g.advanceSeconds(0.02)
      // }

      // for (let x = 0, y = 0; x < (50 * 6) && y < (18 * 12); x++, y++) {
      //   g.advanceSeconds(0.006)
      //   g.setBlockBit(Math.floor(x / 6), Math.floor(y / 12), x % 6, y % 12, (x + y) % 16)
      // }

      // g.advanceSeconds(5)

      // render and write (no-op here if timeline already contains rendered packets)
      const outPath = path.join('diag', 'generate-by-function-demo.cdg')
      g.write(outPath)
      console.log('Wrote demo CDG to', outPath)
    } catch (e) {
      console.error('Demo run failed:', (e as any).message || e)
      process.exit(2)
    }
  })()
}


// VIM: ts=2 sw=2 et
// END