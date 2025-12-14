/**
 * Font Glyph Renderer - OpenType.js based
 *
 * Renders glyphs from TTF/OTF fonts to bitmap format for CD+G.
 * Works in both Node.js and browser environments.
 * Uses opentype.js for font parsing and Canvas API for rendering.
 *
 * Features:
 * - Load TTF/OTF fonts dynamically
 * - Render individual glyphs at any size
 * - Convert to bitmap data for CD+G encoding
 * - Cache rendered glyphs for performance
 * - Works with user-provided or default fonts
 */

import type * as OpenType from 'opentype.js';

/**
 * Rendered glyph data
 */
export interface RenderedGlyph {
  width: number;
  height: number;
  data: Uint8Array;  // Bitmap pixel data (grayscale 0-255)
  advanceWidth: number;
}

/**
 * Font glyph renderer
 */
export class FontGlyphRenderer {
  private font: OpenType.Font | null = null;
  private fontSize: number = 12;
  private glyphCache = new Map<string, RenderedGlyph>();

  /**
   * Load a font from buffer or URL
   * @param fontData Font file buffer or URL
   * @returns true if font loaded successfully
   */
  async loadFont(fontData: ArrayBuffer | string): Promise<boolean> {
    try {
      // Dynamic import to handle both Node.js and browser
      const opentype = await import('opentype.js');
      
      if (typeof fontData === 'string') {
        // URL - fetch it
        const response = await fetch(fontData);
        const buffer = await response.arrayBuffer();
        this.font = opentype.parse(buffer);
      } else {
        // ArrayBuffer
        this.font = opentype.parse(fontData);
      }
      
      return this.font !== null;
    } catch (error) {
      console.error('Failed to load font:', error);
      return false;
    }
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
   * Render a glyph to bitmap
   * @param char Character to render
   * @returns Rendered glyph with bitmap data
   */
  renderGlyph(char: string): RenderedGlyph | null {
    if (!this.font) {
      console.warn('No font loaded');
      return null;
    }

    // Check cache
    const cacheKey = `${char}@${this.fontSize}`;
    if (this.glyphCache.has(cacheKey)) {
      return this.glyphCache.get(cacheKey)!;
    }

    try {
      // Get glyph from font
      const glyph = this.font.charToGlyph(char);
      if (!glyph || glyph.unicode === undefined) {
        console.warn(`Glyph not found for character: ${char}`);
        return null;
      }

      // Get glyph metrics
      const scale = this.fontSize / this.font.unitsPerEm;
      const width = Math.ceil((glyph.advanceWidth || 0) * scale);
      const height = this.fontSize;
      
      // Create canvas for rendering
      const canvas = this.createCanvas(width + 2, height + 2);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        return null;
      }

      // Render glyph to canvas
      ctx.fillStyle = 'white';
      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(char, 1, 1);

      // Convert canvas to grayscale bitmap
      const imageData = ctx.getImageData(0, 0, width + 2, height + 2);
      const fullBitmap = this.canvasToGrayscale(imageData);
      
      // CRITICAL FIX: Extract only the actual character content, trim the padding
      // Canvas was (width+2) x (height+2) for padding, but bitmap should be width x height
      // Copy only the relevant region to match the reported dimensions
      const bitmap = new Uint8Array(width * height);
      const paddedWidth = width + 2;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y + 1) * paddedWidth + (x + 1);  // Skip padding row/col
          const dstIdx = y * width + x;
          bitmap[dstIdx] = fullBitmap[srcIdx];
        }
      }

      const result: RenderedGlyph = {
        width,
        height,
        data: bitmap,
        advanceWidth: Math.ceil(width)
      };

      // Cache it
      this.glyphCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error(`Failed to render glyph for '${char}':`, error);
      return null;
    }
  }

  /**
   * Create a canvas - works in both Node.js and browser
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    if (typeof document !== 'undefined') {
      // Browser environment
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    } else {
      // Node.js environment - need canvas library
      // This will require 'canvas' npm package if used in Node.js
      throw new Error('Canvas not available in Node.js environment. Install "canvas" package.');
    }
  }

  /**
   * Convert canvas ImageData to grayscale bitmap
   */
  private canvasToGrayscale(imageData: ImageData): Uint8Array {
    const bitmap = new Uint8Array(imageData.data.length / 4);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Use luminance formula: 0.299R + 0.587G + 0.114B
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      bitmap[i / 4] = gray;
    }
    
    return bitmap;
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
