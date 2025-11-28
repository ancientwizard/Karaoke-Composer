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
  // Standard CD+G display dimensions
  export const WIDTH = 304;
  export const HEIGHT = 192;
  export const TOTAL_PIXELS = WIDTH * HEIGHT;

  // Standard CD+G pixel tile dimensions
  export const TILE_WIDTH = 6;
  export const TILE_HEIGHT = 12;

  // Number of tiles in grid
  export const TILES_WIDE = WIDTH / TILE_WIDTH;  // 50 tiles
  export const TILES_HIGH = HEIGHT / TILE_HEIGHT; // 16 tiles

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
 * Instruction Support:
 * - 0x01: MEMORY_PRESET (clear/fill screen)
 * - 0x02: BORDER_PRESET (set border color)
 * - 0x04: LOAD_CLUT_LO (load palette colors 0-7)
 * - 0x0C: LOAD_CLUT_HI (load palette colors 8-15)
 * - 0x06: COPY_FONT (render tile, direct copy mode)
 * - 0x26: XOR_FONT (render tile, XOR blend mode)
 * - 0x08: SCROLL_PRESET (pan/scroll display)
 * - 0x1F: TRANSPARENT_COLOR (set transparent index)
 *
 * The decoder maintains VRAM as a 304×192 pixel buffer indexed by palette (0-15).
 * All rendering operations work in palette space, not RGBA.
 * RGBA conversion happens only during final framebuffer output.
 */
export class CDGMagic_GraphicsDecoder {
  // VRAM: 304×192 pixels, each pixel is 4-bit palette index (0-15)
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

  /**
   * Constructor: Initialize graphics decoder with default state
   *
   * Initializes:
   * - VRAM filled with palette index 0 (default/transparent)
   * - Default palette (black screen)
   * - Border index set to 0
   * - Transparent index set to 0
   * - Empty font block
   */
  constructor() {
    this.internal_vram = new Uint8Array(CDGDisplay.TOTAL_PIXELS);
    this.internal_vram.fill(0); // Clear to palette index 0

    this.internal_palette = new CDGMagic_PALObject();
    this.internal_border_index = 0;
    this.internal_transparent_index = 0;
    this.internal_font_block = new CDGMagic_FontBlock();
    this.internal_packet_count = 0;
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
    if (x < 0 || x >= CDGDisplay.WIDTH || y < 0 || y >= CDGDisplay.HEIGHT) {
      return 0;
    }
    return this.internal_vram[y * CDGDisplay.WIDTH + x]!;
  }

  /**
   * Set single pixel in VRAM
   *
   * @param x X coordinate (0-303)
   * @param y Y coordinate (0-191)
   * @param palette_index Palette index (0-15)
   */
  set_pixel(x: number, y: number, palette_index: number): void {
    if (x >= 0 && x < CDGDisplay.WIDTH && y >= 0 && y < CDGDisplay.HEIGHT) {
      this.internal_vram[y * CDGDisplay.WIDTH + x] = palette_index & 0x0f;
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
      case 0x04:
        this.execute_load_clut_lo(data);
        break;
      case 0x0c:
        this.execute_load_clut_hi(data);
        break;
      case 0x06:
        this.execute_copy_font(data);
        break;
      case 0x26:
        this.execute_xor_font(data);
        break;
      case 0x08:
        this.execute_scroll_preset();
        break;
      case 0x1f:
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
   * Each color is 24-bit RGB in the packet data.
   *
   * Data format (bytes 4-19):
   * - 8 colors × 3 bytes each = 24 bytes total (spans across packets)
   * - This packet holds: R0 G0 B0 R1 G1 B1 R2 G2 B2 R3 G3 B3 R4 G4 B4 R5
   * - Next packet holds: G5 B5 R6 G6 B6 R7 G7 B7 (+ padding)
   *
   * For this packet alone, loads colors 0-5 (first 18 bytes).
   *
   * @param data 16-byte data payload from packet
   */
  private execute_load_clut_lo(data: Uint8Array): void {
    // Load palette colors 0-7 from RGB triplets
    for (let i = 0; i < 8; i++) {
      const byte_offset = i * 3;
      if (byte_offset + 2 < 16) {
        const r = data[byte_offset]!;
        const g = data[byte_offset + 1]!;
        const b = data[byte_offset + 2]!;
        // Construct RGBA: (R << 24) | (G << 16) | (B << 8) | 0xFF (full alpha)
        const rgba = (r << 24) | (g << 16) | (b << 8) | 0xff;
        this.internal_palette.color(i, rgba);
      }
    }
  }

  /**
   * Execute LOAD_CLUT_HI (0x0C)
   *
   * Loads 8 colors into palette indices 8-15.
   * Each color is 24-bit RGB in the packet data.
   *
   * Data format: Same as LOAD_CLUT_LO, but for colors 8-15.
   *
   * @param data 16-byte data payload from packet
   */
  private execute_load_clut_hi(data: Uint8Array): void {
    // Load palette colors 8-15 from RGB triplets
    for (let i = 0; i < 8; i++) {
      const byte_offset = i * 3;
      if (byte_offset + 2 < 16) {
        const r = data[byte_offset]!;
        const g = data[byte_offset + 1]!;
        const b = data[byte_offset + 2]!;
        // Construct RGBA: (R << 24) | (G << 16) | (B << 8) | 0xFF (full alpha)
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
  to_rgba_framebuffer(): Uint8Array {
    const framebuffer = new Uint8Array(CDGDisplay.TOTAL_PIXELS * 4);

    for (let i = 0; i < CDGDisplay.TOTAL_PIXELS; i++) {
      const palette_index = this.internal_vram[i]!;
      const argb = this.internal_palette.color(palette_index);

      // Extract ARGB components and convert to RGBA
      const a = (argb >> 24) & 0xff;
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;

      framebuffer[i * 4] = r;
      framebuffer[i * 4 + 1] = g;
      framebuffer[i * 4 + 2] = b;
      framebuffer[i * 4 + 3] = a;
    }

    return framebuffer;
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
    return cloned;
  }
}

// VIM: set ft=typescript :
// END