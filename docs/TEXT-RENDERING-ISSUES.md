# Text/Font Rendering Issues - Analysis & Fix Plan

## Current Problems

### 1. **Off-by-1 Error in TextClip Rendering**
All remaining 107,105 mismatches show consistent off-by-1 pattern:
- Expected: 0x09, Got: 0x08
- Expected: 0x19, Got: 0x18
- Pattern: Every value is lower by 1 (N → N-1)

### 2. **Ugly Test Pattern Code**
The `add_test_pattern_tiles()` function has:
- Inconsistent coordinate handling (tile_y uses & 0xff instead of & 0x1f)
- Messy formatting with inline pixel data generation
- Mixed comments and unclear logic
- Hardcoded color calculations

### 3. **Poor TextRenderer Design**
Current `TextRenderer.ts` has:
- Oversimplified 5×7 bitmap font (not matching C++ rendering)
- Direct character-to-tile rendering (bypasses BMP pipeline)
- No support for multi-character tiles
- No anti-aliasing, effects, or proper font handling
- Architectural mismatch with C++ (which renders to BMP → FontBlock)

### 4. **Architectural Mismatch**
**C++ approach**: TextClip → render to BMP image → BMPObject → FontBlocks
**Current TS approach**: TextClip → direct TileBlocks

This explains the off-by-1 error: we're rendering text directly instead of through the BMP pipeline that C++ uses.

---

## Root Cause Analysis

### Off-by-1 Error Investigation
The consistent N → N-1 pattern suggests:
1. **Possible cause 1**: Character tile index off by 1
   - Font blocks start at different offset
   - Character set indexing wrong (starting at 0 instead of 1)
   
2. **Possible cause 2**: Color palette index off by 1
   - Color indices are being decremented somewhere
   - Palette lookup table offset

3. **Possible cause 3**: Pixel data bit order
   - Bits are shifted wrong (left vs right)
   - 6-bit vs other width mismatch

4. **Possible cause 4**: Architectural difference
   - We're rendering directly; C++ renders via BMP
   - Different tile coordinate systems
   - Different pixel-to-tile scaling

### Code Issues Identified

**TextRenderer.ts line 101-108**:
```typescript
for (let row = 0; row < 12; row++) {
    let byte = 0;
    if (row < 7) {
      const fontRow = fontData[row]!;
      // Shift left by 1 to center in 6-bit space
      byte = (fontRow << 1) & 0x3F;
    }
    bitmap[row] = byte;
  }
```
Issue: Shifting left by 1 may cause off-by-1 in rendering

**CDGMagic_CDGExporter.ts line 860-863** (test pattern):
```typescript
payload[2] = y & 0xff;  // WRONG! Should be & 0x1f (5 bits for Y)
payload[3] = x & 0xff;  // WRONG! Should be & 0x3f (6 bits for X)
```
This directly matches the off-by-1 problem!

---

## Solution Plan

### Phase 1: Fix Immediate Issues (High Priority)

#### 1.1 Fix test pattern coordinate masking
```typescript
// BEFORE (WRONG):
payload[2] = y & 0xff;  // 8 bits
payload[3] = x & 0xff;  // 8 bits

// AFTER (CORRECT):
payload[2] = y & 0x1f;  // 5 bits for Y (0-17)
payload[3] = x & 0x3f;  // 6 bits for X (0-49)
```

#### 1.2 Clean up test pattern code
- Extract pixel generation into separate function
- Use clear variable names
- Document coordinate system
- Remove inline calculations

#### 1.3 Investigate TextClip off-by-1
- Check if it's also coordinate masking issue
- Review color index calculations
- Compare with C++ FontBlock rendering

### Phase 2: Architectural Fix (Medium Priority)

#### 2.1 Understand C++ TextClip pipeline
- How does TextClip render to BMP?
- What are BMP→FontBlock conversion steps?
- How do effects (outlines, anti-alias) work?

#### 2.2 Refactor TextRenderer
- Consider BMP-based intermediate representation
- Support multi-character rendering
- Implement proper font handling
- Add effect support

#### 2.3 TextClip improvements
- Use BMPObject for intermediate rendering
- Implement proper color palette handling
- Support text effects and styling

### Phase 3: Quality & Testing (Low Priority)

#### 3.1 Improve code formatting
- Use consistent style across text rendering
- Add proper documentation
- Clean up debug code

#### 3.2 Comprehensive testing
- Test on all sample files
- Verify text rendering quality
- Check color accuracy

---

## Expected Impact

### Immediate Fixes (Phase 1)
- **Fix**: Coordinate masking bug in test pattern
- **Impact**: May resolve some rendering issues
- **Risk**: Low (isolated to test code)

### Investigation Results (Phase 1)
- **Goal**: Understand TextClip off-by-1 error
- **Expected**: Identify if architectural or data bug
- **Impact**: Guide Phase 2 approach

### Architectural Refactor (Phase 2)
- **Goal**: Match C++ rendering pipeline
- **Potential Impact**: +5-10% accuracy (25,000-50,000 bytes)
- **Risk**: Medium (requires significant refactor)

---

## Code Quality Issues to Address

### TextRenderer.ts Issues
1. Font data is simplified (5×7 instead of proper font)
2. No proper character rendering
3. No support for effects
4. Too simple for production use

### Test Pattern Code Issues
1. Inline pixel generation
2. Hardcoded color calculations
3. Inconsistent masking
4. Poor variable names

### TextClip Rendering Issues
1. Direct tile rendering (wrong approach)
2. No BMP intermediate
3. Off-by-1 error (cause unknown)
4. Missing effect support

---

## Next Steps

1. **Immediate**: Fix coordinate masking bug (5 min)
2. **Quick**: Run tests to see if it helps (5 min)
3. **Investigation**: Debug TextClip off-by-1 (30 min)
4. **Decision point**: 
   - If off-by-1 is just coordinate bug: fix and test
   - If architectural: plan Phase 2 refactor
5. **Planning**: Decide on TextClip refactor scope

---

## References

### C++ FontBlock Writing
File: `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder__write_fontblock.cpp`

Key points:
- Supports 1-3 colors per block with optimization
- 4+ colors use XOR technique
- Proper bit manipulation for pixel data
- Channel-aware rendering

### CD+G Packet Format
- TILE_BLOCK (0x06): Basic tile rendering
- Y coordinate: 5 bits (0-17)
- X coordinate: 6 bits (0-49)
- Color1, Color2: 4 bits each
- Pixel data: 12 bytes (6 bits per row)

---

**Status**: Analysis complete, ready for implementation
**Priority**: HIGH - fixing coordinate bug immediately
**Complexity**: MEDIUM - Phase 2 may require significant work
