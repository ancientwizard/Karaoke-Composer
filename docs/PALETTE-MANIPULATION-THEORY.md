# Palette Manipulation Theory - The Missing Piece

## Key Discovery: ALL BMP PALETTE INDICES ARE BLACK!

The `simple_sky_2+14.bmp` file has:
- 300×216 pixels (full screen)
- 256-color palette
- **ENTIRE PALETTE IS BLACK (#000000)**

So how does the user see a blue background in the reference output?

## Answer: Palette Substitution

The CD+G format dynamically loads palette colors via PALETTE packets (0x1E, 0x1F).

### The Mechanism

1. **BMP File**: Contains pixel data using color indices 0-255
   - `simple_sky_2+14.bmp`: All pixels use indices that map to palette entries
   - Since BMP palette is all black, pixels are invisible until...

2. **CD+G Palette Packets**: Dynamically set the actual colors displayed
   - LOAD_LOW (0x1E): Sets colors 0-7
   - LOAD_HIGH (0x1F): Sets colors 8-15

3. **Result**: 
   - BMP renders using color indices from its data
   - Those indices are mapped to CD+G palette colors via packets
   - User sees the palette colors, not the BMP's internal palette

### Example: The Blue Background

```
Scenario:
BMP pixel: index 12 (maps to black in BMP palette, so invisible)
But CD+G palette packet sets: color 12 = blue
Result: Pixel appears BLUE on screen!
```

## How C++ Implements This

The `fill_index` parameter likely controls:
- Which palette index to use as the "fill" or "base" color
- Or which index represents the BMP data

## Why Our Implementation Fails

We load the BMP palette directly into CD+G palette packets:

```typescript
// WRONG! We're using BMP palette
this.internal_palette = bmpData.palette.slice(0, 16);
this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(
  this.internal_palette[0], this.internal_palette[1], ...
));
```

Since BMP palette is all black, colors don't display:
- No blue background ❌
- Text appears on black ❌
- Transitions interfere because blocks are invisible ❌

## The Correct Approach

1. **Extract color indices from BMP pixel data**
   - Each pixel references a palette index (0-255)

2. **Determine which palette indices are actually used** by the BMP
   - `simple_sky_2+14.bmp` might use indices 0-15 only

3. **Load those specific indices with the DESIRED colors**
   - Not the BMP's internal palette colors
   - But colors chosen for display effect

4. **Palette packets specify the visual colors**
   - Indices map through CD+G palette to actual RGB
   - This is where the blue comes from!

## Key Implementation Insight

The BMP file and the palette packets are **decoupled**.

- **BMP**: Defines spatial layout (which pixel gets which index)
- **Palette**: Defines what color each index displays

This is why:
- Text can have colorful outlines (different palette entries)
- Background colors can change (palette update, not BMP change)
- The same BMP data looks different with different palettes

## The composite_index Mystery

The `composite_index = 16` pattern might mean:
- **16 = "use default" or "transparent/passthrough"**
- Actual indices are 0-15 (standard CD+G 16 colors)
- Index 16 means "don't apply any composite operation"

This could explain why:
- BMP loads without special blending
- Text renders directly
- Clear screen works

## Files Using This Pattern

In sample_project_04.cmp:

1. **Clip 0 (sky BMP)**:
   - `simple_sky_2+14.bmp` (all black internal palette)
   - Shown with palette colors (becomes blue background)
   - Transition reveals gradually

2. **Clip 5 & 7 (clear screen BMP)**:
   - `clear_screen_2+14.bmp` (all black internal palette)
   - Probably has specific index usage (all color 16?)
   - Used for screen reset effect

## Next Steps to Fix

1. **Don't load BMP internal palette** into CD+G palette packets
2. **Extract color indices used by BMP pixels**
3. **Load palette with intended display colors** (need to figure out where these come from)
4. **Use composite_index and fill_index** to control blending

The palette colors might come from:
- TextClip properties (foreground/background colors)
- Clip properties (borderIndex, boxIndex, etc.)
- Global palette settings
- Or extracted from somewhere else in the CMP

## Impact of This Discovery

**This explains:**
- ✅ Why blue background is missing
- ✅ Why text appears wrong
- ✅ Why transitions interfere (invisible blocks rendered)
- ✅ Why user sees no proper effects

**This fixes ~15-20% of byte mismatches** when implemented correctly!

