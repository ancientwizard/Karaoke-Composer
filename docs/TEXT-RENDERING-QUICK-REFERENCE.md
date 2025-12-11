# Text Rendering Quick Reference

## Palette Color Usage

| Index | Usage | Default | Notes |
|-------|-------|---------|-------|
| 0-15 | Palette colors | Variable | CD+G standard 16-color palette |
| background_index | Canvas background | 0 | Fills entire rendering canvas |
| foreground_index | Main text color | 2 | Text glyph pixels |
| outline_index | Outline/shadow | 1 | Circular/square outline effect |
| outline_index+1 | Antialiasing | 2+1=3 | Edge smoothing (if enabled) |
| composite_index | Transparency | 16 | Transparent color during compositing |

## Pixel-to-Bit Encoding

### Two-Color Block Example
```
Foreground Color: Index 2 (most common)
Background Color: Index 0
Pixel at (3,0) = 2 → Bit 1 in row 0
Pixel at (4,0) = 0 → Bit 0 in row 0

Byte: 0b?????01? (bit 5=leftmost, bit 0=rightmost)
      When displayed:
      - Pixels where bit=1 → Show "foreground" color (index 2)
      - Pixels where bit=0 → Show "background" color (index 0)
```

### Three-Color Block Example
```
COPY packet: foreground=2, background=1
XOR packet:  XOR value = 2^3 = 1

Display logic:
- If pixel needs color 1: Set bit=0 in COPY (shows background)
- If pixel needs color 2: Set bit=1 in COPY (shows foreground)
- If pixel needs color 3: Set bit=1 in COPY AND bit=1 in XOR
                         (2 XOR 1 = 3) ✓
```

## Color Index Assignment in Rendering

### Step 1: Set FLTK Color
```cpp
fl_color((palette_index << 24) | 0x00FFFFFF);
```
Shifts index into high byte; FLTK maps to actual RGB

### Step 2: Render Text
```cpp
fl_draw(text, x, y);
```
FLTK uses indexed color for rendering

### Step 3: Read Pixels
```cpp
fl_read_image(buffer, ...);  // RGB format
unsigned char index = buffer[pixel*3];  // RED channel
```

### Step 4: Store in BMP
```cpp
bmp->linear_pixel(px, index);  // Store palette index directly
```

### Step 5: Extract to FontBlock
```cpp
fontblock->pixel_value(x, y, bmp->pixel(x_offset+x, y_offset+y));
```

## CD+G Packet Encoding Decision Tree

```
┌─ How many unique colors in 6×12 block?
│
├─ 1 Color
│  └─→ 1 COPY packet
│      All pixels set to 0x3F (111111 binary)
│
├─ 2 Colors
│  └─→ 1 COPY packet
│      Bitmap: 1=color2, 0=color1
│
├─ 3 Colors
│  └─→ 2 packets (1 COPY + 1 XOR)
│      COPY: establish color 1 & 2
│      XOR:  modify bits for color 3
│
└─ 4+ Colors
   └─→ 2-3 packets (combinations of COPY/XOR)
       Bitwise analysis to minimize packet count
```

## Transparent Color Handling

### Replacement Mode (mode=1)
```cpp
fontblock->replacement_transparent_color(index);
// During compositing:
// if pixel == index: skip it (show layer below)
// else: show this pixel
```

### Overlay Mode (mode=2)
```cpp
fontblock->overlay_transparent_color(index);
// Allow blending with lower layers
// Used for karaoke highlighting effects
```

### No Transparency (default)
```cpp
// transparent_index = 256 (invalid, means "opaque")
// All pixels overwrite previous content
```

## What Sets "Set" vs "Unset" Pixels

In FontBlock bitmap encoding:

**Bit = 1 (Set)**: Pixel matches the "1" color in encoding
- In 2-color: pixel equals colors_to_write[1] (less common color)
- In 3-color: pixel equals colors_to_write[1] OR colors_to_write[2]
- In XOR: conditional on secondary color differences

**Bit = 0 (Unset)**: Pixel matches the "0" color in encoding
- In 2-color: pixel equals colors_to_write[0] (most common color)
- In 3-color: pixel equals colors_to_write[0] only
- In XOR: complement of secondary encoding

## Typical Text Example

Input text: White text on black background
- background_index = 0 (black)
- foreground_index = 15 (white)
- outline_index = 8 (gray)

Rendered bitmap contains:
- Index 0: Background canvas
- Index 8: Outline pixels (shadow effect)
- Index 15: Main text pixels

FontBlock encoding:
- Colors in block: {0, 8, 15} (3 unique)
- Prominent order: 15 (most), 0, 8
- Use 3-color encoding (2 packets)

COPY packet:
- foreground = 0 (most common background)
- color0 = 15 (text)
- Bitmap bits = 1 if pixel is 15 or 8

XOR packet:
- XOR value = 15 ^ 8 = 7
- Bitmap bits = 1 if pixel is 8

Result on screen:
- Text pixels (15): rendered as white
- Outline pixels (8): rendered as gray
- Background pixels (0): rendered as black
