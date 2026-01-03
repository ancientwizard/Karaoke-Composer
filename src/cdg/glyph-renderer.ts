/**
 * Glyph Rendering to VRAM
 *
 * Renders pixel-based glyphs to VRAM at arbitrary positions.
 * Supports both tile-aligned and pixel-precise placement.
 * Validates all pixels stay within bounds.
 */

import { VRAM } from './encoder'

/**
 * Glyph data: bitmap representation with variable dimensions
 *
 * Supports both fixed-size glyphs (from CDGFont) and dynamic glyphs
 * (from DynamicGlyphRasterizer). Rows array length determines glyph height.
 */
export interface GlyphData
{
  width: number      // Glyph width in pixels (variable)
  height?: number    // Glyph height in pixels (optional; if omitted, defaults to rows.length)
  rows: number[]     // Array of pixel rows (length = height); each element is a packed bit row
  yOffset?: number   // Y offset (pixels from baseline top to glyph top); positive = glyph above baseline
}

/**
 * Result of rendering a glyph
 */
export interface GlyphRenderResult
{
  pixelsSet: number
  pixelsOutOfBounds: number
}

/**
 * Render a glyph to VRAM at pixel coordinates
 *
 * Supports variable-size glyphs from both static and dynamic sources.
 * Each row value is a packed bit representation where bit position
 * corresponds to pixel column.
 *
 * @param vram - Target VRAM
 * @param pixelX - Absolute X pixel coordinate (top-left of glyph)
 * @param pixelY - Absolute Y pixel coordinate (top-left of glyph)
 * @param glyph - Glyph data (variable width/height)
 * @param colorIndex - Color index (0-15)
 * @returns Render statistics
 */
export function renderGlyphToVRAM(
  vram: VRAM,
  pixelX: number,
  pixelY: number,
  glyph: GlyphData,
  colorIndex: number
): GlyphRenderResult
{
  let pixelsSet = 0
  let pixelsOutOfBounds = 0

  const glyphHeight = glyph.height || glyph.rows.length
  const glyphWidth = glyph.width
  const yOffset = glyph.yOffset || 0  // Baseline offset (positive = above)

  for (let y = 0; y < glyphHeight && y < glyph.rows.length; y++)
  {
    const row = glyph.rows[y] || 0

    // Extract bits from row value
    // Bit position maps to pixel column: bit (glyphWidth - 1 - x) = pixel at column x
    for (let x = 0; x < glyphWidth; x++)
    {
      // MSB-first extraction for variable-width glyphs
      const bitPosition = glyphWidth - 1 - x
      const bit = (row >> bitPosition) & 1

      if (bit)
      {
        const absPosX = pixelX + x
        const absPosY = pixelY + yOffset + y  // Apply baseline offset

        // Bounds check
        if (absPosX < 0 || absPosX >= vram.width || absPosY < 0 || absPosY >= vram.height)
        {
          pixelsOutOfBounds++
        }
        else
        {
          vram.setPixel(absPosX, absPosY, colorIndex)
          pixelsSet++
        }
      }
    }
  }

  return { pixelsSet, pixelsOutOfBounds }
}

// VIM: set filetype=typescript :
// END
