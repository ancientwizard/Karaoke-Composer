# Critical Bug: VRAM State Not Maintained During Scheduling

## Problem Summary

The CDG scheduler creates a persistent VRAM object but **never updates it** after writing tiles. This breaks the tile comparison optimization that's supposed to reduce file size from 11,126 packets to ~5,500.

## How the Bug Manifests

1. **VRAM Created**: Line 63 of scheduler.ts creates a persistent VRAM
2. **writeFontBlock() Called**: Line 339 calls `writeFontBlock(vram, ...)` with persistent VRAM
3. **VRAM Comparison Fails**: Inside writeFontBlock(), `blockEqualsVRAM()` compares against VRAM
4. **VRAM Never Updated**: After writing, we don't call `vram.writeBlock(blockX, blockY, pixels)`
5. **Result**: Every subsequent block is compared against VRAM still at its initial state (all zeros)
   - Tiles are never detected as duplicates
   - Every unique tile is written out in full
   - File bloats to 11,126 packets instead of ~5,500

## Secondary Bug (Line 370)

```typescript
const use = gpk && gpk.length ? gpk : writeFontBlock(new VRAM(), gev.blockX, gev.blockY, gev.pixels, 0, comp as any);
```

For group-placed packets, we create a **new VRAM** instead of using the persistent one. This means:
- Group packet encoding doesn't see the real VRAM state
- Comparisons are meaningless since it's a fresh empty VRAM
- Slightly different encoding could result if group uses 1-4 color blocks

## Root Cause Analysis

### Reference Code Behavior (CDGMagic)

From `bmp_to_fonts()` and reference code structure:
- Creates FontBlocks from BMP clips
- Each FontBlock has absolute `start_pack` timing
- When rendering, iterates through all packets 0..duration
- **At each packet, checks if any FontBlocks should render**
- **Updates VRAM after rendering each FontBlock**

### Our Code Behavior

Current scheduler:
- Creates events with blockX, blockY, pixels
- Calls writeFontBlock() to generate CDG packets
- **Never updates VRAM after successful write**
- Tile comparison optimization is completely disabled

## Impact on File Size

**With bug (current)**: 
- 11,126 tile packets generated
- Every unique tile writes in full (1-4 packets each)
- File size: ~267,024 bytes (11,126 × 24)

**With fix (expected)**:
- ~5,500 tile packets (matching reference)
- Duplicate tiles skipped via VRAM comparison
- File size: ~132,000 bytes (~50% reduction)

## Fix Implementation

### Change 1: Update VRAM After Write (Line 339-340)

```typescript
const packets: Uint8Array[] = probe && probe.length ? probe : writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
if (packets.length === 0) continue;

// UPDATE VRAM AFTER SUCCESSFUL WRITE (NEW)
if (packets.length > 0) {
  vram.writeBlock(ev.blockX, ev.blockY, ev.pixels);
}
```

### Change 2: Fix Line 370 Group Packet Generation

```typescript
// BEFORE (WRONG)
const use = gpk && gpk.length ? gpk : writeFontBlock(new VRAM(), gev.blockX, gev.blockY, gev.pixels, 0, comp as any);

// AFTER (CORRECT)
const use = gpk && gpk.length ? gpk : writeFontBlock(vram, gev.blockX, gev.blockY, gev.pixels, 0, comp as any);

// Also need to update VRAM after this write
if (use && use.length > 0) {
  vram.writeBlock(gev.blockX, gev.blockY, gev.pixels);
}
```

### Change 3: Update Probe Packet Generation (Line 294)

The probe packet generation for tracing also needs VRAM update:

```typescript
// Current code uses tmpV (temporary VRAM for probing)
(ev as any).__probePackets = writeFontBlock(tmpV, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);

// This is OK because tmpV is temporary for size estimation
// BUT: when packets are actually placed, we need to update persistent vram
```

## Testing Plan

After implementing fixes:

1. Generate CDG with same input (diag/sample_project_04.json)
2. Verify output file size is ~50% smaller (132KB vs 267KB)
3. Compare packet count: should be ~5,500 vs current 11,126
4. Verify CDG still plays correctly
5. Compare visual output with reference CDG

## Why This Matters for Karaoke

The tile comparison optimization isn't just about file size - it's critical for:
1. **Animation performance**: Skipping identical frames improves playback
2. **Bandwidth utilization**: Fewer packets means faster seeking/navigation
3. **Compatibility**: Some older CDG players have issues with oversized files
4. **Streaming**: Smaller files are more important for network transmission

## Related Code

- `src/cdg/encoder.ts`: `writeFontBlock()` - generates packets, relies on VRAM comparison
- `src/cdg/scheduler.ts`: maintains persistent VRAM but doesn't update it
- `src/cdg/utils.ts`: helper timing functions (correct)
- Reference: `CDGMagic_GraphicsEncoder.cpp` - shows how reference maintains VRAM

## END
