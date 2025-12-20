/**
 * CDGPaletteManager
 *
 * Advanced palette resource management for CDG with:
 * - Lease-based color slot allocation (packet-based timing)
 * - Static (unlimited) vs dynamic (time-limited) colors
 * - Smart index allocation (0-7 for static, 8-15 for dynamic)
 * - Automatic palette load packet scheduling
 * - Lease chaining to track assignments over time
 * - Dirty region tracking (only emit load packets for changed halves)
 */

import      { DefaultPalette  } from '@/cdg/constants'
import type { RGB             } from '@/cdg/constants'

// Re-export RGB type for color definitions
export type { RGB }

/**
 * Lease status
 */
export enum LeaseStatus
{
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released'
}

/**
 * Color lease: tracks assignment of a color to a slot
 */
export interface ColorLease
{
  /**
   * Palette index (0-15)
   */
  index: number

  /**
   * The color assigned (RGB 8-bit per channel)
   */
  color: RGB

  /**
   * Start packet (when this lease begins)
   */
  startPacket: number

  /**
   * End packet (when this lease expires, or Infinity for unlimited)
   */
  endPacket: number

  /**
   * Lease status
   */
  status: LeaseStatus

  /**
   * Optional label for tracking (e.g., "text-active", "background")
   */
  label?: string

  /**
   * Next lease in chain (for same index over time)
   */
  next?: ColorLease
}

/**
 * Palette change event: indicates which halves changed
 */
export interface PaletteChangeEvent
{
  /**
   * Packet when change occurred
   */
  packet: number

  /**
   * Lower half (0-7) changed
   */
  lowerChanged: boolean

  /**
   * Upper half (8-15) changed
   */
  upperChanged: boolean

  /**
   * Leases that changed
   */
  changedLeases: ColorLease[]
}

/**
 * CDGPaletteManager
 *
 * Manages CDG palette slots with packet-based leasing and intelligent allocation.
 */
export class CDGPaletteManager
{
  /**
   * Current palette state (16 colors in RGB format)
   */
  private colors: RGB[] = []

  /**
   * Lease chains per index (linked list of leases over time)
   */
  private leases: Map<number, ColorLease | undefined> = new Map()

  /**
   * Track which indices are "static" (unlimited leases)
   */
  private staticIndices: Set<number> = new Set()

  /**
   * Track which indices are "dynamic" (time-limited leases)
   */
  private dynamicIndices: Set<number> = new Set()

  /**
   * Palette change events for scheduling load packets
   */
  private changeEvents: PaletteChangeEvent[] = []

  /**
   * Current packet position (for lease expiration checks)
   */
  private currentPacket = 0

  constructor()
  {
    // Initialize with default karaoke palette
    this.setDefaultPalette()

    // Initialize lease map
    for (let i = 0; i < 16; i++)
    {
      this.leases.set(i, undefined)
    }
  }

  /**
   * Set default karaoke palette from centralized DefaultPalette
   */
  private setDefaultPalette(): void
  {
    this.colors = DefaultPalette.colors.slice()
  }

  /**
   * Update current packet position (for lease expiration tracking)
   */
  updatePacket(packet: number): void
  {
    this.currentPacket = packet
  }

  /**
   * Lease a color slot
   *
   * @param color - The color to assign (RGB 8-bit per channel)
   * @param durationPackets - How long to lease (Infinity for unlimited)
   * @param label - Optional label for tracking
   * @param preferredIndex - Prefer a specific index if available
   * @returns The palette index assigned, or -1 if no slot available
   */
  leaseColor(
    color: RGB,
    durationPackets: number = Infinity,
    label?: string,
    preferredIndex?: number
  ): number
  {
    const startPacket = this.currentPacket
    const endPacket = durationPackets === Infinity ? Infinity : startPacket + durationPackets

    // Determine index allocation strategy
    let index = -1

    if (preferredIndex !== undefined && preferredIndex >= 0 && preferredIndex < 16)
    {
      // Try to use preferred index if no currently active lease at this position
      if (!this.getActiveLease(preferredIndex))
      {
        index = preferredIndex
      }
    }

    // If unlimited, try to find/create in lower half (0-7)
    if (index === -1 && durationPackets === Infinity)
    {
      for (let i = 0; i < 8; i++)
      {
        if (!this.getActiveLease(i))
        {
          index = i
          break
        }
      }
      if (index >= 0)
      {
        this.staticIndices.add(index)
      }
    }

    // If dynamic, try to find/create in upper half (8-15)
    if (index === -1 && durationPackets !== Infinity)
    {
      for (let i = 8; i < 16; i++)
      {
        if (!this.getActiveLease(i))
        {
          index = i
          break
        }
      }
      if (index >= 0)
      {
        this.dynamicIndices.add(index)
      }
    }

    // Fallback: any available slot
    if (index === -1)
    {
      for (let i = 0; i < 16; i++)
      {
        if (!this.getActiveLease(i))
        {
          index = i
          break
        }
      }
    }

    // No slot available
    if (index === -1)
    {
      return -1
    }

    // Create new lease and chain it
    const newLease: ColorLease = {
      index,
      color,
      startPacket,
      endPacket,
      status: LeaseStatus.ACTIVE,
      label,
      next: undefined
    }

    const existingLease = this.leases.get(index)
    if (existingLease)
    {
      // Chain to end of list
      let tail = existingLease
      while (tail.next)
      {
        tail = tail.next
      }
      tail.next = newLease
    }
    else
    {
      this.leases.set(index, newLease)
    }

    // Update color
    this.colors[index] = color

    // Track change event
    this.recordChange(index, [newLease])

    return index
  }

  /**
   * Release a leased color (mark as released, slot becomes reusable)
   */
  releaseLease(lease: ColorLease): void
  {
    lease.status = LeaseStatus.RELEASED
  }

  /**
   * Check if a lease is expired at current packet
   */
  isLeaseExpired(lease: ColorLease): boolean
  {
    return lease.endPacket !== Infinity && this.currentPacket >= lease.endPacket
  }

  /**
   * Get active lease at index for current packet
   */
  getActiveLease(index: number): ColorLease | undefined
  {
    let lease = this.leases.get(index)
    while (lease)
    {
      if (
        lease.status === LeaseStatus.ACTIVE &&
        this.currentPacket >= lease.startPacket &&
        (lease.endPacket === Infinity || this.currentPacket < lease.endPacket)
      )
      {
        return lease
      }
      lease = lease.next
    }
    return undefined
  }

  /**
   * Get all active leases at current packet
   */
  getActiveLeases(): ColorLease[]
  {
    const active: ColorLease[] = []
    for (let i = 0; i < 16; i++)
    {
      const lease = this.getActiveLease(i)
      if (lease)
      {
        active.push(lease)
      }
    }
    return active
  }

  /**
   * Get color at index
   */
  getColor(index: number): RGB
  {
    return this.colors[index & 0x0F]
  }

  /**
   * Get all colors
   */
  getColors(): RGB[]
  {
    return [...this.colors]
  }

  /**
   * Record a palette change event
   */
  private recordChange(changedIndex: number, changedLeases: ColorLease[]): void
  {
    const isLower = changedIndex < 8
    const isUpper = changedIndex >= 8

    const event: PaletteChangeEvent = {
      packet: this.currentPacket,
      lowerChanged: isLower,
      upperChanged: isUpper,
      changedLeases
    }

    // Merge with last event if same packet and same halves
    const lastEvent = this.changeEvents[this.changeEvents.length - 1]
    if (
      lastEvent &&
      lastEvent.packet === this.currentPacket &&
      lastEvent.lowerChanged === event.lowerChanged &&
      lastEvent.upperChanged === event.upperChanged
    )
    {
      lastEvent.changedLeases.push(...changedLeases)
    }
    else
    {
      this.changeEvents.push(event)
    }
  }

  /**
   * Get palette change events
   */
  getChangeEvents(): PaletteChangeEvent[]
  {
    return [...this.changeEvents]
  }

  /**
   * Clear change history
   */
  clearChangeHistory(): void
  {
    this.changeEvents = []
  }

  /**
   * Get lease chain for an index
   */
  getLeaseChain(index: number): ColorLease[]
  {
    const chain: ColorLease[] = []
    let lease = this.leases.get(index)
    while (lease)
    {
      chain.push(lease)
      lease = lease.next
    }
    return chain
  }

  /**
   * Get statistics
   */
  getStats()
  {
    return {
      staticIndices: Array.from(this.staticIndices),
      dynamicIndices: Array.from(this.dynamicIndices),
      currentPacket: this.currentPacket,
      activeLeases: this.getActiveLeases().length,
      changeEvents: this.changeEvents.length
    }
  }
}

// VIM: set filetype=typescript :
// END
