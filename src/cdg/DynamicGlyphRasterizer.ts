/**
 * Dynamic Glyph Rasterizer
 *
 * Renders text glyphs using browser fonts at any requested size.
 * Produces variable-width, variable-height bitmap glyphs in GlyphData format.
 *
 * Purpose: Replace static CDGFont table with on-demand rasterization
 * from actual fonts, enabling true scaling and professional typography.
 */

import type { GlyphData } from './glyph-renderer'

/**
 * Cache key for rasterized glyphs
 * Format: "char:fontFamily:fontSize"
 */
type GlyphCacheKey = string

export class DynamicGlyphRasterizer
{
  private glyphCache = new Map<GlyphCacheKey, GlyphData>()
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private measureCanvas: HTMLCanvasElement
  private measureCtx: CanvasRenderingContext2D

  constructor()
  {
    // Main canvas for rasterization (kept large for precision)
    this.canvas = document.createElement('canvas')
    this.canvas.width = 512
    this.canvas.height = 512
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Failed to create canvas context for glyph rasterization')
    this.ctx = ctx

    // Separate canvas for text measurement
    this.measureCanvas = document.createElement('canvas')
    this.measureCanvas.width = 512
    this.measureCanvas.height = 512
    const measureCtx = this.measureCanvas.getContext('2d')
    if (!measureCtx) throw new Error('Failed to create measurement context')
    this.measureCtx = measureCtx
  }

  /**
   * Get or rasterize a glyph at specified font and size
   * Returns GlyphData with actual pixel dimensions (variable width/height)
   */
  getGlyph(
    char: string,
    fontFamily: string = 'Arial',
    fontSize: number = 16
  ): GlyphData
  {
    // Validate inputs
    if (!char || char.length === 0)
    {
      return this.createEmptyGlyph(char)
    }

    // For space and other whitespace, return minimal glyph
    if (/^\s$/.test(char))
    {
      return {
        width: Math.ceil(fontSize * 0.3),  // Space is ~30% of font size
        height: Math.ceil(fontSize),
        rows: [0]
      }
    }

    // Check cache
    const cacheKey = this.getCacheKey(char, fontFamily, fontSize)
    if (this.glyphCache.has(cacheKey))
    {
      return this.glyphCache.get(cacheKey)!
    }

    // Rasterize and cache
    const glyph = this.rasterizeGlyph(char, fontFamily, fontSize)
    this.glyphCache.set(cacheKey, glyph)
    return glyph
  }

  /**
   * Clear the glyph cache (useful when changing fonts or to free memory)
   */
  clearCache(): void
  {
    this.glyphCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; chars: number }
  {
    return {
      size: this.glyphCache.size,
      chars: new Set([...this.glyphCache.keys()].map(key => key.split(':')[0])).size
    }
  }

  /**
   * Measure the actual width of a string using rasterized glyph widths
   * This accounts for the actual pixels each glyph occupies,
   * fixing the overlap issue caused by font metric estimation mismatch.
   * 
   * @param text - Text to measure
   * @param fontFamily - Font name
   * @param fontSize - Font size in pixels
   * @param spacing - Extra pixels between characters (default 0)
   * @returns Width in pixels
   */
  measureText(
    text: string,
    fontFamily: string = 'Arial',
    fontSize: number = 16,
    spacing: number = 0
  ): number
  {
    if (!text) return 0

    let totalWidth = 0
    for (let i = 0; i < text.length; i++)
    {
      const char = text[i]
      const glyph = this.getGlyph(char, fontFamily, fontSize)
      totalWidth += glyph.width + spacing
    }

    // Remove trailing spacing from last character
    return Math.max(0, totalWidth - spacing)
  }

  // PRIVATE

  private getCacheKey(char: string, fontFamily: string, fontSize: number): GlyphCacheKey
  {
    return `${char}:${fontFamily}:${fontSize}`
  }

  private createEmptyGlyph(char: string): GlyphData
  {
    return {
      width: 1,
      height: 1,
      rows: [0b000000]
    }
  }

  /**
   * Rasterize a character to bitmap format
   * Returns GlyphData with actual detected dimensions and baseline offset
   */
  private rasterizeGlyph(
    char: string,
    fontFamily: string,
    fontSize: number
  ): GlyphData
  {
    // Render at 3x the requested size for precision, then scale to target
    // This gives better quality and slightly larger glyphs at small sizes
    const internalSize = fontSize * 3
    const font = `${internalSize}px "${fontFamily}", sans-serif`

    // Create temporary canvas for measurement and rendering
    const tempCanvas = document.createElement('canvas')
    const padding = 8  // Space around character
    tempCanvas.width = internalSize * 2 + padding * 2
    tempCanvas.height = internalSize * 2 + padding * 2
    
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    if (!tempCtx) throw new Error('Failed to create temp canvas for glyph')

    // Render character at a fixed baseline position
    // This ensures consistent vertical alignment across all characters
    const baselineY = internalSize + padding  // Y position of the baseline
    
    tempCtx.font = font
    tempCtx.textBaseline = 'alphabetic'  // Use alphabetic baseline
    tempCtx.fillStyle = '#ffffff'
    tempCtx.fillText(char, padding, baselineY)

    // Extract pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const data = imageData.data

    // Find actual bounding box (non-zero pixels)
    let minX = tempCanvas.width
    let maxX = 0
    let minY = tempCanvas.height
    let maxY = 0
    let hasPixels = false

    for (let i = 0; i < data.length; i += 4)
    {
      const alpha = data[i + 3]
      if (alpha > 128)  // Significant alpha threshold
      {
        hasPixels = true
        const pixelIdx = i / 4
        const x = pixelIdx % tempCanvas.width
        const y = Math.floor(pixelIdx / tempCanvas.width)

        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    // If no pixels found, return empty glyph
    if (!hasPixels)
    {
      return this.createEmptyGlyph(char)
    }

    // Crop to actual bounds with minimal padding
    const cropLeft = Math.max(0, minX - 1)
    const cropTop = Math.max(0, minY - 1)
    const cropWidth = Math.min(tempCanvas.width - cropLeft, maxX - minX + 3)
    const cropHeight = Math.min(tempCanvas.height - cropTop, maxY - minY + 3)

    // Calculate baseline offset relative to crop
    const yOffsetInInternal = baselineY - cropTop

    // Scale down from internal (3x) size to target fontSize
    // internalSize = fontSize * 3, so scale factor is 1/3
    const scale = 1 / 3
    const finalWidth = Math.max(1, Math.ceil(cropWidth * scale))
    const finalHeight = Math.max(1, Math.ceil(cropHeight * scale))
    const finalYOffset = Math.floor(yOffsetInInternal * scale)

    // Create final glyph canvas
    const glyphCanvas = document.createElement('canvas')
    glyphCanvas.width = finalWidth
    glyphCanvas.height = finalHeight
    const glyphCtx = glyphCanvas.getContext('2d', { willReadFrequently: true })
    if (!glyphCtx) throw new Error('Failed to create glyph canvas')

    // Copy and scale cropped region
    glyphCtx.drawImage(
      tempCanvas,
      cropLeft, cropTop, cropWidth, cropHeight,
      0, 0, finalWidth, finalHeight
    )

    // Convert to binary rows (1 bit per pixel, packed into numbers)
    const finalImageData = glyphCtx.getImageData(0, 0, finalWidth, finalHeight)
    const finalData = finalImageData.data

    const rows: number[] = []
    for (let y = 0; y < finalHeight; y++)
    {
      let rowValue = 0

      for (let x = 0; x < finalWidth && x < 32; x++)  // Max 32 bits per row
      {
        const pixelIdx = (y * finalWidth + x) * 4
        const alpha = finalData[pixelIdx + 3]

        // Set bit if pixel has significant alpha
        // Right-aligned: pixel at column x corresponds to bit (width - 1 - x)
        if (alpha > 128)
        {
          rowValue |= (1 << (finalWidth - 1 - x))
        }
      }

      rows.push(rowValue >>> 0)  // Ensure unsigned 32-bit
    }

    return {
      width: finalWidth,
      height: finalHeight,
      rows,
      yOffset: -finalYOffset  // Negative because rendering moves down from baseline
    }
  }
}

// Global singleton instance
let globalRasterizer: DynamicGlyphRasterizer | null = null

/**
 * Get the global rasterizer instance (lazy-initialized)
 */
export function getGlobalRasterizer(): DynamicGlyphRasterizer
{
  if (!globalRasterizer)
  {
    globalRasterizer = new DynamicGlyphRasterizer()
  }
  return globalRasterizer
}

// VIM: set filetype=typescript :
// END
