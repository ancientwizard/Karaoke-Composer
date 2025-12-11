/**
 * Text Renderer for CD+G
 *
 * Converts text strings to CD+G pixel data.
 * Uses UnifiedFontSystem with bitmap font (Canvas not available in Node.js/Flatpak).
 */

import { UnifiedFontSystem } from './UnifiedFontSystem';

// Global font system instance
let fontSystem: UnifiedFontSystem | null = null;
let fontInitialized = false;

/**
 * Note: TTF font loading would require Node.js 'canvas' package which fails in Flatpak.
 * Using bitmap-only mode instead - faster and more compatible.
 */

/**
 * Initialize font system (called once at startup)
 */
async function initFontSystem(): Promise<UnifiedFontSystem> {
  if (!fontSystem) {
    fontSystem = new UnifiedFontSystem();
    
    if (!fontInitialized) {
      fontInitialized = true;
      
      // Use bitmap font (Canvas unavailable in Node.js/Flatpak)
      console.log('[TextRenderer] Initializing with bitmap font');
      await fontSystem.loadFont({ fallbackOnly: true }).catch(err => {
        console.warn('Failed to load bitmap font:', err);
      });
    }
  }
  return fontSystem;
}

/**
 * Public export for external initialization
 * Call this before rendering to ensure fonts are loaded
 */
export async function initializeTextRenderer(): Promise<void> {
  await initFontSystem();
}

/**
 * Get or initialize the font system (synchronous wrapper)
 */
function getFontSystem(): UnifiedFontSystem {
  if (!fontSystem) {
    fontSystem = new UnifiedFontSystem();
    // Initialize asynchronously in background
    initFontSystem().catch(err => {
      console.warn('[TextRenderer] Font initialization error:', err);
    });
  }
  return fontSystem;
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
