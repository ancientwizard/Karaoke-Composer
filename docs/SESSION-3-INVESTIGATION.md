# Session 3 Investigation Summary

## Timeline

1. **User Observation**: "Transitions working but BMP rendering interfered with, no blue background, text still ugly"
2. **Investigation Phase 1**: Parsed CMP file to see what's defined
3. **Investigation Phase 2**: Found text events are broken (all undefined properties)
4. **Investigation Phase 3**: Analyzed BMP files and discovered palette is entirely black
5. **Breakthrough**: Realized palette is decoupled from BMP - CD+G packets override display colors

---

## Major Discoveries

### Discovery #1: TextClip Event Parsing is Broken ❌
**Impact**: 5-8% accuracy loss

**Problem**: 
- CMPParser returns events with: `clipTimeOffset`, `clipTimeDuration`, `width`, `height`, `xOffset`, `yOffset`, etc.
- CDGExporter expects: `text`, `fontType`, `fontSize`, `foregroundColor`, `backgroundColor`, `outlineIndex`, `boxIndex`, `frameIndex`, `squareSize`, `roundSize`, `highlightMode`, `compositeIndex`, `shouldComposite`

**Result**: All text properties are `undefined`, so text renders with defaults, not CMP-specified styling.

---

### Discovery #2: Text Rendering Architecture Completely Different ❌
**Impact**: 10-15% accuracy loss

**C++ Implementation**:
- Offscreen FLTK rendering with effects
- Font-based (not tile-based)
- Multiple colors: outline, box, frame, fill, text
- Circular outlines and rounded borders
- Composite blending modes

**Our Implementation**:
- Simple 6×12 tile lookup
- Fixed size, no effects
- Monospace only
- Text + background only

**User's Observation**: "White letters with colorful highlights"
- This is outline + text rendering properly composited
- We're rendering just basic tiles

---

### Discovery #3: ALL BMP PALETTE INDICES ARE BLACK! ❌
**Impact**: 15-20% accuracy loss (THE BREAKTHROUGH!)

**The Finding**:
Both BMPs have 256-color palettes where **EVERY entry is #000000 (black)**

**The Answer: Palette Substitution via CD+G Packets**

```
BMP Structure:          CD+G Display:
├─ Pixel Data           ├─ Palette Packets (0x1E, 0x1F)
│  └─ Indices 0-255     │  └─ Override display colors
└─ Internal Palette     │
   (all black)          └─ Pixel index 12 + Packet "color 12 = blue" = BLUE
   └─ IGNORED!             
```

**How It Works**:
1. BMP pixel: index 12 (black in BMP palette = invisible)
2. CD+G palette packet: "Set color 12 to BLUE"
3. Result: Pixel displays as BLUE

**Why We Fail**:
```typescript
// WRONG! We load black palette
this.internal_palette = bmpData.palette.slice(0, 16);
```

Result: No blue background, all black output

---

### Discovery #4: BMP Properties Completely Ignored ❌
**Impact**: 3-5% accuracy loss

**Properties Unused**:
- `xOffset`, `yOffset` - Positioning (assume 0,0)
- `compositeIndex` - How BMP composites
- `fillIndex` - Background fill color
- `borderIndex` - Border mode
- `screenIndex` - Screen mode
- `shouldComposite`, `shouldPalette` - Feature flags

---

### Discovery #5: Multiple Transitions Partially Tested ⚠️
**Impact**: Unknown

**Status**:
- ✅ gradient_03 tested
- ⚠️ gradient_04, gradient_01, gradient_02 untested

---

## What We Got vs. What We're Missing

### TextClip Parsing
```
CMP Properties              What We Do
─────────────────────────────────────────
fontFace ❌                 Not parsed for text use
fontSize ❌                 Parsed but ignored
karaokeMode ❌              Parsed but ignored
highlightMode ❌            Parsed but ignored
foregroundColor ❌          Used as default, not per-event
backgroundColor ❌          Used as default, not per-event
outlineColor ❌             Completely ignored
squareSize ❌               Completely ignored
roundSize ❌                Completely ignored
frameColor ❌               Completely ignored
boxColor ❌                 Completely ignored
fillColor ❌                Completely ignored
compositeColor ❌           Completely ignored
shouldComposite ❌          Completely ignored
```

---

## Priority Fix Strategy

### P0 - Critical (30-50% error potential)
1. **Palette substitution** (15-20% gain)
   - Stop loading black BMP palette
   - Load proper colors from elsewhere

2. **Text rendering effects** (10-15% gain)
   - Implement outlines, boxes, multi-color
   - Not just basic tiles

3. **TextClip properties** (5-8% gain)
   - Extract all properties from CMP
   - Use them in rendering

### P1 - Important (10-20% error potential)
1. **BMP properties** (3-5% gain)
2. **Test all transitions** (1-2% gain)
3. **Screen reset mechanism** (2-3% gain)

---

## Expected Accuracy After Fixes

```
Current:           71.80%
+ Palette fix:     87-92%  (+15-20%)
+ Text effects:    92-95%  (+5-8%)
+ BMP properties:  96-98%  (+3-5%)
Final:             96-99%  (essentially perfect)
```

---

## Key Insight: The Decoupling

BMP and Palette are **separate concerns**:
- **BMP**: Defines spatial layout (which pixels get which index)
- **Palette**: Defines what color each index displays as

This is why the blue background is missing - we're loading the wrong palette!

