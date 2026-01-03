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
export class LineLeaseManager
{
  private yPositions: number[] // Pool of Y positions (in abstract 0-1000 space)
  private activeLeases: Map<string, LeasedLine> = new Map()
  private nextPositionIndex: number = 0
  private bufferLineIndex: number = 0 // Which position in pool is the buffer (empty separator)

  constructor()
  {
    // Define Y position pool: 7 positions distributed evenly across screen height
    // Screen is 1000 units tall, 216 pixels tall
    // Each glyph is 12 pixels = 55.5 abstract units
    // With 7 rows evenly spaced: ~128 abstract units apart
    // This provides natural spacing for karaoke verses without large gaps
    this.yPositions = [
      80,    // Row 1 (8% down)
      220,   // Row 2 (22% down)
      360,   // Row 3 (36% down)
      500,   // Row 4 (50% down) - center
      640,   // Row 5 (64% down)
      780,   // Row 6 (78% down)
      920    // Row 7 (92% down)
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
   * 
   * @param lineId - Unique ID for this line
   * @param startTime - When line starts playing
   * @param endTime - When line finishes
   * @param groupSize - Number of contiguous positions needed for grouped lines (default 1)
   */
  leasePosition(lineId: string, startTime: number, endTime: number, groupSize: number = 1): number
  {
    // Clean up expired leases first
    this.expireLeases(startTime)

    // If requesting multiple contiguous positions, try to find them together
    if (groupSize > 1)
    {
      const groupPositions = this.findContiguousPositions(groupSize, startTime)
      if (groupPositions.length === groupSize)
      {
        // Reserve the first position for this lineId, mark others as reserved
        const yPos = groupPositions[0]
        const lease: LeasedLine = {
          lineId,
          startTime,
          endTime,
          yPosition: yPos
        }
        this.activeLeases.set(lineId, lease)

        // Reserve remaining positions in group
        for (let i = 1; i < groupPositions.length; i++)
        {
          const reserveId = `${lineId}:reserved:${i}`
          this.activeLeases.set(reserveId, {
            lineId: reserveId,
            startTime,
            endTime,
            yPosition: groupPositions[i]
          })
        }

        // Move buffer and advance rotation
        const lastPos = groupPositions[groupPositions.length - 1]
        const lastIdx = this.yPositions.indexOf(lastPos)
        this.bufferLineIndex = lastIdx
        this.nextPositionIndex = (lastIdx + 1) % this.yPositions.length

        return yPos
      }
      // If can't find contiguous space, fall through to single position
    }

    // Find next available position in rotation
    let positionIndex = this.nextPositionIndex
    let attempts = 0
    const maxAttempts = this.yPositions.length

    // Find a position that's either:
    // - Not currently leased, OR
    // - Has an expired lease
    while (attempts < maxAttempts)
    {
      const yPos = this.yPositions[positionIndex]

      // Skip if this is the buffer position
      if (positionIndex === this.bufferLineIndex)
      {
        positionIndex = (positionIndex + 1) % this.yPositions.length
        attempts++
        continue
      }

      // Check if this position is available
      let isAvailable = true
      for (const lease of this.activeLeases.values())
      {
        if (lease.yPosition === yPos && lease.endTime > startTime)
        {
          isAvailable = false
          break
        }
      }

      if (isAvailable)
      {
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
   * Request multiple Y position leases for a group of related lines
   * Returns all positions for the group in a single array
   * Ensures they are contiguous when possible
   */
  leasePositionGroup(groupId: string, startTime: number, endTime: number, count: number): number[]
  {
    // Clean up expired leases first
    this.expireLeases(startTime)

    // Try to find contiguous positions for the entire group
    const groupPositions = this.findContiguousPositions(count, startTime)
    
    if (groupPositions.length === count)
    {
      // Successfully found contiguous space - reserve all positions
      for (let i = 0; i < groupPositions.length; i++)
      {
        const yPos = groupPositions[i]
        const lease: LeasedLine = {
          lineId: `${groupId}:${i}`,
          startTime,
          endTime,
          yPosition: yPos
        }
        this.activeLeases.set(lease.lineId, lease)
      }

      // Move buffer and advance rotation
      const lastPos = groupPositions[groupPositions.length - 1]
      const lastIdx = this.yPositions.indexOf(lastPos)
      this.bufferLineIndex = lastIdx
      this.nextPositionIndex = (lastIdx + 1) % this.yPositions.length

      return groupPositions
    }

    // Fallback: can't find contiguous, assign individually
    const result: number[] = []
    for (let i = 0; i < count; i++)
    {
      result.push(this.leasePosition(`${groupId}:${i}`, startTime, endTime))
    }
    return result
  }

  /**
   * Check if a line's lease is still active at given time
   */
  isLeaseActive(lineId: string, atTime: number): boolean
  {
    const lease = this.activeLeases.get(lineId)
    if (!lease) return false
    return atTime >= lease.startTime && atTime <= lease.endTime
  }

  /**
   * Check if leasing N lines sequentially would cause them to split across
   * the rotation boundary (first line gets near-bottom position, subsequent lines wrap to top)
   */
  wouldSplitAcrossBoundary(groupId: string, startTime: number, endTime: number, count: number): boolean
  {
    if (count <= 1) return false  // Single lines can't split

    // Simulate what positions would be assigned
    const simulatedPositions: number[] = []
    let nextIdx = this.nextPositionIndex
    let attempts = 0
    const maxAttempts = this.yPositions.length

    // Simulate finding positions for each line
    for (let lineNum = 0; lineNum < count; lineNum++)
    {
      let positionIndex = nextIdx
      attempts = 0

      // Find next available position in rotation (same logic as leasePosition)
      while (attempts < maxAttempts)
      {
        if (positionIndex === this.bufferLineIndex)
        {
          positionIndex = (positionIndex + 1) % this.yPositions.length
          attempts++
          continue
        }

        let isAvailable = true
        for (const lease of this.activeLeases.values())
        {
          if (lease.yPosition === this.yPositions[positionIndex] && lease.endTime > startTime)
          {
            isAvailable = false
            break
          }
        }

        if (isAvailable)
        {
          simulatedPositions.push(this.yPositions[positionIndex])
          nextIdx = (positionIndex + 1) % this.yPositions.length
          break
        }

        positionIndex = (positionIndex + 1) % this.yPositions.length
        attempts++
      }
    }

    // Check if positions wrap: if first position index > last position index after wrapping
    if (simulatedPositions.length === count)
    {
      const firstIdx = this.yPositions.indexOf(simulatedPositions[0])
      const lastIdx = this.yPositions.indexOf(simulatedPositions[count - 1])

      // Split happens when we wrap around the pool
      // E.g., [5, 6, 0, 1] - first is near-bottom, last is near-top = split
      return lastIdx < firstIdx
    }

    return false  // Can't determine, assume no split
  }

  /**
   * Remove expired leases (timing has passed)
   */
  private expireLeases(currentTime: number): void
  {
    const toDelete: string[] = []
    for (const [lineId, lease] of this.activeLeases.entries())
    {
      if (lease.endTime < currentTime)
      {
        toDelete.push(lineId)
      }
    }
    toDelete.forEach(lineId => this.activeLeases.delete(lineId))
  }

  /**
   * Find contiguous available Y positions
   * Used to keep related multi-line content together
   */
  private findContiguousPositions(count: number, startTime: number): number[]
  {
    const result: number[] = []

    // Try to find 'count' contiguous positions starting from current rotation point
    for (let startIdx = 0; startIdx < this.yPositions.length; startIdx++)
    {
      result.length = 0

      for (let i = 0; i < count; i++)
      {
        const idx = (startIdx + i) % this.yPositions.length
        const yPos = this.yPositions[idx]

        // Skip buffer position
        if (idx === this.bufferLineIndex)
        {
          break
        }

        // Check if available
        let isAvailable = true
        for (const lease of this.activeLeases.values())
        {
          if (lease.yPosition === yPos && lease.endTime > startTime)
          {
            isAvailable = false
            break
          }
        }

        if (!isAvailable)
        {
          break
        }

        result.push(yPos)
      }

      // If we found enough contiguous, do final validation and return them
      if (result.length === count)
      {
        // Final check: verify all positions are STILL available (in case of concurrent leases)
        let allStillAvailable = true
        for (const yPos of result)
        {
          for (const lease of this.activeLeases.values())
          {
            if (lease.yPosition === yPos && lease.endTime > startTime)
            {
              allStillAvailable = false
              break
            }
          }
          if (!allStillAvailable) break
        }

        if (allStillAvailable)
        {
          return result
        }
        // Otherwise, continue searching from next position
      }
    }

    return []
  }

  /**
   * Get all currently active leases at a given time
   */
  getActiveLeases(atTime: number): LeasedLine[]
  {
    return Array.from(this.activeLeases.values())
      .filter(lease => atTime >= lease.startTime && atTime <= lease.endTime)
  }

  /**
   * Get the buffer position (empty separator line)
   */
  getBufferPosition(): number
  {
    return this.yPositions[this.bufferLineIndex]
  }

  /**
   * Reset all leases (for testing or new song)
   */
  reset(): void
  {
    this.activeLeases.clear()
    this.nextPositionIndex = 0
    this.bufferLineIndex = 0
  }
}

// VIM: set filetype=typescript :
// END
