/**
 * CD+Graphics Magic - Transition File Reader
 *
 * Reads .cmt (CD+Graphics Magic Transition) files
 * Format: 768 pairs of bytes, each pair = (X, Y) block coordinates
 * Represents the order in which 6x12 blocks should be revealed/rendered
 * 
 * Standard order: 50 blocks wide x 18 blocks high = 768 total
 * X range: 1-50, Y range: 1-18 (1-indexed in file, converted to 0-indexed)
 */

import fs from 'fs';

/**
 * Transition block ordering for progressive reveals
 */
export interface TransitionData {
  blocks: Array<[number, number]>;  // [x, y] pairs, 0-indexed
  length: number;                    // Number of blocks (should be 768)
}

/**
 * Load a .cmt transition file
 * 
 * @param filePath Path to .cmt file
 * @returns TransitionData with block ordering, or null if load fails
 */
export function loadTransitionFile(filePath: string): TransitionData | null {
  try {
    const data = fs.readFileSync(filePath);
    
    // Transition files should be 1536 bytes (768 blocks × 2 bytes)
    if (data.length !== 1536) {
      console.warn(
        `[loadTransitionFile] Unexpected file size: ${data.length} (expected 1536)`,
        'File:', filePath
      );
      // Try to process anyway
    }

    const blocks: Array<[number, number]> = [];
    const max_blocks = Math.floor(data.length / 2);

    for (let i = 0; i < max_blocks; i++) {
      // Read X and Y (1-indexed in file, convert to 0-indexed)
      const x_file = data[i * 2];
      const y_file = data[i * 2 + 1];

      // Convert from 1-indexed file format to 0-indexed array format
      const x = x_file - 1;
      const y = y_file - 1;

      // Validate bounds (50 wide × 18 high)
      if (x < 0 || x >= 50 || y < 0 || y >= 18) {
        console.warn(
          `[loadTransitionFile] Invalid block coordinates at index ${i}: (${x_file}, ${y_file})`
        );
        continue;
      }

      blocks.push([x, y]);
    }

    console.debug(`[loadTransitionFile] Loaded ${blocks.length} transition blocks from ${filePath}`);

    return {
      blocks,
      length: blocks.length,
    };
  } catch (error) {
    console.error(`[loadTransitionFile] Failed to load transition file: ${filePath}`, error);
    return null;
  }
}

/**
 * Get default transition (top→bottom→left→right sequential order)
 * 
 * This matches C++ default when no transition file is specified:
 * ```cpp
 * for (int cur_blk = 0; cur_blk < 768; cur_blk++)
 * {
 *     blocks[cur_blk*2+0] = (cur_blk / 16) + 1; // X: 1-48 (columns)
 *     blocks[cur_blk*2+1] = (cur_blk % 16) + 1; // Y: 1-18 (rows)
 * }
 * ```
 * 
 * Order: column 1 rows 1-18, column 2 rows 1-18, ... column 50 rows 1-18
 * In 0-indexed: column 0 rows 0-17, column 1 rows 0-17, ... etc.
 * 
 * @returns Default TransitionData
 */
export function getDefaultTransition(): TransitionData {
  const blocks: Array<[number, number]> = [];

  // Match C++ default: iterate by column, then row
  for (let cur_blk = 0; cur_blk < 768; cur_blk++) {
    const x_1indexed = (cur_blk / 16) + 1;  // Columns 1-50
    const y_1indexed = (cur_blk % 16) + 1;  // Rows 1-18

    // Convert to 0-indexed
    const x = Math.floor(x_1indexed) - 1;
    const y = Math.floor(y_1indexed) - 1;

    blocks.push([x, y]);
  }

  return {
    blocks,
    length: 768,
  };
}

// VIM: set ft=typescript :
// END
