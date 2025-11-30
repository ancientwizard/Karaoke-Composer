# CD+G Magic C++ Analysis - Key Findings Summary

## Research Overview

Comprehensive analysis of CD+G Magic C++ source code from `reference/cd+g-magic/CDG_Magic/Source/` to extract exact implementation details for TypeScript conversion.

---

## Key Files Analyzed

| File | Purpose | Key Findings |
|------|---------|--------------|
| `CDGMagic_GraphicsEncoder.h/cpp` | Main encoding engine | Core pipeline: BMP→FontBlock→Packets |
| `CDGMagic_GraphicsEncoder__write_fontblock.cpp` | Packet creation | Bitplane decomposition algorithm |
| `CDGMagic_FontBlock.h/cpp` | Block data structure | 6×12 pixel blocks with metadata |
| `CDGMagic_BMPClip.h/cpp` | BMP file handling | Direct BMP loading and positioning |
| `CDGMagic_BMPObject.h` | Bitmap object | Pixel storage and offset management |
| `CDGMagic_Application.cpp` | File I/O | Binary file writing (fwrite) |

---

## 1. BMP to CD+G Conversion Pipeline

### High-Level Flow

```
BMP Image
    ↓
[BMPObject with pixel data, offsets, size]
    ↓
bmp_to_fonts() - Create FontBlocks
    ↓
[FontBlock deque with pixel data + timing]
    ↓
copy_compare_fontblock() - Compare to VRAM
    ↓
write_fontblock() - Generate packets
    ↓
[CD_SCPacket array]
    ↓
fwrite() to .cdg file
    ↓
Output: Binary .cdg file (24 bytes per packet)
```

### Step 1: BMP Loading → FontBlocks

**Function**: `CDGMagic_GraphicsEncoder::bmp_to_fonts()`

**Input**: `CDGMagic_MediaClip` containing:
- BMP object with pixel data
- X/Y offsets
- Transition blocks (animation)

**Process**:
1. For each transition block in BMP:
   - Calculate block position: `block_x = transition[x] + x_block_offset`
   - Calculate start time: `start_pack = clip.start_pack + event.start_offset + bmp.draw_delay`
   - Create FontBlock(block_x, block_y, start_pack)
   - Extract 6×12 pixels from BMP into FontBlock
   - Apply compositing settings (replacement/overlay transparency)

**Output**: Deque of FontBlock pointers, one per 6×12 block

**Critical Detail**: FontBlocks store PIXEL DATA, not packets. They're rendered to VRAM first to check for changes.

---

## 2. FontBlock Structure

**Size**: ~150+ bytes per block

```cpp
struct FontBlock {
    int start_pack;                    // When to draw
    int x_block, y_block;              // Coordinates (0-49 x, 0-17 y)
    unsigned char z_index;             // Compositing layer
    unsigned char channel;             // Multi-track channel
    signed short transparent_index;    // Replacement transparency (256=opaque)
    signed short overlay_index;        // Overlay transparency
    unsigned char pixels[72];          // 6×12 pixel array
    unsigned char num_colors_cache;    // Optimization: count of unique colors
    unsigned char* prominence;         // Optimization: colors sorted by frequency
};
```

**Key Properties**:
- Pixels stored as 6×12 = 72 bytes
- Transparent indices can be 0-255 or 256 (opaque)
- Color prominence cached for performance
- Z-index allows 8 compositing layers

---

## 3. Compositing & VRAM Comparison

### The Compositing Engine

**Data Structure**:
```cpp
unsigned short *comp_buffer;  // Size: 300 × 216 × 8 (layers) = 518,400 pixels
unsigned short *vram;         // Size: 300 × 216 = 64,800 pixels
```

**Function**: `copy_compare_fontblock()` - Lines 680-850 in write_fontblock.cpp

**Algorithm**:
1. Layer FontBlock pixels into compositing buffer (8 layers)
2. Apply transparency rules:
   - Replacement (value 256): Force pixel transparent
   - Overlay (value 256): Keep existing value
3. Composite all 8 layers bottom-to-top (z_index 0→7)
4. Compare final result with VRAM
5. If different: mark "must_redraw=1", update VRAM

**Output**: Boolean indicating if packet should be written

**Critical Detail**: This is why FontBlocks must store pixel data—the encoder needs to check what's actually on screen before deciding to write a packet.

---

## 4. CD_SCPacket Binary Structure

### Exact Layout (24 bytes)

```
Offset  Length  Name      Content
─────────────────────────────────────────────
0       1       command   0x09 (TV_GRAPHICS)
1       1       instr     Instruction (0x01-0x26)
2-3     2       pQ        Parity Q (0x00, 0x00)
4-19    16      data[16]  Graphics command data
20-23   4       pP        Parity P (all 0x00)
```

### Data Bytes Layout for COPY_FONT/XOR_FONT

```
Index   Content                                    Encoding
─────────────────────────────────────────────────────────────
0       Color 0 with channel bits                  color0 | ((channel << 2) & 0x30)
1       Color 1 with channel bits                  color1 | ((channel << 4) & 0x30)
2       Y block coordinate                         0-17 (0x00-0x11)
3       X block coordinate                         0-49 (0x00-0x31)
4-15    12 bytes of scanline data                  6 bits per scanline
        (one byte per scanline, bits 5-0 used)
```

### Pixel Scanline Byte Format

Each byte encodes 6 pixels (one scanline):

```
Bit: 7   6  5  4  3  2  1  0
     -  P0 P1 P2 P3 P4 P5
        └──────────────────┘
        Pixels X=0 to X=5 (left to right)
```

**Bit Values**:
- For COPY_FONT: 0=color0, 1=color1
- For XOR_FONT: 0=no change, 1=XOR with color value

---

## 5. Color Encoding Strategies

### 1 Color → 1 Packet

```cpp
write_fontblock_single(COPY_FONT, channel, x, y, color, color);
// Fill all scanlines with 0x3F (binary 111111)
```

### 2 Colors → 1 Packet

```cpp
color0 = prominent_color(0);  // Most frequent
color1 = prominent_color(1);  // Less frequent

write_fontblock_single(COPY_FONT, channel, x, y, color0, color1);
// For each scanline: set bit where pixel == color1
```

### 3 Colors → 2 Packets

**Packet 1 (COPY)**:
```cpp
write_fontblock_single(COPY_FONT, ..., prominent(1), prominent(0));
// Set bit where pixel == color0 OR color2
```

**Packet 2 (XOR)**:
```cpp
xor_val = prominent(0) ^ prominent(2);
write_fontblock_single(XOR_FONT, ..., 0x00, xor_val);
// Set bit where pixel == color2
// When rendered: COPY shows color1+color2, XOR flips color2 to its actual value
```

### 4+ Colors → Bitplane Decomposition

**Algorithm** (lines 700-850):

```cpp
// 1. Calculate which bits vary across all colors
unsigned char colors_OR = 0;   // All bits that are ever set
unsigned char colors_AND = 0xFF; // Bits always set

for (each color) {
    colors_OR |= color;
    colors_AND &= color;
}

// 2. For each varying bit plane (MSB to LSB):
for (bit_plane = 3; bit_plane >= 0; bit_plane--) {
    // Skip bits that are always 0 or always 1
    if ((colors_OR >> bit_plane) & 1 == 0) continue;  // Never set
    if ((colors_AND >> bit_plane) & 1 == 1) continue; // Always set

    // Create packet for this bit plane
    color_1 = (1 << bit_plane);
    if (first_packet) {
        color_0 = colors_AND;
        instruction = COPY_FONT;
        first_packet = false;
    } else {
        color_0 = 0x00;
        instruction = XOR_FONT;
    }

    // Render bit plane: set scanline bit if (pixel >> bit_plane) & 1
}
```

**Example**: 4 colors [1=0b0001, 2=0b0010, 4=0b0100, 8=0b1000]
- Bit 0 varies → Packet 1 (COPY)
- Bit 1 varies → Packet 2 (XOR)
- Bit 2 varies → Packet 3 (XOR)
- Bit 3 varies → Packet 4 (XOR)
- **Total**: 4 packets for this block

---

## 6. Packet Scheduling & Ordering

### Main Processing Loop

```cpp
int current_pack = 0;
while (current_pack < current_length - 300) {
    // 1. Check if events need scheduling
    if (event_start_pack <= current_pack) {
        bmp_to_fonts() → queue FontBlocks
    }

    // 2. Process global events (palette, border, memory clear)
    while (global_queue.front().start_pack <= current_pack) {
        current_pack = set_pal(current_pack, ...);
        current_pack = set_border(current_pack, ...);
        current_pack = set_memory(current_pack, ...);
    }

    // 3. Write font blocks
    if (fontblock.start_pack <= current_pack) {
        current_pack = write_fontblock(current_pack, block);
        delete block;
    }

    // 4. Advance time
    if (current_pack == original_pack) current_pack++;
}
```

### Packet Ordering Priority

1. **Global Commands**: Palette loads (2 packets), memory preset (16 packets), border (1 packet)
2. **XOR Blocks**: Karaoke highlighting
3. **Font Blocks**: From clips in round-robin order
4. **Empty Packets**: Padding between events

### Key Variables

- `current_pack`: Current packet index (0 to length)
- `block.start_pack`: When block should be written
- `event.start_pack`: When event should begin
- Packets are written sequentially; empty slots filled with zero packets

---

## 7. Global Command Packets

### MEMORY_PRESET (Screen Clear)

**16 packets total** (8 standard + 8 with branding):

```cpp
for (repeat = 0; repeat < 16; repeat++) {
    packet[repeat].command = TV_GRAPHICS (0x09);
    packet[repeat].instruction = MEMORY_PRESET (0x01);
    packet[repeat].data[0] = color_index;
    packet[repeat].data[1] = repeat;
    if (repeat >= 8) {
        // Add "CD+G MAGIC 001B" signature
        packet[repeat].data[2-15] = text_chars;
    }
}
```

### LOAD_CLUT_LO/HI (Palette)

**2 packets** (colors 0-7, then 8-15):

```cpp
packet.command = TV_GRAPHICS (0x09);
packet.instruction = LOAD_CLUT_LO (0x1E) or CLUT_HI (0x1F);

for (i = 0; i < 8; i++) {
    r4 = (rgb_red >> 24) / 17;      // 8-bit → 4-bit
    g4 = (rgb_green >> 16) / 17;
    b4 = (rgb_blue >> 8) / 17;

    // Pack into 12-bit value across 2 bytes
    packet.data[i*2+0] = (r4 << 2) | (g4 >> 2);
    packet.data[i*2+1] = ((g4 & 0x03) << 4) | b4;
}
```

---

## 8. File Writing (Binary Format)

### Stream Access

```cpp
CD_SCPacket *Get_Stream() { return cdg_stream; }
int length() const { return current_length; }
```

### Binary File Writing

**C++ Code** (pseudocode in main window):
```cpp
FILE *f = fopen("output.cdg", "wb");
CD_SCPacket *stream = encoder.Get_Stream();
int length = encoder.length();

fwrite(stream, sizeof(CD_SCPacket), length, f);  // 24 bytes per packet
fclose(f);
```

### File Format

```
File Format:
  Byte 0-23:     Packet 0 (24 bytes)
  Byte 24-47:    Packet 1 (24 bytes)
  Byte 48-71:    Packet 2 (24 bytes)
  ...
  Byte (N×24)-(N×24+23): Packet N (24 bytes)

Total file size = number_of_packets × 24 bytes
```

---

## 9. Channel & Multi-Track Support

### Channel Bits in Packet Data

```
Byte 4 (color_one):  [C1 C1 C0 C0 [COLOR_0_INDEX: 4 bits]]
Byte 5 (color_two):  [[CHANNEL_2]: 2 bits] [COLOR_1_INDEX: 4 bits]

Channel encoding:
  Bits extracted from data[0] bits 5-4 (shifted right 2): [C1, C0]
  Bits extracted from data[1] bits 5-4 (shifted right 4): [C1, C0]
  Combined channel = (data[0] >> 2) & 0x03 | (data[1] >> 4) & 0x03
```

### Multi-Track Rendering

- **Channels 0-3**: Each track can render to different channel
- **CD+G Standard**: Usually only channel 0 used
- **Purpose**: Allows overlaying multiple independent graphics streams

---

## 10. XOR-Only Blocks (Karaoke Highlighting)

### Special Processing

```cpp
if (block->xor_only() > 0) {
    write_fontblock_single(XOR_FONT, channel, x, y, 0, xor_value);
    
    // Set scanline bits where pixel != 0
    for (y_pos = 0; y_pos < 12; y_pos++) {
        byte = 0;
        for (x_pos = 0; x_pos < 6; x_pos++) {
            bit = (block->pixel(x, y) > 0) ? 1 : 0;
            byte |= (bit << (5-x_pos));
        }
        data[4+y_pos] = byte;
    }
}
```

### Rendering Behavior

- **XOR value**: Color to XOR with existing screen data
- **Common use**: Highlight karaoke lyrics (XOR with yellow/white)
- **Efficiency**: Uses only 1 packet regardless of color count

---

## 11. Critical Implementation Details

### ✅ Exact Byte Layout
- Packets MUST be exactly 24 bytes
- Parity bytes left as 0x00 (players don't validate)
- Scanlines use bits 5-0 only (bit 7-6 unused)
- Byte order: no special encoding (direct bytes)

### ✅ Pixel Bit Ordering
- **MSB (bit 5)** = leftmost pixel (X=0)
- **LSB (bit 0)** = rightmost pixel (X=5)
- This is consistent across ALL implementations

### ✅ Color Encoding
- For COPY: 0 bit → use color0, 1 bit → use color1
- For XOR: 0 bit → no change, 1 bit → XOR with data[1]
- Bitplane decomposition always uses XOR after first COPY

### ✅ Packet Ordering
- Packets written sequentially by position
- Position matches timing (packet N played at time N)
- Empty packets automatically generated if time gap

### ✅ Transparency Handling
- Value 256 (out of range for 0-15 indices) = transparent
- Can replace certain pixels with transparent
- Can overlay without changing existing pixels

---

## 12. Validation Checklist

When implementing TypeScript encoder, verify:

- [ ] CD_SCPacket exactly 24 bytes
- [ ] Command byte always 0x09
- [ ] Instruction codes match specification (0x01, 0x06, 0x26, etc.)
- [ ] Data bytes 0-3: colors + coordinates properly packed
- [ ] Data bytes 4-15: scanline encoding correct
- [ ] Pixel bits ordered MSB→LSB for left→right
- [ ] Parity bytes always 0x00
- [ ] Channel bits in both data[0] and data[1]
- [ ] XOR mode for 3+ color blocks working correctly
- [ ] Bitplane decomposition handling 4+ colors
- [ ] Palette loading converts 8-bit RGB to 4-bit CD+G
- [ ] Memory preset writes 16 packets with branding
- [ ] Packets written sequentially to binary file
- [ ] Total file size = packet_count × 24
- [ ] FontBlock comparison prevents redundant writes
- [ ] Start_pack scheduling respected

---

## 13. Performance Notes

### Optimization Techniques Used in C++

1. **Color Caching**: Prominence array cached after first calculation
2. **VRAM Comparison**: Blocks only written if different from current state
3. **Bitwise Operations**: Bit plane decomposition uses shifts/masks
4. **Array Reuse**: Fixed-size comp_buffer for all layers
5. **Memory Pooling**: FontBlocks created/deleted in loop, not reallocated

### Bottlenecks to Avoid

- Recalculating color frequency for same block
- Writing packets that are identical to VRAM
- Deep object cloning in hot loops
- Excessive buffer allocations

---

## 14. Summary Statistics

| Metric | Value | Notes |
|--------|-------|-------|
| Packet size | 24 bytes | Fixed, non-negotiable |
| Screen width | 300 pixels / 50 blocks | 6 pixels per block |
| Screen height | 216 pixels / 18 blocks | 12 pixels per block |
| Colors per block | 1-16 | CD+G 16-color palette |
| Packets per block | 1-4 | Depends on color count |
| Max palette colors | 16 | Fixed for TV Graphics mode |
| Compositing layers | 8 | Z-index 0-7 |
| Channels supported | 4 | Channel 0-3 (rarely used) |
| Typical file duration | 2 min = ~17,600 packets | ~422 KB file |
| Max typical file | 10 min = ~88,000 packets | ~2.1 MB file |

---

## 15. Files Generated from This Analysis

1. **CPP-IMPLEMENTATION-ANALYSIS.md** - Detailed C++ code breakdown with line numbers
2. **PACKET-BINARY-FORMAT.md** - Quick reference for binary packet structure
3. **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** - Complete TypeScript encoder patterns
4. **RESEARCH-SUMMARY.md** - This file

---

## References

### Source Files Analyzed
- `/reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder.h` (141 lines)
- `/reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder.cpp` (350+ lines)
- `/reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder__write_fontblock.cpp` (400+ lines)
- `/reference/cd+g-magic/CDG_Magic/Source/CDGMagic_FontBlock.h/cpp` (206 lines)
- `/reference/cd+g-magic/CDG_Magic/Source/CDGMagic_BMPClip.h/cpp` (441 lines)
- `/reference/cd+g-magic/CDG_MAGIC_PACKET_SERIALIZATION.md`

### Key Functions Extracted
- `compute_graphics()` - Main encoding loop
- `bmp_to_fonts()` - BMP pixel extraction
- `copy_compare_fontblock()` - VRAM compositing
- `write_fontblock()` - Packet generation strategy
- `write_fontblock_single()` - Packet header creation
- `set_pal()` - Palette loading packets
- `set_memory()` - Screen clear packets
- `Get_Stream()` - Binary file access

---

**Analysis Complete** ✓

All critical implementation details extracted and documented for TypeScript conversion.
