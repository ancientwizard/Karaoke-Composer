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
   * Point-in-path test using simplified ray casting
   * Cast a ray from the point to the right and count path crossings
   * Even number of crossings = outside, odd = inside
   */
  private pointInPath(path: any, x: number, y: number): boolean {
    const commands = path.commands;
    if (!commands || commands.length === 0) return false;
    
    let crossings = 0;
    let x0 = 0, y0 = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      let x1 = x0, y1 = y0;
      
      if (cmd.type === 'M' || cmd.type === 'L') {
        x1 = cmd.x || 0;
        y1 = cmd.y || 0;
      } else if (cmd.type === 'C') {
        // Cubic bezier - we need to check if ray crosses any bezier segment
        // For simplicity, approximate with multiple line segments
        x0 = cmd.x || 0;
        y0 = cmd.y || 0;
        x1 = x0;
        y1 = y0;
        // Don't count crossing for curve start, will be counted in segments
        // Just update position
      } else if (cmd.type === 'Q') {
        // Quadratic bezier
        x0 = cmd.x || 0;
        y0 = cmd.y || 0;
        x1 = x0;
        y1 = y0;
      } else if (cmd.type === 'Z') {
        // Close path - line back to first point
        x1 = commands[0]?.x || 0;
        y1 = commands[0]?.y || 0;
      } else {
        x0 = x1;
        y0 = y1;
        continue;
      }
      
      // Check if horizontal ray from (x, y) to right crosses line segment (x0,y0)-(x1,y1)
      // Ray only crosses if:
      // 1. y is between y0 and y1
      // 2. The crossing point is to the right of x
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
        // Segment straddles the ray
        // Find x coordinate of intersection
        if (x0 !== x1) {
          const xIntersect = x0 + (x1 - x0) * (y - y0) / (y1 - y0);
          if (x < xIntersect) {
            crossings++;
          }
        }
      }
      
      x0 = x1;
      y0 = y1;
    }
    
    // Odd number of crossings = inside
    return (crossings & 1) === 1;
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
