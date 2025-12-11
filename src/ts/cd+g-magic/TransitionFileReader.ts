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

    // Debug: find the max raw values
    let maxXRaw = 0, maxYRaw = 0;

    for (let i = 0; i < max_blocks; i++) {
      // Read X and Y from file
      // The file stores 1-indexed coordinates (1-50 for X, 1-18 for Y)
      // We need to convert to 0-indexed for our block coordinate system (0-49 for X, 0-17 for Y)
      const x_block_file = data[i * 2];
      const y_block_file = data[i * 2 + 1];

      // Track raw max values for debugging
      maxXRaw = Math.max(maxXRaw, x_block_file);
      maxYRaw = Math.max(maxYRaw, y_block_file);

      // Convert from 1-indexed (file format) to 0-indexed (our coordinate system)
      // Subtract 1 from each coordinate
      const x = x_block_file - 1;
      const y = y_block_file - 1;

      // Clamp to valid ranges (0-49 for X, 0-17 for Y)
      // This prevents any out-of-bounds values from the file from corrupting the screen
      const x_clamped = Math.max(0, Math.min(x, 49));
      const y_clamped = Math.max(0, Math.min(y, 17));

      // Only warn if we had to clamp (indicates data was out of expected range)
      if (x !== x_clamped || y !== y_clamped) {
        console.warn(
          `[loadTransitionFile] Clamped block at index ${i} from (${x_block_file}, ${y_block_file}) to (${x_clamped}, ${y_clamped})`
        );
      }

      blocks.push([x_clamped, y_clamped]);
    }

    console.debug(`[loadTransitionFile] Loaded ${blocks.length} blocks from file bytes (raw file has ${max_blocks} block entries)`);
    console.debug(`[loadTransitionFile] Raw byte ranges: X=1-${maxXRaw}, Y=1-${maxYRaw}`);

    // CRITICAL FIX: Check if we have complete grid coverage (all 50×18 blocks with no duplicates)
    // The transition file may specify 768 blocks total, but with duplicates!
    // Ensure we have each unique block position represented
    const uniqueBlocks = new Map<string, [number, number]>();
    for (const [x, y] of blocks) {
      uniqueBlocks.set(`${x},${y}`, [x, y]);
    }

    console.debug(`[loadTransitionFile] Unique blocks: ${uniqueBlocks.size} (file had ${blocks.length} entries)`);

    // Check if grid is incomplete (missing border rows/columns)
    // We need a FULL 50×18 grid (900 blocks), but transition files may only have 768
    // Check if any row > 15 or column > 47 is missing
    const needsCompletion = !uniqueBlocks.has('16,0') || !uniqueBlocks.has('0,16') || !uniqueBlocks.has('0,17') || !uniqueBlocks.has('49,0');
    
    if (needsCompletion) {
      console.warn(`[loadTransitionFile] Transition file has incomplete grid: missing border rows/columns`);
      
      // Collect missing blocks
      const missingBlocks: Array<[number, number]> = [];
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 50; x++) {
          const key = `${x},${y}`;
          if (!uniqueBlocks.has(key)) {
            missingBlocks.push([x, y]);
          }
        }
      }
      
      // Append missing blocks to the END of the sequence
      // They will render AFTER the transition completes
      blocks.push(...missingBlocks);
      console.warn(`[loadTransitionFile] Added ${missingBlocks.length} missing blocks to reach ${blocks.length} total`);
    }

    if (blocks.length > 0) {
      const xs = blocks.map(([x]) => x);
      const ys = blocks.map(([, y]) => y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      console.debug(`[loadTransitionFile] Final block ranges: X=${minX}-${maxX}, Y=${minY}-${maxY}`);
    }

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

/**
 * Get no-transition ordering (all blocks written at once)
 * 
 * For text clips that should appear solid without any reveal pattern,
 * this returns all 768 blocks in arbitrary order with the same start_pack.
 * All blocks write immediately with no progressive reveal.
 * 
 * This is used for text layers that should appear on top of BMP layers
 * which use their own transition patterns.
 * 
 * @returns TransitionData with all blocks having same packet time
 */
export function getNoTransition(): TransitionData {
  const blocks: Array<[number, number]> = [];

  // Iterate through 768 blocks in row-major order (arbitrary choice)
  // Screen is 50 tiles wide × 18 tiles high
  for (let cur_blk = 0; cur_blk < 768; cur_blk++) {
    const y = Math.floor(cur_blk / 50);  // Row: 0-17
    const x = cur_blk % 50;              // Column: 0-49

    blocks.push([x, y]);
  }

  return {
    blocks,
    length: 768,
  };
}

// VIM: set ft=typescript :
// END
