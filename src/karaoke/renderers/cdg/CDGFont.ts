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

    // Uppercase letters with readable designs
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

    this.addGlyph('B', 5, [
      0b000000,
      0b011110,
      0b010001,
      0b010001,
      0b011110,
      0b010001,
      0b010001,
      0b011110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('C', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010000,
      0b010000,
      0b010000,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('D', 5, [
      0b000000,
      0b011110,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b011110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('E', 5, [
      0b000000,
      0b011111,
      0b010000,
      0b010000,
      0b011110,
      0b010000,
      0b010000,
      0b011111,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('F', 5, [
      0b000000,
      0b011111,
      0b010000,
      0b010000,
      0b011110,
      0b010000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('G', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010000,
      0b010011,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('H', 5, [
      0b000000,
      0b010001,
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

    this.addGlyph('I', 3, [
      0b011100,
      0b001000,
      0b001000,
      0b001000,
      0b001000,
      0b001000,
      0b011100,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('J', 4, [
      0b001110,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b010100,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('K', 5, [
      0b000000,
      0b010001,
      0b010010,
      0b010100,
      0b011000,
      0b010100,
      0b010010,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('L', 4, [
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b011110,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('M', 5, [
      0b000000,
      0b010001,
      0b011011,
      0b010101,
      0b010101,
      0b010001,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('N', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b011001,
      0b010101,
      0b010011,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('O', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('P', 5, [
      0b000000,
      0b011110,
      0b010001,
      0b010001,
      0b011110,
      0b010000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('Q', 5, [
      0b001110,
      0b010001,
      0b010001,
      0b010001,
      0b010011,
      0b010001,
      0b001111,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('R', 5, [
      0b000000,
      0b011110,
      0b010001,
      0b010001,
      0b011110,
      0b010100,
      0b010010,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('S', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010000,
      0b001110,
      0b000001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('T', 5, [
      0b000000,
      0b011111,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('U', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('V', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b001010,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('W', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b010101,
      0b010101,
      0b011011,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('X', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b001010,
      0b000100,
      0b001010,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('Y', 5, [
      0b000000,
      0b010001,
      0b010001,
      0b001010,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('Z', 5, [
      0b000000,
      0b011111,
      0b000001,
      0b000010,
      0b000100,
      0b001000,
      0b010000,
      0b011111,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Lowercase letters - simpler versions
    this.addGlyph('a', 4, [
      0b000000,
      0b000000,
      0b001110,
      0b000001,
      0b001111,
      0b010001,
      0b010011,
      0b001101,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('b', 4, [
      0b000000,
      0b010000,
      0b010000,
      0b010110,
      0b011001,
      0b010001,
      0b010001,
      0b011110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('c', 4, [
      0b000000,
      0b000000,
      0b001110,
      0b010000,
      0b010000,
      0b010000,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('d', 4, [
      0b000000,
      0b000001,
      0b000001,
      0b001101,
      0b010011,
      0b010001,
      0b010001,
      0b001111,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('e', 4, [
      0b000000,
      0b000000,
      0b001110,
      0b010001,
      0b011111,
      0b010000,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('f', 3, [
      0b000000,
      0b000110,
      0b001000,
      0b001000,
      0b011100,
      0b001000,
      0b001000,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('g', 4, [
      0b000000,
      0b000000,
      0b001111,
      0b010001,
      0b010001,
      0b001111,
      0b000001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('h', 4, [
      0b000000,
      0b010000,
      0b010000,
      0b010110,
      0b011001,
      0b010001,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('i', 2, [
      0b000000,
      0b010000,
      0b000000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('j', 3, [
      0b000000,
      0b000100,
      0b000000,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('k', 4, [
      0b000000,
      0b010000,
      0b010000,
      0b010010,
      0b010100,
      0b011000,
      0b010100,
      0b010010,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('l', 2, [
      0b000000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('m', 5, [
      0b000000,
      0b000000,
      0b011010,
      0b010101,
      0b010101,
      0b010101,
      0b010101,
      0b010101,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('n', 4, [
      0b000000,
      0b000000,
      0b010110,
      0b011001,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('o', 3, [
      0b000000,
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('p', 4, [
      0b000000,
      0b000000,
      0b111100,
      0b100010,
      0b100010,
      0b111100,
      0b100000,
      0b100000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('q', 4, [
      0b000000,
      0b000000,
      0b001111,
      0b010001,
      0b010001,
      0b001111,
      0b000001,
      0b000001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('r', 3, [
      0b000000,
      0b000000,
      0b011100,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('s', 4, [
      0b000000,
      0b000000,
      0b001110,
      0b010000,
      0b001110,
      0b000001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('t', 3, [
      0b000000,
      0b001000,
      0b001000,
      0b011100,
      0b001000,
      0b001000,
      0b001000,
      0b000110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('u', 4, [
      0b000000,
      0b000000,
      0b010001,
      0b010001,
      0b010001,
      0b010001,
      0b010011,
      0b001101,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('v', 4, [
      0b000000,
      0b000000,
      0b010001,
      0b010001,
      0b010001,
      0b001010,
      0b001010,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('w', 5, [
      0b000000,
      0b000000,
      0b010001,
      0b010101,
      0b010101,
      0b010101,
      0b011011,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('x', 4, [
      0b000000,
      0b000000,
      0b010001,
      0b001010,
      0b000100,
      0b000100,
      0b001010,
      0b010001,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('y', 4, [
      0b000000,
      0b000000,
      0b010001,
      0b010001,
      0b010001,
      0b001111,
      0b000001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('z', 4, [
      0b000000,
      0b000000,
      0b011111,
      0b000001,
      0b000010,
      0b000100,
      0b001000,
      0b011111,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Digits
    this.addGlyph('0', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010011,
      0b010101,
      0b011001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('1', 3, [
      0b001000,
      0b011000,
      0b001000,
      0b001000,
      0b001000,
      0b001000,
      0b011100,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('2', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b000001,
      0b000010,
      0b000100,
      0b001000,
      0b011111,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('3', 5, [
      0b000000,
      0b011111,
      0b000001,
      0b000010,
      0b001110,
      0b000001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('4', 5, [
      0b000000,
      0b000010,
      0b000110,
      0b001010,
      0b010010,
      0b011111,
      0b000010,
      0b000010,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('5', 5, [
      0b000000,
      0b011111,
      0b010000,
      0b011110,
      0b000001,
      0b000001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('6', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010000,
      0b011110,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('7', 5, [
      0b000000,
      0b011111,
      0b000001,
      0b000010,
      0b000100,
      0b000100,
      0b001000,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('8', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b001110,
      0b010001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('9', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b001111,
      0b000001,
      0b010001,
      0b001110,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Add common punctuation
    this.addGlyph('.', 2, [
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b100000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph(',', 2, [
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b010000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('!', 2, [
      0b110000,
      0b110000,
      0b110000,
      0b110000,
      0b110000,
      0b000000,
      0b110000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('?', 5, [
      0b001110,
      0b010001,
      0b000001,
      0b000010,
      0b000100,
      0b000000,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph(':', 2, [
      0b000000,
      0b000000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b010000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph(';', 2, [
      0b100000,
      0b000000,
      0b000000,
      0b000000,
      0b100000,
      0b100000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('\'', 2, [
      0b100000,
      0b100000,
      0b100000,
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

    this.addGlyph('"', 4, [
      0b101000,
      0b101000,
      0b101000,
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

    this.addGlyph('-', 5, [
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b111110,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('+', 5, [
      0b000000,
      0b000000,
      0b000100,
      0b000100,
      0b011111,
      0b000100,
      0b000100,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('/', 5, [
      0b000001,
      0b000010,
      0b000100,
      0b001000,
      0b010000,
      0b100000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('(', 3, [
      0b001000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b010000,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph(')', 3, [
      0b001000,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b000100,
      0b001000,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    this.addGlyph('&', 5, [
      0b000000,
      0b001110,
      0b010001,
      0b010001,
      0b001110,
      0b010010,
      0b010101,
      0b001010,
      0b000000,
      0b000000,
      0b000000,
      0b000000
    ])

    // Add space for any missing characters as fallback
    this.addDefaultGlyph()
  }

  /**
   * Add a default glyph for missing characters
   * This fallback ensures no missing characters crash rendering
   */
  private addDefaultGlyph(): void {
    // For any character not explicitly defined, use a simple space (empty block)
    // This prevents crashes when unknown characters are encountered
    const defaultChars = 'BCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789' +
      '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~' +
      ' \t\n'

    for (const char of defaultChars) {
      if (!this.glyphs.has(char)) {
        // Use space glyph for unknowns
        this.addGlyph(char, 3, [
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
   * Publicly register a custom glyph (for testing, debug glyphs, etc.)
   */
  public registerGlyph(char: string, width: number, rows: number[]): void {
    if (rows.length !== 12) {
      throw new Error(`Glyph rows must be exactly 12, got ${rows.length}`)
    }
    if (width < 1 || width > 6) {
      throw new Error(`Glyph width must be 1-6, got ${width}`)
    }
    this.addGlyph(char, width, rows)
  }

  /**
   * Get glyph for a character (returns space if not found)
   */
  getGlyph(char: string): CharacterGlyph {
    return this.glyphs.get(char) || this.glyphs.get(' ')!
  }

  /**
   * Render a string to pixel data
   * Returns glyphs with their absolute pixel positions (not tile-aligned)
   * Each glyph is 6x12 pixels at pixel coordinates (pixelX, pixelY)
   */
  renderString(text: string): {
    glyphs: Array<{
      pixelX: number       // Absolute X position in pixels
      pixelY: number       // Absolute Y position in pixels
      width: number        // Actual glyph width (3-6 pixels)
      rows: number[]       // 12 rows of 6-bit pixel data
    }>
    widthInPixels: number
  } {
    const glyphs: Array<{
      pixelX: number
      pixelY: number
      width: number
      rows: number[]
    }> = []

    let pixelX = 0

    for (const char of text) {
      const glyph = this.getGlyph(char)

      // Add glyph at current pixel position (no tile alignment)
      glyphs.push({
        pixelX,
        pixelY: 0,  // Base Y; caller can offset
        width: glyph.width,
        rows: glyph.rows
      })

      // Move X by glyph width
      pixelX += glyph.width
    }

    return {
      glyphs,
      widthInPixels: pixelX
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
   * Render text centered at a specific row (in tile coordinates)
   * Returns pixel-based glyphs that can be drawn to VRAM
   * Row is in tile units (0-17); converts to pixel Y
   */
  renderCentered(
    text: string,
    tileRow: number
  ): Array<{ pixelX: number; pixelY: number; width: number; rows: number[] }> {
    const { glyphs, widthInPixels } = this.font.renderString(text)

    // Convert tile row to pixel Y
    const pixelY = tileRow * CDG_SCREEN.TILE_HEIGHT

    // Center text horizontally (in pixels)
    const totalPixelWidth = CDG_SCREEN.WIDTH
    const startPixelX = Math.floor((totalPixelWidth - widthInPixels) / 2)

    // Offset all glyphs by centered X position
    return glyphs.map(g => ({
      pixelX: startPixelX + g.pixelX,
      pixelY,
      width: g.width,
      rows: g.rows
    }))
  }

  /**
   * Render text at a specific position (in tile coordinates)
   * Returns pixel-based glyphs that can be drawn to VRAM
   * Row/Col are in tile units; converts to pixel coordinates
   */
  renderAt(
    text: string,
    tileRow: number,
    tileCol: number
  ): Array<{ pixelX: number; pixelY: number; width: number; rows: number[] }> {
    const { glyphs } = this.font.renderString(text)

    // Convert tile coords to pixel coords
    const pixelX = tileCol * CDG_SCREEN.TILE_WIDTH
    const pixelY = tileRow * CDG_SCREEN.TILE_HEIGHT

    // Offset all glyphs by tile position
    return glyphs.map(g => ({
      pixelX: pixelX + g.pixelX,
      pixelY,
      width: g.width,
      rows: g.rows
    }))
  }

  /**
   * Render text at absolute pixel coordinates
   * Allows precise placement for testing/debugging
   */
  renderAtPixels(
    text: string,
    pixelX: number,
    pixelY: number
  ): Array<{ pixelX: number; pixelY: number; width: number; rows: number[] }> {
    const { glyphs } = this.font.renderString(text)

    // Offset all glyphs by absolute pixel position
    return glyphs.map(g => ({
      pixelX: pixelX + g.pixelX,
      pixelY,
      width: g.width,
      rows: g.rows
    }))
  }

  /**
   * Get font instance
   */
  getFont(): CDGFont {
    return this.font
  }
}
