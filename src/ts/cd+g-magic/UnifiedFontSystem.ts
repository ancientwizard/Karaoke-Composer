/**
 * Unified Font System - Abstraction over multiple renderers
 *
 * Provides a single interface for font rendering that:
 * - Selects renderer based on font index (0-7 maps to different fonts)
 * - Index 0 (Arial) uses improved Arial bitmap font
 * - Other indices use fallback bitmap font
 * - Tries opentype.js first if available (TTF/OTF support)
 * - Falls back to bitmap font if needed
 * - Caches glyphs for performance
 * - Works in both Node.js and browser
 *
 * Usage:
 *   const fonts = new UnifiedFontSystem();
 *   await fonts.loadFont('arial.ttf');  // Optional
 *   const glyph = fonts.renderChar('A', 24, 0);  // fontIndex 0 = Arial
 */

import { FontGlyphRenderer, type RenderedGlyph as OpenTypeGlyph } from './FontGlyphRenderer';
import { FallbackBitmapFontRenderer, type RenderedGlyph as BitmapGlyph } from './FallbackBitmapFontRenderer';
import { ArialBitmapFontRenderer, type RenderedGlyph as ArialGlyph } from './ArialBitmapFontRenderer';

export type RenderedGlyph = OpenTypeGlyph | BitmapGlyph | ArialGlyph;

/**
 * Font loading configuration
 */
export interface FontLoadConfig {
  fontPath?: string;      // Path to TTF/OTF file
  fontData?: ArrayBuffer;  // Raw font data (ArrayBuffer)
  fallbackOnly?: boolean;  // Skip opentype.js, use bitmap only
}

/**
 * Unified font system
 */
export class UnifiedFontSystem {
  private opentype: FontGlyphRenderer | null = null;
  private fallback: FallbackBitmapFontRenderer;
  private arial: ArialBitmapFontRenderer;
  private useOpentype = false;
  private currentSize = 12;
  private currentFontIndex = 0;

  constructor() {
    this.fallback = new FallbackBitmapFontRenderer();
    this.fallback.setFontSize(this.currentSize);
    this.arial = new ArialBitmapFontRenderer();
    this.arial.setFontSize(this.currentSize);
  }

  /**
   * Load a font, automatically detecting format
   * @param config Font loading configuration
   * @returns true if font loaded successfully
   */
  async loadFont(config: FontLoadConfig): Promise<boolean> {
    if (config.fallbackOnly) {
      return true;  // Just return true, don't log - we'll log at higher level
    }

    try {
      this.opentype = new FontGlyphRenderer();
      
      // Try to load from either path or raw data
      if (config.fontData) {
        const loaded = await this.opentype.loadFont(config.fontData);
        if (loaded) {
          this.opentype.setFontSize(this.currentSize);
          this.useOpentype = true;
          console.log('[UnifiedFontSystem] Loaded font from raw data');
          return true;
        }
      } else if (config.fontPath) {
        const loaded = await this.opentype.loadFont(config.fontPath);
        if (loaded) {
          this.opentype.setFontSize(this.currentSize);
          this.useOpentype = true;
          console.log(`[UnifiedFontSystem] Loaded font: ${config.fontPath}`);
          return true;
        }
      } else {
        return false;  // No font source provided
      }
      
      this.useOpentype = false;
      return false;
    } catch (error) {
      this.useOpentype = false;
      return false;
    }
  }

  /**
   * Set font size for all subsequent renders
   */
  setFontSize(size: number): void {
    this.currentSize = size;
    
    if (this.useOpentype && this.opentype) {
      this.opentype.setFontSize(size);
    }
    
    this.fallback.setFontSize(size);
    this.arial.setFontSize(size);
  }

  /**
   * Set font index (0-7 for different font families)
   */
  setFontIndex(index: number): void {
    this.currentFontIndex = Math.max(0, Math.min(7, index));
  }

  /**
   * Render a character to bitmap glyph
   * @param char Character to render
   * @param size Optional size override (points)
   * @param fontIndex Optional font index (0-7), defaults to current/0
   * @returns Rendered glyph with bitmap data
   */
  renderChar(char: string, size?: number, fontIndex?: number): RenderedGlyph | null {
    if (size !== undefined && size !== this.currentSize) {
      this.setFontSize(size);
    }
    
    const fontIdx = fontIndex !== undefined ? fontIndex : this.currentFontIndex;

    // Try opentype first
    if (this.useOpentype && this.opentype) {
      const glyph = this.opentype.renderGlyph(char);
      if (glyph) {
        return glyph;
      }
      console.warn(`opentype.js failed to render '${char}', falling back`);
    }

    // Select font renderer based on index
    // Index 0 = Arial (improved bitmap), others = standard fallback
    if (fontIdx === 0) {
      const glyph = this.arial.renderGlyph(char);
      if (glyph) {
        return glyph;
      }
    }

    // Fall back to standard bitmap font
    return this.fallback.renderGlyph(char);
  }

  /**
   * Check if currently using opentype renderer
   */
  isUsingOpenType(): boolean {
    return this.useOpentype;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    if (this.opentype) {
      this.opentype.clearCache();
    }
    this.fallback.clearCache();
    this.arial.clearCache();
  }

  /**
   * Get font metrics (width of rendered text)
   * @param text Text to measure
   * @param size Optional size override
   * @param fontIndex Optional font index (0-7)
   * @returns Pixel width of rendered text
   */
  measureText(text: string, size?: number, fontIndex?: number): number {
    if (size !== undefined && size !== this.currentSize) {
      this.setFontSize(size);
    }

    let width = 0;
    for (const char of text) {
      const glyph = this.renderChar(char, undefined, fontIndex);
      if (glyph) {
        width += glyph.advanceWidth;
      }
    }
    return width;
  }
}

// VIM: set ft=typescript :
// END
