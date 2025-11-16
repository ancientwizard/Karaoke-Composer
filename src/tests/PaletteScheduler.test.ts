/**
 * PaletteScheduler.test.ts
 *
 * Tests for palette color assignment and LOAD packet scheduling.
 * Demonstrates how colors are allocated to palette slots and when
 * LOAD_COLOR_TABLE packets are emitted.
 */

import { PaletteScheduler } from '../karaoke/renderers/cdg/PaletteScheduler'

describe('PaletteScheduler', () => {
  describe('rgbToCDG', () => {
    it('should convert standard colors to CDG 12-bit values', () => {
      // Black
      expect(PaletteScheduler.rgbToCDG(0, 0, 0)).toBe(0x000)
      // White
      expect(PaletteScheduler.rgbToCDG(255, 255, 255)).toBe(0xFFF)
      // Red
      expect(PaletteScheduler.rgbToCDG(255, 0, 0)).toBe(0xF00)
      // Green
      expect(PaletteScheduler.rgbToCDG(0, 255, 0)).toBe(0x0F0)
      // Blue
      expect(PaletteScheduler.rgbToCDG(0, 0, 255)).toBe(0x00F)
      // Yellow (255, 255, 0)
      expect(PaletteScheduler.rgbToCDG(255, 255, 0)).toBe(0xFF0)
    })
  })

  describe('constructor', () => {
    it('should initialize with empty palette', () => {
      const scheduler = new PaletteScheduler()
      expect(scheduler.getPalette().length).toBe(16)
      expect(scheduler.getPalette().every(c => c === 0)).toBe(true)
    })

    it('should initialize with default palette', () => {
      const defaultPalette = [
        0x000, 0xFF0, 0xBBB, 0xFFF, 0x007, 0x07F, 0x777, 0x333,
        0xF00, 0x0F0, 0x00F, 0xF0F, 0x0FF, 0xF70, 0x707, 0x070
      ]
      const scheduler = new PaletteScheduler(defaultPalette)
      expect(scheduler.getPalette()).toEqual(defaultPalette)
    })
  })

  describe('setColor', () => {
    it('should set a color at a palette slot', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(0, 0xF00)  // Red at slot 0
      expect(scheduler.getColor(0)).toBe(0xF00)
      expect(scheduler.hasDirty()).toBe(true)
      expect(scheduler.dirtyCount()).toBe(1)
    })

    it('should clamp slot index to 0-15', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(-1, 0xF00)
      expect(scheduler.getColor(0)).toBe(0xF00)

      scheduler.setColor(20, 0x0F0)
      expect(scheduler.getColor(15)).toBe(0x0F0)
    })

    it('should mask color to 12 bits', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(5, 0xFFFF)
      expect(scheduler.getColor(5)).toBe(0xFFF)
    })
  })

  describe('findOrAllocateSlot', () => {
    it('should return existing slot if color is already in palette', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(3, 0xF00)  // Red at slot 3
      const slot = scheduler.findOrAllocateSlot(0xF00)
      expect(slot).toBe(3)
    })

    it('should allocate a new slot for a color not in palette', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(0, 0xFFF)  // White at slot 0

      // Yellow not in palette yet
      const slot = scheduler.findOrAllocateSlot(0xFF0)
      expect(slot).toBeGreaterThanOrEqual(0)
      expect(slot).toBeLessThan(16)
      expect(scheduler.getColor(slot)).toBe(0xFF0)
    })

    it('should mark allocated slots as dirty', () => {
      const scheduler = new PaletteScheduler()
      scheduler.findOrAllocateSlot(0xF00)
      expect(scheduler.hasDirty()).toBe(true)
      expect(scheduler.dirtyCount()).toBeGreaterThan(0)
    })
  })

  describe('generateLoadPackets', () => {
    it('should generate packets only if slots are dirty', () => {
      const scheduler = new PaletteScheduler()
      let packets = scheduler.generateLoadPackets()
      expect(packets.length).toBe(0)  // No dirty slots

      scheduler.setColor(5, 0xF00)
      packets = scheduler.generateLoadPackets()
      expect(packets.length).toBeGreaterThan(0)  // Now dirty
    })

    it('should clear dirty set after generating packets', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(0, 0xF00)
      expect(scheduler.hasDirty()).toBe(true)

      scheduler.generateLoadPackets()
      expect(scheduler.hasDirty()).toBe(false)
    })

    it('should generate LOW packet when slots 0-7 are dirty', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(3, 0xFF0)  // Dirty slot in LOW range
      const packets = scheduler.generateLoadPackets()
      // Should have at least a LOW packet
      expect(packets.length).toBeGreaterThanOrEqual(1)
    })

    it('should generate HIGH packet when slots 8-15 are dirty', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(11, 0xF0F)  // Dirty slot in HIGH range
      const packets = scheduler.generateLoadPackets()
      // Should have at least a HIGH packet
      expect(packets.length).toBeGreaterThanOrEqual(1)
    })

    it('should generate both packets if both ranges are dirty', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(3, 0xFF0)   // LOW range
      scheduler.setColor(11, 0xF0F)  // HIGH range
      const packets = scheduler.generateLoadPackets()
      // Should have both LOW and HIGH
      expect(packets.length).toBeGreaterThanOrEqual(2)
    })

    it('should return packets as Uint8Array of length 24', () => {
      const scheduler = new PaletteScheduler()
      scheduler.setColor(0, 0xF00)
      const packets = scheduler.generateLoadPackets()
      packets.forEach(pkt => {
        expect(pkt).toBeInstanceOf(Uint8Array)
        expect(pkt.length).toBe(24)
      })
    })
  })

  describe('markAllDirty', () => {
    it('should mark all 16 slots as dirty', () => {
      const scheduler = new PaletteScheduler()
      scheduler.markAllDirty()
      expect(scheduler.dirtyCount()).toBe(16)
      expect(scheduler.hasDirty()).toBe(true)
    })
  })

  describe('end-to-end palette assignment workflow', () => {
    it('should handle a typical color-assignment-and-load sequence', () => {
      const scheduler = new PaletteScheduler()

      // Scenario: rendering text in Red and Green
      const redCdg = PaletteScheduler.rgbToCDG(255, 0, 0)    // 0xF00
      const greenCdg = PaletteScheduler.rgbToCDG(0, 255, 0)  // 0x0F0

      // Step 1: Assign colors to palette
      const redSlot = scheduler.findOrAllocateSlot(redCdg)
      const greenSlot = scheduler.findOrAllocateSlot(greenCdg)

      expect(redSlot).toBeLessThan(16)
      expect(greenSlot).toBeLessThan(16)
      expect(redSlot).not.toBe(greenSlot)

      // Step 2: Generate LOAD packets
      const loadPackets = scheduler.generateLoadPackets()
      expect(loadPackets.length).toBeGreaterThan(0)

      // Step 3: Try to use the same colors again (should not generate new packets)
      const redSlot2 = scheduler.findOrAllocateSlot(redCdg)
      const greenSlot2 = scheduler.findOrAllocateSlot(greenCdg)

      expect(redSlot2).toBe(redSlot)
      expect(greenSlot2).toBe(greenSlot)
      expect(scheduler.hasDirty()).toBe(false)
      expect(scheduler.generateLoadPackets().length).toBe(0)
    })
  })
})

// VIM: ts=2 sw=2 et
// END
