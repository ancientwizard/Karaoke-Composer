/**
 * Glyph Rendering to VRAM
 *
 * Renders pixel-based glyphs to VRAM at arbitrary positions.
 * Supports both tile-aligned and pixel-precise placement.
 * Validates all pixels stay within bounds.
 */

import { VRAM } from './encoder'

/**
 * Glyph data: 12 rows of 6-bit pixel data
 */
export interface GlyphData
{
  width: number      // 1-6 pixels wide
  rows: number[]     // 12 rows (array of 6-bit values)
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
 * Glyphs are LEFT-aligned in 6-bit values.
 * For width W, pixels occupy bits (W-1) down to 0
 *
 * @param vram - Target VRAM
 * @param pixelX - Absolute X pixel coordinate
 * @param pixelY - Absolute Y pixel coordinate
 * @param glyph - Glyph data
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

  for (let y = 0; y < 12; y++)
  {
    const row = glyph.rows[y] || 0
    // Glyphs are LEFT-aligned in a 6-bit value
    // For width=5, pixels occupy bits 4,3,2,1,0
    // For width=6, pixels occupy bits 5,4,3,2,1,0 (full range)
    // Extract from left side: pixel x is at bit (width - 1 - x)
    for (let x = 0; x < glyph.width; x++)
    {
      // Extract bit (width - 1 - x) for pixel x, going from left to right
      const bit = (row >> (glyph.width - 1 - x)) & 1
      if (bit)
      {
        const absPosX = pixelX + x
        const absPosY = pixelY + y

        // Check bounds
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
