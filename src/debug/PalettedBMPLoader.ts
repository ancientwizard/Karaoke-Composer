/**
 * BMP Palette Loader - reads 8-bit paletted BMP files and extracts:
 * - The embedded palette (BMP's color table)
 * - The pixel indices (which colors are used)
 * Returns pixel indices, not expanded RGB values
 */

import * as fs from 'fs'

export interface PalettedBMPData {
  width: number
  height: number
  pixels: Uint8Array  // Palette indices, not RGB values
  palette: Array<{ r: number; g: number; b: number }>  // The BMP's embedded palette
}

export function loadPalettedBMP(filePath: string): PalettedBMPData {
  const data = fs.readFileSync(filePath)
  
  // BMP Header (14 bytes)
  const signature = data.readUInt16LE(0)
  if (signature !== 0x4D42) {  // 'BM'
    throw new Error('Not a BMP file')
  }
  
  const pixelDataOffset = data.readUInt32LE(10)
  
  // DIB Header (at least 40 bytes for BITMAPINFOHEADER)
  const dibHeaderSize = data.readUInt32LE(14)
  if (dibHeaderSize < 40) {
    throw new Error('Unsupported BMP DIB header size')
  }
  
  const width = data.readInt32LE(18)
  const height = data.readInt32LE(22)
  const bitsPerPixel = data.readUInt16LE(28)
  const numColors = data.readUInt32LE(46)
  
  if (bitsPerPixel !== 8) {
    throw new Error(`Expected 8-bit BMP, got ${bitsPerPixel}-bit`)
  }
  
  // Palette is stored after the DIB header
  const paletteOffset = 14 + dibHeaderSize
  const paletteSizeInBytes = numColors > 0 ? numColors : 256
  
  const palette: Array<{ r: number; g: number; b: number }> = []
  for (let i = 0; i < paletteSizeInBytes; i++) {
    const offset = paletteOffset + i * 4
    const b = data[offset]
    const g = data[offset + 1]
    const r = data[offset + 2]
    // x = data[offset + 3]  // Reserved
    palette.push({
      r,
      g,
      b
    })
  }
  
  // Pixel data: each byte is a palette index
  const pixelCount = width * height
  const pixels = data.slice(pixelDataOffset, pixelDataOffset + pixelCount) as Uint8Array

  return {
    width,
    height,
    pixels,
    palette,
  }
}

// VIM: ts=2 sw=2 et
// END
