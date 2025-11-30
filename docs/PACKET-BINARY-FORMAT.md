# CD+G Packet Binary Format - Quick Reference

## CD_SCPacket Structure (24 bytes)

```
┌─────────────────────────────────────────────────────────┐
│                      CD_SCPacket                        │
├─────────────────────────────────────────────────────────┤
│ Offset │ Length │ Name       │ Purpose                  │
├────────┼────────┼────────────┼──────────────────────────┤
│ 0      │ 1      │ command    │ Subcode mode (0x09)      │
│ 1      │ 1      │ instruction│ CDG command              │
│ 2-3    │ 2      │ parityQ    │ Parity Q (0x00, 0x00)    │
│ 4-19   │ 16     │ data[16]   │ Command data             │
│ 20-23  │ 4      │ parityP    │ Parity P (all 0x00)      │
└────────┴────────┴────────────┴──────────────────────────┘
```

## COPY_FONT/XOR_FONT Data Layout (bytes 4-19)

```
Byte Offset │ Content
────────────┼──────────────────────────────
4           │ Color 0 index + channel bits
5           │ Color 1 index + channel bits
6           │ Y block coordinate (0-17)
7           │ X block coordinate (0-49)
8-19        │ 12 bytes of pixel scanline data
            │   (one byte per scanline, 6 bits/byte)
```

## Pixel Scanline Encoding (bytes 8-19)

Each byte encodes 6 pixels (one scanline of a 6×12 block):

```
Bit: 7  6  5  4  3  2  1  0
     .  X0 X1 X2 X3 X4 X5
     ^  └─────────────────┘
     └─ Unused (always 0)
```

**Pixel mapping:**
- Bit 5 = leftmost pixel (X=0)
- Bit 4 = X=1
- Bit 3 = X=2
- Bit 2 = X=3
- Bit 1 = X=4
- Bit 0 = rightmost pixel (X=5)

**For COPY_FONT**:
- Bit value 0 → use Color 0
- Bit value 1 → use Color 1

**For XOR_FONT**:
- Bit value 0 → no change
- Bit value 1 → XOR with color value in data[5]

## Common Instruction Codes

```
Instruction Code │ Mode      │ Name              │ Purpose
─────────────────┼───────────┼───────────────────┼─────────────────────
0x01             │ Graphics  │ MEMORY_PRESET     │ Clear screen
0x02             │ Graphics  │ BORDER_PRESET     │ Set border color
0x06             │ Graphics  │ COPY_FONT         │ Copy 12×6 block
0x1E             │ Graphics  │ LOAD_CLUT_LO      │ Load palette 0-7
0x1F             │ Graphics  │ LOAD_CLUT_HI      │ Load palette 8-15
0x26             │ Graphics  │ XOR_FONT          │ XOR 12×6 block
0x09 (command)   │           │ TV_GRAPHICS       │ Subcode mode
```

## Channel Packing

Channels allow multi-track playback (rarely used):

```
Data[0] layout (color_one):
┌─────────────────────────────┐
│ C1 C1 C0 C0 X X X X X X X X │
└─────────────────────────────┘
  7 6 5 4 3 2 1 0 (bit positions)
  └─────┘ └───────────────────┘
  Chan    Color 0 index (0-15)

Data[1] layout (color_two):
┌───────────────────────────┐
│ X X X X C1 C0 X X X X X X │
└───────────────────────────┘
  7 6 5 4 3 2 1 0
              └─┘
              Chan bits
```

**Formula**:
- `data[0] = color_0 | ((channel << 2) & 0x30)`
- `data[1] = color_1 | ((channel << 4) & 0x30)`

## Multi-Color Block Encoding

### 1 Color (1 packet)
```
Instruction: COPY_FONT (0x06)
Color 0: [index]
Color 1: [index] (same as color 0)
Scanlines: 0x3F (binary 111111 - all pixels set)
```

### 2 Colors (1 packet)
```
Instruction: COPY_FONT (0x06)
Color 0: [prominent color]
Color 1: [less prominent color]
Scanlines: bits set where pixel == color_1
```

### 3 Colors (2 packets)
```
Packet 1 - COPY:
  Color 0: prominent_1
  Color 1: prominent_0
  Scanlines: bits set where pixel == color_1 OR color_2

Packet 2 - XOR:
  Color 0: 0x00
  Color 1: color_1 XOR color_2
  Scanlines: bits set where pixel == color_2
```

**Rendering**: 
- COPY packet shows colors 1 and 2
- XOR packet XORs only pixels that are color_2, revealing color_2

### 4+ Colors (Bitplane Decomposition)

For colors with varying bit planes:

```
For each varying bit plane (3, 2, 1, 0):
  Packet N - COPY (first) or XOR (subsequent):
    Color 0: 0x00
    Color 1: (1 << bit_plane) + common_bits
    Scanlines: bits for that bit plane
```

## Example: 4 Colors [1, 2, 4, 8]

```
Colors in binary:
  1 = 0001
  2 = 0010
  4 = 0100
  8 = 1000

Bit planes that vary:
  Bit 3: varies (1 packet)
  Bit 2: varies (1 packet)
  Bit 1: varies (1 packet)
  Bit 0: varies (1 packet)
Total: 4 packets

Each packet encodes one bit plane using XOR mode
```

## Global Command Packets

### MEMORY_PRESET (Screen Clear)

```
16 packets total:
  First 8: normal clear
  Last 8: with "CD+G MAGIC 001B" signature

Each packet:
  command: 0x09 (TV_GRAPHICS)
  instruction: 0x01 (MEMORY_PRESET)
  data[0]: color index to fill screen
  data[1]: repeat value (0-15)
  data[2-15]: signature chars (last 8 packets)
```

### LOAD_CLUT_LO/HI (Palette Load)

```
2 packets per palette update (one for colors 0-7, one for 8-15)

Each packet:
  command: 0x09 (TV_GRAPHICS)
  instruction: 0x1E (CLUT_LO) or 0x1F (CLUT_HI)
  data[0-15]: 8 palette entries, 2 bytes each
    - Each entry: 4-bit R, 4-bit G, 4-bit B (12 bits total)
    - Bit layout:
      data[n*2+0] = RRRR GGGG (bits 7-2 red, bits 1-0 green-high)
      data[n*2+1] = GGGG BBBB (bits 7-4 green-low, bits 3-0 blue)
```

## Typical Packet Statistics

```
Scenario              │ Packets/Block │ Typical Count
──────────────────────┼───────────────┼──────────────
1-color block         │ 1             │ Common
2-color block         │ 1             │ Most common
3-color block         │ 2             │ Occasional
4+ colors             │ 2-4           │ Rare
Palette load          │ 2             │ Per color change
Memory preset (clear) │ 16            │ Per screen clear
```

## Packet Ordering in Stream

```
Time (packets) →
├─ Palette packets (LOAD_CLUT_LO/HI)
├─ Border packet (BORDER_PRESET)
├─ Memory clear packets (MEMORY_PRESET × 16)
├─ Font block 1 (COPY_FONT ± XOR_FONT)
├─ Font block 2 (COPY_FONT ± XOR_FONT)
├─ Font block 3 (COPY_FONT ± XOR_FONT)
├─ ... more blocks ...
└─ Empty packets (padding to end)
```

**Scheduling**: Packets are written sequentially at positions corresponding to their `start_pack` value.

## Screen Layout (CD+G)

```
Screen: 300 × 216 pixels (50 × 18 font blocks)
Block size: 6 × 12 pixels

Block coordinates:
  Y: 0-17 (top to bottom)
  X: 0-49 (left to right)

Pixel layout within block:
  ┌────────┐
  │ 012345 │  Width: 6 pixels
  │        │  Height: 12 pixels
  │ ...... │
  │ ...... │
  │ ...... │
  │ ...... │
  └────────┘
```

## Validation Rules

```
✓ Command byte must be 0x09
✓ Instruction must be valid (0x01, 0x02, 0x06, 0x26, 0x1E, 0x1F, etc.)
✓ X block: 0-49 (0x00-0x31)
✓ Y block: 0-17 (0x00-0x11)
✓ Color indices: 0-15 (0x00-0x0F)
✓ Channel: 0-3 (after decoding)
✓ Parity bytes: 0x00 (ignored by most players)
✓ Scanlines: 0x00-0x3F (only 6 bits used)
✓ Total packet size: exactly 24 bytes
```

## File Format

```
Header: (optional - CDG format starts immediately)
Packets: Each packet is exactly 24 bytes, written sequentially
    Packet 0: bytes 0-23
    Packet 1: bytes 24-47
    Packet 2: bytes 48-71
    ...
    Packet N: bytes (N×24) to (N×24+23)

Total file size = number_of_packets × 24 bytes
```

## Example: Write Simple 2-Color Block

```
Block at (x=10, y=5)
Colors: [5, 12] (5 is background, 12 is foreground)
Pattern: checkerboard (alternating)

Packet layout:
┌─────┬──────┬──────┬──────────────┬──────────────┐
│ Cmd │ Instr│Parity│  Data (16 bytes)            │
├─────┼──────┼──────┼──────────────┼──────────────┤
│0x09 │0x06  │0,0   │5 + 0  │ 12 + 0 │ 5 │ 10 │ ...│
│     │      │      │= 0x05 │ = 0x0C │   │    │     │
├─────┴──────┴──────┼──────────────┼──────────────┤
│ data[0]=0x05      │ data[1]=0x0C │ data[2]=5    │
│ (color 0)         │ (color 1)    │ (y_block)    │
├───────────────────┼──────────────┼──────────────┤
│ data[3]=10        │ data[4-15]=checkerboard pattern
│ (x_block)         │ 0b010101 = 0x15 (per scanline)
└───────────────────┴──────────────┴──────────────┘

Scanline byte for checkerboard:
  Pixels: [B F B F B F]  (B=0 for color 0, F=1 for color 1)
  Bits:   [0 1 0 1 0 1]
  In bits 7-2 with bit 1-0 unused:
  Binary: 01 01 01 = 0b01010100 >> 2 = 0x15
```

---

**Legend**: Cmd=Command, Instr=Instruction, B=Background, F=Foreground
