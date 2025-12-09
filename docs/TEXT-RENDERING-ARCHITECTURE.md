# Text Rendering Analysis - Key Findings

## Text Clip Architecture

Text clips are NOT simple full-screen rendering. Each text event defines:
- **Position**: (xOffset, yOffset) = top-left corner in pixels
- **Dimensions**: (width, height) = rectangle for text rendering (width typically 288=full, height varies by line)
- **Text content**: Actual text string
- **Karaoke mode**: TITLES (0), or computed layout modes (100, 12, etc.)

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

## Layout Behavior

### TITLES Mode (karaoke_mode=0)
- Computed Y position: `(line_num % lines_per_page) * line_height + top_margin`
- Uses explicit xOffset from CMP event

### Other Karaoke Modes (12, 100, etc.)
- Pattern-based layout based on mode
- May use explicit x/y or computed positioning
- Need C++ reference for each mode's specific formula

## Key Implementation Points

1. **Text rectangles are NOT full-screen**
   - Render text at (xOffset, yOffset) position
   - Rectangle size is (width, height) from event
   - backgroundColor fills inside rectangle only
   - fillColor may fill areas outside (if defined)

2. **Transparency handling**
   - compositeColor is the transparent color index
   - Only transparent if shouldComposite > 0
   - Mode 1: replacement (color becomes transparent)
   - Mode 2: overlay (color overlaid on background)

3. **Multiple color rendering**
   - Text foreground color
   - Text outline color
   - Separate colors for each element

4. **Layering / Compositing**
   - Composite clips at same time provide background colors for duets
   - Duet clips render text on top of composite backgrounds
   - This is how dual-color lyric areas work

## Reference Materials

- C++ reference: `/reference/cd+g-magic/CDG_Magic/Source/`
  - CDGMagic_TextClip.cpp (lines 341-342, 470-471 for layout)
  - CDGMagic_GraphicsEncoder.cpp (lines 593-594 for transparency)
  - CDGMagic_BMPObject.cpp (composite_index and xor_bandwidth)

- UI description: `src/components/03-textclip-dialog.txt`
  - Shows UI layout and control meanings
  - Explains each setting's purpose and behavior

- CMP inspection: `tmp/inspect-cmp-offsets.ts`
  - Shows actual CMP data structure
  - Displays all properties for each clip

## Next Steps

1. Refactor text rendering to use text rectangles at explicit (x,y) positions
2. Implement proper composite color transparency based on shouldComposite mode
3. Handle backgroundColor fill inside rectangle only (not full-screen)
4. Implement fillColor for areas outside text (if needed)
5. Test with multi-event clips and different karaoke modes
