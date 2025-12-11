# TypeScript Implementation Guide: Text Rendering

Based on CD+G Magic reference implementation analysis.

## Core Concepts to Implement

### 1. Palette Index System

```typescript
interface TextRenderingColors {
  foregroundIndex: number;  // 0-15: Main text color
  backgroundIndex: number;  // 0-15: Canvas background
  outlineIndex: number;     // 0-15: Outline/shadow color
  boxIndex: number;         // 0-15: Box decoration (optional)
  frameIndex: number;       // 0-15: Frame decoration (optional)
  compositeIndex: number;   // 16 or < 256: Transparent color
}

// Typical defaults:
const defaultColors: TextRenderingColors = {
  foregroundIndex: 2,
  backgroundIndex: 0,
  outlineIndex: 1,
  boxIndex: 0,
  frameIndex: 4,
  compositeIndex: 16  // "256" in C++, but use 16 for "no transparency"
};
```

### 2. FLTK-like Rendering (Use Canvas API)

```typescript
interface TextRenderingContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  palette: Uint32Array;  // RGBA palette
  width: number;
  height: number;
}

// Since we don't have FLTK, use HTML5 Canvas
// BUT: Simulate indexed color by using palette lookups

class TextRenderer {
  private palette: Uint32Array;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(palette: Uint32Array) {
    this.palette = palette;
    // Create offscreen canvas for rendering
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Set color by palette index
  setColorByIndex(index: number): void {
    if (index >= 256) {
      // Transparent
      this.ctx.globalAlpha = 0;
      return;
    }
    if (index >= this.palette.length) {
      index = 0;  // Clamp to valid range
    }
    
    const rgba = this.palette[index];
    const r = (rgba >> 0) & 0xFF;
    const g = (rgba >> 8) & 0xFF;
    const b = (rgba >> 16) & 0xFF;
    const a = (rgba >> 24) & 0xFF;
    
    this.ctx.globalAlpha = a / 255;
    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.strokeStyle = `rgb(${r},${g},${b})`;
  }

  renderText(
    text: string,
    fontFamily: string,
    fontSize: number,
    colors: TextRenderingColors,
    width: number,
    height: number,
    options?: {
      outlineSize?: number;
      antialias?: boolean;
    }
  ): Uint8Array {
    // Setup canvas
    this.canvas.width = width;
    this.canvas.height = height;

    // Fill background
    this.setColorByIndex(colors.backgroundIndex);
    this.ctx.fillRect(0, 0, width, height);

    // Setup font
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Measure text
    const metrics = this.ctx.measureText(text);
    const x = width / 2;
    const y = height / 2;

    // Draw outline (if size > 0)
    if (options?.outlineSize && options.outlineSize > 0) {
      this.setColorByIndex(colors.outlineIndex);
      
      // Circular outline (simplified)
      const outlineSize = options.outlineSize;
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        const ox = Math.cos(rad) * outlineSize;
        const oy = Math.sin(rad) * outlineSize;
        this.ctx.fillText(text, x + ox, y + oy);
      }

      // Square outline
      for (let dx = -outlineSize; dx <= outlineSize; dx++) {
        for (let dy = -outlineSize; dy <= outlineSize; dy++) {
          if (dx === 0 && dy === 0) continue;
          this.ctx.fillText(text, x + dx, y + dy);
        }
      }
    }

    // Antialiasing (optional)
    if (options?.antialias) {
      this.setColorByIndex(colors.foregroundIndex + 1);
      this.ctx.fillText(text, x - 1, y);
      this.ctx.fillText(text, x + 1, y);
      this.ctx.fillText(text, x, y - 1);
      this.ctx.fillText(text, x, y + 1);
    }

    // Draw main text
    this.setColorByIndex(colors.foregroundIndex);
    this.ctx.fillText(text, x, y);

    // Extract pixel data
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to palette indices
    // This is the critical step: map RGB back to palette indices
    const indices = new Uint8Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Find closest palette color
      const pixelIndex = i / 4;
      indices[pixelIndex] = this.findClosestPaletteIndex(r, g, b, a);
    }

    return indices;
  }

  private findClosestPaletteIndex(
    r: number,
    g: number,
    b: number,
    a: number
  ): number {
    if (a < 128) return 256;  // Transparent

    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < Math.min(16, this.palette.length); i++) {
      const rgba = this.palette[i];
      const pr = (rgba >> 0) & 0xFF;
      const pg = (rgba >> 8) & 0xFF;
      const pb = (rgba >> 16) & 0xFF;

      // Euclidean distance in RGB space
      const distance = 
        (r - pr) ** 2 + 
        (g - pg) ** 2 + 
        (b - pb) ** 2;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }
}
```

### 3. Pixel Array to FontBlock Conversion

```typescript
interface FontBlock {
  x: number;           // Block position (0-49)
  y: number;           // Block position (0-17)
  pixels: Uint8Array;  // 72 bytes (6×12 grid of palette indices)
}

class BitmapToFontBlockConverter {
  /**
   * Convert a bitmap (palette indices) to FontBlocks
   * 
   * @param bitmap Uint8Array of palette indices
   * @param width Width in pixels (should be 288)
   * @param height Height in pixels
   * @returns Array of FontBlocks
   */
  convert(bitmap: Uint8Array, width: number, height: number): FontBlock[] {
    const blocks: FontBlock[] = [];
    
    // Iterate through 6×12 blocks
    const blockCountX = Math.ceil(width / 6);
    const blockCountY = Math.ceil(height / 12);

    for (let by = 0; by < blockCountY; by++) {
      for (let bx = 0; bx < blockCountX; bx++) {
        const block = this.extractBlock(bitmap, width, height, bx, by);
        blocks.push(block);
      }
    }

    return blocks;
  }

  private extractBlock(
    bitmap: Uint8Array,
    width: number,
    height: number,
    bx: number,
    by: number
  ): FontBlock {
    const block: FontBlock = {
      x: bx,
      y: by,
      pixels: new Uint8Array(72)  // 6×12
    };

    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < 6; px++) {
        const x = bx * 6 + px;
        const y = by * 12 + py;
        
        if (x < width && y < height) {
          const pixelIndex = y * width + x;
          block.pixels[py * 6 + px] = bitmap[pixelIndex];
        } else {
          block.pixels[py * 6 + px] = 0;  // Pad with background
        }
      }
    }

    return block;
  }
}
```

### 4. FontBlock to CD+G Packet Encoding

```typescript
interface CDGPacket {
  command: number;           // 0x0A for font block
  type: 'COPY_FONT' | 'XOR_FONT';
  x: number;                 // Block X (0-49)
  y: number;                 // Block Y (0-17)
  color0: number;            // Palette index (0-15)
  color1: number;            // Palette index (0-15)
  bitmapLines: Uint8Array;   // 12 bytes (one per row)
}

class FontBlockToPacketEncoder {
  /**
   * Encode a FontBlock into CD+G packets
   */
  encode(block: FontBlock): CDGPacket[] {
    const packets: CDGPacket[] = [];
    const colors = this.analyzeColors(block);

    if (colors.length === 1) {
      packets.push(this.encodeSingleColor(block, colors[0]));
    } else if (colors.length === 2) {
      packets.push(this.encodeTwoColors(block, colors));
    } else if (colors.length === 3) {
      packets.push(...this.encodeThreeColors(block, colors));
    } else {
      packets.push(...this.encodeFourPlusColors(block, colors));
    }

    return packets;
  }

  private analyzeColors(block: FontBlock): number[] {
    const colorCounts = new Map<number, number>();

    for (let i = 0; i < 72; i++) {
      const color = block.pixels[i];
      if (color >= 256) continue;  // Skip transparent
      
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    // Sort by frequency (most common first)
    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
  }

  private encodeSingleColor(block: FontBlock, color: number): CDGPacket {
    const packet: CDGPacket = {
      command: 0x0A,
      type: 'COPY_FONT',
      x: block.x,
      y: block.y,
      color0: color,
      color1: color,
      bitmapLines: new Uint8Array(12)
    };

    // All pixels set to 1 (all same color)
    for (let i = 0; i < 12; i++) {
      packet.bitmapLines[i] = 0x3F;  // 111111 binary
    }

    return packet;
  }

  private encodeTwoColors(block: FontBlock, colors: number[]): CDGPacket {
    const [color0, color1] = colors;

    const packet: CDGPacket = {
      command: 0x0A,
      type: 'COPY_FONT',
      x: block.x,
      y: block.y,
      color0: color0,  // Most common
      color1: color1,  // Less common
      bitmapLines: new Uint8Array(12)
    };

    // Encode bitmap: 1 bit = color1, 0 bit = color0
    for (let y = 0; y < 12; y++) {
      let line = 0;
      for (let x = 0; x < 6; x++) {
        const pixelIndex = y * 6 + x;
        const pixelColor = block.pixels[pixelIndex];
        
        if (pixelColor === color1) {
          line |= (1 << (5 - x));  // Set bit if color1
        }
      }
      packet.bitmapLines[y] = line;
    }

    return packet;
  }

  private encodeThreeColors(block: FontBlock, colors: number[]): CDGPacket[] {
    const [color0, color1, color2] = colors;

    const packets: CDGPacket[] = [];

    // First packet: COPY_FONT
    // color0 = 2nd most common, color1 = most common
    const copyPacket: CDGPacket = {
      command: 0x0A,
      type: 'COPY_FONT',
      x: block.x,
      y: block.y,
      color0: color1,  // 2nd most common
      color1: color0,  // Most common
      bitmapLines: new Uint8Array(12)
    };

    for (let y = 0; y < 12; y++) {
      let line = 0;
      for (let x = 0; x < 6; x++) {
        const pixelIndex = y * 6 + x;
        const pixelColor = block.pixels[pixelIndex];
        
        // Set bit if color0 or color2
        if (pixelColor === color0 || pixelColor === color2) {
          line |= (1 << (5 - x));
        }
      }
      copyPacket.bitmapLines[y] = line;
    }
    packets.push(copyPacket);

    // Second packet: XOR_FONT
    const xorValue = color0 ^ color2;
    const xorPacket: CDGPacket = {
      command: 0x0A,
      type: 'XOR_FONT',
      x: block.x,
      y: block.y,
      color0: 0x00,    // Always 0 for XOR
      color1: xorValue,
      bitmapLines: new Uint8Array(12)
    };

    for (let y = 0; y < 12; y++) {
      let line = 0;
      for (let x = 0; x < 6; x++) {
        const pixelIndex = y * 6 + x;
        const pixelColor = block.pixels[pixelIndex];
        
        // Set bit only if color2
        if (pixelColor === color2) {
          line |= (1 << (5 - x));
        }
      }
      xorPacket.bitmapLines[y] = line;
    }
    packets.push(xorPacket);

    return packets;
  }

  private encodeFourPlusColors(block: FontBlock, colors: number[]): CDGPacket[] {
    // Simplified: use XOR strategy for 4+ colors
    // (Full implementation would analyze bit patterns)
    // For now, fall back to 3-color encoding
    return this.encodeThreeColors(block, colors.slice(0, 3));
  }
}
```

### 5. Complete Text-to-Packets Pipeline

```typescript
class TextToPacketsPipeline {
  constructor(
    private palette: Uint32Array,
    private fontFamily: string,
    private fontSize: number
  ) {}

  /**
   * Convert text to CD+G packets
   */
  async renderText(
    text: string,
    colors: TextRenderingColors,
    options?: {
      outlineSize?: number;
      antialias?: boolean;
      canvasWidth?: number;
      canvasHeight?: number;
    }
  ): Promise<CDGPacket[]> {
    const width = options?.canvasWidth || 288;
    const height = options?.canvasHeight || 72;

    // Step 1: Render text to indexed bitmap
    const renderer = new TextRenderer(this.palette);
    const bitmap = renderer.renderText(
      text,
      this.fontFamily,
      this.fontSize,
      colors,
      width,
      height,
      options
    );

    // Step 2: Split bitmap into FontBlocks
    const converter = new BitmapToFontBlockConverter();
    const blocks = converter.convert(bitmap, width, height);

    // Step 3: Encode FontBlocks to packets
    const encoder = new FontBlockToPacketEncoder();
    const packets: CDGPacket[] = [];

    for (const block of blocks) {
      const blockPackets = encoder.encode(block);
      packets.push(...blockPackets);
    }

    return packets;
  }
}
```

### 6. Key Implementation Notes

#### Color Index Extraction
The critical step is correctly extracting palette indices from rendered pixels:

```typescript
// When rendering with FLTK (C++):
// fl_color((index << 24) | 0x00FFFFFF);
// Results in RGBA where high byte contains the index

// With Canvas API (TypeScript):
// We need to render with actual colors from palette
// Then reverse-map pixels back to indices
// Use color distance to find closest palette index
```

#### Bit Ordering
FontBlock bitmap rows are encoded with bit 5=leftmost pixel:

```
Pixel position: [0][1][2][3][4][5]
Bit position:   [5][4][3][2][1][0]

Example: Pixels [1,0,1,0,1,0] = 0b101010 = 0x2A
```

#### Transparency Handling
```typescript
// C++ uses index 256 to mean "opaque"
// TypeScript should use:
if (index >= 256) {
  // This pixel is transparent
  // Don't draw in 2-color encoding
  // Treat as background color
}
```

#### Compositing
Text clips can composite over previous layers:

```typescript
interface CompositeMode {
  mode: 'none' | 'replacement' | 'overlay';
  transparentIndex?: number;
}

// replacement: Transparent pixels don't overwrite
// overlay: Transparent pixels allow blending
```

This implementation captures the essential text rendering pipeline from the CD+G Magic reference code.
