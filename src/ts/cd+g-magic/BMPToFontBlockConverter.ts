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

import { CDGMagic_FontBlock     } from '@/ts/cd+g-magic/CDGMagic_FontBlock';
import { CDGMagic_TrackOptions  } from '@/ts/cd+g-magic/CDGMagic_TrackOptions_Core';
import { getDefaultTransition   } from '@/ts/cd+g-magic/TransitionFileReader';
import type { TransitionData    } from '@/ts/cd+g-magic/TransitionFileReader';

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
 * @param track_options Optional track options for z-layer and channel assignment
 * @param DEBUG Optional debug logging
 * @returns Array of FontBlock instances (max 900 for full screen)
 */
export function bmp_to_fontblocks(
  bmpData: BMPData,
  start_pack: number,
  transition?: TransitionData,
  track_options?: CDGMagic_TrackOptions,
  DEBUG: boolean = false
): CDGMagic_FontBlock[] {
  const TILE_WIDTH = 6;
  const TILE_HEIGHT = 12;
  const VRAM_WIDTH = 300;
  const VRAM_HEIGHT = 216;
  const SCREEN_TILES_WIDE = 50;
  const SCREEN_TILES_HIGH = 18;

  // Use provided transition, or default to sequential order
  const trans_data = transition || getDefaultTransition();

  const fontblocks: CDGMagic_FontBlock[] = [];

  // Calculate scaling factors
  const bmp_scale_x = bmpData.width / VRAM_WIDTH;
  const bmp_scale_y = bmpData.height / VRAM_HEIGHT;

  // CORRECT ALGORITHM:
  // For each block in transition order:
  // 1. Extract 6×12 pixels from BMP at that block position
  // 2. Create FontBlock with those pixel values
  // 3. Schedule at (start_pack + transition_index)
  
  // Process blocks in transition order
  for (let trans_idx = 0; trans_idx < trans_data.blocks.length; trans_idx++) {
    const [block_x, block_y] = trans_data.blocks[trans_idx];

    // Schedule block at: start_pack + transition_index
    const block_start_pack = start_pack + trans_idx;

    // Create FontBlock for this position
    const fontblock = new CDGMagic_FontBlock(block_x, block_y, block_start_pack);

    // Assign z-layer and channel from track options
    if (track_options) {
      fontblock.z_location(track_options.track());
      fontblock.channel(track_options.channel());
    }

    // Extract 6×12 pixels from BMP at this block position
    // Block coordinates are in tile space (0-49 wide, 0-17 high)
    // Convert to pixel space: each block is 6×12 pixels
    const block_pixel_x = block_x * TILE_WIDTH;
    const block_pixel_y = block_y * TILE_HEIGHT;

    for (let pixel_y = 0; pixel_y < TILE_HEIGHT; pixel_y++) {
      for (let pixel_x = 0; pixel_x < TILE_WIDTH; pixel_x++) {
        // Calculate source pixel in BMP (with scaling)
        const bmp_x = Math.floor((block_pixel_x + pixel_x) * bmp_scale_x);
        const bmp_y = Math.floor((block_pixel_y + pixel_y) * bmp_scale_y);

        // Bounds check
        if (bmp_x >= bmpData.width || bmp_y >= bmpData.height) {
          fontblock.pixel_value(pixel_x, pixel_y, 0);  // Out of bounds = black
          continue;
        }

        // Sample pixel from BMP
        const bmp_pixel_index = bmp_y * bmpData.width + bmp_x;
        const pixel_color = bmpData.pixels[bmp_pixel_index] || 0;

        // Store in FontBlock (0-255 palette indices)
        fontblock.pixel_value(pixel_x, pixel_y, pixel_color);
      }
    }

    // Add to output
    fontblocks.push(fontblock);
  }

  if (DEBUG)
    console.debug(
      `[bmp_to_fontblocks] Converted BMP to ${fontblocks.length} FontBlocks ` +
      `(transition mask: ${transition ? 'custom' : 'default'}, ` +
      `packets ${start_pack}-${start_pack + trans_data.blocks.length})`
    );

  return fontblocks;
}

// VIM: set ft=typescript :
// END