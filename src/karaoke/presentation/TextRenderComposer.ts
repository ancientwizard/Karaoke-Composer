/**
 * Text Render Composer - Orchestrates text rendering for karaoke
 *
 * Converts Song data + metadata into PlaceableLines ready for rendering.
 * Handles:
 * - Intelligent timing calculation (lead-in, trail based on gaps)
 * - Syllable endTime calculation and persistence
 * - Character-to-syllable mapping for highlighting
 * - Text wrapping with proper Y-position leasing
 * - Metadata (title, artist) + credit generation
 *
 * This is the CORE composition engine used by both:
 * - DeveloperView (live preview/testing)
 * - CDG export (actual file generation)
 */

import type { Song } from '@/lyrics/types'
import { LineLeaseManager } from './LineLeaseManager'
import { TextLayoutEngine, DEFAULT_LAYOUT_CONFIG, type LayoutConfig } from './TextLayoutEngine'
import { TextAlign } from './Command'

/**
 * Options for composing a song into renderable lines
 */
export interface ComposerOptions
{
  includeTitle?: boolean     // Show song title at start (default: true)
  includeArtist?: boolean    // Show artist name (default: true)
  includeCredit?: boolean    // Show credit line at end (default: true)
  creditText?: string        // Custom credit text (default: "Karaoke arrangement by Ancient-Wizard")
  leaseTailMs?: number       // Extra hold time for reservations beyond hideTime (e.g. erase delay)
}

/**
 * Render Item - Text ready for rendering with computed timing
 */
export interface RenderItem
{
  id: string
  text: string
  type: 'metadata' | 'lyrics' | 'credit'
  showTime: number          // When to display on screen (ms)
  hideTime: number          // When to clear from screen (ms)
  words?: any[]             // Word/syllable data for highlighting (only for lyrics)
  alignment?: 'left' | 'center' | 'right'
  highlightable?: boolean   // Whether this item should have syllable mapping for highlighting (default: false)
}

/**
 * Placeable Line - A unit of text occupying one screen row
 */
export interface PlaceableLine
{
  id: string                    // Unique ID for this line
  sourceId: string              // Original item ID
  text: string                  // The text to render
  type: 'metadata' | 'lyrics' | 'credit'
  startTime: number
  endTime: number
  words: any[]                  // References to word objects for highlighting
  charOffsetInSource?: number   // For wrapped lines: where this text starts in original
  charToSyllableMap?: Map<number, any>  // Character index → syllable timing lookup
  leasedYPosition: number       // Y position assigned by LineLeaseManager
}

/**
 * Timing configuration for syllables
 */
export interface TimingConfig
{
  syllableDurationFirst: number  // First syllable in word (ms)
  syllableDurationMiddle: number // Middle syllables (ms)
  syllableDurationLast: number   // Last syllable in word (ms)
  gapBetweenSyllables: number    // Breathing between syllables (ms)
  gapBetweenWords: number        // Space between words (ms)
  gapBetweenLines: number        // Space between lyric lines (ms)
}

/**
 * Default timing configuration
 */
const DEFAULT_TIMING_CONFIG: TimingConfig = {
  syllableDurationFirst: 100,
  syllableDurationMiddle: 200,
  syllableDurationLast: 250,
  gapBetweenSyllables: 25,
  gapBetweenWords: 150,
  gapBetweenLines: 800
}

export class TextRenderComposer
{
  private leaseManager: LineLeaseManager
  private layoutEngine: TextLayoutEngine
  private timingConfig: TimingConfig
  private debugEnabled: boolean

  private readEnv(name: string): string | undefined
  {
    const processObj = (globalThis as any)?.process
    const value = processObj?.env?.[name]
    return typeof value === 'string' ? value : undefined
  }

  constructor(timingConfig: Partial<TimingConfig> = {}, layoutConfig: LayoutConfig = DEFAULT_LAYOUT_CONFIG)
  {
    this.leaseManager = new LineLeaseManager()
    this.layoutEngine = new TextLayoutEngine(layoutConfig)
    this.debugEnabled = this.readEnv('KARAOKE_LEASE_DEBUG') === '1'
    this.timingConfig = {
      ...DEFAULT_TIMING_CONFIG,
      ...timingConfig
    }
  }

  private debug(message: string): void
  {
    if (!this.debugEnabled)
    {
      return
    }

    console.log(`[TextRenderComposer] ${message}`)
  }

  private collapseLinesToMax(lines: string[], maxLines: number): string[]
  {
    if (lines.length <= maxLines)
    {
      return lines
    }

    if (maxLines <= 1)
    {
      return [lines.join(' ')]
    }

    const kept = lines.slice(0, maxLines - 1)
    const mergedTail = lines.slice(maxLines - 1).join(' ')
    kept.push(mergedTail)
    return kept
  }

  /**
   * Reset state for a new composition
   */
  reset(): void
  {
    this.leaseManager.reset()
  }

  /**
   * Main entry point: compose a song into placeable lines ready for rendering
   */
  composeSong(song: Song, options: ComposerOptions = {}): PlaceableLine[]
  {
    const {
      includeTitle = true,
      includeArtist = true,
      includeCredit = true,
      creditText = 'Created using: "Karaoke Composer", by Ancient-Wizard.',
      leaseTailMs = 0
    } = options

    // Reset state
    this.reset()

    // Convert song lines to lyric units with timing
    const lyricUnits = this.extractLyricUnits(song)

    // Calculate syllable endTimes and line timing
    this.calculateSyllableTiming(lyricUnits)

    // Find first and last highlight times for metadata timing
    let firstHighlightTime = Infinity
    let lastHighlightTime = 0

    lyricUnits.forEach((unit: any) =>
    {
      unit.words.forEach((word: any) =>
      {
        word.syllables.forEach((syl: any) =>
        {
          if (syl.startTime !== undefined)
          {
            firstHighlightTime = Math.min(firstHighlightTime, syl.startTime)
            lastHighlightTime = Math.max(lastHighlightTime, syl.endTime || syl.startTime)
          }
        })
      })
    })

    if (firstHighlightTime === Infinity) firstHighlightTime = 1000

    // Build all render items
    const items: RenderItem[] = []

    // Add metadata
    if (includeTitle || includeArtist)
    {
      const metadata = this.buildMetadataItems(song, firstHighlightTime, includeTitle, includeArtist)
      items.push(...metadata)
    }

    // Add lyrics with intelligent timing
    const lyricItems = this.buildLyricItems(lyricUnits)
    items.push(...lyricItems)

    // Add credit
    if (includeCredit)
    {
      const credit = this.buildCreditItem(creditText, lastHighlightTime)
      items.push(credit)
    }

    // Compose all items into placeable lines
    const placeable = this.composeRenderItems(items, leaseTailMs)

    this.debug(
      `compose complete placeableLines=${placeable.length} rows=${this.leaseManager.getRowCount()} ` +
      `reservable=${this.leaseManager.getReservableRowCount()} bufferY=${this.leaseManager.getBufferPosition()}`
    )

    return placeable
  }

  /**
   * Extract lyric units from song (convert to internal format)
   */
  private extractLyricUnits(song: Song): any[]
  {
    return song.lines.map((songLine, lineIdx) =>
    {
      return {
        id: `line-${lineIdx}`,
        text: songLine.words.map((w: any) => w.text).join(' '),
        words: songLine.words.map((songWord: any) =>
        {
          return {
            word: songWord.text,
            syllables: songWord.syllables.map((syl: any) =>
            {
              return {
                syllable: syl.text,
                startTime: syl.startTime
                // endTime will be calculated
              }
            }),
            startTime: songWord.startTime,
            endTime: songWord.startTime + 500 // Placeholder
          }
        }),
        startTime: songLine.startTime,
        endTime: songLine.startTime // Will be updated
      }
    })
  }

  /**
   * Calculate endTimes for syllables and lines
   */
  private calculateSyllableTiming(lyricUnits: any[]): void
  {
    lyricUnits.forEach((unit: any) =>
    {
      unit.words.forEach((word: any, wordIdx: number) =>
      {
        word.syllables.forEach((syllable: any, sylIdx: number) =>
        {
          // Determine endTime based on next timing point
          const nextSyllable = word.syllables[sylIdx + 1]
          const nextWord = unit.words[wordIdx + 1]

          if (nextSyllable)
          {
            syllable.endTime = nextSyllable.startTime
          }
          else if (nextWord && nextWord.startTime)
          {
            syllable.endTime = nextWord.startTime
          }
          else
          {
            // Estimate from config
            let duration: number
            if (sylIdx === 0 && word.syllables.length > 1)
            {
              duration = this.timingConfig.syllableDurationFirst
            }
            else if (sylIdx === word.syllables.length - 1)
            {
              duration = this.timingConfig.syllableDurationLast
            }
            else
            {
              duration = this.timingConfig.syllableDurationMiddle
            }
            syllable.endTime = (syllable.startTime || 0) + duration
          }
        })

        // Word timing is span of its syllables
        if (word.syllables.length > 0)
        {
          word.startTime = word.syllables[0].startTime || word.startTime
          word.endTime = word.syllables[word.syllables.length - 1].endTime || word.startTime
        }
      })

      // Unit timing is span of its words
      if (unit.words.length > 0)
      {
        unit.startTime = unit.words[0].startTime || 0
        unit.endTime = unit.words[unit.words.length - 1].endTime || 0
      }
    })
  }

  /**
   * Build metadata items (title, artist)
   */
  private buildMetadataItems(song: Song, firstLyricTime: number, includeTitle: boolean, includeArtist: boolean): RenderItem[]
  {
    const items: RenderItem[] = []
    const hideTime = Math.max(500, firstLyricTime - 500)

    if (includeTitle)
    {
      items.push({
        id: 'title',
        text: `Title: ${song.title}`,
        type: 'metadata',
        showTime: 0,
        hideTime,
        alignment: 'center',
        highlightable: false
      })
    }

    if (includeArtist)
    {
      items.push({
        id: 'author',
        text: `by: ${song.artist}`,
        type: 'metadata',
        showTime: 100,
        hideTime,
        alignment: 'center',
        highlightable: false
      })
    }

    return items
  }

  /**
   * Build lyric items with intelligent timing
   */
  private buildLyricItems(lyricUnits: any[]): RenderItem[]
  {
    // Extract timing info for each line
    const timings = lyricUnits.map((unit: any, idx: number) =>
    {
      let firstSylTime = Infinity
      let lastSylTime = 0

      unit.words.forEach((word: any) =>
      {
        word.syllables.forEach((syl: any) =>
        {
          if (syl.startTime !== undefined)
          {
            firstSylTime = Math.min(firstSylTime, syl.startTime)
            lastSylTime = Math.max(lastSylTime, syl.endTime || syl.startTime)
          }
        })
      })

      if (firstSylTime === Infinity) return null

      return {
        idx,
        unit,
        highlightStart: firstSylTime,
        highlightEnd: lastSylTime
      }
    }).filter(Boolean) as any[]

    // Build render items with intelligent timing
    return timings.map((timing: any, timelineIdx: number) =>
    {
      const {
        idx,
        unit,
        highlightStart,
        highlightEnd
      } = timing
      const nextTiming = timings[timelineIdx + 1]

      // Lead-in
      const idealLeadIn = 2000
      const showTime = Math.max(0, highlightStart - idealLeadIn)

      // Intelligent trail
      let hideTime: number
      if (nextTiming)
      {
        const nextShowTime = Math.max(0, nextTiming.highlightStart - idealLeadIn)
        const availableTrail = nextShowTime - highlightEnd

        if (availableTrail > 500)
        {
          hideTime = highlightEnd + Math.min(1500, availableTrail - 200)
        }
        else if (availableTrail > 0)
        {
          hideTime = highlightEnd + Math.max(300, availableTrail - 100)
        }
        else
        {
          hideTime = Math.max(highlightEnd + 300, nextShowTime - 100)
        }
      }
      else
      {
        hideTime = highlightEnd + 2000
      }

      return {
        id: `lyric-${idx}`,
        text: unit.text,
        type: 'lyrics' as const,
        showTime,
        hideTime,
        words: unit.words,
        alignment: 'center' as const,
        highlightable: true
      }
    })
  }

  /**
   * Build credit item
   */
  private buildCreditItem(creditText: string, lastHighlightTime: number): RenderItem
  {
    return {
      id: 'credit',
      text: creditText,
      type: 'credit',
      showTime: lastHighlightTime + 1500,
      hideTime: lastHighlightTime + 9500,
      alignment: 'center',
      highlightable: false
    }
  }

  /**
   * Compose render items into placeable lines (handles wrapping, positioning, syllable mapping)
   */
  private composeRenderItems(items: RenderItem[], leaseTailMs: number): PlaceableLine[]
  {
    const placeable: PlaceableLine[] = []

    const estimatedLineCounts = items.map((item) =>
    {
      const tempLayout = this.layoutEngine.layoutText(item.text, TextAlign.Center, 0)
      return tempLayout.lines ? tempLayout.lines.length : 1
    })

    for (let itemIdx = 0; itemIdx < items.length; itemIdx++)
    {
      const item = items[itemIdx]
      const fullText = item.text
      const reservableRows = Math.max(1, this.leaseManager.getReservableRowCount())

      // ── Credit fast-path ────────────────────────────────────────────────────────
      // Credits bypass the rotating lease pool entirely:
      //   1. Wait until every active lease has expired (screen fully clear).
      //   2. Place text at fixed pool rows starting at index 1 (row 0 stays empty
      //      above the text as a visual breathing gap).
      //   3. Never touch nextPositionIndex / bufferLineIndex — nothing follows.
      if (item.type === 'credit')
      {
        const clearTime = this.leaseManager.getTimeAllClear(item.showTime)
        const creditShowTime = Math.max(item.showTime, clearTime)
        const creditHideTime = creditShowTime + (item.hideTime - item.showTime)

        const creditLayout = this.layoutEngine.layoutText(item.text, TextAlign.Center, 0)
        const rawLines = creditLayout.lines || [item.text]
        // Leave row 0 empty — at most (reservableRows - 1) lines can be placed from index 1
        const creditLines = this.collapseLinesToMax(rawLines, reservableRows - 1)

        creditLines.forEach((lineText: string, lineIdx: number) =>
        {
          const yPos = this.leaseManager.leaseAtFixedRow(
            `${item.id}:${lineIdx}`,
            creditShowTime,
            creditHideTime,
            1 + lineIdx   // pool index: 0 = blank buffer, 1+ = credit rows
          )

          placeable.push({
            id: `${item.id}:${lineIdx}`,
            sourceId: item.id,
            text: lineText,
            type: item.type,
            startTime: creditShowTime,
            endTime: creditHideTime,
            words: [],
            leasedYPosition: yPos
          })
        })

        this.debug(
          `item=${item.id} credit fast-path clearTime=${clearTime} ` +
          `creditShow=${creditShowTime} creditHide=${creditHideTime} ` +
          `lines=${creditLines.length}`
        )

        continue
      }
      // ── End credit fast-path ─────────────────────────────────────────────────────

      const lineCount = estimatedLineCounts[itemIdx]
      const leaseLineCount = Math.min(lineCount, reservableRows)

      const nextItem = itemIdx + 1 < items.length ? items[itemIdx + 1] : undefined
      const nextLineCount = nextItem ? estimatedLineCounts[itemIdx + 1] : 0
      const backToBackGapMs = nextItem ? Math.max(0, nextItem.showTime - item.hideTime) : Number.POSITIVE_INFINITY

      const shouldSkipExtraBuffer =
        item.type === 'lyrics'
        && nextItem?.type === 'lyrics'
        && leaseLineCount >= 3
        && Math.min(nextLineCount, reservableRows) >= 3
        && backToBackGapMs <= 1500

      const shouldReserveTrailingSlot =
        item.type === 'lyrics'
        && nextItem?.type === 'lyrics'
        && leaseLineCount <= 2
        && Math.min(nextLineCount, reservableRows) >= 3
        && backToBackGapMs <= 1500

      let effectiveShowTime = item.showTime
      let effectiveHideTime = item.hideTime

      let leaseEndTime = item.type === 'lyrics'
        ? effectiveHideTime + Math.max(0, leaseTailMs)
        : effectiveHideTime

      // Request Y positions from lease manager BEFORE doing final layout
      let leasedPositions: number[]

      if (leaseLineCount > 1 && item.type === 'lyrics')
      {
        leasedPositions = this.leaseManager.leasePositionGroup(item.id, effectiveShowTime, leaseEndTime, leaseLineCount, {
          reserveBufferLine: !shouldSkipExtraBuffer,
          reserveAfterGroupSlots: shouldReserveTrailingSlot ? 1 : 0
        })

        // Strict all-or-none behavior for multiline lyrics:
        // if a full block is not available yet, wait until rows clear and retry.
        let waitAttempts = 0
        const maxWaitAttempts = 20
        while (leasedPositions.length !== leaseLineCount && waitAttempts < maxWaitAttempts)
        {
          const nextRelease = this.leaseManager.getNextLeaseReleaseAfter(effectiveShowTime)
          if (nextRelease === undefined)
          {
            break
          }

          const delayedShow = Math.max(effectiveShowTime + 1, nextRelease)
          const shift = delayedShow - item.showTime
          effectiveShowTime = delayedShow
          effectiveHideTime = item.hideTime + shift
          leaseEndTime = effectiveHideTime + Math.max(0, leaseTailMs)

          leasedPositions = this.leaseManager.leasePositionGroup(item.id, effectiveShowTime, leaseEndTime, leaseLineCount, {
            reserveBufferLine: !shouldSkipExtraBuffer,
            reserveAfterGroupSlots: shouldReserveTrailingSlot ? 1 : 0
          })

          waitAttempts++
        }

        // Emergency fallback: if still unresolved, at least avoid empty placement.
        if (leasedPositions.length !== leaseLineCount)
        {
          leasedPositions = [this.leaseManager.leasePosition(item.id, effectiveShowTime, leaseEndTime)]
        }

        leasedPositions.sort((a, b) => a - b)
      }
      else if (leaseLineCount > 1)
      {
        // Metadata multiline: just lease one per line
        leasedPositions = this.leaseMultiplePositions(item, leaseLineCount)
      }
      else
      {
        // Single line
        leasedPositions = [this.leaseManager.leasePosition(item.id, item.showTime, leaseEndTime)]
      }

      // Now do final layout with first Y position from lease
      const firstYPos = leasedPositions[0]
      const finalLayout = this.layoutEngine.layoutText(fullText, TextAlign.Center, firstYPos)
      const rawFinalLines = finalLayout.lines || [fullText]
      const lines = this.collapseLinesToMax(rawFinalLines, reservableRows)
      const finalLineCount = lines.length

      this.debug(
        `item=${item.id} type=${item.type} show=${item.showTime} hide=${item.hideTime} ` +
        `effectiveShow=${effectiveShowTime} effectiveHide=${effectiveHideTime} ` +
        `leaseEnd=${leaseEndTime} leaseTailMs=${leaseTailMs} ` +
        `lineCount=${lineCount} leaseLineCount=${leaseLineCount} finalLineCount=${finalLineCount} ` +
        `reservableRows=${reservableRows} skipExtraBuffer=${shouldSkipExtraBuffer} ` +
        `reserveTrailingSlot=${shouldReserveTrailingSlot} ` +
        `nextType=${nextItem?.type || 'none'} nextLineCount=${nextLineCount} gapMs=${backToBackGapMs} ` +
        `leased=[${leasedPositions.join(', ')}] text="${item.text}"`
      )

      // If line count changed, adjust our leased positions
      if (finalLineCount > leasedPositions.length)
      {
        // Need more positions
        for (let i = leasedPositions.length; i < finalLineCount; i++)
        {
          leasedPositions.push(
            this.leaseManager.leasePosition(`${item.id}:extra-${i}`, item.showTime, leaseEndTime)
          )
        }
      }

      if (leasedPositions.length > finalLineCount)
      {
        leasedPositions = leasedPositions.slice(0, finalLineCount)
      }

      // Build syllable map
      const charToSyllableMap = this.buildCharToSyllableMap(item)

      // Create placeable lines
      let charOffsetInSource = 0
      let accumulatedText = ''

      lines.forEach((lineText: string, lineIdx: number) =>
      {
        const leasedYPosition = leasedPositions[Math.min(lineIdx, leasedPositions.length - 1)]

        // Calculate character offset for wrapped lines
        if (lineIdx > 0 && item.type === 'lyrics')
        {
          const searchStart = accumulatedText.length
          const matchIdx = fullText.indexOf(lineText.trim(), searchStart)

          if (matchIdx !== -1)
          {
            charOffsetInSource = matchIdx
          }
          else
          {
            charOffsetInSource = accumulatedText.length
          }
        }

        accumulatedText += lineText

        placeable.push({
          id: `${item.id}:${lineIdx}`,
          sourceId: item.id,
          text: lineText,
          type: item.type,
          startTime: effectiveShowTime,
          endTime: effectiveHideTime,
          words: item.words || [],
          charOffsetInSource: item.highlightable ? charOffsetInSource : undefined,
          charToSyllableMap: item.highlightable ? charToSyllableMap : undefined,
          leasedYPosition
        })
      })
    }

    return placeable
  }

  /**
   * Lease multiple positions for a multiline item
   */
  private leaseMultiplePositions(item: RenderItem, lineCount: number): number[]
  {
    const positions: number[] = []
    positions.push(this.leaseManager.leasePosition(item.id, item.showTime, item.hideTime))

    for (let i = 1; i < lineCount; i++)
    {
      positions.push(
        this.leaseManager.leasePosition(`${item.id}:${i}`, item.showTime, item.hideTime)
      )
    }

    return positions
  }

  /**
   * Build character-to-syllable map for a render item
   */
  private buildCharToSyllableMap(item: RenderItem): Map<number, any>
  {
    const map = new Map<number, any>()

    if (item.type !== 'lyrics')
    {
      return map
    }

    let charCountInSource = 0

    for (const word of (item.words || []))
    {
      for (const syl of (word.syllables || []))
      {
        for (let i = 0; i < syl.syllable.length; i++)
        {
          map.set(charCountInSource + i, {
            syllable: syl.syllable,
            startTime: syl.startTime,
            endTime: syl.endTime
          })
        }
        charCountInSource += syl.syllable.length
      }
      charCountInSource++ // Space between words
    }

    return map
  }
}

// VIM: set filetype=typescript :
// END
