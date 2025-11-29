# UI Implementation Plan - Complete Feature Breakdown

**Status**: Preliminary/superficial UI only (type/start/duration fields)
**Goal**: Full-featured clip editors matching C++ implementation

## Current State Assessment

### What Exists (EditorView.vue)
- ✅ Clip list with basic timeline display
- ✅ Type selector (BMPClip, TextClip, ScrollClip, PALGlobalClip)
- ✅ Start time editor (ms)
- ✅ Duration editor (ms)
- ✅ Add/remove clip buttons
- ✅ Basic playback controls (simulation only)
- ✅ File references debug panel (raw paths)
- ✅ PathNormalizationFacade integrated (UI uses normalized paths)

### What's Missing (Per Clip Type)

---

## Implementation Priority & Complexity

### 1. **BMPClip Editor** ⭐ SIMPLEST - Start Here
**Estimated Effort**: 2-3 hours
**C++ Reference**: CDGMagic_BMPClip_Window.h/cpp

**Fields to Implement**:
```
BMPClip Structure:
├── track (int8) - audio channel
├── start (int32) - packet position
├── duration (int32) - packet duration
└── Events (variable):
    ├── bmpPath (null-terminated string)
    ├── fillIndex (int8)
    ├── compositeIndex (int8) 
    └── transitionFile (null-terminated string, optional)
```

**UI Components Needed**:
- [ ] Event list/table with add/remove buttons
- [ ] BMP file picker (browse cdg-projects/*.bmp)
- [ ] Transition file picker (browse cdg-projects/*.cmt)
- [ ] Dropdown: Fill Index (0-255)
- [ ] Dropdown: Composite Index (0-255)
- [ ] Toggle: "Update Palette" checkbox
- [ ] Preview box (static BMP display)
- [ ] Event editor inline or in dialog

**C++ Logic to Port**:
- `add_bmp_file()` - file selection dialog
- `set_transition_file()` - transition selection
- `update_preview()` - render BMP preview

---

### 2. **TextClip Editor** ⭐⭐⭐ MOST COMPLEX
**Estimated Effort**: 6-8 hours
**C++ Reference**: CDGMagic_TextClip_Window.h/cpp + CDGMagic_TextClip_Window__Editor.h/cpp

**Fields to Implement**:
```
TextClip Structure:
├── track (int8)
├── start (int32)
├── duration (int32)
├── textContent (null-terminated string)
├── fontFace (null-terminated string)
├── fontSize (int32)
├── karaokeMode (int8) - enum: TITLES, LYRICS, 5TLINE, etc (16 values)
├── Colors (3 colors, 9 bytes):
│   ├── fgIndex (int8)
│   ├── bgIndex (int8)
│   └── outlineIndex (int8)
├── 4 Config Ints:
│   ├── boxIndex
│   ├── frameIndex
│   ├── fillIndex
│   └── compositeIndex
├── xorBetweenWords (boolean)
├── antialiasMode (int8)
├── palette (int8) - 0-8 embedded palette
└── Events (variable) - **CRITICAL COMPLEXITY**:
    ├── type: int8 (TEXT_ONLY, KARAOKE_DRAW, KARAOKE_WIPE, KARAOKE_ERASE)
    ├── position: int32 (packet offset)
    ├── lineNum: int16
    ├── wordNum: int16
    ├── textString: string (possibly empty if wipe/erase)
```

**UI Components Needed**:
- [ ] Rich text editor (multi-line, syntax highlighting for karaoke markers)
- [ ] Font face selector (dropdown: available fonts)
- [ ] Font size slider/spinner (8-128)
- [ ] Karaoke mode selector (16-option dropdown with descriptions)
- [ ] Color palette preview/selector (3 color pickers showing palette indices)
- [ ] Effects controls:
  - [ ] Box style (Index selector)
  - [ ] Frame style (Index selector)
  - [ ] Fill pattern (Index selector)
  - [ ] Composite mode (Index selector)
  - [ ] XOR between words (checkbox)
  - [ ] Anti-alias mode (dropdown)
  - [ ] Embedded palette selector (9 options)
- [ ] **Karaoke Event Editor** (complex):
  - [ ] Timeline scrubber for event placement
  - [ ] Event type selector per line/word
  - [ ] Word/line/syllable highlighting
  - [ ] Wipe/draw/erase event type switcher
  - [ ] Event timing visualization
- [ ] Text preview with current styling applied
- [ ] Page counter (if multi-page text)

**C++ Logic to Port**:
- `CDGMagic_TextClip_Window__Editor` - full text editing experience
- `set_draw_time()` - karaoke event timing
- `get_draw_time()` - karaoke event retrieval
- Palette color lookup and rendering
- Embedded palette colors (9 predefined palettes with 16 colors each)

**Complexity Notes**:
- Karaoke events are where most complexity lives (word/syllable timing)
- Need visual timeline for event placement
- Palette colors require bit-shifting: `(r << 16) | (g << 8) | (b << 0) | (a << 24)`
- Text can have multiple pages (each page is separate CDG graphics data)

---

### 3. **ScrollClip Editor** ⭐⭐ MODERATE
**Estimated Effort**: 2-3 hours
**C++ Reference**: CDGMagic_ScrollClip_Window.h/cpp

**Fields to Implement**:
```
ScrollClip Structure:
├── track (int8)
├── start (int32)
├── duration (int32)
├── textContent (null-terminated string)
├── scrollDirection (int8) - 0=up, 1=down, 2=left, 3=right
├── scrollSpeed (int8) - pixels per update
└── Events (usually minimal/none)
```

**UI Components Needed**:
- [ ] Text area for scroll content
- [ ] Scroll direction selector (4-option: up/down/left/right)
- [ ] Speed slider (1-32 pixels per frame)
- [ ] Preview with animated scroll effect

**C++ Logic to Port**:
- Basic scroll animation preview
- Direction and speed rendering

---

### 4. **PALGlobalClip Editor** ⭐ SIMPLEST (but rare)
**Estimated Effort**: 1-2 hours
**C++ Reference**: CDGMagic_PALGlobalClip_Window.h/cpp

**Fields to Implement**:
```
PALGlobalClip Structure:
├── track (int8) - usually 0 (global, not per-channel)
├── start (int32)
├── duration (int32)
├── paletteData (768 bytes) - 256 colors × 3 bytes (RGB)
└── Events (usually none)
```

**UI Components Needed**:
- [ ] Color grid display (16×16 palette preview)
- [ ] Individual color picker per palette entry
- [ ] Palette import/export buttons
- [ ] Visual preview of palette effect

**C++ Logic to Port**:
- Palette byte unpacking (768 bytes → 256 RGB colors)
- Palette preview rendering

---

## Implementation Order (Recommended)

1. **Phase 1: BMPClip** (Week 1)
   - Event list component
   - File pickers (BMP, transition)
   - Basic preview
   - Save/load integration

2. **Phase 2: TextClip** (Week 2-3)
   - Text editor component
   - Font/color controls
   - Karaoke event system
   - Timeline scrubber for events
   - Palette selector

3. **Phase 3: ScrollClip** (Week 3)
   - Scroll editor component
   - Direction/speed controls
   - Animation preview

4. **Phase 4: PALGlobalClip** (Week 4)
   - Palette grid display
   - Color picker integration

---

## Shared Components to Create

### EventTimeline.vue
- Renders events along a timeline
- Click to select/edit event
- Drag to move event timing
- Used by: BMPClip, TextClip, ScrollClip

### FilePickerDialog.vue
- Browse cdg-projects/ directory
- Filter by file type (.bmp, .cmt, .wav)
- Preview file selection
- Used by: BMPClip, TextClip, PALGlobalClip

### ColorPaletteSelector.vue
- Display 16-color palette
- Click to select color index
- Show RGB values
- Used by: TextClip, PALGlobalClip

### PreviewCanvas.vue
- Render CD+G graphics (320×192 resolution)
- Used by: all clip types

---

## Architecture Notes

### Path Handling ✅ COMPLETE
- ✅ CMPParser stores raw paths (Windows backslashes)
- ✅ PathNormalizationFacade transforms for UI display
- ✅ EditorView.vue uses `ProjectLoader.getNormalizedProject()` for display
- ✅ `ProjectLoader.extractFileReferences()` gets raw paths for file reference panel

### File Pickers
- Must browse `cdg-projects/` directory
- Should show normalized paths (forward slashes, cdg-projects/ prefix)
- Should store raw paths in data (Windows backslashes)
- File types: *.bmp, *.cmt, *.cdg, *.wav

### Event System
- All clip types can have events (position + data)
- Events are stored sequentially in binary format
- Must preserve event order and timing for round-trip fidelity
- Events are clips-specific (BMPClip events differ from TextClip events)

---

## Testing Requirements

For each editor component:
- [ ] Parse existing .cmp file with that clip type
- [ ] Edit clip properties
- [ ] Add/remove events
- [ ] Save and reload (round-trip fidelity)
- [ ] Verify parsed data matches original binary

Sample test files:
- `sample_project_03b.cmp` - 14 clips (mix of types)
- `sample_project_04.cmp` - 8 clips (mostly BMP)

---

## File Structure (Post-Implementation)

```
src/
├── components/
│   ├── editor/
│   │   ├── BMPClipEditor.vue
│   │   ├── TextClipEditor.vue
│   │   ├── ScrollClipEditor.vue
│   │   ├── PALGlobalClipEditor.vue
│   │   └── shared/
│   │       ├── EventTimeline.vue
│   │       ├── FilePickerDialog.vue
│   │       ├── ColorPaletteSelector.vue
│   │       └── PreviewCanvas.vue
│   └── ...
├── views/
│   └── EditorView.vue (refactored to use new editors)
├── ts/
│   ├── cd+g-magic/
│   │   ├── CMPParser.ts ✅ DONE
│   │   ├── PathNormalizationFacade.ts ✅ DONE
│   │   └── ...
│   └── project/
│       └── ProjectLoader.ts ✅ DONE
└── ...
```

---

## Checklist for UI Completion

- [ ] **BMPClip Editor**
  - [ ] Event list display
  - [ ] Add event button
  - [ ] Remove event button
  - [ ] BMP file picker
  - [ ] Transition file picker
  - [ ] Fill/composite index selectors
  - [ ] Update palette checkbox
  - [ ] Save/load integration
  - [ ] Tests with sample_project_04.cmp

- [ ] **TextClip Editor**
  - [ ] Text content editor
  - [ ] Font face selector
  - [ ] Font size controls
  - [ ] Karaoke mode selector
  - [ ] Color palette selectors (FG/BG/Outline)
  - [ ] Box/frame/fill/composite selectors
  - [ ] XOR checkbox
  - [ ] Anti-alias mode selector
  - [ ] Embedded palette selector
  - [ ] Karaoke event timeline
  - [ ] Word/syllable highlighting
  - [ ] Wipe/draw/erase event types
  - [ ] Text preview with styling
  - [ ] Save/load integration
  - [ ] Tests with sample_project_03b.cmp

- [ ] **ScrollClip Editor**
  - [ ] Text content editor
  - [ ] Direction selector (4-way)
  - [ ] Speed slider
  - [ ] Animated preview
  - [ ] Save/load integration
  - [ ] Tests

- [ ] **PALGlobalClip Editor**
  - [ ] Palette grid display
  - [ ] Color pickers
  - [ ] Palette import/export
  - [ ] Save/load integration
  - [ ] Tests

---

