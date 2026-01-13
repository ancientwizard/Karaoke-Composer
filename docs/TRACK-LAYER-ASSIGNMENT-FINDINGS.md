# C++ Track/Layer Assignment Analysis

## Overview
Analysis of CD+Graphics Magic C++ source code to understand how text and BMP clips are assigned to z-layers (tracks) and how overlapping clips are handled.

---

## 1. Z-Location / Track Assignment Logic

### Core Mechanism
**Location:** [CDGMagic_GraphicsEncoder.cpp](CDGMagic_GraphicsEncoder.cpp#L578)

Track assignment happens when converting BMP/text data to FontBlocks:

```cpp
// Line 578 - bmp_to_fonts() function
if ( incoming_clip->track_options() )
{
    curr_fontblock->z_location( incoming_clip->track_options()->track() );
    curr_fontblock->channel( incoming_clip->track_options()->channel() );
};
```

**Also at line 720** (in wipe/transition variant):
```cpp
if ( incoming_clip->track_options() )
{
    curr_fontblock->z_location( incoming_clip->track_options()->track() );
    curr_fontblock->channel( incoming_clip->track_options()->channel() );
};
```

### Key Points:
- **Each clip has a `CDGMagic_TrackOptions` object** that holds the track number
- **Track value is read from:** `incoming_clip->track_options()->track()`
- **Track range:** 0-7 (8 layers/tracks available) — defined as `COMP_LAYERS = 8` in [CDGMagic_GraphicsEncoder.h](CDGMagic_GraphicsEncoder.h#L91)
- **Assignment is explicit:** Each FontBlock gets the track assigned from its parent clip's track options

### TrackOptions Structure
**Location:** [CDGMagic_TrackOptions.h](CDGMagic_TrackOptions.h)

```cpp
class CDGMagic_TrackOptions : public Fl_Group
{
protected:
    Fl_Button         *mask_edit_button;
    Fl_Simple_Counter *channel_counter;
    unsigned char      internal_track;  // Stores the track (0-7)

public:
    unsigned char  track();
    void track(unsigned char requested_track);
};
```

---

## 2. FontBlock Z-Location Storage

### FontBlock Class Definition
**Location:** [CDGMagic_FontBlock.h](CDGMagic_FontBlock.h#L74-L75)

```cpp
unsigned char z_location() const;
void z_location(unsigned char req_z);
```

**Implementation:** [CDGMagic_FontBlock.cpp](CDGMagic_FontBlock.cpp#L58-L59)
```cpp
unsigned char CDGMagic_FontBlock::z_location() const { return z_index; }
void CDGMagic_FontBlock::z_location(unsigned char req_z)  { z_index = req_z; }
```

- Each FontBlock stores its z-layer index as `z_index`
- This value is used during compositing and rendering

---

## 3. Compositing Engine: Layer Stacking

### Multi-Layer Buffer Structure
**Location:** [CDGMagic_GraphicsEncoder.h](CDGMagic_GraphicsEncoder.h#L88-L92)

```cpp
enum screen_size
{
    VRAM_WIDTH     = 300,          // Width (in pixels)
    VRAM_HEIGHT    = 216,          // Height (in pixels)
    COMP_LAYERS    =   8,          // Number of "layers" for compositing
    CLUT_SIZE_G    =  16,          // 16-color palette
    CLUT_SIZE_EG   = 256           // 256-color palette
};
```

### Compositing Buffer Layout
The compositing buffer is organized as: **[comp_width × comp_height × COMP_LAYERS]**

Each pixel at position (x, y, z) is located at:
```
offset = (comp_width * comp_height * z) + (x + y * comp_width)
```

**Location:** [CDGMagic_GraphicsEncoder.cpp](CDGMagic_GraphicsEncoder.cpp#L791)
```cpp
int layer_offset = comp_width * comp_height * block_to_compare->z_location() + pixel_offset;
```

### Layer Compositing Order
**Location:** [CDGMagic_GraphicsEncoder__compositor.cpp](CDGMagic_GraphicsEncoder__compositor.cpp#L124-L129)

```cpp
for (int z_loc = 0; z_loc < COMP_LAYERS; z_loc++)
{
    int layer_offset = layer_span * z_loc + pixel_offset;
    // If the pixel value of the current layer at the current location is less than 256, it's opaque.
    // So set the value of the incoming block's pixel to that value instead.
    if ( comp_buffer[layer_offset] < 256 )  {  return_block->pixel_value(x_pix, y_pix, comp_buffer[layer_offset]);  };
};
```

**Key Logic:**
- Pixels with value < 256 are **opaque** (contain color index)
- Pixels with value = 256 are **transparent** (not rendered)
- Layers are composited from bottom (z=0) to top (z=7)
- First opaque pixel encountered wins (top-most non-transparent pixel is displayed)

---

## 4. Separation of BMP and Text Onto Different Layers

### Answer: NO Automatic Separation

**The code does NOT automatically separate BMP and text onto different layers.**

Instead:
1. **Both BMP clips and text clips are user-assigned to tracks**
2. Each clip's `CDGMagic_TrackOptions` determines which layer (0-7) it will render to
3. BMPs, text, scrolls, etc., all use the same mechanism: convert to FontBlocks, assign z_location, render

### Example Flow for Multiple Clips:

**Location:** [CDGMagic_GraphicsEncoder.cpp](CDGMagic_GraphicsEncoder.cpp#L550-L600)

```cpp
std::deque<CDGMagic_FontBlock*> CDGMagic_GraphicsEncoder::bmp_to_fonts(CDGMagic_MediaClip *incoming_clip)
{
    // ... loop through BMP events ...
    CDGMagic_BMPObject* bmp_object = incoming_deque->at(cur_int_evnt)->BMPObject;
    
    // Create FontBlock for each pixel region
    CDGMagic_FontBlock *curr_fontblock = new CDGMagic_FontBlock(x_offset, y_offset, start_pack);
    
    // Assign track from clip's settings
    if ( incoming_clip->track_options() )
    {
        curr_fontblock->z_location( incoming_clip->track_options()->track() );
        curr_fontblock->channel( incoming_clip->track_options()->channel() );
    };
    
    // ... fill pixel data ...
    font_deque_return.push_back(curr_fontblock);
}
```

**For text clips:** The same process applies. Text is rendered to BMPObject first, then converted to FontBlocks using the same `bmp_to_fonts()` or similar process.

---

## 5. Handling Multiple Clips on the Same Track

### Pattern: Temporal Ordering + Pixel-Level Overwriting

**Location:** [CDGMagic_GraphicsEncoder.cpp](CDGMagic_GraphicsEncoder.cpp#L780-L810)

When multiple clips target the same track (z_location), the C++ code:

1. **Sorts events by start time** (via `timeline_event_sorter`)
2. **Processes in temporal order** (each clip replaces previous pixels at same location)
3. **Tracks transparency:**

```cpp
int new_index = block_to_compare->pixel_value(x_pix, y_pix);

// If the pixel equals the replacement transparent color, make it transparent
if ( new_index == block_to_compare->replacement_transparent_color() )
{
    comp_buffer[layer_offset] = 256; // Mark as transparent
}
// Otherwise, if not overlay transparent, write the pixel
else if ( new_index != block_to_compare->overlay_transparent_color() )
{
    comp_buffer[layer_offset] = new_index; // Put pixel value in layer
};
```

### Overlapping Clips on Same Track:
- **Earlier clips are drawn first**
- **Later clips overwrite pixels** at the same (x, y) position on the same layer
- **Transparency settings control partial overwriting:**
  - `replacement_transparent_color`: Makes pixels transparent in current block
  - `overlay_transparent_color`: Leaves pixels untouched when this color encountered

---

## 6. Comments in Source Code

The original C++ code contains explicit documentation about layer offset calculation:

**Location:** [CDGMagic_GraphicsEncoder__compositor.cpp](CDGMagic_GraphicsEncoder__compositor.cpp#L42-L48)

```cpp
for (int z_loc = 0; z_loc < 8; z_loc++)
{
    // Set the layer offset.
    // NOTE: Track, which ranges from 0 to 7, offsets are thus compositing area * track + pixel_offset.
    int layer_offset = comp_width * comp_height * z_loc + pixel_offset;
    // If the pixel value of the current layer at the current location is less than 256, it's opaque.
    // So set the value of the incoming block's pixel to that value instead.
    if ( comp_buffer[layer_offset] < 256 )  {  tmp_block->pixel_value(x_pix, y_pix, comp_buffer[layer_offset]);  };
};
```

---

## 7. MediaEvent Structure

**Location:** [CDGMagic_MediaClip.h](CDGMagic_MediaClip.h#L29-L41)

Each clip contains a queue of media events:

```cpp
struct CDGMagic_MediaEvent
{
    int start_offset;
    int duration;
    int actual_start_offset;
    int actual_duration;
    CDGMagic_PALObject *PALObject;      // Palette data
    CDGMagic_BMPObject *BMPObject;      // Bitmap/text rendered as pixels
    unsigned char border_index;
    unsigned char memory_preset_index;
    signed char x_scroll;
    signed char y_scroll;
    void *user_obj;                     // For TextClip: CDGMagic_TextEvent_Info
};
```

---

## Summary Table

| Aspect | Value | Location |
|--------|-------|----------|
| **Max Layers** | 8 (tracks 0-7) | CDGMagic_GraphicsEncoder.h:91 |
| **Layer Assignment** | Per-clip via `TrackOptions::track()` | CDGMagic_GraphicsEncoder.cpp:578, 720 |
| **FontBlock Storage** | `z_index` member variable | CDGMagic_FontBlock.h:74-75 |
| **Buffer Organization** | [width × height × layers] | CDGMagic_GraphicsEncoder.cpp:791 |
| **Transparency Value** | 256 (opaque = < 256) | CDGMagic_GraphicsEncoder__compositor.cpp:129 |
| **Multi-Clip Handling** | Temporal ordering + pixel overwrite | CDGMagic_GraphicsEncoder.cpp:780-810 |
| **Auto BMP/Text Separation** | **NO** — manual via TrackOptions | N/A |

---

## Key Implementation Insights

1. **Unified rendering pipeline:** BMP clips, text clips, and scroll operations all route through the same FontBlock compositing system
2. **Track assignment is user-controlled:** Not automatic; user sets track via UI or programmatically
3. **Pixel-level compositing:** Each pixel independently tracks which layer has the topmost opaque value
4. **Transparency flags:** Enable selective layering (overlay vs. replacement modes)
5. **Temporal processing:** Clips processed in timeline order, later clips can overwrite earlier ones

---

## References

- C++ reference: `/reference/cd+g-magic/CDG_Magic/Source/`
- Key files:
  - `CDGMagic_GraphicsEncoder.cpp` (lines 550-900)
  - `CDGMagic_GraphicsEncoder__compositor.cpp` (compositing logic)
  - `CDGMagic_GraphicsEncoder.h` (structure definitions)
  - `CDGMagic_TrackOptions.h` (track assignment UI)
  - `CDGMagic_FontBlock.h` (z-layer storage)
