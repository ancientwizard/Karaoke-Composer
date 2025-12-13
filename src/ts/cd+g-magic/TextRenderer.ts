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
 * Convert CMP font face name to font index
 * CMP stores font names like "Arial", "BArial" (bold), "IArial" (italic), etc.
 * This function extracts the base font name and maps to index
 * @param cmpFontFace Font face name from CMP (e.g., "BArial", "Arial", "Courier")
 * @returns Font index (0-7+) or 0 (Arial) if not found
 */
export function getFontIndexFromCMPFace(cmpFontFace: string): number {
  if (!cmpFontFace) {
    return 0;  // Default to Arial
  }

  // CMP font names may have style prefixes: "B" (bold), "I" (italic), "BI" (bold-italic)
  // Extract the base font name by removing style prefix
  let baseName = cmpFontFace;
  
  // Remove leading style markers (B, I, BI)
  if (baseName.match(/^[BI]+/)) {
    baseName = baseName.replace(/^[BI]+/, '');
  }

  // Map base name to index
  const index = FONT_NAME_TO_INDEX[baseName];
  return index !== undefined ? index : 0;  // Default to Arial if not found
}

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
 * Initialize font system - loads real fonts from cache or downloads them
 * Called once at startup
 */
async function initFontSystem(): Promise<UnifiedFontSystem> {
  if (!fontSystem) {
    fontSystem = new UnifiedFontSystem();
    
    if (!fontInitialized) {
      fontInitialized = true;
      
      console.log('[TextRenderer] Initializing fonts (Arial, Courier, Times)...');
      try {
        await fontSystem.initializeFonts();
        console.log('[TextRenderer] Font system initialized');
      } catch (err) {
        console.warn('[TextRenderer] Font initialization error:', err);
        console.log('[TextRenderer] Will use bitmap fonts as fallback');
      }
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
 * Get or initialize the font system (synchronous wrapper with async init)
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
  // Pass fontIndex to renderer - index 0 uses improved Arial font
  const glyph = fonts.renderChar(char, fontSize, fontIndex);
  
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

/**
 * Measure the width of a text string in pixels
 * @param text Text to measure
 * @param fontSize Font size in points
 * @param fontIndex Font index (0-7+)
 * @returns Width in pixels
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontIndex: number = 0
): number {
  if (!text) {
    return 0;
  }

  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const glyph = getRawCharacterFromFont(char, fontSize, fontIndex);
    if (glyph) {
      totalWidth += glyph.width + 1;  // +1 for character spacing
    }
  }
  
  // Subtract last spacing
  if (totalWidth > 0) {
    totalWidth -= 1;
  }
  
  return totalWidth;
}

/**
 * Break text into lines that fit within a specified width
 * Uses word-boundaries to avoid breaking mid-word
 * @param text Text to wrap
 * @param maxWidth Maximum width in pixels
 * @param fontSize Font size in points
 * @param fontIndex Font index (0-7+)
 * @returns Array of lines that fit within maxWidth
 */
export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontIndex: number = 0
): string[] {
  if (!text || maxWidth <= 0) {
    return text ? [text] : [];
  }

  const lines: string[] = [];
  const words = text.split(/\s+/);
  let currentLine = '';

  for (const word of words) {
    // Try adding word to current line
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measureTextWidth(testLine, fontSize, fontIndex);

    if (testWidth <= maxWidth) {
      // Word fits, add it to current line
      currentLine = testLine;
    } else {
      // Word doesn't fit
      if (currentLine) {
        // Push current line and start new one
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word itself is longer than maxWidth, add it anyway to avoid infinite loop
        lines.push(word);
        currentLine = '';
      }
    }
  }

  // Push final line
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate optimal font size to fit text within specified width and height
 * @param text Text to fit
 * @param maxWidth Maximum width in pixels
 * @param maxHeight Maximum height in pixels
 * @param fontIndex Font index (0-7+)
 * @param minSize Minimum font size (default: 8)
 * @param maxSize Maximum font size (default: 32)
 * @returns Optimal font size in points
 */
export function calculateFitFontSize(
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontIndex: number = 0,
  minSize: number = 8,
  maxSize: number = 32
): number {
  // Binary search for optimal font size
  let low = minSize;
  let high = maxSize;
  let bestSize = minSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = wrapTextToWidth(text, maxWidth, mid, fontIndex);
    const height = getFontHeight(mid);
    const totalHeight = lines.length * height;

    if (totalHeight <= maxHeight && measureTextWidth(lines[0]!, mid, fontIndex) <= maxWidth) {
      // Size fits, try larger
      bestSize = mid;
      low = mid + 1;
    } else {
      // Size doesn't fit, try smaller
      high = mid - 1;
    }
  }

  return bestSize;
}

// VIM: set et sw=2 ts=2 :
// END
