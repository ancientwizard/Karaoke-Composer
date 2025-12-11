# Text Rendering Implementation Checklist

Complete checklist for implementing text rendering based on CD+G Magic analysis.

## Documentation Overview
- 📋 **TEXT-RENDERING-INDEX.md** - Navigate all documentation
- 📝 **TEXT-RENDERING-SUMMARY.md** - Executive summary (start here)
- 🔍 **TEXT-RENDERING-ANALYSIS.md** - Deep technical analysis  
- ⚡ **TEXT-RENDERING-QUICK-REFERENCE.md** - Quick lookup tables
- 💻 **TYPESCRIPT-TEXT-RENDERING-IMPL.md** - Code examples
- 🎯 **TEXT-RENDERING-SOURCE-CODE-REFERENCE.md** - Source locations

---

## Phase 1: Foundation Setup

### Color System
- [ ] Define palette interface (16 colors standard, 256 extended)
- [ ] Implement palette lookup: `palette[index] → RGBA value`
- [ ] Create color index constants (0-15)
- [ ] Implement transparent color marker (use value 256 or special flag)

**Reference**: QUICK-REF → "Palette Color Usage"

### Rendering Context
- [ ] Create rendering canvas (HTML5 Canvas or equivalent)
- [ ] Setup 2D graphics context
- [ ] Implement `setColorByIndex(index)` function
  - Maps palette index to actual RGB color
  - Sets canvas fill/stroke color
  - Handles transparency
- [ ] Implement `measureText()` for centering
- [ ] Setup offscreen/double-buffering

**Reference**: TYPESCRIPT-IMPL → "Text Rendering Context"

### Color Palette Setup
- [ ] Load or define color palette (16 colors minimum)
- [ ] Store palette as Uint32Array (RGBA format)
- [ ] Create palette for each TextClip (or global palette)
- [ ] Implement palette switching logic (for future karaoke modes)

**Reference**: SUMMARY → "Palette Colors"

---

## Phase 2: Text Rendering

### Basic Text Rendering
- [ ] Implement `renderText(text, font, size, colors, width, height)`
- [ ] Set canvas dimensions
- [ ] Clear canvas to transparent/white
- [ ] Draw background box with `background_index` color
- [ ] Draw text with `foreground_index` color
- [ ] Center text horizontally and vertically
- [ ] Use proper baseline alignment

**Reference**: TYPESCRIPT-IMPL → "TextRenderer.renderText()"

### Outline Effects (Optional)
- [ ] Implement circular outline rendering
  - Draw text at multiple angles around center point
  - Use `outline_index` color
  - Configurable outline size (0 = no outline)
- [ ] Implement square outline rendering
  - Draw text at adjacent pixel positions
  - Use `outline_index` color
  - Combined with circular for best effect

**Reference**: ANALYSIS → "Part 1: Outline Rendering"

### Antialiasing (Optional)
- [ ] Implement antialiasing option
- [ ] Draw text at 4 neighboring positions with `foreground_index + 1`
- [ ] Creates smoother edges (uses 4th color)
- [ ] Can increase packet overhead significantly

**Reference**: ANALYSIS → "Part 1: Antialiasing"

### Pixel Extraction
- [ ] Extract rendered canvas to pixel data
- [ ] Get image data as RGBA (4 bytes per pixel)
- [ ] **Critical**: Map RGBA back to palette indices
  - Render with actual palette RGB values
  - Use color distance formula to find closest match
  - Store best match palette index
- [ ] Return array of palette indices (Uint8Array)

**Reference**: TYPESCRIPT-IMPL → "findClosestPaletteIndex()"

---

## Phase 3: Bitmap to FontBlock Conversion

### Block Division
- [ ] Implement bitmap-to-blocks divider
- [ ] Calculate block count: `ceil(width / 6)` × `ceil(height / 12)`
- [ ] Pad bitmap if not multiple of block size
  - Fill padding with `background_index`
  - Ensures clean block alignment
- [ ] Iterate through each 6×12 block position

**Reference**: TYPESCRIPT-IMPL → "BitmapToFontBlockConverter"

### Block Extraction
- [ ] For each block position (bx, by):
  - Extract 6×12 = 72 pixels
  - Store palette index for each pixel
  - Create FontBlock object with coordinate and pixel data
- [ ] Handle edges gracefully (incomplete blocks at boundaries)
- [ ] Store blocks in array/deque for later processing

**Reference**: ANALYSIS → "Part 3: Block-by-Block Extraction"

### Transparency Setup
- [ ] Determine if transparency is needed
- [ ] Set transparent index (typically `composite_index`)
  - Use value < 256 to enable
  - Use value >= 256 to disable (opaque)
- [ ] Mark composite mode (none, replacement, overlay)
- [ ] Communicate transparent color to encoding phase

**Reference**: ANALYSIS → "Part 6: Transparency Handling"

---

## Phase 4: Color Analysis

### Color Counting
- [ ] Implement `analyzeColors(block)` function
- [ ] Count occurrences of each palette index in 6×12 block
- [ ] Exclude transparent index if set
- [ ] Return list of unique colors

**Reference**: TYPESCRIPT-IMPL → "analyzeColors()" / ANALYSIS → "Part 4"

### Color Frequency Sorting
- [ ] Sort colors by frequency (most common first)
- [ ] Store sorted color array
- [ ] Remember original occurrence counts
- [ ] Handle ties (arbitrary stable sort)

**Reference**: ANALYSIS → "Part 4: Color Analysis Phase"

### Color Count Decision
- [ ] Determine number of unique colors
  - 1 color → Single-color encoding
  - 2 colors → Two-color encoding
  - 3 colors → Three-color encoding
  - 4+ colors → Complex multi-color encoding
- [ ] Select encoding strategy accordingly

**Reference**: SUMMARY → "FontBlock to CD+G Packet Encoding"

---

## Phase 5: Packet Encoding - Single Color

### Single Color Encoding
- [ ] Check if block has exactly 1 unique color
- [ ] Create COPY_FONT packet
  - Color0 = the single color
  - Color1 = the single color (same)
  - X, Y coordinates from block
- [ ] Set bitmap data to 0x3F for all 12 rows
  - 0x3F = binary 111111 = all 6 pixels "set"
- [ ] Return 1 packet

**Reference**: TYPESCRIPT-IMPL → "encodeSingleColor()" / ANALYSIS → "Single Color Block"

---

## Phase 6: Packet Encoding - Two Colors

### Two Color Analysis
- [ ] Get two most-common colors
  - Color0 = most common (background)
  - Color1 = less common (foreground)
- [ ] Create COPY_FONT packet header
  - color0 = most-common color index
  - color1 = less-common color index

### Two Color Bitmap Encoding
- [ ] For each row (y = 0-11):
  - For each pixel (x = 0-5):
    - If pixel == color1 → set bit at position (5 - x)
    - If pixel == color0 → clear bit
  - Store resulting byte in bitmap row
- [ ] Encode 12 rows = 12 bytes of bitmap data

**Important Bit Ordering**:
```
Pixel position: [0][1][2][3][4][5]  (left to right)
Bit position:   [5][4][3][2][1][0]  (MSB to LSB)
```

**Reference**: TYPESCRIPT-IMPL → "encodeTwoColors()" / QUICK-REF → "Two-Color Block Example"

---

## Phase 7: Packet Encoding - Three Colors

### Three Color Analysis
- [ ] Get three most-common colors
  - Color0 = most common (will be background in COPY)
  - Color1 = second most common (will be foreground in COPY)
  - Color2 = least common (will use XOR)

### COPY Packet (3-Color Part 1)
- [ ] Create COPY_FONT packet
  - color0 = Color1 (second-most common)
  - color1 = Color0 (most common)
  - Note: color0 and color1 are swapped!
- [ ] Encode bitmap:
  - For each pixel:
    - If pixel == Color0 OR pixel == Color2 → set bit
    - Otherwise → clear bit
  - This creates "candidate" pixels for XOR modification

### XOR Packet (3-Color Part 2)
- [ ] Create XOR_FONT packet
  - color0 = 0x00 (always, placeholder)
  - color1 = Color0 XOR Color2 (the magic value)
  - x, y = same block coordinates
- [ ] Encode bitmap:
  - For each pixel:
    - If pixel == Color2 → set bit
    - Otherwise → clear bit
- [ ] This modifies specific pixels via XOR operation

### Three Color Display Logic
```
Final pixel calculation:
  - If bit=1 in COPY and bit=0 in XOR → show Color0
  - If bit=1 in COPY and bit=1 in XOR → show (Color0 XOR color1_xor) = Color2 ✓
  - If bit=0 in COPY → show Color1
```

**Reference**: TYPESCRIPT-IMPL → "encodeThreeColors()" / ANALYSIS → "Three Color Block"

---

## Phase 8: Packet Encoding - Four+ Colors

### Simple Approach (Fallback)
- [ ] For 4+ colors: Emit multiple 3-color encodings
- [ ] Use first 3 colors, then encode remainder separately
- [ ] Not optimal but functional

### Advanced Approach (Optimization)
- [ ] Analyze bit patterns of color values
  - `colors_OR` = all bits that appear in any color
  - `colors_AND` = bits that appear in all colors
  - `colors_XOR` = all bits that differ
- [ ] Determine if colors can be represented with fewer packets
- [ ] Create multiple COPY/XOR pairs as needed
- [ ] Example: colors {1, 2, 4, 8} → 3 packets possible

**Reference**: ANALYSIS → "Four or More Colors" / SOURCE-REFERENCE → Function lines 165-339

---

## Phase 9: Packet Structure

### CD+G Packet Format
- [ ] Understand packet structure (24 bytes)
  - Bytes 0-3: Header (command type, coordinates, colors)
  - Bytes 4-15: Bitmap data (12 rows)
  - Bytes 16-23: Reserved/unused
- [ ] Implement packet builder/constructor
- [ ] Set correct command type (COPY_FONT or XOR_FONT)

### Bitmap Row Encoding
- [ ] For each of 12 rows:
  - Calculate byte value (0-255)
  - Store in packet.data[4 + row_index]
- [ ] Validate bitmap values are 0-255

### Packet Properties
- [ ] Set block X coordinate (0-49)
- [ ] Set block Y coordinate (0-17)
- [ ] Set color0 palette index (0-15)
- [ ] Set color1 palette index (0-15)
- [ ] Set packet type (COPY_FONT or XOR_FONT)

**Reference**: SOURCE-REFERENCE → "Packet Format"

---

## Phase 10: Stream Integration

### Packet Queuing
- [ ] Collect all packets from all blocks
- [ ] Maintain order (left-to-right, top-to-bottom for each block)
- [ ] Assign timing information (pack position in stream)
- [ ] Store packets with metadata:
  - Pack number (when to display)
  - Z-order/track (for compositing)
  - Channel (if applicable)

### Palette Packet Generation
- [ ] Create PAL (palette) packet
  - Contains 16 RGBA colors
  - Maps palette indices 0-15 to actual colors
  - Sent before first text event
- [ ] Set PAL packet timing (same pack as first text event)

### Stream Ordering
- [ ] Emit PAL packet first (palette definition)
- [ ] Then emit all FontBlock packets (text geometry)
- [ ] Maintain timing sequence

**Reference**: ANALYSIS → "Part 4: Entry Point"

---

## Phase 11: Testing

### Unit Tests
- [ ] Test `renderText()` with various:
  - Font families
  - Font sizes
  - Foreground/background colors
  - Text content (ASCII, multi-line)
- [ ] Test `analyzeColors()` with:
  - Single color blocks
  - Two color blocks
  - Three+ color blocks
  - All-transparent blocks
- [ ] Test encoding strategies:
  - 1-color → correct 0x3F pattern
  - 2-color → correct bitmap bits
  - 3-color → correct COPY + XOR combination

### Integration Tests
- [ ] Full pipeline: text → bitmap → blocks → packets
- [ ] Verify packet count (1 for 1-2 colors, 2 for 3 colors)
- [ ] Verify bitmap data is correct
- [ ] Verify coordinates are in range (0-49 for x, 0-17 for y)
- [ ] Verify color indices are valid (0-15)

### Visual Tests
- [ ] Render text with different color combinations
- [ ] Verify rendered appearance matches input
- [ ] Check outline effect is correct
- [ ] Check antialiasing is smooth
- [ ] Compare with reference implementation output

**Reference**: SUMMARY → "Implementation Checklist"

---

## Phase 12: Optimization

### Performance
- [ ] Profile color-finding algorithm (expensive step)
- [ ] Consider caching palette color distances
- [ ] Optimize bitmap scanning (avoid redundant iterations)
- [ ] Cache color analysis results if blocks are reused

### Memory
- [ ] Don't allocate more FontBlocks than necessary
- [ ] Use typed arrays (Uint8Array, etc.) for efficiency
- [ ] Clean up intermediate bitmap buffers
- [ ] Reuse packet objects if possible

### Code Quality
- [ ] Refactor common patterns (e.g., bit setting)
- [ ] Add comprehensive comments
- [ ] Use named constants instead of magic numbers
- [ ] Create utility functions for pixel operations

---

## Phase 13: Error Handling

### Input Validation
- [ ] Validate text input (not null/empty)
- [ ] Validate font size (positive, reasonable bounds)
- [ ] Validate colors (0-15 for indices)
- [ ] Validate canvas dimensions

### Edge Cases
- [ ] Handle very long text (wrap or truncate)
- [ ] Handle very large font (may not fit in blocks)
- [ ] Handle blocks entirely outside canvas
- [ ] Handle transparency index out of range

### Error Recovery
- [ ] Provide fallback for invalid colors
- [ ] Default to sensible values for missing colors
- [ ] Log warnings for edge cases
- [ ] Don't crash on unusual input

---

## Phase 14: Documentation

### Code Comments
- [ ] Document each function's purpose
- [ ] Explain algorithm steps in detail
- [ ] Document parameter ranges and constraints
- [ ] Document return value meanings

### Examples
- [ ] Provide example usage code
- [ ] Show before/after (input text → output packets)
- [ ] Explain color encoding with concrete examples
- [ ] Show packet structure diagrams

### API Documentation
- [ ] Document public interfaces
- [ ] List all parameters and return types
- [ ] Explain edge cases and limitations
- [ ] Provide TypeScript/JavaScript interfaces

---

## Completion Checklist

### Essential Features
- [x] Color system (0-15 indices)
- [x] Text rendering (FLTK equivalent)
- [x] Bitmap extraction (RGB to indices)
- [x] Block division (288 → 6×12 blocks)
- [x] Color analysis (frequency sorting)
- [x] 1-color encoding (0x3F pattern)
- [x] 2-color encoding (bitmap bits)
- [x] 3-color encoding (COPY + XOR)
- [x] Packet structure (headers + bitmap)

### Recommended Features
- [ ] Outline effects (circular + square)
- [ ] Antialiasing support (index+1)
- [ ] Transparency handling (composite modes)
- [ ] Palette switching (multiple palettes)
- [ ] 4+ color optimization (complex patterns)
- [ ] Error handling (input validation)
- [ ] Unit tests (comprehensive coverage)
- [ ] Performance profiling

### Nice-to-Have Features
- [ ] Visual debugger (show block boundaries)
- [ ] Packet inspector (display packet contents)
- [ ] Color picker UI (select colors visually)
- [ ] Preview renderer (see final output)
- [ ] Comparison with reference implementation
- [ ] Optimization reports (packet efficiency)

---

## Reference Quick Links

| Need | Document | Section |
|------|----------|---------|
| Overview | SUMMARY | Top of doc |
| How colors work | QUICK-REF | Palette Color Usage |
| Bit encoding | QUICK-REF | Pixel-to-Bit Mapping |
| Algorithm details | ANALYSIS | Parts 1-7 |
| Code examples | TYPESCRIPT-IMPL | All sections |
| Source locations | SOURCE-CODE-REF | All sections |
| Flowchart | ANALYSIS | Summary flowchart |
| Common mistakes | SUMMARY | Common Pitfalls |

---

## Implementation Order Recommendation

1. **Start with COLOR SYSTEM** (Phase 1)
   - Get palette working first
   - Foundation for everything else

2. **Then RENDERING** (Phase 2)
   - Implement basic text drawing
   - Get pixel extraction working correctly

3. **Then CONVERSION** (Phase 3)
   - Simple bitmap → blocks conversion
   - Focus on correct data structure

4. **Then ENCODING** (Phases 4-8)
   - Start with 1-color (simplest)
   - Then 2-color (most common)
   - Then 3-color (most complex)
   - Then 4+ (if time permits)

5. **Then INTEGRATION** (Phase 9-10)
   - Combine into complete pipeline
   - Add palette packets
   - Stream ordering

6. **Then TESTING** (Phase 11)
   - Comprehensive test coverage
   - Compare with reference

7. **Then OPTIMIZE** (Phase 12)
   - Profile and improve
   - Clean up code

---

## Success Criteria

✅ **Implementation is complete when**:
- [ ] Text renders to bitmap with correct palette indices
- [ ] Bitmap converts to FontBlocks without data loss
- [ ] FontBlocks encode to correct number of packets
- [ ] Packets contain correct bitmap data
- [ ] Blocks are positioned at correct screen coordinates
- [ ] Colors display correctly from CD+G stream
- [ ] Multiple color blocks work efficiently
- [ ] Transparency (if implemented) works correctly
- [ ] All test cases pass
- [ ] Performance is acceptable

---

**Last Updated**: December 11, 2025
**Based On**: CD+G Magic Reference Implementation Analysis
