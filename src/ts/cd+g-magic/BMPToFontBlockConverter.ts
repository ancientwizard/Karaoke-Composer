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

  // CORRECT FIX: Write MASK blocks for unrevealed areas
  // The transition file specifies which blocks to REVEAL in order
  // For each packet, we write a mask over the unrevealed blocks
  // - Blocks that have been revealed (indices 0..trans_idx) = BMP shows through
  // - Blocks not yet revealed (indices trans_idx+1..767) = write black mask
  // As time progresses, fewer mask blocks are written, revealing more BMP
  
  // Create a set of all block coordinates
  const allBlockKeys = new Set<string>();
  for (let y = 0; y < SCREEN_TILES_HIGH; y++) {
    for (let x = 0; x < SCREEN_TILES_WIDE; x++) {
      allBlockKeys.add(`${x},${y}`);
    }
  }

  // Create a map of block coordinates from transition
  const transBlockMap = new Map<string, number>();
  for (let i = 0; i < trans_data.blocks.length; i++) {
    const [x, y] = trans_data.blocks[i];
    transBlockMap.set(`${x},${y}`, i);
  }

  // For each step in the transition
  for (let trans_idx = 0; trans_idx < trans_data.length; trans_idx++) {
    // Find all blocks that are NOT yet revealed (indices > trans_idx)
    const revealedSet = new Set<string>();
    for (let i = 0; i <= trans_idx; i++) {
      const [x, y] = trans_data.blocks[i];
      revealedSet.add(`${x},${y}`);
    }

    // Write mask blocks for all unrevealed blocks
    for (const blockKey of allBlockKeys) {
      if (revealedSet.has(blockKey)) continue;  // Skip revealed blocks

      const [xStr, yStr] = blockKey.split(',');
      const block_x = parseInt(xStr, 10);
      const block_y = parseInt(yStr, 10);

      // Schedule mask block at: start_pack + transition_index
      const block_start_pack = start_pack + trans_idx;

      // Create FontBlock for this mask position
      const fontblock = new CDGMagic_FontBlock(block_x, block_y, block_start_pack);

      // Assign z-layer and channel from track options
      if (track_options) {
        fontblock.z_location(track_options.track());
        fontblock.channel(track_options.channel());
      }

      // Fill mask block with background color (black = 0)
      // This covers/hides the unrevealed portion of the BMP
      for (let pixel_y = 0; pixel_y < TILE_HEIGHT; pixel_y++) {
        for (let pixel_x = 0; pixel_x < TILE_WIDTH; pixel_x++) {
          fontblock.pixel_value(pixel_x, pixel_y, 0);  // Black mask
        }
      }

      // Add to output
      fontblocks.push(fontblock);
    }
  }

  if (DEBUG)
    console.debug(
      `[bmp_to_fontblocks] Converted BMP to ${fontblocks.length} FontBlocks ` +
      `(transition mask: ${transition ? 'custom' : 'default'}, ` +
      `packets ${start_pack}-${start_pack + trans_data.length})`
    );

  return fontblocks;
}

// VIM: set ft=typescript :
// END