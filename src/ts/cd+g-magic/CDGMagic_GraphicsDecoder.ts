/**
 * CD+Graphics Magic - GraphicsDecoder
 *
 * Core packet interpreter: CD_SCPacket → RGBA pixel rendering
 * Manages VRAM state, palette, and executes all CD+G graphics operations.
 */

import { CDGMagic_PALObject   } from "@/ts/cd+g-magic/CDGMagic_PALObject";
import { CDGMagic_FontBlock   } from "@/ts/cd+g-magic/CDGMagic_FontBlock";
import { CDGMagic_CDSCPacket  } from "@/ts/cd+g-magic/CDGMagic_CDSCPacket";

/**
 * CD+G Display Specification
 * Standard CD+G resolution and format constants
 */
export namespace CDGDisplay {
  // VRAM dimensions (from C++ reference: new unsigned char[300*216])
  export const VRAM_WIDTH = 300;
  export const VRAM_HEIGHT = 216;
  export const VRAM_TOTAL_PIXELS = VRAM_WIDTH * VRAM_HEIGHT;

  // Output framebuffer dimensions (with 6-pixel borders on each side)
  export const OUTPUT_WIDTH = 312;   // 300 + 6 + 6
  export const OUTPUT_HEIGHT = 216;  // Same as VRAM height
  export const OUTPUT_TOTAL_PIXELS = OUTPUT_WIDTH * OUTPUT_HEIGHT;

  // Active display area (where actual graphics are rendered)
  export const ACTIVE_X_START = 6;
  export const ACTIVE_X_END = 294;   // 300 - 6
  export const ACTIVE_Y_START = 12;
  export const ACTIVE_Y_END = 204;   // 216 - 12
  export const ACTIVE_WIDTH = ACTIVE_X_END - ACTIVE_X_START;   // 288
  export const ACTIVE_HEIGHT = ACTIVE_Y_END - ACTIVE_Y_START;  // 192

  // Standard CD+G pixel tile dimensions (for font blocks)
  export const TILE_WIDTH = 6;
  export const TILE_HEIGHT = 12;

  // Number of tiles in grid (based on VRAM)
  export const TILES_WIDE = VRAM_WIDTH / TILE_WIDTH;  // 50 tiles
  export const TILES_HIGH = VRAM_HEIGHT / TILE_HEIGHT; // 18 tiles

  // Color constants
  export const TRANSPARENT_INDEX = 0; // Default transparent color
}

/**
 * GraphicsDecoder: CD+G Packet Interpreter
 *
 * Processes CD_SCPacket instructions and maintains graphics state:
 * - VRAM (video memory) for pixel storage
 * - Palette (16-color lookup table)
 * - Border color
 * - Transparent color index
 * - Screen/memory state
 *
 * Instruction Support (TV Graphics mode, 0x09):
 * - 0x01: MEMORY_PRESET (clear/fill screen)
 * - 0x02: BORDER_PRESET (set border color)
 * - 0x06: COPY_FONT (render tile, direct copy mode)
 * - 0x14: SCROLL_PRESET (pan/scroll display)
 * - 0x18: SCROLL_COPY (scroll execute)
 * - 0x1C: TRANSPARENT_COLOR (set transparent index)
 * - 0x1E: LOAD_CLUT_LO (load palette colors 0-7)
 * - 0x1F: LOAD_CLUT_HI (load palette colors 8-15)
 * - 0x26: XOR_FONT (render tile, XOR blend mode)
 *
 * The decoder maintains VRAM as a 300×216 pixel buffer indexed by palette (0-15).
 * All rendering operations work in palette space, not RGBA.
 * RGBA conversion happens only during final framebuffer output.
 */
export class CDGMagic_GraphicsDecoder {
  // VRAM: 300×216 pixels, each pixel is 4-bit palette index (0-15)
  // Stored as single byte per pixel (wasting 4 bits, for simplicity)
  private internal_vram: Uint8Array;

  // Current palette (16 colors, each color is ARGB32 packed)
  private internal_palette: CDGMagic_PALObject;

  // Border color (palette index 0-15)
  private internal_border_index: number;

  // Transparent color index (palette index 0-15, typically 0)
  private internal_transparent_index: number;

  // Font block for tile rendering (shared across decoder instance)
  private internal_font_block: CDGMagic_FontBlock;

  // Packet count processed (for debugging/diagnostics)
  private internal_packet_count: number;

  // Horizontal scroll offset (applied during rendering)
  private internal_h_offset: number;

  // Vertical scroll offset (applied during rendering)
  private internal_v_offset: number;

  /**
   * Constructor: Initialize graphics decoder with default state
   *
   * Initializes:
   * - VRAM (300×216) filled with palette index 0 (default/transparent)
   * - Default palette (black screen)
   * - Border index set to 0
   * - Transparent index set to 0
   * - Empty font block
   */
  constructor() {
    this.internal_vram = new Uint8Array(CDGDisplay.VRAM_TOTAL_PIXELS);
    this.internal_vram.fill(0); // Clear to palette index 0

    this.internal_palette = new CDGMagic_PALObject();
    this.internal_border_index = 0;
    this.internal_transparent_index = 0;
    this.internal_font_block = new CDGMagic_FontBlock();
    this.internal_packet_count = 0;
    this.internal_h_offset = 0;
    this.internal_v_offset = 0;
  }

  /**
   * Get VRAM buffer (read-only, returns copy)
   *
   * VRAM contains one byte per pixel, where each byte is a palette index (0-15).
   * The returned buffer is a copy to prevent external modification.
   *
   * @returns Copy of VRAM buffer (304×192 = 58,368 bytes)
   */
  vram(): Uint8Array {
    return new Uint8Array(this.internal_vram);
  }

  /**
   * Get single pixel from VRAM
   *
   * @param x X coordinate (0-303)
   * @param y Y coordinate (0-191)
   * @returns Palette index (0-15), or 0 if out of bounds
   */
  pixel(x: number, y: number): number {
    if (x < 0 || x >= CDGDisplay.VRAM_WIDTH || y < 0 || y >= CDGDisplay.VRAM_HEIGHT) {
      return 0;
    }
    return this.internal_vram[y * CDGDisplay.VRAM_WIDTH + x]!;
  }

  /**
   * Set single pixel in VRAM
   *
   * @param x X coordinate (0-303)
   * @param y Y coordinate (0-191)
   * @param palette_index Palette index (0-15)
   */
  set_pixel(x: number, y: number, palette_index: number): void {
    if (x >= 0 && x < CDGDisplay.VRAM_WIDTH && y >= 0 && y < CDGDisplay.VRAM_HEIGHT) {
      this.internal_vram[y * CDGDisplay.VRAM_WIDTH + x] = palette_index & 0x0f;
    }
  }

  /**
   * Get current palette
   *
   * @returns Reference to internal PALObject
   */
  palette(): CDGMagic_PALObject {
    return this.internal_palette;
  }

  /**
   * Replace palette
   *
   * @param new_palette New palette object
   */
  set_palette(new_palette: CDGMagic_PALObject): void {
    this.internal_palette = new_palette.clone();
  }

  /**
   * Get border color index
   *
   * Border is the area outside 304×192 display (typically 8 pixels on sides).
   *
   * @returns Palette index for border (0-15)
   */
  border_index(): number;
  /**
   * Set border color index
   *
   * @param requested_index Palette index (0-15)
   */
  border_index(requested_index: number): void;
  border_index(requested_index?: number): number | void {
    if (requested_index === undefined) {
      return this.internal_border_index;
    } else {
      this.internal_border_index = requested_index & 0x0f;
    }
  }

  /**
   * Get transparent color index
   *
   * Transparent pixels (set to this index) won't overwrite existing pixels
   * when rendering in certain blend modes.
   *
   * @returns Palette index for transparency (0-15)
   */
  transparent_index(): number;
  /**
   * Set transparent color index
   *
   * @param requested_index Palette index (0-15)
   */
  transparent_index(requested_index: number): void;
  transparent_index(requested_index?: number): number | void {
    if (requested_index === undefined) {
      return this.internal_transparent_index;
    } else {
      this.internal_transparent_index = requested_index & 0x0f;
    }
  }

  /**
   * Get packet count processed
   *
   * Useful for debugging and diagnostics.
   *
   * @returns Total packets processed by this decoder
   */
  packet_count(): number {
    return this.internal_packet_count;
  }

  /**
   * Process a single CD+G packet
   *
   * Interprets packet instruction and executes corresponding operation.
   * Updates internal state (VRAM, palette, etc.).
   *
   * @param packet CD_SCPacket to process
   */
  process_packet(packet: CDGMagic_CDSCPacket): void {
    this.internal_packet_count += 1;

    const instruction = packet.instruction();
    const data = packet.data();

    switch (instruction) {
      case 0x01:
        this.execute_memory_preset(data);
        break;
      case 0x02:
        this.execute_border_preset(data);
        break;
      case 0x1e:
        this.execute_load_clut_lo(data);
        break;
      case 0x1f:
        this.execute_load_clut_hi(data);
        break;
      case 0x06:
        this.execute_copy_font(data);
        break;
      case 0x26:
        this.execute_xor_font(data);
        break;
      case 0x14:
        this.execute_scroll_preset();
        break;
      case 0x1c:
        this.execute_transparent_color(data);
        break;
      // Unrecognized instructions are silently ignored
    }
  }

  /**
   * Execute MEMORY_PRESET (0x01)
   *
   * Clears all of VRAM to a specified fill color.
   * Used to reset screen between scenes or transitions.
   *
   * Data format (bytes 4-19):
   * - Byte 0: Color index (0-15, lower 4 bits used)
   * - Byte 1: Reserved/padding
   * - Bytes 2-15: Unused
   *
   * @param data 16-byte data payload from packet
   */
  private execute_memory_preset(data: Uint8Array): void {
    const color_index = data[0]! & 0x0f;
    this.internal_vram.fill(color_index);
  }

  /**
   * Execute BORDER_PRESET (0x02)
   *
   * Sets the border color (displayed outside 304×192 active area).
   *
   * Data format (bytes 4-19):
   * - Byte 0: Color index (0-15, lower 4 bits used)
   * - Bytes 1-15: Unused
   *
   * @param data 16-byte data payload from packet
   */
  private execute_border_preset(data: Uint8Array): void {
    const color_index = data[0]! & 0x0f;
    this.internal_border_index = color_index;
  }

  /**
   * Execute LOAD_CLUT_LO (0x04)
   *
   * Loads 8 colors into palette indices 0-7.
   * Colors are 6-bit RGB packed in 2 bytes per color (12 bits total).
   *
   * Data format (bytes 4-19):
   * Each color uses 2 bytes with 6-bit RGB values:
   * - Byte 0: bits 5-0 = Red (6 bits), bits 7-6 = upper Green bits
   * - Byte 1: bits 3-0 = Blue (6 bits), bits 5-4 = lower Green bits
   *
   * 6-bit values (0-63) are scaled to 8-bit (0-255) by multiplying by 17.
   *
   * @param data 16-byte data payload from packet
   */
  private execute_load_clut_lo(data: Uint8Array): void {
    // Load palette colors 0-7 from 6-bit RGB packed format
    for (let i = 0; i < 8; i++) {
      const byte_offset = i * 2;
      if (byte_offset + 1 < 16) {
        // Extract 6-bit RGB values (following C++ reference exactly)
        const r_6bit = (data[byte_offset]! & 0x3c) >> 2;           // Red: bits 5-2
        const g_high = (data[byte_offset]! & 0x03) << 4;           // Green high bits
        const g_low = (data[byte_offset + 1]! & 0x30) >> 4;        // Green low bits
        const g_6bit = g_high | g_low;
        const b_6bit = data[byte_offset + 1]! & 0x0f;              // Blue: bits 3-0

        // Scale 6-bit values to 8-bit by multiplying by 17
        const r = (r_6bit * 17) & 0xff;
        const g = (g_6bit * 17) & 0xff;
        const b = (b_6bit * 17) & 0xff;

        // Construct RGBA with alpha = 0xFF
        const rgba = (r << 24) | (g << 16) | (b << 8) | 0xff;
        this.internal_palette.color(i, rgba);
        console.debug('[execute_load_clut_lo] Color', i, ':', { r, g, b, hex: rgba.toString(16) });
      }
    }
  }

  /**
   * Execute LOAD_CLUT_HI (0x0C)
   *
   * Loads 8 colors into palette indices 8-15.
   * Colors are 6-bit RGB packed in 2 bytes per color (same format as LOAD_CLUT_LO).
   *
   * @param data 16-byte data payload from packet
   */
  private execute_load_clut_hi(data: Uint8Array): void {
    // Load palette colors 8-15 from 6-bit RGB packed format (same as LO)
    for (let i = 0; i < 8; i++) {
      const byte_offset = i * 2;
      if (byte_offset + 1 < 16) {
        // Extract 6-bit RGB values (following C++ reference exactly)
        const r_6bit = (data[byte_offset]! & 0x3c) >> 2;           // Red: bits 5-2
        const g_high = (data[byte_offset]! & 0x03) << 4;           // Green high bits
        const g_low = (data[byte_offset + 1]! & 0x30) >> 4;        // Green low bits
        const g_6bit = g_high | g_low;
        const b_6bit = data[byte_offset + 1]! & 0x0f;              // Blue: bits 3-0

        // Scale 6-bit values to 8-bit by multiplying by 17
        const r = (r_6bit * 17) & 0xff;
        const g = (g_6bit * 17) & 0xff;
        const b = (b_6bit * 17) & 0xff;

        // Construct RGBA with alpha = 0xFF
        const rgba = (r << 24) | (g << 16) | (b << 8) | 0xff;
        this.internal_palette.color(8 + i, rgba);
      }
    }
  }

  /**
   * Execute COPY_FONT (0x06)
   *
   * Renders a 12×6 pixel font block (tile) to VRAM using direct copy mode.
   * Overwrites existing pixels unconditionally.
   *
   * Data format (bytes 4-19):
   * - Byte 0: Color 1 (lower 4 bits) + Channel (upper 2 bits)
   * - Byte 1: Color 2 (lower 4 bits) + Channel (upper 2 bits)
   * - Byte 2: Y block coordinate (0-15)
   * - Byte 3: X block coordinate (0-49)
   * - Bytes 4-15: Pixel data (12 rows of 6-bit masks)
   *
   * @param data 16-byte data payload from packet
   */
  private execute_copy_font(data: Uint8Array): void {
    const color1 = data[0]! & 0x0f;
    const color2 = data[1]! & 0x0f;
    const y_block = data[2]!;
    const x_block = data[3]!;

    if (y_block >= CDGDisplay.TILES_HIGH || x_block >= CDGDisplay.TILES_WIDE) {
      console.debug('[execute_copy_font] OUT OF BOUNDS:', { y_block, x_block, max_y: CDGDisplay.TILES_HIGH, max_x: CDGDisplay.TILES_WIDE });
      return; // Out of bounds
    }

    const base_x = x_block * CDGDisplay.TILE_WIDTH;
    const base_y = y_block * CDGDisplay.TILE_HEIGHT;

    // Log first 3 tiles for debugging
    if (this.internal_packet_count <= 3) {
      console.debug(`[execute_copy_font] Tile ${this.internal_packet_count}: block (${x_block},${y_block}) -> pixel (${base_x},${base_y}), colors (${color1},${color2})`);
    }

    // Process 12 rows of pixel data
    for (let row = 0; row < CDGDisplay.TILE_HEIGHT; row++) {
      const pixel_byte = data[4 + row]!;

      // Each row is 6 pixels (6 bits in the byte)
      for (let col = 0; col < CDGDisplay.TILE_WIDTH; col++) {
        const bit_position = 5 - col; // MSB first
        const bit = (pixel_byte >> bit_position) & 0x01;
        const color = bit ? color2 : color1;

        this.set_pixel(base_x + col, base_y + row, color);
      }
    }
  }

  /**
   * Execute XOR_FONT (0x26)
   *
   * Renders a 12×6 pixel font block (tile) to VRAM using XOR blend mode.
   * XOR combines new pixels with existing pixels using bitwise XOR operation.
   * Used for highlighting or multi-color text rendering.
   *
   * Data format: Same as COPY_FONT (bytes 0-3 specify colors and coordinates).
   *
   * @param data 16-byte data payload from packet
   */
  private execute_xor_font(data: Uint8Array): void {
    const color1 = data[0]! & 0x0f;
    const color2 = data[1]! & 0x0f;
    const y_block = data[2]!;
    const x_block = data[3]!;

    if (y_block >= CDGDisplay.TILES_HIGH || x_block >= CDGDisplay.TILES_WIDE) {
      return; // Out of bounds
    }

    const base_x = x_block * CDGDisplay.TILE_WIDTH;
    const base_y = y_block * CDGDisplay.TILE_HEIGHT;

    // Process 12 rows of pixel data
    for (let row = 0; row < CDGDisplay.TILE_HEIGHT; row++) {
      const pixel_byte = data[4 + row]!;

      // Each row is 6 pixels (6 bits in the byte)
      for (let col = 0; col < CDGDisplay.TILE_WIDTH; col++) {
        const bit_position = 5 - col; // MSB first
        const bit = (pixel_byte >> bit_position) & 0x01;
        const new_color = bit ? color2 : color1;

        // XOR with existing pixel
        const x = base_x + col;
        const y = base_y + row;
        const existing = this.pixel(x, y);
        const xored = existing ^ new_color;

        this.set_pixel(x, y, xored);
      }
    }
  }

  /**
   * Execute SCROLL_PRESET (0x08)
   *
   * Pans/scrolls the display (shifts pixels or changes viewport).
   * Implementation varies by CD+G player - some ignore, some shift pixels.
   *
   * Data format (bytes 4-19):
   * - Byte 0: Scroll mode/direction (6 bits encoded)
   * - Byte 1: Scroll amount/speed
   * - Bytes 2-15: Unused
   *
   * Note: For now, this is a no-op. Full scroll implementation is complex
   * and requires understanding the specific scroll mode encoding.
   */
  private execute_scroll_preset(): void {
    // TODO: Implement scroll logic
    // Byte 0 contains scroll command (various modes)
    // Byte 1 contains scroll amount
    // For now: no-op (safe default)
  }

  /**
   * Execute TRANSPARENT_COLOR (0x1F)
   *
   * Sets which palette index is considered "transparent".
   * Transparent pixels may be handled specially by blend modes.
   *
   * Data format (bytes 4-19):
   * - Byte 0: Transparent color index (lower 4 bits)
   * - Bytes 1-15: Unused
   *
   * @param data 16-byte data payload from packet
   */
  private execute_transparent_color(data: Uint8Array): void {
    const transparent_index = data[0]! & 0x0f;
    this.internal_transparent_index = transparent_index;
  }

  /**
   * Convert VRAM to RGBA framebuffer
   *
   * Transforms palette-indexed VRAM into RGBA pixels using current palette.
   * Useful for rendering to screen or exporting as image.
   *
   * @returns RGBA framebuffer (304×192×4 = 233,472 bytes)
   */
  /**
   * Generate RGB framebuffer from VRAM and palette
   *
   * Following C++ CDGMagic_GraphicsDecoder::GetRGBAScreen():
   * - Output: 312 × 216 pixels (RGB, 3 bytes per pixel = 202,176 bytes)
   * - VRAM source: 300 × 216 (centered in output)
   * - Active display area (rendered from VRAM): x 6-294, y 12-204 (288×192)
   * - Border area: rendered separately with border color
   * - Offsets: h_offset and v_offset applied during VRAM reads
   *
   * @returns RGB framebuffer (3 bytes per pixel, size 312×216)
   */
  to_rgba_framebuffer(): Uint8Array {
    // Output: 312×216 RGB (3 bytes per pixel)
    const framebuffer = new Uint8Array(CDGDisplay.OUTPUT_WIDTH * CDGDisplay.OUTPUT_HEIGHT * 3);

    // Render active display area from VRAM with offsets applied
    // Active area: x from 6-294, y from 12-204
    for (let y_loc = CDGDisplay.ACTIVE_Y_START; y_loc < CDGDisplay.ACTIVE_Y_END; y_loc++) {
      for (let x_loc = CDGDisplay.ACTIVE_X_START; x_loc < CDGDisplay.ACTIVE_X_END; x_loc++) {
        // Apply offsets when reading from VRAM (wrap around using modulo)
        const vram_x = (x_loc + this.internal_h_offset) % CDGDisplay.VRAM_WIDTH;
        const vram_y = (y_loc + this.internal_v_offset) % CDGDisplay.VRAM_HEIGHT;
        const scr_loc = vram_x + vram_y * CDGDisplay.VRAM_WIDTH;

        // Calculate destination in output buffer
        const dest_loc = (x_loc + y_loc * CDGDisplay.OUTPUT_WIDTH) * 3;

        // Get palette index from VRAM (lower 4 bits only)
        const palette_index = this.internal_vram[scr_loc]! & 0x0f;
        const color = this.internal_palette.color(palette_index);

        // Extract RGB components and write to framebuffer
        // Color format: 0xRRGGBBAA
        // Octal shifts: >> 030 = >> 24 (red), >> 020 = >> 16 (green), >> 010 = >> 8 (blue)
        framebuffer[dest_loc] = (color >> 24) & 0xff;     // Red
        framebuffer[dest_loc + 1] = (color >> 16) & 0xff; // Green
        framebuffer[dest_loc + 2] = (color >> 8) & 0xff;  // Blue
      }
    }

    // Fill border areas with border color
    this.fill_border_rgb(framebuffer);

    return framebuffer;
  }

  /**
   * Fill border areas of framebuffer with border color
   *
   * Following C++ proc_fill_RGB calls from GetRGBAScreen():
   * - Top border: x 0-312, y 0-12
   * - Bottom border: x 0-312, y 204-216
   * - Left border: x 0-6, y 12-204
   * - Right border: x 306-312, y 12-204
   *
   * @param framebuffer RGB output buffer (312×216×3)
   */
  private fill_border_rgb(framebuffer: Uint8Array): void {
    const border_rgba = this.internal_palette.color(this.internal_border_index);
    const border_r = (border_rgba >> 24) & 0xff;
    const border_g = (border_rgba >> 16) & 0xff;
    const border_b = (border_rgba >> 8) & 0xff;

    // Top border: y 0-12
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < CDGDisplay.OUTPUT_WIDTH; x++) {
        const dest_loc = (x + y * CDGDisplay.OUTPUT_WIDTH) * 3;
        framebuffer[dest_loc] = border_r;
        framebuffer[dest_loc + 1] = border_g;
        framebuffer[dest_loc + 2] = border_b;
      }
    }

    // Bottom border: y 204-216
    for (let y = 204; y < CDGDisplay.OUTPUT_HEIGHT; y++) {
      for (let x = 0; x < CDGDisplay.OUTPUT_WIDTH; x++) {
        const dest_loc = (x + y * CDGDisplay.OUTPUT_WIDTH) * 3;
        framebuffer[dest_loc] = border_r;
        framebuffer[dest_loc + 1] = border_g;
        framebuffer[dest_loc + 2] = border_b;
      }
    }

    // Left border: x 0-6
    for (let y = 12; y < 204; y++) {
      for (let x = 0; x < 6; x++) {
        const dest_loc = (x + y * CDGDisplay.OUTPUT_WIDTH) * 3;
        framebuffer[dest_loc] = border_r;
        framebuffer[dest_loc + 1] = border_g;
        framebuffer[dest_loc + 2] = border_b;
      }
    }

    // Right border: x 306-312
    for (let y = 12; y < 204; y++) {
      for (let x = 306; x < CDGDisplay.OUTPUT_WIDTH; x++) {
        const dest_loc = (x + y * CDGDisplay.OUTPUT_WIDTH) * 3;
        framebuffer[dest_loc] = border_r;
        framebuffer[dest_loc + 1] = border_g;
        framebuffer[dest_loc + 2] = border_b;
      }
    }
  }

  /**
   * Reset decoder to initial state
   *
   * Clears VRAM, resets palette to defaults, clears any configuration state.
   */
  reset(): void {
    this.internal_vram.fill(0);
    this.internal_palette = new CDGMagic_PALObject();
    this.internal_border_index = 0;
    this.internal_transparent_index = 0;
    this.internal_packet_count = 0;
    this.internal_h_offset = 0;
    this.internal_v_offset = 0;
  }

  /**
   * Clone decoder with independent state
   *
   * @returns New decoder with copied VRAM and palette
   */
  clone(): CDGMagic_GraphicsDecoder {
    const cloned = new CDGMagic_GraphicsDecoder();
    cloned.internal_vram.set(this.internal_vram);
    cloned.internal_palette = this.internal_palette.clone();
    cloned.internal_border_index = this.internal_border_index;
    cloned.internal_transparent_index = this.internal_transparent_index;
    cloned.internal_packet_count = this.internal_packet_count;
    cloned.internal_h_offset = this.internal_h_offset;
    cloned.internal_v_offset = this.internal_v_offset;
    return cloned;
  }
}

// VIM: set ft=typescript :
// END