/**
 * CDG Font System
 *
 * Renders text characters to CDG tiles (6x12 pixels per tile)
 * Uses a simple bitmap font suitable for karaoke display
 */

import { CDG_SCREEN } from './CDGPacket'

/**
 * Character glyph (6x12 pixel bitmap)
 * Each row is represented as a 6-bit value (1 = foreground, 0 = background)
 */
export interface CharacterGlyph {
  char: string
  width: number  // Actual character width (1-6 pixels)
  rows: number[] // 12 rows of pixel data (6 bits each)
}

/**
 * Simple bitmap font for CDG display
 * Optimized for readability on low-resolution screens
 */
export class CDGFont {
  private glyphs: Map<string, CharacterGlyph>
  private readonly tileWidth = CDG_SCREEN.TILE_WIDTH   // 6 pixels
  private readonly tileHeight = CDG_SCREEN.TILE_HEIGHT // 12 pixels

  constructor() {
    this.glyphs = new Map()
    this.initializeBasicFont()
  }

  /**
   * Initialize a basic ASCII font
   * For now, using a simple readable font suitable for karaoke
   */
  private initializeBasicFont(): void {
    // Space
    this.addGlyph(' ', 3, [
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Letters A-Z (uppercase) - Simple 5x7 font
    this.addGlyph('A', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b011111,
      0b010001,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Add more letters... For now, a fallback for all chars
    // TODO: Implement full character set
    this.addDefaultGlyphs()
  }

  /**
   * Add default glyphs for common characters
   * This is a simplified version - a real implementation would have all ASCII chars
   */
  private addDefaultGlyphs(): void {
    // For demonstration, create simple block glyphs for all printable ASCII
    const chars = 'BCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789' +
      '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'

    for (const char of chars) {
      if (!this.glyphs.has(char)) {
        // Create a simple filled rectangle as placeholder
        this.addGlyph(char, 5, [
          0b000000,
          0b011110,
          0b010010,
          0b010010,
          0b010010,
          0b010010,
          0b010010,
          0b011110,
          0b000000,
          0b000000,
          0b000000,
          0b000000
        ])
      }
    }
  }

  /**
   * Add a character glyph to the font
   */
  private addGlyph(char: string, width: number, rows: number[]): void {
    this.glyphs.set(char, {
      char,
      width,
      rows
    })
  }

  /**
   * Get glyph for a character (returns space if not found)
   */
  getGlyph(char: string): CharacterGlyph {
    return this.glyphs.get(char) || this.glyphs.get(' ')!
  }

  /**
   * Render a string to tile data
   * Returns array of tiles, each tile is 6x12 pixels
   */
  renderString(text: string): {
    tiles: number[][]  // Array of tiles, each tile is 12 rows of 6-bit data
    widthInTiles: number
  } {
    const tiles: number[][] = []
    let currentTile: number[] = new Array(12).fill(0)
    let currentX = 0

    for (const char of text) {
      const glyph = this.getGlyph(char)

      // Check if glyph fits in current tile
      if (currentX + glyph.width > this.tileWidth) {
        // Save current tile and start new one
        tiles.push(currentTile)
        currentTile = new Array(12).fill(0)
        currentX = 0
      }

      // Add glyph to current tile
      for (let row = 0; row < this.tileHeight; row++) {
        const glyphRow = glyph.rows[row] || 0
        // Shift glyph data to current position in tile
        currentTile[row] |= (glyphRow >> (6 - glyph.width)) << (this.tileWidth - currentX - glyph.width)
      }

      currentX += glyph.width
    }

    // Add last tile if it has content
    if (currentX > 0) {
      tiles.push(currentTile)
    }

    return {
      tiles,
      widthInTiles: tiles.length
    }
  }

  /**
   * Calculate width of text in pixels
   */
  measureText(text: string): number {
    let width = 0
    for (const char of text) {
      const glyph = this.getGlyph(char)
      width += glyph.width
    }
    return width
  }

  /**
   * Calculate width of text in tiles (rounded up)
   */
  measureTextInTiles(text: string): number {
    const pixels = this.measureText(text)
    return Math.ceil(pixels / this.tileWidth)
  }
}

/**
 * Text rendering utility for CDG
 */
export class CDGTextRenderer {
  private font: CDGFont

  constructor(font?: CDGFont) {
    this.font = font || new CDGFont()
  }

  /**
   * Render text centered at a specific row
   * Returns array of { row, col, tileData } objects
   */
  renderCentered(
    text: string,
    row: number
  ): Array<{ row: number; col: number; tileData: number[] }> {
    const { tiles } = this.font.renderString(text)
    const widthInTiles = tiles.length

    // Calculate starting column for centered text
    const startCol = Math.floor((CDG_SCREEN.COLS - widthInTiles) / 2)

    const result: Array<{ row: number; col: number; tileData: number[] }> = []

    for (let i = 0; i < tiles.length; i++) {
      result.push({
        row,
        col: startCol + i,
        tileData: tiles[i]
      })
    }

    return result
  }

  /**
   * Render text at a specific position
   */
  renderAt(
    text: string,
    row: number,
    col: number
  ): Array<{ row: number; col: number; tileData: number[] }> {
    const { tiles } = this.font.renderString(text)
    const result: Array<{ row: number; col: number; tileData: number[] }> = []

    for (let i = 0; i < tiles.length; i++) {
      result.push({
        row,
        col: col + i,
        tileData: tiles[i]
      })
    }

    return result
  }

  /**
   * Get font instance
   */
  getFont(): CDGFont {
    return this.font
  }
}
