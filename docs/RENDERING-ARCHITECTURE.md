# CDG Rendering Architecture - Deep Dive

## Summary of Key Findings

After analyzing reference code (`bmp_to_fonts()`, `xor_to_fonts()`, `write_fontblock()`), here's how CD+G rendering actually works:

## Data Model: FontBlock

A **FontBlock** is a 6×12 pixel tile with associated metadata:

- **Position**: `x_block` (0-49), `y_block` (0-17) - tile coordinates on 300×216 screen
- **Timing**: `start_pack` - absolute packet position (0-based)
- **Pixel data**: 72 bytes (6 pixels × 12 rows, 4 bits per pixel)
- **Metadata**:
  - `xor_only`: Boolean flag for XOR-mode highlighting (karaoke)
  - `vram_only`: Don't compare to current VRAM (optimization)
  - `channel`: Subcode channel for compositing
  - `z_location`: Layer/track for ordering

## Rendering Pipeline

### 1. Clip Processing (`bmp_to_fonts()` and `xor_to_fonts()`)

**Normal tiles** (from `bmp_to_fonts()`):
```
For each BMPObject event:
  Skip if xor_only flag is set
  For each transition block:
    Calculate start_pack = clip.start_pack + event.start_offset + draw_delay
    Create FontBlock for each 6×12 tile area
    Extract pixel data from BMP clip
    Handle compositing (replacement/overlay transparency)
```

**XOR tiles** (from `xor_to_fonts()` - karaoke highlighting):
```
For each BMPObject event:
  Skip if NOT xor_only flag
  Calculate wipe animation:
    - Duration: (event.duration) / (xor_bandwidth)
    - Determines how many packets per column
    - Creates staggered timing for wipe effect
  For each column in wipe:
    Calculate start_pack with time offset
    Create FontBlock for highlighted region
    Only include if block has meaningful colors
```

### 2. Font Block Encoding (`write_fontblock()`)

FontBlocks get encoded into CDG packets based on **number of distinct colors**:

#### 1-Color Block
- Uses **1 packet** (COPY_FONT)
- Color indices: `[color, color]` (same color for both nibbles)
- Bitmap: All `1` bits (0x3F per row)

#### 2-Color Block
- Uses **1 packet** (COPY_FONT)
- Color indices: `[prominent[0], prominent[1]]`
- Bitmap: `0` bits = color[0], `1` bits = color[1]

#### 3-Color Block
- Uses **2 packets** (COPY_FONT + XOR_FONT)
- Pack 0 (COPY): `[prominent[0], prominent[1]]`
- Pack 1 (XOR): Uses XOR to select between color[0] and color[2]
  - `color[1] ^ color[2]` determines differentiation

#### 4+ Colors
- Uses multiple XOR packs to build final color
- Complex bit-math to minimize packet count
- Analyzes color values to find optimal encoding

### 3. Optimization: `copy_compare_fontblock()`

Before writing, check if FontBlock is **identical to what's already on screen**:
- If identical and not `vram_only`, skip write (saves packets)
- If `vram_only` is set, always write (used for animations)

## Key Timing Concepts

### Event Timing in JSON
- All times are in **packet units** (300 pps), not milliseconds
- `start_offset`: Time offset within clip (packet units)
- `duration`: Length of event (packet units)
- `draw_delay`: Additional offset for rendering (packet units)

### Start Pack Calculation
```
FontBlock.start_pack = Clip.start_pack + Event.start_offset + BMP.draw_delay
```

Where:
- `Clip.start_pack`: When clip starts in global timeline (from JSON)
- `Event.start_offset`: When event starts within clip
- `BMP.draw_delay`: When BMP should render relative to event

### XOR Wipe Timing
```
col_time_adv = duration / actual_wipe_cols
FontBlock.start_pack = clip_start + event_start + (column_index * col_time_adv)
```

This creates the karaoke highlighting animation where each column lights up at slightly different times.

## Important Optimization Flags

### `xor_only` flag
- If set: This FontBlock is XOR-mode only (highlights text, doesn't change background)
- Implementation: Only outputs pixel bitmap for XOR packets, skips if no meaningful colors

### `vram_only` flag
- If set: Always write this block, even if identical to screen
- Used for: Animation frames where appearance is same but timing matters

## Compositing Modes

### `replacement_transparent_color`
- Specified color is treated as transparent
- Block overlays background without replacing it
- Implementation: Color filtering before FontBlock creation

### `overlay_transparent_color`
- Similar to replacement but different blending semantics
- Implementation: Color filtering before FontBlock creation

## Current Implementation Gap Analysis

### ✅ Implemented in our generator:
1. Normal tile rendering from BMP clips
2. Palette color encoding (fixed in Phase 1)
3. Time unit handling (packet-based, fixed in Phase 4)
4. Duration computation from timeline

### ❌ Missing in our generator:

1. **XOR-mode highlighting** (karaoke text animation)
   - `xor_to_fonts()` not implemented
   - Missing wipe animation timing logic
   - Result: No text highlighting during karaoke playback

2. **FontBlock comparison optimization** (`copy_compare_fontblock()`)
   - We write all tiles every time
   - Reference skips identical tiles
   - Result: Larger CDG file, potentially poor playback

3. **Compositing modes**
   - No replacement_transparent_color handling
   - No overlay_transparent_color handling
   - Result: Some clips may display incorrectly

4. **Channel/track compositing**
   - We don't preserve `channel` metadata
   - Reference uses for layer ordering
   - Result: Potential layering issues

5. **Animation detection** (`vram_only`)
   - We don't use this flag
   - Missing optimization opportunity

## Why Reference CDG Uses Fewer Packets (5,537 vs 11,126)

1. **Tile Comparison**: Skips writing identical tiles (saves ~30-40% packets)
2. **XOR Highlighting**: Uses 2-4 XOR packets instead of full tile rewrites (saves animation bandwidth)
3. **Efficient Color Encoding**: Uses complex bit-math to minimize packets for multi-color blocks

## Command Types in Generated Stream

The reference code uses these CDG commands:

1. **COPY_FONT** (normal tile): Replaces tile on screen
2. **XOR_FONT** (XOR mode): Applies XOR operation to highlight
3. **SCROLL_PRESET** (scroll clips): Sets scroll parameters
4. **PALETTE** (color changes): Updates palette entries
5. **LOAD_CLUT** (palette): Initial palette loading

## Next Implementation Priority

1. **Implement `FontBlock` class** - represents a 6×12 tile with metadata
2. **Implement font block comparison** - skip writing identical tiles
3. **Implement 1-4 color FontBlock encoding** - proper packet generation
4. **Implement XOR highlighting** - karaoke text animation
5. **Add compositing flags** - proper transparency handling

This would bring us from 11,126 packets to ~5,500-6,000 packets, matching reference behavior and enabling proper karaoke highlighting.

## END
