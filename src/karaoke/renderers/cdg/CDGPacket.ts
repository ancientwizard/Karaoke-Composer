/**
 * CDG Packet Structure and Commands
 *
 * CDG (Compact Disc + Graphics) Format Specifications:
 * - 24 bytes per packet
 * - 75 packets per second (synchronized with audio CD)
 * - Packet structure: Command (1 byte) + Instruction (1 byte) + Data (16 bytes) + Parity (4 bytes)
 */

/**
 * CDG Command codes (first byte of packet)
 */
export enum CDGCommand {
  CDG_MEMORY_PRESET = 1,      // Clear screen with color
  CDG_BORDER_PRESET = 2,      // Set border to color
  CDG_TILE_BLOCK = 6,         // Draw tile block (normal)
  CDG_SCROLL_PRESET = 20,     // Scroll screen
  CDG_SCROLL_COPY = 24,       // Scroll screen with copy
  CDG_DEFINE_TRANSPARENT = 28, // Define transparent color
  CDG_LOAD_COLOR_TABLE_LOW = 30,  // Load color table (colors 0-7)
  CDG_LOAD_COLOR_TABLE_HIGH = 31, // Load color table (colors 8-15)
  CDG_TILE_BLOCK_XOR = 38     // Draw tile block (XOR mode)
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
  PACKETS_PER_SECOND: 75 // CDG timing: 75 packets/second
} as const

/**
 * Single CDG packet (24 bytes)
 */
export class CDGPacket {
  private buffer: Buffer

  constructor() {
    this.buffer = Buffer.alloc(24, 0)
    // First byte is always CDG subchannel code (0x09)
    this.buffer[0] = 0x09
  }

  /**
   * Set command and instruction
   */
  setCommand(command: CDGCommand, instruction: number = 0): void {
    this.buffer[1] = command & 0x3F  // Command (mask to 6 bits)
    this.buffer[2] = instruction & 0x3F  // Instruction (mask to 6 bits)
  }

  /**
   * Set data bytes (16 bytes max)
   */
  setData(data: number[]): void {
    for (let i = 0; i < Math.min(data.length, 16); i++) {
      this.buffer[3 + i] = data[i] & 0x3F  // Data bytes (mask to 6 bits each)
    }
  }

  /**
   * Calculate and set parity bits (optional, often ignored by players)
   */
  setParity(): void {
    // Simple parity calculation (XOR of all data bits)
    // CDG spec defines specific parity, but many players ignore it
    let parity = 0
    for (let i = 1; i < 19; i++) {
      parity ^= this.buffer[i]
    }
    this.buffer[19] = parity & 0x3F
    this.buffer[20] = parity & 0x3F
    this.buffer[21] = parity & 0x3F
    this.buffer[22] = parity & 0x3F
  }

  /**
   * Get the complete packet as Buffer
   */
  toBuffer(): Buffer {
    this.setParity()
    return this.buffer
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

    // Pack 8 colors (each is 16-bit RGB)
    const data: number[] = []
    for (let i = 0; i < 8; i++) {
      const color = colors[i] || 0
      // CDG color format: [0 0 R3 R2 R1 R0 G3 G2] [0 0 G1 G0 B3 B2 B1 B0]
      data.push((color >> 8) & 0x3F)  // High byte
      data.push(color & 0x3F)         // Low byte
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
    // Scale 8-bit (0-255) to 4-bit (0-15)
    const r4 = (r >> 4) & 0x0F
    const g4 = (g >> 4) & 0x0F
    const b4 = (b >> 4) & 0x0F

    // Pack into 12-bit CDG format (stored as 16-bit)
    // Format: [0 0 R3 R2 R1 R0 G3 G2] [0 0 G1 G0 B3 B2 B1 B0]
    return ((r4 << 8) | (g4 << 4) | b4) & 0x0FFF
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
