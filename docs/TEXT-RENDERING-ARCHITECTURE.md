# Text Rendering Analysis - Key Findings

## Text Clip Architecture

Text clips are NOT simple full-screen rendering. Each text event defines:
- **Position**: (xOffset, yOffset) = top-left corner in pixels
- **Dimensions**: (width, height) = rectangle for text rendering (width typically 288=full, height varies by line)
- **Text content**: Actual text string

### Positioning Model

All karaoke modes use the SAME positioning model:
- **xOffset, yOffset** from CMP events are the FINAL computed positions
- NO formula-based layout needed - CMP already has the positions
- For single-event clips: all lines use the same position
- For multi-event clips: each event corresponds to one line with its own position

This greatly simplifies rendering: just read x/y from events and use directly!

## Color Settings (from CMP / UI)

Per text clip, controlled via CMP data and UI dialog:
- **Foreground (FG)**: Color of text characters
- **Background (BG)**: Fill color INSIDE the text rectangle (behind text)
- **Outline (OL)**: Text outline color
- **Box Index**: Screen clear preset (Memory Preset), 0-15 enabled, 16+ disabled
- **Frame Index**: Border preset, 0-15 enabled, 16+ disabled
- **Fill Index**: Color for areas OUTSIDE the text rectangle
- **Composite Index**: Transparent color (when compositing enabled)
- **shouldComposite**: 
  - 0 = no compositing (opaque)
  - 1 = replacement mode (composite color becomes transparent)
  - 2 = overlay mode (composite color is overlaid)

## Text Rectangle Rendering

✅ **IMPLEMENTED:**
1. Text rectangle is bounded at (xOffset, yOffset) with (width, height) dimensions
2. backgroundColor only fills the rectangle area, NOT the entire screen
3. Compositing modes (replacement/overlay) control transparency handling
4. Multi-event clips each get their own line positioning

## Key Implementation Details

### BMP to FontBlocks Pipeline
1. Create full-screen BMP (288×216) for font rendering
2. Fill ONLY the text rectangle with backgroundColor (not entire screen)
3. Render text characters into rectangle using pre-rendered font data
4. Convert BMP to 6×12 FontBlocks using tile grid
5. Apply composite color modes to each FontBlock
6. Schedule FontBlocks with transition ordering for progressive rendering

### Composite Color Handling
- Mode 0: No transparency (opaque)
- Mode 1: Replacement mode - set compositeColor pixels as transparent
- Mode 2: Overlay mode - overlay compositeColor onto background

## Reference Materials

- C++ reference: `/reference/cd+g-magic/CDG_Magic/Source/`
  - CDGMagic_TextClip.cpp (lines 341-342 for x/y offset positioning)
  - CDGMagic_GraphicsEncoder.cpp (lines 593-594 for transparency modes)
  - CDGMagic_BMPObject.cpp (composite handling)

- UI description: `src/components/03-textclip-dialog.txt`
  - Shows UI layout and control meanings
  - Explains each setting's purpose

- CMP inspection: `tmp/inspect-cmp-offsets.ts`
  - Shows actual CMP data structure with all properties per clip

## What's Left To Do

1. ⏳ Fill color for areas outside text rectangle (probably not critical)
2. ⏳ Border rendering with rounded corners (separate feature)
3. ⏳ Text outline/stroke rendering (may already be working via foregroundColor)
4. ⏳ Transition smooth reveals (investigate if working correctly)
5. ⏳ Test text clarity and readability with fonts matching reference size

## Known Working

✅ Text rectangle bounds (not full-screen)
✅ Event-based positioning (simple and correct)
✅ Composite color transparency with modes 1 & 2
✅ Multi-line text with per-line positioning
✅ Multi-event karaoke clips

