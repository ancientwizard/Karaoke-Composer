# Developer View - Glyph Testing Playground

## Overview

The `DeveloperView.vue` component provides a real-time interactive playground for testing glyph rendering and alignment. It validates that glyphs render correctly at:
- Tile-aligned positions
- Arbitrary pixel coordinates
- With perfect pixel/tile boundary alignment

## Architecture

### Core Reusable Modules

Three modular components support both the Vue interactive playground and diagnostic scripts:

#### `src/cdg/glyph-renderer.ts`
Renders glyphs to VRAM at arbitrary pixel positions.

**Key Interface:**
```typescript
export interface GlyphData {
  width: number      // 1-6 pixels wide
  rows: number[]     // 12 rows (array of 6-bit values)
}

export function renderGlyphToVRAM(
  vram: VRAM,
  pixelX: number,
  pixelY: number,
  glyph: GlyphData,
  colorIndex: number
): GlyphRenderResult
```

**Implementation Details:**
- Glyphs are LEFT-aligned in 6-bit values
- For width W, pixels occupy bits (W-1) down to 0
- Returns statistics: pixels set, pixels out of bounds
- Validates all pixels stay within screen bounds (300×216)

#### `src/cdg/tile-extractor.ts`
Extracts 6×12 pixel tiles from VRAM and converts to CDG packet format.

**Key Functions:**
```typescript
export function extractTileFromVRAM(vram: VRAM, tileX: number, tileY: number)
export function tilePixelsToPacketRows(pixelData: number[]): number[]
```

**Implementation Details:**
- Tile coordinates map to 50×18 grid on 300×216 screen
- Extracts pixel data at tile position
- Converts to CDG packet row format (1 bit per pixel)
- Tracks pixel count for optimization

#### `src/cdg/devel/test-patterns.ts`
Diagnostic test patterns for visual validation (dev-only).

**Available Patterns:**
- `createPixelGridPattern()` - 1-pixel markers at tile boundaries
- `createBoundaryTestPattern()` - Frame at screen edges
- `createCheckerboardPattern()` - Alternating blocks
- `createRainbowPattern()` - 16-color gradient

### Vue Component Integration

`src/views/DeveloperView.vue` provides the interactive UI:

#### Playback Controls
- **Play/Pause**: Starts/stops real-time playback
- **Reset**: Returns to start, clears VRAM
- **Generate Test**: Creates test pattern with sample glyphs
- **Auto-repeat**: Checkbox to enable loop with 1.1s rest period

#### Timing System
- Respects CDG standard: **300 packets per second** (3.33ms per packet)
- Display refresh: 75 fps via `requestAnimationFrame`
- Packet index advances every 4 frames (75 fps ÷ 300 pps)
- Accurate timing for testing packet playback behavior

#### Visual Feedback
- Real-time VRAM display via `CDGCanvasDisplay`
- Current packet index tracking
- Time display (format: "0.XX s" centiseconds)
- Duration and packet count info

#### Color Palette
Uses DefaultPalette from constants.ts with conversion to CDG 4-bit format.

## Testing Workflow

### 1. Generate Test Pattern
Click "Generate Test Pattern" to:
- Create test glyphs at different positions (tile-aligned and arbitrary)
- Render to VRAM with color index 1 (yellow)
- Extract all tiles with pixels
- Queue packets for playback

### 2. Interactive Playback
- Click "Play" to start at 300 pps
- Watch glyphs appear in real-time
- Verify no shifting or alignment issues
- Pause to inspect specific packet states

### 3. Auto-repeat Testing
- Enable "Auto-repeat" checkbox
- Playback loops with 1.1s rest between cycles
- Validates consistent rendering across multiple cycles

### 4. Validation Checklist
Before considering glyph alignment proven:
- ✅ Glyphs render at correct pixel positions
- ✅ Tile boundaries align perfectly
- ✅ No pixel shifting between tile-aligned and arbitrary positions
- ✅ 100% accurate with different glyph widths
- ✅ Consistent rendering across multiple playback cycles

## Key Design Decisions

### Separation of Concerns
- **Production Code** (`src/cdg/glyph-renderer.ts`, `tile-extractor.ts`): Reusable, imported by Vue and scripts
- **Diagnostic Code** (`src/cdg/devel/test-patterns.ts`): Dev-only patterns, not shipped
- **UI Layer** (`DeveloperView.vue`): Playback timing, controls, visualization

### Packet Timing
The component does NOT generate actual CDG packets in the file format. Instead:
- Packets are queued as generic Uint8Array
- Timing is tracked separately per playback
- VRAM updates are applied at packet-rate intervals
- This allows testing playback timing without CDG format complexity

### Why This Foundation Matters

Glyph rendering is the **critical foundation** for the entire rendering pipeline. Every higher-level feature (text rendering, dynamic sizing, effects) depends on:
1. Pixel-perfect alignment
2. Tile boundary correctness
3. Consistent cross-platform behavior

As noted in project discussions: **"Simple and quick may be a well paved road to disaster."** This playground proves alignment correctness before building on top of it.

## Integration with Other Components

### CDGTextRenderer (Future)
Once glyph alignment is validated, integrate with actual font glyphs:
```typescript
// Example - not yet implemented
const fontGlyph = CDGTextRenderer.getGlyph(character)
renderGlyphToVRAM(vram, x, y, fontGlyph, colorIndex)
```

### Karaoke Timeline (Future)
Apply color leases from CDGPaletteManager:
```typescript
const colorLease = paletteManager.leaseColor(testColor, durationMs)
const glyph: GlyphData = { /* ... */ }
renderGlyphToVRAM(vram, x, y, glyph, colorLease.colorIndex)
```

## Performance Characteristics

- Glyph rendering: ~O(width × 12) per glyph
- Tile extraction: O(6 × 12) = 72 pixels per tile
- Full screen scan: O(300 × 216) = 64,800 pixels worst case
- Playback CPU: Minimal (400-500 tiles × low cost extraction)
- Display updates: 75 fps via requestAnimationFrame

## File References

- **Component**: [src/views/DeveloperView.vue](../src/views/DeveloperView.vue)
- **Glyph Renderer**: [src/cdg/glyph-renderer.ts](../src/cdg/glyph-renderer.ts)
- **Tile Extractor**: [src/cdg/tile-extractor.ts](../src/cdg/tile-extractor.ts)
- **Test Patterns**: [src/cdg/devel/test-patterns.ts](../src/cdg/devel/test-patterns.ts)
- **Constants**: [src/cdg/constants.ts](../src/cdg/constants.ts)

## VIM: set filetype=markdown :
## END
