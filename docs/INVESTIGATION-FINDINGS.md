# Investigation Findings - Session 3

## Overview
Systematic investigation of sample_project_04.cmp revealed multiple architectural issues preventing correct rendering. Following the principle: **.cmp defines WHAT, .cpp defines HOW**.

---

## WHAT's in the CMP File

### Clips Structure
```
[Clip 0] BMPClip     start=600   dur=1479
  - BMP: simple_sky_2+14.bmp (216x300)
  - Transition: transition_gradient_03.cmt
  - Offset: (6, 12)
  - CompositeIdx: 16, FillIdx: 16, BorderIdx: 0, ScreenIdx: 0

[Clip 1-4] TextClip  (multiple text clips with various timing)
  - Multiple events (up to 67 events in clip 3!)
  - Should render text with styling

[Clip 5] BMPClip     start=11000 dur=19
  - BMP: clear_screen_2+14.bmp
  - No transition
  - Used for screen clearing/reset

[Clip 7] BMPClip     start=12000 dur=110
  - BMP: clear_screen_2+14.bmp
  - Transition: transition_gradient_04.cmt (SECOND TRANSITION NOT YET OBSERVED!)
```

### Key Observations
1. **Two different BMPs**: `simple_sky_2+14.bmp` (blue sky) and `clear_screen_2+14.bmp`
2. **Two transitions used**: `gradient_03` and `gradient_04`
3. **Multiple TextClips** with numerous events (up to 67 in one clip!)
4. **screen_2+14.bmp** appears to be a clearing/reset mechanism
5. **Composite indices** and **border indices** have significance (16=transparent/ignore, 0=color 0)

---

## CRITICAL ISSUE #1: TextClip Event Parsing Broken ❌

### The Problem
TextClip events are not being parsed correctly. All properties return `undefined`:

```
Text: '(none)'
Font: type=undefined size=undefined
Colors: FG=undefined BG=undefined Outline=undefined
Box: (undefined, undefined) undefinedxundefinedpx
```

### Root Cause
**Mismatch between CMPParser output and what exporter expects:**

**CMPParser returns events with:**
- `clipTimeOffset` 
- `clipTimeDuration`
- `width`
- `height`
- `xOffset`
- `yOffset`
- `transitionFile`
- `transitionLength`
- `clipKarType`
- `clipLineNum`
- `clipWordNum`

**Exporter looks for:**
- `text` (doesn't exist - stored at clip level, not event level)
- `fontType` (parser doesn't return this)
- `fontSize` (parser doesn't return this)
- `foregroundColor` (parser doesn't return this)
- `backgroundColor` (parser doesn't return this)
- And many more styling properties

### Impact
**All text rendering is currently using default/fallback values**, not the styling from the CMP file. This explains:
- Why text is "ugly"
- Why colors are wrong
- Why text doesn't match reference output

### Files Involved
- `src/ts/cd+g-magic/CMPParser.ts` - `readTextClip()` method (lines 310-410)
- `src/ts/cd+g-magic/ClipConverter.ts` - `convertTextClip()` function (lines 53-93)
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` - `schedule_text_clip()` method (lines 290+)

---

## CRITICAL ISSUE #2: Missing Screen Reset / Palette Effects ❌

### Observation
User reported:
- "Never see the blue background"
- "Transitions interfered with screen reset/clear behavior"
- Reference shows white letters with colorful highlights

### Theory
The `clear_screen_2+14.bmp` BMPs at clips 5 and 7 are NOT just clearing the screen. They're:
1. **Palette manipulation** - possibly hiding/showing colors
2. **Screen reset protocol** - multiple MEMORY_PRESET packets
3. **Background fill** - the blue sky should be visible before text

### Reference Pattern
The C++ code has:
- `composite_index` - controls how blocks composite over existing pixels
- `fill_index` - background fill color
- `border_index` - border color or mode
- `screen_index` - screen/page mode

**Our implementation ignores these!**

### Impact
- Background BMPs don't show through properly
- Text rendering happens on wrong background
- Palette effects not working

---

## CRITICAL ISSUE #3: Text Rendering Architecture Completely Different ❌

### C++ Approach (from CDGMagic_TextClip.cpp)
1. **Offscreen rendering** - Renders text to offscreen buffer using FLTK
2. **Font-based rendering** - Uses actual font rendering, not tile-based lookup
3. **Effects rendering** - Circular outlines, rounded borders, boxes
4. **Multi-color support** - Separate outline, box, frame, fill colors
5. **Composite modes** - Text can be XORed, blended, etc.

### Our Approach
1. **Simple lookup** - Character maps to 6×12 tile
2. **Fixed 6×12 tiles** - No scaling or effects
3. **Monospace only** - No font variety
4. **Text + background only** - No outlines or effects
5. **Direct placement** - No compositing

### The "White letters with colorful highlights" Effect
This is likely:
- **White foreground text** (FG color index)
- **Colorful outline** drawn using outline color index
- **Background box** in box color
- All rendered together using proper compositing

We're rendering just a basic tile-based character, not the full effect.

### Impact
This explains 15-20% accuracy loss just in text rendering alone.

---

## CRITICAL ISSUE #4: Multiple Transitions Being Used ❌ (Partially)

### Observation
- Clip 0: Uses `transition_gradient_03.cmt` ✅ (we implemented)
- Clip 7: Uses `transition_gradient_04.cmt` ❌ (we haven't tested)

### Status
Transitions are implemented but only tested with one transition file. Need to verify:
- Does transition_gradient_04 render correctly?
- Are all 4 available transitions supported?
- Does loading different transitions work?

---

## CRITICAL ISSUE #5: BMP Properties Not Used ❌

### Properties We Ignore
From BMP events:
- `xOffset`, `yOffset` - BMP positioning on screen (we assume 0,0)
- `compositeIndex` - How BMP composites over existing pixels
- `fillIndex` - Background fill color
- `borderIndex` - Border color or transparency mode
- `screenIndex` - Screen/page mode
- `shouldComposite` - Enable/disable compositing
- `shouldPalette` - Enable/disable palette effects

### Impact
- BMP can't be positioned (only at 0,0)
- No transparency/compositing
- No border effects
- No palette interaction

---

## Secondary Issues (P1/P2)

### Issue: Different BMP dimensions
- `simple_sky_2+14.bmp` is **216x300** (not 300x216!)
- This is rotated/transposed from standard 300x216 CD+G screen
- Are we handling non-standard dimensions correctly?

### Issue: 14 in filename
- Files named `simple_sky_2+14.bmp` and `clear_screen_2+14.bmp`
- The "+14" might indicate 14 color palette entries
- Or might be a version number
- Unclear significance

### Issue: Composite index = 16
- Value 16 appears frequently as "do nothing" indicator
- Might mean "transparent" or "ignore this property"
- Worth investigating in C++ reference

---

## Priority Fixes Needed

### P0 - MUST FIX (Blocking ~30% of errors)
1. **Fix TextClip event parsing** - Extract styling properties from CMP
2. **Implement text effects** - Outlines, boxes, proper styling (not just tiles)
3. **Use composite indices** - Proper compositing for BMPs and text

### P1 - SHOULD FIX (~10% improvement each)
1. **Support BMP positioning** - Use xOffset/yOffset
2. **Palette effects** - How colors hide/show via palette changes
3. **Test all transitions** - Verify gradient_04 and others work

### P2 - NICE TO HAVE
1. Optimize text rendering performance
2. Support different BMP dimensions properly
3. Understand significance of "+14" in filenames

---

## Key Discoveries

### What We Got Right
- ✅ Transition file loading and ordering
- ✅ Basic BMP to FontBlock conversion
- ✅ Packet generation structure
- ✅ Palette packet generation

### What We Got Very Wrong
- ❌ Text rendering (architecture mismatch)
- ❌ Text event parsing (properties not extracted)
- ❌ BMP compositing (properties ignored)
- ❌ Composite indices not used
- ❌ Screen reset protocol not implemented
- ❌ Palette effects not implemented

### What We Completely Missed
- ❌ Multiple BMPs used for different purposes (background vs. clearing)
- ❌ Complex text styling with outlines and effects
- ❌ Composite modes and transparency
- ❌ Screen clearing/reset behavior (clear_screen_2+14.bmp)

---

## Next Steps

1. **Parse TextClip events correctly** - Get all styling properties from CMP
2. **Understand composite mode** - Read reference C++ for composite_index handling
3. **Investigate clear_screen_2+14.bmp** - What makes it different? How is it used?
4. **Study text effect rendering** - Outlines, boxes, multi-color text
5. **Test all transitions** - Verify gradient_04 and multi-transition behavior

---

## Reference Files to Study

- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_TextClip.cpp` - Text rendering (complex!)
- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_BMPObject.cpp` - BMP properties
- `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_GraphicsEncoder.cpp` - Composite modes
- `cdg-projects/clear_screen_2+14.bmp` - Inspect this file, understand purpose
- `cdg-projects/simple_sky_2+14.bmp` - Inspect this file, compare with clear_screen

---

## Byte Accuracy Impact Estimate

```
Current: 71.80%

Potential improvements:
- Fix text parsing: +5-8%  (get correct properties)
- Fix text rendering: +10-15% (proper outlines/effects)
- Fix BMP positioning: +2%
- Fix composite modes: +3-5%
- Fix palette effects: +2-3%
- Fix screen reset: +1-2%

Estimated after fixes: 94-98%
```

