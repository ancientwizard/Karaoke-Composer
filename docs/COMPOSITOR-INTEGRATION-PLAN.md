# Compositor Integration Plan

## Phase 1: Foundational Changes (Current)

### 1.1 CompositorBuffer Class ✓ DONE
- [x] Create CompositorBuffer with 8 layers
- [x] Implement write_pixel and read_composited_pixel
- [x] Implement block-level operations

### 1.2 FontBlock Z-Location Assignment (TODO)
When FontBlocks are created in `bmp_to_fontblocks()`:
- Need to pass clip track_options as parameter
- Set z_location from track_options.track()
- Set channel from track_options.channel()

### 1.3 CDGExporter Integration (TODO)
**Key Changes Required**:

1. Add CompositorBuffer member to CDGExporter
2. Initialize compositor in schedule_packets()
3. Modify encode_fontblocks_to_packets():
   - Change from writing directly to packets
   - Instead: write to compositor buffer
   - Extract composited results
   - Track what changed
4. Update schedule_bmp_clip() to pass track_options to bmp_to_fontblocks()

---

## Phase 2: Rendering Pipeline Changes

### 2.1 New Packet Generation Flow

**OLD FLOW** (Current):
```
FontBlock → encode → COPY_FONT/XOR_FONT packets → Schedule at specific packet
```

**NEW FLOW** (Compositor-based):
```
FontBlock → write_to_compositor(layer_z) → NO PACKET YET
  ↓
Later: read_composited_block(x, y) → get merged result
  ↓
If different from previous VRAM: encode → packets
```

### 2.2 VRAM Tracking

Need to track what's currently "on screen":
- Previous composited result (initialize to all preset_index)
- Only write packet if composited result DIFFERS

This matches C++ line 37-39 in write_fontblock():
```cpp
if ( (block_to_write->vram_only() == 0)
  && (copy_compare_fontblock(block_to_write) == 0) )  
    { return current_position; };  // Skip if identical
```

---

## Phase 3: Implementation Details

### 3.1 Modify bmp_to_fontblocks() Signature

**Current**:
```typescript
export function bmp_to_fontblocks(
  bmpData: BMPData,
  start_pack: number,
  transition?: TransitionData,
  DEBUG?: boolean
): CDGMagic_FontBlock[]
```

**New**:
```typescript
export function bmp_to_fontblocks(
  bmpData: BMPData,
  start_pack: number,
  transition?: TransitionData,
  track_options?: CDGMagic_TrackOptions,  // NEW
  DEBUG?: boolean
): CDGMagic_FontBlock[]
```

Then in loop:
```typescript
if (track_options) {
  fontblock.z_location(track_options.track());
  fontblock.channel(track_options.channel());
}
```

### 3.2 Modify schedule_bmp_clip()

**Find line**: `const fontblocks = bmp_to_fontblocks(...)`

**Change to**:
```typescript
const fontblocks = bmp_to_fontblocks(
  bmpData,
  clip.start_pack() + 19,
  transitionData,
  clip.track_options(),  // NEW: Pass track options
  CDGMagic_CDGExporter.DEBUG
);
```

### 3.3 Modify encode_fontblocks_to_packets()

This is the major change. Instead of immediately creating packets:

```typescript
private encode_fontblocks_to_packets(fontblocks: any[], start_packet: number, max_packets: number): void {
  // Write all FontBlocks to compositor
  for (const fontblock of fontblocks) {
    const z_layer = fontblock.z_location();
    const pixel_data = extract_fontblock_pixels(fontblock);  // Need helper
    this.compositor.write_block(
      fontblock.x_location(),
      fontblock.y_location(),
      z_layer,
      pixel_data
    );
  }
  
  // Now extract composited result and generate packets
  let packets_scheduled = 0;
  let packets_written = 0;
  
  for (let block_x = 0; block_x < 50; block_x++) {
    for (let block_y = 0; block_y < 18; block_y++) {
      if (packets_scheduled >= max_packets) break;
      
      // Read composited block
      const composited_block = this.compositor.read_composited_block(block_x, block_y);
      
      // Check if different from VRAM (track previous state)
      if (should_write_block(composited_block, block_x, block_y)) {
        // Encode and schedule packets
        packets_written++;
        packets_scheduled++;
      }
    }
  }
}
```

### 3.4 Add Helper Methods

```typescript
private extract_fontblock_pixels(fontblock: CDGMagic_FontBlock): Uint8Array {
  const pixels = new Uint8Array(72);
  let idx = 0;
  for (let py = 0; py < 12; py++) {
    for (let px = 0; px < 6; px++) {
      pixels[idx++] = fontblock.pixel_value(px, py);
    }
  }
  return pixels;
}

private should_write_block(block: Uint8Array, x: number, y: number): boolean {
  // Compare with previous VRAM state
  // For now: always write (until we track VRAM)
  return true;
}
```

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests for CompositorBuffer
- Test transparency handling (256 = skip)
- Test layer stacking (top layer wins)
- Test background fallback

### 4.2 Integration Tests
- Test single clip (should work as before)
- Test overlapping clips (BMPClip + TextClip)
- Test layer ordering (verify z_location respected)

### 4.3 Accuracy Testing
- Generate CDG with compositor
- Compare packets 680-739 (known overlap region)
- Should reduce mismatches in that region

---

## Phase 5: Expected Outcomes

### Success Criteria
- ✓ All existing tests still pass
- ✓ Packets in overlap region (680-739) match reference
- ✓ Accuracy improves from 75.23% toward 80%+
- ✓ No regressions in non-overlap regions

### Risk Mitigation
- Start with single clip (BMPClip only)
- Verify no change in output
- Then enable TextClip
- Then test overlap scenarios

---

## Timeline Estimate

- Phase 1.2: 10 mins (simple property assignment)
- Phase 1.3: 20 mins (add compositor to exporter)
- Phase 2-3: 45 mins (major refactoring of encode function)
- Phase 4-5: 30 mins (testing and validation)

**Total**: ~1.5 hours for first working version

---

## Key Insights from C++ Code

**From bmp_to_fonts() (line 557-558)**:
```cpp
curr_fontblock->z_location( incoming_clip->track_options()->track() );
curr_fontblock->channel( incoming_clip->track_options()->channel() );
```

This shows EXACTLY where z_location should be assigned.

**From get_composited_fontblock() (line 103-115)**:
```cpp
// Compositing in C++ happens DURING fontblock extraction
// It steps through layers 0-7 and uses top-most opaque
for (int z_loc = 0; z_loc < COMP_LAYERS; z_loc++) {
    int layer_offset = layer_span * z_loc + pixel_offset;
    if (comp_buffer[layer_offset] < 256) {
        return_block->pixel_value(x_pix, y_pix, comp_buffer[layer_offset]);
    }
}
```

This shows extraction should read from compositor.

**From write_fontblock() (line 37-39)**:
```cpp
if ( (block_to_write->vram_only() == 0)
  && (copy_compare_fontblock(block_to_write) == 0) )  
    { return current_position; };
```

This shows we only write packets if different from current screen.

---

## END

<!-- Compositor Integration Plan - Generated Session 5 -->
