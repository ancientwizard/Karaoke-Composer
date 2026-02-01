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
  displayAlign?: TextAlign       // Text alignment (default: center)
  showMetadata?: boolean         // Show title/artist at start
  metadataDurationMs?: number    // How long to show metadata
  showCaptions?: boolean         // Show caption labels (e.g., "Verse 1", "Chorus")
  captionDurationMs?: number     // How long to show caption before line
}

export const DEFAULT_TIMING_CONFIG: TimingConverterConfig = {
  transitionDurationMs: 500,     // 500ms smooth transition
  previewDurationMs: 1000,       // Show line 1 second before singing starts
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

  constructor(config: TimingConverterConfig = {}) {
    this.config = {
      layoutConfig: config.layoutConfig || DEFAULT_LAYOUT_CONFIG,
      transitionDurationMs: config.transitionDurationMs ?? DEFAULT_TIMING_CONFIG.transitionDurationMs!,
      previewDurationMs: config.previewDurationMs ?? DEFAULT_TIMING_CONFIG.previewDurationMs!,
      displayAlign: config.displayAlign || DEFAULT_TIMING_CONFIG.displayAlign!,
      showMetadata: config.showMetadata ?? DEFAULT_TIMING_CONFIG.showMetadata!,
      metadataDurationMs: config.metadataDurationMs ?? DEFAULT_TIMING_CONFIG.metadataDurationMs!,
      showCaptions: config.showCaptions ?? DEFAULT_TIMING_CONFIG.showCaptions!,
      captionDurationMs: config.captionDurationMs ?? DEFAULT_TIMING_CONFIG.captionDurationMs!
    }
    this.layoutEngine = new TextLayoutEngine(this.config.layoutConfig)
    this.textComposer = new TextRenderComposer()
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
      includeTitle: this.config.showMetadata,
      includeArtist: this.config.showMetadata,
      includeCredit: true
    })

    // 4. Convert each PlaceableLine to presentation commands
    for (let i = 0; i < placeableLines.length; i++)
    {
      const placeable = placeableLines[i]
      // nextPlaceable intentionally not used here; reserved for future logic

      // Get the Y position from the composed placeable line
      // Convert from abstract 0-1000 space to Position
      const position: Position = {
        x: 500,  // Center horizontally (will be re-centered in CDGCore)
        y: placeable.leasedYPosition
      }

      // Show text at start time
      commands.push(
        PresentationCommands.showText(
          placeable.startTime,
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
        PresentationCommands.removeText(placeable.endTime, placeable.id)
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
      show_metadata: 1,
      show_text: 2,
      change_color: 3,
      transition: 4,
      remove_text: 5
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

    for (const [charIdx, syllableInfo] of charToSyllableMap)
    {
      if (syllableInfo.startTime === undefined) continue

      // Change color at syllable start
      // Highlighting persists after syllable ends (like DeveloperView)
      commands.push(
        PresentationCommands.changeColor(
          syllableInfo.startTime,
          textId,
          charIdx,
          charIdx + 1,
          LogicalColor.ActiveText
        )
      )

      // NOTE: We do NOT revert color at syllable end
      // Highlighting persists for the rest of the line (see DeveloperView line 660-662)
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

    const lineHeight = this.config.layoutConfig.fontSize * 1.2

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
      y: 400 + lineHeight
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