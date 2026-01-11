# CD+G Magic C++ Source Code Analysis - Complete Documentation Index

## 🚀 RECENT: BMP/Transition Pipeline Fix

### NEW DOCUMENTS (January 2026)

**Status**: ✅ Critical bug fixed - BMPs were rendering as all black

#### 1. **FIX-SUMMARY.md** - Executive Summary
- What was broken (pixel data returning empty)
- How it was fixed (added protected setter, fixed get_pixel_data)
- Test results (700/700 passing)
- Before/after comparison

#### 2. **BMP-TRANSITION-FIX.md** - Detailed Technical Analysis
- Root cause analysis of both bugs
- Data flow diagrams
- Architecture overview
- Complete code examples
- Why transitions appeared black

#### 3. **CPP-TS-BMP-COMPARISON.md** - Implementation Verification
- Side-by-side C++ vs TypeScript code
- Algorithm equivalence verification
- Data access pattern differences
- Design lessons learned

#### 4. **BMP-TRANSITION-DEBUGGING.md** - Debugging Guide
- Quick reference checklist
- 4-step verification procedures
- Common issues and solutions
- Test cases for validation
- Performance notes

#### 5. **New Test Suite**: `cdg-magic-bmp-transition.test.ts`
- 10 comprehensive tests (all passing)
- Regression test to prevent future issues
- Covers full BMP/transition pipeline
- Tests pixel storage, palette loading, FontBlock generation

**Read these first if you're debugging BMP/transition issues!**

---

## Overview

This is a comprehensive analysis of the CD+G Magic C++ implementation, extracted from the reference source code in `/reference/cd+g-magic/CDG_Magic/Source/`. The goal is to provide exact implementation details for a faithful TypeScript conversion of the packet encoding algorithm.

---

## Documents Generated

### 1. **RESEARCH-SUMMARY.md** ⭐ START HERE
**Quick navigation to all findings**
- Executive summary of research
- Key algorithm overview
- File statistics and validation checklist
- References to source code locations

**Best for**: Getting oriented, understanding scope

---

### 2. **CPP-IMPLEMENTATION-ANALYSIS.md** 🔍 DEEP DIVE
**Complete detailed analysis with code snippets**

**Sections**:
1. BMP to CD+G Conversion Pipeline
   - `bmp_to_fonts()` - Converting pixel data to FontBlocks
   - Font block structure and compositing
   
2. FontBlock Processing
   - `copy_compare_fontblock()` - VRAM comparison algorithm
   - Compositing buffer management
   - Transparency handling
   
3. Packet Creation (The Core Engine)
   - `write_fontblock()` - Decision tree for encoding strategy
   - 1-color blocks (1 packet)
   - 2-color blocks (1 packet)
   - 3-color blocks (2 packets with XOR)
   - 4+ color blocks (bitplane decomposition)
   
4. CD_SCPacket Structure
   - Exact 24-byte binary layout
   - Channel packing
   - Color index encoding
   
5. Packet Ordering & Scheduling
   - Main processing loop
   - Event queue management
   - Packet ordering priority
   
6. Global Commands
   - Palette loading (LOAD_CLUT_LO/HI)
   - Memory preset (screen clear)
   - Border color setting
   
7. File Writing
   - Binary stream access
   - Sequential packet writing
   
8. Validation Checklist

**Best for**: Understanding full algorithm, implementation reference

---

### 3. **PACKET-BINARY-FORMAT.md** 📋 QUICK REFERENCE
**Binary format specifications**

**Contents**:
- CD_SCPacket structure diagram (24 bytes)
- Data layout for COPY_FONT/XOR_FONT
- Pixel scanline encoding (6 bits per scanline)
- Common instruction codes table
- Channel packing formulas
- Multi-color encoding strategies
- Global command packet layouts
- Example: Writing a 2-color block
- Validation rules
- File format specification

**Best for**: Verifying packet correctness during implementation, debugging

---

### 4. **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** 💻 IMPLEMENTATION PATTERNS
**Complete TypeScript implementation examples**

**Sections**:
1. Core Data Structures
   - CDPacket class (24-byte buffer operations)
   - FontBlock class (pixel storage and access)
   
2. Packet Creation Functions
   - createFontBlockHeader()
   - Scanline encoding functions
   - setScanlines()
   
3. Block Encoding Strategies
   - encodeSingleColor() - 1-color blocks
   - encodeTwoColors() - 2-color blocks
   - encodeThreeColors() - 3-color blocks
   - encodeMultiColor() - 4+ colors with bitplane decomposition
   - encodeBlock() - Master selector
   - encodeXORBlock() - Karaoke highlighting
   
4. Global Command Packets
   - createMemoryPresetPackets() - Screen clear
   - createPalettePackets() - Palette loading
   
5. Stream Writing
   - CDGStream class - Packet management
   - toBuffer() / toFile() - File writing
   - fromBuffer() - File reading
   
6. Complete Encoder Example
   - CDGEncoder class - Full encoder with VRAM tracking
   - Usage example
   
7. Implementation Notes

**Best for**: Writing TypeScript code, copy-paste ready patterns

---

## Related Documents in Repository

| Document | Purpose | Relevance |
|----------|---------|-----------|
| CRITICAL-FACTS.md | Key technical facts | Decoder insights |
| DECODER-ISSUES-FOUND.md | Known decoder bugs | Edge cases to handle |
| CDG-reference.md | CD+G specification | Standard reference |
| CD+G-Magic-UML.md | Architecture diagrams | Class relationships |
| ARCHITECTURE-NOTES.md | System design | High-level structure |

---

## How to Use This Documentation

### Scenario 1: Implementing a New Encoder
1. Read **RESEARCH-SUMMARY.md** to understand scope
2. Study **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** for patterns
3. Reference **PACKET-BINARY-FORMAT.md** while coding
4. Check **CPP-IMPLEMENTATION-ANALYSIS.md** for edge cases

### Scenario 2: Debugging Packet Generation
1. Use **PACKET-BINARY-FORMAT.md** to verify binary layout
2. Check **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** for encoding logic
3. Cross-reference **CPP-IMPLEMENTATION-ANALYSIS.md** for C++ behavior

### Scenario 3: Understanding Complex Scenarios
1. Check **CPP-IMPLEMENTATION-ANALYSIS.md** Section 3.6 for bitplane decomposition
2. Verify with **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Section 3.4
3. Test against **PACKET-BINARY-FORMAT.md** Section "Example: 4 Colors"

### Scenario 4: File I/O Implementation
1. Read **CPP-IMPLEMENTATION-ANALYSIS.md** Section 8
2. Implement per **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Section 5
3. Verify with **PACKET-BINARY-FORMAT.md** Section "File Format"

---

## Key Algorithms at a Glance

### 1. BMP to Packets

```
BMP Image
  ↓
For each 6×12 block:
  - Read BMP pixels
  - Create FontBlock
  - Apply offsets
  - Store in deque
  ↓
FontBlock deque
```

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 1.2

---

### 2. FontBlock to VRAM

```
FontBlock
  ↓
Composite all 8 layers
  ↓
Apply transparency rules
  ↓
Compare with VRAM
  ↓
If different: mark for writing
```

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 2

---

### 3. FontBlock to Packets

```
FontBlock
  ↓
Analyze colors:
  1 color  → 1 COPY packet
  2 colors → 1 COPY packet
  3 colors → 1 COPY + 1 XOR packet
  4+ colors → N packets (bitplane decomposition)
  ↓
Encode scanlines (6 pixels per byte)
  ↓
CD_SCPacket array
```

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 3

---

### 4. Bitplane Decomposition (4+ colors)

```
For each varying bit plane (MSB to LSB):
  Color 0 = 0x00 (first) or prev (rest)
  Color 1 = (1 << bit_plane) | common_bits
  Instruction = COPY (first) or XOR (rest)
  
  For each pixel:
    bit = (pixel >> bit_plane) & 1
```

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 3.6
See: **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Section 3.4

---

## Exact Byte Specifications

### CD_SCPacket (24 bytes)

```
Byte 0:    Command (0x09 = TV_GRAPHICS)
Byte 1:    Instruction (0x01, 0x06, 0x26, etc.)
Bytes 2-3: Parity Q (0x00, 0x00)
Bytes 4-19: Data (16 bytes)
  Byte 4:  Color 0 | (channel << 2)
  Byte 5:  Color 1 | (channel << 4)
  Byte 6:  Y block (0-17)
  Byte 7:  X block (0-49)
  Bytes 8-19: Scanlines (12 bytes)
Bytes 20-23: Parity P (0x00, 0x00, 0x00, 0x00)
```

See: **PACKET-BINARY-FORMAT.md** "CD_SCPacket Structure"
See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 4

---

## Critical Implementation Details

### ✅ Pixel Bit Ordering
- **MSB (bit 5)** = leftmost (X=0)
- **LSB (bit 0)** = rightmost (X=5)

**Never reverse or flip this!**

See: **PACKET-BINARY-FORMAT.md** "Pixel Scanline Encoding"

---

### ✅ Color Encoding
- **For COPY_FONT**: 0 bit → color0, 1 bit → color1
- **For XOR_FONT**: 0 bit → no change, 1 bit → XOR with data[1]

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 4.3

---

### ✅ Channel Bits

Formula:
```
data[0] = color_0 | ((channel << 2) & 0x30)
data[1] = color_1 | ((channel << 4) & 0x30)
```

**Channels 0-3**, bits 5-4 of both bytes

See: **PACKET-BINARY-FORMAT.md** "Channel Packing"

---

### ✅ Packet File Layout

```
Each packet = exactly 24 bytes
Packets concatenated sequentially
No header, no footer
Total size = packet_count × 24
```

See: **PACKET-BINARY-FORMAT.md** "File Format"

---

## Color Count Decision Tree

```
num_colors = block.getUniqueColors()

if num_colors == 1:
    → encodeSingleColor() [1 packet]
elif num_colors == 2:
    → encodeTwoColors() [1 packet]
elif num_colors == 3:
    → encodeThreeColors() [2 packets]
else:  // 4 or more
    → encodeMultiColor() [1-4 packets via bitplane]
```

See: **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Section 3 "Master Encoder"

---

## Packet Type Reference

| Type | Code | Purpose | Packets |
|------|------|---------|---------|
| MEMORY_PRESET | 0x01 | Clear screen | 16 |
| BORDER_PRESET | 0x02 | Border color | 1 |
| COPY_FONT | 0x06 | 2-color block | 1-2 |
| LOAD_CLUT_LO | 0x1E | Palette 0-7 | 1 |
| LOAD_CLUT_HI | 0x1F | Palette 8-15 | 1 |
| XOR_FONT | 0x26 | XOR block | 1-3 |

See: **PACKET-BINARY-FORMAT.md** "Common Instruction Codes"

---

## Testing & Validation

### Verify Binary Layout
```
Packet bytes 0-1: Command & Instruction correct?
Packet bytes 4-7: Colors & coordinates in range?
Packet bytes 8-19: All scanlines ≤ 0x3F?
Packet size: Exactly 24 bytes?
```

See: **PACKET-BINARY-FORMAT.md** "Validation Rules"

---

### Test Cases from C++ Analysis

1. **Single color block** → All scanlines 0x3F
2. **Two color block** → Bits alternate based on pixel values
3. **Three color block** → Two packets with correct XOR value
4. **Four colors** → Four packets, one per varying bit plane

See: **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Sections 3.1-3.4

---

## Performance Considerations

### Optimizations
- Cache color frequency analysis
- Skip writing packets identical to VRAM
- Reuse fixed-size buffers
- Pre-allocate packet array

See: **CPP-IMPLEMENTATION-ANALYSIS.md** Section 8.1

---

## Source Code Cross-Reference

| Document | Source File | Lines |
|----------|------------|-------|
| **CPP-IMPLEMENTATION-ANALYSIS.md** | | |
| Section 1 | CDGMagic_GraphicsEncoder.cpp | 100-430 |
| Section 2 | CDGMagic_GraphicsEncoder.cpp | 680-850 |
| Section 3 | CDGMagic_GraphicsEncoder__write_fontblock.cpp | 1-400+ |
| Section 4 | CDGMagic_GraphicsEncoder.h | 31-141 |
| Section 5 | CDGMagic_GraphicsEncoder.cpp | 100-350 |
| Section 6 | CDGMagic_GraphicsEncoder.cpp | All |
| Section 7 | CDGMagic_Application.cpp | 20-250 |

---

## Common Pitfalls

❌ **Don't**: Reverse pixel bit order
❌ **Don't**: Use floating-point for packet indices
❌ **Don't**: Write parity calculations (leave as 0x00)
❌ **Don't**: Forget channel bits in both data[0] and data[1]
❌ **Don't**: Use wrong color encoding for XOR mode

✅ **Do**: Use bitwise operations for bit manipulation
✅ **Do**: Pre-allocate packet arrays
✅ **Do**: Compare blocks to VRAM before writing
✅ **Do**: Write packets sequentially by start_pack time
✅ **Do**: Test with sample .cdg files from reference

---

## File Organization

```
/docs/
├── RESEARCH-SUMMARY.md                    ← Start here
├── CPP-IMPLEMENTATION-ANALYSIS.md         ← Deep dive
├── PACKET-BINARY-FORMAT.md                ← Quick reference
├── TYPESCRIPT-IMPLEMENTATION-GUIDE.md     ← Implementation patterns
└── [This file: INDEX.md or README]
```

---

## Questions & Answers

**Q: How do I know which strategy to use?**
A: Count unique colors in block (excluding transparent). See **Decision Tree** above.

**Q: What's the difference between COPY and XOR?**
A: See **PACKET-BINARY-FORMAT.md** "Common Instruction Codes"

**Q: How do I handle transparency?**
A: Use special indices (0-255) to mark transparent pixels. See **CPP-IMPLEMENTATION-ANALYSIS.md** Section 2

**Q: How many packets can a block use?**
A: 1-4 packets depending on color count. See **CPP-IMPLEMENTATION-ANALYSIS.md** Section 3

**Q: What does bitplane decomposition mean?**
A: Rendering block using multiple bit planes separately. See **CPP-IMPLEMENTATION-ANALYSIS.md** Section 3.6

**Q: Where should I start coding?**
A: 1) Implement CDPacket class, 2) Implement FontBlock class, 3) Implement encoders. See **TYPESCRIPT-IMPLEMENTATION-GUIDE.md** Sections 1-3

---

## Next Steps

1. **Review** RESEARCH-SUMMARY.md (5 min read)
2. **Study** CPP-IMPLEMENTATION-ANALYSIS.md (30 min read)
3. **Reference** PACKET-BINARY-FORMAT.md (lookup as needed)
4. **Implement** using TYPESCRIPT-IMPLEMENTATION-GUIDE.md patterns
5. **Test** against existing .cdg files

---

## Version History

- **2025-11-30**: Initial analysis complete
  - CPP-IMPLEMENTATION-ANALYSIS.md created
  - PACKET-BINARY-FORMAT.md created
  - TYPESCRIPT-IMPLEMENTATION-GUIDE.md created
  - RESEARCH-SUMMARY.md created
  - This INDEX created

---

**Analysis Status**: ✅ **COMPLETE**

All major algorithms extracted and documented. Ready for TypeScript implementation.

For questions or clarifications, refer to the specific document for that topic, then cross-reference with source code lines provided.
