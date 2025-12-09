# Rendering Analysis & Progress - Opening Sequence (Clips 0-2)

## Status Summary

**Text Positioning:** ✅ FIXED
- Now correctly reads xOffset/yOffset from CMP events
- Karaoke mode-aware layout: TITLES mode uses computed layout, others use explicit offsets

**Text Rendering Colors:** 🚧 IN PROGRESS
- Need to verify white text (color 15) with black outline renders correctly
- Font size differences from C++ app expected

**Transition Rendering:** 🚧 IN PROGRESS
- Tile blocks are being rendered (cmd=06)
- Need to verify smooth reveal without corruption

**Screen Clears:** ✅ IMPLEMENTED
- Conditional MEMORY_PRESET based on memory_preset_index < 16
- BORDER_PRESET conditional on border_index < 16

---

## Fixes Applied

### Fix 1: Text Positioning with Karaoke Mode Awareness

**Status:** ✅ COMPLETE

**What was fixed:**
- Text clips now read xOffset/yOffset from CMP events (first event in array)
- Karaoke mode determines layout strategy:
  - **MODE_0 (TITLES):** Computed layout
    - y_offset = (line_idx % lines_per_page) * line_height + 12
    - x_offset = 6 (left margin)
    - Automatic flow down page
  - **Other modes:** Explicit positioning
    - x/y from CMP events
    - Falls back to x=6, y=12 if not specified

**Files Changed:**
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` (schedule_text_clip method)

**Commits:**
- `7cca128` - use explicit xOffset/yOffset from CMP
- `d918ab3` - use karaoke mode to determine text layout strategy

---

## Remaining Work

### 1. Text Rendering (Color & Outline)

**Current State:**
- Text is rendered as foregroundColor or backgroundColor (binary)
- No outline/stroke effect
- Full-screen BMP fill with backgroundColor

**Expected State:**
- White text (color 15) with black (color 0) outline
- Transparent background (only render text pixels, not background)
- Proper font rendering

**Files:**
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` (schedule_text_clip, lines ~560-620)
- `src/ts/cd+g-magic/TextRenderer.ts` (character rendering)

**Approach:**
1. Keep background fill (needed for BMP-to-FontBlocks encoding)
2. Only render foreground color for text pixels (gray > 127)
3. Add outline pixels (1-2px around characters in black)
4. Leave non-text pixels as backgroundColor

### 2. Transition Rendering Verification

**Current State:**
- Transition tile blocks are being scheduled
- Packets show cmd=06 (tile blocks) with varying x/y offsets

**To Verify:**
- [ ] Transition smooth reveal works without corruption
- [ ] Tile updates are in correct order
- [ ] No overlapping tile updates
- [ ] Palette loads don't interfere with reveal

**Tools:**
- `node bin/inspect-cdg.cjs --run --range 604-680 output.cdg`
- Compare tile block counts and positions with reference

### 3. Visual Verification

**Not yet done:**
- [ ] Visual inspection of rendered clips (need CDG player)
- [ ] Text readability and positioning on actual CDG player
- [ ] Transition smoothness

---

## Technical Notes

**Font Size Impact:**
- Larger fonts in TypeScript implementation (from Vite/web fonts)
- Will cause different pixel layout than C++ reference
- Expected and acceptable - not a bug

**CMP File Structure:**
- xOffset/yOffset fields apply to ALL clip types, not just BMP
- For text clips, only used when karaoke_mode != TITLES
- TITLES mode ignores these and computes layout from lines/font/page

**Karaoke Mode Constants:**
- MODE_0 = TITLES (default)
- MODE_1 = LYRICS
- MODE_2-11 = Various scroll/block modes
- Reference: `src/ts/cd+g-magic/KaraokeModes.ts`

---

## Packet Analysis Reference

**Opening sequence expected packets (clips 0-2):**
- **600:** BMP palette load (low)
- **601:** BMP palette load (high)
- **602-610:** Transition blocks for BMP reveal
- **611-679:** Text rendering + transition completion
- **680-740:** Clip 1 text (40-60 packets + transitions)
- **740-1008:** Clip 2 text + more transitions

**Command distribution in transition range (604-680):**
- ~16 MEMORY_PRESET (cmd=01) - screen clears
- ~61 TILE_BLOCK (cmd=06) - transition tiles
- ~1 PALETTE_LOW (cmd=30)
- ~1 PALETTE_HIGH (cmd=31)
- Transparent areas: Allow background/BMP to show through
- Current implementation fills entire BMP with backgroundColor which is wrong

**Files Involved:**
- CDGMagic_CDGExporter.ts: schedule_text_clip() - rendering logic
- TextRenderer.ts: Character rendering and font handling

**Action Required:**
- [ ] Separate text rendering from background
- [ ] Implement outline stroke effect (shadow)
- [ ] Use transparency channel (not a palette color)
- [ ] Only fill non-character areas when necessary

### 3. Screen Clear Validation

**Current State:**
- TextClip: Clear scheduled at clip.start_pack() + 3 (if memory_preset_index < 16)
- BMPClip: Clear scheduled conditionally

**Expected for Opening Sequence:**
- Clip 0 (BMP): Clear with color 0 at packet 602
- Clip 1 (Text): Clear with color 2 at packet 683
- Clip 2 (Text): Clear with color 2 at packet 843

**Action Required:**
- [ ] Verify correct number of MEMORY_PRESET packets
- [ ] Check for extra/duplicate clears that corrupt rendering
- [ ] Validate against reference CDG if available

### 4. Transition Rendering

**Current State:**
- Transition effect showing corruption
- Later pixels being replaced with garbage

**Expected State:**
- Smooth reveal of background BMP through transition effect
- No garbage/corruption

**Likely Causes:**
- Too many/wrong palette loads
- Transition blocks overlapping with text blocks
- Incorrect offset calculations

**Action Required:**
- [ ] Inspect hex dump of first 1000 packets
- [ ] Compare with reference if available
- [ ] Verify transition block scheduling doesn't collide with other updates

### 5. Text Overlay (Layering)

**Current State:**
- Text BMP fills entire screen with background color
- Text and background might be fighting over tile updates

**Expected State:**
- Text rendered only where characters exist
- Transparent/transparent pixels don't overwrite background
- Background shows through gaps

**Action Required:**
- [ ] Don't fill screen with backgroundColor
- [ ] Only render character pixels where needed
- [ ] Let background tiles remain untouched where text doesn't render

---

## Packet Structure Analysis

### Expected Packet Distribution (First 2000 packets)

```
Packets 0-299:       Blank/padding
Packets 300-599:     Blank/padding  
Packets 600-602:     Clip 0 BMP initialization
  600: LOAD_LOW palette
  601: LOAD_HIGH palette
  602: BORDER_PRESET (if enabled)
  603: MEMORY_PRESET (if enabled) - Clear with color 0
  
Packets 604-680:     Transition effect - BMP reveal
  Multiple TILE_BLOCK packets with transition

Packets 680-683:     Clip 1 Text initialization
  680: LOAD_LOW palette
  681: LOAD_HIGH palette
  682: BORDER_PRESET (if enabled)
  683: MEMORY_PRESET (if enabled) - Clear with color 2
  
Packets 684-740:     Text "Welcome to..." rendering
  Multiple TILE_BLOCK packets for text

Packets 741-839:     Blank/padding

Packets 840-843:     Clip 2 Text initialization
  840: LOAD_LOW palette
  841: LOAD_HIGH palette
  842: BORDER_PRESET (if enabled)
  843: MEMORY_PRESET (if enabled) - Clear with color 2

Packets 844-1008:    Text "CD+Graphics Magic" rendering
```

---

## Tools & Inspection

### Current Inspection Command
```bash
npx tsx tmp/inspect-cmp.ts                    # Show CMP clip details
bin/inspect-cdg.cjs --run tmp/output.cdg     # Show CDG packet stats
```

### Needed Improvements
- [ ] Add hex dump focus on specific packet ranges
- [ ] Add packet type timeline visualization
- [ ] Add comparison with reference CDG (if available)

---

## Testing Plan

1. **Render opening sequence:**
   ```bash
   npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg
   ```

2. **Inspect output:**
   ```bash
   bin/inspect-cdg.cjs --run tmp/output.cdg
   ```

3. **Compare with reference:**
   ```bash
   # If reference available:
   bin/inspect-cdg.cjs --run reference/cd+g-magic/Sample_Files/sample_project_04.cdg
   ```

4. **Play in VLC:**
   - Load tmp/output.cdg
   - Watch opening sequence (first ~10 seconds)
   - Check for:
     - Correct background visibility
     - Text appearing at correct position
     - No corruption or garbage
     - Proper layering

---

## Status Checklist

- [ ] Text positioning verified against C++ defaults
- [ ] Text rendering supports outline/transparency
- [ ] Screen clears in correct locations
- [ ] Transition reveals smoothly without corruption
- [ ] Inspect tool enhanced for debugging
- [ ] Opening sequence renders correctly in VLC

---

**Last Updated:** December 9, 2025  
**Current Focus:** Positioning, colors, and layer composition

// VIM: set ft=markdown :
// END
