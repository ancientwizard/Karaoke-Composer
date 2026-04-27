import { generatePaletteLoadPackets, generateBorderPacket, generateMemoryPresetPackets } from './encoder'

export type PreludeOptions = {
  pps?: number
  preludeMaxPackets?: number
  mode?: 'minimal'
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
  const fontPkts: Uint8Array[] = []

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
