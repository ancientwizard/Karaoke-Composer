# CD+G Magic Text Rendering Pipeline Analysis

## Overview
This document describes how the CD+G Magic reference implementation renders TextClips into FontBlocks. The process involves rendering text to a bitmap using FLTK, extracting pixel data with palette indices, and then encoding those pixels into CD+G FontBlock packets.

---

## Part 1: Text Character Rendering to Pixel Data

### Rendering Context
- **Container**: `CDGMagic_TextClip::render_text_to_bmp()` 
- **Graphics Library**: FLTK (Fast Light Toolkit)
- **Canvas Size**: 288×(variable) pixels
- **Block Size**: 6×12 pixels (standard CD+G font block dimension)

### Rendering Steps

1. **Offscreen Buffer Creation**
   ```cpp
   Fl_Offscreen offscreen_image = fl_create_offscreen(line_width, line_height);
   fl_begin_offscreen(offscreen_image);
   ```
   Creates a temporary FLTK offscreen buffer to render text without displaying it.

2. **Font Setup**
   ```cpp
   fl_font(internal_font_index, internal_font_size);
   ```
   Sets FLTK font to the configured font and size (e.g., Arial, 20pt).

3. **Background Fill**
   ```cpp
   fl_draw_box(FL_FLAT_BOX, 0, 0, line_width, line_height, 
               (internal_background_index << 030) | 0x00FFFFFF);
   ```
   - Fills entire canvas with the background color
   - **Key Detail**: Color is indexed as `background_index << 24` (shifted 24 bits, or 3 bytes)
   - This maps **palette index to color byte position 3** (RGBA format: AABBGGRR in memory, but treated as index in high byte)
   - The `0x00FFFFFF` ensures full alpha opacity

4. **Outline Rendering** (optional)
   - Circular outline: drawn with `internal_outline_index` color at multiple angles
   - Square outline: drawn with `internal_outline_index` color at adjacent pixel positions
   - Both use the same indexed color approach

5. **Foreground Text Rendering**
   ```cpp
   fl_color((internal_foreground_index << 030) | 0x00FFFFFF);
   fl_draw(current_line_text, left_start, top_start);
   ```
   - Sets text color using `foreground_index << 24`
   - Draws text at center position with baseline alignment

6. **Pixel Extraction**
   ```cpp
   fl_read_image(temp_buffer, 0, 0, line_width, line_height);
   ```
   - Reads the offscreen buffer into RGB memory (`3 bytes per pixel`)
   - Result: `temp_buffer` contains RGB triplets (R, G, B, R, G, B, ...)

7. **Pixel-to-BMP Storage**
   ```cpp
   for (int px = 0; px < line_width * line_height; px++) {
       current_image->linear_pixel(px, temp_buffer[px*3]);
   }
   ```
   - **Critical Step**: Only the **RED channel** (`px*3`) is stored
   - The RED channel contains the palette index value
   - This works because:
     - When color is set with `(index << 24) | 0x00FFFFFF`, the actual RGB value becomes:
       - If index maps to a palette color, FLTK renders that color
       - But since we only use indices 0-15 in the high byte, the R channel naturally contains that index

---

## Part 2: Foreground/Background Color Determination

### Color Index Variables
Each TextClip maintains these internal color indices (0-15 for standard 16-color palette):

| Variable | Purpose | Default |
|----------|---------|---------|
| `internal_foreground_index` | Main text color | 2 |
| `internal_background_index` | Canvas background | 0 |
| `internal_outline_index` | Outline/shadow color | 1 |
| `internal_box_index` | Box decoration (lyrics mode) | 0 |
| `internal_frame_index` | Frame decoration (lyrics mode) | 4 |

### Rendering Priority (Stacked)
1. **Background**: Fills entire canvas with `background_index`
2. **Optional Decorations**: Box and frame drawn with their indices (lyrics mode only)
3. **Outline**: Drawn in circular/square patterns with `outline_index`
4. **Antialiasing** (optional): Adjacent pixels drawn with `foreground_index + 1`
5. **Foreground Text**: Drawn last with `foreground_index`

### Result
The rendered bitmap contains multiple palette indices representing:
- Index 0 (or other background): Canvas background
- Index 1 (or outline): Outline/shadow pixels
- Index 2 (or foreground): Main text pixels
- Index 3 (if antialiasing): Anti-aliasing pixels (intermediate color)

---

## Part 3: BMP to FontBlock Conversion

### Entry Point
```cpp
std::deque<CDGMagic_FontBlock*> CDGMagic_GraphicsEncoder::bmp_to_fonts(
    CDGMagic_MediaClip *incoming_clip)
```

### Process Overview

#### Step 1: Transition Block Division
- The rendered bitmap (288×N pixels) is divided into 6×12 pixel blocks
- Each block becomes one potential FontBlock
- Multiple blocks cover the entire bitmap width (288÷6 = 48 blocks)
- Height depends on font size and block alignment (12-pixel increments)

#### Step 2: Block-by-Block Extraction
For each 6×12 block:
```cpp
for (int y_pxl = 0; y_pxl < 12; y_pxl++) {
    for (int x_pxl = 0; x_pxl < 6; x_pxl++) {
        unsigned char color_index = bmp_object->pixel(x_pxl + x_offset, 
                                                      y_pxl + y_offset);
        curr_fontblock->pixel_value(x_pxl, y_pxl, color_index);
    }
}
```

- **Extracts**: The palette index (0-15) from each pixel position
- **Stores**: In a 6×12 pixel array within the FontBlock object
- **Result**: Each pixel in the block contains an 8-bit palette index value

#### Step 3: Transparency/Compositing Setup
```cpp
if (bmp_object->should_composite() == 1) {
    curr_fontblock->replacement_transparent_color(bmp_object->composite_index());
}
else if (bmp_object->should_composite() == 2) {
    curr_fontblock->overlay_transparent_color(bmp_object->composite_index());
}
```

- **Replacement Mode**: Specified color index is treated as transparent (not drawn)
- **Overlay Mode**: Specified color index allows layer blending
- **Default**: No transparency (index value 256 = "opaque")

---

## Part 4: FontBlock Encoding to CD+G Packets

### Overview
FontBlocks are converted to CD+G subcode packets using one of several encoding strategies depending on the number of unique colors.

### Color Analysis Phase
```cpp
unsigned char num_colors();  // Counts unique palette indices in 6×12 block
unsigned char prominent_color(unsigned char prominence = 0);  // Returns nth most-used color
```

**Algorithm**:
1. Count occurrences of each palette index in the 6×12 block
2. Sort by frequency (most common first)
3. Exclude transparent index (if set)
4. Return in order of prominence

### Encoding Strategies

#### 1. Single Color Block (num_colors == 1)
**Uses**: 1 CD+G COPY_FONT packet

```cpp
// Command packet header
write_fontblock_single(COPY_FONT, channel, x_block, y_block, 
                       prominent_color(0), prominent_color(0), packet);

// Bitmap data (12 rows)
int the_line = 0x3F;  // All 6 pixels set to '1'
for (int y_pos = 0; y_pos < 12; y_pos++) {
    packet.data[4 + y_pos] = the_line;
}
```

**Encoding**:
- Both foreground and background palette colors set to the same index
- All pixels in bitmap set to 0x3F (binary: 111111 = all bits on)
- Result: Entire block displays the single color

#### 2. Two Color Block (num_colors == 2)
**Uses**: 1 CD+G COPY_FONT packet

```cpp
int colors_to_write[2];
colors_to_write[0] = prominent_color(0);  // Most common color
colors_to_write[1] = prominent_color(1);  // Second color

write_fontblock_single(COPY_FONT, channel, x_block, y_block, 
                       colors_to_write[0], colors_to_write[1], packet);

for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit if pixel equals the less common color
        int pix_val = (block_pixel[x_pos][y_pos] == colors_to_write[1]);
        the_line |= (pix_val << (5 - x_pos));
    }
    packet.data[4 + y_pos] = the_line;
}
```

**Encoding**:
- CD+G COPY_FONT packet stores two palette indices (background and foreground)
- Each pixel in the bitmap stores a single bit:
  - **0 bit**: Display the "0" color (colors_to_write[0], the most common)
  - **1 bit**: Display the "1" color (colors_to_write[1], the less common)
- This is essentially a 1-bit-per-pixel bitmap mapped to two colors

#### 3. Three Color Block (num_colors == 3)
**Uses**: 2 CD+G packets (1 COPY_FONT + 1 XOR_FONT)

**Pack 1 - COPY_FONT**:
```cpp
colors_to_write[0] = prominent_color(1);  // 2nd most common
colors_to_write[1] = prominent_color(0);  // Most common
colors_to_write[2] = prominent_color(2);  // Least common

write_fontblock_single(COPY_FONT, channel, x_block, y_block, 
                       colors_to_write[0], colors_to_write[1], packet[0]);

for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit if pixel is 2nd or 3rd color
        int pix_val = (pixel == colors_to_write[1]) || 
                      (pixel == colors_to_write[2]);
        the_line |= (pix_val << (5 - x_pos));
    }
    packet[0].data[4 + y_pos] = the_line;
}
```

**Pack 2 - XOR_FONT**:
```cpp
write_fontblock_single(XOR_FONT, channel, x_block, y_block, 
                       0x00, colors_to_write[1] ^ colors_to_write[2], packet[1]);

for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit only if pixel is the 3rd color
        int pix_val = (pixel == colors_to_write[2]);
        the_line |= (pix_val << (5 - x_pos));
    }
    packet[1].data[4 + y_pos] = the_line;
}
```

**Encoding Logic**:
- COPY_FONT establishes 3-color foundation:
  - Background color (index 0): colors_to_write[0]
  - Foreground color (index 1): colors_to_write[1]
  - Bitmap pixels tell which pixels get the "1" treatment
- XOR_FONT modifies specific pixels:
  - XOR operation: the remaining pixels that need colors_to_write[2]
  - Pixel = (COPY_FONT result) XOR (XOR_FONT if bit=1)
  - Formula: if pixel==colors_to_write[2], set XOR bit to ensure:
    - colors_to_write[1] XOR (colors_to_write[1] ^ colors_to_write[2]) 
    - = colors_to_write[2] ✓

#### 4. Four or More Colors
**Uses**: Multiple packets with complex bit-manipulation strategies

The encoder analyzes the color indices bitwise to find the most efficient packet sequence using XOR operations. For example, if colors are {1, 2, 4, 8} (each using single bits), three packets can encode all combinations.

---

## Part 5: Key CD+G Encoding Details

### Pixel-to-Bit Mapping
In CD+G FontBlocks, each pixel maps to a single **bit** in the bitmap data:
```
Byte position: [x_block (4 bits)][y_block (4 bits)][color0][color1]
               [... bitmap data (12 rows × 6 pixels) ...]

Each row: 6 pixels = 1 byte (bits 5-0, where bit 5 = leftmost pixel)
```

**Bit Ordering** (left-to-right):
```cpp
for (int x_pos = 0; x_pos < 6; x_pos++) {
    int pix_val = (block_pixel[x_pos][y_pos] == target_color);
    the_line |= (pix_val << (5 - x_pos));  // Bit 5=left, Bit 0=right
}
```

### Color Storage in Packets
```cpp
struct CD_SCPacket {
    unsigned char data[24];  // 6 header + 12 rows + 6 reserved
    // data[0-3]: Header (packet type, block position, etc.)
    // data[4-5]: Color indices (color0 and color1)
    // data[6-17]: Bitmap rows (12 bytes, one per row)
    // data[18-23]: Reserved/unused
};
```

---

## Part 6: Transparency & Alpha Handling

### No Native Alpha
CD+G has **no native alpha channel**. However, the reference implementation simulates transparency:

1. **Transparent Index**:
   ```cpp
   fontblock->replacement_transparent_color(color_index);
   ```
   - Marks a palette index as "transparent"
   - During compositing, pixels with this index are skipped (not rendered)
   - Used for layering multiple text blocks

2. **Compositing Modes**:
   - **Replacement (mode 1)**: Transparent pixels don't overwrite existing screen content
   - **Overlay (mode 2)**: Transparent pixels allow blending with lower layers
   - **Off (default)**: All pixels are opaque, overwrite previous content

3. **Implementation**:
   ```cpp
   // In compositor:
   if (comp_buffer[layer_offset] < 256) {  // < 256 means opaque
       fontblock->pixel_value(x, y, comp_buffer[layer_offset]);
   } else {  // 256 = transparent
       fontblock->pixel_value(x, y, last_preset_index);
   }
   ```

---

## Part 7: CD+G-Specific Text Rendering Considerations

### Block Alignment
- Font size determines bitmap height: `actual_text_height = font_size + borders*2`
- Height is **padded to 12-pixel boundaries** (ceil division):
  ```cpp
  int blk_height = (actual_text_height + 11) / 12;
  int line_height = blk_height * 12;
  ```
- Result: Text always occupies whole FontBlock rows (no partial blocks)

### Memory Preset & Border Colors
- **Memory Preset**: The color index used to fill unused areas (default: index 0)
- **Border Color**: The VRAM border color surrounding the 300×216 display area
- Both are metadata attached to the first text event

### Palette Handling
- Each TextClip can assign a separate 16-color palette
- Palette colors are embedded within the CD+G stream as PAL packets
- Text rendering **pre-multiplies** palette indices into the rendering process
- The indices 0-15 map to the assigned palette

### Text vs. BMP Clips
Key difference from generic bitmap clips:
- **TextClips**: Colors are always drawn as **indexed palette values** (0-15)
- **BMPClips**: Colors can be arbitrary; encoding uses color analysis to find best font encoding
- Both use the same FontBlock encoding, but TextClips have constrained color sets

### Karaoke Modes
The reference implementation supports multiple karaoke text modes:
- **TITLES**: Page-based text with multiple lines per clip
- **LYRICS**: Line-by-line text with separate highlight tracking
- **5-TLINE / 7-MLNCT**: Line palette modes with per-line color switching
- Different modes use different composite settings and palette update masks

---

## Summary: Text Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TextClip Setup                                                │
│    - Font: internal_font_index, internal_font_size               │
│    - Colors: foreground(2), background(0), outline(1)            │
│    - Text content: internal_text_buffer                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FLTK Offscreen Rendering                                      │
│    - Create 288×N pixel buffer                                   │
│    - Draw: background fill → outline → foreground text           │
│    - Each element uses palette indices (0-15) as colors          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Pixel Extraction                                              │
│    - fl_read_image() reads offscreen RGB buffer                  │
│    - Extract RED channel (pixel*3) containing palette indices    │
│    - Store in BMPObject as 8-bit indexed array                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Block Division                                                │
│    - Split 288×N bitmap into 6×12 FontBlocks                     │
│    - Each block maintains 72 pixels (6×12) of palette indices    │
│    - Coordinates: x (0-47), y (0-17 for standard display)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Color Analysis & Encoding                                     │
│    - Count unique colors in each block                           │
│    - Choose encoding: 1-color, 2-color, 3-color, or 4+ colors   │
│    - Generate COPY_FONT and/or XOR_FONT packets                  │
│    - Map pixel indices to bits in packet bitmap                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CD+G Packet Stream                                            │
│    - 1-2 packets per block (24 bytes each)                       │
│    - Embeds at specific pack (timing) positions in stream        │
│    - Includes palette data (PAL packets) for color assignment    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### Key Constants
- **Palette Range**: 0-15 (standard 16-color palette)
- **Transparent Marker**: Index 256 (valid indices are 0-255)
- **Block Dimensions**: 6 pixels wide × 12 pixels tall
- **Screen Blocks**: 50×18 blocks (300×216 pixels)
- **Canvas Width**: 288 pixels (48 full blocks)

### Critical Pixel Handling
- **Only R channel used** from RGB buffer to extract palette index
- **Palette indices must be 0-15** for standard CD+G
- **Multiple indices** in same block → multi-color encoding
- **Background must be non-transparent** (or compositing fails)

### Optimization Considerations
- Text with 1-2 colors encodes efficiently (1 packet/block)
- Text with 3+ colors requires multiple packets (2-3 per block)
- Antialiasing (index+1) adds a 4th color → more packets
- Outline effects layer multiple palette indices → higher packet count
