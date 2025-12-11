/**
 * Text Renderer for CD+G
 *
 * Converts text strings to CD+G pixel data.
 * Uses UnifiedFontSystem with bitmap font (Canvas not available in Node.js/Flatpak).
 *
 * Font Index Mapping (from CD+Graphics Magic standard):
 * 0 = Arial (default, sans-serif)
 * 1 = Courier (monospace)
 * 2 = Times New Roman (serif)
 * 3+ = Other fonts if available
 */

import { UnifiedFontSystem } from './UnifiedFontSystem';

// Font index to display name mapping
export const FONT_INDEX_MAP = {
  0: 'Arial',
  1: 'Courier',
  2: 'Times New Roman',
  3: 'Helvetica',
  4: 'Georgia',
  5: 'Verdana',
  6: 'Comic Sans MS',
  7: 'Impact'
} as const;

// Reverse mapping for convenience
export const FONT_NAME_TO_INDEX: Record<string, number> = {
  'Arial': 0,
  'Courier': 1,
  'Times New Roman': 2,
  'Helvetica': 3,
  'Georgia': 4,
  'Verdana': 5,
  'Comic Sans MS': 6,
  'Impact': 7
};

/**
 * Get font name from font index
 * @param fontIndex Font index (0-7+)
 * @returns Font name string
 */
export function getFontNameFromIndex(fontIndex: number): string {
  return FONT_INDEX_MAP[fontIndex as keyof typeof FONT_INDEX_MAP] || 'Arial';
}

/**
 * Get font index from font name
 * @param fontName Font name
 * @returns Font index (0-7+), defaults to 0 (Arial) if not found
 */
export function getFontIndexFromName(fontName: string): number {
  return FONT_NAME_TO_INDEX[fontName] ?? 0;
}

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
 * Get rendered character from font system with optional font index
 * @param char Character to render
 * @param fontSize Font size in points
 * @param fontIndex Optional font index (0-7+), defaults to 0 (Arial)
 * @returns Glyph data with bitmap or null if unavailable
 */
export function getRawCharacterFromFont(
  char: string,
  fontSize: number,
  fontIndex: number = 0
): { width: number; height: number; data: Uint8Array } | null {
  const fonts = getFontSystem();
  // Currently, font index selection is informational only (future enhancement)
  // All text uses unified bitmap renderer which is font-agnostic
  // TODO: Implement per-font bitmap renderer or TTF loader once Canvas is available
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
