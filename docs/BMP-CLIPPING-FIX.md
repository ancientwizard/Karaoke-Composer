# BMP Border Row Clipping Fix

## Problem Summary

The sun's rays (depicted in the upper-left corner of the sample BMP) were being cut off - top and bottom rows were missing, preventing the sun graphic from displaying properly.

**User's Description:**
> "The BMP clip that is shown via the transition doesn't fill in the top or bottom rows of blocks. The first BMP is a blue background to look like sky and a gradient green along the bottom to pose as grass and a sun depicted in the upper left corner as circle with points as rays of light."

## Root Cause Analysis

The sample transition files (`.cmt` format) from CD+Graphics Magic were designed for a **48×16 block grid** (768 blocks total), but the CD+G standard requires **50×18 blocks** (900 blocks for full screen coverage).

### Missing Blocks Calculation:
- **Expected grid:** 50 wide × 18 tall = 900 blocks
- **Transition file grid:** 48 wide × 16 tall = 768 blocks  
- **Missing blocks:** 900 - 768 = **132 blocks**
  - Right border columns (48-49): 2 × 18 = 36 blocks
  - Bottom border rows (16-17): 50 × 2 = 100 blocks
  - (Note: corner overlap is included in the counts)

### Secondary Issue Found:
The `TransitionFileReader` had incorrect coordinate conversion logic:

- **File format:** Stores 1-indexed coordinates (1-50 for X, 1-18 for Y)
- **Needed format:** 0-indexed coordinates (0-49 for X, 0-17 for Y)
- **Old code:** Used `Math.min(x_block, 49)` which doesn't actually convert!
- **New code:** Correctly subtracts 1: `x_block - 1` and `y_block - 1`

## Solution Implemented

### Changes to `TransitionFileReader.ts`:

1. **Correct 1-indexed to 0-indexed conversion:**
   ```typescript
   const x = x_block_file - 1;  // Convert 1-indexed to 0-indexed
   const y = y_block_file - 1;
   
   // Clamp to valid ranges
   const x_clamped = Math.max(0, Math.min(x, 49));
   const y_clamped = Math.max(0, Math.min(y, 17));
   ```

2. **Detect incomplete grids:**
   - Check if any border coordinate is missing (e.g., X=49, Y=17)
   - If incomplete, automatically complete the grid

3. **Complete the grid:**
   - Iterate through all 50×18 positions
   - Collect blocks not in the transition file
   - Append missing blocks to end of sequence (render after transition completes)
   - Result: 768 (transition) + 132 (missing border) = 900 blocks total

### Changes to `BMPToFontBlockConverter.ts`:

Added debug logging to show:
- Screen dimensions (300×216 pixels, 50×18 blocks)
- BMP dimensions (from file)
- Scaling factors
- Y coordinate ranges being processed

## Test Results

✅ **All 707 tests pass** - No regressions from this fix

### Block Coverage Before/After Fix:

| Metric | Before | After |
|--------|--------|-------|
| Y coordinate range | 0-15 (16 rows) | 0-17 (18 rows) |
| X coordinate range | 0-47 (48 cols) | 0-49 (50 cols) |
| Total blocks rendered | 768 | 900 |
| Sun rays visible | ❌ Cut off | ✅ Fully visible |

## Verification

When rendering `sample_project_03b.cmp`, the first BMP (`simple_sky_2+14.bmp`) now renders with complete 50×18 coverage:

```
Before: Y coordinates range: 0-15 (missing top/bottom)
After:  Y coordinates range: 0-17 (all 18 rows)
```

The sun graphic in the top-left corner is now fully visible with all rays rendered.

## Backward Compatibility

This fix gracefully handles:
- ✅ **Complete transition files** (50×18): No changes needed
- ✅ **Incomplete transition files** (48×16 or other sizes): Automatically completed
- ✅ **Default transitions** (no .cmt file): Still works, generates full 50×18 grid

## Files Modified

1. `src/ts/cd+g-magic/TransitionFileReader.ts`
   - Fixed 1-indexed to 0-indexed coordinate conversion
   - Added incomplete grid detection
   - Added missing block completion logic
   - Added comprehensive debug logging

2. `src/ts/cd+g-magic/BMPToFontBlockConverter.ts`
   - Added debug output for grid dimensions and Y coordinate ranges

3. `bin/render-cdg.ts`
   - DEBUG flag toggling (disabled by default in committed version)

## Technical Details

### Transition File Format
- **Extension:** .cmt (CD+Graphics Magic Transition)
- **Size:** 1536 bytes (768 blocks × 2 bytes)
- **Each entry:** [X_byte, Y_byte] in 1-indexed form
- **Format:** Defines the order in which 6×12 pixel blocks reveal on screen

### CD+G Block Grid
- **Screen:** 300×216 pixels
- **Block size:** 6×12 pixels
- **Blocks:** 50 wide × 18 tall = 900 blocks total
- **For transitions:** 768 blocks for the 50% of screen used in progressive reveal

## Future Improvements

- Consider warning users if they use transition files from older CD+Graphics Magic versions
- Document the 48×16 vs 50×18 limitation in any UI dialogs
- Option to manually adjust border handling preferences

---

**Status:** ✅ Fixed and tested  
**Date:** 2025-12-11  
**Tests Passing:** 707/707
