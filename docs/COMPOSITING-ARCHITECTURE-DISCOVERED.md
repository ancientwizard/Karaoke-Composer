# Compositing Architecture - C++ Reference Analysis

**Discovery Date**: Session 5 - Post-Session 4 Analysis
**Analysis Source**: CDGMagic_GraphicsEncoder.cpp, CDGMagic_GraphicsEncoder__compositor.cpp, CDGMagic_GraphicsEncoder__write_fontblock.cpp

## Overview

The C++ CD+Graphics Magic encoder implements a sophisticated **multi-layer compositing system** that allows multiple clips (BMPClips, TextClips, ScrollClips) to render to overlapping screen areas. This is the primary missing feature in our TypeScript implementation.

### Key Discovery

**The C++ system uses an 8-layer compositor buffer (`comp_buffer`) that stores intermediate pixel results before writing to the final CDG packet stream.**

The current TypeScript implementation:
- ✗ Does NOT use a compositor buffer
- ✗ Clips overwrite each other in packet sequence
- ✗ No layer-based depth ordering
- ✗ No transparency or blending

The C++ implementation:
- ✓ Uses `comp_buffer[width × height × 8]` - 8 layers of pixel data
- ✓ Each clip renders to its own layer based on `z_location` (track number 0-7)
- ✓ Pixels are extracted from top-most non-transparent layer
- ✓ Transparency value is 256 (all other values 0-255 are opaque palette indices)

---

## Architecture Details

### Memory Layout

```cpp
// From CDGMagic_GraphicsEncoder.h
enum screen_size {
    VRAM_WIDTH     = 300,          // 50 tiles × 6 pixels
    VRAM_HEIGHT    = 216,          // 18 tiles × 12 pixels
    COMP_LAYERS    = 8,            // Number of compositing layers
    CLUT_SIZE_G    = 16,           // TV Graphics palette size
    CLUT_SIZE_EG   = 256           // Extended Graphics palette size
};

// From constructor (CDGMagic_GraphicsEncoder.cpp lines 24-27)
vram        = new unsigned short[VRAM_WIDTH * VRAM_HEIGHT];
comp_buffer = new unsigned short[comp_width * comp_height * COMP_LAYERS];
```

### Three Buffers

1. **`vram`** (300×216 = 64,800 bytes)
   - Final pixel display buffer
   - What gets written to CDG packets
   - Updated once all clips have rendered

2. **`comp_buffer`** (300×216×8 = 518,400 bytes)
   - Intermediate compositing layer
   - Each layer holds pixel indices (0-255) or transparency (256)
   - Z-order determined by layer index (0=bottom, 7=top)

3. **`cdg_stream`** (18,000 packets × 24 bytes = 432,000 bytes)
   - Final CDG packet data

---

## Compositing Algorithm

### Layer Reading - `get_composited_fontblock()` 

**Location**: `CDGMagic_GraphicsEncoder__compositor.cpp` lines 99-157

```cpp
// Pseudo-code of the algorithm:
int get_composited_fontblock(FontBlock* block, x, y)
{
    // Start with last_preset_index (background color)
    block->fill_with(last_preset_index);
    
    // For each layer 0-7 (bottom to top):
    for (int z_loc = 0; z_loc < COMP_LAYERS; z_loc++)
    {
        // For each pixel in block (6×12):
        for (int px_y = 0; px_y < 12; px_y++)
        {
            for (int px_x = 0; px_x < 6; px_x++)
            {
                // Calculate position in compositor buffer
                int layer_offset = layer_span * z_loc + pixel_offset;
                
                // If pixel is opaque (< 256), use it
                if (comp_buffer[layer_offset] < 256)
                {
                    block->pixel_value(px_x, px_y, comp_buffer[layer_offset]);
                }
                // Otherwise, transparent (256) - keep current value
            }
        }
    }
}
```

### Key Points

1. **Transparency Value = 256**
   - Any value 0-255 is opaque (palette index)
   - Value 256 means "skip this layer, check below"

2. **Z-Order Stacking**
   - Layer 0 = bottom (rendered first, checked first)
   - Layer 7 = top (rendered last, checked last)
   - Later layers override earlier layers if opaque

3. **Background Fallback**
   - If all layers transparent at a position, use `last_preset_index`
   - This is set by MEMORY_PRESET commands

---

## Clip Rendering Flow

### Step 1: Convert Clip to FontBlocks

**`bmp_to_fonts()` function** (CDGMagic_GraphicsEncoder.cpp lines 531-585):

```cpp
for each BMP event in clip:
    for each transition block in BMP:
        x_offset = transition_block_x + x_block_offset
        y_offset = transition_block_y + y_block_offset
        
        fontblock = new FontBlock(x_offset, y_offset, start_pack)
        fontblock->z_location = track_options->track()  // 0-7
        fontblock->channel = track_options->channel()   // 0-3
        
        // Extract pixels from BMP
        for y_px = 0; y_px < 12; y_px++:
            for x_px = 0; x_px < 6; x_px++:
                fontblock->pixel_value(x_px, y_px) = 
                    bmp_object->pixel(x_px + x_offset, y_px + y_offset)
        
        // Handle compositing metadata
        if bmp_object->should_composite() == 1:
            fontblock->replacement_transparent_color(composite_index)
        else if bmp_object->should_composite() == 2:
            fontblock->overlay_transparent_color(composite_index)
        
        queue.push(fontblock)
```

### Step 2: Queue Rendering in Timeline

Main loop (CDGMagic_GraphicsEncoder.cpp lines 174-344):

```cpp
// Process clips in timeline order
while (current_pack < total_packs):
    
    // Queue all clips that should start at this pack
    if (event.start_pack <= current_pack):
        font_queue = bmp_to_fonts(event)
        playout_queue.push(font_queue)
    
    // Write out fonts scheduled for current pack
    while (playout_queue.front().font_queue has data && 
           font_block.start_pack <= current_pack):
        
        current_pack = write_fontblock(current_pack, font_block)
        playout_queue.pop(font_block)
```

### Step 3: Write FontBlock to Packets

**`write_fontblock()` function** (CDGMagic_GraphicsEncoder__write_fontblock.cpp):

1. **Check for duplicates**: Skip if identical to what's on screen
2. **Encode pixel data**: 
   - 1-color blocks: all pixels set to same color
   - 2-color blocks: pixels encode which color (0 or 1)
   - 3+ color blocks: use COPY_FONT followed by XOR_FONT packets
3. **Set instruction type**:
   - `COPY_FONT` (0x06) - Replaces pixels, ignores existing
   - `XOR_FONT` (0x26) - XORs with existing (for multi-color)

---

## Critical Implementation Requirements

### 1. FontBlock Must Store Z-Location

Every FontBlock needs a `z_location` (0-7) representing which layer/track it belongs to:

```typescript
class FontBlock {
    x_location: number;    // 0-49
    y_location: number;    // 0-17
    start_pack: number;
    z_location: number;    // NEW: 0-7 (which compositing layer)
    channel: number;       // 0-3
    pixel_data: Uint8Array; // 72 bytes (6×12)
}
```

### 2. Compositor Buffer Management

Need to create and manage a compositor buffer:

```typescript
// Initialize (dimensions may be larger for scrolling)
comp_buffer = new Uint16Array(300 × 216 × 8);

// Fill with transparency (256)
for (let i = 0; i < comp_buffer.length; i++) {
    comp_buffer[i] = 256;  // Transparent
}
```

### 3. Write FontBlock to Compositor

When a FontBlock is scheduled for rendering:

```typescript
// Instead of writing directly to vram:
// 1. Write to compositor at the specified layer
function write_to_compositor(fontBlock: FontBlock) {
    const layer_offset = fontBlock.z_location * (300 * 216);
    
    for (let py = 0; py < 12; py++) {
        for (let px = 0; px < 6; px++) {
            const pixel_offset = fontBlock.x_location * 6 + px +
                                (fontBlock.y_location * 12 + py) * 300;
            
            comp_buffer[layer_offset + pixel_offset] = 
                fontBlock.pixel_value(px, py);
        }
    }
}
```

### 4. Extract Composited FontBlock

Before writing to CDG packets, read the composited result:

```typescript
function read_composited_fontblock(x: number, y: number): FontBlock {
    const result = new FontBlock(x, y, current_pack);
    
    // Start with background
    let current_pixel = last_preset_index;
    
    // For each layer (0=bottom, 7=top)
    for (let z = 0; z < 8; z++) {
        const layer_offset = z * (300 * 216);
        
        for (let py = 0; py < 12; py++) {
            for (let px = 0; px < 6; px++) {
                const pixel_offset = x * 6 + px + (y * 12 + py) * 300;
                const layer_pixel = comp_buffer[layer_offset + pixel_offset];
                
                // If opaque, use it; if transparent (256), skip
                if (layer_pixel < 256) {
                    current_pixel = layer_pixel;
                }
            }
        }
    }
    
    return result;
}
```

---

## Rendering Timeline vs Compositing

### Current (Wrong) Implementation

```
Packet 680: Write BMPClip tile (direct to screen)
Packet 681: Write TextClip tile (overwrites BMPClip)
Packet 682: Write BMPClip tile (overwrites TextClip)
Packet 683: Write TextClip tile (overwrites BMPClip)
```

**Result**: Each clip overwrites the previous. Only the last-written clip is visible.

### Correct (Compositor) Implementation

```
// Setup phase (per clip):
Packet 600-619: Initialize BMPClip (setup packets)
Packet 680-739: Queue BMPClip renders to layer 0 (or track layer)
Packet 680-739: Queue TextClip renders to layer 1 (or track layer)

// Rendering phase (per pack):
For each pack 680-739:
    1. If new BMPClip tile due: write to compositor[z_bmp]
    2. If new TextClip tile due: write to compositor[z_text]
    3. Extract composited result for this location
    4. If composited result changed from VRAM: write CDG packet
```

---

## Track/Channel vs Z-Location Mapping

### From C++ Code

```cpp
// In bmp_to_fonts():
if (incoming_clip->track_options()) {
    curr_fontblock->z_location(incoming_clip->track_options()->track());
    curr_fontblock->channel(incoming_clip->track_options()->channel());
}

// In write_fontblock_single():
pack_to_write.data[0] = color_one | ((channel << 2) & 0x30);
pack_to_write.data[1] = color_two | ((channel << 4) & 0x30);
```

**Mapping**:
- **z_location** (0-7) → Which compositor layer to render to
- **channel** (0-3) → Which 2 bits of packet header to use for transparency/channel info

---

## Comparison: Reference vs Our Implementation

### Reference Packet 680-695 Analysis

```
Reference Pattern (from SESSION-4-FINDINGS.md):
Pack 680: TextClip tile (X=17, Y=2, Color: 0,1)
Pack 681: BMPClip tile  (X=25, Y=12, Color varies)
Pack 682: TextClip tile (X=17, Y=3, Color: 0,1)
Pack 683: BMPClip tile  (X=26, Y=12, Color varies)
Pack 684: TextClip tile (X=17, Y=4, Color: 0,1)
Pack 685: BMPClip tile  (X=27, Y=12, Color varies)
...

Generated Pattern (Current):
Pack 680: BMPClip tile  (X=25, Y=12, Color varies)
Pack 681: TextClip tile (X=18, Y=1, Color: 1,2)  ← Different position and color!
Pack 682: BMPClip tile  (X=26, Y=12, Color varies)
Pack 683: TextClip tile (X=19, Y=1, Color: 1,2)  ← Different position and color!
```

**Issues**:
1. **Order**: References has TextClip first, ours has BMPClip first
2. **Position**: References shows TextClip at Y=2, ours at Y=1
3. **Color**: References shows (0,1), ours shows (1,2)

### Root Cause: No Compositor

The reference shows interleaved packets because:
- BMPClip writes to one layer
- TextClip writes to another layer
- When read back (composited), both are visible
- Packets reflect CHANGES to composited output

Our code:
- BMPClip writes directly to vram
- TextClip overwrites it
- Only one clip visible at a time

---

## Next Steps for Implementation

### Phase 1: Add Compositor Buffer (CRITICAL)

1. Create `CompositorBuffer` class:
   - `width`, `height`, `layers=8`
   - `buffer: Uint16Array`
   - `write(x, y, z, value)` method
   - `read(x, y)` method (composites all layers)
   - `clear()` method

2. Modify `FontBlock` class:
   - Add `z_location` property (0-7)
   - Add `channel` property (0-3)
   - Add compositing metadata

3. Modify rendering loop:
   - Before writing FontBlocks: fill comp_buffer with 256
   - When queuing clip: assign z_location from track
   - When writing FontBlock: write to comp_buffer instead of vram
   - When extracting for CDG: read from comp_buffer (composited)

### Phase 2: Fix Color/Position Issues

1. TextClip color selection (why 1,2 instead of 0,1?)
2. TextClip position calculation (why Y=1 instead of Y=2?)
3. Track/layer assignment logic

### Phase 3: Validation

1. Test packets 680-695 match reference
2. Test multi-clip overlap scenarios
3. Run full accuracy test

---

## Expected Impact

- **Mismatch reduction**: 30-50% of remaining 107,047 mismatches likely due to overlap
- **Accuracy improvement**: Could jump from 75.23% to 80%+ if implemented correctly
- **Test coverage**: Should fix all interleaving-related mismatches

---

## References

- `CDGMagic_GraphicsEncoder.h` - Architecture definition
- `CDGMagic_GraphicsEncoder.cpp` - Main encoding loop
- `CDGMagic_GraphicsEncoder__compositor.cpp` - Layer compositing functions
- `CDGMagic_GraphicsEncoder__write_fontblock.cpp` - Packet generation

---

## END

<!-- Generated: Session 5 Analysis Phase -->
