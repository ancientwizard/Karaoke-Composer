/**
 * Unified Font System - Abstraction over multiple renderers
 *
 * Provides a single interface for font rendering that:
 * - Selects renderer based on font index (0-7 maps to different fonts)
 * - Loads real TTF fonts when available (Arial, Courier, Times New Roman, etc.)
 * - Falls back to bitmap fonts if real fonts unavailable
 * - Caches glyphs for performance
 * - Works in both Node.js and browser
 *
 * Font Priority:
 * 1. Real TTF/OTF fonts (via FontManager)
 * 2. Fallback bitmap fonts (high quality)
 *
 * Usage:
 *   const fonts = new UnifiedFontSystem();
 *   await fonts.initializeFonts();  // Load real fonts from cache or download
 *   const glyph = fonts.renderChar('A', 24, 0);  // fontIndex 0 = Arial
 */

import { FontGlyphRenderer, type RenderedGlyph as OpenTypeGlyph } from './FontGlyphRenderer';
import { FallbackBitmapFontRenderer, type RenderedGlyph as BitmapGlyph } from './FallbackBitmapFontRenderer';
import { FontManager } from './FontManager';

export type RenderedGlyph = OpenTypeGlyph | BitmapGlyph;

/**
 * Unified font system
 */
export class UnifiedFontSystem {
  private fontManager: FontManager;
  private renderers: Map<number, FontGlyphRenderer | null> = new Map();
  private fallback: FallbackBitmapFontRenderer;
  private currentSize = 12;
  private currentFontIndex = 0;

  constructor() {
    this.fontManager = new FontManager();
    this.fallback = new FallbackBitmapFontRenderer();
    this.fallback.setFontSize(this.currentSize);
  }

  /**
   * Initialize fonts - load real fonts from cache or download them
   * This should be called once at startup
   */
  async initializeFonts(): Promise<void> {
    console.log('[UnifiedFontSystem] Initializing fonts...');
    
    // Try to load fonts 0-2 (Arial, Courier, Times)
    for (let idx = 0; idx < 3; idx++) {
      const fontData = await this.fontManager.getFontData(idx);
      if (fontData) {
        const renderer = new FontGlyphRenderer();
        if (await renderer.loadFont(fontData)) {
          renderer.setFontSize(this.currentSize);
          this.renderers.set(idx, renderer);
          console.log(`[UnifiedFontSystem] Loaded real font: ${this.fontManager.getFontName(idx)}`);
        } else {
          this.renderers.set(idx, null);
        }
      } else {
        this.renderers.set(idx, null);
      }
    }
  }

  /**
   * Load a specific font from buffer or URL
   * @param fontIndex Font index (0-7)
   * @param config Font loading configuration
   * @returns true if font loaded successfully
   */
  async loadCustomFont(fontIndex: number, config: { fontPath?: string; fontData?: ArrayBuffer }): Promise<boolean> {
    try {
      const renderer = new FontGlyphRenderer();
      
      let fontData: ArrayBuffer | string | null = null;
      if (config.fontData) {
        fontData = config.fontData;
      } else if (config.fontPath) {
        fontData = config.fontPath;
      } else {
        return false;
      }

      if (fontData && await renderer.loadFont(fontData)) {
        renderer.setFontSize(this.currentSize);
        this.renderers.set(fontIndex, renderer);
        console.log(`[UnifiedFontSystem] Loaded custom font for index ${fontIndex}`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`Failed to load custom font for index ${fontIndex}:`, error);
      return false;
    }
  }

  /**
   * Set font size for all subsequent renders
   */
  setFontSize(size: number): void {
    this.currentSize = size;
    
    // Update all loaded renderers
    for (const renderer of this.renderers.values()) {
      if (renderer) {
        renderer.setFontSize(size);
      }
    }
    
    this.fallback.setFontSize(size);
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

    // Try real font renderer first (for indices 0-7)
    const renderer = this.renderers.get(fontIdx);
    if (renderer) {
      const glyph = renderer.renderGlyph(char);
      if (glyph) {
        return glyph;
      }
      console.warn(`Real font failed for index ${fontIdx}, falling back to bitmap`);
    }

    // Fall back to standard bitmap font
    return this.fallback.renderGlyph(char);
  }

  /**
   * Check if a real font is loaded for the given index
   */
  hasRealFont(fontIndex: number): boolean {
    return this.renderers.has(fontIndex) && this.renderers.get(fontIndex) !== null;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    for (const renderer of this.renderers.values()) {
      if (renderer) {
        renderer.clearCache();
      }
    }
    this.fallback.clearCache();
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
