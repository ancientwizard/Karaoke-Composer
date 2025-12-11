/**
 * Text Renderer for CD+G
 *
 * Converts text strings to CD+G pixel data.
 * Uses UnifiedFontSystem with opentype.js (TTF/OTF) and fallback bitmap font.
 */

import { UnifiedFontSystem } from './UnifiedFontSystem';

// Global font system instance
let fontSystem: UnifiedFontSystem | null = null;

/**
 * Initialize font system (called once at startup)
 */
function initFontSystem(): UnifiedFontSystem {
  if (!fontSystem) {
    fontSystem = new UnifiedFontSystem();
    // Use fallback bitmap font by default
    fontSystem.loadFont({ fallbackOnly: true }).catch(err => {
      console.warn('Failed to load font system:', err);
    });
  }
  return fontSystem;
}

/**
 * Get or initialize the font system
 */
function getFontSystem(): UnifiedFontSystem {
  return initFontSystem();
}

/**
 * Get rendered character from font system
 * @param char Character to render
 * @param fontSize Font size in points
 * @returns Glyph data with bitmap or null if unavailable
 */
export function getRawCharacterFromFont(
  char: string,
  fontSize: number
): { width: number; height: number; data: Uint8Array } | null {
  const fonts = getFontSystem();
  const glyph = fonts.renderChar(char, fontSize);
  
  if (glyph) {
    return {
      width: glyph.width,
      height: glyph.height,
      data: glyph.data
    };
  }
  
  return null;
}

/**
 * Get font height in pixels for a given font size
 */
export function getFontHeight(fontSize: number): number {
  // Fallback to simple calculation based on requested size
  // Font size in points typically means height in pixels at 72 DPI
  return Math.round(fontSize * 1.3); // Typical descender adjustment
}

// VIM: set et sw=2 ts=2 :
// END
