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
  private debugEnabled: boolean

  private static readonly DEFAULT_Y_POSITIONS: number[] = [
    170,
    280,
    390,
    500,
    610,
    720,
    830
  ]

  private static readEnv(name: string): string | undefined
  {
    const processObj = (globalThis as any)?.process
    const value = processObj?.env?.[name]
    return typeof value === 'string' ? value : undefined
  }

  constructor()
  {
    this.debugEnabled = LineLeaseManager.readEnv('KARAOKE_LEASE_DEBUG') === '1'

    const requestedRowsRaw = LineLeaseManager.readEnv('KARAOKE_LEASE_ROWS')
    const parsedRows = requestedRowsRaw !== undefined && requestedRowsRaw.trim() !== ''
      ? Number(requestedRowsRaw)
      : NaN
    const rowCount = Number.isFinite(parsedRows)
      ? Math.max(2, Math.min(LineLeaseManager.DEFAULT_Y_POSITIONS.length, Math.floor(parsedRows)))
      : LineLeaseManager.DEFAULT_Y_POSITIONS.length

    this.yPositions = LineLeaseManager.DEFAULT_Y_POSITIONS.slice(0, rowCount)

    // Buffer line starts at top (will sweep down)
    this.bufferLineIndex = 0

    this.debug(
      `init rows=${this.yPositions.length} reservable=${this.getReservableRowCount()} ` +
      `bufferY=${this.getBufferPosition()} yPositions=[${this.yPositions.join(', ')}]`
    )
  }

  private debug(message: string): void
  {
    if (!this.debugEnabled)
    {
      return
    }

    console.log(`[LineLeaseManager] ${message}`)
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
    this.debug(`lease request lineId=${lineId} start=${startTime} end=${endTime} groupSize=${groupSize}`)

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

        this.debug(
          `lease group-granted lineId=${lineId} positions=[${groupPositions.join(', ')}] ` +
          `bufferIdx=${this.bufferLineIndex} nextIdx=${this.nextPositionIndex}`
        )

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

        this.debug(
          `lease granted lineId=${lineId} y=${yPos} posIdx=${positionIndex} ` +
          `bufferIdx=${this.bufferLineIndex} nextIdx=${this.nextPositionIndex}`
        )

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

    const conflicting = this.getActiveLeases(startTime)
      .filter(active => active.lineId !== lineId && active.yPosition === yPos)
      .map(active => `${active.lineId}[${active.startTime}-${active.endTime}]`)

    this.debug(
      `lease fallback-overbook lineId=${lineId} y=${yPos} conflicts=${conflicting.length} ` +
      `${conflicting.length > 0 ? `with=${conflicting.join(',')}` : ''}`
    )

    return yPos
  }

  /**
   * Request multiple Y position leases for a group of related lines
   * Returns all positions for the group in a single array
   * Ensures they are contiguous when possible
   */
  leasePositionGroup(
    groupId: string,
    startTime: number,
    endTime: number,
    count: number,
    options: { reserveBufferLine?: boolean; reserveAfterGroupSlots?: number } = {}
  ): number[]
  {
    const reserveBufferLine = options.reserveBufferLine ?? true
    const reserveAfterGroupSlots = Math.max(0, Math.floor(options.reserveAfterGroupSlots ?? 0))

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

      // Optionally reserve one or more trailing rows (best effort) so the next
      // arriving multi-line lyric group has a better chance to stay clustered.
      // These placeholders expire with the same lease window and do not render.
      if (reserveAfterGroupSlots > 0)
      {
        const reservedRows = new Set<number>(groupPositions)
        for (let i = 1; i <= reserveAfterGroupSlots; i++)
        {
          const idx = (this.yPositions.indexOf(groupPositions[groupPositions.length - 1]) + i) % this.yPositions.length
          if (idx === this.bufferLineIndex)
          {
            continue
          }

          const yPos = this.yPositions[idx]
          if (reservedRows.has(yPos))
          {
            continue
          }

          let available = true
          for (const lease of this.activeLeases.values())
          {
            if (lease.yPosition === yPos && lease.endTime > startTime)
            {
              available = false
              break
            }
          }

          if (!available)
          {
            continue
          }

          const reserveId = `${groupId}:reserve-tail:${i}`
          this.activeLeases.set(reserveId, {
            lineId: reserveId,
            startTime,
            endTime,
            yPosition: yPos
          })
          reservedRows.add(yPos)
        }
      }

      // Optionally reserve one empty line AFTER the group and continue round-robin.
      const lastPos = groupPositions[groupPositions.length - 1]
      const lastIdx = this.yPositions.indexOf(lastPos)
      if (reserveBufferLine)
      {
        this.bufferLineIndex = (lastIdx + 1) % this.yPositions.length
        this.nextPositionIndex = (this.bufferLineIndex + 1) % this.yPositions.length
      }
      else
      {
        this.nextPositionIndex = (lastIdx + 1) % this.yPositions.length
      }

      this.debug(
        `lease group-granted groupId=${groupId} positions=[${groupPositions.join(', ')}] ` +
        `reserveBuffer=${reserveBufferLine} reserveAfter=${reserveAfterGroupSlots} ` +
        `bufferIdx=${this.bufferLineIndex} nextIdx=${this.nextPositionIndex}`
      )

      return groupPositions
    }

    this.debug(
      `lease group-pending groupId=${groupId} requested=${count} ` +
      `reason=no-contiguous-block-available reserveBuffer=${reserveBufferLine} reserveAfter=${reserveAfterGroupSlots}`
    )

    return []
  }

  /**
   * Returns the next lease-release timestamp strictly after the provided time.
   * Useful for "wait-until-rows-clear" scheduling in all-or-none group leasing.
   */
  getNextLeaseReleaseAfter(time: number): number | undefined
  {
    let next: number | undefined

    for (const lease of this.activeLeases.values())
    {
      if (lease.endTime > time)
      {
        if (next === undefined || lease.endTime < next)
        {
          next = lease.endTime
        }
      }
    }

    return next
  }

  /**
   * Returns the earliest time at or after `afterTime` when all active leases
   * will have fully expired. If no leases are active, returns `afterTime` unchanged.
   *
   * Used by the credit renderer to wait for a fully clear screen before placing text.
   */
  getTimeAllClear(afterTime: number): number
  {
    let latest = afterTime

    for (const lease of this.activeLeases.values())
    {
      if (lease.endTime > afterTime)
      {
        latest = Math.max(latest, lease.endTime)
      }
    }

    return latest
  }

  /**
   * Lease a specific row by pool index, bypassing rotation entirely.
   * The caller is responsible for ensuring the row is available (e.g. after getTimeAllClear).
   * Does NOT advance nextPositionIndex or bufferLineIndex.
   *
   * @param lineId  - Unique ID for this lease
   * @param startTime - When the text appears
   * @param endTime   - When the text disappears
   * @param rowIndex  - Index into the yPositions pool (clamped to valid range)
   */
  leaseAtFixedRow(lineId: string, startTime: number, endTime: number, rowIndex: number): number
  {
    const clampedIndex = Math.max(0, Math.min(rowIndex, this.yPositions.length - 1))
    const yPos = this.yPositions[clampedIndex]

    this.activeLeases.set(lineId, { lineId, startTime, endTime, yPosition: yPos })

    this.debug(`lease fixed-row lineId=${lineId} rowIndex=${clampedIndex} y=${yPos}`)

    return yPos
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
    if (count <= 0)
    {
      return []
    }

    const result: number[] = []
    const len = this.yPositions.length

    // First pass: strict no-wrap blocks to avoid visual line-order inversion (e.g. [740,180]).
    for (let offset = 0; offset < len; offset++)
    {
      result.length = 0
      const startIdx = (this.nextPositionIndex + offset) % len
      const endIdx = startIdx + count - 1

      if (endIdx >= len)
      {
        continue
      }

      let valid = true
      for (let idx = startIdx; idx <= endIdx; idx++)
      {
        if (idx === this.bufferLineIndex)
        {
          valid = false
          break
        }

        const yPos = this.yPositions[idx]
        for (const lease of this.activeLeases.values())
        {
          if (lease.yPosition === yPos && lease.endTime > startTime)
          {
            valid = false
            break
          }
        }

        if (!valid)
        {
          break
        }

        result.push(yPos)
      }

      if (valid && result.length === count)
      {
        return [...result]
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

  getRowCount(): number
  {
    return this.yPositions.length
  }

  getReservableRowCount(): number
  {
    return Math.max(0, this.yPositions.length - 1)
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
