import type { RenderOptions, RenderResult, TileDraw } from './types'
import { CDGPacket, CDGPalette, CDG_SCREEN } from '@/karaoke/renderers/cdg/CDGPacket'
import { CDG_PACKET_SIZE } from './constants'

/**
 * Very small, conservative renderer that emits a valid CDG packet stream.
 * This is intentionally minimal: it emits initial palette/load packets, a
 * memory preset and then appends either tile packets (if provided) or empty
 * packets to match the requested duration.
 */
export async function renderSimple(
  tiles: TileDraw[] = [],
  opts: RenderOptions = {}
): Promise<RenderResult> {
  const pps = opts.packetsPerSecond || CDG_SCREEN.PACKETS_PER_SECOND
  const duration = opts.durationSeconds || 5
  const totalPackets = Math.max(1, Math.round(duration * pps))

  // Collect packets
  const packets: Buffer[] = []

  // Palette
  const pal = new CDGPalette()
  pal.setDefaultPalette()

  // Schedule packets across the requested duration.
  // We'll create a frame buffer for each packet slot and write header packets
  // (palette/memory/border) at the start, then schedule tile packets at
  // the packet index computed from tile.at * pps. Remaining slots stay empty.
  const slotCount = totalPackets
  const slots: Buffer[] = new Array(slotCount).fill(null).map(() => CDGPacket.empty().toBuffer())

  // write the palette and presets into the initial slots in order
  let writeIndex = 0
  const palPkts = pal.generateLoadPackets().map(pkt => pkt.toBuffer())
  for (const b of palPkts) {
    if (writeIndex < slotCount) slots[writeIndex++] = b
  }
  if (writeIndex < slotCount) slots[writeIndex++] = CDGPacket.memoryPreset(0).toBuffer()
  if (writeIndex < slotCount) slots[writeIndex++] = CDGPacket.borderPreset(0).toBuffer()

  // Schedule each tile at its requested time (or next available slot).
  for (const t of tiles) {
    const desired = Math.max(0, Math.floor((t.at || 0) * pps))
    // ensure tile isn't placed before header
    const idx = Math.min(slotCount - 1, Math.max(writeIndex, desired))
    slots[idx] = CDGPacket.tileBlock(t.color0, t.color1, t.coord.row, t.coord.col, t.pixels, !!t.xor).toBuffer()
  }

  // Ensure the last slot is non-empty so CDG duration is seen by players as
  // covering the entire audio. Prefer re-sending a tile packet if available,
  // otherwise re-emit a palette packet.
  if (slotCount > 0) {
    if (tiles.length > 0) {
      const t = tiles[tiles.length - 1]
      slots[slotCount - 1] = CDGPacket.tileBlock(t.color0, t.color1, t.coord.row, t.coord.col, t.pixels, !!t.xor).toBuffer()
    } else {
      // re-emit last palette packet to mark file as non-empty at end
      const tailPal = pal.generateLoadPackets().pop()
      if (tailPal) slots[slotCount - 1] = tailPal.toBuffer()
    }
  }

  // Use the slots array as the packets stream
  for (const s of slots) packets.push(s)

  // Concatenate buffers
  const out = Buffer.concat(packets)

  return {
    buffer: new Uint8Array(out),
    packets: Math.floor(out.length / CDG_PACKET_SIZE),
    durationSeconds: totalPackets / pps
  }
}
