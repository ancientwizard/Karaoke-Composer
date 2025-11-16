/**
 * PaletteScheduler
 *
 * Manages palette color assignments and schedules LOAD_COLOR_TABLE packets
 * into the CDG packet stream when colors are assigned or changed.
 *
 * Key responsibilities:
 * - Track which palette slots (0-15) are currently assigned to which colors
 * - Track which slots need LOAD packets emitted (dirty slots)
 * - Provide a method to find or allocate a slot for a requested color
 * - Return a list of CDG packets (LOAD_COLOR_TABLE_LOW + HIGH) to emit at a given packet position
 */

import { CDGPacket } from './CDGPacket'

export interface ScheduleOptions {
  vlc_align?: boolean   // Insert empty packets so LOAD lands at i%3==1
  framingMode?: 'file' | 'disk'  // 'file' (data at +3) or 'disk' (data at +4)
  parityMode?: 'on' | 'off'  // Emit parity bytes or omit them
}

export class PaletteScheduler {
  private palette: number[]  // 16-entry palette, each entry is 12-bit CDG color (r4<<8 | g4<<4 | b4)
  private dirty: Set<number>  // Slots that need LOAD packets
  private colorToSlot: Map<number, number>  // Map from 12-bit color to slot index for quick lookup

  constructor(defaultPalette?: number[]) {
    this.palette = new Array(16).fill(0)
    this.dirty = new Set()
    this.colorToSlot = new Map()

    if (defaultPalette && defaultPalette.length >= 16) {
      for (let i = 0; i < 16; i++) {
        this.palette[i] = defaultPalette[i] & 0x0FFF
        this.colorToSlot.set(this.palette[i], i)
      }
    }
  }

  /**
   * Convert 8-bit RGB to CDG 12-bit color (r4<<8 | g4<<4 | b4)
   */
  static rgbToCDG(r: number, g: number, b: number): number {
    const r4 = Math.floor(r / 17) & 0x0F
    const g4 = Math.floor(g / 17) & 0x0F
    const b4 = Math.floor(b / 17) & 0x0F
    return ((r4 << 8) | (g4 << 4) | b4) & 0x0FFF
  }

  /**
   * Find or allocate a palette slot for the requested color.
   * Returns the slot index (0-15). If the color already exists, returns its slot.
   * Otherwise finds an unused slot and assigns the color to it, marking it dirty.
   */
  findOrAllocateSlot(color: number): number {
    color = color & 0x0FFF

    // Check if color already exists
    if (this.colorToSlot.has(color)) {
      return this.colorToSlot.get(color)!
    }

    // Find an unused slot (slot with color 0x000 that isn't already in use)
    // For simplicity, we scan for the first slot that doesn't map to another color
    // In a real scenario, you might want a more sophisticated allocation strategy
    for (let i = 0; i < 16; i++) {
      if (!Array.from(this.colorToSlot.values()).includes(i)) {
        this.setColor(i, color)
        return i
      }
    }

    // Fallback: overwrite slot 0 (or could throw an error)
    this.setColor(0, color)
    return 0
  }

  /**
   * Assign a color to a specific palette slot and mark it dirty.
   */
  setColor(slot: number, color: number): void {
    slot = Math.max(0, Math.min(15, Math.floor(slot)))
    color = color & 0x0FFF

    const oldColor = this.palette[slot]
    this.palette[slot] = color
    this.dirty.add(slot)

    // Update reverse lookup
    if (oldColor !== color) {
      // Remove old mapping if no other slot uses it
      if (this.colorToSlot.get(oldColor) === slot) {
        this.colorToSlot.delete(oldColor)
      }
    }
    this.colorToSlot.set(color, slot)
  }

  /**
   * Get the current color at a palette slot.
   */
  getColor(slot: number): number {
    return this.palette[Math.max(0, Math.min(15, Math.floor(slot)))] & 0x0FFF
  }

  /**
   * Get all 16 palette colors as an array.
   */
  getPalette(): number[] {
    return [...this.palette]
  }

  /**
   * Generate LOAD_COLOR_TABLE packets for any dirty slots.
   * Returns an array of Uint8Array packets ready to write to the CDG stream.
   * Clears the dirty set after generating packets.
   */
  generateLoadPackets(): Uint8Array[] {
    if (this.dirty.size === 0) {
      return []
    }

    const packets: Uint8Array[] = []

    // Generate LOW (slots 0-7) if any are dirty
    const lowDirty = Array.from(this.dirty).some(s => s < 8)
    if (lowDirty) {
      const lowColors = this.palette.slice(0, 8)
      const lowPkt = CDGPacket.loadColorTable(lowColors, false)
      packets.push(lowPkt.toBuffer() as unknown as Uint8Array)
    }

    // Generate HIGH (slots 8-15) if any are dirty
    const highDirty = Array.from(this.dirty).some(s => s >= 8)
    if (highDirty) {
      const highColors = this.palette.slice(8, 16)
      const highPkt = CDGPacket.loadColorTable(highColors, true)
      packets.push(highPkt.toBuffer() as unknown as Uint8Array)
    }

    this.dirty.clear()
    return packets
  }

  /**
   * Mark all slots as dirty (useful when reinitializing or testing).
   */
  markAllDirty(): void {
    for (let i = 0; i < 16; i++) {
      this.dirty.add(i)
    }
  }

  /**
   * Check if any slots are dirty.
   */
  hasDirty(): boolean {
    return this.dirty.size > 0
  }

  /**
   * Get count of dirty slots.
   */
  dirtyCount(): number {
    return this.dirty.size
  }
}

// VIM: ts=2 sw=2 et
// END
