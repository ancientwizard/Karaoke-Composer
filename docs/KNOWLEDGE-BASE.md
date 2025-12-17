# CDG Composer - Knowledge Base

Complete reference for CDG implementation, architecture, and known issues.

---

## CRITICAL FACTS - Must Remember

### Timing Model
- **Times in JSON are PACKET-BASED, not milliseconds**
- Each clip has `start` and `duration` fields in **packet units**
- At 300 packets/second: 1 second = 300 packets
- Example: `start: 600` = 2 seconds in, `duration: 1479` = 4.93 seconds

### File Comparison
- **DO NOT compare entire CDG files** - they have different total lengths
- **ONLY compare first 42 seconds** = 12,600 packets = 302,400 bytes
- Use: `cmp -l file1 file2 | head -100` for byte-level diff
- Or: `head -c 302400 file1 > /tmp/f1; head -c 302400 file2 > /tmp/f2; cmp /tmp/f1 /tmp/f2`

### VLC Playback Indicators
- **Column 13 constantly updating** = wrong prelude/palette
- **Wrong colors but correct structure** = correct CDG, palette mapping wrong
- **Magenta screen** = wrong init packets or palette loading issue

---

## JSON Project Structure

```json
{
  "clips": [
    {
      "type": "BMPClip" | "TextClip",
      "start": <packet_index>,      // PACKETS, not milliseconds
      "duration": <packet_count>,   // PACKETS, not milliseconds
      "events": [ /* timing info */ ]
    }
  ]
}
```

**Critical**: All time values are in packet units. Use: `seconds * 300 = packets`

---

## CDG Packet Format

**Structure: 24 bytes total**
```
[0]      = 0x09 (CDG command code, always)
[1]      = Instruction (sub-command type)
[2-3]    = Parity Q (zero in file-based CDG)
[4-19]   = 16-byte payload (instruction-specific data)
[20-23]  = Parity P (zero in file-based CDG)
```

### Common Instructions
- `0x00` = EMPTY (no-op padding)
- `0x01` = MEMORY_PRESET (clear screen to color)
- `0x02` = BORDER_PRESET (set border color)
- `0x06` = TILE_BLOCK (COPY - direct pixel write)
- `0x07` = TILE_BLOCK_XOR (XOR - bitwise combine with existing)
- `0x1E` = LOAD_COLOR_TABLE_LOW (colors 0-7)
- `0x1F` = LOAD_COLOR_TABLE_HIGH (colors 8-15)

### Palette Encoding
- **Input**: 8-bit RGB (0-255 per channel)
- **CDG Format**: 4-bit per channel (r4/g4/b4)
- **Conversion**: Divide by 17 (255/17 ≈ 15)
- **Stored**: 12-bit value (r4 << 8 | g4 << 4 | b4)
- **Transmitted**: Two 6-bit bytes per color:
  - Byte 0: `(r4 << 2) | (g4 >> 2)`
  - Byte 1: `(b4 & 0x0F) | ((g4 & 0x03) << 4)`

---

## Generation Pipeline

### Command
```bash
npx tsx src/debug/generate-cdg-from-json.ts <input.json> <output.cdg> [--reference reference.cdg]
```

### Without `--reference` Flag
1. Generator creates default init packets: LOAD_COLOR + BORDER_PRESET + MEMORY_PRESET
2. These become the prelude (first packets in file)
3. Font events start being placed

### With `--reference` Flag
1. **Copies MEMORY_PRESET packets** from reference (48 total, scattered at indices: 603-11018)
2. **Copies prelude** (initial EMPTY packets instead of LOAD_COLOR init)
3. **Does NOT copy tile updates** (we still generate our own COPY/XOR)

**Result**: Correct rendering because prelude matches reference structure

### Key Files
- **Reference (gospel)**: `reference/cd+g-magic/Sample_Files/sample_project_04.cdg`
- **JSON source**: `diag/sample_project_04.json`
- **Generator**: `src/debug/generate-cdg-from-json.ts`
- **Encoder**: `src/cdg/encoder.ts` (contains `writeFontBlock()`)
- **Scheduler**: `src/cdg/scheduler.ts` (places packets on timeline)

---

## Current Implementation Status

### ✅ Working
- **Font system**: 85+ glyphs (A-Z, a-z, 0-9, punctuation)
- **Font Debug Dialog**: Interactive Vue component for glyph visualization
- **Palette loading**: Correct CDG encoding (8-bit RGB → 4-bit/channel)
- **Basic COPY packets**: Direct tile writes working
- **Basic XOR packets**: Bitwise tile operations working
- **VRAM state tracking**: 47% packet reduction vs. initial implementation

### ⚠️ Partial
- **Palette scheduler**: Loads generate but may not cluster optimally
- **Tile encoding**: Works but XOR count differs from reference (4.6x too many)

### ❌ Missing/Broken
- **Screen reset timing**: MEMORY_PRESET packets not clustered at critical times
- **SCROLL_COPY command**: Not implemented (affects scroll preset effects)
- **Compositing modes**: Basic handling only (replacement_transparent_color, overlay_transparent_color)
- **Multi-color optimization**: vram_only flag not used
- **Karaoke highlighting**: XOR-based text animation not generating (2,464 XOR packets missing)

---

## Architecture Overview

### CDGFont (Glyph System)
- **File**: `src/karaoke/renderers/cdg/CDGFont.ts`
- **Purpose**: Manages character glyphs (bitmaps) for text rendering
- **Structure**: Map<string, CDGGlyph> where each glyph is 12-row bitmap
- **Supported**: 85+ characters (uppercase, lowercase, digits, punctuation)

### GeneratorByFunction (Event Scheduling)
- **File**: `src/cdg/scheduler.ts`
- **Purpose**: Converts events to CDG packets on a timeline
- **Key function**: Maintains VRAM state for tile comparison optimization
- **Output**: CDGPacket array in chronological order

### CDGFont Rendering (writeFontBlock)
- **File**: `src/cdg/encoder.ts`
- **Purpose**: Encodes text/bitmap tiles into CDG packets
- **Logic**: 
  - 1 color → 1 COPY packet
  - 2 colors → 1 COPY packet
  - 3+ colors → 1 COPY + multiple XOR packets (bitplane encoding)
- **Optimization**: Uses VRAM to skip redundant tile writes

---

## Known Issues & Debugging

### Issue: Developer Toolbar Not Visible
- **Symptoms**: Bottom-of-page developer tools disappeared
- **Cause**: `showDevToolbar` state toggled off
- **Fix**: Hard refresh (Ctrl+Shift+R) or check browser console
- **Code**: [ComposeView.vue](src/views/ComposeView.vue) line 289 - state initialized to `true`

### Issue: Wrong Tile Encoding (Too Many XOR)
- **Generated**: 11,253 XOR packets
- **Reference**: 2,464 XOR packets (4.6x fewer)
- **Cause**: Tiles have more colors than reference implementation
- **Status**: Under investigation - may be palette reuse issue

### Issue: Palette Loads Not Clustered
- **Generated**: 8 LOAD_LOW, 74 LOAD_HIGH distributed throughout
- **Reference**: 140 LOAD_LOW, 147 LOAD_HIGH clustered at specific times
- **Impact**: Colors may not load in time for tile rendering
- **Solution**: Investigate palette load scheduling algorithm

### Issue: Missing MEMORY_PRESET Packets
- **Reference has**: 48 packets scattered (screen clear commands)
- **We generate**: 0 or minimal
- **Impact**: Display doesn't reset between sections, causes corruption
- **Solution**: Inject MEMORY_PRESET at clip boundaries

---

## Reference Implementation Notes

### CD+G Magic Reference
- **Location**: `reference/cd+g-magic/Sample_Files/`
- **Key files**: 
  - `sample_project_04.cdg` - working reference
  - CDGMagic_CDGExporter.ts - encoding logic
  - __write_fontblock.cpp - tile encoding details

### Packet Statistics (First 42 Seconds)
| Type | Generated | Reference | Ratio |
|------|-----------|-----------|-------|
| EMPTY | 467 | 12,124 | -96.2% (TOO FEW) |
| COPY | 781 | 3,073 | -74.6% (TOO FEW) |
| XOR | 11,253 | 2,464 | +356.8% (TOO MANY) |
| MEMORY_PRESET | 0 | 48 | MISSING |
| PALETTE_LOW | 8 | 140 | -94.3% (TOO FEW) |
| PALETTE_HIGH | 74 | 147 | -49.7% (TOO FEW) |

---

## Development Setup

### Python Environment
- Configured via `configure_python_environment`
- Used for: analysis scripts, packet inspection

### Testing
- **Test files**: `src/tests/*.test.ts`
- **Run**: `npm test`
- **Coverage**: `npm test -- --coverage`

### Building
- **Command**: `npm run build`
- **Output**: `dist/`
- **Framework**: Vite + Vue 3 + TypeScript

### CDG Generation (Debug)
```bash
# Generate without reference (will have init prelude)
npx tsx src/debug/generate-cdg-from-json.ts diag/sample_project_04.json /tmp/test.cdg

# Generate with reference prelude (correct rendering)
npx tsx src/debug/generate-cdg-from-json.ts diag/sample_project_04.json /tmp/test.cdg \
  --reference reference/cd+g-magic/Sample_Files/sample_project_04.cdg
```

---

## Next Steps (Priority Order)

### Phase 7 (High Priority)
1. **Fix MEMORY_PRESET injection** - Add screen clear packets at clip boundaries
2. **Optimize palette load clustering** - Group palette loads at critical times
3. **Investigate XOR reduction** - Why are we generating 4.6x more XOR packets?

### Phase 8 (Medium Priority)
1. Implement SCROLL_COPY command
2. Add missing compositing modes
3. Generate karaoke highlighting (2,464 XOR packets)

### Phase 9 (Low Priority)
1. Performance optimization (vram_only flag)
2. Support for more animation types
3. Stream-based generation (for very large files)

---

## Useful Commands

### Packet Analysis
```bash
# Count packet types in CDG file
hexdump -C file.cdg | grep "09 01" | wc -l  # MEMORY_PRESET
hexdump -C file.cdg | grep "09 06" | wc -l  # TILE_BLOCK (COPY)
hexdump -C file.cdg | grep "09 07" | wc -l  # TILE_BLOCK_XOR

# Generate and compare
npx tsx src/debug/generate-cdg-from-json.ts diag/sample_project_04.json /tmp/gen.cdg --reference reference/cd+g-magic/Sample_Files/sample_project_04.cdg
head -c 302400 /tmp/gen.cdg > /tmp/gen_42
head -c 302400 reference/cd+g-magic/Sample_Files/sample_project_04.cdg > /tmp/ref_42
cmp /tmp/gen_42 /tmp/ref_42
```

### File Inspection
```bash
# Check file size and first packets
ls -lh file.cdg
hexdump -C file.cdg | head -20

# VLC playback
vlc file.cdg
```

---

## Documentation Philosophy

- **Keep it accurate**: Outdated docs are worse than no docs
- **Update on discovery**: When you learn something new, update here
- **Remove duplicates**: Consolidate scattered notes into this file
- **Link to code**: Reference actual implementation locations

---

## Last Updated
- **Font System**: Complete (85+ glyphs working)
- **Palette Encoding**: Fixed (correct RGB→CDG conversion)
- **VRAM Tracking**: Complete (47% packet reduction achieved)
- **Known Issues**: As listed above
- **Outstanding**: Palette load clustering, MEMORY_PRESET injection, XOR optimization

---

## END
