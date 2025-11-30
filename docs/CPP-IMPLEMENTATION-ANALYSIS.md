# CD+G Magic C++ Implementation Analysis

## Executive Summary

This document provides a detailed analysis of how the C++ CD+G Magic implementation converts BMP clips to CD+G packets, focusing on exact byte layouts, packet creation patterns, and binary stream writing.

---

## 1. BMP to CD+G Conversion Pipeline

### 1.1 Main Entry Point: `compute_graphics()`

**File**: `CDGMagic_GraphicsEncoder.cpp` (lines ~100-350+)

```cpp
int CDGMagic_GraphicsEncoder::compute_graphics(std::deque<CDGMagic_MediaClip*> *TimeLine_Deque)
```

**Process Flow**:
1. Clear computation buffers and allocate VRAM
2. Sort timeline clips by start pack position
3. Process each clip sequentially by packet offset
4. For each packet position:
   - Check if events need to be processed
   - Convert BMP data to font blocks
   - Write font blocks to subcode stream
   - Advance packet counter

### 1.2 Step 1: BMP to FontBlock Conversion

**Function**: `bmp_to_fonts()` (CDGMagic_GraphicsEncoder.cpp, lines ~380-430)

```cpp
std::deque<CDGMagic_FontBlock*> CDGMagic_GraphicsEncoder::bmp_to_fonts(CDGMagic_MediaClip *incoming_clip)
```

**Input**: `CDGMagic_MediaClip` containing `CDGMagic_BMPObject` instances

**Process**:
```
For each BMP event in clip:
  For each transition block in BMP:
    Calculate start_pack = clip.start_pack + event.start_offset + bmp.draw_delay
    Calculate block_x = transition_block[x] + x_block_offset
    Calculate block_y = transition_block[y] + y_block_offset
    
    Create FontBlock(block_x, block_y, start_pack)
    
    For each pixel in 6×12 block:
      pixel_x = (block_x * 6) - bmp.x_offset + pixel_x
      pixel_y = (block_y * 12) - bmp.y_offset + pixel_y
      fontblock.pixel(x, y) = bmp.pixel(pixel_x, pixel_y)
    
    Handle compositing:
      if replacement_mode: set transparent_index
      if overlay_mode: set overlay_index
    
    Add fontblock to deque
```

**Key Insights**:
- Each BMP can have multiple transition blocks (for animations)
- Block coordinates are in 6×12 font units
- Pixel offsets can be negative (allows sub-pixel positioning)
- FontBlocks are NOT written immediately—they're queued for later

### 1.3 FontBlock Structure

**File**: `CDGMagic_FontBlock.h`

```cpp
class CDGMagic_FontBlock
{
private:
    int internal_start_pack;           // When to draw this block
    int x_block, y_block;              // Block coordinates (0-49 x, 0-17 y)
    unsigned char internal_vram_only;  // Skip compositing?
    unsigned char internal_xor_only;   // XOR mode for karaoke highlighting
    unsigned char z_index;             // Compositing layer (0-7)
    unsigned char internal_channel;    // Channel for multi-channel support
    signed short internal_transparent_index;  // Replacement transparency
    signed short internal_overlay_index;      // Overlay transparency
    unsigned char *internal_bmp_data;  // 6×12 pixel array (72 bytes)
    unsigned char number_of_colors;    // Cached color count
    unsigned char *prominence_of_colors; // Colors sorted by frequency
};
```

**Critical Point**: FontBlocks store **pixel data**, not packets. They're decoded and rendered to VRAM, then compared to determine if a packet is needed.

---

## 2. FontBlock Processing: Compositing & Comparison

### 2.1 Compositing Pipeline

**Function**: `copy_compare_fontblock()` (CDGMagic_GraphicsEncoder.cpp, lines ~680-850)

**Purpose**: Layer multiple FontBlocks together and compare to existing VRAM to determine if redraw is needed.

**Algorithm**:
```
For each block:
  1. Update comp_buffer (8-layer compositing engine) with block pixels
  2. Apply transparency rules (replacement vs overlay)
  3. Composite all 8 layers from bottom to top
  4. Compare final result with VRAM
  5. If different, mark as "must redraw" (is_block_different = 1)
  6. Update VRAM with new values
```

**Transparency Handling**:
- **Replacement** (value 256): Force pixel to transparent
- **Overlay** (value 256): Keep existing value (don't update)
- **Normal** (0-15): Replace with new value

### 2.2 Compositing Buffer Structure

```cpp
unsigned short *comp_buffer;  // Allocated as:
                              // comp_width * comp_height * 8 (layers)
                              // Default: 300 * 216 * 8 = 518,400 pixels
```

**Offset Calculation**:
```
layer_offset = (comp_width * comp_height * z_index) + (x + y * comp_width)
```

**VRAM Structure** (for comparison):
```cpp
unsigned short *vram;         // 300 * 216 = 64,800 pixels
vram_offset = x + (y * VRAM_WIDTH)
```

---

## 3. Packet Creation: The Core Engine

### 3.1 Main Writing Function

**Function**: `write_fontblock()` (CDGMagic_GraphicsEncoder__write_fontblock.cpp, lines ~1-100)

**Input**: `FontBlock* block_to_write` and `int current_position` (packet index)

**Early Exits**:
```cpp
// Don't write if identical to current VRAM
if (copy_compare_fontblock(block_to_write) == 0) return;

// Don't write packets outside screen bounds
if (block_x < 0 || block_x >= 50) return;
if (block_y < 0 || block_y >= 18) return;

// Prevent buffer overrun
if (current_position + 4 >= current_length) return;
```

### 3.2 XOR-Only (Karaoke) Highlighting

**Code**:
```cpp
if (block_to_write->xor_only() > 0)
{
    write_fontblock_single(XOR_FONT, channel,
                          x, y,
                          0, xor_value,
                          cdg_stream[current_position]);
    
    for (int y_pos = 0; y_pos < 12; y_pos++)
    {
        int the_line = 0;
        for (int x_pos = 0; x_pos < 6; x_pos++)
        {
            int pix_val = (block->pixel_value(x_pos, y_pos) > 0);
            the_line |= (pix_val << (5-x_pos));
        };
        cdg_stream[current_position].data[4+y_pos] = the_line;
    };
    current_position++;
    return current_position;
}
```

**Byte Layout**:
- `data[0]`: Color 0 (unused, set to 0)
- `data[1]`: XOR color value
- `data[2]`: Y block
- `data[3]`: X block
- `data[4-15]`: 12 bytes of 6-bit pixel masks

### 3.3 Single Color Block (1 packet)

```cpp
if (block_to_write->num_colors() == 1)
{
    write_fontblock_single(COPY_FONT, channel,
                          x, y,
                          color0, color0,
                          cdg_stream[current_position]);
    
    // All pixels set (0x3F = binary 111111)
    for (int y_pos = 0; y_pos < 12; y_pos++)
    {
        cdg_stream[current_position].data[4+y_pos] = 0x3F;
    };
    current_position++;
}
```

**Byte Layout**:
- `data[0]`: Color index (both foreground and background)
- `data[1]`: Color index (same)
- `data[2]`: Y block
- `data[3]`: X block
- `data[4-15]`: 12 bytes of 0x3F (all bits set)

### 3.4 Two Color Block (1 packet)

```cpp
else if (block_to_write->num_colors() == 2)
{
    int colors[2] = { prominent(0), prominent(1) };
    
    write_fontblock_single(COPY_FONT, channel, x, y,
                          colors[0], colors[1],
                          cdg_stream[current_position]);
    
    for (int y_pos = 0; y_pos < 12; y_pos++)
    {
        int the_line = 0;
        for (int x_pos = 0; x_pos < 6; x_pos++)
        {
            // Set bit if pixel equals second (less prominent) color
            int pix_val = (block->pixel_value(x_pos, y_pos) == colors[1]);
            the_line |= (pix_val << (5-x_pos));
        };
        cdg_stream[current_position].data[4+y_pos] = the_line;
    };
    current_position++;
}
```

**Bit Encoding**:
- Bit 0 (most significant) = top-left pixel
- Bit 5 (least significant) = top-right pixel
- 0 = use color0 (prominent)
- 1 = use color1 (less prominent)

**Example**:
```
Pixel row: [c0, c1, c0, c0, c1, c0]
Bits:      [0,  1,  0,  0,  1,  0]   <- logical values
Byte:      0b 01 00 10 0 = 0x14
```

### 3.5 Three Color Block (2 packets)

**Packet 1** (COPY_FONT):
```cpp
colors[0] = prominent(1);  // 2nd most prominent
colors[1] = prominent(0);  // Most prominent
colors[2] = prominent(2);  // 3rd prominent

// Render colors 0, 1, and 2 (3rd is rendered via XOR)
for (int y = 0; y < 12; y++)
{
    int line = 0;
    for (int x = 0; x < 6; x++)
    {
        // Set bit if pixel is color 1 OR color 2
        int val = (pixel == colors[1]) || (pixel == colors[2]);
        line |= (val << (5-x));
    };
    data[4+y] = line;
}
```

**Packet 2** (XOR_FONT):
```cpp
int xor_value = colors[1] ^ colors[2];

// Render only pixels that are color 2 (will XOR with packet 1)
for (int y = 0; y < 12; y++)
{
    int line = 0;
    for (int x = 0; x < 6; x++)
    {
        int val = (pixel == colors[2]);
        line |= (val << (5-x));
    };
    data[4+y] = line;
}
```

**Rendering Result**:
- Color 1 & Color 2 bits set in COPY: rendered as color1
- Only Color 2 bits set in XOR: XOR with colors[1] → becomes colors[2]

### 3.6 Four+ Color Block (Bitplane Decomposition)

**Strategy**: Use one packet per bit plane that varies

```cpp
// Calculate which bit planes vary
unsigned char colors_OR  = 0;   // OR all colors
unsigned char colors_AND = 0xFF; // AND all colors

for (int idx = 0; idx < num_colors; idx++)
{
    colors_OR |= prominent_color(idx);
    colors_AND &= prominent_color(idx);
}

// Process each bit plane
for (int pal_bit = 3; pal_bit >= 0; pal_bit--)
{
    // Skip bits that are always 0 or always 1
    if (((colors_OR >> pal_bit) & 1) == 0) continue;    // Never set
    if (((colors_AND >> pal_bit) & 1) == 1) continue;   // Always set
    
    // Create packet for this bit plane
    unsigned char color_0 = 0x00;
    unsigned char color_1 = (1 << pal_bit);
    
    if (copy_type == COPY_FONT && colors_AND > 0)
    {
        color_0 |= colors_AND;
        color_1 |= colors_AND;
    }
    
    write_fontblock_single(copy_type, channel, x, y,
                          color_0, color_1,
                          cdg_stream[current_position]);
    
    // Render bit plane
    for (int y_pos = 0; y_pos < 12; y_pos++)
    {
        int line = 0;
        for (int x_pos = 0; x_pos < 6; x_pos++)
        {
            int bit = (pixel >> pal_bit) & 1;
            line |= (bit << (5-x_pos));
        };
        cdg_stream[current_position].data[4+y_pos] = line;
    }
    
    current_position++;
    copy_type = XOR_FONT;  // Subsequent planes use XOR
}
```

**Example**: 4 colors [1=0b0001, 2=0b0010, 4=0b0100, 8=0b1000]
- Bit 0: colors_AND=0, colors_OR=0xF → packet 1 (COPY)
- Bit 1: colors_AND=0, colors_OR=0xF → packet 2 (XOR)
- Bit 2: colors_AND=0, colors_OR=0xF → packet 3 (XOR)
- Bit 3: colors_AND=0, colors_OR=0xF → packet 4 (XOR)

---

## 4. CD_SCPacket Structure & Binary Format

### 4.1 Exact Byte Layout

**File**: `CDGMagic_GraphicsEncoder.h` (lines 31-39)

```cpp
typedef struct CD_SCPacket
{
    char command;      // Byte 0: Subcode mode/item (always 0x09 for graphics)
    char instruction;  // Byte 1: CDG instruction
    char parityQ[2];   // Bytes 2-3: Parity Q (always 0x00)
    char data[16];     // Bytes 4-19: Command data
    char parityP[4];   // Bytes 20-23: Parity P (always 0x00)
} CD_SCPacket;
// Total: 24 bytes
```

### 4.2 Packet Initialization

```cpp
// Constructor initialization
CDGMagic_GraphicsEncoder::CDGMagic_GraphicsEncoder(...)
{
    cdg_stream = new CD_SCPacket[current_length];
    ...
}

// Memory clearing
memset(cdg_stream, 0, current_length * sizeof(CD_SCPacket));
```

**Result**: All packets start as zeros, including parity bytes.

### 4.3 Packet Field Definitions

**Header Function** `write_fontblock_single()`:

```cpp
void CDGMagic_GraphicsEncoder::write_fontblock_single(
    int instruction,
    unsigned char channel,
    int x_block,
    int y_block,
    unsigned char color_one,
    unsigned char color_two,
    CD_SCPacket &pack_to_write)
{
    pack_to_write.command = TV_GRAPHICS;  // 0x09
    pack_to_write.instruction = instruction;  // 0x06 (COPY_FONT) or 0x26 (XOR_FONT)
    
    // Byte 0 of data: Color "0" with channel bits
    pack_to_write.data[0] = color_one | ((channel << 2) & 0x30);
    
    // Byte 1 of data: Color "1" with channel bits
    pack_to_write.data[1] = color_two | ((channel << 4) & 0x30);
    
    // Byte 2 of data: Y block coordinate
    pack_to_write.data[2] = y_block;
    
    // Byte 3 of data: X block coordinate
    pack_to_write.data[3] = x_block;
    
    // Bytes 4-15 will be filled with scanline data by caller
}
```

**Complete Packet Layout for COPY_FONT**:

```
Byte  0: 0x09 (TV_GRAPHICS mode)
Byte  1: 0x06 (COPY_FONT instruction)
Bytes 2-3: 0x00, 0x00 (Parity Q)
Byte  4: color_0 | (channel << 2)   [color index 0, with channel bits 4-5]
Byte  5: color_1 | (channel << 4)   [color index 1, with channel bits 4-5]
Byte  6: y_block                     [Y block coordinate 0-17]
Byte  7: x_block                     [X block coordinate 0-49]
Bytes 8-19: Pixel data               [12 bytes, one per scanline, 6 bits per scanline]
Bytes 20-23: 0x00, 0x00, 0x00, 0x00 (Parity P)
```

### 4.4 Instruction Codes

From header file enum:

```cpp
enum cdg_commands
{
    TV_GRAPHICS = 0x09,      // Mode
    MEMORY_PRESET = 0x01,    // Clear screen
    BORDER_PRESET = 0x02,    // Set border
    LOAD_CLUT_LO = 0x1E,     // Load palette 0-7
    LOAD_CLUT_HI = 0x1F,     // Load palette 8-15
    COPY_FONT = 0x06,        // Copy block with 2 colors
    XOR_FONT = 0x26,         // XOR block with 2 colors
    SCROLL_PRESET = 0x14,    // Set scroll offset
    SCROLL_COPY = 0x18,      // Copy while scrolling
    SET_TRANSPARENT = 0x1C   // Set transparency mask
};
```

---

## 5. Channel & Color Packing

### 5.1 Channel Bits

Channels provide multi-track support (though rarely used):

```
Byte 4 (color 0):  [c c c c c c X X]
                    └─ bit 7-2: color index
                       └─ bits 5-4: channel (part 1)

Byte 5 (color 1):  [X X c c c c c c]
                    └─ bits 5-4: channel (part 2)
                       └─ bits 3-0: color index
```

**Formula**:
- `data[0] = color_0 | ((channel << 2) & 0x30)` → bits 5-4 of data[0]
- `data[1] = color_1 | ((channel << 4) & 0x30)` → bits 5-4 of data[1]

**Channel Extraction** (by decoder):
```cpp
channel = ((data[0] >> 2) & 0x03) | ((data[1] >> 4) & 0x03);
color_0 = data[0] & 0x0F;
color_1 = data[1] & 0x0F;
```

### 5.2 Color Indices

- Valid range: 0-15 for TV Graphics (16 colors)
- Encoded in 4 bits (lower nibble when channel not used)
- Source: CDG palette (set via LOAD_CLUT_LO/HI packets)

---

## 6. Packet Ordering & Scheduling

### 6.1 Main Processing Loop

From `compute_graphics()`:

```cpp
int current_pack = 0;
while (current_pack < current_length - 300)  // Leave buffer
{
    // Check if events need to be scheduled
    if ((current_event < TimeLine_Deque->size()) &&
        (TimeLine_Deque->at(current_event)->start_pack() <= current_pack))
    {
        // Convert BMP to font blocks and add to queue
        Timeline_FontQueue queue_entry;
        queue_entry.start_pack = TimeLine_Deque->at(current_event)->start_pack();
        queue_entry.font_queue = bmp_to_fonts(TimeLine_Deque->at(current_event));
        playout_queue.push_back(queue_entry);
        current_event++;
    }
    
    // Process global events (palette changes, border, memory clear, etc.)
    while ((global_queue.size() > 0) &&
           (global_queue.front().start_pack <= current_pack))
    {
        current_pack = set_pal(current_pack, ...);
        current_pack = set_border(current_pack, ...);
        current_pack = set_memory(current_pack, ...);
        global_queue.pop_front();
    }
    
    // Write font blocks if scheduled
    if ((playout_queue.size() > 0) &&
        (playout_queue[current].font_queue.size() > 0) &&
        (playout_queue[current].font_queue.front()->start_pack() <= current_pack))
    {
        current_pack = write_fontblock(current_pack,
                                      playout_queue[current].font_queue.front());
        delete playout_queue[current].font_queue.front();
        playout_queue[current].font_queue.pop_front();
    }
    
    // Advance time
    if (current_pack == orig_pack) current_pack++;
}
```

### 6.2 Event Ordering Priority

1. **Global Commands** (palette, memory preset, border)
2. **XOR Blocks** (karaoke highlighting)
3. **Regular Font Blocks** (from multiple clips in round-robin)

### 6.3 Packet Consumption

- 1-color block: 1 packet
- 2-color block: 1 packet
- 3-color block: 2 packets
- 4+ colors: 1 packet per varying bit plane (1-4 packets typical)

---

## 7. Palette & Global Commands

### 7.1 Palette Loading (LOAD_CLUT_LO/HI)

```cpp
int CDGMagic_GraphicsEncoder::set_pal(int current_position, CDGMagic_MediaEvent *event)
{
    // Palette split into low (0-7) and high (8-15)
    for (int lo_or_hi = 0; lo_or_hi < 2; lo_or_hi++)
    {
        int pal_offset = lo_or_hi * 8;
        
        cdg_stream[current_position].command = TV_GRAPHICS;
        cdg_stream[current_position].instruction = (lo_or_hi) ? LOAD_CLUT_HI : LOAD_CLUT_LO;
        
        for (int pal_inc = 0; pal_inc < 8; pal_inc++)
        {
            unsigned int actual_idx = pal_inc + pal_offset;
            unsigned long rgb = event->PALObject->color(actual_idx);
            
            // Convert 8-bit RGB to 4-bit CD+G format
            unsigned char r4 = ((rgb >> 24) & 0xFF) / 17;  // 0-15
            unsigned char g4 = ((rgb >> 16) & 0xFF) / 17;
            unsigned char b4 = ((rgb >> 8) & 0xFF) / 17;
            
            // Pack into 2 bytes: RRRR GGGG GGGG BBBB (12 bits)
            cdg_stream[current_position].data[pal_inc*2+0]  = (r4 << 2) | (g4 >> 2);
            cdg_stream[current_position].data[pal_inc*2+1]  = ((g4 & 0x03) << 4) | b4;
        }
        current_position++;
    }
    return current_position;
}
```

**Result**: 2 packets per palette load (one for colors 0-7, one for 8-15)

### 7.2 Memory Preset (Screen Clear)

```cpp
int CDGMagic_GraphicsEncoder::set_memory(int current_position, CDGMagic_MediaEvent *event)
{
    // Write 8 packets normally
    for (int repeat_value = 0; repeat_value < 8; repeat_value++)
    {
        cdg_stream[current_position].command = TV_GRAPHICS;
        cdg_stream[current_position].instruction = MEMORY_PRESET;
        cdg_stream[current_position].data[0] = event->memory_preset_index;
        cdg_stream[current_position].data[1] = repeat_value;
        current_position++;
    }
    
    // Write 8 more packets with "CD+G MAGIC 001B" signature
    for (int repeat_value = 8; repeat_value < 16; repeat_value++)
    {
        cdg_stream[current_position].command = TV_GRAPHICS;
        cdg_stream[current_position].instruction = MEMORY_PRESET;
        cdg_stream[current_position].data[0] = event->memory_preset_index;
        cdg_stream[current_position].data[1] = repeat_value;
        cdg_stream[current_position].data[2] = ('C' - 0x20) & 0x3F;  // 'C'
        cdg_stream[current_position].data[3] = ('D' - 0x20) & 0x3F;  // 'D'
        // ... etc for "CD+G MAGIC 001B"
        current_position++;
    }
    
    // Clear internal VRAM
    for (unsigned int px = 0; px < VRAM_WIDTH * VRAM_HEIGHT; px++)
    {
        vram[px] = event->memory_preset_index;
    }
    
    return current_position;
}
```

**Result**: 16 packets per memory preset (8 + 8 with branding)

---

## 8. File Writing

### 8.1 Stream Access

```cpp
CD_SCPacket* CDGMagic_GraphicsEncoder::Get_Stream(void)
{
    return cdg_stream;
}

int CDGMagic_GraphicsEncoder::length() const
{
    return current_length;
}
```

### 8.2 Direct Binary Write

The C++ implementation provides raw packet access. The caller (likely in main window save handler) writes:

```cpp
// Pseudocode - exact implementation not shown in provided code
FILE* file = fopen("output.cdg", "wb");
CD_SCPacket* stream = encoder.Get_Stream();
int length = encoder.length();

fwrite(stream, sizeof(CD_SCPacket), length, file);
fclose(file);
```

**Result**: Each 24-byte CD_SCPacket is written sequentially to disk, creating a standard .cdg file.

---

## 9. Key Implementation Details for TypeScript

### 9.1 Exact Byte Order (Little-Endian)

```typescript
// Each packet must be written as:
const packet = new Uint8Array(24);
packet[0] = 0x09;              // command
packet[1] = instruction;       // COPY_FONT or XOR_FONT
packet[2] = 0x00;              // parityQ[0]
packet[3] = 0x00;              // parityQ[1]
packet[4] = color0 | (channel << 2);
packet[5] = color1 | (channel << 4);
packet[6] = y_block;
packet[7] = x_block;
for (let i = 0; i < 12; i++) {
    packet[8 + i] = scanlines[i];
}
// packet[20-23] = 0x00 (parityP)
```

### 9.2 Packet Scheduling

```typescript
// Global state during encoding
let currentPacket = 0;
const packets: CD_SCPacket[] = [];

// Append packet and advance counter
function writePacket(instruction: number, ...): void {
    const pkt = createPacket(instruction, ...);
    packets[currentPacket++] = pkt;
}

// Check if block should be written
if (block.start_pack <= currentPacket) {
    currentPacket = writeBlock(currentPacket, block);
}
```

### 9.3 Color Analysis for Bit-Plane Decomposition

```typescript
function analyzeColors(block: FontBlock): AnalysisResult {
    const colors: Set<number> = new Set();
    for (let i = 0; i < 6 * 12; i++) {
        if (block.pixels[i] !== transparentIndex) {
            colors.add(block.pixels[i]);
        }
    }
    
    let colorsOr = 0, colorsAnd = 0xF;
    for (const c of colors) {
        colorsOr |= c;
        colorsAnd &= c;
    }
    
    return {
        count: colors.size,
        or: colorsOr,
        and: colorsAnd,
        varyingBits: countBits(colorsOr ^ colorsAnd)
    };
}
```

---

## 10. Validation Checklist

When implementing TypeScript encoder:

- [x] 24-byte CD_SCPacket structure
- [x] Command byte always 0x09 for graphics
- [x] Instruction codes: 0x01, 0x02, 0x06, 0x26, 0x1E, 0x1F, etc.
- [x] Data bytes 0-3: colors and coordinates
- [x] Data bytes 4-15: scanline pixel data (6 bits per line)
- [x] Parity bytes as 0x00
- [x] Channel bits in both data[0] and data[1]
- [x] Pixel bit ordering: MSB=left, LSB=right
- [x] XOR packet generation for 3+ color blocks
- [x] Palette loading for custom colors
- [x] Memory preset for screen clear
- [x] Packet ordering by start_pack time
- [x] FontBlock-to-packet conversion algorithm
- [x] Compositing layer support (z-index)

---

## 11. Summary: Algorithm at a Glance

```
1. Load BMP images → BMPObject instances
2. For each packet position (0 to length):
   a. If event should start: bmp_to_fonts() → FontBlock deque
   b. If palette/border/memory: create global command packets
   c. If font block scheduled: 
      - copy_compare_fontblock() → check if redraw needed
      - write_fontblock() → analyze colors and generate packets (1-4)
   d. Advance packet counter
3. Get_Stream() → pointer to CD_SCPacket[length]
4. fwrite() to .cdg file → each packet as 24 bytes
```

---

## References

- **C++ Source**: `reference/cd+g-magic/CDG_Magic/Source/`
- **Key Files**:
  - `CDGMagic_GraphicsEncoder.h/cpp` - Main encoder
  - `CDGMagic_GraphicsEncoder__write_fontblock.cpp` - Packet writing
  - `CDGMagic_FontBlock.h/cpp` - Block data structure
  - `CDGMagic_BMPClip.h/cpp` - BMP clip handling
- **Documentation**: `reference/cd+g-magic/CDG_MAGIC_PACKET_SERIALIZATION.md`
