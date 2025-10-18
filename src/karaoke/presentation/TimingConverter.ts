/**
 * TimingConverter - Convert KaraokeProject timing data to PresentationCommands
 *
 * Handles the conversion from syllable/word timing to display commands,
 * including text layout, color changes, and transitions between lines.
 */

import type { KaraokeProject, LyricLine } from '../../types/karaoke'
import {
  PresentationCommands,
  LogicalColor,
  TextAlign,
  type AnyPresentationCommand,
  type Position
} from './PresentationCommand'
import {
  TextLayoutEngine,
  DEFAULT_LAYOUT_CONFIG,
  type LayoutConfig,
  type LayoutResult
} from './TextLayoutEngine'

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
}

export const DEFAULT_TIMING_CONFIG: TimingConverterConfig = {
  transitionDurationMs: 500,     // 500ms smooth transition
  previewDurationMs: 1000,       // Show line 1 second before singing starts
  displayAlign: TextAlign.Center,
  showMetadata: true,
  metadataDurationMs: 3000       // Show title/artist for 3 seconds
}

/**
 * Converts karaoke project timing data into presentation commands
 */
export class TimingConverter {
  private layoutEngine: TextLayoutEngine
  private config: Required<TimingConverterConfig>

  constructor(config: TimingConverterConfig = {}) {
    this.config = {
      layoutConfig: config.layoutConfig || DEFAULT_LAYOUT_CONFIG,
      transitionDurationMs: config.transitionDurationMs ?? DEFAULT_TIMING_CONFIG.transitionDurationMs!,
      previewDurationMs: config.previewDurationMs ?? DEFAULT_TIMING_CONFIG.previewDurationMs!,
      displayAlign: config.displayAlign || DEFAULT_TIMING_CONFIG.displayAlign!,
      showMetadata: config.showMetadata ?? DEFAULT_TIMING_CONFIG.showMetadata!,
      metadataDurationMs: config.metadataDurationMs ?? DEFAULT_TIMING_CONFIG.metadataDurationMs!
    }
    this.layoutEngine = new TextLayoutEngine(this.config.layoutConfig)
  }

  /**
   * Convert entire KaraokeProject to presentation commands
   */
  convert(project: KaraokeProject): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []

    // 1. Clear screen at start
    commands.push(PresentationCommands.clearScreen(0, LogicalColor.Background))

    // 2. Show metadata if enabled
    if (this.config.showMetadata && project.name && project.artist) {
      const metadataCommands = this.createMetadataCommands(
        project.name,
        project.artist,
        this.config.metadataDurationMs
      )
      commands.push(...metadataCommands)
    }

    // 3. Convert each lyric line
    const lyricsWithTiming = project.lyrics.filter(line =>
      line.type !== 'title' &&
      line.type !== 'author' &&
      line.startTime !== undefined
    )

    let previousPosition: Position | null = null

    for (let i = 0; i < lyricsWithTiming.length; i++) {
      const line = lyricsWithTiming[i]
      const nextLine = lyricsWithTiming[i + 1]

      const lineCommands = this.convertLine(
        line,
        i,
        previousPosition,
        nextLine
      )
      commands.push(...lineCommands)

      // Track position for transition logic
      if (lineCommands.length > 0) {
        const showTextCmd = lineCommands.find(cmd => cmd.type === 'show_text')
        if (showTextCmd && 'position' in showTextCmd) {
          previousPosition = showTextCmd.position
        }
      }
    }

    // Sort commands by timestamp to ensure proper execution order
    return commands.sort((a, b) => a.timestamp - b.timestamp)
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

    const position: Position = {
      x: 500,  // Centered
      y: 400   // Middle of screen
    }

    // Show metadata
    commands.push(
      PresentationCommands.showMetadata(
        0,
        position,
        {
          title, artist
        },
        TextAlign.Center
      )
    )

    // Remove metadata after duration
    commands.push(
      PresentationCommands.removeText(durationMs, 'metadata-0')
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
    if (!line.startTime || !line.endTime) {
      return commands
    }

    const textId = `line-${lineIndex}`
    const fullText = this.getLineText(line)

    // Calculate layout position
    const nextY = previousPosition
      ? this.layoutEngine.getNextVerticalPosition(previousPosition.y)
      : this.layoutEngine.getDefaultVerticalPosition()

    const layout = this.layoutEngine.layoutText(fullText, this.config.displayAlign, nextY)

    // Show text before first syllable starts (preview)
    const previewTime = Math.max(0, line.startTime - this.config.previewDurationMs)

    commands.push(
      PresentationCommands.showText(
        previewTime,
        textId,  // Pass the textId for later color changes!
        fullText,
        layout.position,
        LogicalColor.TransitionText,  // Start with dim color
        this.config.displayAlign
      )
    )

    // Create syllable highlighting commands
    const highlightCommands = this.createSyllableHighlights(
      line,
      textId
    )
    commands.push(...highlightCommands)

    // Remove text after line ends
    if (nextLine) {
      // Transition to next line
      const transitionStart = line.endTime

      commands.push(
        PresentationCommands.removeText(
          transitionStart + this.config.transitionDurationMs,
          textId
        )
      )
    } else {
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
   */
  private createSyllableHighlights(
    line: LyricLine,
    textId: string
  ): AnyPresentationCommand[] {
    const commands: AnyPresentationCommand[] = []
    let charOffset = 0

    for (const word of line.words) {
      for (const syllable of word.syllables) {
        if (syllable.startTime !== undefined) {
          const syllableLength = syllable.syllable.length

          // Change color when syllable starts
          commands.push(
            PresentationCommands.changeColor(
              syllable.startTime,
              textId,
              charOffset,
              charOffset + syllableLength,
              LogicalColor.ActiveText
            )
          )

          charOffset += syllableLength
        } else {
          charOffset += syllable.syllable.length
        }
      }

      // Account for space between words
      charOffset += 1
    }

    return commands
  }

  /**
   * Get the full text of a line (concatenating syllables)
   */
  private getLineText(line: LyricLine): string {
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
  ): number {
    let charIndex = 0

    for (let w = 0; w < wordIndex; w++) {
      for (const syllable of line.words[w].syllables) {
        charIndex += syllable.syllable.length
      }
      charIndex += 1 // Space between words
    }

    for (let s = 0; s < syllableIndex; s++) {
      charIndex += line.words[wordIndex].syllables[s].syllable.length
    }

    return charIndex
  }
}
