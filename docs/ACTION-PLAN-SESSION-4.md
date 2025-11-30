# Immediate Action Plan - Session 4 Priorities

## What You Need to Know

The investigation revealed **the root cause of rendering failure**: we're loading the wrong palette!

**Key Finding**: BMP files have completely black palettes. The actual colors come from CD+G palette packets (0x1E, 0x1F) that override the display.

---

## Highest Priority Fix: Palette Substitution

### Current Wrong Code (CDGMagic_CDGExporter.ts, schedule_bmp_clip)

```typescript
// This loads the BLACK palette from BMP file!
this.internal_palette = bmpData.palette.slice(0, 16);
this.add_scheduled_packet(clip.start_pack(), 
  this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7)
);
```

### What Needs to Change

Instead of using BMP's internal palette, we need to:

1. **Analyze BMP pixel data** to determine which palette indices are actually used
2. **Load colors from somewhere else** (options to investigate):
   - TextClip foreground/background colors?
   - Global palette settings in CMP?
   - Derived from composite_index?
3. **Set those indices with proper colors** so pixels display correctly

### Investigation Needed

- Look at C++ code to see where palette colors come from
- Check if there's a "standard" palette for CD+G
- See how composite_index and fill_index affect palette selection

---

## Second Priority: TextClip Properties

### Problem

TextClip events store properties like:
```
clip.foreground_color()
clip.background_color()
clip.outline_color()
clip.font_size()
```

But we're not using these in rendering!

### What Needs to Change

1. **Extract these properties** in schedule_text_clip()
2. **Use them in renderTextToTile()** or create a new rendering function
3. **Implement multi-color rendering**:
   - Base text color
   - Outline color (drawn offset in circular pattern)
   - Background box color
   - Frame color

### Reference

Study CDGMagic_TextClip.cpp lines 550-650 for text effect rendering

---

## Third Priority: All BMP Properties

### Properties to Implement

From BMP events, currently ignored:
```
xOffset, yOffset       - Position BMP on screen
compositeIndex         - Blending mode
fillIndex              - Background color
borderIndex            - Border/mode
screenIndex            - Page mode
shouldComposite        - Enable blending
shouldPalette          - Enable palette effects
```

### Quick Wins

1. **xOffset/yOffset**: Use when scheduling BMP blocks
2. **compositeIndex**: Add to composite logic

---

## Test These First

1. Run test with gradient_04 transition (currently untested)
2. Check if multiple transitions work properly
3. Verify clear_screen_2+14.bmp usage

---

## Files to Review

### To Fix
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts`
  - `schedule_bmp_clip()` - needs palette override logic
  - `schedule_text_clip()` - needs property usage
- `src/ts/cd+g-magic/TextRenderer.ts`
  - `renderTextToTile()` - needs effects

### To Study
- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_BMPObject.cpp` - palette usage
- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_TextClip.cpp` - text effects
- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder.cpp` - composite modes

### Test Files
- `cdg-projects/simple_sky_2+14.bmp` - inspect actual pixels and indices used
- `cdg-projects/clear_screen_2+14.bmp` - understand purpose
- `cdg-projects/transition_gradient_04.cmt` - test different transition

---

## Success Criteria

### Palette Fix (P0)
- [ ] Blue background appears in generated CDG
- [ ] Byte accuracy improves to 85%+ (from 71.80%)
- [ ] Text no longer rendered on black background

### Text Effects (P1)
- [ ] Text has outlines/background boxes
- [ ] Multiple colors displayed correctly
- [ ] Byte accuracy improves to 92%+

### Full Properties (P2)
- [ ] BMP positioned correctly
- [ ] Composite modes working
- [ ] All 4 transitions tested
- [ ] Byte accuracy reaches 96%+

---

## Quick Reference: The 5 Issues

| Issue | Impact | Fix Complexity | Blockers |
|-------|--------|---------------|----|
| Palette (BLACK!) | 15-20% | Medium | Understand where colors come from |
| Text effects | 10-15% | High | Need FLTK equivalent or custom rendering |
| TextClip props | 5-8% | Low | Just wire up existing properties |
| BMP properties | 3-5% | Low | Use xOffset/yOffset in scheduling |
| Test transitions | 1-2% | Low | Already implemented, just verify |

---

## The Big Picture

```
Why reference works:
1. BMP pixels use indices (0-255)
2. Palette packets map indices to colors
3. Display shows palette colors = BLUE BACKGROUND + TEXT!

Why ours doesn't:
1. BMP pixels use indices (0-255)
2. We load BLACK palette
3. Display shows palette colors = ALL BLACK = INVISIBLE!

The fix:
1. Stop loading BMP palette
2. Load palette from... somewhere (TBD)
3. Profit!
```

The palette issue alone explains why everything looks broken. Fix that first, then the cascade of other issues becomes clearer.

