# CRITICAL FACTS - Must Remember

## Timing Model
- **Times in JSON are PACKET-BASED, not milliseconds**
- Each clip has `start` and `duration` fields in **packet units**
- At 300 packets/second: 1 second = 300 packets
- Example: `start: 600` means packet 600 (2 seconds in), `duration: 1479` means 1479 packets long

## File Comparison
- **DO NOT compare entire CDG files** - they have different total lengths
- **ONLY compare first 42 seconds** = 12,600 packets = 302,400 bytes
  - JSON defines 42 seconds of content, rest of reference file is padding
  - Always use: `cmp -l file1 file2 | head -100` to see BYTE DIFFERENCES
  - Or: `head -c 302400 file1 > /tmp/f1_42; head -c 302400 file2 > /tmp/f2_42; cmp /tmp/f1_42 /tmp/f2_42`

## The Real Problem
- **Generated CDG starts with LOAD_COLOR packets (0x1E, 0x1F)**
- **Reference CDG starts with EMPTY packets (0x00)**
- This is why rendering is wrong - the prelude is different

## Generation Method
When you run: `npx tsx src/debug/generate-cdg-from-json.ts diag/sample_project_04.json diag/sample_project_04.cdg`

Without `--reference` flag:
1. Generator creates default init packets: LOAD_COLOR + BORDER_PRESET + MEMORY_PRESET
2. These become the prelude
3. Then font events start being placed

To match reference:
- Must use `--reference reference/cd+g-magic/Sample_Files/sample_project_04.cdg` flag
- This copies the reference's prelude (EMPTY packets) into generated file

## diag/sample_project_04_corrected2.cdg
- This file renders the bitmap correctly with mostly-right colors
- It was likely generated WITH the reference flag (has the correct prelude)
- That's why it shows the sun, sky, grass instead of magenta

## JSON Structure
```
clips[]:
  - type: "BMPClip" or "TextClip"
  - start: <packet index>  // PACKETS, not ms
  - duration: <packet count>  // PACKETS, not ms
  - events: [] // timing info within the clip
```

## What --reference Flag Does

When you use `--reference reference/cd+g-magic/Sample_Files/sample_project_04.cdg`:

1. **Copies ONLY MEMORY_PRESET packets** from the reference
   - These are screen clear/reset commands scattered at indices: 603, 604, 605... 11018
   - Total: 48 packets
   - These are CRITICAL for proper rendering

2. **Copies prelude** (the initial EMPTY packets at start)
   - Replaces the default LOAD_COLOR + BORDER + MEMORY init packets
   - This is why playback looks correct (no magenta, no column 13 artifacts)

3. **Does NOT copy tile updates**
   - We still generate our own COPY/XOR packets
   - But these are based on our scheduled events

## THE REAL PROBLEM: Multi-Color Tile Encoding + Missing Palette Loads

**Finding**: We improved palette loads (now 8 LOAD_LOW, 74 LOAD_HIGH vs 3, 2 before).
But rendering still poor with random tiles and column ~13 constant updates.

**Root cause discovered**: 
1. **Tile packets per tile**: writeFontBlock() returns 1-4 packets per tile depending on color count:
   - 1 color = 1 COPY packet
   - 2 colors = 1 COPY packet
   - 3+ colors = 1 COPY + multiple XOR packets (bitplane encoding)
   
2. **We're generating too many XOR packets**:
   - Generated: 11,253 XOR packets
   - Reference: 2,464 XOR packets (4.6x fewer)
   - This suggests our tiles have more colors than reference tiles

3. **Missing crucial palette loads**:
   - We now have 74 LOAD_HIGH but reference has 147 (2x too few)
   - We have 8 LOAD_LOW but reference has 140 (17x too few!)
   - Reference clusters palette loads at specific times (packets 2700+, 10700+, 12000)

4. **Wrong packet distribution**:
   - COPY: 781 vs 3073 (4x too few)
   - EMPTY: 467 vs 12124 (26x too few) 
   - XOR: 11253 vs 2464 (4.6x too many)

**Why column 13 updates constantly**:
- Too many palette loads means colors are changing frequently
- Wrong tile encoding (XOR instead of COPY) makes changes visible
- Combination creates flickering appearance

**Next steps**:
1. Understand why palette loads are clustered at specific times, not distributed
2. Investigate if we should generate palette loads EVERY TIME a new tile is placed
3. Check if tile color optimization is working (should reuse colors from palette)
4. Verify if EMPTY packets should be used to fill gaps when no tiles render

## Files You Need to Know
- **Reference (gospel)**: `reference/cd+g-magic/Sample_Files/sample_project_04.cdg`
- **JSON source**: `diag/sample_project_04.json`
- **Generator script**: `src/debug/generate-cdg-from-json.ts`
- **Key encoder**: `src/cdg/encoder.ts` (contains `writeFontBlock()`)
- **Key scheduler**: `src/cdg/scheduler.ts` (places packets)

## VLC Playback Truth
- When you see "column 13 constantly updating" + wrong colors = wrong prelude/palette
- When you see bitmap rendering with wrong colors but correct structure = correct CDG but palette mapping wrong
- When you see magenta = wrong init packets or wrong palette loading
