/**
 * Line Lease Manager - Manages Y position assignment for lyric lines
 *
 * Implements a rotating pool of Y positions that lines "lease" for their duration.
 * When a line finishes (endTime), its position becomes available for the next line.
 * Maintains a buffer line (empty separator) for readability as lyrics flow down.
 *
 * Think of it like a page view where:
 * - New lines appear at the bottom
 * - Old lines age and exit at the top
 * - One blank line separates old from new content
 * - Positions rotate in a circular queue
 */

export interface LeasedLine {
  lineId: string
  startTime: number
  endTime: number
  yPosition: number
}

/**
 * Line Lease Manager
 */
export class LineLeaseManager {
  private yPositions: number[] // Pool of Y positions (in abstract 0-1000 space)
  private activeLeases: Map<string, LeasedLine> = new Map()
  private nextPositionIndex: number = 0
  private bufferLineIndex: number = 0 // Which position in pool is the buffer (empty separator)

  constructor() {
    // Define Y position pool: 4 positions that sweep down the screen
    // Position spacing: 216px screen / 12px line height = 18 lines max
    // But we want a nice progression, so space them at ~50-60px apart
    // Abstract space (0-1000): roughly 10%, 30%, 50%, 70%
    this.yPositions = [
      100,   // Top position (10% down)
      300,   // Upper-mid
      500,   // Center
      700    // Lower position (70% down)
    ]

    // Buffer line starts at top (will sweep down)
    this.bufferLineIndex = 0
  }

  /**
   * Request a Y position lease for a line
   * Returns the Y position in abstract space (0-1000)
   *
   * Algorithm:
   * 1. Find next available position (oldest expired lease or next in rotation)
   * 2. Skip buffer position if it's in the way
   * 3. Assign position to line
   * 4. Rotate buffer position downward
   */
  leasePosition(lineId: string, startTime: number, endTime: number): number {
    // Clean up expired leases first
    this.expireLeases(startTime)

    // Find next available position in rotation
    let positionIndex = this.nextPositionIndex
    let attempts = 0
    const maxAttempts = this.yPositions.length

    // Find a position that's either:
    // - Not currently leased, OR
    // - Has an expired lease
    while (attempts < maxAttempts) {
      const yPos = this.yPositions[positionIndex]

      // Skip if this is the buffer position
      if (positionIndex === this.bufferLineIndex) {
        positionIndex = (positionIndex + 1) % this.yPositions.length
        attempts++
        continue
      }

      // Check if this position is available
      let isAvailable = true
      for (const lease of this.activeLeases.values()) {
        if (lease.yPosition === yPos && lease.endTime > startTime) {
          isAvailable = false
          break
        }
      }

      if (isAvailable) {
        // Found available position
        const lease: LeasedLine = {
          lineId,
          startTime,
          endTime,
          yPosition: yPos
        }
        this.activeLeases.set(lineId, lease)

        // Move buffer down and advance rotation
        this.bufferLineIndex = positionIndex
        this.nextPositionIndex = (positionIndex + 1) % this.yPositions.length

        return yPos
      }

      positionIndex = (positionIndex + 1) % this.yPositions.length
      attempts++
    }

    // Fallback: all positions in use, assign to next in rotation anyway
    const yPos = this.yPositions[this.nextPositionIndex]
    const lease: LeasedLine = {
      lineId,
      startTime,
      endTime,
      yPosition: yPos
    }
    this.activeLeases.set(lineId, lease)
    this.nextPositionIndex = (this.nextPositionIndex + 1) % this.yPositions.length

    return yPos
  }

  /**
   * Get the Y position for a line that's currently leasing
   */
  getPosition(lineId: string): number | undefined {
    const lease = this.activeLeases.get(lineId)
    return lease?.yPosition
  }

  /**
   * Check if a line's lease is still active at given time
   */
  isLeaseActive(lineId: string, atTime: number): boolean {
    const lease = this.activeLeases.get(lineId)
    if (!lease) return false
    return atTime >= lease.startTime && atTime <= lease.endTime
  }

  /**
   * Remove expired leases (timing has passed)
   */
  private expireLeases(currentTime: number): void {
    const toDelete: string[] = []
    for (const [lineId, lease] of this.activeLeases.entries()) {
      if (lease.endTime < currentTime) {
        toDelete.push(lineId)
      }
    }
    toDelete.forEach(lineId => this.activeLeases.delete(lineId))
  }

  /**
   * Get all currently active leases at a given time
   */
  getActiveLeases(atTime: number): LeasedLine[] {
    return Array.from(this.activeLeases.values())
      .filter(lease => atTime >= lease.startTime && atTime <= lease.endTime)
  }

  /**
   * Get the buffer position (empty separator line)
   */
  getBufferPosition(): number {
    return this.yPositions[this.bufferLineIndex]
  }

  /**
   * Reset all leases (for testing or new song)
   */
  reset(): void {
    this.activeLeases.clear()
    this.nextPositionIndex = 0
    this.bufferLineIndex = 0
  }
}

// VIM: set filetype=typescript :
// END
