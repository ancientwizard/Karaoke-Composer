# Issues Found - Session 8 (December 8, 2025)

## Summary
Investigated rendering issues in the CD+G export pipeline. Found that most basic functionality works, but karaoke text rendering is not implemented correctly for line-by-line effects.

---

## Investigation Results

### ✅ RESOLVED: Double Transition File Loading
**Observation:** Output showed loading both `transition_gradient_03.cmt` and `transition_gradient_04.cmt`

**Root Cause:** False alarm - there are 8 total clips in sample_project_04.cmp:
- Clip 0: BMP at packet 600 → uses transition_gradient_03.cmt
- Clip 7: BMP at packet 12000 → uses transition_gradient_04.cmt

**Status:** WORKING CORRECTLY ✓

---

## Critical Issues Found

### ❌ ISSUE #1: Karaoke Text Not Rendered Line-by-Line

**Affected:** Text clips using karaoke modes (especially MODE_5LNCT - karaoke mode 0x0c)

**Example:** The "training" clip (packet 2700, duration 7984)
- Uses MODE_5LNCT (5 lines with line-cut effect)
- Has 15 lines of text
- Currently: ALL 15 lines rendered to single full-screen BMP at packet 2703
- Expected: Lines should appear progressively with cut/fade animation

**Technical Details:**

The training clip metadata:
```
Clip at packet 2700, duration 7984 packets (~26.6 seconds at 300 pps)
Font: 20pt, FG=Red(2), BG=Color(13), outline=1, karaoke=MODE_5LNCT (0x0c)

Lines (15 total):
  0: "Create real subcode graphics"
  1: "playable on any standard"
  2: "compliant karaoke machine"
  3: "with nearly video-like"
  4: "line fading effects."
  5: "Conceals the slow drawing"
  6: "of a very bandwidth limited"
  7: "medium by splitting lines"
  8: "into separately addressable"
  9: "color indices - automatically."
  ... (5 more lines)
```

**Mode Specifications:**

According to C++ reference (CDGMagic_TextClip.h):
- `MODE_5LNCT = 0x0c`: 5-line display, top-aligned, LINE-CUT effect
- Lines should be revealed progressively (cut from top/bottom)
- Each line appearance should consume a few hundred packets
- 5 visible lines at a time (lines 0-4, then 5-9, then 10-14)

**Current Behavior:**
```
[schedule_text_clip] Converted 15 lines to 768 FontBlocks
[queue_fontblocks] Queued 768 FontBlocks for progressive writing
```

All 768 FontBlocks queued with same start_pack (2703). No progressive reveal.

**Required Implementation:**
1. Detect karaoke mode in schedule_text_clip()
2. For line-cut modes: distribute lines across duration
   - Calculate time per line: `7984 packets / 15 lines ≈ 532 packets/line`
   - Group lines into 5-line pages (for MODE_5LNCT)
   - Queue each page's FontBlocks with offset start_pack values
3. For line-fade modes: add XOR overlay FontBlocks for highlight effect
4. Implement WIPE events for word-by-word highlighting

---

### ⚠️ ISSUE #2: Screen Clear Timing Not Fully Verified

**Status:** Potentially working but not validated

**Concern:** Current code always does memory_preset at `clip.start_pack() + 2`

**Code:** (CDGMagic_CDGExporter.ts, line 465)
```typescript
// Schedule memory preset
this.add_scheduled_packet(clip.start_pack() + 2, this.create_memory_preset_packet(0));
```

**Issue:** Does not check `memory_preset_index` from the clip's TextClip properties
- Should respect `clip.memory_preset_index()` 
- Value 16 means "disabled" (don't clear)
- Should use actual index value for clear color

**Required Fix:**
```typescript
const memoryPresetIndex = clip.memory_preset_index?.() ?? 16;
if (memoryPresetIndex < 16) {
  this.add_scheduled_packet(clip.start_pack() + 2, this.create_memory_preset_packet(memoryPresetIndex));
}
```

---

### ⚠️ ISSUE #3: Palette Loading Always Uses Default

**Status:** Currently works but not flexible

**Concern:** Palette always loads the standard 16-color palette, doesn't respect BMP palette from images

**Code:** (CDGMagic_CDGExporter.ts, line 461)
```typescript
this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
```

**Note:** BMPClip handles this correctly (loads BMP's own palette), but TextClips don't.

**Status:** Low priority for now - works for current test case

---

## Minor Issues

### Text Rendering Quality
- Text is being rendered with `backgroundColor` filling entire screen
- Results in solid colored rectangle with text in middle
- Doesn't match typical karaoke display (transparent background with text overlay)
- Likely intentional for CD+G format limitations

---

## Test Files Analysis

**Current Test Setup:**
- Tests in `src/tests/cd+g-magic/` are manually created
- Reference CDG files (like sample_project_04.cdg) are pre-generated binaries
- Test data is hardcoded in test files

**Size Issue:**
The test CDG files are large (432KB for sample_project_04) because:
1. All frames are fully rendered (no delta encoding)
2. CD+G format requires 24 bytes per packet
3. At 18,000 packets per test file, that's 432KB
4. This is unavoidable given the format

**Auto-generation Potential:**
Could generate test files on-the-fly from minimal .cmp files, but current approach is reasonable.

---

## Implementation Priority

### High Priority (Blocking Features)
1. **Line-by-line text rendering for karaoke modes** - Currently text appears all at once instead of progressively
2. **Implement text highlighting (WIPE events)** - No visual indication of which line is "current"
3. **Proper memory_preset_index handling** - Screen clears may happen unexpectedly

### Medium Priority (Polish)
4. Validate palette loading respects clip settings
5. Test border drawing (border_index handling)
6. Implement fade effects for line transitions

### Low Priority (Optimization)
7. Delta encoding for smaller output files
8. Reduce test file sizes (non-critical)

---

## Reproduction Steps

To see the issue:

```bash
# Enable debug mode in bin/render-cdg.ts (line 22)
CDGMagic_CDGExporter.DEBUG = true;

# Run with test project
npx tsx ./bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg

# Look for the "training" clip output (packet 2700)
# You'll see: "Converted 15 lines to 768 FontBlocks"
# But all FontBlocks have same start_pack, not spread over time
```

---

## Next Steps

1. Implement karaoke mode detection in `schedule_text_clip()`
2. Create line distribution logic for MODE_5LNCT and similar modes
3. Add proper memory_preset_index and border_index checking
4. Implement WIPE event generation for highlighting
5. Test output with actual karaoke player if available

---

## Notes

- All 707 unit tests still passing
- Basic rendering works (text appears, images display)
- Issue is specifically with timing and effects, not basic functionality
- C++ reference implementation has detailed karaoke mode handling (CDGMagic_TextClip.cpp lines 200-320)

