# Sample Project 04: Visual Playback Guide

**Purpose:** This document describes how `cdg-projects/sample_project_04.cmp` unfolds visually when played as a CD+G (.cdg) file. Use this as a reference to track rendering issues and communicate about project behavior without needing to retell the visual story.

**Status:** WIP - Add observations as you discover them

---

## Project Overview

- **File:** `cdg-projects/sample_project_04.cmp` (source, project definition)
- **Reference Output:** `reference/cd+g-magic/Sample_Files/sample_project_04.cdg` (gospel truth)
- **USER Output:** `tmp/sample_project_04.cdg` where I'vf been rendering to
- **Purpose:** Test rendering of text clips, transitions, and visual layering to report issues

---

## Visual Timeline

### Opening Scene
- **Duration:** [TBD - insert actual timing]
- **Content:** [Describe what appears on screen - colors, text, background]
- **Key Elements:**
  - [clip: BMP/Transistion layer-0]
  - [clip: text fixed postion, size etc layer-1]
  - [clip: text fixed position, size etc layer-2]
  - [clip: text fixed position, size etc layer-3]

- **Observations & Educated assumptions:**
  - the order matters, each has a time they are to start and a time when they are to be destroyed
  - there is a delay (unused period) between tome 0 and the the start of the BMP/transition
  - the layers allow the text to not only be placed "ALWAYS" on top of the background but also
    as a way to allow the background to contine to transition even within tiles where text has
    already been placed once and will again making fro a smooth transistion and neat text on
    top of it.
    (this is different from having a backgroud/bmp that isn't changing so the text only need be
     placed once without making a mess because the background is not changing. The karaoke scene
     later in the project uses only layer-0)
  - the 1st text clip is displayed;
    *ISSUE* once displayed its persistent basically forever through the scenes that follow.
    ( best guess it needs to know when it has expired and be ignored/deleted depending on best approach)
    *ISSUE* should be a bit smaller than the other two text clip sizes as defeined in the .cmp
    *ISSUE* does not have char border; I suspect we only have the char bits and the unused bit
      I should see white text(is correct); with black outline(fat-ish-is-missing);
     surrounded by the background that shows through
  - the 2nd clip is displayed;
    *ISSUE* once displayed its persistent basically forever Like text clip one.
  - the 3rd clip is displayed; there are two parts/lines both parts now display
    *ISSUE* once displayed its persistent basically forever.
  - *OBSERVERD* these fonts should be bolded. (I dont think we added support for that)

### Scene 2: Clear screen(perhaps) and play karaoke like text with highlighting
- **Duration:** 26.6 seconds (15 lines over ~2 seconds per line)
- **Clip Location:** Packet 2700 (approximately)
- **Content:** Text appears progressively with specific timing
- **Color:** Uses color 13 (dark color in project palette)

Over time plays out the following text in a karaoke like fashion
"Create real subcode graphics
playable on any standard
compliant karaoke machine
with nearly video-like
line fading effects.
Conceals the slow drawing
of a very bandwidth limited
medium by splitting lines
into separately addressable
color indices - automatically.
"

I believe the clip settings for Palette and palette selections are importent.

- **Observations & Educated assumptions:**
  - text clips from sceen 1 still being displayed   (FIXED)
  - some of the scene 1 background lingers only those parts updated with lines
    of text get replaced.  (FIXED)
  - the lyrics always play on top top of each other.. I know for certian that
    the clip/code explains when and where each line is is displayed;
    when each line is highlighted
    when each line(s) is/are cleared making room for another line
  - I don't see any text outlines
  - Later I'll explain the snow flake; ingnore it for the moment.

**Scene 2 Clip Settings from .cmp (Packet 2700, duration 7984):**
- Font: BArial, Size: 20pt
- Karaoke mode: 12 (type: "Karaoke (5/Bottom/Line-Fade)")
- Default Palette: Preset 1 ✅ **FIXED - Now using CD+G Preset 1 palette**
- Color Assignments:
  - Foreground (text): Color 2 (White)
  - Background: Color 13 (Blue-Purple: RGB(51,51,136))
  - Outline: Color 1 (Black)
  - Frame: Color 8 (Olive)
  - Box: Color 13
  - Fill: Color 16 (transparent)
  - Composite: Color 16 (transparent)
- Has 67 events (line rendering + highlighting + clearing events)

**Findings on Scene Transitions:**
- **Key Discovery:** Each successive clip on a track SHOULD start with a MEMORY_PRESET command
- This MEMORY_PRESET clears the screen/compositor, eliminating previous clips and setting a clean slate
- ✅ **FIXED** - MEMORY_PRESET now emitted for all successor clips

---

## Known Issues & Solutions

### ✅ COMPLETED FIXES

1. **Scene 1 clips persisting into Scene 2** - FIXED
   - Root cause: No clearing between successive clips on same track
   - Solution: Emit MEMORY_PRESET at start of successor clips
   - Result: Scene transitions now work correctly

2. **Scene 2 lines stacking instead of clearing** - FIXED
   - Root cause: KARAOKE_ERASE events (Word=0xFFFFFFFF) not being processed
   - Solution: Detect clearing events and render background color to line area
   - Result: 30 line clearing events now processed correctly
   - Debug output confirms: "Clearing event N: will erase line M at packet X"

3. **Wrong palette color (puke green instead of blue)** - FIXED
   - Root cause: Using default CD+G palette instead of Preset 1
   - Solution: Implemented CD+G Preset 1 palette from CDGMagic_TextClip.h
   - Result: Background color now correct blue-purple (RGB 51,51,136)

### ⚠️ REMAINING ISSUES

These issues are separate from the core rendering and require additional work:

1. **Text Outline Not Visible**
   - **Status:** Needs investigation
   - **Root Cause:** `drawCharacterWithOutline()` exists but outlines not rendering
   - **Current Code:** Lines 669-856 in CDGMagic_CDGExporter.ts
   - **Issue:** Outline logic is complex and may have edge cases
   - **Note:** This is cosmetic - text is rendering correctly without outlines

2. **Text Highlighting (KARAOKE_WIPE) Not Visible**
   - **Status:** Needs implementation
   - **Root Cause:** Events with `word=1,2,3...` are being treated as normal display events
   - **Analysis:** C++ code creates separate XOR highlight overlays for each word
   - **Current Limitation:** TypeScript implementation doesn't parse text into words or create highlight overlays
   - **Complexity:** Requires word boundary detection, XOR color calculation, and overlay BMP creation
   - **Note:** This is a significant feature - fundamental to karaoke highlighting

3. **Text Scrolling Left-to-Right on Wide Lines**
   - **Status:** Needs investigation
   - **Root Cause:** Lines wider than screen (288px) appear to scroll instead of center
   - **Expected:** Lines should center and clip at screen edges (300px)
   - **Current Code:** Centering logic in `schedule_text_clip_event()` lines 1188-1201
   - **Possible Issue:** Width calculation may be off, or font metrics may be wrong
   - **Note:** Font rendering is currently using fallback renderer which may not match CD+G dimensions exactly
- Currently, Scene 2's text clip (packet 2700) is NOT emitting a MEMORY_PRESET at its start
- **Assignment (Line 84):** Implement clip arrival detection - when a new clip arrives on track 0, emit MEMORY_PRESET at `clip.start_pack()` to clear scene 1 before rendering scene 2


### Scene 3: [Additional Phases]
- **Duration:** [TBD]
- **Content:** [Describe transitions, new elements, color changes]

---

## Known Issues & Observations

### Text Clip Persistence (OPENING SCENE BUG #1)
- **Issue:** Text clips 1, 2, and 3 persist on screen forever after rendering
- **Root Cause - Architecture Problem:** 
  - C++ uses 8-layer compositor: each clip renders to a specific z-layer (track 0-7)
  - Layer expiration: when clip duration expires, its z-layer is cleared/reset
  - TypeScript missing: No per-layer expiration or clearing mechanism
  - Each clip has `start_pack` and `duration` (end_pack = start + duration)
  - Clips write FontBlocks to compositor once, but never clear them when expired
  - Once pixels are in compositor, they persist through layer compositing
- **Critical Finding:** C++ Architecture (from reference code)
  ```cpp
  // CDGMagic_GraphicsEncoder.h shows:
  enum screen_size {
    COMP_LAYERS = 8,  // 8 layers for compositing (per-track rendering)
  }
  // Each clip renders to a z_layer (track 0-7)
  // Layer clearing happens when clip.end_pack is reached
  ```
- **Expected Behavior (from Opening Scene observation):** 
  - Clip 1: renders at start_pack, disappears at start_pack + duration
  - Clip 2: renders independently at its start, disappears at its start + duration  
  - Clip 3 (multi-part): first part disappears when its duration expires
  - **Key:** No overlap in visual persistence - each has its own lifetime
- **Status:** In Progress - Initial framework added, full fix requires layer architecture
- **Fix Strategy (Phase 1 - Already implemented):**
  1. ✅ Track clip duration in FontBlock metadata
  2. ✅ Store clip_end_pack when queueing FontBlocks
  3. ✅ Added process_clip_expirations() method to detect expirations
- **Fix Strategy (Phase 2 - Needed):**
  1. Implement per-layer block tracking: record which clip rendered each block
  2. On clip expiration: clear only blocks from that layer
  3. Use compositor's layer clearing (not full screen clear)
  4. Preserve blocks from other layers below
- **Implementation Complexity:** Medium
  - Requires tracking block ownership per layer
  - Need per-block metadata (clip_id, z_layer, expiration_pack)
  - Modify encode_changed_blocks_to_packets() to handle layer clearing
- **Code Location:** 
  - Framework: `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` 
  - Methods: schedule_text_clip, process_clip_expirations, encode_changed_blocks_to_packets
- **Evidence:** Visual tests show all three opening clips frozen on screen simultaneously instead of disappearing per their duration
- **Detailed Documentation:** See `docs/TEXT-CLIP-EXPIRATION-FIX.md` for full architecture and Phase 2 implementation plan

---

## Framework & Infrastructure (Phase 1 Complete)

**What was implemented:**
- ✅ Added clip lifetime tracking data structures (internal_clip_lifetimes)
- ✅ Modified FontBlock queue to include clip_end_pack and z_layer metadata
- ✅ Updated schedule_text_clip() to register clip lifetimes
- ✅ Modified queue_fontblocks_for_progressive_writing() to accept clip_end_pack parameters
- ✅ Added process_clip_expirations() method for detecting expiration events
- ✅ Integrated expiration checking into main packet processing loop

**Current State:**
- Code detects when clips expire (logs DEBUG messages)
- Framework in place for layer-aware clearing
- Ready for Phase 2: actual per-block clearing implementation

---

### Text Rendering After BMP Transitions
- **Issue:** Text clips don't render correctly after bitmap transitions
- **Root Cause:** Data type limitation preventing proper transparent pixel handling
- **Status:** [To be updated with fix status]
- **Evidence:** See `docs/TEXT-RENDERING-TRANSPARENCY-FIX.md`

---

## Testing Commands

### Render from .cmp to .cdg
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg
```

### Compare Against Reference
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg cdg-projects/sample_project_04.cdg
```

### Inspect Reference File
```bash
npx tsx bin/inspect-cdg.cjs --run reference/cd+g-magic/Sample_Files/sample_project_04.cdg
```

### Debug Mode
```bash
DEBUG=cdg_exporter npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp tmp/output.cdg
```

---

## Palette Information

| Color | Value | Usage | Notes |
|-------|-------|-------|-------|
| 0 | [TBD] | [Description] | |
| 13 | Dark color | Text clips | Key color in "training" section |
| [Other] | [Value] | [Description] | |

---

## Reference Files & Notes

- **JSON Source:** `diag/sample_project_04.json`
- **Related Docs:**
  - `docs/TEXT-RENDERING-TRANSPARENCY-FIX.md` - Text rendering issues
  - `docs/CPP-CODE-REVIEW-FINDINGS.md` - Initial analysis
  - `docs/REFERENCE.md` - Technical reference

---

## How to Add Observations

When you encounter a visual behavior or issue:

1. **Location:** Note the packet number or timeline position
2. **Description:** Describe what you see vs. what should happen
3. **Reproducibility:** Note if it's consistent or intermittent
4. **Status:** Mark as [To Investigate], [In Progress], [Fixed], or [Known Issue]

Example:
```
### [Issue Name]
- **Location:** Packet 3200 (30-second mark)
- **Observed:** Text appears in wrong color
- **Expected:** Should use palette color 13
- **Status:** In Progress
- **Notes:** Similar to transparency fix issue
```

---

**Last Updated:** [Add date when you update this]
**Last Reviewed:** [Add date of last review]
