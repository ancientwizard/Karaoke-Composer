# Critical Fix: VRAM Preset Handling

## Problem
Text clips that should stack on different tracks were overwriting each other, and text after BMP transitions was not rendering.

## Root Cause
- VRAM was being pre-filled during scheduling phase (in `schedule_bmp_clip`)
- This destroyed the state from previous clips before rendering began
- `process_fontblocks_incrementally` loop had no way to properly reset VRAM between clips

## Solution
- **Removed** VRAM pre-fill from `schedule_bmp_clip` scheduling phase
- **Added** `process_scheduled_packets()` method to handle MEMORY_PRESET packets during rendering
- MEMORY_PRESET packets now properly fill VRAM when they occur in the packet stream

## Key Changes

### In `schedule_bmp_clip`:
Removed this code:
```typescript
if (this.internal_vram) {
  this.internal_vram.fill_with_color(fillColor);
}
if (this.internal_compositor) {
  this.internal_compositor.set_preset_index(fillColor);
}
```

This was pre-filling VRAM immediately, destroying clip state.

### In `process_fontblocks_incrementally`:
Added handling for scheduled packets:
```typescript
for (let current_pack = 0; current_pack < max_packet + 300; current_pack++) {
  this.process_scheduled_packets(current_pack);      // NEW
  this.process_due_fontblocks(current_pack);
  this.encode_changed_blocks_to_packets(current_pack);
}
```

### New Method `process_scheduled_packets`:
```typescript
private process_scheduled_packets(current_pack: number): void {
  // Execute MEMORY_PRESET packets to fill VRAM at the right time
  if (packet.instruction === CDGInstruction.MEMORY_PRESET) {
    const color_index = packet.payload[0];
    this.internal_vram.fill_with_color(color_index);
    this.internal_compositor.set_preset_index(color_index);
  }
}
```

## Result
- VRAM state is now preserved between clips (clips on different tracks can stack)
- MEMORY_PRESET packets reset VRAM at the proper time in the packet sequence
- Follows the C++ reference implementation and respects the .cmp file's clip ordering

## Files Modified
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts`

// END
