# Critical Issues Found in GraphicsDecoder Implementation

## Issue 1: Palette Color Format - WRONG
**Location:** `execute_load_clut_lo()` and `execute_load_clut_hi()`

**Problem:** 
- We treat palette data as 3 separate bytes per color (R, G, B as 8-bit values)
- Actually: CD+G uses 2 bytes per color with 6-bit RGB packed format
- Each color is 12 bits total (6-bit R, 6-bit G, 6-bit B)
- 6-bit values (0-63) must be scaled to 8-bit (0-255) by multiplying by 17

**C++ Reference:**
```cpp
temp_entry = (cdg_pack->data[pal_inc*2]&0x3C) >> 2;        // Red (6 bits)
temp_rgb |= (temp_entry * 17) << rgba_order[0];
temp_entry = ((cdg_pack->data[pal_inc*2]&0x03)<<2) | 
             ((cdg_pack->data[pal_inc*2+1]&0x30)>>4);     // Green (6 bits)
temp_rgb |= (temp_entry * 17) << rgba_order[1];
temp_entry = (cdg_pack->data[pal_inc*2+1]&0x0F);          // Blue (6 bits)
temp_rgb |= (temp_entry * 17) << rgba_order[2];
```

**Fix Required:** Rewrite LOAD_CLUT to extract 6-bit values and scale properly

---

## Issue 2: RGBA Output Format - WRONG
**Location:** `to_rgba_framebuffer()`

**Problem:**
- We output **RGBA** (4 bytes per pixel)
- Actually: C++ outputs **RGB** (3 bytes per pixel)
- Our output is 4x too large

**C++ Reference:**
```cpp
int dest_loc = ((x_loc+6)+(y_loc*312))*3;  // *3 for RGB, not *4
rgba_screen[dest_loc+0] = palette[vram[scr_loc]&0x0F] >> 030; // Red
rgba_screen[dest_loc+1] = palette[vram[scr_loc]&0x0F] >> 020; // Green
rgba_screen[dest_loc+2] = palette[vram[scr_loc]&0x0F] >> 010; // Blue
```

**Fix Required:** Output RGB instead of RGBA

---

## Issue 3: Display Area Rendering - WRONG
**Location:** `to_rgba_framebuffer()`

**Problem:**
- We render the full 304×192 area
- Actually: C++ only renders active display area (6-294 x, 12-204 y)
- Border area is rendered separately with border color

**C++ Reference:**
```cpp
for (int y_loc = 12; y_loc < 204; y_loc++)        // Only 192 pixels
{
    for (int x_loc = 6; x_loc < 294; x_loc++)    // Only 288 pixels
    {
        int scr_loc = (x_loc+h_offset) + ((y_loc+v_offset)*300);
        // ... render pixel ...
    }
}
// Then fill borders separately
proc_fill_RGB(  0,   0, 312,  12, border_color); // Top
proc_fill_RGB(  0, 204, 312,  12, border_color); // Bottom
proc_fill_RGB(  0,  12,  12, 192, border_color); // Left
proc_fill_RGB(300,  12,  12, 192, border_color); // Right
```

**Fix Required:** Add border rendering, only render active area

---

## Issue 4: VRAM Dimensions - WRONG
**Location:** Constructor and display constants

**Problem:**
- We use 304×192 for VRAM
- Actually: C++ VRAM is 300×216 (note: 300 wide, not 304)
- Display window is 312×216 (includes 6-pixel border on each side)
- Active area is 300×192 (6-pixel border on top/bottom, left/right sides)

**C++ Reference:**
```cpp
vram = new unsigned char[300*216];          // 300×216, not 304×192
rgba_screen = new unsigned char [312*216*3]; // 312×216 output (with borders)
```

**Fix Required:** Adjust VRAM to 300×216, output to 312×216

---

## Issue 5: Palette Initialization - INCOMPLETE
**Location:** Constructor

**Problem:**
- C++ initializes palette to all 0xFF for alpha channel
- We initialize to default palette through PALObject
- May not match C++ behavior

**C++ Reference:**
```cpp
for (int idx=0; idx<16; idx++) 
{ 
    palette[idx] = 0xFF<<rgba_order[3];  // Set alpha to 0xFF
}
```

**Fix Required:** Verify PALObject initialization matches this

---

## Summary of Required Fixes

1. **LOAD_CLUT:** Extract 6-bit RGB from packed format, scale by 17
2. **to_rgba_framebuffer:** Output RGB (3 bytes), not RGBA (4 bytes)
3. **Display Bounds:** Render only active area, add border rendering
4. **VRAM Size:** Change from 304×192 to 300×216
5. **Palette Init:** Ensure alpha is 0xFF for all default colors
6. **Offset Handling:** Apply h_offset and v_offset in to_rgba_framebuffer

These are fundamental differences that would cause graphics not to render at all.

## VIM: set ft=markdown :
## END
