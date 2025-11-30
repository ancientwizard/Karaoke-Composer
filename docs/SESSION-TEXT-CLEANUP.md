# Text/Font Processing Cleanup Summary

## Work Completed

### 1. Code Quality Improvements ✅
- **Test Pattern Refactoring**:
  - Extracted `create_test_pattern_tile()` helper function
  - Improved variable naming (x/y → tile_x/tile_y)
  - Added clear documentation for screen layout (50×18 tiles)
  - Reduced inline calculations and improved readability

- **Coordinate Masking Fix**:
  - Fixed test pattern Y coordinate: & 0xff → & 0x1f (5 bits for Y 0-17)
  - Fixed test pattern X coordinate: & 0xff → & 0x3f (6 bits for X 0-49)
  - Note: this was in test code only, not affecting actual BMP/TextClip rendering

### 2. Issues Identified but NOT Fixed ⚠️

**TextClip Off-by-1 Error** (107,105 remaining mismatches):
- Root cause: **NOT coordinate masking** (coordinates already correct in real code)
- Likely cause: **Palette/color handling**
  - TextClip loads hardcoded default palette instead of clip-specific palette
  - `foregroundColor`/`backgroundColor` extracted but not properly used
  - May be color index calculation error

**Architecture Mismatch**:
- C++ renders TextClip → BMP image → FontBlocks
- Current TS renders TextClip → direct TileBlocks
- This fundamental difference explains why patterns don't match

**Font Rendering Issues**:
- Current `TextRenderer.ts` uses simplified 5×7 bitmap font
- No support for complex effects (outlines, anti-aliasing)
- No multi-character tile rendering
- Doesn't match C++ FLTK-based rendering

---

## Current State

**Code Quality**: ✅ IMPROVED (test pattern is now clean and maintainable)
**Accuracy**: ⚠️ UNCHANGED (75.21% - remaining issues are not coordinate-related)
**Tests**: ✅ ALL PASSING (619 tests)

---

## Recommendations for Next Work

### Short Term (Quick Wins)
1. **Investigate palette handling in TextClip**:
   - Why are we loading default palette instead of clip palette?
   - Are `foregroundColor`/`backgroundColor` being applied correctly?
   - Check if color indices are off-by-1 due to palette assignment

2. **Review color index calculations**:
   - Verify `renderTextToTile()` color parameters
   - Check if background vs foreground are swapped
   - Ensure palette lookup is correct

### Medium Term (Architectural)
1. **Consider BMP-based TextClip rendering**:
   - Would require significant refactor
   - Could gain +5-10% accuracy
   - Better matches C++ pipeline

2. **Improve font rendering**:
   - Use proper font data instead of 5×7 bitmap
   - Add effect support (outlines, styles)
   - Better match C++ FLTK rendering

### Long Term (Polish)
1. **TextClip effect implementation**:
   - Text outlines
   - Anti-aliasing
   - Multiple colors and styles

2. **Test coverage**:
   - Verify all sample files render correctly
   - Check different text colors and styles

---

## What Was NOT Changed

- TextClip color handling (needs investigation)
- Font rendering implementation (architectural issue)
- Pixel data generation (may be part of off-by-1 error)

The current approach of rendering text directly to tile blocks is fundamentally different from C++ (which uses BMP intermediate). Until we understand the root cause of the off-by-1 error, major refactoring should wait.

---

## Documentation Created

`docs/TEXT-RENDERING-ISSUES.md` - Comprehensive analysis of:
- Current problems and ugly code
- Root cause analysis with specific code references
- Solution plan with phases
- References to C++ implementation details

---

## Impact Assessment

**Positive**:
- Code is now more maintainable
- Coordinate system is better documented
- Clear roadmap for future improvements

**Negative**:
- Off-by-1 error still unresolved
- Accuracy unchanged
- May require architectural changes

**Risk Level**: LOW
- Only test pattern code was refactored
- Real BMP/TextClip rendering unchanged
- All tests passing

---

## Next Investigation Steps

1. Add debug logging to see what colors TextClip is using
2. Compare with reference file's palette packets
3. Check if `foregroundColor`/`backgroundColor` values are correct
4. Verify `renderTextToTile()` is receiving correct parameters
5. Consider if off-by-1 is in the pixel data or color index

---

**Status**: Code Quality ✅ | Off-by-1 Issue ⚠️ Needs Investigation
