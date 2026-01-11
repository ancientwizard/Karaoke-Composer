/**
 * Fallback Bitmap Font Renderer
 *
 * Generates simple bitmap glyphs for CD+G text rendering.
 * Used as fallback when opentype.js fonts unavailable.
 * Provides scalable 5-dot font for basic text output.
 *
 * Design:
 * - Base 5×7 glyph pattern
 * - Scalable to any size via nearest-neighbor sampling
 * - ASCII printable characters (32-126)
 * - Optimized for CD+G compatibility
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
 * Fallback bitmap font renderer
 */
export class FallbackBitmapFontRenderer {
  private fontSize: number = 12;
  private glyphCache = new Map<string, RenderedGlyph>();

  /**
   * 5×7 bitmap font for ASCII characters 32-126
   * Each character is 5 pixels wide × 7 pixels tall
   * 1 = filled, 0 = transparent
   */
  private static readonly FONT_DATA: Record<string, number[]> = {
    ' ': [
      0,0,0,0,0,
      0,0,0,0,0,
      0,0,0,0,0,
      0,0,0,0,0,
      0,0,0,0,0,
      0,0,0,0,0,
      0,0,0,0,0,
    ],
    'A': [
      0,0,1,0,0,
      0,1,0,1,0,
      1,0,0,0,1,
      1,1,1,1,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
    ],
    'B': [
      1,1,1,1,0,
      1,0,0,0,1,
      1,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,1,1,1,0,
    ],
    'C': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    'D': [
      1,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,1,1,1,0,
    ],
    'E': [
      1,1,1,1,1,
      1,0,0,0,0,
      1,1,1,1,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,1,1,1,1,
    ],
    'F': [
      1,1,1,1,1,
      1,0,0,0,0,
      1,1,1,1,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
    ],
    'G': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,0,
      1,0,1,1,1,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    'H': [
      1,0,0,0,1,
      1,0,0,0,1,
      1,1,1,1,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
    ],
    'I': [
      1,1,1,1,1,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      1,1,1,1,1,
    ],
    'J': [
      0,1,1,1,1,
      0,0,0,1,0,
      0,0,0,1,0,
      0,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      0,1,1,0,0,
    ],
    'K': [
      1,0,0,0,1,
      1,0,0,1,0,
      1,0,1,0,0,
      1,1,0,0,0,
      1,0,1,0,0,
      1,0,0,1,0,
      1,0,0,0,1,
    ],
    'L': [
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,1,1,1,1,
    ],
    'M': [
      1,0,0,0,1,
      1,1,0,1,1,
      1,0,1,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
    ],
    'N': [
      1,0,0,0,1,
      1,1,0,0,1,
      1,0,1,0,1,
      1,0,0,1,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
    ],
    'O': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    'P': [
      1,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,1,1,1,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
    ],
    'Q': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,1,1,
      1,0,0,0,1,
      0,1,1,1,1,
    ],
    'R': [
      1,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,1,1,1,0,
      1,0,1,0,0,
      1,0,0,1,0,
      1,0,0,0,1,
    ],
    'S': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,0,
      0,1,1,1,0,
      0,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    'T': [
      1,1,1,1,1,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
    ],
    'U': [
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    'V': [
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,0,1,0,0,
    ],
    'W': [
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,1,0,1,
      1,0,1,0,1,
      1,0,1,0,1,
      0,1,0,1,0,
    ],
    'X': [
      1,0,0,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,1,0,1,0,
      0,1,0,1,0,
      1,0,0,0,1,
    ],
    'Y': [
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
    ],
    'Z': [
      1,1,1,1,1,
      0,0,0,0,1,
      0,0,0,1,0,
      0,0,1,0,0,
      0,1,0,0,0,
      1,0,0,0,0,
      1,1,1,1,1,
    ],
    'a': [
      0,0,0,0,0,
      0,1,1,1,0,
      0,0,0,1,0,
      0,1,1,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      0,1,1,1,0,
    ],
    'b': [
      1,0,0,0,0,
      1,0,0,0,0,
      1,1,1,0,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,1,1,0,0,
    ],
    'c': [
      0,0,0,0,0,
      0,1,1,0,0,
      1,0,0,1,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,1,0,
      0,1,1,0,0,
    ],
    'd': [
      0,0,0,0,1,
      0,0,0,0,1,
      0,1,1,0,1,
      1,0,0,1,1,
      1,0,0,1,1,
      1,0,0,1,1,
      0,1,1,0,1,
    ],
    'e': [
      0,0,0,0,0,
      0,1,1,0,0,
      1,0,0,1,0,
      1,1,1,1,0,
      1,0,0,0,0,
      1,0,0,1,0,
      0,1,1,0,0,
    ],
    'f': [
      0,0,1,1,0,
      0,1,0,0,0,
      1,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
    ],
    'g': [
      0,0,0,0,0,
      0,1,1,0,1,
      1,0,0,1,1,
      1,0,0,1,1,
      0,1,1,0,1,
      0,0,0,0,1,
      0,1,1,0,0,
    ],
    'h': [
      1,0,0,0,0,
      1,0,0,0,0,
      1,1,1,0,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
    ],
    'i': [
      0,0,1,0,0,
      0,0,0,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
    ],
    'j': [
      0,0,0,1,0,
      0,0,0,0,0,
      0,0,0,1,0,
      0,0,0,1,0,
      0,0,0,1,0,
      1,0,0,1,0,
      0,1,1,0,0,
    ],
    'k': [
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,1,0,
      1,0,1,0,0,
      1,1,0,0,0,
      1,0,1,0,0,
      1,0,0,1,0,
    ],
    'l': [
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      0,0,1,1,0,
    ],
    'm': [
      0,0,0,0,0,
      1,0,1,0,0,
      1,1,0,1,1,
      1,0,1,0,1,
      1,0,1,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
    ],
    'n': [
      0,0,0,0,0,
      1,1,1,0,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
    ],
    'o': [
      0,0,0,0,0,
      0,1,1,0,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,0,0,1,0,
      0,1,1,0,0,
    ],
    'p': [
      0,0,0,0,0,
      1,1,1,0,0,
      1,0,0,1,0,
      1,0,0,1,0,
      1,1,1,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
    ],
    'q': [
      0,0,0,0,0,
      0,1,1,0,1,
      1,0,0,1,1,
      1,0,0,1,1,
      0,1,1,0,1,
      0,0,0,0,1,
      0,0,0,0,1,
    ],
    'r': [
      0,0,0,0,0,
      1,1,1,0,0,
      1,0,0,1,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
      1,0,0,0,0,
    ],
    's': [
      0,0,0,0,0,
      0,1,1,0,0,
      1,0,0,0,0,
      0,1,1,0,0,
      0,0,0,1,0,
      0,0,0,1,0,
      0,1,1,0,0,
    ],
    't': [
      0,0,1,0,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,1,
      0,0,0,1,0,
    ],
    'u': [
      0,0,0,0,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,0,1,1,
      0,1,1,0,1,
    ],
    'v': [
      0,0,0,0,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,0,1,0,0,
    ],
    'w': [
      0,0,0,0,0,
      1,0,0,0,1,
      1,0,0,0,1,
      1,0,1,0,1,
      1,0,1,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
    ],
    'x': [
      0,0,0,0,0,
      1,0,0,0,1,
      0,1,0,1,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,1,0,1,0,
      1,0,0,0,1,
    ],
    'y': [
      0,0,0,0,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,0,1,0,
      0,1,0,1,0,
      0,0,1,0,0,
      0,1,0,0,0,
    ],
    'z': [
      0,0,0,0,0,
      1,1,1,0,0,
      0,0,0,1,0,
      0,0,1,0,0,
      0,1,0,0,0,
      1,0,0,0,0,
      1,1,1,0,0,
    ],
    '0': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,1,1,
      1,0,1,0,1,
      1,1,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    '1': [
      0,0,1,0,0,
      0,1,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,0,1,0,0,
      0,1,1,1,0,
    ],
    '2': [
      0,1,1,1,0,
      1,0,0,0,1,
      0,0,0,0,1,
      0,0,1,1,0,
      0,1,0,0,0,
      1,0,0,0,0,
      1,1,1,1,1,
    ],
    '3': [
      1,1,1,1,0,
      0,0,0,0,1,
      0,0,0,0,1,
      0,1,1,1,0,
      0,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    '4': [
      0,0,0,1,0,
      0,0,1,1,0,
      0,1,0,1,0,
      1,0,0,1,0,
      1,1,1,1,1,
      0,0,0,1,0,
      0,0,0,1,0,
    ],
    '5': [
      1,1,1,1,1,
      1,0,0,0,0,
      1,1,1,1,0,
      0,0,0,0,1,
      0,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    '6': [
      0,0,1,1,0,
      0,1,0,0,0,
      1,0,0,0,0,
      1,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    '7': [
      1,1,1,1,1,
      0,0,0,0,1,
      0,0,0,1,0,
      0,0,1,0,0,
      0,1,0,0,0,
      0,1,0,0,0,
      1,0,0,0,0,
    ],
    '8': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,0,
    ],
    '9': [
      0,1,1,1,0,
      1,0,0,0,1,
      1,0,0,0,1,
      0,1,1,1,1,
      0,0,0,0,1,
      0,0,0,1,0,
      0,1,1,0,0,
    ],
  };

  /**
   * Set font size in points
   */
  setFontSize(size: number): void {
    this.fontSize = size;
    // Clear cache when size changes
    this.glyphCache.clear();
  }

  /**
   * Render a glyph to bitmap
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
    const baseGlyph = FallbackBitmapFontRenderer.FONT_DATA[char];
    
    if (!baseGlyph) {
      // Try uppercase version for lowercase letters
      const upperChar = char.toUpperCase();
      const upperGlyph = FallbackBitmapFontRenderer.FONT_DATA[upperChar];
      if (upperGlyph && upperGlyph !== baseGlyph) {
        return this.renderGlyph(upperChar);
      }
      // Unknown character - return space
      return this.renderGlyph(' ');
    }

    // Scale glyph to requested size
    const baseWidth = 5;
    const baseHeight = 7;
    const scale = Math.max(1, Math.round(this.fontSize / 7));
    
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;
    const bitmap = new Uint8Array(scaledWidth * scaledHeight);

    // Nearest-neighbor scaling
    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        const srcX = Math.floor(x / scale);
        const srcY = Math.floor(y / scale);
        const srcPixel = baseGlyph[srcY * baseWidth + srcX];
        bitmap[y * scaledWidth + x] = srcPixel ? 255 : 0;
      }
    }

    // Smart bounds detection: find actual glyph content
    let minX = scaledWidth;
    let maxX = -1;
    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        if (bitmap[y * scaledWidth + x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    // Extract trimmed glyph
    let actualWidth = scaledWidth;
    let trimmedData = bitmap;
    
    if (minX < scaledWidth && maxX >= 0) {
      actualWidth = maxX - minX + 1;
      trimmedData = new Uint8Array(actualWidth * scaledHeight);
      for (let y = 0; y < scaledHeight; y++) {
        for (let x = 0; x < actualWidth; x++) {
          trimmedData[y * actualWidth + x] = bitmap[y * scaledWidth + (minX + x)];
        }
      }
    }

    const result: RenderedGlyph = {
      width: actualWidth,
      height: scaledHeight,
      data: trimmedData,
      advanceWidth: Math.ceil(actualWidth * 1.2)  // Add small space between chars
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

// VIM: set ft=typescript :
// END
