/**
 * Text Render Queue - Manages text rendering lifecycle and region cleanup
 *
 * Tracks:
 * - Which lines are currently visible and rendering
 * - Which Y screen regions are occupied
 * - When lines expire so regions can be reclaimed
 * - Smart clearing of expired line regions (NOT full screen clear)
 *
 * Lifecycle:
 * A) Show: Line appears on screen at scheduled time
 * B) Highlight: Character syllables highlight as they're sung
 * C) Clear: Line expires, its region is freed for next line
 */

import type { VRAM } from '@/cdg/encoder'

export interface QueuedLine
{
  lineId: string
  startTime: number      // When line first appears (ms)
  endTime: number        // When line expires and can be cleared (ms)
  yPixelStart: number    // Top Y pixel of line region
  yPixelEnd: number      // Bottom Y pixel of line region
}

export class TextRenderQueue
{
  private queue: Map<string, QueuedLine> = new Map()
  private previousFrameYPositions: Set<number> = new Set()
  private lineHeight: number = 14  // Pixels per line (12px glyph + 2px gap)

  constructor(lineHeight: number = 14)
  {
    this.lineHeight = lineHeight
  }

  /**
   * Add a line to the render queue
   */
  addLine(
    lineId: string,
    startTime: number,
    endTime: number,
    yPixelPos: number
  ): void
  {
    this.queue.set(lineId, {
      lineId,
      startTime,
      endTime,
      yPixelStart: yPixelPos,
      yPixelEnd: yPixelPos + this.lineHeight
    })
  }

  /**
   * Get all lines that should be visible at given time
   */
  getVisibleLines(atTime: number): QueuedLine[]
  {
    return Array.from(this.queue.values()).filter(
      line => atTime >= line.startTime && atTime <= line.endTime
    )
  }

  /**
   * Get lines that have expired and should be cleared
   */
  getExpiredLines(atTime: number): QueuedLine[]
  {
    return Array.from(this.queue.values()).filter(
      line => atTime > line.endTime
    )
  }

  /**
   * Determine Y pixel ranges that need clearing (expired line regions)
   * Clears regions occupied by lines whose leases have ended
   */
  getYRangesToClear(atTime: number): Array<{ start: number; end: number }>
  {
    const expiredLines = this.getExpiredLines(atTime)
    const toClearRanges: Array<{ start: number; end: number }> = []

    // For each expired line, mark its Y range for clearing
    for (const expiredLine of expiredLines)
    {
      toClearRanges.push({
        start: expiredLine.yPixelStart,
        end: expiredLine.yPixelEnd
      })
    }

    return toClearRanges
  }

  /**
   * Clear specific Y ranges in VRAM (not full screen clear)
   */
  clearRegions(vram: VRAM, ranges: Array<{ start: number; end: number }>): void
  {
    const screenWidth = 300  // CDG screen width
    const screenHeight = 216 // CDG screen height

    for (const range of ranges)
    {
      // Clamp to screen bounds
      const yStart = Math.max(0, range.start)
      const yEnd = Math.min(screenHeight, range.end)

      for (let y = yStart; y < yEnd; y++)
      {
        for (let x = 0; x < screenWidth; x++)
        {
          vram.setPixel(x, y, 0)  // Clear to color 0 (black)
        }
      }
    }
  }

  /**
   * Remove a line from the queue (cleanup)
   */
  removeLine(lineId: string): void
  {
    this.queue.delete(lineId)
  }

  /**
   * Clear all lines from queue
   */
  reset(): void
  {
    this.queue.clear()
    this.previousFrameYPositions.clear()
  }

  /**
   * Get line by ID
   */
  getLine(lineId: string): QueuedLine | undefined
  {
    return this.queue.get(lineId)
  }
}

// VIM: set filetype=typescript :
// END
