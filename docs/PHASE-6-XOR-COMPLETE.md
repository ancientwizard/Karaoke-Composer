# Phase 6: Missing Behaviors Implementation

**Status**: XOR Highlighting COMPLETE ✅

## Session Summary

### Completed: XOR Highlighting for Karaoke Text Animation

**What**: Implemented XOR_FONT (0x26) packet generation for dynamic text highlighting in karaoke mode.

**How It Works**:
1. TextClips with `highlight_mode: 1` and `karaoke_mode > 0` trigger XOR highlighting
2. Instead of COPY_FONT (0x06) packets that update VRAM, generate XOR_FONT (0x26) packets
3. XOR operation overlays pixels on top of existing VRAM without changing the background state
4. Creates animated highlighting effect as karaoke text plays

**Technical Implementation**:
- Added `xorOnly: boolean = false` parameter to `writeFontBlock()` function
- Implemented early-return XOR packet generation when `xorOnly === true`
- Updated scheduler to pass `xorOnly` flag through:
  - Probe step (for packet sizing)
  - Single event processing
  - Grouped event processing
- Added packet type tracking for diagnostics
- Fixed detection logic to check `clip.karaoke_mode` (not event-level)
- Skip VRAM updates for XOR-only blocks (they don't modify background)

**Results**:
```
Before: 0 XOR packets, 11,126 COPY packets
After:  11,093 XOR packets, 33 COPY packets
Total:  12,600 packets (stable, 42s duration)
```

**Key Code Changes**:
1. `src/cdg/encoder.ts`:
   - Line 132: Added `xorOnly: boolean = false` parameter
   - Lines 200-212: XOR-only branch (check for pixels, generate single XOR packet)

2. `src/cdg/scheduler.ts`:
   - Lines 65-67: Track XOR/COPY packet statistics
   - Line 297: Pass `xorOnly` to probe step `writeFontBlock()`
   - Line 347: Pass `xorOnly` to main `writeFontBlock()` call
   - Lines 348-352: Track packet types for diagnostics
   - Lines 354-357: Skip VRAM update for XOR-only blocks
   - Lines 393-394: Pass `xorOnly` in group processing
   - Lines 395-400: Track group packet types

3. `src/debug/generate-cdg-from-json.ts`:
   - Lines 315-317: Detect XOR highlighting (highlight_mode=1 + karaoke_mode>0)
   - Line 317: Set `xorOnly: isXorHighlight` on events

### Test Results

**File**: `/tmp/test_xor_fixed2.cdg`
- Size: 302,400 bytes (stable)
- Total packets: 12,600 (42 seconds at 300pps)
- COPY_FONT packets: 33
- XOR_FONT packets: 11,093
- Other: 1,474

**Generation**: Complete without errors
**File Integrity**: Verified (readable CDG format)

---

## Remaining Missing Behaviors

### Priority 1: SCROLL_COPY Command Generation (MEDIUM)
- **Purpose**: Scrolling text animation (scroll preset clips)
- **Implementation Location**: Reference has `generateScrollPacket()` function
- **Complexity**: Medium (packet generation exists, needs scheduling)
- **Impact**: Enables scroll-based text animation effects

### Priority 2: Compositing Modes (MEDIUM)
- **Purpose**: `replacement_transparent_color` and `overlay_transparent_color` handling
- **Implementation**: Affects how clips blend with background
- **Complexity**: Medium (flag-based, affects tile rendering)
- **Impact**: Better visual fidelity for overlapping clips

### Priority 3: Animation Detection (LOW)
- **Purpose**: `vram_only` flag for detecting non-visual animation
- **Implementation**: Mark events that don't actually render tiles
- **Complexity**: Low (boolean flag, affects VRAM tracking)
- **Impact**: Optimization and diagnostics

---

## Packet Statistics Summary

| Feature | Before | After | Change |
|---------|--------|-------|--------|
| COPY_FONT packets | 11,126 | 33 | -11,093 |
| XOR_FONT packets | 0 | 11,093 | +11,093 |
| Total packets | 12,600 | 12,600 | 0 (stable) |
| File size | 302,400 | 302,400 | 0 (stable) |

---

## Next Steps

1. **Test Playback**: Verify generated CDG plays correctly with XOR highlighting visible
2. **Compare with Reference**: Check visual output against reference implementation
3. **Implement SCROLL_COPY**: Next high-priority behavior
4. **Performance**: Monitor for any regression

---

## Technical Notes

### XOR Packet Structure
- Command: 0x26 (XOR_FONT, not COPY_FONT 0x06)
- Effect: Bitwise XOR of new pixels with existing VRAM pixels
- Advantage: Overlay effect without changing VRAM state
- Use Case: Text highlighting, dynamic animation overlays

### VRAM State Management
- XOR blocks don't update VRAM (they're overlay-only)
- COPY blocks do update VRAM (persistent background)
- Scheduler now correctly skips VRAM updates for XOR-only events

### Detection Logic
```typescript
const isXorHighlight = 
  clip.highlight_mode === 1 && 
  (clip.karaoke_mode != null && clip.karaoke_mode > 0)
```

This flags TextClips that should use dynamic highlighting.

---

## Files Modified
- `src/cdg/encoder.ts` (writeFontBlock function)
- `src/cdg/scheduler.ts` (font event scheduling)
- `src/debug/generate-cdg-from-json.ts` (XOR detection in generator)

## Commit
- Hash: 5cb1d53
- Message: "Implement XOR highlighting for karaoke text animation"
