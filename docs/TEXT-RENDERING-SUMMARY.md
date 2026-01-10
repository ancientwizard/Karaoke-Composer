# Text Rendering Implementation Summary

## Navigation Guide

This document is part of the Text Rendering documentation. Other related documents:

- **TEXT-RENDERING-ANALYSIS.md** - Detailed technical analysis with source code references
- **TEXT-RENDERING-OVERVIEW.md** - High-level architecture overview
- **TEXT-RENDERING-EVOLUTION.md** - Historical evolution and fixes
- **TEXT-RENDERING-IMPLEMENTATION-CHECKLIST.md** - Step-by-step implementation guide
- **TEXT-RENDERING-QUICK-REFERENCE.md** - Quick lookup tables and formulas
- **TEXT-RENDERING-SOURCE-CODE-REFERENCE.md** - Source code mapping
- **TEXT-RENDERING-ARCHITECTURE.md** - Detailed architecture patterns

---

## Executive Summary

The CD+G Magic reference implementation renders text through this pipeline:

1. **Render text to bitmap** using FLTK library with indexed palette colors
2. **Extract palette indices** from rendered pixels (RED channel contains index)
3. **Divide bitmap into 6×12 FontBlocks** (standard CD+G block size)
4. **Analyze colors** in each block to determine encoding strategy
5. **Generate CD+G packets** using COPY_FONT and/or XOR_FONT commands
6. **Embed in CD+G stream** at specific temporal positions with palette data

---

## Key Finding: How Palette Colors Are Used

### The Rendering Process

**Text is rendered using palette indices as colors:**

```cpp
// Step 1: Set color by palette index
fl_color((internal_foreground_index << 030) | 0x00FFFFFF);

// Step 2: Draw text using that indexed color
fl_draw(current_line_text, left_start, top_start);

// Step 3: Read pixels from offscreen buffer
fl_read_image(temp_buffer, 0, 0, line_width, line_height);

// Step 4: Extract RED channel (contains the palette index)
current_image->linear_pixel(px, temp_buffer[px*3]);
```

**Result**: Each pixel in the rendered bitmap contains a palette index (0-15).

### Palette Indices Used

| Rendering Layer | Index Variable | Typical Value |
|-----------------|-----------------|---------------|
| Canvas background | `background_index` | 0 |
| Outline/shadow | `outline_index` | 1 |
| Foreground text | `foreground_index` | 2 |
| Antialiasing | `foreground_index + 1` | 3 |

**Important**: All indices must be in the range **0-15** for standard CD+G palette.

---

## Pixel-to-FontBlock Mapping

### Block Structure
- **Size**: 6 pixels wide × 12 pixels tall
- **Total pixels per block**: 72
- **Data format**: 72 bytes (one byte per pixel, each byte = palette index 0-255)

### Example: Two-Color Block

```
Input Bitmap:
Color 2 2 0 0 2 2
Color 0 0 2 2 0 0
Color 2 0 2 0 2 0

Palette indices: 2 = foreground, 0 = background

Storage in FontBlock:
pixels[0] = 2, pixels[1] = 2, pixels[2] = 0, ..., pixels[71] = 0
```

---

## FontBlock to CD+G Packet Encoding

### The Encoding Problem
CD+G FontBlocks use **1 bit per pixel**, but the rendered bitmap has **8 bits per pixel** (palette index).

CD+G solves this with **multi-packet encoding** where each packet specifies two colors:
- **Bit 0** in the packet bitmap → Display color0
- **Bit 1** in the packet bitmap → Display color1

### Single Color Block (Most Efficient)
- **Packets used**: 1 COPY_FONT
- **Bit pattern**: All 1s (0x3F per row)
- **Display**: All pixels show the same color

Example:
```
FontBlock has only color 2 (15 occurrences, 57 no-data pixels)
→ Encode as single color 2
→ CD+G packet: color0=2, color1=2, bitmap=0x3F for all 12 rows
→ All pixels display as palette index 2
```

### Two Color Block (Most Common)
- **Packets used**: 1 COPY_FONT
- **Bit pattern**: 1 if pixel is less-common color, 0 if most-common
- **Color encoding**: color0 (most common) vs color1 (less common)

Example:
```
FontBlock pixels: [2 2 2 0 2 2 2 2 0 0 ...]
                   [most common=2, less common=0]

Analysis: color0=2 (appears 8×), color1=0 (appears 2×)

CD+G packet encoding:
  color0 = 2, color1 = 0
  Row 0: pixels [2 2 2 0 2 2 2 2] → bits [0 0 0 1 0 0 0 0] = 0x08

When displayed:
  - Bit 0 → show palette index 2 (foreground color)
  - Bit 1 → show palette index 0 (background color)
```

### Three Color Block (Most Complex per Block)
- **Packets used**: 2 (1 COPY_FONT + 1 XOR_FONT)
- **Strategy**: Use XOR to create a 3rd color value

Example:
```
FontBlock has colors: 2 (most common), 0, 8 (least common)

COPY packet:
  color0 = 0, color1 = 2
  Bitmap: 1 if pixel is 2 or 8
  
XOR packet (XOR_FONT):
  color0 = 0 (unused), color1 = 2 ^ 8 = 10
  Bitmap: 1 if pixel is 8

When displayed:
  - For pixels originally 2: 2 (from COPY)
  - For pixels originally 0: 0 (from COPY)
  - For pixels originally 8: (2) XOR (10) = 8 ✓

Mathematical trick: color1 XOR xor_value = target_color
                   2 XOR 10 = 8
```

---

## Transparency and Compositing

### Transparent Color Index
```cpp
fontblock->replacement_transparent_color(index);
```

- **Value < 256**: That palette index is treated as transparent
- **Value >= 256**: All pixels are opaque (normal)
- **Default**: 256 (fully opaque)

### Compositing Modes

| Mode | Behavior |
|------|----------|
| **None** | All pixels overwrite previous screen content |
| **Replacement** | Transparent pixels don't overwrite (show layer below) |
| **Overlay** | Transparent pixels allow blending with lower layers |

### Implementation Detail
```cpp
// During compositing:
if (pixel_value < 256 && pixel_value == transparent_index) {
    // Skip this pixel - don't draw it
} else {
    // Draw this pixel
}
```

---

## What Determines "Set" vs "Unset" Bits

In the FontBlock bitmap data:

**Bit = 1 (Set)**:
- Pixel value matches the "1" color specified in the CD+G packet
- In 2-color mode: pixel == colors_to_write[1] (less common)
- In 3-color XOR: pixel == secondary_color being encoded

**Bit = 0 (Unset)**:
- Pixel value matches the "0" color specified in the CD+G packet
- In 2-color mode: pixel == colors_to_write[0] (most common)
- In 3-color XOR: pixel != secondary_color

### Practical Example
```cpp
// Two-color encoding
colors_to_write[0] = 2;  // Most common (background text area)
colors_to_write[1] = 15; // Less common (foreground text pixels)

for (int x_pos = 0; x_pos < 6; x_pos++) {
    int pix_val = (fontblock->pixel_value(x_pos, y) == colors_to_write[1]);
    //               ↑ if pixel is 15, this is TRUE (1)
    //               ↑ if pixel is 2, this is FALSE (0)
    
    the_line |= (pix_val << (5 - x_pos));
    // Bit position = 5 - x_pos (MSB first)
}

Result: Bit = 1 → display color 15 (foreground)
        Bit = 0 → display color 2 (background)
```

---

## CD+G-Specific Rendering Considerations

### 1. Block Alignment
Text height must align to 12-pixel boundaries:
```
Font size: 20px + borders → 24px total height
Aligned to blocks: ceil(24 / 12) × 12 = 24px (2 blocks)

Result: Text always occupies whole block rows, never partial blocks
```

### 2. Color Index Constraints
- **Standard palette**: Indices 0-15 only
- **Extended palette**: Indices 0-255 (if extended mode)
- **Special values**: 256 = transparent/opaque marker

### 3. Palette Switching
Text clips can include embedded PAL packets to switch the 16-color palette between events:
```cpp
// Each text event can have its own palette
current_event->PALObject = new CDGMagic_PALObject(palette_colors);
```

### 4. Canvas Size
- **Width**: Fixed at 288 pixels (48 blocks of 6 pixels each)
- **Height**: Variable based on font size and line count
- **Display area**: 300×216 pixels (50×18 blocks) total, text is centered in 288-wide strip

### 5. Outline/Shadow Effects
```cpp
// Rendering order (bottom to top):
1. Background fill (background_index)
2. Circular outline (outline_index) at multiple angles
3. Square outline (outline_index) at adjacent positions
4. Antialiasing (optional, outline_index+1) at nearby positions
5. Foreground text (foreground_index)

// Result: Text has shadow/outline effect
// Uses multiple palette indices in final bitmap
```

---

## Implementation Checklist

- [ ] **Color Index System**: Implement palette index storage (0-15)
- [ ] **Text Rendering**: Render to canvas using palette colors
- [ ] **Pixel Extraction**: Map rendered RGB back to palette indices
- [ ] **Block Division**: Split bitmap into 6×12 FontBlocks
- [ ] **Color Analysis**: Count unique colors per block
- [ ] **1-Color Encoding**: Handle single-color blocks
- [ ] **2-Color Encoding**: Handle 2-color blocks with single COPY packet
- [ ] **3-Color Encoding**: Handle 3-color blocks with COPY + XOR packets
- [ ] **4+ Color Handling**: Implement XOR strategies for complex colors
- [ ] **Transparency**: Support transparent/composite indices
- [ ] **Packet Generation**: Write CD+G packet headers and bitmap data
- [ ] **Timing**: Associate packets with correct play positions (packs)
- [ ] **Palette Embedding**: Include PAL packets for color assignment

---

## Common Pitfalls

### 1. Palette Index Range
```typescript
// ❌ WRONG: Using full RGB values
pixel = 0xFF2020;  // This is not an index!

// ✅ CORRECT: Using 0-15 indices
pixel = 2;  // Refers to palette[2]
```

### 2. Bit Ordering in Bitmap
```cpp
// ❌ WRONG: Setting bit at position x directly
the_line |= (pix_val << x);

// ✅ CORRECT: Reverse bit order (MSB first)
the_line |= (pix_val << (5 - x));  // Bit 5=leftmost, Bit 0=rightmost
```

### 3. Color Byte Extraction
```cpp
// ❌ WRONG: Using green or blue channel
unsigned char index = buffer[px*3 + 1];  // Green channel

// ✅ CORRECT: Using red channel
unsigned char index = buffer[px*3 + 0];  // Red channel
```

### 4. XOR Calculation
```cpp
// ❌ WRONG: Direct color values
xor_value = color2 ^ color3;  // May not produce needed color

// ✅ CORRECT: Select colors so XOR produces target
// If need colors {1, 2, 3}:
// COPY: 1 and 2
// XOR:  xor_value = 2 ^ 3 = 1
// Then: color2 XOR 1 = 3 ✓
```

### 5. Transparent Index Handling
```cpp
// ❌ WRONG: Treating index 0 as always transparent
if (pixel == 0) { skip(); }

// ✅ CORRECT: Only if explicitly set as transparent
if (pixel == transparent_index && transparent_index < 256) { skip(); }
```

---

## References

- **C++ Reference**: `/reference/cd+g-magic/CDG_Magic/Source/`
  - `CDGMagic_TextClip.cpp`: Text rendering to bitmap
  - `CDGMagic_FontBlock.cpp`: FontBlock color analysis
  - `CDGMagic_GraphicsEncoder__write_fontblock.cpp`: Packet encoding
  - `CDGMagic_GraphicsEncoder__compositor.cpp`: Compositing logic

- **Key Functions**:
  - `render_text_to_bmp()`: FLTK rendering pipeline
  - `bmp_to_fonts()`: Bitmap to FontBlock conversion
  - `write_fontblock()`: FontBlock to packet encoding
  - `num_colors()` / `prominent_color()`: Color analysis

---

## Summary

Text rendering in CD+G requires:
1. **Indexed color palette** (0-15 for standard)
2. **Rendering to bitmap** with palette indices as pixel values
3. **Efficient encoding** using 1-3 packets per 6×12 block
4. **Bit manipulation** to map many colors to few bits
5. **Compositing support** for layered text effects

The key insight is that CD+G's 1-bit-per-pixel format is extended through clever use of XOR operations, allowing 3+ colors per block while maintaining CD+G compliance.
