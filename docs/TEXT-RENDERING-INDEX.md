# Text Rendering Documentation Index

This directory contains comprehensive analysis of how the CD+G Magic reference implementation renders TextClips into FontBlocks.

## Documents Overview

### 1. **TEXT-RENDERING-SUMMARY.md** (Start Here)
- **Purpose**: Executive summary and key findings
- **Contains**: 
  - High-level pipeline overview
  - How palette colors are used
  - Pixel-to-FontBlock mapping
  - FontBlock to CD+G packet encoding
  - Implementation checklist
  - Common pitfalls

**Read this first** for a complete understanding of the text rendering process.

---

### 2. **TEXT-RENDERING-ANALYSIS.md** (Deep Dive)
- **Purpose**: Detailed technical analysis based on source code
- **Contains**:
  - Part 1: Text rendering to pixel data (FLTK implementation details)
  - Part 2: Foreground/background color determination
  - Part 3: BMP to FontBlock conversion algorithm
  - Part 4: FontBlock encoding to CD+G packets (all color cases)
  - Part 5: Key CD+G encoding details (packet format, bit ordering)
  - Part 6: Transparency & alpha handling
  - Part 7: CD+G-specific considerations (block alignment, karaoke modes)
  - Summary flowchart

**Read this for detailed source code explanations and context.**

---

### 3. **TEXT-RENDERING-QUICK-REFERENCE.md** (Cheat Sheet)
- **Purpose**: Quick lookup reference for implementation
- **Contains**:
  - Palette color index table
  - Pixel-to-bit encoding examples
  - Color index assignment step-by-step
  - CD+G packet encoding decision tree
  - Transparent color handling
  - Typical text rendering example

**Use this while coding** for quick reference on specific details.

---

### 4. **TYPESCRIPT-TEXT-RENDERING-IMPL.md** (Implementation Guide)
- **Purpose**: Practical TypeScript/JavaScript implementation guidance
- **Contains**:
  - Core concepts with TypeScript interfaces
  - TextRenderer class (Canvas-based alternative to FLTK)
  - BitmapToFontBlockConverter class
  - FontBlockToPacketEncoder class
  - Complete pipeline class
  - Implementation notes and code examples
  - Palette color matching algorithm

**Read this to implement text rendering in TypeScript.**

---

## Key Questions Answered

### "How are text characters rendered to pixel data?"
See: **SUMMARY** → "Text Character Rendering to Pixel Data"
Or: **ANALYSIS** → "Part 1: Text Character Rendering"

**Quick Answer**: FLTK renders text using palette indices (0-15) as colors into an offscreen buffer. Pixels are extracted as RGB, and the RED channel is extracted as the palette index.

---

### "What determines foreground/background colors?"
See: **SUMMARY** → "Foreground/Background Color Determination"
Or: **ANALYSIS** → "Part 2: Color Determination"
Or: **QUICK-REF** → "Palette Color Usage"

**Quick Answer**: 
- `foregroundIndex` (default 2): Main text color
- `backgroundIndex` (default 0): Canvas background
- `outlineIndex` (default 1): Outline/shadow
- All must be in range 0-15 for standard CD+G palette

---

### "How is the BMP converted to FontBlocks?"
See: **SUMMARY** → "BMP to FontBlock Mapping"
Or: **ANALYSIS** → "Part 3: Conversion Algorithm"
Or: **QUICK-REF** → "Pixel-to-Bit Mapping"

**Quick Answer**: Bitmap is divided into 6×12 blocks. Each block stores 72 bytes (one per pixel) with palette indices. Blocks are then analyzed for color efficiency.

---

### "What determines if pixels are 'set' vs 'unset'?"
See: **SUMMARY** → "What Determines Set vs Unset Bits"
Or: **ANALYSIS** → "Part 4: Encoding Strategies"
Or: **QUICK-REF** → "CD+G Packet Encoding Decision Tree"

**Quick Answer**: In FontBlocks:
- **Bit = 1**: Pixel matches the "1" color (less common or specified color)
- **Bit = 0**: Pixel matches the "0" color (most common or background)
- The encoding maps multiple palette indices to these two bit states

---

### "How do transparency and alpha work?"
See: **SUMMARY** → "Transparency and Compositing"
Or: **ANALYSIS** → "Part 6: Transparency Handling"
Or: **QUICK-REF** → "Transparent Color Handling"

**Quick Answer**: CD+G has no native alpha. Instead:
- A specific palette index can be marked as "transparent"
- During compositing, transparent pixels don't overwrite lower layers
- Transparent index = 256 means "fully opaque" (no transparency)

---

### "What are the CD+G-specific considerations?"
See: **SUMMARY** → "CD+G-Specific Rendering Considerations"
Or: **ANALYSIS** → "Part 7: CD+G-Specific Considerations"

**Quick Answer**:
- Text must align to 12-pixel block boundaries
- Palette indices must be 0-15 (standard) or 0-255 (extended)
- Canvas width is fixed at 288 pixels (48 blocks)
- Outline/shadow effects layer multiple colors
- Karaoke modes support palette switching between events

---

## Source Code References

All analysis based on CD+G Magic reference implementation:

**Key Files**:
- `CDGMagic_TextClip.cpp` (lines 83-300): `render_text_to_bmp()`
- `CDGMagic_TextClip.cpp` (lines 770-900): `set_all_palettes()`
- `CDGMagic_GraphicsEncoder.cpp` (lines 550-650): `bmp_to_fonts()`
- `CDGMagic_GraphicsEncoder__write_fontblock.cpp` (lines 20-250): `write_fontblock()`
- `CDGMagic_FontBlock.cpp`: Color analysis and prominence
- `CDGMagic_GraphicsEncoder__compositor.cpp`: Compositing logic

**Location**:
`/reference/cd+g-magic/CDG_Magic/Source/`

---

## Implementation Roadmap

If implementing text rendering from scratch:

1. **Phase 1: Setup** (TYPESCRIPT-IMPL → Sections 1-2)
   - Create palette system
   - Setup rendering context (canvas)

2. **Phase 2: Rendering** (TYPESCRIPT-IMPL → Section 2)
   - Implement text rendering with palette colors
   - Extract pixels to palette indices

3. **Phase 3: Conversion** (TYPESCRIPT-IMPL → Section 3)
   - Bitmap to FontBlock conversion
   - Pad to block boundaries

4. **Phase 4: Encoding** (TYPESCRIPT-IMPL → Section 4)
   - Color analysis (count unique colors)
   - Single-color encoding
   - Two-color encoding
   - Three+ color encoding (COPY + XOR)

5. **Phase 5: Integration** (TYPESCRIPT-IMPL → Section 5)
   - Create complete pipeline
   - Add transparency support
   - Add palette embedding
   - Add timing information

---

## Common Reference Patterns

### "I need to understand X"
- **SUMMARY**: Use this for quick, high-level understanding
- **ANALYSIS**: Use this for detailed explanation with code context
- **QUICK-REF**: Use this for specific value tables or examples

### "I'm implementing X"
- **TYPESCRIPT-IMPL**: Use this for code examples and patterns
- **QUICK-REF**: Keep this open for bit ordering and encoding rules

### "I need to debug X"
- **SUMMARY** → "Common Pitfalls": Check typical mistakes
- **ANALYSIS** → Source code references: Review exact C++ implementation
- **QUICK-REF** → Examples: Compare expected vs actual behavior

---

## Key Insights

### Insight 1: Palette Indices as Colors
The breakthrough is that text is rendered using **palette indices (0-15) directly as color values**. This allows the offscreen buffer's RED channel to naturally contain the index.

### Insight 2: Bit Compression
CD+G's 1-bit-per-pixel format is extended using XOR operations:
- 2 colors: 1 packet with 1 bit/pixel
- 3 colors: 2 packets (COPY + XOR) with 1 bit/pixel each
- 4+ colors: Multiple packets with clever bit patterns

### Insight 3: Color Prominence
The encoding strategy depends on **color frequency**, not color value:
- Most common color → background (0 bits)
- Less common color → foreground (1 bits)
- XOR combinations for additional colors

### Insight 4: Compositing is Separate
Transparency is handled **after** encoding:
- FontBlock contains 72 pixel indices
- Compositing step checks if index == transparent_index
- If transparent, show layer below instead

### Insight 5: Block Alignment
Text rendering **always pads to 12-pixel boundaries** to ensure clean block alignment. No partial blocks.

---

## Document Maintenance

These documents were generated from analysis of:
- **CD+G Magic Reference Implementation** (C++)
- **Source Analysis Date**: December 2025
- **Analyzed Files**: CDGMagic_TextClip.cpp, CDGMagic_GraphicsEncoder.cpp, CDGMagic_FontBlock.cpp, and related files

**Last Updated**: December 11, 2025

If updating these documents:
1. Reference specific line numbers from source files
2. Keep SUMMARY concise (executive level)
3. Keep ANALYSIS detailed (include code snippets)
4. Keep QUICK-REF concise (tables and examples only)
5. Keep TYPESCRIPT-IMPL practical (runnable patterns)
