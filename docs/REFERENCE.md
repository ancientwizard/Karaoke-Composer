# CD+G Magic Implementation Reference

Complete reference guide for the CD+Graphics Magic TypeScript implementation. This consolidates critical facts, architecture decisions, and technical details needed to understand and maintain the codebase.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Architecture Overview](#architecture-overview)
3. [File Format Reference](#file-format-reference)
4. [Known Issues & Limitations](#known-issues--limitations)
5. [Implementation Details](#implementation-details)
6. [Testing & Validation](#testing--validation)

---

## Core Concepts

### Timing Model: PACKETS, NOT MILLISECONDS

All timing in JSON and the codebase uses **packet-based units**, not milliseconds:
- CD+G playback rate: **300 packets per second**
- 1 second = 300 packets
- Example: `start: 600` = packet 600 = 2 seconds into playback
- Example: `duration: 1479` = 1479 packets long = 4.93 seconds

**Critical:** When converting from milliseconds or seconds, always multiply by 300 to get packet count.

### File Comparison Notes

- **DO NOT compare entire CDG files** - they may have different padding lengths
- Only compare the actual content portion
- Use: `cmp -l file1 file2 | head -100` to see byte-level differences
- To compare first 42 seconds: `head -c 302400 file1 | cmp - file2_first_42s`

---

## Architecture Overview

### CMP Parser: Pure Read/Write with Optional Path Normalization

**Design Principle:** CMP binary format parsing is pure (no side effects), enabling perfect round-trip fidelity.

```
Binary .cmp file → CMPParser.parse() → Raw project object
                   ↓
             (Optional path normalization via PathNormalizationFacade)
                   ↓
            Project object → CMPParser.serialize() → Identical binary file
```

**Key Property:** If you read a .cmp file and serialize it back, you get the exact same binary.

**Path Normalization:**
- Windows backslashes (`\`) → forward slashes (`/`)
- `Sample_Files/` → `cdg-projects/` (for local testing)
- Applied AFTER parsing, not during
- Can be disabled for save operations to preserve round-trip fidelity

**Usage:**
```typescript
// Load with normalization (for UI)
const parser = new CMPParser(buffer);
const rawProject = parser.parse();
const normalizer = new PathNormalizationFacade({
  normalizeSlashes: true,
  replaceSampleFiles: true,
});
const uiProject = normalizer.normalize(rawProject);

// Save without normalization (for export)
const binary = parser.serialize(rawProject);
```

### Clip Types

1. **TextClip** - Text rendering with karaoke effects
2. **BMPClip** - Bitmap image rendering with optional transition effects
3. **ScrollClip** - Scrolling text (stub implementation)
4. **PALGlobalClip** - Global palette (stub implementation)

### Clip Conversion Pipeline

```
CMP Binary Format
    ↓
CMPParser.parse() reads binary fields:
  - TextClip: boxColor, frameColor, karaokeMode, etc.
  - BMPClip: screenIndex, borderIndex, transitionFile, etc.
    ↓
ClipConverter.convertTextClip() / convertBMPClip()
  - Creates CDGMagic_TextClip or CDGMagic_BMPClip instances
  - Maps CMP fields to clip properties:
    * boxColor → box_index() and memory_preset_index()
    * frameColor → frame_index() and border_index()
    * screenIndex → memory_preset_index()
    ↓
CDGMagic_CDGExporter.register_clip() schedules packets:
  - Conditionally schedules screen clear (MEMORY_PRESET) only if < 16
  - Conditionally schedules border (BORDER_PRESET) only if < 16
  - Uses box_index as clear color, frame_index as border color
    ↓
export_to_binary() generates CD+G binary output
```

### Screen Clear Settings

**Key Insight:** Screen clear is controlled by palette indices, where 16 = "disabled"

From CMP file:
- TextClip: `boxColor` and `frameColor` fields
- BMPClip: `screenIndex` (clear) and `borderIndex` fields

Mapping logic (from C++ reference):
```
value < 16  → Feature ENABLED, use value as the color
value == 16 → Feature DISABLED, don't schedule packet
```

Implementation in ClipConverter:
```typescript
// TextClip
if (data.boxColor !== undefined) {
  textClip.box_index(data.boxColor);
  textClip.memory_preset_index(data.boxColor); // Same value
}

// BMPClip
if (data.events?.[0]) {
  evt.memory_preset_index = evt.screenIndex ?? 16;
  evt.border_index = evt.borderIndex ?? 16;
}
```

Implementation in CDGExporter:
```typescript
// Only schedule if < 16 (enabled)
const memoryIdx = clip.memory_preset_index();
if (memoryIdx < 16) {
  this.add_scheduled_packet(clip.start_pack() + 3, 
    this.create_memory_preset_packet(clip.box_index()));
}
```

---

## File Format Reference

### CD+G Packet Structure (24 bytes)

```
[Byte 0]     : Command code (0x00-0x1F)
[Bytes 1-19] : Data (19 bytes)
[Bytes 20-21]: Checksum
[Bytes 22-23]: Reserved
```

**Common Command Codes:**
- `0x00` : EMPTY (placeholder, does nothing)
- `0x01` : MEMORY_PRESET (clear screen to color)
- `0x02` : BORDER_PRESET (set border color)
- `0x18` : SCROLL_COPY (copy with scroll offset)
- `0x19` : TILE_BLOCK (draw 6x12 tile block)
- `0x1A` : FILL_BLOCK (fill 6x12 block with color)
- `0x1E` : LOAD_PALETTE_LOW (load palette colors 0-7)
- `0x1F` : LOAD_PALETTE_HIGH (load palette colors 8-15)

### CMP Binary Format (TextClip)

After clip header (track, start, duration):

```
Offset  Size  Field
------  ----  -----
0       var   fontFace (string, null-terminated)
var     4     fontSize (int32)
+4      1     karaokeMode (int8)
+5      1     highlightMode (int8)
+6      1     foregroundColor (int8)
+7      1     backgroundColor (int8)
+8      1     outlineColor (int8)
+9      1     squareSize (int8)
+10     1     roundSize (int8)
+11     1     frameColor (int8)       ← BORDER COLOR (16 = disabled)
+12     1     boxColor (int8)         ← SCREEN CLEAR COLOR (16 = disabled)
+13     1     fillColor (int8)
+14     1     compositeColor (int8)
+15     4     shouldComposite (int32)
+19     4     xorBandwidth (int32)
+23     4     antialiasMode (int32)
+27     4     defaultPaletteNumber (int32)
+31     var   textContent (string, null-terminated)
+var    4     numEvents (int32)
        [event array...]
```

### CMP Binary Format (BMPClip Event)

```
Offset  Size  Field
------  ----  -----
0       4     eventStart (int32)
+4      4     eventDuration (int32)
+8      var   bmpPath (string, null-terminated)
+var    4     height (int32)
+4      4     width (int32)
+8      4     xOffset (int32)
+12     4     yOffset (int32)
+16     1     fillIndex (int8)
+17     1     compositeIndex (int8)
+18     4     shouldComposite (int32)
+22     1     borderIndex (int8)      ← BORDER COLOR (16 = disabled)
+23     1     screenIndex (int8)      ← SCREEN CLEAR COLOR (16 = disabled)
+24     4     shouldPalette (int32)
+28     var   transitionFile (string, null-terminated)
+var    2     transitionLength (int16)
```

---

## Known Issues & Limitations

### ❌ NOT YET IMPLEMENTED

1. **Line-by-line text rendering for karaoke modes**
   - Currently: All text lines render to a single full-screen bitmap at clip start
   - Expected: Lines should appear progressively with cut/fade animation
   - Modes affected: MODE_5LNCT (0x0c), MODE_6LNCT (0x0d), etc.
   - Example: "training" clip in sample_project_04.cmp (packet 2700) has 15 lines that should appear over 26.6 seconds

2. **Text highlighting (WIPE events)**
   - Currently: No visual indication of which line is "current"
   - Expected: Overlay effect showing which line is being sung
   - Requires: WIPE event generation and timing

3. **Fade effects for line transitions**
   - Line-fade modes (0x0e, 0x0f) not implemented
   - Requires: XOR overlay FontBlocks with timing

### ⚠️ VERIFIED & WORKING

1. ✅ **Screen clear timing** - Conditional based on memory_preset_index
   - If < 16: schedules MEMORY_PRESET at clip.start_pack() + 3
   - If == 16: no clear packet scheduled
   - Uses box_index as clear color for TextClip
   - Uses memory_preset_index value as clear color for BMPClip

2. ✅ **Border drawing** - Conditional based on border_index
   - If < 16: schedules BORDER_PRESET at appropriate offset
   - If == 16: no border packet scheduled
   - Uses frame_index as border color

3. ✅ **Screen clear settings from CMP** - Settings correctly loaded from binary
   - TextClip: boxColor → memory_preset_index / box_index
   - TextClip: frameColor → border_index / frame_index
   - BMPClip: screenIndex → memory_preset_index
   - All 707 unit tests passing

4. ✅ **Transition file loading** - Multiple clips can use different transition files
   - Clip 0: BMP with transition_gradient_03.cmt
   - Clip 7: BMP with transition_gradient_04.cmt
   - Both load correctly

---

## Implementation Details

### Key Classes

1. **CDGMagic_CDGExporter** (`src/ts/cd+g-magic/CDGMagic_CDGExporter.ts`)
   - Main export orchestrator
   - Methods: `register_clip()`, `schedule_packets()`, `export_to_binary()`
   - Handles clip registration, packet scheduling, and final binary generation

2. **CDGMagic_TextClip** (`src/ts/cd+g-magic/CDGMagic_TextClip.ts`)
   - Text clip representation
   - Properties: `memory_preset_index()`, `box_index()`, `border_index()`, `frame_index()`
   - Methods: `text_content()`, `font_size()`, `karaoke_mode()`, etc.

3. **CDGMagic_BMPClip** (`src/ts/cd+g-magic/CDGMagic_BMPClip.ts`)
   - Bitmap clip representation
   - Properties: `start_pack()`, `duration()`, `file_path()`
   - Internal: `_bmp_events` array with screen clear/border settings per event

4. **CMPParser** (`src/ts/cd+g-magic/CMPParser.ts`)
   - Binary CMP format parser
   - Methods: `parse()` (read), `serialize()` (write)
   - Perfect round-trip fidelity

5. **ClipConverter** (`src/ts/cd+g-magic/ClipConverter.ts`)
   - Converts parsed CMP data to clip instances
   - Transfers boxColor/frameColor/screenIndex to proper properties
   - Applies defaults (16 = disabled)

### Packet Scheduling

**Offset Pattern for TextClip Screen Clear:**
```
clip.start_pack() + 0: LOAD_LOW palette (colors 0-7)
clip.start_pack() + 1: LOAD_HIGH palette (colors 8-15)
clip.start_pack() + 2: BORDER_PRESET (if border_index < 16)
clip.start_pack() + 3: MEMORY_PRESET (if memory_preset_index < 16)
clip.start_pack() + 4+: FontBlock packets (text rendering)
```

**Offset Pattern for BMPClip Screen Clear:**
```
clip.start_pack() + 0: LOAD_LOW palette
clip.start_pack() + 1: LOAD_HIGH palette
clip.start_pack() + 2: BORDER_PRESET (if enabled)
clip.start_pack() + 2+16: MEMORY_PRESET packets (if enabled)
                         Or start at +2 if border disabled
clip.start_pack() + 19+: FontBlock packets (bitmap rendering)
```

### Screen Clear Color Values

Screen clear uses palette indices, not RGB values:
- **Color 0**: Usually black (index 0 in palette)
- **Color 13**: In sample_project_04, this is a dark color (see "training" clip)
- **Disabled (16)**: No clear packet scheduled

The actual RGB values come from the palette (LOAD_LOW/LOAD_HIGH packets).

---

## Testing & Validation

### Test Coverage

- **Total Tests:** 707 passing
- **Main Test File:** `src/tests/cd+g-magic/phase-b-export.test.ts`
- **Test Duration:** ~70 seconds for full suite

### Test Data

All test data uses `sample_project_04.cmp`:
```
Clips:
  0: BMPClip, packets 600-2079, clear color 0, no border
  1: TextClip, packets 680-740, clear color 2, border color 2
  2: TextClip, packets 840-1008, clear color 2, border color 2
  3: TextClip, packets 1500-1986, clear disabled, border disabled
  4: TextClip, packets 2700-10684, clear color 13, border color 8 (karaoke mode 12)
  5: BMPClip, packets 11000-11019, clear color 0, no border
  6: TextClip, packets 11100-11208, clear color 0, border color 1
  7: BMPClip, packets 12000-12110, clear disabled, border disabled
```

### Render Test

To render and verify output:
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg
```

Expected output:
- 432,000 bytes (18,000 packets × 24 bytes each)
- Valid CD+G binary that can be played on compatible hardware/software

### Debug Mode

Enable debug logging to see packet scheduling:
```bash
DEBUG=cdg_exporter npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg
```

---

## Implementation Notes

### Why index value 16 = "disabled"

From C++ implementation (CDGMagic_TextClip.h):
```cpp
unsigned char internal_memory_preset_index = 16;  // 16 = disabled
unsigned char internal_border_index = 16;          // 16 = disabled
```

Palette indices are 0-15 (16 colors). Using 16 as the sentinel value for "disabled" avoids conflicts with valid color indices.

### Packet offset delays

Screen clear (MEMORY_PRESET) is scheduled at `start_pack() + 3` to ensure:
1. Palette loads complete first (offsets 0-1)
2. Border preset (if any) schedules before clear (offset 2)
3. Clear happens before text/bitmap rendering (offset 3)

### Why ClipConverter is needed

The CMP binary format stores settings (boxColor, frameColor, screenIndex) but doesn't directly set them on clip instances. ClipConverter acts as a translation layer:
- Reads parsed binary data
- Creates proper clip instances
- Transfers settings using the public API (e.g., `box_index()`, `memory_preset_index()`)
- Applies defaults where needed

This separation maintains:
- **CMPParser**: Pure binary format handling
- **ClipConverter**: Business logic and defaults
- **CDGMagic_*Clip**: Clip representation and scheduling
- **CDGMagic_CDGExporter**: Final packet scheduling and generation

---

## Further Reading

- **C++ Reference:** `reference/cd+g-magic/CDG_Magic/Source/CDGMagic_TextClip.cpp` and `.h` files
- **CD+G Format Spec:** `docs/CDG-reference.md`
- **Packet Binary Format:** `docs/PACKET-BINARY-FORMAT.md`
- **UML Diagrams:** `docs/CD+G-Magic-UML.md`

---

**Last Updated:** December 8, 2025  
**Status:** Active Development

// VIM: set ft=markdown :
// END
