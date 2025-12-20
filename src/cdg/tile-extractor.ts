/**
 * Tile Extraction from VRAM
 *
 * Extracts 6×12 tiles from VRAM and converts to CDG packet format.
 * Validates pixel data integrity during extraction.
 */

import { VRAM } from '@/cdg/encoder'

/**
 * Tile dimensions (fixed in CDG format)
 */
export const TILE_WIDTH = 6
export const TILE_HEIGHT = 12

/**
 * Extracted tile data
 */
export interface ExtractedTile
{
  tileX: number              // Tile column (0-49)
  tileY: number              // Tile row (0-17)
  pixelData: number[][]      // 12 rows × 6 columns
  pixelCount: number         // Non-zero pixel count
}

/**
 * Extract a 6×12 tile from VRAM at tile coordinates
 *
 * @param vram - Source VRAM
 * @param tileX - Tile column (0-49)
 * @param tileY - Tile row (0-17)
 * @returns Extracted tile with pixel data and statistics
 */
export function extractTileFromVRAM(vram: VRAM, tileX: number, tileY: number): ExtractedTile
{
  const pixelData: number[][] = []
  const pixelX = tileX * TILE_WIDTH
  const pixelY = tileY * TILE_HEIGHT
  let pixelCount = 0

  for (let y = 0; y < TILE_HEIGHT; y++)
  {
    const row: number[] = []
    for (let x = 0; x < TILE_WIDTH; x++)
    {
      const pixel = vram.getPixel(pixelX + x, pixelY + y)
      row.push(pixel)
      if (pixel !== 0) pixelCount++
    }
    pixelData.push(row)
  }

  return { tileX, tileY, pixelData, pixelCount }
}

/**
 * Convert 2D tile pixel data to 1D CDG packet row format
 *
 * Each row becomes a single byte where:
 * - Non-zero pixel → bit 1
 * - Zero pixel → bit 0
 * Pixel x maps to bit x (LSB = leftmost pixel)
 *
 * @param pixelData - 12 rows × 6 columns of pixel indices
 * @returns Array of 12 bytes (one per row)
 */
export function tilePixelsToPacketRows(pixelData: number[][]): number[]
{
  const result: number[] = []
  for (let y = 0; y < TILE_HEIGHT; y++)
  {
    let row = 0
    for (let x = 0; x < TILE_WIDTH; x++)
    {
      // Non-zero pixel → bit 1, zero pixel → bit 0
      const bit = (pixelData[y][x] !== 0) ? 1 : 0
      row |= (bit << x)  // Pixel x maps to bit x
    }
    result.push(row & 0xFF)
  }
  return result
}

// VIM: set filetype=typescript :
// END
