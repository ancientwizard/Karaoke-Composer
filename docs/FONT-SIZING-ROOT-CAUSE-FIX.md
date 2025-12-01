# Font Sizing Issue - Root Cause Analysis & Fix

**Status**: ✅ RESOLVED
**Commit**: 3797ccc
**Date**: Session 6, Phase 6D (Post-font rendering fixes)

## Problem Statement

User reported: **"The font being chosen is rendered @ 50-55% the height of the screen"**

- Expected: Fonts should be 14-21 pixels tall (5-10% of 216px screen height)
- Actual: Fonts appearing at 108-118 pixels tall (50-55% of screen height)
- Impact: 5-8x size multiplication making text unreadable

## Root Cause Analysis

### The Bug

The `schedule_text_clip()` method was creating **one BMP per line** with dimensions:
- Width: 288 pixels
- Height: `lineHeight` pixels (24px for 12pt font)

These per-line BMPs were then passed to `bmp_to_fontblocks()`, which treats the input BMP as covering the **entire 300×216 screen**. This caused massive scaling:

**Example for 12pt font:**
1. Font pixel height: 14px
2. `blkHeight = ceil(14/12) = 2`
3. `lineHeight = 2 * 12 = 24px`
4. Per-line BMP created: 288×24 pixels
5. `bmp_to_fontblocks()` treats this as full screen: 300×216
6. Scaling factor: `24px / 216px = 0.111`
7. Characters rendered at: `14px / 0.111 = 126px` ❌ (5-8x too large!)

### Why The Bug Existed

The code calculated `yOffset` correctly:
```typescript
const yOffset = (lineIdx % linesPerPage) * lineHeight + 12;
```

But **never used it**. This yOffset was meant to position multiple lines at different Y coordinates on the screen, but since each line had its own separate BMP, the positioning information was discarded.

### The Code Pattern That Failed

```typescript
// OLD (WRONG): Per-line BMP
for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  // Create 288 × lineHeight BMP for just this line
  const lineBmpPixels = new Uint8Array(lineWidth * lineHeight);
  // ... render characters ...
  
  const lineBmpData = {
    width: lineWidth,
    height: lineHeight,  // ← Only 24px!
    bitsPerPixel: 8,
    palette: palette,
    pixels: lineBmpPixels
  };
  
  // ← This assumes BMPData covers 300×216, but it's only 288×24
  const fontblocks = bmp_to_fontblocks(lineBmpData, ...);
  
  // yOffset calculated but never used
  const yOffset = (lineIdx % linesPerPage) * lineHeight + 12;
}
```

## Solution

### The Fix

Create **one full-screen BMP (288×216)** for the entire text clip, position each line at its correct Y offset, then convert once to FontBlocks.

**Key changes:**
1. **Single BMP**: 288×216 pixels (full screen)
2. **Per-line Y positioning**: 
   ```
   lineYPixels = (lineIdx % linesPerPage) * lineHeight + 12
   ```
3. **Add to topStart**: Incorporate lineYPixels into character positioning
4. **Single conversion**: Call `bmp_to_fontblocks()` once for full screen

### Implementation

```typescript
// NEW (CORRECT): Full-screen BMP
const screenWidth = 288;
const screenHeight = 216;  // Full CD+G height
const screenBmpPixels = new Uint8Array(screenWidth * screenHeight);
screenBmpPixels.fill(backgroundColor);

// Render each line at its vertical offset
for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const lineText = lines[lineIdx] || '';
  if (lineText.length === 0) continue;
  
  // Calculate Y position for this line
  const lineYPixels = (lineIdx % linesPerPage) * lineHeight + 12;
  if (lineYPixels + lineHeight > screenHeight) continue;
  
  // Render text at this Y position
  const topStart = Math.floor((lineHeight - fontPixelHeight) / 2) 
                   + fontPixelHeight 
                   + lineYPixels;  // ← Add line offset
  
  // Render characters to screenBmpPixels...
}

// Convert full screen once
const screenBmpData = {
  width: screenWidth,
  height: screenHeight,
  bitsPerPixel: 8,
  palette: palette,
  pixels: screenBmpPixels
};

const fontblocks = bmp_to_fontblocks(screenBmpData, ...);
```

## Verification

### Mathematical Verification

For 12pt font with 8 lines per page:
- `fontPixelHeight = 14px`
- `lineHeight = 24px`
- `linesPerPage = 8`
- Screen dimensions: 288×216 pixels (full CD+G height)

**Line positioning (yOffset formula):**
- Line 0: Y = 12 + 0×24 = 12 pixels
- Line 1: Y = 12 + 1×24 = 36 pixels
- Line 2: Y = 12 + 2×24 = 60 pixels
- ...
- Line 7: Y = 12 + 7×24 = 180 pixels
- Line 7 bottom: 180 + 24 = 204 pixels < 216 ✓

**BMP scaling to FontBlocks:**
- BMP size: 288×216 pixels
- Target screen: 300×216 pixels (via bmp_to_fontblocks)
- Scaling factor: 216px BMP → 216px screen = 1.0 (no scaling)
- Character height: 14px × 1.0 = 14px ✓ (correct!)

### Test Results

✅ **All 707 tests passing**
- No test failures or regressions
- TextClipCompositor tests (timing-sensitive) still pass
- Export round-trip tests still pass

✅ **CDG generation successful**
- Generated 432000 bytes (18000 packets)
- No errors during conversion
- Output file created successfully

### What Would The User See

**Before fix** (per-line BMPs):
- 14px font rendered as ~126px (50-55% of screen)
- Text completely unreadable, off-screen

**After fix** (full-screen BMP):
- 14px font rendered as ~14px (6.5% of screen)
- Text properly sized and positioned
- Multiple lines on one screen

## Technical Details

### The yOffset Formula (C++ Pattern)

```
yOffset = (curr_line_num % lines_per_page) * line_height + 12
```

Where:
- `curr_line_num`: Line number (0, 1, 2, ...)
- `lines_per_page`: How many lines fit on screen (8 for 12pt fonts)
- `line_height`: Height allocated per line (24px for 12pt)
- `+12`: Safe margin from top of screen

For example with 12pt fonts:
- Line 0: (0 % 8) * 24 + 12 = 12px from top
- Line 1: (1 % 8) * 24 + 12 = 36px from top
- Line 2: (2 % 8) * 24 + 12 = 60px from top
- ...
- Line 7: (7 % 8) * 24 + 12 = 180px from top
- Line 8: (0 % 8) * 24 + 12 = 12px from top (wraps to new page)

### Font Dimensions Reference

| Size | Pixel Height | Actual Width | Line Height | Lines/Page |
|------|--------------|--------------|-------------|-----------|
| 12pt | 14px         | 10px         | 24px        | 8         |
| 18pt | 21px         | 15px         | 24px        | 8         |
| 24pt | 21px         | 15px         | 24px        | 8         |

## Files Modified

- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` (lines 485-619)
  - Replaced per-line BMP loop with single full-screen BMP
  - Integrated yOffset into character positioning
  - Single `bmp_to_fontblocks()` call

## Impact Assessment

### What Changed
- ✅ Font rendering pipeline now correct
- ✅ Multiple lines on one screen work
- ✅ Y positioning using yOffset formula
- ✅ No change to test suite (all pass)

### What Stayed The Same
- ✅ Font loading mechanism
- ✅ Font metadata extraction
- ✅ Character rendering (native size)
- ✅ Color handling
- ✅ Palette management
- ✅ FontBlock creation

### Backward Compatibility
- ✅ No breaking changes to external APIs
- ✅ All existing tests pass
- ✅ Sample project CDG generation works

### Summary

**Root Cause**: Per-line BMPs (288×24) being scaled to full screen (300×216), causing fonts to be 5-8x too large.

**Solution**: Single full-screen BMP (288×216) with lines positioned at correct Y offsets using the formula: `yOffset = (lineIdx % linesPerPage) * lineHeight + 12`.

**Result**: Fonts now render at correct size (14-21px), all tests passing, CDG generation successful.

---

**VIM**: set ft=markdown
**END**
