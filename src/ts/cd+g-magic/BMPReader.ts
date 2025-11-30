/**
 * BMP File Reader - Extract pixel data from BMP files
 *
 * Reads Windows BMP file format and extracts pixel data for rendering.
 * Supports indexed-color (palette-based) BMPs with up to 256 colors.
 */

export interface BMPData {
  width: number;
  height: number;
  bitsPerPixel: number;
  palette: Array<[number, number, number]>; // RGB palette (8-bit format from BMP)
  pixels: Uint8Array; // Pixel data indexed into palette
}

/**
 * Read BMP file and extract pixel data
 *
 * @param bmpBuffer BMP file contents
 * @returns BMPData with dimensions, palette, and pixel array
 */
export function readBMP(bmpBuffer: Uint8Array): BMPData {
  if (bmpBuffer.length < 54) {
    throw new Error('BMP file too small');
  }

  // Check BMP signature
  const signature = String.fromCharCode(bmpBuffer[0]!, bmpBuffer[1]!);
  if (signature !== 'BM') {
    throw new Error('Not a valid BMP file');
  }

  // Read DIB header info
  const dibHeaderSize = readUint32LE(bmpBuffer, 14);
  const width = readInt32LE(bmpBuffer, 18);
  const height = readInt32LE(bmpBuffer, 22); // May be negative for top-down
  const bitsPerPixel = readUint16LE(bmpBuffer, 28);
  const pixelDataOffset = readUint32LE(bmpBuffer, 10);

  if (bitsPerPixel !== 8) {
    throw new Error(`BMP has ${bitsPerPixel} bits per pixel, only 8-bit indexed color supported`);
  }

  if (width <= 0 || height === 0) {
    throw new Error(`Invalid BMP dimensions: ${width}x${height}`);
  }

  const isTopDown = height < 0;
  const actualHeight = Math.abs(height);

  // Extract palette
  const paletteOffset = 14 + dibHeaderSize;
  const colorsInPalette = Math.min(256, bmpBuffer.length > paletteOffset ? 256 : 0);
  const palette = extractPalette(bmpBuffer, paletteOffset, colorsInPalette);

  // Extract pixel data
  const pixels = extractPixelData(
    bmpBuffer,
    pixelDataOffset,
    width,
    actualHeight,
    isTopDown
  );

  return {
    width,
    height: actualHeight,
    bitsPerPixel,
    palette,
    pixels,
  };
}

/**
 * Extract palette from BMP
 * BMP stores palettes as BGRA (4 bytes per color)
 */
function extractPalette(
  buffer: Uint8Array,
  offset: number,
  colorCount: number
): Array<[number, number, number]> {
  const palette: Array<[number, number, number]> = [];

  for (let i = 0; i < Math.min(colorCount, 256); i++) {
    const idx = offset + i * 4;
    if (idx + 3 >= buffer.length) {
      palette.push([0, 0, 0]);
      continue;
    }

    // BMP stores as BGRA, keep as 8-bit RGB (will be converted during palette encoding)
    const b_8bit = buffer[idx]!;
    const g_8bit = buffer[idx + 1]!;
    const r_8bit = buffer[idx + 2]!;

    // Keep 8-bit values - conversion to 4-bit happens during CD+G packet encoding
    palette.push([r_8bit, g_8bit, b_8bit]);
  }

  // Pad to at least 16 colors for CD+G
  while (palette.length < 16) {
    palette.push([0, 0, 0]);
  }

  return palette;
}

/**
 * Extract pixel data from BMP
 * BMP pixels are stored bottom-up, rows must be padded to 4-byte boundaries
 */
function extractPixelData(
  buffer: Uint8Array,
  offset: number,
  width: number,
  height: number,
  isTopDown: boolean
): Uint8Array {
  const pixels = new Uint8Array(width * height);

  // Calculate row stride (must be multiple of 4 bytes)
  const rowStride = Math.ceil((width * 8) / 32) * 4;

  for (let y = 0; y < height; y++) {
    // BMP is bottom-up by default unless isTopDown
    const srcY = isTopDown ? y : height - 1 - y;
    const rowOffset = offset + srcY * rowStride;

    for (let x = 0; x < width; x++) {
      const pixelIdx = rowOffset + x;
      if (pixelIdx >= buffer.length) {
        pixels[y * width + x] = 0;
      } else {
        pixels[y * width + x] = buffer[pixelIdx]!;
      }
    }
  }

  return pixels;
}

/**
 * Read 32-bit little-endian signed integer
 */
function readInt32LE(buffer: Uint8Array, offset: number): number {
  const value =
    buffer[offset]! |
    (buffer[offset + 1]! << 8) |
    (buffer[offset + 2]! << 16) |
    (buffer[offset + 3]! << 24);

  // Handle sign extension for negative numbers
  return value > 0x7fffffff ? value - 0x100000000 : value;
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
