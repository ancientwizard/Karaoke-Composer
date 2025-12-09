# Rendering Analysis & Progress - Opening Sequence (Clips 0-2)

## Target: Opening Sequence Rendering

The opening should consist of:
1. **Clip 0 (600-2079):** BMP background with transition reveal
2. **Clip 1 (680-740):** "Welcome to..." text overlaid on background
3. **Clip 2 (840-1008):** "CD+Graphics Magic" text overlaid

All layers should compose with:
- Background (BMP) at bottom
- Transition effect revealing it
- Text (white with black outline) on top layer
- Transparent areas allow background to show

---

## Issues to Address

### 1. Text Positioning (X/Y Alignment)

**Current State:**
- Text is horizontally centered on screen
- Text Y position: calculated relative to lines per page

**Expected State (from C++ reference):**
- Default x_offset: 6 pixels (left justified)
- Default y_offset: 36 pixels (3 blocks = 36px from top)
- y_offset formula: `(line_num % lines_per_page) * line_height + 12`
- x_offset formula: `6` (hardcoded left margin, per C++ line 740)

**Files to Check:**
- C++ reference: CDGMagic_TextClip.cpp lines 740-741
- TS implementation: CDGMagic_CDGExporter.ts schedule_text_clip()

**Action Required:**
- [ ] Verify if centered text is intentional or bug
- [ ] Check if first 3 clips in sample_project_04.cmp specify explicit positioning
- [ ] If not, use C++ defaults (x=6, y=36 for first line)

### 2. Text Rendering (Color & Transparency)

**Current State:**
- Pixels are rendered as foregroundColor or backgroundColor based on gray threshold
- No outline/stroke effect
- No transparency handling

**Expected State:**
- Text: White (color 15) with black (color 0) outline
- Outline width: typically 1-2 pixels around character
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
