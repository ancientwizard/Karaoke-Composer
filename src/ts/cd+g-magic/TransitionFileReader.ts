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
      // Read X and Y directly from file (stored as 1-indexed)
      // NOTE: The file format stores 1-indexed coordinates, NOT 0-indexed!
      // But when we use them for tile coordinates in CD+G packets, they are already 1-indexed
      // which is what the packet format expects (see CDG spec: tile coordinates are 0-49 for X, 0-17 for Y)
      // Actually, checking C++ code: it reads directly and doesn't convert!
      // The VALUES in the file are 0-indexed already (1-49 for X, 1-17 for Y after clamping)
      // So we should use them as-is, not subtract 1
      const x_block = data[i * 2];
      const y_block = data[i * 2 + 1];

      // Clamp to valid ranges (matching C++ behavior)
      const x = Math.min(x_block, 49);
      const y = Math.min(y_block, 17);

      // Validate bounds
      if (x < 0 || x >= 50 || y < 0 || y >= 18) {
        console.warn(
          `[loadTransitionFile] Invalid block coordinates at index ${i}: (${x_block}, ${y_block})`
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
 * CD+G display: 50 blocks wide × 18 blocks high = 768 blocks total
 * Default order: iterate by column (left→right), then row (top→bottom)
 * Column 0 (x=0): blocks 0-17 (y=0-17)
 * Column 1 (x=1): blocks 18-35 (y=0-17)
 * etc.
 * 
 * Mathematical formula:
 * - x = block_index / 18 (column: 0-49)
 * - y = block_index % 18 (row: 0-17)
 * 
 * This matches C++ default when no transition file is specified.
 * 
 * @returns Default TransitionData
 */
export function getDefaultTransition(): TransitionData {
  const blocks: Array<[number, number]> = [];

  // Iterate through 768 blocks in column-major order
  // Screen is 50 tiles wide × 18 tiles high
  for (let cur_blk = 0; cur_blk < 768; cur_blk++) {
    const x = Math.floor(cur_blk / 18);  // Column: 0-49
    const y = cur_blk % 18;              // Row: 0-17

    blocks.push([x, y]);
  }

  return {
    blocks,
    length: 768,
  };
}

// VIM: set ft=typescript :
// END
