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
 * 2. Improved bitmap fonts (high quality, most characters)
 * 3. Fallback bitmap fonts (all characters)
 *
 * Usage:
 *   const fonts = new UnifiedFontSystem();
 *   await fonts.initializeFonts();  // Load real fonts from cache or download
 *   const glyph = fonts.renderChar('A', 24, 0);  // fontIndex 0 = Arial
 */

import { FontGlyphRenderer, type RenderedGlyph as OpenTypeGlyph } from './FontGlyphRenderer';
import { FallbackBitmapFontRenderer, type RenderedGlyph as BitmapGlyph } from './FallbackBitmapFontRenderer';
import { ImprovedBitmapFontRenderer } from './ImprovedBitmapFontRenderer';
import { FontManager } from './FontManager';

export type RenderedGlyph = OpenTypeGlyph | BitmapGlyph;

/**
 * Unified font system
 */
export class UnifiedFontSystem {
  static DEBUG = false;  // Set to true to enable renderer tracking logs
  static FORCE_FALLBACK = false;  // Set to true to skip Improved renderer, use only Fallback
  
  private fontManager: FontManager;
  private renderers: Map<number, FontGlyphRenderer | null> = new Map();
  private improved: ImprovedBitmapFontRenderer;
  private fallback: FallbackBitmapFontRenderer;
  private currentSize = 12;
  private currentFontIndex = 0;
  private rendererUsageStats = {
    ttf: 0,
    improved: 0,
    fallback: 0
  };

  constructor() {
    this.fontManager = new FontManager();
    this.improved = new ImprovedBitmapFontRenderer();
    this.improved.setFontSize(this.currentSize);
    this.fallback = new FallbackBitmapFontRenderer();
    this.fallback.setFontSize(this.currentSize);
  }

  /**
   * Initialize fonts - load real fonts from cache or download them
   * This should be called once at startup
   */
  async initializeFonts(): Promise<void> {
    console.log('[UnifiedFontSystem] Initializing fonts...');
    
    // Check environment variable for forced fallback mode
    if (process.env.FORCE_FALLBACK === '1' || process.env.FORCE_FALLBACK === 'true') {
      UnifiedFontSystem.FORCE_FALLBACK = true;
      console.log('[UnifiedFontSystem] FORCE_FALLBACK=1 detected, using only Fallback renderer');
    }
    
    // Check if canvas is available (required for real font rendering)
    const canvasAvailable = await this.checkCanvasAvailability();
    if (!canvasAvailable) {
      console.log('[UnifiedFontSystem] Canvas not available, using bitmap fonts only');
      // Set all renderers to null to use fallback bitmap fonts
      for (let idx = 0; idx < 8; idx++) {
        this.renderers.set(idx, null);
      }
      return;
    }
    
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
   * Check if canvas is available in this environment
   */
  private async checkCanvasAvailability(): Promise<boolean> {
    try {
      // Try to dynamically detect if we can use canvas
      // In Node.js, this will fail unless canvas package is installed
      if (typeof window !== 'undefined') {
        // Browser environment - canvas should be available
        return true;
      }
      
      // Node.js environment - canvas would need native bindings
      // Return false to use bitmap fonts
      return false;
    } catch {
      return false;
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
    
    this.improved.setFontSize(size);
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
        this.rendererUsageStats.ttf++;
        if (UnifiedFontSystem.DEBUG) {
          const bitmapSize = glyph.data ? glyph.data.length : 0;
          console.log(
            `[UnifiedFontSystem] TTF renderer: '${char}' (size=${size ?? this.currentSize}, fontIdx=${fontIdx}) ` +
            `bitmap=${bitmapSize}B, width=${glyph.width}, height=${glyph.height}, advanceWidth=${glyph.advanceWidth}`
          );
        }
        return glyph;
      }
      if (UnifiedFontSystem.DEBUG) {
        console.log(`[UnifiedFontSystem] TTF renderer returned null for '${char}' (fontIdx=${fontIdx})`);
      }
    }

    // Try improved bitmap font (high quality, has uppercase A-Z, numbers, most punctuation)
    // Skip if FORCE_FALLBACK is enabled
    if (!UnifiedFontSystem.FORCE_FALLBACK) {
      const improvedGlyph = this.improved.renderGlyph(char);
      if (improvedGlyph) {
        this.rendererUsageStats.improved++;
        if (UnifiedFontSystem.DEBUG) {
          const bitmapSize = improvedGlyph.data ? improvedGlyph.data.length : 0;
          console.log(
            `[UnifiedFontSystem] Improved bitmap renderer: '${char}' (size=${size ?? this.currentSize}) ` +
            `bitmap=${bitmapSize}B, width=${improvedGlyph.width}, height=${improvedGlyph.height}, advanceWidth=${improvedGlyph.advanceWidth}`
          );
        }
        return improvedGlyph;
      }
      
      if (UnifiedFontSystem.DEBUG) {
        console.log(`[UnifiedFontSystem] Improved bitmap renderer returned null for '${char}'`);
      }
    }

    // Final fallback to fallback bitmap font (complete character coverage)
    const fallbackGlyph = this.fallback.renderGlyph(char);
    if (fallbackGlyph) {
      this.rendererUsageStats.fallback++;
      if (UnifiedFontSystem.DEBUG) {
        const bitmapSize = fallbackGlyph.data ? fallbackGlyph.data.length : 0;
        console.log(
          `[UnifiedFontSystem] Fallback bitmap renderer: '${char}' (size=${size ?? this.currentSize}) ` +
          `bitmap=${bitmapSize}B, width=${fallbackGlyph.width}, height=${fallbackGlyph.height}, advanceWidth=${fallbackGlyph.advanceWidth}`
        );
      }
      return fallbackGlyph;
    }
    
    console.warn(`[UnifiedFontSystem] ALL renderers failed for char '${char}' (code=${char.charCodeAt(0)})`);
    return null;
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

  /**
   * Get renderer usage statistics
   * @returns Object with counts of which renderer was used for each glyph
   */
  getRendererStats() {
    return {
      ttf: this.rendererUsageStats.ttf,
      improved: this.rendererUsageStats.improved,
      fallback: this.rendererUsageStats.fallback,
      total: this.rendererUsageStats.ttf + this.rendererUsageStats.improved + this.rendererUsageStats.fallback
    };
  }

  /**
   * Reset renderer statistics
   */
  resetStats(): void {
    this.rendererUsageStats.ttf = 0;
    this.rendererUsageStats.improved = 0;
    this.rendererUsageStats.fallback = 0;
  }
}

// vim: set ft=typescript :
// END
