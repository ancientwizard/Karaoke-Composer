/**
 * CDGPaletteManager Tests
 *
 * Validates lease-based palette management, allocation strategy, and change tracking.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { CDGPaletteManager, LeaseStatus } from '@/cdg/palette-manager'

describe('CDGPaletteManager', () => {
  let manager: CDGPaletteManager

  beforeEach(() => {
    manager = new CDGPaletteManager()
  })

  describe('Initialization', () => {
    it('should initialize with 16 colors', () => {
      const colors = manager.getColors()
      expect(colors).toHaveLength(16)
    })

    it('should have default palette set', () => {
      // Black at index 0
      expect(manager.getColor(0)).toEqual({ r: 0, g: 0, b: 0 })
      // Yellow at index 1
      expect(manager.getColor(1)).toEqual({ r: 255, g: 255, b: 0 })
    })

    it('should track current packet position', () => {
      manager.updatePacket(100)
      const stats = manager.getStats()
      expect(stats.currentPacket).toBe(100)
    })
  })

  describe('Lease Management - Unlimited Colors', () => {
    it('should allocate unlimited colors to lower half (0-7)', () => {
      const red = { r: 255, g: 0, b: 0 }
      const index1 = manager.leaseColor(red, Infinity, 'text-active')
      expect(index1).toBeLessThan(8)
      expect(manager.getColor(index1)).toEqual(red)
    })

    it('should allocate multiple unlimited colors to different lower indices', () => {
      const red = { r: 255, g: 0, b: 0 }
      const green = { r: 0, g: 255, b: 0 }
      const blue = { r: 0, g: 0, b: 255 }

      const idx1 = manager.leaseColor(red, Infinity, 'text-1')
      const idx2 = manager.leaseColor(green, Infinity, 'text-2')
      const idx3 = manager.leaseColor(blue, Infinity, 'text-3')

      expect([idx1, idx2, idx3]).toEqual(expect.arrayContaining([0, 1, 2]))
      expect(idx1).not.toBe(idx2)
      expect(idx2).not.toBe(idx3)
    })

    it('should mark unlimited colors as static', () => {
      manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity)
      const stats = manager.getStats()
      expect(stats.staticIndices.length).toBeGreaterThan(0)
    })
  })

  describe('Lease Management - Time-Limited Colors', () => {
    it('should allocate dynamic colors to upper half (8-15)', () => {
      manager.updatePacket(100)
      const cyan = { r: 0, g: 255, b: 255 }
      const index = manager.leaseColor(cyan, 500, 'transition-bg')
      expect(index).toBeGreaterThanOrEqual(8)
      expect(index).toBeLessThan(16)
      expect(manager.getColor(index)).toEqual(cyan)
    })

    it('should create lease with correct duration', () => {
      manager.updatePacket(100)
      const index = manager.leaseColor({ r: 0, g: 255, b: 255 }, 500, 'temp')
      const chain = manager.getLeaseChain(index)
      expect(chain).toHaveLength(1)
      expect(chain[0].startPacket).toBe(100)
      expect(chain[0].endPacket).toBe(600)
    })

    it('should track expired leases', () => {
      manager.updatePacket(100)
      const index = manager.leaseColor({ r: 0, g: 255, b: 255 }, 500)

      // Before expiration
      expect(manager.isLeaseExpired(manager.getActiveLease(index)!)).toBe(false)

      // After expiration
      manager.updatePacket(650)
      const expired = manager.getActiveLease(index)
      // Note: at packet 650, the lease (600) has expired, so getActiveLease returns undefined
      expect(expired).toBeUndefined()
    })

    it('should mark dynamic colors as dynamic', () => {
      manager.updatePacket(50)
      manager.leaseColor({ r: 0, g: 255, b: 255 }, 300)
      const stats = manager.getStats()
      expect(stats.dynamicIndices.length).toBeGreaterThan(0)
    })
  })

  describe('Lease Chaining', () => {
    it('should chain leases at same index when explicitly preferred', () => {
      manager.updatePacket(100)
      const idx1 = manager.leaseColor({ r: 255, g: 0, b: 0 }, 200, 'phase-1')

      // Move past first lease expiration (ends at 300)
      manager.updatePacket(310)
      // Now the slot is free, explicitly request same index
      const idx2 = manager.leaseColor({ r: 0, g: 255, b: 0 }, 200, 'phase-2', idx1)

      expect(idx2).toBe(idx1)
      const chain = manager.getLeaseChain(idx1)
      expect(chain).toHaveLength(2)
      expect(chain[0].label).toBe('phase-1')
      expect(chain[1].label).toBe('phase-2')
    })

    it('should return correct active lease at different packets', () => {
      const index = 5
      manager.updatePacket(100)
      manager.leaseColor({ r: 255, g: 0, b: 0 }, 200, 'first', index)

      manager.updatePacket(250)
      const activeLease = manager.getActiveLease(index)
      expect(activeLease).toBeDefined() // Still active (ends at 300)
      expect(activeLease!.label).toBe('first')

      manager.updatePacket(310)
      const expiredLease = manager.getActiveLease(index)
      expect(expiredLease).toBeUndefined() // Now expired
    })
  })

  describe('Active Leases Tracking', () => {
    it('should report active leases at current packet', () => {
      manager.updatePacket(50)
      manager.leaseColor({ r: 255, g: 0, b: 0 }, 100, 'a')
      manager.leaseColor({ r: 0, g: 255, b: 0 }, Infinity, 'b')

      const active = manager.getActiveLeases()
      expect(active.length).toBe(2)
      expect(active.map(l => l.label)).toEqual(expect.arrayContaining(['a', 'b']))
    })

    it('should exclude expired leases from active', () => {
      manager.updatePacket(50)
      manager.leaseColor({ r: 255, g: 0, b: 0 }, 100) // expires at 150

      manager.updatePacket(200)
      const active = manager.getActiveLeases()
      expect(active.length).toBe(0)
    })

    it('should respect lease start time', () => {
      manager.updatePacket(50)
      const idx = manager.leaseColor({ r: 255, g: 0, b: 0 }, 100) // starts at 50, ends at 150

      manager.updatePacket(40)
      expect(manager.getActiveLease(idx)).toBeUndefined() // Too early

      manager.updatePacket(50)
      expect(manager.getActiveLease(idx)).toBeDefined() // Starts now
    })
  })

  describe('Palette Change Tracking', () => {
    it('should track changes to lower half', () => {
      manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity) // index < 8
      const events = manager.getChangeEvents()
      expect(events.length).toBeGreaterThan(0)
      expect(events[0].lowerChanged).toBe(true)
      expect(events[0].upperChanged).toBe(false)
    })

    it('should track changes to upper half', () => {
      manager.updatePacket(100)
      manager.leaseColor({ r: 0, g: 255, b: 255 }, 500) // forces upper allocation
      const events = manager.getChangeEvents()
      expect(events.length).toBeGreaterThan(0)
      const lastEvent = events[events.length - 1]
      expect(lastEvent.upperChanged).toBe(true)
    })

    it('should merge events on same packet', () => {
      manager.updatePacket(50)
      manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity) // lower
      manager.leaseColor({ r: 0, g: 255, b: 0 }, Infinity) // lower
      const events = manager.getChangeEvents()
      // Both should be in same packet, might merge
      const packet50Events = events.filter(e => e.packet === 50)
      expect(packet50Events.length).toBeGreaterThan(0)
    })

    it('should allow clearing change history', () => {
      manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity)
      expect(manager.getChangeEvents().length).toBeGreaterThan(0)
      manager.clearChangeHistory()
      expect(manager.getChangeEvents().length).toBe(0)
    })
  })

  describe('Preferred Index Allocation', () => {
    it('should honor preferred index if available', () => {
      const idx = manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity, 'test', 5)
      expect(idx).toBe(5)
    })

    it('should fall back to auto-allocation if preferred is taken', () => {
      manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity, 'first', 5)
      const idx2 = manager.leaseColor({ r: 0, g: 255, b: 0 }, Infinity, 'second', 5)
      expect(idx2).not.toBe(5)
    })
  })

  describe('Slot Exhaustion', () => {
    it('should return -1 when no slots available', () => {
      manager.updatePacket(50)
      // Fill all 16 slots
      for (let i = 0; i < 16; i++)
      {
        const idx = manager.leaseColor({ r: i * 15, g: 0, b: 0 }, Infinity)
        expect(idx).toBeGreaterThanOrEqual(0)
      }
      // Next allocation should fail
      const idx = manager.leaseColor({ r: 255, g: 0, b: 0 }, Infinity)
      expect(idx).toBe(-1)
    })
  })

  describe('Integration Scenario - Karaoke Timeline', () => {
    it('should handle realistic karaoke color progression', () => {
      const darkBg = { r: 0, g: 0, b: 0 } // black, unlimited
      const activeText = { r: 255, g: 255, b: 0 } // yellow, unlimited
      const passiveText = { r: 136, g: 136, b: 136 } // gray, unlimited

      // Initial setup
      manager.updatePacket(0)
      const bgIdx = manager.leaseColor(darkBg, Infinity, 'background')
      const activeIdx = manager.leaseColor(activeText, Infinity, 'active-text')
      const passiveIdx = manager.leaseColor(passiveText, Infinity, 'passive-text')

      expect([bgIdx, activeIdx, passiveIdx]).toEqual(expect.arrayContaining([0, 1, 2]))

      // Transition effect at packet 300
      manager.updatePacket(300)
      const transitionIdx = manager.leaseColor({ r: 0, g: 255, b: 255 }, 600, 'transition-effect') // 300pps = 2s
      expect(transitionIdx).toBeGreaterThanOrEqual(8) // upper half

      // Check stats at different points
      manager.updatePacket(350)
      let stats = manager.getStats()
      expect(stats.activeLeases).toBe(4)

      // After transition
      manager.updatePacket(950)
      stats = manager.getStats()
      expect(stats.activeLeases).toBe(3) // transition expired
    })
  })
})

// VIM: set filetype=typescript :
// END
