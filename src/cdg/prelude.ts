import { generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets, writeFontBlock, VRAM } from './encoder'
import { CDG_SCREEN } from '../karaoke/renderers/cdg/CDGPacket'
import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont'

export type PreludeOptions = {
  pps?: number
  preludeMaxPackets?: number
  mode?: 'aggressive' | 'minimal'
  persistentDurationSeconds?: number
}

/**
 * Synthesize a minimal deterministic prelude from the parsed project JSON.
 * Currently produces palette, border and a MEMORY_PRESET background. This
 * keeps the implementation small and deterministic; we can extend it to
 * synthesize static overlay tiles (banners) later.
 */
export function synthesizePrelude(parsed: any, opts: PreludeOptions = {}) {
  // Use encoder helpers to produce canonical palette/border/memory packets.
  const palettePkts = generatePaletteLoadPackets()

  // Pick a border color index from JSON hints (first BMPClip or TextClip)
  let borderIndex = 0
  try {
    for (const c of parsed.clips || []) {
      if (c.type === 'BMPClip') {
        borderIndex = (c.events && c.events[0] && Number.isFinite(Number(c.events[0].border_index))) ? Number(c.events[0].border_index) : (Number.isFinite(Number(c.border_index)) ? Number(c.border_index) : borderIndex)
        break
      }
      if (c.type === 'TextClip') {
        borderIndex = Number.isFinite(Number(c.frame_color)) ? Number(c.frame_color) : borderIndex
        break
      }
    }
  } catch (e) {
    // ignore parsing issues
  }
  const borderPkts = generateBorderPacket(borderIndex)

  // Memory preset color: prefer BMPClip.fill_index or TextClip.fill_index
  // Default to 1 to match the non-synthesized generator default (helps
  // ensure synthesized preludes use a visible background color by default).
  let memColor = 1
  try {
    for (const c of parsed.clips || []) {
      if (c.type === 'BMPClip') {
        memColor = Number.isFinite(Number(c.events && c.events[0] && c.events[0].fill_index)) ? Number(c.events[0].fill_index) : (Number.isFinite(Number(c.fill_index)) ? Number(c.fill_index) : memColor)
        break
      }
      if (c.type === 'TextClip') {
        memColor = Number.isFinite(Number(c.fill_index)) ? Number(c.fill_index) : memColor
        break
      }
    }
  } catch (e) {
    // ignore
  }
  if (!Number.isFinite(memColor) || memColor < 0 || memColor > 15) memColor = 0
  // If a reference CDG path is provided in opts, prefer copying the
  // MEMORY_PRESET packets from the reference so we match any embedded
  // messages / preset layout exactly. Otherwise synthesize using encoder.
  let memoryPkts = generateMemoryPresetPackets(memColor)
  try {
    const refPath = (opts as any).referenceCdgPath
    if (refPath) {
      const fs = require('fs')
      const pktSize = 24
      const refBuf = fs.readFileSync(refPath)
      const refPktCount = Math.floor(refBuf.length / pktSize)
      const pkts: Uint8Array[] = []
      for (let i = 0; i < refPktCount; i++) {
        const base = i * pktSize
        const cmd = refBuf[base + 1] & 0x3F
        if (cmd === 1) {
          pkts.push(Uint8Array.from(refBuf.slice(base, base + pktSize)))
        }
      }
      if (pkts.length > 0) {
        memoryPkts = pkts
      }
    }
  } catch (e) {
    // ignore reference read failures and fall back to synthesized memoryPkts
  }

  // Now synthesize static font blocks for TextClip entries deterministically.
  // If mode is 'minimal' only synthesize text tiles which appear "persistent"
  // (heuristic: event/clip duration >= persistentDurationSeconds). The
  // aggressive default will synthesize all static tiles.
  const textRenderer = new CDGTextRenderer()
  const fontPkts: Uint8Array[] = []
  try {
    // Default to minimal prelude: avoid writing font tiles in the prelude so
    // the scheduler places them at the correct times. Aggressive mode will
    // emit font packets into the prelude (opt-in).
  const mode = opts.mode || 'minimal'
    // Only synthesize font packets in aggressive mode. Minimal mode emits
    // only palette/border/memory presets; the scheduler will generate font
    // packets at runtime from the JSON events.
    if (mode === 'aggressive') {
      // For determinism iterate clips in input order and events in order.
      for (const c of parsed.clips || []) {
        if (c.type !== 'TextClip') continue
        const fg = (c.foreground_color != null) ? c.foreground_color : 1
        const bg = (c.background_color != null) ? c.background_color : 0
        for (const ev of c.events || []) {
          // aggressive mode: synthesize all tiles
          const tileRow = Math.floor((ev.clip_y_offset || 0) / CDG_SCREEN.TILE_HEIGHT)
          const tileCol = Math.floor((ev.clip_x_offset || 0) / CDG_SCREEN.TILE_WIDTH)
          const glyphs = textRenderer.renderAt(c.text || '', tileRow, tileCol)
          // sort glyphs by Y then X to ensure deterministic ordering
          glyphs.sort((a: any, b: any) => (a.pixelY - b.pixelY) || (a.pixelX - b.pixelX))
          for (const g of glyphs) {
            const pixels: number[][] = []
            for (let r = 0; r < Math.min(12, g.rows.length); r++) {
              const rowbits = g.rows[r]
              const rowArr: number[] = []
              for (let cbit = 0; cbit < 6; cbit++) {
                const bit = (rowbits >> (5 - cbit)) & 1
                rowArr.push(bit ? fg : bg)
              }
              pixels.push(rowArr)
            }
            try {
              const vv = new VRAM()
              const tileCol = Math.floor(g.pixelX / CDG_SCREEN.TILE_WIDTH)
              const tileRow = Math.floor(g.pixelY / CDG_SCREEN.TILE_HEIGHT)
              const pkts = writeFontBlock(vv, tileCol, tileRow, pixels)
              for (const p of pkts) fontPkts.push(p)
            } catch (e) {
              // ignore per-block failures to keep synthesizer robust
            }
          }
        }
      }
    }
  } catch (e) {
    // ignore render failures
  }

  const packets: Uint8Array[] = [...palettePkts, ...borderPkts, ...memoryPkts, ...fontPkts]

  // Apply optional max packet cap while keeping required prefix
  if (opts.preludeMaxPackets && packets.length > opts.preludeMaxPackets) {
    return packets.slice(0, opts.preludeMaxPackets)
  }

  return packets
}

export default synthesizePrelude

// VIM: set ts=2 sw=2 sts=2 et
// END || ## END
