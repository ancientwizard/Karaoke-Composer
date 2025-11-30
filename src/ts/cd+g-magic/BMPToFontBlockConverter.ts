/**
 * BMP to FontBlock Converter
 *
 * Converts raw BMP pixel data to CDGMagic_FontBlock instances.
 * This is the first stage of the CD+G rendering pipeline.
 *
 * Process:
 *  1. For each 6×12 block position on screen
 *  2. Sample pixels from BMP at that location
 *  3. Create FontBlock with sampled pixel data
 *  4. Analyze colors and prepare for encoding
 */

import { CDGMagic_FontBlock } from '@/ts/cd+g-magic/CDGMagic_FontBlock';

export interface BMPData {
  width: number;
  height: number;
  bitsPerPixel: number;
  palette: Array<[number, number, number]>; // RGB palette (6-bit CD+G format)
  pixels: Uint8Array; // Pixel data indexed into palette
}

/**
 * Convert BMP to FontBlock grid (50×18 blocks covering entire CD+G screen)
 *
 * CD+G screen is 300×216 pixels = 50 blocks wide × 18 blocks high
 * Each block is 6×12 pixels
 *
 * @param bmpData BMP pixel data from BMPReader
 * @param start_pack Starting packet number for first block
 * @returns Array of FontBlock instances (max 900 for full screen)
 */
export function bmp_to_fontblocks(
  bmpData: BMPData,
  start_pack: number
): CDGMagic_FontBlock[] {
  const SCREEN_TILES_WIDE = 50;
  const SCREEN_TILES_HIGH = 18;
  const TILE_WIDTH = 6;
  const TILE_HEIGHT = 12;
  const VRAM_WIDTH = 300;
  const VRAM_HEIGHT = 216;

  const fontblocks: CDGMagic_FontBlock[] = [];

  // Calculate scaling factors
  const bmp_scale_x = bmpData.width / VRAM_WIDTH;
  const bmp_scale_y = bmpData.height / VRAM_HEIGHT;

  // For each block on screen
  for (let block_y = 0; block_y < SCREEN_TILES_HIGH; block_y++) {
    for (let block_x = 0; block_x < SCREEN_TILES_WIDE; block_x++) {
      // Create FontBlock for this position
      const fontblock = new CDGMagic_FontBlock(block_x, block_y, start_pack);

      // Sample BMP pixels for each pixel in the 6×12 block
      for (let pixel_y = 0; pixel_y < TILE_HEIGHT; pixel_y++) {
        for (let pixel_x = 0; pixel_x < TILE_WIDTH; pixel_x++) {
          // Calculate source BMP pixel coordinates
          const src_x = Math.floor((block_x * TILE_WIDTH + pixel_x) * bmp_scale_x);
          const src_y = Math.floor((block_y * TILE_HEIGHT + pixel_y) * bmp_scale_y);

          // Bounds check
          if (src_x >= 0 && src_x < bmpData.width && src_y >= 0 && src_y < bmpData.height) {
            // Sample pixel from BMP
            const pixel_idx = src_y * bmpData.width + src_x;
            if (pixel_idx < bmpData.pixels.length) {
              const color_idx = bmpData.pixels[pixel_idx]!;
              // Clamp to 4-bit color index
              fontblock.pixel_value(pixel_x, pixel_y, color_idx & 0x0f);
            }
          }
        }
      }

      // Add to output
      fontblocks.push(fontblock);
    }
  }

  return fontblocks;
}

/**
 * Convert single BMP event to FontBlocks with transition animation
 *
 * Handles:
 * - Offset positioning
 * - Transition blocks (gradual reveal animation)
 * - Multiple layers/events
 *
 * @param bmpData BMP pixel data
 * @param start_pack Starting packet position
 * @param x_offset BMP horizontal offset in pixels (can be negative)
 * @param y_offset BMP vertical offset in pixels (can be negative)
 * @param transition_blocks Array of [x_block, y_block] coordinates for animation
 * @returns Array of FontBlock instances
 */
export function bmp_event_to_fontblocks(
  bmpData: BMPData,
  start_pack: number,
  x_offset: number = 0,
  y_offset: number = 0,
  transition_blocks?: Array<[number, number]>
): CDGMagic_FontBlock[] {
  const TILE_WIDTH = 6;
  const TILE_HEIGHT = 12;
  const VRAM_WIDTH = 300;
  const VRAM_HEIGHT = 216;

  const fontblocks: CDGMagic_FontBlock[] = [];

  // If no transition blocks specified, render entire BMP
  if (!transition_blocks || transition_blocks.length === 0) {
    return bmp_to_fontblocks(bmpData, start_pack);
  }

  // Calculate scaling
  const bmp_scale_x = bmpData.width / VRAM_WIDTH;
  const bmp_scale_y = bmpData.height / VRAM_HEIGHT;

  // For each transition block
  for (let block_idx = 0; block_idx < transition_blocks.length; block_idx++) {
    const [trans_x, trans_y] = transition_blocks[block_idx]!;

    // Create FontBlock for this transition step
    const fontblock = new CDGMagic_FontBlock(trans_x, trans_y, start_pack + block_idx);

    // Sample BMP pixels with offset
    for (let pixel_y = 0; pixel_y < TILE_HEIGHT; pixel_y++) {
      for (let pixel_x = 0; pixel_x < TILE_WIDTH; pixel_x++) {
        // Calculate source pixel with offset applied
        const src_x = Math.floor(((trans_x * TILE_WIDTH + pixel_x) - x_offset) * bmp_scale_x);
        const src_y = Math.floor(((trans_y * TILE_HEIGHT + pixel_y) - y_offset) * bmp_scale_y);

        // Bounds check
        if (src_x >= 0 && src_x < bmpData.width && src_y >= 0 && src_y < bmpData.height) {
          const pixel_idx = src_y * bmpData.width + src_x;
          if (pixel_idx < bmpData.pixels.length) {
            const color_idx = bmpData.pixels[pixel_idx]!;
            fontblock.pixel_value(pixel_x, pixel_y, color_idx & 0x0f);
          }
        }
      }
    }

    // Analyze colors
    fontblock.num_colors();

    fontblocks.push(fontblock);
  }

  return fontblocks;
}

// VIM: set ft=typescript :
// END
