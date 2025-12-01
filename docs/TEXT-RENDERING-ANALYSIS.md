# Text Rendering Analysis & Issues

## User-Reported Issues

1. **Text rendering is awful**: Visual quality poor compared to reference
2. **Font layout is wrong**: Pattern and positioning incorrect
3. **Text placement is incorrect**: Centering/alignment issues

## C++ Reference Implementation Analysis (CDGMagic_TextClip.cpp)

### Rendering Architecture

The C++ implementation uses **FLTK (Fast Light Toolkit)** for text rendering:

```cpp
// Off-screen rendering pipeline:
Fl_Offscreen offscreen_image = fl_create_offscreen(line_width, line_height);
fl_begin_offscreen(offscreen_image);
fl_font(internal_font_index, internal_font_size);  // Real font rendering

// For each LINE (not the entire text):
for (unsigned int curr_line_num = 0; curr_line_num < number_of_lines; curr_line_num++) {
  // Draw background
  fl_draw_box(FL_FLAT_BOX, ...);
  
  // Draw circular outline (for shadows/effects)
  for (int theta = 0; theta <= 360; theta++) {
    fl_draw(text, left_start-(int)sine, top_start-(int)cose);
  }
  
  // Draw square outline
  for (int bx_inc = -internal_square_size; ...) {
    fl_draw(text, left_start+bx_inc, top_start+by_inc);
  }
  
  // Draw anti-aliased pixels (offset rendering)
  fl_draw(text, left_start-1, top_start);
  fl_draw(text, left_start+1, top_start);
  fl_draw(text, left_start, top_start-1);
  fl_draw(text, left_start, top_start+1);
  
  // Draw main foreground text
  fl_draw(text, left_start, top_start);
  
  // Read rendered line into bitmap
  fl_read_image(temp_buffer, 0, 0, line_width, line_height);
}
fl_end_offscreen();
```

### Key Differences from Current Implementation

| Aspect | C++ Implementation | Current TS Implementation |
|--------|-------------------|--------------------------|
| **Font Rendering** | FLTK (real fonts) | Bitmap font (5×7 glyphs) |
| **Font Size** | Variable (1-72) | Fixed 6×12 pixels |
| **Outline Support** | Yes (circular & square patterns) | None |
| **Anti-aliasing** | Yes (4-offset technique) | None |
| **Line Handling** | Each line = separate BMPObject | All text = single BMP |
| **Vertical Centering** | `top_start = (line_height - fl_height()) / 2 + fl_height() - fl_descent()` | Simple `boxTop + lineIdx * 12` |
| **Horizontal Centering** | `left_start = (line_width - fl_width(text)) / 2` | Simple `boxLeft + floor((boxWidth - textWidth) / 2)` |
| **Text Metrics** | Uses fl_height(), fl_descent(), fl_width() | Hardcoded 6×12 tile sizes |

### Line Rendering Logic (C++ Pattern)

```cpp
// Calculate line dimensions dynamically
int blk_height = ceiling((font_size + border_size*2) / 12.0);
int line_height = blk_height * 12;  // Round up to tile boundaries

// Set lines per page based on line height
if (karaoke_mode == TITLES) {
  lines_per_page = 192 / line_height;
}

// For TITLES mode: each line rendered at vertical offset
y_offset = (curr_line_num % lines_per_page) * line_height + 12;
```

This means:
- Line height is calculated based on font size
- Lines stack vertically with proper spacing
- Not all lines fit on screen (192 pixels / line_height)

### Text Properties Used (Currently Unused in TS)

| Property           | Purpose | TS Status |
|--------------------|---------|-----------|
| `font_size` (1-72) | Controls rendered text size | ❌ IGNORED (always 6×12) |
| `font_index`       | Font selection | ❌ IGNORED (always SIMPLE_FONT_5x7) |
| `outline_color`    | Color for text outlines | ❌ IGNORED |
| `antialias_mode`   | Enable 4-offset anti-aliasing | ❌ IGNORED |
| `karaoke_mode`     | Display mode (TITLES, LYRICS, 5-line, etc.) | ⚠️ PARTIALLY USED |
| `square_size` / `round_size` | Outline sizes | ❌ NOT AVAILABLE |
| `highlight_mode`   | Karaoke highlight effect | ⚠️ NOT IMPLEMENTED |

## Current Implementation Issues

### Issue #1: Text Treated as Single Monolithic Block

**Current Code** (CDGExporter.ts, schedule_text_clip):
```typescript
// Get ALL text at once
const textContent = clip.text_content();

// Render ALL text into single 300×216 BMP
for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  // Render all characters from all lines into one BMP
  for (let charIdx = 0; charIdx < line.length; charIdx++) {
    // Draw character to BMP
  }
}

// Convert entire BMP to 768 FontBlocks at once
const fontblocks = bmp_to_fontblocks(...);
```

**Problem**: Text events aren't tracked separately per line, unlike C++ which creates one BMPObject per line.

### Issue #2: Fixed Tile Size Ignores Font Properties

**Current Code**:
```typescript
const textWidthPixels = line.length * 6;  // Always 6 pixels per char
const lineTopPixel = boxTopPixel + lineIdx * 12;  // Always 12 pixels per line
```

**Problem**: Completely ignores `font_size` property. A 72-point font should render much larger than a 12-point font, not identical 6×12 tiles.

### Issue #3: No Text Effects/Outlines

**Current Code**: Only renders foreground color, no outlines or effects.

**Problem**: User sees bland, low-quality text without the enhanced rendering that C++ provides.

### Issue #4: Positioning May Be Off-by-One or Misaligned

**Current Calculation**:
```typescript
const centeredStartPixel = boxLeftPixel + Math.floor((boxWidthPixel - textWidthPixels) / 2);
const lineTopPixel = boxTopPixel + lineIdx * 12;
```

**Problem**: Doesn't account for:
- Font descent (how far below baseline text extends)
- Variable line heights based on font size
- Proper text metrics

## Solutions Ranked by Complexity

### Option A: Simple Improvements (Quick Win)
- ✅ Transitions now working (DONE)
- ✅ Text placement improvements (already done in earlier phase)
- Could improve bitmap font glyphs
- Could add simple outlines (draw twice, offset pixels)

### Option B: Support Variable Font Sizes (Medium)
- Generate different-sized bitmap fonts
- Scale glyphs based on `font_size` property
- Adjust line height dynamically
- Update positioning calculations

### Option C: Full TrueType Font Support (Major Refactor)
- Would require:
  - Canvas 2D API for rendering
  - Font loading and rasterization
  - Complex layout calculations
  - Much higher complexity than current approach

### Option D: Accept Current Limitations
- Bitmap font is inherent to CD+G format constraints
- 300×216 resolution is ultra-low
- Current implementation is reasonable for the constraints
- Focus on correct positioning and transitions (now working)

## Recommended Path Forward

1. **Phase 1** (COMPLETE) : Transitions working ✅
2. **Phase 2** (CURRENT)  : Improve text positioning/centering
3. **Phase 3** (OPTIONAL) : Support variable font sizes
4. **Phase 4** (FUTURE)   : Implement outline/antialiasing effects

## Testing Notes

Generated output file: `tmp/output.cdg` from `cdg-projects/sample_project_04.cmp`

Observed:
- ✅ Transitions now working (gradient reveal visible)
- ✅ BMP backgrounds render correctly
- ⚠️ Text appears but positioning/quality unclear without visual inspection
- ⚠️ Font size fixed at 6×12 regardless of TextClip.font_size property

## References

- C++ Source: `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_TextClip.cpp` (lines 1-300)
- FLTK Functions Used: `fl_font()`, `fl_draw()`, `fl_read_image()`, `fl_width()`, `fl_height()`, `fl_descent()`
- Current TS Implementation: `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` (schedule_text_clip method)

// END
