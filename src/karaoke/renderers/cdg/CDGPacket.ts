/**
 * CDG Packet Structure and Commands
 *
 * CDG (Compact Disc + Graphics) Format Specifications:
 * - 24 bytes per packet
 * - 300 packets per second (used as file playback baseline in this project)
 * - Packet structure: Command (1 byte) + Instruction (1 byte) + Data (16 bytes) + Parity (4 bytes)
 */

/**
 * CDG Command codes (first byte of packet)
 */
export enum CDGCommand {
  CDG_MEMORY_PRESET = 0x01,            // Clear screen with color
  CDG_BORDER_PRESET = 0x02,            // Set border to color
  CDG_TILE_BLOCK = 0x06,               // Draw tile block (normal)
  CDG_SCROLL_PRESET = 0x14,            // Scroll screen
  CDG_SCROLL_COPY = 0x18,              // Scroll screen with copy
  CDG_DEFINE_TRANSPARENT = 0x1C,       // Define transparent color
  CDG_LOAD_COLOR_TABLE_LOW = 0x1E,     // Load color table (colors 0-7)
  CDG_LOAD_COLOR_TABLE_HIGH = 0x1F,    // Load color table (colors 8-15)
  CDG_TILE_BLOCK_XOR = 0x26            // Draw tile block (XOR mode)
}

/**
 * CDG Screen dimensions
 */
export const CDG_SCREEN = {
  WIDTH: 300,          // Total width in pixels
  HEIGHT: 216,         // Total height in pixels
  TILE_WIDTH: 6,       // Tile width in pixels
  TILE_HEIGHT: 12,     // Tile height in pixels
  COLS: 50,            // Number of tile columns (300 / 6)
  ROWS: 18,            // Number of tile rows (216 / 12)
  BORDER_WIDTH: 6,     // Border tiles on each side
  BORDER_HEIGHT: 12,   // Border tiles on top/bottom
  VISIBLE_COLS: 48,    // Visible columns (excluding borders)
  VISIBLE_ROWS: 16,    // Visible rows (excluding borders)
  PACKETS_PER_SECOND: 300 // CDG timing baseline for file playback in this project
} as const

/**
 * Single CDG packet (24 bytes)
 * 
 * Correct packet structure (per CD+G Magic reference):
 * [0] = 0x09 (CDG command code - always 0x09 for TV Graphics)
 * [1] = instruction (sub-command: COPY_FONT, XOR_FONT, LOAD_LOW, etc.)
 * [2-3] = Parity Q (typically 0 in file-based CDG)
 * [4-19] = 16-byte payload (instruction-specific data)
 * [20-23] = Parity P (typically 0 in file-based CDG)
 */
export class CDGPacket {
  private buffer: Uint8Array

  constructor() {
    this.buffer = new Uint8Array(24)
    // Initialize packet structure
    this.buffer[0] = 0x09  // CDG command code (always 0x09 for TV Graphics mode)
    // Rest is zero-initialized by default
  }

  /**
   * Set instruction (command) byte at [1]
   * The instruction parameter is the CDG sub-command (COPY_FONT, XOR_FONT, LOAD_LOW, LOAD_HIGH, etc.)
   * Note: In CDG packets, byte [1] contains the instruction, and byte [2-3] are parity Q
   */
  setCommand(command: CDGCommand, instruction: number = 0): void {
    this.buffer[1] = command & 0x3F  // Instruction at [1] (mask to 6 bits)
    // buffer[2-3] are parity Q, left as zero
  }

  /**
   * Set data bytes (16 bytes)
   * Data is placed at buffer[4..19] per CD+G packet structure
   * Note: Palette data bytes are 6-bit, but pixel tile data is 8-bit (2 pixels per byte).
   * We do NOT mask here; instructions should provide properly formatted data.
   */
  setData(data: number[]): void {
    for (let i = 0; i < 16; i++) {
      this.buffer[4 + i] = (i < data.length ? data[i] : 0)  // Data at [4..19]
    }
  }

  /**
   * Set parity bytes
   * Parity Q (buffer[2-3]) and Parity P (buffer[20-23]) are typically left as zeros in file-based CDG.
   * CD+G Magic does the same, and file-based players ignore parity.
   */
  setParity(): void {
    // Leave parity bytes as zero (standard practice in .cdg files)
    // buffer[2-3] = parity Q (already zero from constructor)
    // buffer[20-23] = parity P (set to zero)
    this.buffer[2] = 0
    this.buffer[3] = 0
    this.buffer[20] = 0
    this.buffer[21] = 0
    this.buffer[22] = 0
    this.buffer[23] = 0
  }

  /**
   * Get the complete packet as Buffer
   */
  toBuffer(): Buffer {
    this.setParity()
    // Return as Uint8Array-compatible buffer. In Node consumers this can be wrapped with Buffer.from(...)
    return this.buffer as unknown as Buffer
  }

  /**
   * Create memory preset packet (clear screen)
   */
  static memoryPreset(color: number, repeat: number = 0): CDGPacket {
    const packet = new CDGPacket()
    packet.setCommand(CDGCommand.CDG_MEMORY_PRESET)
    packet.setData([
      color & 0x0F,  // Color index (0-15)
      repeat & 0x0F  // Repeat count
    ])
    return packet
  }

  /**
   * Create border preset packet (set border color)
   */
  static borderPreset(color: number): CDGPacket {
    const packet = new CDGPacket()
    packet.setCommand(CDGCommand.CDG_BORDER_PRESET)
    packet.setData([color & 0x0F])
    return packet
  }

  /**
   * Create tile block packet (draw 6x12 tile)
   */
  static tileBlock(
    color0: number,
    color1: number,
    row: number,
    col: number,
    pixels: number[],
    xor: boolean = false
  ): CDGPacket {
    const packet = new CDGPacket()
    packet.setCommand(
      xor ? CDGCommand.CDG_TILE_BLOCK_XOR : CDGCommand.CDG_TILE_BLOCK
    )

    // Pack tile data
    const data = [
      color0 & 0x0F,     // Color 0 (background)
      color1 & 0x0F,     // Color 1 (foreground)
      row & 0x1F,        // Row (0-17)
      col & 0x3F,        // Column (0-49)
      ...pixels.slice(0, 12)  // 12 bytes of pixel data
    ]

    packet.setData(data)
    return packet
  }

  /**
   * Create load color table packet (set palette colors)
   */
  static loadColorTable(
    colors: number[],
    high: boolean = false
  ): CDGPacket {
    const packet = new CDGPacket()
    packet.setCommand(
      high ? CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH : CDGCommand.CDG_LOAD_COLOR_TABLE_LOW
    )

    // Pack 8 colors using the same packing as the reference encoder.
    // Each color is provided in 12-bit form (r4/g4/b4). We pack two 6-bit data bytes per color as:
    // data[pal_inc*2+0] = (r4 << 2) | (g4 >> 2)
    // data[pal_inc*2+1] = ((g4 & 0x03) << 4) | b4
    const data: number[] = new Array(16).fill(0)
    for (let pal_inc = 0; pal_inc < 8; pal_inc++) {
      const color = colors[pal_inc] || 0
      const r4 = (color >> 8) & 0x0F
      const g4 = (color >> 4) & 0x0F
      const b4 = color & 0x0F

      const byte1 = (r4 << 2) | (g4 >> 2)
      const byte2 = ((g4 & 0x03) << 4) | b4

      // console.log('CDGPacket: B1:', byte1.toString(2).padStart(8, '0'), ' B2:', byte2.toString(2).padStart(8, '0'))

      data[pal_inc * 2 + 0] = byte1; // ((r4 & 0x0F) << 2) | ((g4 & 0x0F) >> 2)
      data[pal_inc * 2 + 1] = byte2; //(((g4 & 0x03) << 4) | (b4 & 0x0F)) & 0x3F

      // SWAP GREEN to test for encoding issue I'm seeing
      // data[pal_inc * 2 + 0] = ((r4 & 0x0F) << 2) | ((g4 & 0x03) << 4)
      // data[pal_inc * 2 + 1] = (((g4 & 0x02) >> 2) | (b4 & 0x0F)) & 0x3F
    }

    packet.setData(data)
    return packet
  }

  /**
   * Create empty packet (used for timing/padding)
   */
  static empty(): CDGPacket {
    return new CDGPacket()
  }
}

/**
 * CDG Color Palette
 *
 * Converts RGB colors to CDG 12-bit format
 * CDG uses 4 bits per channel: [R3 R2 R1 R0 G3 G2 G1 G0 B3 B2 B1 B0]
 */
export class CDGPalette {
  private colors: number[] = []

  constructor() {
    // Initialize with default karaoke palette
    this.setDefaultPalette()
  }

  /**
   * Set default karaoke color palette
   */
  setDefaultPalette(): void {
    this.colors = [
      this.rgbToCDG(0, 0, 0),        // 0: Black (background)
      this.rgbToCDG(255, 255, 0),    // 1: Yellow (active text)
      this.rgbToCDG(200, 200, 200),  // 2: Light gray (transition text)
      this.rgbToCDG(255, 255, 255),  // 3: White (bright text)
      this.rgbToCDG(0, 0, 128),      // 4: Dark blue
      this.rgbToCDG(0, 128, 255),    // 5: Light blue
      this.rgbToCDG(128, 128, 128),  // 6: Medium gray
      this.rgbToCDG(64, 64, 64),     // 7: Dark gray
      this.rgbToCDG(255, 0, 0),      // 8: Red
      this.rgbToCDG(0, 255, 0),      // 9: Green
      this.rgbToCDG(0, 0, 255),      // 10: Blue
      this.rgbToCDG(255, 0, 255),    // 11: Magenta
      this.rgbToCDG(0, 255, 255),    // 12: Cyan
      this.rgbToCDG(255, 128, 0),    // 13: Orange
      this.rgbToCDG(128, 0, 128),    // 14: Purple
      this.rgbToCDG(0, 128, 0)       // 15: Dark green
    ]
  }

  /**
   * Convert RGB (8-bit per channel) to CDG format (4-bit per channel)
   */
  rgbToCDG(r: number, g: number, b: number): number {
    // Scale 8-bit (0-255) to 4-bit (0-15).
    // Use the reference implementation mapping: divide by 17 (floor) to map 0..255 -> 0..15.
    const r4 = Math.floor(r / 17) & 0x0F
    const g4 = Math.floor(g / 17) & 0x0F
    const b4 = Math.floor(b / 17) & 0x0F

    return ((r4 << 8) | (g4 << 4) | b4) & 0x0FFF   // ORIGINAL
  }

  /**
   * Get color at index
   */
  getColor(index: number): number {
    return this.colors[index & 0x0F] || 0
  }

  /**
   * Set color at index
   */
  setColor(index: number, r: number, g: number, b: number): void {
    this.colors[index & 0x0F] = this.rgbToCDG(r, g, b)
  }

  /**
   * Get all colors (for generating palette load packets)
   */
  getColors(): number[] {
    return [...this.colors]
  }

  /**
   * Generate packets to load this palette into CDG player
   */
  generateLoadPackets(): CDGPacket[] {
    const colors = this.getColors()
    return [
      CDGPacket.loadColorTable(colors.slice(0, 8), false),   // Colors 0-7
      CDGPacket.loadColorTable(colors.slice(8, 16), true)    // Colors 8-15
    ]
  }
}
