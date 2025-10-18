/**
 * Text Layout Engine - Calculate text positioning and layout
 *
 * Handles:
 * - Text positioning on screen
 * - Line breaking and wrapping
 * - Multi-position vertical placement
 * - Character-to-position mapping
 */

import type { Position } from './PresentationCommand'
import { TextAlign } from './PresentationCommand'

/**
 * Configuration for text layout
 */
export interface LayoutConfig {
  screenWidth: number    // Abstract screen width (e.g., 1000 units)
  screenHeight: number   // Abstract screen height (e.g., 1000 units)
  maxCharsPerLine: number // Maximum characters before wrapping
  fontSize: number       // Relative font size
}

/**
 * Vertical position preset
 */
export interface VerticalPreset {
  name: string
  y: number          // Y position (0-1000)
  weight: number     // Probability weight for random selection
}

/**
 * Result of text layout calculation
 */
export interface LayoutResult {
  position: Position
  lines: string[]          // Text split into lines if wrapped
  charPositions: Position[] // Position of each character
  width: number            // Total width of text
  height: number           // Total height of text
}

/**
 * Text Layout Engine
 */
export class TextLayoutEngine {
  private config: LayoutConfig
  private verticalPresets: VerticalPreset[]
  private lastUsedPresetIndex: number = -1

  constructor(config: LayoutConfig) {
    this.config = config

    // Define vertical position presets
    // Default position used primarily, others for variety
    this.verticalPresets = [
      {
        name: 'default', y: 400, weight: 0.7
      },      // 40% down (primary)
      {
        name: 'high', y: 250, weight: 0.1
      },         // 25% down
      {
        name: 'low', y: 550, weight: 0.1
      },          // 55% down
      {
        name: 'upper-mid', y: 325, weight: 0.05
      },   // 32.5% down
      {
        name: 'lower-mid', y: 475, weight: 0.05
      }    // 47.5% down
    ]
  }

  /**
   * Calculate layout for a line of text
   *
   * @param text - The text to layout
   * @param align - Horizontal alignment
   * @param forcePosition - Optional forced Y position (overrides random selection)
   * @returns Layout result with position and character positions
   */
  layoutText(
    text: string,
    align: TextAlign = TextAlign.Center,
    forcePosition?: number
  ): LayoutResult {
    const lines = this.breakIntoLines(text)
    const position = this.calculatePosition(lines, align, forcePosition)
    const charPositions = this.calculateCharacterPositions(lines, position, align)

    // Calculate dimensions
    const maxLineLength = Math.max(...lines.map(l => l.length))
    const charWidth = this.config.fontSize * 0.6 // Approximation
    const lineHeight = this.config.fontSize * 1.2

    return {
      position,
      lines,
      charPositions,
      width: maxLineLength * charWidth,
      height: lines.length * lineHeight
    }
  }

  /**
   * Get a vertical position for next line
   * Uses default primarily, occasionally uses other positions
   *
   * @param avoidY - Optional Y position to avoid (for transitions)
   * @returns Y position
   */
  getNextVerticalPosition(avoidY?: number): number {
    // If we have a position to avoid (during transitions),
    // ensure we pick a different one
    if (avoidY !== undefined) {
      const availablePresets = this.verticalPresets.filter(
        p => Math.abs(p.y - avoidY) > 100 // At least 100 units apart
      )

      if (availablePresets.length > 0) {
        return this.selectRandomPreset(availablePresets).y
      }
    }

    return this.selectRandomPreset(this.verticalPresets).y
  }

  /**
   * Get the default vertical position
   */
  getDefaultVerticalPosition(): number {
    return this.verticalPresets[0].y
  }

  /**
   * Break text into lines based on max characters
   * Breaks at word boundaries when possible
   */
  private breakIntoLines(text: string): string[] {
    if (text.length <= this.config.maxCharsPerLine) {
      return [text]
    }

    const lines: string[] = []
    const words = text.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word

      if (testLine.length <= this.config.maxCharsPerLine) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word

        // If single word is longer than max, we have to break it
        if (word.length > this.config.maxCharsPerLine) {
          // This is a rare case, but handle it
          lines.push(word.substring(0, this.config.maxCharsPerLine))
          currentLine = word.substring(this.config.maxCharsPerLine)
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [text]
  }

  /**
   * Calculate base position for text
   */
  private calculatePosition(
    lines: string[],
    align: TextAlign,
    forceY?: number
  ): Position {
    const y = forceY !== undefined ? forceY : this.getNextVerticalPosition()

    // X position depends on alignment
    // For center, we return the center point and adjust per line
    let x: number

    switch (align) {
      case TextAlign.Left:
        x = 50 // 5% from left edge
        break
      case TextAlign.Right:
        x = 950 // 5% from right edge
        break
      case TextAlign.Center:
      default:
        x = 500 // Center
        break
    }

    return {
      x, y
    }
  }

  /**
   * Calculate position of each character in the text
   * Used for precise syllable highlighting
   */
  private calculateCharacterPositions(
    lines: string[],
    basePosition: Position,
    align: TextAlign
  ): Position[] {
    const positions: Position[] = []
    const charWidth = this.config.fontSize * 0.6
    const lineHeight = this.config.fontSize * 1.2

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const lineWidth = line.length * charWidth

      // Calculate starting X for this line based on alignment
      let startX: number
      switch (align) {
        case TextAlign.Left:
          startX = basePosition.x
          break
        case TextAlign.Right:
          startX = basePosition.x - lineWidth
          break
        case TextAlign.Center:
        default:
          startX = basePosition.x - (lineWidth / 2)
          break
      }

      const y = basePosition.y + (lineIdx * lineHeight)

      // Add position for each character
      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        positions.push({
          x: startX + (charIdx * charWidth),
          y
        })
      }
    }

    return positions
  }

  /**
   * Select a random preset based on weights
   */
  private selectRandomPreset(presets: VerticalPreset[]): VerticalPreset {
    const totalWeight = presets.reduce((sum, p) => sum + p.weight, 0)
    let random = Math.random() * totalWeight

    for (const preset of presets) {
      random -= preset.weight
      if (random <= 0) {
        return preset
      }
    }

    // Fallback to first preset (default)
    return presets[0]
  }

  /**
   * Map character index in original text to line and position
   * Used for syllable highlighting across wrapped lines
   */
  mapCharIndexToLine(charIndex: number, lines: string[]): { line: number; char: number } {
    let currentIndex = 0

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const lineEndIndex = currentIndex + line.length

      if (charIndex < lineEndIndex) {
        return {
          line: lineIdx,
          char: charIndex - currentIndex
        }
      }

      // Account for space between words that was removed in splitting
      currentIndex = lineEndIndex + 1 // +1 for the space
    }

    // If we get here, char index is beyond text length
    return {
      line: lines.length - 1, char: lines[lines.length - 1].length
    }
  }
}

/**
 * Default layout configuration for standard karaoke display
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  screenWidth: 1000,
  screenHeight: 1000,
  maxCharsPerLine: 40,
  fontSize: 40
}
