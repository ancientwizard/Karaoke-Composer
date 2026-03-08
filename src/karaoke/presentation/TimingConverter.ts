/**
 * TimingConverter - Convert KaraokeProject timing data to PresentationCommands
 *
 * Handles the conversion from syllable/word timing to display commands,
 * including text layout, color changes, and transitions between lines.
 *
 * IMPORTANT: Uses TextRenderComposer to get proper PlaceableLines with
 * leasedYPositions, ensuring consistency with DeveloperView rendering.
 */

import type { KaraokeProject, LyricLine } from '../../types/karaoke'
import type { Song } from '@/lyrics/types'
import {
  PresentationCommands,
  LogicalColor,
  TextAlign,
  type AnyPresentationCommand,
  type Position
} from './Command'
import {
  TextLayoutEngine,
  DEFAULT_LAYOUT_CONFIG,
  type LayoutConfig
} from './TextLayoutEngine'
import { TextRenderComposer } from './TextRenderComposer'

/**
 * Configuration for timing conversion
 */
export interface TimingConverterConfig {
  layoutConfig?: LayoutConfig
  transitionDurationMs?: number  // How long to fade between lines
  previewDurationMs?: number     // How long to show line before first syllable
  eraseDelayMs?: number          // Extra delay before removing rendered lyric text
  displayAlign?: TextAlign       // Text alignment (default: center)
  showMetadata?: boolean         // Show title/artist at start
  metadataDurationMs?: number    // How long to show metadata
  showCaptions?: boolean         // Show caption labels (e.g., "Verse 1", "Chorus")
  captionDurationMs?: number     // How long to show caption before line
}

export const DEFAULT_TIMING_CONFIG: TimingConverterConfig = {
  transitionDurationMs: 500,     // 500ms smooth transition
  previewDurationMs: 1000,       // Show line 1 second before singing starts
  eraseDelayMs: 0,
  displayAlign: TextAlign.Center,
  showMetadata: true,
  metadataDurationMs: 3000,      // Show title/artist for 3 seconds
  showCaptions: true,
  captionDurationMs: 2000        // Show captions for 2 seconds
}

/**
 * Converts karaoke project timing data into presentation commands
 */
export class TimingConverter {
  private layoutEngine: TextLayoutEngine
  private textComposer: TextRenderComposer
  private config: Required<TimingConverterConfig>
  private debugLeases: boolean

  private readEnv(name: string): string | undefined {
    const processObj = (globalThis as any)?.process
    const value = processObj?.env?.[name]
    return typeof value === 'string' ? value : undefined
  }

  constructor(config: TimingConverterConfig = {}) {
    this.config = {
      layoutConfig: config.layoutConfig || DEFAULT_LAYOUT_CONFIG,
      transitionDurationMs: config.transitionDurationMs ?? DEFAULT_TIMING_CONFIG.transitionDurationMs!,
      previewDurationMs: config.previewDurationMs ?? DEFAULT_TIMING_CONFIG.previewDurationMs!,
      eraseDelayMs: config.eraseDelayMs ?? DEFAULT_TIMING_CONFIG.eraseDelayMs!,
      displayAlign: config.displayAlign || DEFAULT_TIMING_CONFIG.displayAlign!,
      showMetadata: config.showMetadata ?? DEFAULT_TIMING_CONFIG.showMetadata!,
      metadataDurationMs: config.metadataDurationMs ?? DEFAULT_TIMING_CONFIG.metadataDurationMs!,
      showCaptions: config.showCaptions ?? DEFAULT_TIMING_CONFIG.showCaptions!,
      captionDurationMs: config.captionDurationMs ?? DEFAULT_TIMING_CONFIG.captionDurationMs!
    }
    this.layoutEngine = new TextLayoutEngine(this.config.layoutConfig)
    this.textComposer = new TextRenderComposer()
    this.debugLeases = this.readEnv('KARAOKE_LEASE_DEBUG') === '1'
  }

  private logLeaseDiagnostics(placeableLines: any[]): void {
    if (!this.debugLeases) {
      return
    }

    const sorted = [...placeableLines].sort((a, b) =>
      a.startTime === b.startTime ? a.leasedYPosition - b.leasedYPosition : a.startTime - b.startTime
    )

    const overlaps: Array<{ first: any; second: any }> = []
    const offscreen: any[] = []

    for (let i = 0; i < sorted.length; i++) {
      const line = sorted[i]
      const yPixel = (line.leasedYPosition / 1000) * 216

      if (line.leasedYPosition < 0 || line.leasedYPosition > 1000 || yPixel < 0 || yPixel > 216) {
        offscreen.push(line)
      }

      for (let j = i + 1; j < sorted.length; j++) {
        const other = sorted[j]
        if (other.startTime > line.endTime) {
          break
        }
        const timeOverlap = line.startTime < other.endTime && other.startTime < line.endTime
        const sameY = line.leasedYPosition === other.leasedYPosition
        if (timeOverlap && sameY) {
          overlaps.push({ first: line, second: other })
        }
      }
    }

    console.log('[TimingConverter] lease diagnostics start')
    console.log(`[TimingConverter] placeable lines: ${sorted.length}`)
    sorted.forEach((line) => {
      const yPixel = (line.leasedYPosition / 1000) * 216
      console.log(
        `[TimingConverter] ${line.id} source=${line.sourceId} type=${line.type} ` +
        `t=${line.startTime}-${line.endTime} y=${line.leasedYPosition} (~${yPixel.toFixed(1)}px) text="${line.text}"`
      )
    })
    console.log(`[TimingConverter] overlapping same-y intervals: ${overlaps.length}`)
    overlaps.forEach((pair) => {
      console.log(
        `[TimingConverter][OVERLAP] y=${pair.first.leasedYPosition} ` +
        `${pair.first.id}(${pair.first.startTime}-${pair.first.endTime}) ` +
        `vs ${pair.second.id}(${pair.second.startTime}-${pair.second.endTime})`
      )
    })
    console.log(`[TimingConverter] offscreen rows detected: ${offscreen.length}`)
    offscreen.forEach((line) => {
      const yPixel = (line.leasedYPosition / 1000) * 216
      console.log(`[TimingConverter][OFFSCREEN] ${line.id} y=${line.leasedYPosition} (~${yPixel.toFixed(1)}px)`)
    })
    console.log('[TimingConverter] lease diagnostics end')
  }

  /**
   * Convert entire KaraokeProject to presentation commands
   *
   * Uses TextRenderComposer to get proper PlaceableLines with leasedYPositions,
   * ensuring consistency with DeveloperView rendering.
   */
  convert(project: KaraokeProject): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    // 1. Clear screen at start
    commands.push(PresentationCommands.clearScreen(0, LogicalColor.Background))

    // 2. Convert KaraokeProject to Song format for TextRenderComposer
    const song = this.projectToSong(project)

    // 3. Use TextRenderComposer to get PlaceableLines with proper leasedYPositions
    const placeableLines = this.textComposer.composeSong(song, {
      includeTitle: false,
      includeArtist: false,
      includeCredit: true,
      leaseTailMs: Math.max(0, this.config.eraseDelayMs ?? 0)
    })

    this.logLeaseDiagnostics(placeableLines as any[])

    if (this.config.showMetadata && (song.title || song.artist))
    {
      let earliestLyricStart = Infinity
      for (const placeable of placeableLines)
      {
        if (placeable.type === 'lyrics')
        {
          earliestLyricStart = Math.min(earliestLyricStart, placeable.startTime)
        }
      }

      const safeLyricStart = Number.isFinite(earliestLyricStart) ? earliestLyricStart : this.config.metadataDurationMs
      const metadataDurationMs = Math.max(500, Math.min(this.config.metadataDurationMs, safeLyricStart - 200))
      commands.push(...this.createMetadataCommands(song.title || '', song.artist || '', metadataDurationMs))
    }

    // 4. Convert each PlaceableLine to presentation commands
    for (let i = 0; i < placeableLines.length; i++)
    {
      const placeable = placeableLines[i]
      // nextPlaceable intentionally not used here; reserved for future logic

      const lowerId = placeable.id.toLowerCase()
      const lowerSourceId = placeable.sourceId.toLowerCase()
      const isMetadataText = placeable.type === 'metadata'
        || lowerSourceId === 'title'
        || lowerSourceId === 'author'
        || lowerId.startsWith('title:')
        || lowerId.startsWith('author:')

      if (isMetadataText)
      {
        continue
      }
      const startTime = isMetadataText ? 0 : placeable.startTime
      const endTime = placeable.endTime

      // Get the Y position from the composed placeable line
      // Convert from abstract 0-1000 space to Position
      const position: Position = {
        x: 500,  // Center horizontally (will be re-centered in CDGCore)
        y: placeable.leasedYPosition
      }

      // Show text at start time
      commands.push(
        PresentationCommands.showText(
          startTime,
          placeable.id,
          placeable.text,
          position,
          LogicalColor.TransitionText,
          TextAlign.Center
        )
      )

      // Create syllable highlighting commands
      if (placeable.charToSyllableMap && placeable.words)
      {
        const offset = placeable.charOffsetInSource ?? 0
        const lineMap = this.sliceCharToSyllableMap(
          placeable.charToSyllableMap,
          offset,
          placeable.text.length
        )
        const highlightCommands = this.createSyllableHighlightsFromMap(
          placeable.id,
          lineMap
        )
        commands.push(...highlightCommands)
      }

      // Remove text at end time
      commands.push(
        PresentationCommands.removeText(endTime + this.config.eraseDelayMs, placeable.id)
      )
    }

    return this.sortCommands(commands)
  }

  private sliceCharToSyllableMap(
    map: Map<number, any>,
    offset: number,
    length: number
  ): Map<number, any>
  {
    const sliced = new Map<number, any>()
    const end = offset + length

    for (const [charIdx, info] of map)
    {
      if (charIdx >= offset && charIdx < end)
      {
        sliced.set(charIdx - offset, info)
      }
    }

    return sliced
  }

  private sortCommands(commands: AnyPresentationCommand[]): AnyPresentationCommand[]
  {
    const priority: Record<string, number> = {
      clear_screen: 0,
      remove_text: 1,
      show_metadata: 2,
      show_text: 3,
      change_color: 4,
      transition: 5
    }

    return [...commands].sort((a, b) =>
    {
      if (a.timestamp !== b.timestamp)
      {
        return a.timestamp - b.timestamp
      }

      const aPriority = priority[a.type] ?? 99
      const bPriority = priority[b.type] ?? 99

      if (aPriority !== bPriority)
      {
        return aPriority - bPriority
      }

      return 0
    })
  }

  /**
   * Convert KaraokeProject to Song format for TextRenderComposer
   */
  private projectToSong(project: KaraokeProject): Song
  {
    return {
      title: project.name,
      artist: project.artist,
      duration: project.audioFile.duration || 0,
      lines: project.lyrics
        .filter(line => line.type !== 'title' && line.type !== 'author' && line.startTime !== undefined)
        .map(line => ({
          text: line.text,
          startTime: line.startTime || 0,
          caption: line.metadata?.caption,
          words: (line.words || []).map(w => ({
            text: w.word,
            startTime: w.startTime || 0,
            syllables: (w.syllables || []).map(s => ({
              text: s.syllable,
              startTime: s.startTime || 0
            }))
          }))
        }))
    }
  }

  /**
   * Create syllable highlighting commands from character-to-syllable map
   */
  private createSyllableHighlightsFromMap(
    textId: string,
    charToSyllableMap: Map<number, any>
  ): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    const sorted = [...charToSyllableMap.entries()].sort((a, b) => a[0] - b[0])

    type SyllableRange = {
      startChar: number
      endChar: number
      startTime: number
      endTime: number
    }

    const ranges: SyllableRange[] = []
    for (const [charIdx, syllableInfo] of sorted)
    {
      if (syllableInfo.startTime === undefined)
      {
        continue
      }

      const startTime = Number(syllableInfo.startTime)
      const rawEnd = syllableInfo.endTime === undefined ? startTime : Number(syllableInfo.endTime)
      const endTime = Number.isFinite(rawEnd) ? Math.max(startTime, rawEnd) : startTime

      const previous = ranges[ranges.length - 1]
      if (
        previous
        && previous.endChar === charIdx
        && previous.startTime === startTime
        && previous.endTime === endTime
      )
      {
        previous.endChar = charIdx + 1
      }
      else
      {
        ranges.push({
          startChar: charIdx,
          endChar: charIdx + 1,
          startTime,
          endTime
        })
      }
    }

    for (const range of ranges)
    {
      const charCount = Math.max(1, range.endChar - range.startChar)
      const duration = Math.max(0, range.endTime - range.startTime)

      // Progressive wipe: reveal one additional character across syllable duration.
      // If duration is zero/very short, this naturally becomes near-instant.
      for (let step = 0; step < charCount; step++)
      {
        const timestamp = range.startTime + Math.floor((duration * step) / charCount)
        commands.push(
          PresentationCommands.changeColor(
            timestamp,
            textId,
            range.startChar,
            range.startChar + step + 1,
            LogicalColor.ActiveText
          )
        )
      }
    }

    return commands
  }

  /**
   * Create metadata display commands (title/artist at beginning)
   */
  private createMetadataCommands(
    title: string,
    artist: string,
    durationMs: number
  ): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    const fontSize = this.config.layoutConfig.fontSize
    const titleToAuthorGap = Math.max(120, Math.round(fontSize * 1.3))

    // Title on first line
    const titlePosition: Position = {
      x: 500,  // Centered
      y: 400   // Middle of screen
    }

    commands.push(
      PresentationCommands.showText(
        0,
        'metadata-title',
        title,
        titlePosition,
        LogicalColor.ActiveText,
        TextAlign.Center
      )
    )

    // Artist on second line (below title)
    const artistPosition: Position = {
      x: 500,
      y: 400 + titleToAuthorGap
    }

    commands.push(
      PresentationCommands.showText(
        0,
        'metadata-artist',
        `by ${artist}`,
        artistPosition,
        LogicalColor.ActiveText,
        TextAlign.Center
      )
    )

    // Remove both metadata texts after duration
    commands.push(
      PresentationCommands.removeText(durationMs, 'metadata-title')
    )
    commands.push(
      PresentationCommands.removeText(durationMs, 'metadata-artist')
    )

    return commands
  }

  /**
   * Create caption display commands (e.g., "Verse 1", "Chorus")
   * Displays caption above the lyrics line temporarily
   */
  private createCaptionCommands(
    caption: string,
    lineStartTime: number,
    durationMs: number
  ): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    // Show caption before the line starts
    const captionStartTime = Math.max(0, lineStartTime - durationMs)
    const captionEndTime = lineStartTime

    // Position caption higher on screen (above where lyrics appear)
    const captionPosition: Position = {
      x: 500,  // Centered
      y: 250   // Upper third of screen
    }

    // Show caption
    commands.push(
      PresentationCommands.showText(
        captionStartTime,
        `caption-${lineStartTime}`,
        `[${caption}]`,  // Wrap in brackets for visual distinction
        captionPosition,
        LogicalColor.TransitionText,  // Use transition color for captions
        TextAlign.Center
      )
    )

    // Remove caption when line starts
    commands.push(
      PresentationCommands.removeText(captionEndTime, `caption-${lineStartTime}`)
    )

    return commands
  }

  /**
   * Convert a single lyric line to presentation commands
   */
  private convertLine(
    line: LyricLine,
    lineIndex: number,
    previousPosition: Position | null,
    nextLine?: LyricLine
  ): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    // Skip lines without timing
    if (!line.startTime || !line.endTime)
      return commands

    // Add caption if this line has one and captions are enabled
    if (this.config.showCaptions && line.metadata?.caption)
    {
      const captionCommands = this.createCaptionCommands(
        line.metadata.caption,
        line.startTime,
        this.config.captionDurationMs
      )
      commands.push(...captionCommands)
    }

    // For CDG export, we don't wrap lines - render full text as single line
    // This prevents the 12-line stacking issue. Long text will overflow or be truncated by CDG.
    const fullText = this.getLineText(line)

    // Calculate fixed Y position based on line index
    // For CDG export, we don't need rotating positions like DeveloperView
    // Just use a fixed position per line
    const lineSpacing = 100 // Abstract units between lines
    const startingY = 300   // Start from middle of screen
    const fixedY = startingY + (lineIndex * lineSpacing)

    const layout = this.layoutEngine.layoutText(fullText, this.config.displayAlign, fixedY)

    // Show text before first syllable starts (preview)
    const previewTime = Math.max(0, line.startTime - this.config.previewDurationMs)

    // For CDG: render as single line, not wrapped portions
    const textId = `line-${lineIndex}`

    commands.push(
      PresentationCommands.showText(
        previewTime,
        textId,
        fullText,
        layout.position,
        LogicalColor.TransitionText,  // Start with dim color
        this.config.displayAlign
      )
    )

    // Create syllable highlighting commands for the full line
    const highlightCommands = this.createSyllableHighlights(
      line,
      lineIndex,
      [fullText]  // Single wrapped line = the full text
    )
    commands.push(...highlightCommands)

    // Remove the text after line ends
    if (nextLine)
    {
      // Transition to next line
      const transitionStart = line.endTime
      commands.push(
        PresentationCommands.removeText(
          transitionStart + this.config.transitionDurationMs,
          textId
        )
      )
    }
    else
    {
      // Last line - just remove after a delay
      commands.push(
        PresentationCommands.removeText(
          line.endTime + 2000,  // Keep last line visible for 2 seconds
          textId
        )
      )
    }

    return commands
  }

  /**
   * Create color change commands for syllable-level highlighting
   * Maps syllables to the correct wrapped line and character position
   */
  private createSyllableHighlights(
    line: LyricLine,
    lineIndex: number,
    wrappedLines: string[]
  ): AnyPresentationCommand[]
  {
    const commands: AnyPresentationCommand[] = []

    // Build a map of character index in full text to wrapped line
    const fullText = this.getLineText(line)
    const charToLineMap: { lineIdx: number; charIdx: number }[] = []

    let currentLineIdx = 0
    let charInLine = 0

    for (let i = 0; i < fullText.length; i++)
    {
      charToLineMap.push({
        lineIdx: currentLineIdx,
        charIdx: charInLine
      })

      charInLine++

      // Check if we're at the end of current wrapped line
      if (currentLineIdx < wrappedLines.length - 1 &&
        charInLine >= wrappedLines[currentLineIdx].length)
      {
        currentLineIdx++
        charInLine = 0

        // Skip the space character that was used to wrap
        // This space won't appear in the next line, so skip it in the fullText as well
        if (i + 1 < fullText.length && fullText[i + 1] === ' ')
        {
          i++  // Skip space in fullText iteration
          // Don't add mapping for the skipped space - it won't be displayed
        }
      }
    }

    let charOffset = 0

    for (const word of line.words)
    {
      for (const syllable of word.syllables)
      {
        if (syllable.startTime !== undefined)
        {
          const syllableLength = syllable.syllable.length

          // Ensure we don't go out of bounds
          if (charOffset >= charToLineMap.length)
          {
            console.warn(`[TimingConverter] charOffset ${charOffset} exceeds charToLineMap length ${charToLineMap.length}`)
            break
          }

          // Find which wrapped line(s) this syllable appears in
          const startMapping = charToLineMap[charOffset]
          const endIdx = Math.min(charOffset + syllableLength - 1, charToLineMap.length - 1)
          const endMapping = charToLineMap[endIdx]

          if (startMapping && endMapping)
          {
            // For CDG export: we only have a single line (wrappedLines.length === 1)
            // So textId should be `line-${lineIndex}` without wrapped line index
            const textId = wrappedLines.length === 1 ? 
              `line-${lineIndex}` : 
              `line-${lineIndex}-${startMapping.lineIdx}`

            // Syllable might span multiple wrapped lines (rare but possible)
            for (let lineIdx = startMapping.lineIdx; lineIdx <= endMapping.lineIdx; lineIdx++)
            {
              // Calculate start and end positions within this wrapped line
              const isFirstLine = lineIdx === startMapping.lineIdx
              const isLastLine = lineIdx === endMapping.lineIdx

              const startChar = isFirstLine ? startMapping.charIdx : 0
              const endChar = isLastLine ? endMapping.charIdx + 1 : wrappedLines[lineIdx].length

              commands.push(
                PresentationCommands.changeColor(
                  syllable.startTime,
                  textId,
                  startChar,
                  endChar,
                  LogicalColor.ActiveText
                )
              )

              // Add command to revert color at syllable end time
              if (syllable.endTime !== undefined)
              {
                commands.push(
                  PresentationCommands.changeColor(
                    syllable.endTime,
                    textId,
                    startChar,
                    endChar,
                    LogicalColor.TransitionText
                  )
                )
              }
            }
          }

          charOffset += syllableLength
        }
        else
          charOffset += syllable.syllable.length
      }

      // Account for space between words - but only if it's not already been skipped
      // If the next char in charToLineMap exists, add 1; otherwise we're at the end or space was skipped
      if (charOffset < charToLineMap.length)
        charOffset += 1
    }

    return commands
  }

  /**
   * Get the full text of a line (concatenating syllables)
   */
  private getLineText(line: LyricLine): string
  {
    return line.words
      .map(word => word.syllables.map(s => s.syllable).join(''))
      .join(' ')
  }

  /**
   * Calculate character index from word and syllable indices
   */
  private getCharacterIndex(
    line: LyricLine,
    wordIndex: number,
    syllableIndex: number
  ): number
  {
    let charIndex = 0

    for (let w = 0; w < wordIndex; w++)
    {
      for (const syllable of line.words[w].syllables)
        charIndex += syllable.syllable.length

      charIndex += 1 // Space between words
    }

    for (let s = 0; s < syllableIndex; s++)
      charIndex += line.words[wordIndex].syllables[s].syllable.length

    return charIndex
  }
}

// VIM: set filetype=typescript :
// END