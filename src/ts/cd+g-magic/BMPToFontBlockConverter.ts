/**
 * BMP to FontBlock Converter
 *
 * Converts raw BMP pixel data to CDGMagic_FontBlock instances.
 * This is the first stage of the CD+G rendering pipeline.
 *
 * Process:
 *  1. For each 6×12 block position on screen (in transition order)
 *  2. Sample pixels from BMP at that location
 *  3. Create FontBlock with sampled pixel data and timing
 *  4. Analyze colors and prepare for encoding
 *
 * Supports transition effects by rendering blocks in custom order
 * instead of sequential left-to-right top-to-bottom order.
 */

import { CDGMagic_FontBlock } from '@/ts/cd+g-magic/CDGMagic_FontBlock';
import type { TransitionData } from '@/ts/cd+g-magic/TransitionFileReader';
import { getDefaultTransition } from '@/ts/cd+g-magic/TransitionFileReader';

export interface BMPData {
  width: number;
  height: number;
  bitsPerPixel: number;
  palette: Array<[number, number, number]>; // RGB palette (6-bit CD+G format)
  pixels: Uint8Array; // Pixel data indexed into palette
}

/**
 * Convert BMP to FontBlock grid using transition ordering
 *
 * Respects custom transition ordering for progressive reveals.
 * If no transition provided, uses default sequential order.
 *
 * CD+G screen is 300×216 pixels = 50 blocks wide × 18 blocks high
 * Each block is 6×12 pixels
 *
 * Timing: Each block scheduled at (start_pack + block_index)
 * This spreads 768 blocks across 768 packets (about 2.5 seconds at 300 pps)
 *
 * @param bmpData BMP pixel data from BMPReader
 * @param start_pack Starting packet number for first block
 * @param transition Optional transition ordering (default: sequential)
 * @returns Array of FontBlock instances (max 900 for full screen)
 */
export function bmp_to_fontblocks(
  bmpData: BMPData,
  start_pack: number,
  transition?: TransitionData
): CDGMagic_FontBlock[] {
  const TILE_WIDTH = 6;
  const TILE_HEIGHT = 12;
  const VRAM_WIDTH = 300;
  const VRAM_HEIGHT = 216;

  // Use provided transition, or default to sequential order
  const trans_data = transition || getDefaultTransition();

  const fontblocks: CDGMagic_FontBlock[] = [];

  // Calculate scaling factors
  const bmp_scale_x = bmpData.width / VRAM_WIDTH;
  const bmp_scale_y = bmpData.height / VRAM_HEIGHT;

  // Process blocks in transition order
  // Each block gets its own packet (start_pack + index)
  for (let trans_idx = 0; trans_idx < trans_data.length; trans_idx++) {
    const [block_x, block_y] = trans_data.blocks[trans_idx];

    // Schedule this block at: start_pack + transition_index
    // This spreads all 768 blocks across 768 packets
    const block_start_pack = start_pack + trans_idx;

    // Create FontBlock for this position
    const fontblock = new CDGMagic_FontBlock(block_x, block_y, block_start_pack);

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

  console.debug(
    `[bmp_to_fontblocks] Converted BMP to ${fontblocks.length} FontBlocks ` +
    `(transition: ${transition ? 'custom' : 'default'}, ` +
    `packets ${start_pack}-${start_pack + fontblocks.length - 1})`
  );

  return fontblocks;
}

// VIM: set ft=typescript :
// END
