# CD+G Magic Conversion - Session 5 Executive Summary

## Problem Statement
**Starting Point**: 107,047 byte mismatches (75.21% accuracy) in CD+G rendering
**Root Cause**: Missing multi-layer compositing architecture for overlapping clips
**Session Goal**: Identify and lay groundwork for architectural fix

## What Was Discovered

### Root Cause (Final Answer)
The C++ CD+Graphics Magic encoder uses an **8-layer compositor buffer** that our TypeScript implementation completely lacks. This buffer stores intermediate rendering results from multiple clips, allowing them to blend/layer correctly.

**Architectural Difference**:

| Aspect | C++ Reference | Our Implementation |
|--------|---------------|--------------------|
| Rendering | Write to compositor layers | Direct write to VRAM |
| Layers | 8 (tracks 0-7) | None (single layer) |
| Overlaps | Composited (pixels blend) | Overwrite (last clip wins) |
| Optimization | Only write packets if changed | Always write packets |
| Result | Correct interleaving | Clip ordering issues |

### Concrete Evidence
**Packet 680-695 Analysis**:

```
Reference (from C++ output):
  680: TextClip tile at (17,2)
  681: BMPClip tile at (25,12)
  682: TextClip tile at (17,3)
  683: BMPClip tile at (26,12)
  ... (alternating pattern)

Our Implementation (current):
  680: BMPClip tile at (25,12)
  681: TextClip tile at (18,1)
  682: BMPClip tile at (26,12)
  683: TextClip tile at (19,1)
  ... (also alternating but wrong)
```

**Why?** Reference reads from composited layers (TextClip on layer 1, BMPClip on layer 0).
Our code just queues packets sequentially without compositing.

## Solutions Implemented

### 1. CompositorBuffer Class
**File**: `src/ts/cd+g-magic/CompositorBuffer.ts` (242 lines)

```typescript
// 8-layer pixel buffer matching C++ architecture
const buffer = new CompositorBuffer(300, 216);

// Write pixels to specific layer
buffer.write_pixel(x, y, z_layer, color_index);

// Read composited result (top-most opaque pixel)
const composited_color = buffer.read_composited_pixel(x, y);

// Transparency: value 256 = skip to layer below
// All values 0-255 are opaque palette indices
```

**Status**: ✓ Complete, tested, follows code standards

### 2. Track Options Integration
**Files Modified**: 
- `src/ts/cd+g-magic/BMPToFontBlockConverter.ts`
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts`

**Change**: When FontBlocks are created, assign their `z_location` (layer) from clip track:
```typescript
if (track_options) {
  fontblock.z_location(track_options.track());    // 0-7
  fontblock.channel(track_options.channel());      // 0-3
}
```

**Status**: ✓ Complete, 619 tests passing, no regression

### 3. Documentation
**Created**:
- `docs/COMPOSITING-ARCHITECTURE-DISCOVERED.md` (420 lines)
  - Complete architecture breakdown
  - Layer compositing algorithm
  - Implementation requirements
  
- `docs/COMPOSITOR-INTEGRATION-PLAN.md` (257 lines)
  - 5-phase implementation roadmap
  - Detailed code changes needed
  - Testing strategy

**Status**: ✓ Complete, comprehensive

## Impact Analysis

### Before (Current State)
```
107,047 mismatches (23.77% error)
75.21% accuracy
Clips overwrite each other
BMPClip + TextClip overlap region completely broken
```

### After Compositor (Expected)
```
50,000-70,000 mismatches (conservative estimate)
78-82% accuracy (target)
Clips render to layers 0-7
Overlap regions show correct interleaving
TextClip and BMPClip both visible where they overlap
```

### Specific Improvements Expected
- **Packets 680-739**: Reduce mismatches by ~80% (overlap region)
- **Color accuracy**: Fix when compositing reveals correct pixel values
- **Interleaving**: Match reference's alternating clip pattern

## Technical Architecture

### Compositor Flow

```
Timeline Events
    ↓
[BMPClip] → FontBlocks (z=0) → Write to compositor layer 0
[TextClip] → FontBlocks (z=1) → Write to compositor layer 1
    ↓
For each tile position:
  Read composited pixel = top-most opaque value from layers 0-7
  If different from VRAM: generate CDG packet
```

### Key Values
- **Transparency**: 256 (skip to layer below)
- **Opaque**: 0-255 (palette indices)
- **Layers**: 0=bottom, 7=top
- **Fallback**: last_preset_index (background) if all transparent

### Rendering Pipeline (After Compositor)

```
OLD (Current):
  FontBlock → encode_color_logic → generate packets
  
NEW (With Compositor):
  FontBlock → write to comp_buffer[z_layer]
  [multiple clips write to different layers]
  Extract composited result → compare to VRAM
  If changed → encode and generate packets
```

## Next Steps (Ready for Implementation)

### Phase 1.3: CDGExporter Integration (CRITICAL)
**Time**: ~1 hour

1. Add CompositorBuffer member to CDGExporter
2. Initialize in schedule_packets()
3. Begin refactoring encode_fontblocks_to_packets()

### Phase 2: Rendering Refactor (MAJOR)
**Time**: ~1.5 hours

Rewrite encode_fontblocks_to_packets() to:
1. Write FontBlocks to compositor (not directly to packets)
2. Extract composited blocks
3. Compare with VRAM (track previous state)
4. Only generate packets if changed

### Phase 3: Testing & Validation
**Time**: ~1 hour

1. Single-clip test (should be unchanged)
2. Overlap-clip test (packets 680-739)
3. Accuracy measurement
4. Regression testing

**Total Implementation Time**: 3-4 hours

## Code Quality Status

✓ All 619 unit tests passing
✓ No TypeScript errors
✓ No lint errors
✓ CompositorBuffer: 242 lines, fully typed, documented
✓ Follows AGENTS.md guidelines (Allman-style, 2-space, 130-char max)
✓ Zero regressions introduced

## References

**C++ Source Code Studied**:
- `CDGMagic_GraphicsEncoder.h` - Architecture (COMP_LAYERS=8)
- `CDGMagic_GraphicsEncoder.cpp` - Main loop and bmp_to_fonts()
- `CDGMagic_GraphicsEncoder__compositor.cpp` - Layer compositing logic
- `CDGMagic_GraphicsEncoder__write_fontblock.cpp` - Packet generation

**Key Insights**:
```cpp
// From bmp_to_fonts (line 557):
curr_fontblock->z_location(incoming_clip->track_options()->track());

// From get_composited_fontblock (lines 103-115):
for (int z_loc = 0; z_loc < COMP_LAYERS; z_loc++) {
    if (comp_buffer[layer_offset] < 256) {
        return_block->pixel_value(..., comp_buffer[layer_offset]);
    }
}

// From write_fontblock (line 37):
if ((block_to_write->vram_only() == 0)
    && (copy_compare_fontblock(block_to_write) == 0))
    { return current_position; };  // Skip if unchanged
```

## Critical Success Factors

1. **Preserve existing tests**: Must not break 619 passing tests
2. **Phased approach**: Implement incrementally, test after each phase
3. **Single-clip validation**: Ensure non-overlapping clips unchanged before testing overlap
4. **Mismatch tracking**: Monitor specific packet ranges (680-739) where overlap occurs
5. **Color handling**: Separate issue (TextClip colors 1,2 vs 0,1) - address after compositor

## Known Remaining Issues (Post-Compositor)

**Not Fixed by Compositor**:
- TextClip color selection (why 1,2 instead of 0,1?)
- Some pixel position off-by-1 errors in TextClips
- Instruction type selection (COPY_FONT vs XOR_FONT optimization)

**These Will Be Addressed In**: Future investigation phases

## Recommendation for Next Session

1. **DO**: Implement Phase 1.3 immediately (compositor initialization in exporter)
2. **DO**: Test with single clip to verify no regression
3. **DO**: Refactor encode_fontblocks_to_packets incrementally
4. **DO**: Measure accuracy after each phase
5. **DON'T**: Try to fix TextClip colors yet (separate issue)
6. **DON'T**: Over-optimize before ensuring correctness

## Success Criteria

Session will be considered successful when:
- ✓ CompositorBuffer fully integrated into CDGExporter
- ✓ Single-clip rendering unchanged (no regression)
- ✓ All 619 tests still passing
- ✓ Packets 680-739 show improvement (interleaving pattern closer to reference)
- ✓ Overall accuracy improves toward 80%

---

## Summary

Session 5 successfully identified the root cause of 107,047 remaining byte mismatches:
**Missing multi-layer compositing architecture**.

The C++ reference uses an 8-layer compositor buffer that blends overlapping clips. Our implementation has no compositor, causing clips to overwrite each other instead of compositing.

**Foundational work completed**:
- CompositorBuffer class: ✓ Implemented
- Architecture documented: ✓ Complete
- Track assignment: ✓ Integrated
- Tests: ✓ All passing, no regression

**Next step**: Integrate CompositorBuffer into CDGExporter main rendering loop.

**Expected outcome**: Reduce mismatches from 107,047 to 50,000-70,000 (30-50% improvement), bringing accuracy to 78-82%.

---

<!-- End of Session 5 Executive Summary -->
