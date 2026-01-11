/**
 * Improved Bitmap Font Renderer
 *
 * Enhanced version of FallbackBitmapFontRenderer with:
 * - Better character designs (6×8 base instead of 5×7)
 * - Smoother scaling with anti-aliasing
 * - Better letter spacing and metrics
 * - Improved bitmap font data
 *
 * Used as fallback when opentype.js fonts unavailable (e.g., sandboxed environments).
 */

/**
 * Rendered glyph data
 */
export interface RenderedGlyph {
  width: number;
  height: number;
  data: Uint8Array;  // Bitmap pixel data (0-255)
  advanceWidth: number;
}

/**
 * Improved bitmap font renderer
 */
export class ImprovedBitmapFontRenderer {
  private fontSize: number = 12;
  private glyphCache = new Map<string, RenderedGlyph>();

  /**
   * 6×8 bitmap font for ASCII characters 32-126
   * Higher resolution base font for better quality
   * Each character is 6 pixels wide × 8 pixels tall
   * 1 = filled, 0 = transparent
   */
  private static readonly FONT_DATA: Record<string, number[]> = {
    ' ': [
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'A': [
      0,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'B': [
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'C': [
      0,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'D': [
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'E': [
      1,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'F': [
      1,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'G': [
      0,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,1,1,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'H': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,1,1,1,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'I': [
      0,1,1,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'J': [
      0,0,1,1,0,0,
      0,0,0,1,0,0,
      0,0,0,1,0,0,
      0,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'K': [
      1,0,0,1,0,0,
      1,0,1,0,0,0,
      1,0,1,0,0,0,
      1,1,0,0,0,0,
      1,0,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'L': [
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'M': [
      1,0,0,0,1,0,
      1,1,0,1,1,0,
      1,0,1,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'N': [
      1,0,0,0,1,0,
      1,1,0,0,1,0,
      1,0,1,0,1,0,
      1,0,0,1,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'O': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'P': [
      1,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'Q': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,1,1,0,
      1,0,0,0,1,0,
      0,1,1,1,1,0,
      0,0,0,0,0,0,
    ],
    'R': [
      1,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,1,1,1,0,0,
      1,0,0,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'S': [
      0,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,1,1,0,0,0,
      0,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'T': [
      1,1,1,1,1,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'U': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'V': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'W': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,1,0,1,0,
      1,0,1,0,1,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'X': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'Y': [
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'Z': [
      1,1,1,1,1,0,
      0,0,0,0,1,0,
      0,0,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,1,1,0,
      0,0,0,0,0,0,
    ],
    'a': [
      0,0,0,0,0,0,
      0,0,1,1,0,0,
      1,0,0,0,1,0,
      0,1,1,1,1,0,
      1,0,0,0,1,0,
      1,0,0,1,1,0,
      0,1,1,0,1,0,
      0,0,0,0,0,0,
    ],
    'b': [
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'c': [
      0,0,0,0,0,0,
      0,0,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'd': [
      0,0,0,0,1,0,
      0,0,0,0,1,0,
      0,1,1,0,1,0,
      1,0,0,1,1,0,
      1,0,0,1,1,0,
      1,0,0,1,1,0,
      0,1,1,0,1,0,
      0,0,0,0,0,0,
    ],
    'e': [
      0,0,0,0,0,0,
      0,1,1,0,0,0,
      1,0,0,1,0,0,
      1,1,1,1,0,0,
      1,0,0,0,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'f': [
      0,0,1,1,0,0,
      0,1,0,0,0,0,
      1,1,1,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'g': [
      0,0,0,0,0,0,
      0,1,1,0,1,0,
      1,0,0,1,1,0,
      1,0,0,1,1,0,
      0,1,1,0,1,0,
      0,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'h': [
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'i': [
      0,0,1,0,0,0,
      0,0,0,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'j': [
      0,0,0,1,0,0,
      0,0,0,0,0,0,
      0,0,0,1,0,0,
      0,0,0,1,0,0,
      0,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'k': [
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,1,0,0,
      1,0,1,0,0,0,
      1,1,0,0,0,0,
      1,0,1,0,0,0,
      1,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'l': [
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'm': [
      0,0,0,0,0,0,
      1,0,1,0,0,0,
      1,1,0,1,1,0,
      1,0,1,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'n': [
      0,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'o': [
      0,0,0,0,0,0,
      0,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'p': [
      0,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,1,0,0,
      1,1,1,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'q': [
      0,0,0,0,0,0,
      0,1,1,0,1,0,
      1,0,0,1,1,0,
      1,0,0,1,1,0,
      0,1,1,0,1,0,
      0,0,0,0,1,0,
      0,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'r': [
      0,0,0,0,0,0,
      1,1,1,0,0,0,
      1,0,0,1,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    's': [
      0,0,0,0,0,0,
      0,1,1,0,0,0,
      1,0,0,0,0,0,
      0,1,1,0,0,0,
      0,0,0,1,0,0,
      1,0,0,1,0,0,
      0,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    't': [
      0,0,1,0,0,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,1,0,
      0,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'u': [
      0,0,0,0,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,0,1,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    'v': [
      0,0,0,0,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,0,0,0,0,
    ],
    'w': [
      0,0,0,0,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      1,0,1,0,1,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,0,0,0,0,0,
    ],
    'x': [
      0,0,0,0,0,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,1,0,1,0,0,
      1,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    'y': [
      0,0,0,0,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,0,1,0,0,
      0,1,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,0,0,0,
      0,0,0,0,0,0,
    ],
    'z': [
      0,0,0,0,0,0,
      1,1,1,0,0,0,
      0,0,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,0,0,0,
      0,0,0,0,0,0,
    ],
    '0': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,1,1,0,
      1,0,1,0,1,0,
      1,1,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '1': [
      0,0,1,0,0,0,
      0,1,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      0,0,1,0,0,0,
      1,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '2': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      0,0,0,0,1,0,
      0,0,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,0,0,0,
      1,1,1,1,1,0,
      0,0,0,0,0,0,
    ],
    '3': [
      1,1,1,1,0,0,
      0,0,0,0,1,0,
      0,0,0,0,1,0,
      0,0,1,1,0,0,
      0,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '4': [
      0,0,0,0,1,0,
      0,0,0,1,1,0,
      0,0,1,0,1,0,
      0,1,0,0,1,0,
      1,0,0,0,1,0,
      1,1,1,1,1,0,
      0,0,0,0,1,0,
      0,0,0,0,0,0,
    ],
    '5': [
      1,1,1,1,1,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      1,1,1,1,0,0,
      0,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '6': [
      0,0,0,0,1,0,
      0,0,0,1,0,0,
      0,0,1,0,0,0,
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '7': [
      1,1,1,1,1,0,
      0,0,0,0,1,0,
      0,0,0,1,0,0,
      0,0,1,0,0,0,
      0,1,0,0,0,0,
      1,0,0,0,0,0,
      1,0,0,0,0,0,
      0,0,0,0,0,0,
    ],
    '8': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,0,0,
      0,0,0,0,0,0,
    ],
    '9': [
      0,1,1,1,0,0,
      1,0,0,0,1,0,
      1,0,0,0,1,0,
      0,1,1,1,1,0,
      0,0,0,0,1,0,
      0,0,0,0,1,0,
      0,0,0,1,0,0,
      0,0,0,0,0,0,
    ],
    '.': [
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,1,1,0,0,0,
      0,1,1,0,0,0,
    ],
    ',': [
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,0,0,0,0,0,
      0,1,1,0,0,0,
      0,1,0,0,0,0,
    ],
    '!': [
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,1,0,0,0,0,
      0,0,0,0,0,0,
      0,1,0,0,0,0,
      0,0,0,0,0,0,
    ],
  };

  /**
   * Character width map - defines the actual visual width of each character
   * This enables proportional fonts instead of fixed-width rendering
   * 
   * Width values (in 6-pixel cells):
   * - Narrow chars (i, l, !): 2-3 pixels
   * - Medium chars (a-z, A-Z): 4-5 pixels
   * - Wide chars (W, M): 5-6 pixels
   * - Space: 3 pixels (reduced for tighter layout)
   */
  private static readonly CHAR_WIDTHS: Record<string, number> = {
    // Space and punctuation
    ' ': 3,      // Space (narrower for better layout)
    '!': 2,      // Narrow
    '"': 3,      // Double quote
    '#': 5,      // Hash
    '$': 4,      // Dollar
    '%': 5,      // Percent
    '&': 5,      // Ampersand
    "'": 2,      // Single quote
    '(': 3,      // Paren left
    ')': 3,      // Paren right
    '*': 4,      // Asterisk
    '+': 4,      // Plus
    ',': 2,      // Comma
    '-': 3,      // Hyphen
    '.': 2,      // Period
    '/': 4,      // Slash
    
    // Numbers (mostly monospace width)
    '0': 4, '1': 3, '2': 4, '3': 4, '4': 4,
    '5': 4, '6': 4, '7': 4, '8': 4, '9': 4,
    
    // Uppercase (wider than lowercase)
    'A': 5, 'B': 5, 'C': 4, 'D': 5, 'E': 4,
    'F': 4, 'G': 5, 'H': 5, 'I': 2, 'J': 3,
    'K': 5, 'L': 4, 'M': 6, 'N': 5, 'O': 5,
    'P': 4, 'Q': 5, 'R': 5, 'S': 4, 'T': 4,
    'U': 5, 'V': 5, 'W': 6, 'X': 5, 'Y': 5,
    'Z': 4,
    
    // Lowercase (narrower than uppercase)
    'a': 4, 'b': 4, 'c': 3, 'd': 4, 'e': 4,
    'f': 3, 'g': 4, 'h': 4, 'i': 2, 'j': 2,
    'k': 4, 'l': 2, 'm': 5, 'n': 4, 'o': 4,
    'p': 4, 'q': 4, 'r': 3, 's': 3, 't': 3,
    'u': 4, 'v': 4, 'w': 5, 'x': 4, 'y': 4,
    'z': 3,
    
    // Brackets and other
    '[': 2, '\\': 4, ']': 2, '^': 4, '_': 4,
    '`': 2, '{': 3, '|': 2, '}': 3, '~': 4,
  };

  /**
   * Get the actual visual width of a character (in pixels at base 8-point scale)
   * This allows proportional fonts with varying character widths
   */
  private static getCharacterWidth(char: string): number {
    // Check if we have explicit width data
    const width = ImprovedBitmapFontRenderer.CHAR_WIDTHS[char];
    if (width !== undefined) {
      return width;
    }
    
    // For unknown characters, use medium default
    return 4;
  }

  /**
   * Set font size in points
   */
  setFontSize(size: number): void {
    this.fontSize = size;
    // Clear cache when size changes
    this.glyphCache.clear();
  }

  /**
   * Render a glyph to bitmap with smooth scaling
   * 
   * CRITICAL: For large fonts, we use super-sampling (render at 2-3x resolution)
   * to avoid pixelation and character overlap. The base 6×8 font is too small
   * for sizes > 32pt, so we:
   * 1. Render at higher intermediate resolution
   * 2. Apply anti-aliasing during downsampling
   * 3. Produce clean output without artifacts
   * 
   * @param char Character to render
   * @returns Rendered glyph with bitmap data, or null if no glyph available
   */
  renderGlyph(char: string): RenderedGlyph | null {
    // Check cache
    const cacheKey = `${char}@${this.fontSize}`;
    if (this.glyphCache.has(cacheKey)) {
      return this.glyphCache.get(cacheKey)!;
    }

    // Get base glyph data
    let baseGlyph = ImprovedBitmapFontRenderer.FONT_DATA[char];
    
    if (!baseGlyph) {
      // Character not in this font - return null so caller can fall back to FallbackBitmapFontRenderer
      // This supports lowercase letters, numbers, special characters, and punctuation
      return null;
    }

    // CRITICAL: Use actual character width instead of fixed 6 pixels
    // This enables proportional font rendering (i=2px, W=6px, etc.)
    // The base font is 8 pixels tall, so we use that as reference for width calculation
    const baseHeight = 8;
    const charBaseWidth = ImprovedBitmapFontRenderer.getCharacterWidth(char);
    const scale = Math.max(1, this.fontSize / baseHeight);
    
    // SUPER-SAMPLING: For large fonts (>32pt), render at higher resolution to avoid pixelation
    // and character overlap. This is like what professional font rasterizers do.
    // - Small fonts (≤16pt): render 1x directly
    // - Medium fonts (17-32pt): render 2x internally, downsample
    // - Large fonts (>32pt): render 3x internally, downsample
    let superSampleFactor = 1;
    if (this.fontSize > 32) {
      superSampleFactor = 3;  // 70pt fonts: render at 210pt equivalent, downsample
    } else if (this.fontSize > 16) {
      superSampleFactor = 2;  // 24pt fonts: render at 48pt equivalent, downsample
    }
    
    // Render at higher resolution internally
    const superScale = scale * superSampleFactor;
    const superWidth = Math.ceil(charBaseWidth * superScale);
    const superHeight = Math.ceil(baseHeight * superScale);
    const superBitmap = new Uint8Array(superWidth * superHeight);
    
    // Render at super-sampled resolution using bilinear interpolation
    for (let y = 0; y < superHeight; y++) {
      for (let x = 0; x < superWidth; x++) {
        const srcX = (x / superScale);
        const srcY = (y / superScale);
        const xi = Math.floor(srcX);
        const yi = Math.floor(srcY);
        const xf = srcX - xi;
        const yf = srcY - yi;

        // Bilinear interpolation for smooth scaling
        let value = 0;

        if (xi >= 0 && xi < charBaseWidth && yi >= 0 && yi < baseHeight) {
          const p00 = baseGlyph[yi * 6 + xi] ? 255 : 0;
          value += p00 * (1 - xf) * (1 - yf);
        }
        if (xi + 1 < charBaseWidth && yi >= 0 && yi < baseHeight) {
          const p10 = baseGlyph[yi * 6 + xi + 1] ? 255 : 0;
          value += p10 * xf * (1 - yf);
        }
        if (xi >= 0 && xi < charBaseWidth && yi + 1 < baseHeight) {
          const p01 = baseGlyph[(yi + 1) * 6 + xi] ? 255 : 0;
          value += p01 * (1 - xf) * yf;
        }
        if (xi + 1 < charBaseWidth && yi + 1 < baseHeight) {
          const p11 = baseGlyph[(yi + 1) * 6 + xi + 1] ? 255 : 0;
          value += p11 * xf * yf;
        }

        superBitmap[y * superWidth + x] = Math.round(value);
      }
    }
    
    // DOWNSAMPLE with anti-aliasing to final size
    const scaledWidth = Math.ceil(charBaseWidth * scale);
    const scaledHeight = Math.ceil(baseHeight * scale);
    const bitmap = new Uint8Array(scaledWidth * scaledHeight);
    
    if (superSampleFactor === 1) {
      // No downsampling needed
      bitmap.set(superBitmap);
    } else {
      // Downsample by averaging super-sampled pixels (anti-aliasing)
      const invFactor2 = 1 / (superSampleFactor * superSampleFactor);
      
      for (let y = 0; y < scaledHeight; y++) {
        for (let x = 0; x < scaledWidth; x++) {
          let sum = 0;
          
          // Average all super-sampled pixels that contribute to this output pixel
          for (let sy = 0; sy < superSampleFactor; sy++) {
            for (let sx = 0; sx < superSampleFactor; sx++) {
              const superX = x * superSampleFactor + sx;
              const superY = y * superSampleFactor + sy;
              if (superX < superWidth && superY < superHeight) {
                sum += superBitmap[superY * superWidth + superX];
              }
            }
          }
          
          bitmap[y * scaledWidth + x] = Math.round(sum * invFactor2);
        }
      }
    }

    const result: RenderedGlyph = {
      width: scaledWidth,
      height: scaledHeight,
      data: bitmap,
      advanceWidth: Math.ceil(scaledWidth * 1.1)  // Slightly better spacing
    };

    // Cache it
    this.glyphCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Clear glyph cache
   */
  clearCache(): void {
    this.glyphCache.clear();
  }
}

// VIM: set et sw=2 ts=2 :
// END
