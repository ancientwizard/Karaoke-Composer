# Text Rendering: Source Code Reference Guide

Complete reference to CD+G Magic source code locations for text rendering implementation.

## Core Rendering Pipeline

### 1. TextClip Creation and Initialization
**File**: `CDGMagic_TextClip.cpp`
**Function**: `CDGMagic_TextClip::CDGMagic_TextClip(int X, int Y, int W, int H)`
**Lines**: 29-63

**Purpose**: Initialize text clip with default colors and settings
**Key Variables Set**:
- `internal_foreground_index = 2`
- `internal_background_index = 0`
- `internal_outline_index = 1`
- `internal_fill_index = 16`
- `internal_composite_index = 16`
- `internal_palette_number = 1`

**Entry Point** for text rendering pipeline.

---

### 2. Main Text Rendering Function
**File**: `CDGMagic_TextClip.cpp`
**Function**: `void CDGMagic_TextClip::render_text_to_bmp()`
**Lines**: 83-248

**What It Does**:
1. Creates FLTK offscreen buffer
2. Renders text to bitmap using palette indices
3. Extracts pixel data from RGB buffer
4. Stores indices in BMPObject
5. Creates MediaEvents and FontBlocks

**Key Steps**:
```cpp
// Line 105-110: Create offscreen buffer
Fl_Offscreen offscreen_image = fl_create_offscreen(line_width, line_height);
fl_begin_offscreen(offscreen_image);

// Line 113: Set font
fl_font(internal_font_index, internal_font_size);

// Line 125-130: Draw background
fl_draw_box(FL_FLAT_BOX, 0, 0, line_width, line_height,  
            (internal_background_index << 030) | 0x00FFFFFF);

// Line 180-182: Draw foreground text
fl_color((internal_foreground_index << 030) | 0x00FFFFFF);
fl_draw(current_line_text, left_start, top_start);

// Line 185: Read pixel data
fl_read_image(temp_buffer, 0, 0, line_width, line_height);

// Line 224-225: Extract RED channel (palette index)
for (int px = 0; px < line_width * line_height; px++) {
    current_image->linear_pixel(px, temp_buffer[px*3]);
}
```

---

### 3. Karaoke Text Rendering (Alternative)
**File**: `CDGMagic_TextClip.cpp`
**Function**: `void CDGMagic_TextClip::render_karaoke_to_bmp()`
**Lines**: 250-700

**Purpose**: Special rendering for karaoke modes (5-line, 7-line, palette-switching)
**When Called**: `if (internal_karaoke_mode >= KAR_MODE__5TLINE)`

**Differences from render_text_to_bmp()**:
- Per-line color switching instead of per-clip
- Multiple text events per clip (one per line)
- Palette row masks for selective updates
- Complex highlight timing logic

---

### 4. Palette Assignment
**File**: `CDGMagic_TextClip.cpp`
**Function**: `void CDGMagic_TextClip::set_all_palettes()`
**Lines**: 770-820

**Purpose**: Assign RGB palette colors to palette indices
**Key Logic**:
```cpp
// Line 788: Determine palette to use
int palette_to_use = ((internal_palette_number >= 0) && 
                      (internal_palette_number < maximum_embedded_palettes)) 
                     ? internal_palette_number : 0;

// Line 792-799: Set 16-color palette
for (unsigned int curr_clip = 0; curr_clip < event_queue()->size(); curr_clip++) {
    for (int pal_idx = 0; pal_idx < 16; pal_idx++) {
        curr_img->PALObject()->color(pal_idx, 
                                     embedded_palettes[palette_to_use][pal_idx]);
    }
}
```

---

## FontBlock Creation and Conversion

### 5. BMP to FontBlock Conversion
**File**: `CDGMagic_GraphicsEncoder.cpp`
**Function**: `std::deque<CDGMagic_FontBlock*> CDGMagic_GraphicsEncoder::bmp_to_fonts(CDGMagic_MediaClip *incoming_clip)`
**Lines**: 552-602

**What It Does**:
1. Iterates through bitmap events
2. Divides bitmap into 6×12 pixel blocks
3. Extracts pixel indices into FontBlock
4. Sets compositing parameters

**Key Algorithm**:
```cpp
// Line 570-597: For each 6x12 block
for (int y_pxl = 0; y_pxl < 12; y_pxl++) {
    for (int x_pxl = 0; x_pxl < 6; x_pxl++) {
        curr_fontblock->pixel_value(x_pxl, y_pxl, 
                                    bmp_object->pixel(x_pxl+x_offset, 
                                                      y_pxl+y_offset));
    }
}

// Line 598-600: Set compositing
if (bmp_object->should_composite() == 1) {
    curr_fontblock->replacement_transparent_color(
        bmp_object->composite_index());
}
```

---

### 6. FontBlock Color Analysis
**File**: `CDGMagic_FontBlock.cpp`
**Function**: `unsigned char CDGMagic_FontBlock::num_colors()`
**Lines**: 154-174

**Purpose**: Count unique palette indices in 6×12 block

**Algorithm**:
```cpp
unsigned char clrs[256];
for (int px = 0; px < 256; px++) { clrs[px] = 0; }

// Count occurrences of each color
for (int px = 0; px < 6*12; px++) { 
    clrs[internal_bmp_data[px]]++;  
}

// Count how many colors were present at least once
for (int px = 0; px < 256; px++) {
    if (clrs[px] > 0) { number_of_colors++; }
}
```

---

### 7. FontBlock Prominence Analysis
**File**: `CDGMagic_FontBlock.cpp`
**Function**: `unsigned char CDGMagic_FontBlock::prominent_color(unsigned char prominence)`
**Lines**: 196-260

**Purpose**: Return nth most-common color (0=most common, 1=next, etc.)

**Algorithm**:
1. Count occurrences of each color
2. Build vector of {color_index, occurrence_count}
3. Sort by occurrence count (descending)
4. Return requested prominence level

---

## Packet Encoding

### 8. Main Packet Encoding Function
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Function**: `int CDGMagic_GraphicsEncoder::write_fontblock(int current_position, CDGMagic_FontBlock *block_to_write)`
**Lines**: 22-376

**Purpose**: Convert FontBlock to CD+G packets
**Return Value**: Updated packet position in stream

**Decision Tree** (Lines 68-340):
```cpp
if (block_to_write->num_colors() == 1) {
    // Single color → Lines 73-85
    // One COPY packet with all bits set
}
else if (block_to_write->num_colors() == 2) {
    // Two colors → Lines 87-109
    // One COPY packet with 1-bit encoding
}
else if (block_to_write->num_colors() == 3) {
    // Three colors → Lines 111-163
    // COPY packet + XOR packet
}
else {
    // Four+ colors → Lines 165-339
    // Complex multi-packet encoding
}
```

---

### 9. Single Color Encoding
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Lines**: 73-85

**Packet Header**:
```cpp
write_fontblock_single(COPY_FONT, block_to_write->channel(),
                       block_to_write->x_location(), 
                       block_to_write->y_location(),
                       block_to_write->prominent_color(), 
                       block_to_write->prominent_color(),
                       cdg_stream[current_position]);
```

**Bitmap Data**:
```cpp
int the_line = 0x3F;  // 111111 binary = all pixels set
for (int y_pos = 0; y_pos < 12; y_pos++) {
    cdg_stream[current_position].data[4+y_pos] = the_line;
}
```

---

### 10. Two Color Encoding
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Lines**: 87-109

**Color Selection**:
```cpp
colors_to_write[0] = block_to_write->prominent_color(0);  // Most common
colors_to_write[1] = block_to_write->prominent_color(1);  // Less common
```

**Packet Header**:
```cpp
write_fontblock_single(COPY_FONT, channel, x, y,
                       colors_to_write[0], colors_to_write[1],
                       cdg_stream[current_position]);
```

**Bitmap Encoding**:
```cpp
for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit if pixel equals less common color
        int pix_val = (block_to_write->pixel_value(x_pos, y_pos) 
                       == colors_to_write[1]);
        the_line |= (pix_val << (5-x_pos));  // Bit 5 = leftmost
    }
    cdg_stream[current_position].data[4+y_pos] = the_line;
}
```

---

### 11. Three Color Encoding - COPY Packet
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Lines**: 111-140

**Color Selection Logic**:
```cpp
colors_to_write[0] = block_to_write->prominent_color(1);  // 2nd most common
colors_to_write[1] = block_to_write->prominent_color(0);  // Most common
colors_to_write[2] = block_to_write->prominent_color(2);  // Least common
```

**Bitmap Encoding** (Lines 128-139):
```cpp
for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit if pixel is color 1 OR color 2
        int pix_val = (block_to_write->pixel_value(x_pos, y_pos) 
                       == colors_to_write[1])
                   || (block_to_write->pixel_value(x_pos, y_pos) 
                       == colors_to_write[2]);
        the_line |= (pix_val << (5-x_pos));
    }
    cdg_stream[current_position].data[4+y_pos] = the_line;
}
current_position++;
```

---

### 12. Three Color Encoding - XOR Packet
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Lines**: 141-163

**XOR Value Calculation**:
```cpp
write_fontblock_single(XOR_FONT, channel, x, y,
                       0x00, 
                       colors_to_write[1] ^ colors_to_write[2],
                       cdg_stream[current_position]);
```

**Bitmap Encoding** (Lines 149-162):
```cpp
for (int y_pos = 0; y_pos < 12; y_pos++) {
    int the_line = 0;
    for (int x_pos = 0; x_pos < 6; x_pos++) {
        // Set bit only if pixel is color 2
        int pix_val = (block_to_write->pixel_value(x_pos, y_pos) 
                       == colors_to_write[2]);
        the_line |= (pix_val << (5-x_pos));
    }
    cdg_stream[current_position].data[4+y_pos] = the_line;
}
current_position++;
```

---

### 13. Four+ Color Encoding
**File**: `CDGMagic_GraphicsEncoder__write_fontblock.cpp`
**Lines**: 165-339

**Bitwise Analysis** (Lines 171-187):
```cpp
unsigned char colors_OR  = 0x00;  // All colors ORed
unsigned char colors_XOR = 0x00;  // All colors XORed
unsigned char colors_AND = 0xFF;  // All colors ANDed

for (int curr_idx = 0; curr_idx < block_to_write->num_colors(); curr_idx++) {
    colors_OR  |= block_to_write->prominent_color(curr_idx);
    colors_XOR ^= block_to_write->prominent_color(curr_idx);
    colors_AND &= block_to_write->prominent_color(curr_idx);
}
```

**Complex Strategy**: Uses combinations of COPY and XOR packets based on bit patterns.

---

## Compositing and Display

### 14. Compositing Transparent Colors
**File**: `CDGMagic_GraphicsEncoder__compositor.cpp`
**Function**: `int CDGMagic_GraphicsEncoder::get_composited_fontblock(CDGMagic_FontBlock* return_block)`
**Lines**: 87-135

**Key Logic** (Lines 116-129):
```cpp
// Set the "virtual layer 0" (background)
return_block->pixel_value(x_pix, y_pix, last_preset_index);

// Check each layer for opaque pixels
for (int z_loc = 0; z_loc < COMP_LAYERS; z_loc++) {
    int layer_offset = layer_span * z_loc + pixel_offset;
    
    // If pixel value < 256, it's opaque → use this color
    if (comp_buffer[layer_offset] < 256) {
        return_block->pixel_value(x_pix, y_pix, 
                                  comp_buffer[layer_offset]);
    }
}
```

**Transparent Index Convention**:
- **Value < 256**: Opaque palette index
- **Value == 256**: Transparent (don't overwrite)

---

### 15. VRAM Display
**File**: `CDGMagic_GraphicsEncoder__compositor.cpp`
**Function**: `int CDGMagic_GraphicsEncoder::copy_fontblock_to_vram(CDGMagic_FontBlock* given_block)`
**Lines**: 58-85

**What It Does**: Copy FontBlock pixels directly to VRAM for display

```cpp
// Line 68-73: Calculate block offset in VRAM
int vram_block_offset = x_location * 6 + y_location * VRAM_WIDTH * 12;

// Line 76-85: Copy pixels
for (int y_pix = 0; y_pix < 12; y_pix++) {
    int line_offset = vram_block_offset + y_pix * comp_width;
    for (int x_pix = 0; x_pix < 6; x_pix++) {
        int pixel_offset = line_offset + x_pix;
        vram[pixel_offset] = given_block->pixel_value(x_pix, y_pix);
    }
}
```

---

## Helper Functions and Utilities

### 16. Transparent Color Handling
**File**: `CDGMagic_FontBlock.h`
**Function**: `replacement_transparent_color()` / `overlay_transparent_color()`
**Lines**: 64-65

**Usage**:
```cpp
// Mark a color as transparent (won't overwrite lower layers)
fontblock->replacement_transparent_color(color_index);

// Or allow overlay blending
fontblock->overlay_transparent_color(color_index);

// Check if transparent
if (fontblock->replacement_transparent_color() < 256) {
    // This pixel might be transparent
}
```

---

### 17. Pixel Access
**File**: `CDGMagic_FontBlock.cpp`
**Functions**: `pixel_value()` (getter and setter)
**Lines**: 133-150

**Getter**:
```cpp
unsigned char CDGMagic_FontBlock::pixel_value(unsigned char req_x, 
                                              unsigned char req_y) {
    if ((req_x < 6) && (req_y < 12)) {
        return internal_bmp_data[req_x + req_y * 6];
    }
    return 0;
}
```

**Setter**:
```cpp
void CDGMagic_FontBlock::pixel_value(unsigned char req_x, 
                                     unsigned char req_y, 
                                     unsigned char clr_val) {
    if ((req_x < 6) && (req_y < 12)) {
        internal_bmp_data[req_x + req_y * 6] = clr_val;
    }
}
```

---

### 18. Color Fill
**File**: `CDGMagic_FontBlock.cpp`
**Function**: `void CDGMagic_FontBlock::color_fill(unsigned char clr_val)`
**Lines**: 151-153

**Usage**: Fill entire 6×12 block with single color
```cpp
void CDGMagic_FontBlock::color_fill(unsigned char clr_val) {
    for (int pxl = 0; pxl < 6*12; pxl++) {
        internal_bmp_data[pxl] = clr_val;
    }
}
```

---

## Data Structures

### 19. TextClip Color Configuration
**File**: `CDGMagic_TextClip.cpp` - Member variables (lines 28-60)

```cpp
int internal_foreground_index;    // Main text (default: 2)
int internal_background_index;    // Canvas background (default: 0)
int internal_outline_index;       // Outline/shadow (default: 1)
int internal_box_index;           // Box decoration (default: 0)
int internal_frame_index;         // Frame decoration (default: 4)
int internal_fill_index;          // Fill color (default: 16)
int internal_composite_index;     // Transparent color (default: 16)
int internal_palette_number;      // Palette selection (default: 1)
```

---

### 20. FontBlock Internal Structure
**File**: `CDGMagic_FontBlock.h` - Private members (lines 27-47)

```cpp
unsigned char *internal_bmp_data;           // 72 bytes (6×12 pixels)
unsigned char number_of_colors;            // Unique colors in block
unsigned char *prominence_of_colors;       // Sorted by frequency
signed short internal_transparent_index;   // Transparent marker (256=opaque)
```

---

## CD+G Packet Structure

### 21. Packet Format
**File**: `CDGMagic_GraphicsEncoder.h` (implied from usage)

```cpp
struct CD_SCPacket {
    unsigned char data[24];  // 6 header + 12 rows + 6 reserved
    // data[0]: Packet command
    // data[1]: Block X and Y coordinates
    // data[2]: Color indices (color0 and color1)
    // data[3]: Reserved
    // data[4-15]: Bitmap rows (12 bytes)
    // data[16-23]: Reserved/unused
};
```

---

## Key Constants

**From code**:
- `VRAM_WIDTH = 300` pixels
- `VRAM_HEIGHT = 216` pixels
- `CLUT_SIZE_G = 16` colors (standard palette)
- `CLUT_SIZE_EG = 256` colors (extended palette)
- `COMP_LAYERS = 8` (number of compositing layers)
- `FL_FLAT_BOX` = FLTK box type
- `FL_ROUNDED_BOX` = FLTK rounded box
- Bit shift for color index: `(index << 030)` (24 bits left)
- Alpha mask: `0x00FFFFFF` (full opacity in RGBA)

---

## Function Call Sequence

```
TextClip Creation
  ↓
render_text_to_bmp()
  ├→ Create FLTK offscreen buffer
  ├→ Set font and palette colors
  ├→ Draw background (background_index)
  ├→ Draw outline (outline_index)
  ├→ Draw foreground (foreground_index)
  ├→ fl_read_image() to get RGB pixels
  ├→ Extract RED channel → palette indices
  └→ Store in BMPObject.linear_pixel()
  ↓
set_all_palettes()
  └→ Assign RGB values to palette indices 0-15
  ↓
bmp_to_fonts()
  ├→ Iterate through bitmap events
  ├→ Divide into 6×12 FontBlocks
  └→ Extract pixels to FontBlock.pixel_value()
  ↓
write_fontblock()
  ├→ num_colors() - count unique colors
  ├→ prominent_color() - sort by frequency
  ├→ Encode based on color count:
  │  ├→ 1 color → Single packet
  │  ├→ 2 colors → Single COPY packet
  │  ├→ 3 colors → COPY + XOR packets
  │  └→ 4+ colors → Multiple packets
  └→ Return updated packet position
  ↓
CD+G Stream
  └→ Include PAL packet + FontBlock packets at correct timing
```

---

## Summary

**Text Rendering = Indexed Color Pipeline**:
1. Render with palette indices (0-15) as colors
2. Extract indices from rendered pixels
3. Divide into 6×12 FontBlocks
4. Analyze colors and encode efficiently
5. Output as CD+G FontBlock packets

All code is in `/reference/cd+g-magic/CDG_Magic/Source/` with these key files:
- `CDGMagic_TextClip.cpp`: Rendering logic
- `CDGMagic_GraphicsEncoder.cpp`: Block conversion
- `CDGMagic_FontBlock.cpp`: Color analysis
- `CDGMagic_GraphicsEncoder__write_fontblock.cpp`: Packet encoding
- `CDGMagic_GraphicsEncoder__compositor.cpp`: Compositing logic
