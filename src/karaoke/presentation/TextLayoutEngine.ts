/**
 * Text Layout Engine - Calculate text positioning and layout
 *
 * Handles:
 * - Character-to-pixel position mapping
 * - Horizontal alignment (left/center/right)
 * - Line breaking and wrapping with word boundaries
 * - Character spacing and variable-width glyph layout
 * - Converting abstract coordinates to pixel coordinates
 *
 * NOTE: Vertical (Y) positioning is the responsibility of LineLeaseManager,
 * which manages a rotating pool of screen rows and their availability based
 * on lyric timing. The TextLayoutEngine accepts a forced Y position and uses
 * it directly. Do NOT use TextLayoutEngine's vertical preset system—that is
 * deprecated. Always pass the Y position from LineLeaseManager.leasePosition()
 * as the forcePosition parameter.
 */

import type { Position  } from '@/karaoke/presentation/Command'
import      { TextAlign } from '@/karaoke/presentation/Command'
import      { CDGFont   } from '@/karaoke/renderers/cdg/CDGFont'

/**
 * Configuration for text layout
 */
export interface LayoutConfig {
  screenWidth: number     // Abstract screen width (e.g., 1000 units)
  screenHeight: number    // Abstract screen height (e.g., 1000 units)
  maxCharsPerLine: number // Maximum characters before wrapping
  fontSize: number        // Relative font size
}

/**
 * Result of text layout calculation
 */
export interface LayoutResult {
  position: Position
  lines: string[]           // Text split into lines if wrapped
  charPositions: Position[] // Position of each character
  width: number             // Total  width of text
  height: number            // Total height of text
}

/**
 * Text Layout Engine
 */
export class TextLayoutEngine
{
  private config: LayoutConfig
  private font: CDGFont
  private charGap = 2 // pixels between characters (adjust here to test different values)
  private readonly horizontalMargin = 24
  private legacyVerticalPositions: number[] = [500, 640, 360, 780, 220]
  private legacyVerticalIndex: number = 0

  constructor(config: LayoutConfig)
  {
    this.config = config
    this.font = new CDGFont()
  }

  getDefaultVerticalPosition(): number
  {
    return this.legacyVerticalPositions[0]
  }

  getNextVerticalPosition(): number
  {
    this.legacyVerticalIndex = (this.legacyVerticalIndex + 1) % this.legacyVerticalPositions.length
    return this.legacyVerticalPositions[this.legacyVerticalIndex]
  }

  /**
   * Calculate layout for a line of text/lyrics as karaoke lines
   *
   * @param text - The text to layout
   * @param align - Horizontal alignment
   * @param forcePosition - Optional forced Y position (overrides random selection)
   * @returns Layout result with position and character positions
   */
  layoutText( text: string, align: TextAlign = TextAlign.Center, forcePosition?: number ): LayoutResult
  {
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
   * Break text into lines based on max characters
   * Breaks at word boundaries when possible
   * Breaks long words to avoid overflow
   */
  private breakIntoLines(text: string): string[]
  {
    const initialLines = this.breakIntoLinesByCharacters(text)
    const maxPixelWidth = 300 - (this.horizontalMargin * 2)
    const finalLines: string[] = []

    for (const line of initialLines)
    {
      const wrappedByPixels = this.wrapLineByPixelWidth(line, maxPixelWidth)
      finalLines.push(...wrappedByPixels)
    }

    return finalLines.length > 0 ? finalLines : ['']
  }

  private breakIntoLinesByCharacters(text: string): string[]
  {
    if (text.length <= this.config.maxCharsPerLine)
    {
      return [text]
    }

    const lines: string[] = []
    let remaining = text

    while (remaining.length > 0)
    {
      if (remaining.length <= this.config.maxCharsPerLine)
      {
        lines.push(remaining)
        break
      }

      // Find best split point within maxCharsPerLine
      const chunk = remaining.substring(0, this.config.maxCharsPerLine)
      
      // Prefer splits at punctuation (. , ! ? ; : etc.)
      let splitPos = -1
      const punctuation = /[.!?;:,\-–—]/g
      let match
      
      while ((match = punctuation.exec(chunk)) !== null)
      {
        // Keep the punctuation with the line
        splitPos = match.index + 1
      }

      // If no punctuation, prefer word boundary (space)
      if (splitPos === -1)
      {
        const lastSpace = chunk.lastIndexOf(' ')
        if (lastSpace > 0 && lastSpace > chunk.length * 0.6)  // Ensure meaningful word
        {
          splitPos = lastSpace  // Split before the space
        }
      }

      // If still no good split, just break at maxCharsPerLine
      if (splitPos === -1)
      {
        splitPos = this.config.maxCharsPerLine * 0.75
      }

      lines.push(remaining.substring(0, splitPos).trim())
      remaining = remaining.substring(splitPos).trim()
    }

    return lines
  }

  private measureLineWidthPixels(text: string): number
  {
    if (!text)
    {
      return 0
    }

    let width = 0
    for (let i = 0; i < text.length; i++)
    {
      const glyph = this.font.getGlyph(text[i])
      width += glyph.width
      if (i < text.length - 1)
      {
        width += this.charGap
      }
    }

    // Safety factor to account for dynamic glyph rasterization/spacing differences
    // between layout estimation and final renderer metrics.
    width += Math.ceil(text.length * 0.8)

    return width
  }

  private splitLongWordByPixels(word: string, maxPixelWidth: number): string[]
  {
    const parts: string[] = []
    let current = ''

    for (const char of word)
    {
      const candidate = `${current}${char}`
      if (current.length > 0 && this.measureLineWidthPixels(candidate) > maxPixelWidth)
      {
        parts.push(current)
        current = char
      }
      else
      {
        current = candidate
      }
    }

    if (current.length > 0)
    {
      parts.push(current)
    }

    return parts
  }

  private wrapLineByPixelWidth(line: string, maxPixelWidth: number): string[]
  {
    if (!line || this.measureLineWidthPixels(line) <= maxPixelWidth)
    {
      return [line]
    }

    const result: string[] = []
    const words = line.split(/\s+/).filter(Boolean)
    let currentLine = ''

    for (const word of words)
    {
      if (this.measureLineWidthPixels(word) > maxPixelWidth)
      {
        if (currentLine.length > 0)
        {
          result.push(currentLine)
          currentLine = ''
        }

        result.push(...this.splitLongWordByPixels(word, maxPixelWidth))
        continue
      }

      const candidate = currentLine.length > 0 ? `${currentLine} ${word}` : word
      if (this.measureLineWidthPixels(candidate) <= maxPixelWidth)
      {
        currentLine = candidate
      }
      else
      {
        if (currentLine.length > 0)
        {
          result.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine.length > 0)
    {
      result.push(currentLine)
    }

    return result.length > 0 ? result : [line]
  }

  /**
   * Calculate base position for text
   */
  private calculatePosition( lines: string[], align: TextAlign, forceY?: number ): Position
  {
    const y = forceY ?? this.getDefaultVerticalPosition()

    // X position depends on alignment
    // For center, we return the center point and adjust per line
    let x: number

    switch (align)
    {
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
   * Returns positions in PIXEL coordinates (0-300 for X, 0-216 for Y)
   * Uses actual glyph widths for proper character spacing
   */
  private calculateCharacterPositions( lines: string[], basePosition: Position, align: TextAlign ): Position[]
  {
    const positions: Position[] = []
    
    // Convert abstract positions (0-1000) to pixel coordinates (0-300, 0-216)
    const pixelWidth = 300 // CDG screen width
    const pixelHeight = 216 // CDG screen height
    
    // const basePx = (basePosition.x / this.config.screenWidth) * pixelWidth
    const basePy = (basePosition.y / this.config.screenHeight) * pixelHeight

    const linePixelHeight = 12 // Line height

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++)
    {
      const line = lines[lineIdx]
      
      // Calculate line width based on actual glyph widths + inter-character spacing
      let linePixelWidth = 0

      for (let i = 0; i < line.length; i++)
      {
        const glyph = this.font.getGlyph(line[i])
        linePixelWidth += glyph.width
        // Add inter-character spacing (except after last character)
        if (i < line.length - 1)
          linePixelWidth += this.charGap
      }

      // Calculate starting X for this line based on alignment
      let startX: number
      switch (align)
      {
        case TextAlign.Left:
          startX = 10
          break
        case TextAlign.Right:
          startX = pixelWidth - linePixelWidth - 10
          break
        case TextAlign.Center:
        default:
          startX = (pixelWidth - linePixelWidth) / 2
          break
      }

      const y = basePy + (lineIdx * linePixelHeight)
      const clampedY = Math.max(10, Math.min(y, pixelHeight - 20))

      // Add position for each character using actual glyph widths
      let currentX = startX
      for (let charIdx = 0; charIdx < line.length; charIdx++)
      {
        positions.push({
          x: currentX,
          y: clampedY
        })
        
        // Move X by actual glyph width + inter-character spacing for next character
        const glyph = this.font.getGlyph(line[charIdx])
        currentX += glyph.width + this.charGap
      }
    }

    return positions
  }

  /**
   * Map character index in original text to line and position
   * Used for syllable highlighting across wrapped lines
   */
  mapCharIndexToLine(charIndex: number, lines: string[]): { line: number; char: number }
  {
    let currentIndex = 0

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++)
    {
      const line = lines[lineIdx]
      const lineEndIndex = currentIndex + line.length

      if (charIndex < lineEndIndex)
        return {
          line: lineIdx,
          char: charIndex - currentIndex
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
 *
 * NOTE: Font size is currently "conceptual" - glyphs render at fixed 12 pixels tall.
 * The fontSize parameter here affects character spacing and line height calculations
 * but NOT the actual rendered glyph size. To increase displayed text size:
 * - Reduce maxCharsPerLine (forces larger gaps, appears bigger)
 * - Increase fontSize (affects spacing only)
 * 
 * To implement true scalable fonts, CDGFont would need to support multiple
 * glyph sizes or implement pixel-based scaling in the renderer.
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  screenWidth: 1000,
  screenHeight: 1000,
  // I'll assume these were used with our fixed 5x7 Glyphs buffered for 6x12 rendering
  maxCharsPerLine: 28,  // Balance wrap quality with fewer multi-line fragments for lease stability
                        //  (so lame AI, size is user defined and the number
                        //    is a function of size. We'll need to fix this later
                        //    as we fine tune later now that we use actual fonts and size)
                        //  (however I see the consumer can override based on font size)
  fontSize: 50          // This specific value is too large but at the momnet I can't be
                        //  sure of its meaning. If it was point size it was far too big
                        //  for karaoke .cdg rendering.
}

// VIM: set filetype=typescript :
// END