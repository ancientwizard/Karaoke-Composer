/**
 * Text Renderer for CD+G
 *
 * Converts text strings to CD+G pixel data.
 * Supports pre-rendered bitmap fonts (12pt, 18pt, 24pt) as primary method,
 * with fallback to simple 5x7 bitmap font.
 */

// Import font modules at module load time (ESM)
import * as font12Module from '@/fonts/monospace/12/index';
import * as font18Module from '@/fonts/monospace/18/index';
import * as font24Module from '@/fonts/monospace/24/index';

// Font metadata cache
let fontMetadata: Record<number, any> = {};

/**
 * Map requested font size to available font size
 * We only have fonts for 12, 18, 24pt
 * @param fontSize Requested font size (in points)
 * @returns Nearest available font size
 */
function mapFontSize(fontSize: number): number {
  // Snap to nearest available size
  if (fontSize >= 21) {
    return 24;
  } else if (fontSize >= 15) {
    return 18;
  }
  return 12;
}

/**
 * Get font module and metadata for a size
 * All fonts are imported at module load time
 */
function getFontModule(fontSize: number): any | null {
  const mappedSize = mapFontSize(fontSize);
  try {
    switch (mappedSize) {
      case 12:
        return font12Module;
      case 18:
        return font18Module;
      case 24:
        return font24Module;
      default:
        return null;
    }
  } catch (e) {
    console.warn(`Failed to load font ${fontSize}pt:`, e);
    return null;
  }
}

/**
 * Get font metadata (height, avgWidth, etc.)
 */
function loadFontMetadata(fontSize: number): { width: number; height: number } | null {
  if (fontMetadata[fontSize]) {
    return fontMetadata[fontSize];
  }

  const font = getFontModule(fontSize);
  if (!font || !font.FONT_METADATA) {
    return null;
  }

  fontMetadata[fontSize] = {
    width: font.FONT_METADATA.avgWidth,
    height: font.FONT_METADATA.height
  };

  return fontMetadata[fontSize];
}

/**
 * Get character data from pre-rendered font
 * Loads font lazily on first use
 */
function getCharacterFromFont(
  char: string,
  fontSize: number
): { code: number; char: string; width: number; height: number; data: Uint8Array } | null {
  const font = getFontModule(fontSize);
  if (!font) return null;

  const charCode = char.charCodeAt(0);
  return font.getCharacter(charCode) || null;
}

/**
 * Get pre-rendered character at native size (no scaling)
 * Returns {width, height, pixels} for direct rendering
 */
export function getRawCharacterFromFont(
  char: string,
  fontSize: number
): { width: number; height: number; data: Uint8Array } | null {
  const charData = getCharacterFromFont(char, fontSize);
  if (!charData) {
    return null;
  }

  return {
    width: charData.width,
    height: charData.height,
    data: charData.data
  };
}

/**
 * Render a character from pre-rendered font data to a target BMP region
 * DEPRECATED: Use getRawCharacterFromFont instead - don't scale fonts
 * Scales the pre-rendered character to the target region if needed
 */
export function renderCharacterFromFontToRegion(
  char: string,
  fontSize: number,
  targetWidth: number,
  targetHeight: number,
  foregroundColor: number,
  backgroundColor: number
): Uint8Array | null {
  const charData = getCharacterFromFont(char, fontSize);
  if (!charData) {
    return null;
  }

  const srcData = charData.data;
  const srcWidth = charData.width;
  const srcHeight = charData.height;

  // Create target bitmap
  const dstData = new Uint8Array(targetWidth * targetHeight);
  dstData.fill(backgroundColor);

  // Simple nearest-neighbor scaling
  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;

  for (let dstY = 0; dstY < targetHeight; dstY++) {
    for (let dstX = 0; dstX < targetWidth; dstX++) {
      const srcX = Math.floor(dstX * scaleX);
      const srcY = Math.floor(dstY * scaleY);

      if (srcX < srcWidth && srcY < srcHeight) {
        const srcIdx = srcY * srcWidth + srcX;
        const gray = srcData[srcIdx];
        const color = gray > 127 ? foregroundColor : backgroundColor;
        const dstIdx = dstY * targetWidth + dstX;
        dstData[dstIdx] = color;
      }
    }
  }

  return dstData;
}

/**
 * Get character width in pixels for a given font size
 */
export function getCharacterWidth(char: string, fontSize: number): number {
  const charData = getCharacterFromFont(char, fontSize);
  return charData ? charData.width : 6;  // Default to 6 if not found
}

/**
 * Get font height in pixels
 */
export function getFontHeight(fontSize: number): number {
  // Map requested size to available font size
  // Snap to nearest available (12, 18, 24)
  let mappedSize = 12;
  if (fontSize >= 21) {
    mappedSize = 24;
  } else if (fontSize >= 15) {
    mappedSize = 18;
  }

  const meta = loadFontMetadata(mappedSize);
  if (meta) {
    return meta.height;
  }

  // Fallback to hardcoded values (shouldn't reach here with valid mapped size)
  switch (mappedSize) {
    case 12:
      return 14;
    case 18:
      return 21;
    case 24:
      return 21;
    default:
      return 12;
  }
}

// Simple 5x7 bitmap font data (ASCII characters 32-126)
// Used as fallback when pre-rendered fonts are not available
const SIMPLE_FONT_5x7 = {
  // Space
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  // Punctuation
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x06],
  ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x08],
  ':': [0x00, 0x06, 0x06, 0x00, 0x06, 0x06, 0x00],
  ';': [0x00, 0x06, 0x06, 0x00, 0x0C, 0x08, 0x00],
  '!': [0x04, 0x04, 0x04, 0x04, 0x00, 0x04, 0x00],
  '?': [0x0E, 0x11, 0x10, 0x08, 0x04, 0x00, 0x04],
  // Numbers
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
  '4': [0x08, 0x0C, 0x0A, 0x09, 0x1F, 0x08, 0x08],
  '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  // Uppercase
  'A': [0x04, 0x0A, 0x11, 0x11, 0x1F, 0x11, 0x11],
  'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
  'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'Q': [0x0E, 0x11, 0x11, 0x11, 0x13, 0x12, 0x0D],
  'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
  'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x0A, 0x0A, 0x04, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'X': [0x11, 0x0A, 0x0A, 0x04, 0x0A, 0x0A, 0x11],
  'Y': [0x11, 0x0A, 0x0A, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  // Lowercase (same as uppercase for now)
  'a': [0x00, 0x0E, 0x01, 0x0F, 0x11, 0x11, 0x0F],
  'b': [0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x1E],
  'c': [0x00, 0x0E, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'd': [0x01, 0x01, 0x0F, 0x11, 0x11, 0x11, 0x0F],
  'e': [0x0E, 0x11, 0x1F, 0x10, 0x10, 0x11, 0x0E],
  'f': [0x06, 0x09, 0x08, 0x1C, 0x08, 0x08, 0x08],
  'g': [0x0F, 0x11, 0x11, 0x0F, 0x01, 0x11, 0x0E],
  'h': [0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x11],
  'i': [0x04, 0x00, 0x0C, 0x04, 0x04, 0x04, 0x0E],
  'j': [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0C],
  'k': [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  'l': [0x0C, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'm': [0x00, 0x1A, 0x15, 0x15, 0x11, 0x11, 0x11],
  'n': [0x00, 0x1E, 0x11, 0x11, 0x11, 0x11, 0x11],
  'o': [0x00, 0x0E, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'p': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'q': [0x0F, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x01],
  'r': [0x00, 0x1E, 0x11, 0x10, 0x10, 0x10, 0x10],
  's': [0x00, 0x0F, 0x10, 0x0E, 0x01, 0x11, 0x0E],
  't': [0x08, 0x1C, 0x08, 0x08, 0x08, 0x09, 0x06],
  'u': [0x00, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0F],
  'v': [0x00, 0x11, 0x11, 0x0A, 0x0A, 0x04, 0x04],
  'w': [0x00, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'x': [0x00, 0x11, 0x0A, 0x04, 0x04, 0x0A, 0x11],
  'y': [0x11, 0x11, 0x0F, 0x01, 0x01, 0x11, 0x0E],
  'z': [0x00, 0x1F, 0x02, 0x04, 0x08, 0x10, 0x1F],
} as Record<string, number[]>;

/**
 * Render a single text character into a 6x12 pixel tile
 * Returns a 12-byte array representing the tile bitmap
 *
 * @param char Character to render
 * @param foregroundColor Foreground color index (0-15)
 * @param backgroundColor Background color index (0-15)
 * @returns 12-byte tile bitmap and color indices [color1, color2, bitmap]
 */
export function renderCharacterTile(
  char: string,
  foregroundColor: number = 15,
  backgroundColor: number = 0
): [number, number, Uint8Array] {
  // Get font data for character (default to space if not found)
  const fontData = SIMPLE_FONT_5x7[char] || SIMPLE_FONT_5x7[' ']!;

  // Create 12-byte tile bitmap
  // Each byte represents one row of the tile
  // Bits are set where the character is drawn
  const bitmap = new Uint8Array(12);

  for (let row = 0; row < 12; row++) {
    let byte = 0;

    if (row < 7) {
      // Font is 5 bits wide, center it in 6 bits
      const fontRow = fontData[row]!;
      // Shift left by 1 to center in 6-bit space
      byte = (fontRow << 1) & 0x3F;
    }
    // Rows 7-11 are empty (bottom padding)

    bitmap[row] = byte;
  }

  return [foregroundColor, backgroundColor, bitmap];
}

/**
 * Render text centered in a tile block
 * For simple cases where we just want to display text
 *
 * @param text Text to render (first character used)
 * @param foregroundColor Foreground color (0-15)
 * @param backgroundColor Background color (0-15)
 * @returns Tile block data [color1, color2, bitmap]
 */
export function renderTextToTile(
  text: string,
  foregroundColor: number = 15,
  backgroundColor: number = 0
): [number, number, Uint8Array] {
  if (!text || text.length === 0) {
    // Empty tile
    const bitmap = new Uint8Array(12);
    return [backgroundColor, backgroundColor, bitmap];
  }

  // Render the first character of the text
  return renderCharacterTile(text[0]!, foregroundColor, backgroundColor);
}

/**
 * Render multiple lines of text to a grid of tile blocks
 * Returns a map of tile positions to their rendered content
 *
 * @param lines Array of text lines
 * @param foregroundColor Foreground color (0-15)
 * @param backgroundColor Background color (0-15)
 * @param charsPerLine Characters per line (default 6 for single character per tile)
 * @returns Map of {x, y} to [color1, color2, bitmap]
 */
export function renderTextGrid(
  lines: string[],
  foregroundColor: number = 15,
  backgroundColor: number = 0
): Map<string, [number, number, Uint8Array]> {
  const tiles = new Map<string, [number, number, Uint8Array]>();

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      if (charIdx >= 6) break; // Max 6 chars per line in a 50-tile-wide screen
      if (lineIdx >= 18) break; // Max 18 lines in screen

      const char = line[charIdx]!;
      const tileData = renderCharacterTile(char, foregroundColor, backgroundColor);

      // Position this character as a tile
      const tileKey = `${charIdx},${lineIdx}`;
      tiles.set(tileKey, tileData);
    }
  }

  return tiles;
}

// VIM: set et sw=2 ts=2 :
// END
