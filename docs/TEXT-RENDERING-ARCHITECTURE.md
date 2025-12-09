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
- **Background (BG)**: Fill color (opaque mode only, see below)
- **Outline (OL)**: Text outline color
- **Box Index**: Screen clear preset (Memory Preset), 0-15 enabled, 16+ disabled
- **Frame Index**: Border preset, 0-15 enabled, 16+ disabled
- **Fill Index**: Color for areas outside the text rectangle
- **Composite Index**: Transparent color index (when compositing enabled)
- **shouldComposite** (Comp? checkbox): Controls transparency behavior
  - 0 = opaque mode (entire clip is solid, fill with backgroundColor)
  - 1 = replacement mode (compositeIndex becomes transparent)
  - 2 = overlay mode (compositeIndex is overlaid)

## Text Rectangle Rendering - Transparency Model

✅ **IMPLEMENTED:**
1. **Opaque Mode (shouldComposite == 0)**:
   - Fill rectangle with backgroundColor
   - Text renders on solid color background
   - Entire area is opaque

2. **Compositing Mode (shouldComposite > 0)**:
   - Fill rectangle with compositeIndex (or 16 if index >= 16) to mark as transparent
   - Text renders on top of BMP background
   - No solid color bar - just text on transparent background!
   - This is the "Magic" - text appears naturally on the background image
   - Different compositing modes control how transparent color interacts with background

## Key Implementation Details

### BMP to FontBlocks Pipeline
1. Create full-screen BMP (288×216) for font rendering
2. Fill text rectangle based on compositing mode:
   - Opaque: fill with backgroundColor
   - Compositing: fill with transparent color (compositeIndex or 16)
3. Render text characters into rectangle using pre-rendered font data
4. Convert BMP to 6×12 FontBlocks using tile grid
5. Apply composite color modes to each FontBlock
6. Schedule FontBlocks with transition ordering for progressive rendering

### Composite Color Handling
- Mode 0: Opaque - solid background
- Mode 1: Replacement - compositeIndex pixels become transparent
- Mode 2: Overlay - compositeIndex overlaid on background

## Reference Materials

- C++ reference: `/reference/cd+g-magic/CDG_Magic/Source/`
  - CDGMagic_TextClip.cpp (lines 330-375 for compositing logic)
  - CDGMagic_GraphicsEncoder.cpp (lines 593-594 for transparency modes)
  - CDGMagic_BMPObject.cpp (composite handling)

- UI description: `src/components/03-textclip-dialog.txt`
  - "When deselected the entire clip is opaque"
  - "Enable Disable compositing of composit color index"
  - Shows opaque vs transparent behavior controlled by Comp? checkbox

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
✅ **Proper transparency** - text on background, not on solid bar
✅ Opaque vs transparent mode selection


