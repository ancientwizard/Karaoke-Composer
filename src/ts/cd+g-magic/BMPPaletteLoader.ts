/**
 * BMP Palette Loader - Extract palette from BMP files
 *
 * Reads Windows BMP file format and extracts the color palette
 * for use in CD+G palette packets.
 * Supports standard 256-color palettes at standard BMP locations.
 */

/**
 * Extract palette from a BMP file
 *
 * BMP format:
 * - Bytes 0-1: File signature "BM"
 * - Bytes 2-5: File size
 * - Bytes 10-13: Offset to pixel data
 * - Bytes 14-17: DIB header size
 * - Bytes 18-21: Image width
 * - Bytes 22-25: Image height
 * - Bytes 28-29: Bits per pixel
 * - After DIB header: Color palette (if bits per pixel <= 8)
 *
 * @param bmpBuffer BMP file contents as Uint8Array
 * @returns Array of [R, G, B] tuples (6-bit CD+G format), max 16 colors
 */
export function extractBMPPalette(bmpBuffer: Uint8Array): Array<[number, number, number]> {
  // Check BMP signature
  if (bmpBuffer.length < 26) {
    throw new Error('BMP file too small');
  }

  const signature = String.fromCharCode(bmpBuffer[0]!, bmpBuffer[1]!);
  if (signature !== 'BM') {
    throw new Error('Not a valid BMP file');
  }

  // Read DIB header offset and size
  const dibOffset = readUint32LE(bmpBuffer, 14);
  const bitsPerPixel = readUint16LE(bmpBuffer, 28);

  // Only process indexed color images
  if (bitsPerPixel > 8) {
    throw new Error(`BMP has ${bitsPerPixel} bits per pixel, expected 8 or less for indexed color`);
  }

  // Color palette starts immediately after DIB header
  // Each color is 4 bytes: B, G, R, reserved (0)
  const paletteOffset = 14 + dibOffset;
  const maxColors = Math.min(1 << bitsPerPixel, 256); // 2^bits_per_pixel, max 256

  const palette: Array<[number, number, number]> = [];

  for (let i = 0; i < maxColors && i < 16; i++) {
    // CD+G only supports 16 colors max
    const offset = paletteOffset + i * 4;
    if (offset + 3 >= bmpBuffer.length) {
      // Palette entry missing
      palette.push([0, 0, 0]); // Default to black
      continue;
    }

    // BMP stores as BGR (reversed), convert to RGB
    // Also convert from 8-bit to 6-bit for CD+G
    const b_8bit = bmpBuffer[offset]!;
    const g_8bit = bmpBuffer[offset + 1]!;
    const r_8bit = bmpBuffer[offset + 2]!;

    // Convert 8-bit to 6-bit by dividing by ~4.25 (or shifting right by 2)
    const r_6bit = Math.round((r_8bit / 255) * 63);
    const g_6bit = Math.round((g_8bit / 255) * 63);
    const b_6bit = Math.round((b_8bit / 255) * 63);

    palette.push([r_6bit, g_6bit, b_6bit]);
  }

  // Pad to 16 colors with black
  while (palette.length < 16) {
    palette.push([0, 0, 0]);
  }

  return palette;
}

/**
 * Read 32-bit little-endian unsigned integer
 */
function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset]! |
    (buffer[offset + 1]! << 8) |
    (buffer[offset + 2]! << 16) |
    (buffer[offset + 3]! << 24)
  );
}

/**
 * Read 16-bit little-endian unsigned integer
 */
function readUint16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset]! | (buffer[offset + 1]! << 8);
}

// VIM: set ft=typescript :
// END
