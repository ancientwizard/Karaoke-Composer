# TypeScript Implementation Guide - CD+G Packet Encoding

Based on C++ CD+G Magic source code analysis, this guide provides concrete patterns for implementing the same functionality in TypeScript.

---

## 1. Core Data Structures

### CD_SCPacket Class

```typescript
/**
 * 24-byte CD+G subcode packet
 * Exact layout matching C++ struct
 */
export class CDPacket {
  command: number;        // Byte 0: Mode (always 0x09)
  instruction: number;    // Byte 1: Command code
  parityQ: [number, number];  // Bytes 2-3: Parity Q (0x00, 0x00)
  data: number[];         // Bytes 4-19: Command data (16 bytes)
  parityP: [number, number, number, number];  // Bytes 20-23: (0, 0, 0, 0)

  constructor() {
    this.command = 0x09;   // TV_GRAPHICS
    this.instruction = 0x00;
    this.parityQ = [0x00, 0x00];
    this.data = new Array(16).fill(0x00);
    this.parityP = [0x00, 0x00, 0x00, 0x00];
  }

  /**
   * Convert packet to 24-byte buffer
   */
  toBuffer(): Buffer {
    const buf = Buffer.alloc(24);
    buf[0] = this.command;
    buf[1] = this.instruction;
    buf[2] = this.parityQ[0];
    buf[3] = this.parityQ[1];
    for (let i = 0; i < 16; i++) {
      buf[4 + i] = this.data[i];
    }
    buf[20] = this.parityP[0];
    buf[21] = this.parityP[1];
    buf[22] = this.parityP[2];
    buf[23] = this.parityP[3];
    return buf;
  }

  /**
   * Create packet from 24-byte buffer
   */
  static fromBuffer(buf: Buffer): CDPacket {
    const pkt = new CDPacket();
    pkt.command = buf[0];
    pkt.instruction = buf[1];
    pkt.parityQ = [buf[2], buf[3]];
    pkt.data = Array.from(buf.subarray(4, 20));
    pkt.parityP = [buf[20], buf[21], buf[22], buf[23]];
    return pkt;
  }
}

/**
 * Font block containing 6×12 pixel data
 */
export class FontBlock {
  pixels: Uint8Array;      // 6×12 = 72 bytes
  startPack: number;       // When to draw this block
  xBlock: number;          // X coordinate (0-49)
  yBlock: number;          // Y coordinate (0-17)
  zIndex: number;          // Compositing layer (0-7)
  channel: number;         // Multi-track channel (0-3)
  xorOnly: number;         // XOR mode value (0 = off, >0 = XOR color)
  replacementTransparent: number;  // Replacement transparency index
  overlayTransparent: number;      // Overlay transparency index

  constructor(x = 0, y = 0, startPack = 0) {
    this.pixels = new Uint8Array(72);
    this.startPack = startPack;
    this.xBlock = x;
    this.yBlock = y;
    this.zIndex = 0;
    this.channel = 0;
    this.xorOnly = 0;
    this.replacementTransparent = 256; // 256 = opaque
    this.overlayTransparent = 256;
  }

  /**
   * Get pixel value at (x, y) within block
   */
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= 6 || y < 0 || y >= 12) {
      console.warn(`FontBlock: pixel access out of bounds [${x}, ${y}]`);
      return 0;
    }
    return this.pixels[x + y * 6];
  }

  /**
   * Set pixel value at (x, y) within block
   */
  setPixel(x: number, y: number, value: number): void {
    if (x < 0 || x >= 6 || y < 0 || y >= 12) {
      console.warn(`FontBlock: pixel set out of bounds [${x}, ${y}]`);
      return;
    }
    this.pixels[x + y * 6] = value & 0xFF;
  }

  /**
   * Fill all pixels with same color
   */
  fill(color: number): void {
    this.pixels.fill(color & 0xFF);
  }

  /**
   * Get set of unique colors in block
   */
  getColors(): Set<number> {
    const colors = new Set<number>();
    for (let i = 0; i < 72; i++) {
      if (this.pixels[i] !== this.replacementTransparent) {
        colors.add(this.pixels[i]);
      }
    }
    return colors;
  }

  /**
   * Get color frequencies, sorted by occurrence (descending)
   */
  getProminentColors(): number[] {
    const colorFreq = new Map<number, number>();
    for (let i = 0; i < 72; i++) {
      const c = this.pixels[i];
      if (c !== this.replacementTransparent) {
        colorFreq.set(c, (colorFreq.get(c) || 0) + 1);
      }
    }

    return Array.from(colorFreq.entries())
      .sort((a, b) => b[1] - a[1])  // Sort by frequency descending
      .map(([color]) => color);
  }
}
```

---

## 2. Packet Creation Functions

### Single Packet Header Setup

```typescript
/**
 * Create packet header for font block
 * Sets command, instruction, colors, and coordinates
 */
function createFontBlockHeader(
  instruction: CDGInstruction,
  channel: number,
  xBlock: number,
  yBlock: number,
  color0: number,
  color1: number
): CDPacket {
  const pkt = new CDPacket();
  pkt.command = 0x09;        // TV_GRAPHICS
  pkt.instruction = instruction;

  // Pack colors with channel bits
  pkt.data[0] = color0 | ((channel << 2) & 0x30);  // Bits 5-4
  pkt.data[1] = color1 | ((channel << 4) & 0x30);  // Bits 5-4

  // Set coordinates
  pkt.data[2] = yBlock & 0xFF;
  pkt.data[3] = xBlock & 0xFF;

  return pkt;
}

/**
 * Instruction codes
 */
enum CDGInstruction {
  MEMORY_PRESET = 0x01,   // Clear screen
  BORDER_PRESET = 0x02,   // Set border
  COPY_FONT = 0x06,       // Copy block with 2 colors
  LOAD_CLUT_LO = 0x1E,    // Load palette 0-7
  LOAD_CLUT_HI = 0x1F,    // Load palette 8-15
  XOR_FONT = 0x26,        // XOR block with 2 colors
  SCROLL_PRESET = 0x14,   // Set scroll offset
  SCROLL_COPY = 0x18,     // Copy while scrolling
  SET_TRANSPARENT = 0x1C  // Set transparency mask
}
```

### Scanline Encoding

```typescript
/**
 * Encode 6 pixels into a single byte (one scanline)
 * Bit 5 (MSB) = leftmost pixel (X=0)
 * Bit 0 (LSB) = rightmost pixel (X=5)
 * Bit value: 0 = color0, 1 = color1
 */
function encodeScanline(
  block: FontBlock,
  yPixel: number,
  color1: number
): number {
  let byte = 0x00;
  for (let xPixel = 0; xPixel < 6; xPixel++) {
    const pixelValue = block.getPixel(xPixel, yPixel);
    // Set bit if pixel equals color1 (the less prominent color)
    const bit = pixelValue === color1 ? 1 : 0;
    byte |= (bit << (5 - xPixel));
  }
  return byte;
}

/**
 * Encode XOR scanline
 * For XOR mode, set bit where pixel != 0 (i.e., is part of the pattern)
 */
function encodeXORScanline(
  block: FontBlock,
  yPixel: number,
  matchValue: number
): number {
  let byte = 0x00;
  for (let xPixel = 0; xPixel < 6; xPixel++) {
    const pixelValue = block.getPixel(xPixel, yPixel);
    const bit = pixelValue === matchValue ? 1 : 0;
    byte |= (bit << (5 - xPixel));
  }
  return byte;
}

/**
 * Fill packet scanline bytes from font block
 */
function setScanlines(
  pkt: CDPacket,
  block: FontBlock,
  color1: number,
  encodeFunc: (block: FontBlock, y: number, color: number) => number
): void {
  for (let y = 0; y < 12; y++) {
    pkt.data[4 + y] = encodeFunc(block, y, color1);
  }
}
```

---

## 3. Block Encoding Strategies

### Strategy 1: Single Color (1 packet)

```typescript
function encodeSingleColor(
  block: FontBlock,
  channel: number
): CDPacket[] {
  const packets: CDPacket[] = [];
  const colors = Array.from(block.getColors());

  if (colors.length !== 1) {
    throw new Error('encodeSingleColor: block must have exactly 1 color');
  }

  const color = colors[0];
  const pkt = createFontBlockHeader(
    CDGInstruction.COPY_FONT,
    channel,
    block.xBlock,
    block.yBlock,
    color,
    color  // Both colors same
  );

  // All pixels on (0x3F = binary 111111)
  for (let y = 0; y < 12; y++) {
    pkt.data[4 + y] = 0x3F;
  }

  packets.push(pkt);
  return packets;
}
```

### Strategy 2: Two Colors (1 packet)

```typescript
function encodeTwoColors(
  block: FontBlock,
  channel: number
): CDPacket[] {
  const packets: CDPacket[] = [];
  const colors = block.getProminentColors();

  if (colors.length !== 2) {
    throw new Error('encodeTwoColors: block must have exactly 2 colors');
  }

  // Most prominent = background (color0)
  // Less prominent = foreground (color1)
  const color0 = colors[0];
  const color1 = colors[1];

  const pkt = createFontBlockHeader(
    CDGInstruction.COPY_FONT,
    channel,
    block.xBlock,
    block.yBlock,
    color0,
    color1
  );

  setScanlines(pkt, block, color1, encodeScanline);
  packets.push(pkt);
  return packets;
}
```

### Strategy 3: Three Colors (2 packets)

```typescript
function encodeThreeColors(
  block: FontBlock,
  channel: number
): CDPacket[] {
  const packets: CDPacket[] = [];
  const colors = block.getProminentColors();

  if (colors.length !== 3) {
    throw new Error('encodeThreeColors: block must have exactly 3 colors');
  }

  // Arrange as: color0 (most), color1 (2nd), color2 (3rd)
  const [color0, color1, color2] = colors;

  // Packet 1: COPY with colors 1 and 0
  {
    const pkt = createFontBlockHeader(
      CDGInstruction.COPY_FONT,
      channel,
      block.xBlock,
      block.yBlock,
      color1,  // Background in COPY
      color0   // Foreground in COPY
    );

    // Set bits where pixel is color0 OR color2
    for (let y = 0; y < 12; y++) {
      let byte = 0x00;
      for (let x = 0; x < 6; x++) {
        const pix = block.getPixel(x, y);
        const bit = (pix === color0 || pix === color2) ? 1 : 0;
        byte |= (bit << (5 - x));
      }
      pkt.data[4 + y] = byte;
    }
    packets.push(pkt);
  }

  // Packet 2: XOR to reveal color2
  {
    const xorValue = color0 ^ color2;
    const pkt = createFontBlockHeader(
      CDGInstruction.XOR_FONT,
      channel,
      block.xBlock,
      block.yBlock,
      0x00,      // No background for XOR
      xorValue   // XOR value
    );

    // Set bits where pixel is color2
    for (let y = 0; y < 12; y++) {
      let byte = 0x00;
      for (let x = 0; x < 6; x++) {
        const pix = block.getPixel(x, y);
        const bit = pix === color2 ? 1 : 0;
        byte |= (bit << (5 - x));
      }
      pkt.data[4 + y] = byte;
    }
    packets.push(pkt);
  }

  return packets;
}
```

### Strategy 4: Four+ Colors (Bitplane Decomposition)

```typescript
function encodeMultiColor(
  block: FontBlock,
  channel: number
): CDPacket[] {
  const packets: CDPacket[] = [];
  const colors = block.getProminentColors();

  // Calculate which bit planes vary
  let colorOr = 0;
  let colorAnd = 0xFF;
  for (const c of colors) {
    colorOr |= c;
    colorAnd &= c;
  }

  const varyingBits = colorOr ^ colorAnd;
  const commonBits = colorAnd & varyingBits;

  let isFirstPacket = true;

  // Process each bit plane from high to low
  for (let bitPlane = 3; bitPlane >= 0; bitPlane--) {
    // Skip bits that are always 0 or always 1
    if (((colorOr >> bitPlane) & 1) === 0) continue;      // Never set
    if (((colorAnd >> bitPlane) & 1) === 1) continue;     // Always set

    const color0 = 0x00;
    const color1 = (1 << bitPlane) | commonBits;
    const instruction = isFirstPacket
      ? CDGInstruction.COPY_FONT
      : CDGInstruction.XOR_FONT;

    const pkt = createFontBlockHeader(
      instruction,
      channel,
      block.xBlock,
      block.yBlock,
      color0,
      color1
    );

    // Render this bit plane
    for (let y = 0; y < 12; y++) {
      let byte = 0x00;
      for (let x = 0; x < 6; x++) {
        const pix = block.getPixel(x, y);
        const bit = (pix >> bitPlane) & 1;
        byte |= (bit << (5 - x));
      }
      pkt.data[4 + y] = byte;
    }

    packets.push(pkt);
    isFirstPacket = false;
  }

  return packets;
}
```

### Master Encoder

```typescript
/**
 * Automatically select best encoding strategy
 */
function encodeBlock(
  block: FontBlock,
  channel: number = 0
): CDPacket[] {
  const colors = block.getColors();
  const numColors = colors.size;

  if (numColors === 0) {
    console.warn('encodeBlock: block has no colors');
    return [];
  }

  if (numColors === 1) {
    return encodeSingleColor(block, channel);
  } else if (numColors === 2) {
    return encodeTwoColors(block, channel);
  } else if (numColors === 3) {
    return encodeThreeColors(block, channel);
  } else {
    // 4 or more colors - use bitplane decomposition
    return encodeMultiColor(block, channel);
  }
}

/**
 * Encode XOR-only block (karaoke highlighting)
 */
function encodeXORBlock(
  block: FontBlock,
  xorColor: number,
  channel: number = 0
): CDPacket[] {
  const pkt = createFontBlockHeader(
    CDGInstruction.XOR_FONT,
    channel,
    block.xBlock,
    block.yBlock,
    0x00,      // No color0 for XOR
    xorColor   // Color to XOR
  );

  // Set bits where pixel != 0 (pattern is set)
  for (let y = 0; y < 12; y++) {
    let byte = 0x00;
    for (let x = 0; x < 6; x++) {
      const pix = block.getPixel(x, y);
      const bit = pix > 0 ? 1 : 0;
      byte |= (bit << (5 - x));
    }
    pkt.data[4 + y] = byte;
  }

  return [pkt];
}
```

---

## 4. Global Command Packets

### Memory Preset (Screen Clear)

```typescript
function createMemoryPresetPackets(colorIndex: number): CDPacket[] {
  const packets: CDPacket[] = [];

  // Write 16 packets
  for (let repeat = 0; repeat < 16; repeat++) {
    const pkt = new CDPacket();
    pkt.command = 0x09;
    pkt.instruction = CDGInstruction.MEMORY_PRESET;
    pkt.data[0] = colorIndex & 0x0F;
    pkt.data[1] = repeat & 0x0F;

    // Add branding in last 8 packets
    if (repeat >= 8) {
      const text = 'CD+G MAGIC 001B';
      for (let i = 0; i < text.length && i < 14; i++) {
        pkt.data[2 + i] = (text.charCodeAt(i) - 0x20) & 0x3F;
      }
    }

    packets.push(pkt);
  }

  return packets;
}
```

### Palette Load

```typescript
interface RGBColor {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

function createPalettePackets(colors: RGBColor[]): CDPacket[] {
  if (colors.length < 16) {
    throw new Error('Must provide at least 16 colors');
  }

  const packets: CDPacket[] = [];

  // Two packets: one for colors 0-7, one for 8-15
  for (let loOrHi = 0; loOrHi < 2; loOrHi++) {
    const pkt = new CDPacket();
    pkt.command = 0x09;
    pkt.instruction = loOrHi === 0
      ? CDGInstruction.LOAD_CLUT_LO
      : CDGInstruction.LOAD_CLUT_HI;

    const offset = loOrHi * 8;
    for (let i = 0; i < 8; i++) {
      const idx = offset + i;
      const color = colors[idx];

      // Convert 8-bit RGB to 4-bit CD+G
      const r4 = Math.floor(color.r / 17) & 0x0F;
      const g4 = Math.floor(color.g / 17) & 0x0F;
      const b4 = Math.floor(color.b / 17) & 0x0F;

      // Pack: RRRR GGGG GGGG BBBB (12 bits across 2 bytes)
      pkt.data[i * 2 + 0] = (r4 << 2) | (g4 >> 2);
      pkt.data[i * 2 + 1] = ((g4 & 0x03) << 4) | b4;
    }

    packets.push(pkt);
  }

  return packets;
}
```

---

## 5. Stream Writing

### Packet Stream Manager

```typescript
export class CDGStream {
  packets: CDPacket[] = [];
  currentPosition: number = 0;

  /**
   * Append packets at current position
   */
  writePackets(newPackets: CDPacket[]): number {
    for (const pkt of newPackets) {
      if (this.currentPosition >= this.packets.length) {
        this.packets.push(pkt);
      } else {
        this.packets[this.currentPosition] = pkt;
      }
      this.currentPosition++;
    }
    return this.currentPosition;
  }

  /**
   * Write packets at specific position
   */
  writePacketsAt(position: number, packets: CDPacket[]): void {
    for (let i = 0; i < packets.length; i++) {
      if (position + i >= this.packets.length) {
        this.packets.push(packets[i]);
      } else {
        this.packets[position + i] = packets[i];
      }
    }
  }

  /**
   * Skip ahead to specific packet position
   */
  seekTo(position: number): void {
    this.currentPosition = position;
    // Pad with empty packets if needed
    while (this.packets.length < position) {
      this.packets.push(new CDPacket());
    }
  }

  /**
   * Get current position
   */
  tell(): number {
    return this.currentPosition;
  }

  /**
   * Get total packet count
   */
  length(): number {
    return this.packets.length;
  }

  /**
   * Write stream to binary file
   */
  toBuffer(): Buffer {
    const size = this.packets.length * 24;
    const buf = Buffer.alloc(size);
    let offset = 0;

    for (const pkt of this.packets) {
      const pktBuf = pkt.toBuffer();
      pktBuf.copy(buf, offset);
      offset += 24;
    }

    return buf;
  }

  /**
   * Write stream to file
   */
  writeToFile(path: string): void {
    const fs = require('fs');
    fs.writeFileSync(path, this.toBuffer());
  }

  /**
   * Load stream from binary buffer
   */
  static fromBuffer(buf: Buffer): CDGStream {
    const stream = new CDGStream();
    for (let i = 0; i + 24 <= buf.length; i += 24) {
      const pkt = CDPacket.fromBuffer(buf.subarray(i, i + 24));
      stream.packets.push(pkt);
    }
    return stream;
  }
}
```

---

## 6. Complete Encoder Example

```typescript
export class CDGEncoder {
  stream: CDGStream = new CDGStream();
  vram: Uint8Array;  // 300 × 216 = 64,800 bytes
  palette: RGBColor[];

  constructor(totalPackets: number = 50000) {
    this.vram = new Uint8Array(300 * 216);
    this.palette = createDefaultPalette();
    this.stream.seekTo(0);
  }

  /**
   * Add palette update
   */
  addPalette(colors: RGBColor[], packetPosition: number): void {
    this.stream.seekTo(packetPosition);
    const packets = createPalettePackets(colors);
    this.stream.writePackets(packets);
    this.palette = colors;
  }

  /**
   * Add screen clear
   */
  addScreenClear(colorIndex: number, packetPosition: number): void {
    this.stream.seekTo(packetPosition);
    const packets = createMemoryPresetPackets(colorIndex);
    this.stream.writePackets(packets);
    this.clearVram(colorIndex);
  }

  /**
   * Add font block
   */
  addBlock(block: FontBlock, packetPosition?: number): void {
    if (packetPosition !== undefined) {
      this.stream.seekTo(packetPosition);
    }

    // Skip if block is outside visible area
    if (block.xBlock < 0 || block.xBlock >= 50 ||
        block.yBlock < 0 || block.yBlock >= 18) {
      return;
    }

    // Check if block differs from VRAM
    if (!this.blockDifferentFromVram(block)) {
      return;  // No change needed
    }

    // Encode block
    const packets = encodeBlock(block, block.channel);
    this.stream.writePackets(packets);

    // Update VRAM
    this.updateVram(block);
  }

  /**
   * Helper: check if block needs redraw
   */
  private blockDifferentFromVram(block: FontBlock): boolean {
    const vramOffset = block.xBlock * 6 + block.yBlock * 12 * 300;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 6; x++) {
        const blockPix = block.getPixel(x, y);
        const vramPix = this.vram[vramOffset + x + y * 300];
        if (blockPix !== vramPix) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Helper: update VRAM with block data
   */
  private updateVram(block: FontBlock): void {
    const vramOffset = block.xBlock * 6 + block.yBlock * 12 * 300;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 6; x++) {
        const pix = block.getPixel(x, y);
        this.vram[vramOffset + x + y * 300] = pix;
      }
    }
  }

  /**
   * Helper: clear VRAM
   */
  private clearVram(colorIndex: number): void {
    this.vram.fill(colorIndex & 0x0F);
  }

  /**
   * Get final stream length
   */
  getLength(): number {
    return this.stream.length();
  }

  /**
   * Write to file
   */
  writeTo(path: string): void {
    this.stream.writeToFile(path);
  }
}

/**
 * Create default 16-color palette
 */
function createDefaultPalette(): RGBColor[] {
  // Standard CD+G palette
  return [
    { r: 0,   g: 0,   b: 0   },    // 0: Black
    { r: 0,   g: 0,   b: 255 },    // 1: Blue
    { r: 0,   g: 255, b: 0   },    // 2: Green
    { r: 0,   g: 255, b: 255 },    // 3: Cyan
    { r: 255, g: 0,   b: 0   },    // 4: Red
    { r: 255, g: 0,   b: 255 },    // 5: Magenta
    { r: 255, g: 255, b: 0   },    // 6: Yellow
    { r: 255, g: 255, b: 255 },    // 7: White
    { r: 128, g: 0,   b: 0   },    // 8: Dark Red
    { r: 0,   g: 128, b: 0   },    // 9: Dark Green
    { r: 0,   g: 0,   b: 128 },    // 10: Dark Blue
    { r: 128, g: 128, b: 0   },    // 11: Dark Yellow
    { r: 128, g: 0,   b: 128 },    // 12: Dark Magenta
    { r: 0,   g: 128, b: 128 },    // 13: Dark Cyan
    { r: 128, g: 128, b: 128 },    // 14: Gray
    { r: 192, g: 192, b: 192 }     // 15: Light Gray
  ];
}
```

---

## Usage Example

```typescript
// Create encoder
const encoder = new CDGEncoder(50000);

// Add initial palette
encoder.addPalette(createDefaultPalette(), 0);

// Add screen clear at packet 50
encoder.addScreenClear(0, 50);

// Create and add a font block
const block = new FontBlock(10, 5, 100);
block.fill(1);  // Blue background
for (let i = 0; i < 6; i++) {
  block.setPixel(i, 0, 12);  // Red top line
}
encoder.addBlock(block, 100);

// Write to file
encoder.writeTo('output.cdg');
```

---

## Notes for Implementation

1. **Transparency**: Replace index 256 with actual transparent handling
2. **Compositing**: For full C++ compatibility, implement 8-layer comp_buffer
3. **Error Checking**: Add validation for packet limits
4. **Performance**: Cache color analysis for frequently-used blocks
5. **File Format**: Always write exactly 24 bytes per packet
6. **Byte Order**: All values are stored as-is (little-endian not required for uint8)

---

**Reference**: Analysis based on CD+G Magic C++ source code (CDGMagic_GraphicsEncoder*.cpp)
