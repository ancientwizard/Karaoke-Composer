/**
 * CD+Graphics Magic - GraphicsEncoder
 *
 * Core encoding engine: Media clips → CD_SCPacket stream
 * Manages VRAM state, palette, composition layers, and generates CD+G output packets.
 */

import { CDGMagic_PALObject   } from "@/ts/cd+g-magic/CDGMagic_PALObject";
import { CDGMagic_FontBlock   } from "@/ts/cd+g-magic/CDGMagic_FontBlock";
import { CDGMagic_BMPObject   } from "@/ts/cd+g-magic/CDGMagic_BMPObject";
import { CDGMagic_CDSCPacket  } from "@/ts/cd+g-magic/CDGMagic_CDSCPacket";

/**
 * CD+G Encoding Specification
 * Standard CD+G dimensions and composition parameters
 */
export namespace CDGEncoding {
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

  // Composition layers
  export const COMPOSITION_LAYERS = 8;

  // Color constants
  export const TRANSPARENT_INDEX = 0;
}

/**
 * GraphicsEncoder: Media → CD+G Packet Generator
 *
 * Converts media clips (bitmaps, text, palettes) into a stream of CD_SCPacket
 * commands that can be written to a CDG file or transmitted to a CDG player.
 *
 * Architecture:
 * - VRAM (304×192 pixels): Main framebuffer, palette-indexed (0-15)
 * - Composition layers (8): Multi-layer rendering for overlapping content
 * - Palette manager: Current palette (16 colors ARGB32)
 * - Packet stream: Output CD+G commands (CLUT, MEMORY_PRESET, COPY_FONT, etc.)
 *
 * Key Operations:
 * 1. Iterate through media events (sorted by pack time)
 * 2. For each event, render its content (bitmap → tiles)
 * 3. Write rendering commands as CD+G packets
 * 4. Manage palette changes and state transitions
 * 5. Output complete packet stream ready for CDG file
 *
 * Packet Types Generated:
 * - MEMORY_PRESET (0x01): Clear/fill VRAM with color
 * - BORDER_PRESET (0x02): Set border color
 * - LOAD_CLUT_LO (0x04): Load palette colors 0-7
 * - LOAD_CLUT_HI (0x0C): Load palette colors 8-15
 * - COPY_FONT (0x06): Render 12×6 tile (direct copy)
 * - XOR_FONT (0x26): Render 12×6 tile (XOR blend)
 * - TRANSPARENT_COLOR (0x1F): Set transparent palette index
 */
export class CDGMagic_GraphicsEncoder {
  // VRAM: 304×192 pixels, each pixel is 4-bit palette index (0-15)
  // Stored as single byte per pixel for simplicity
  private internal_vram: Uint8Array;

  // Composition buffers: 8 layers for multi-layer rendering
  // Each layer is a separate VRAM (for tracking z-order)
  private internal_composition_buffers: Uint8Array[];

  // Current palette (16 colors, each color is ARGB32 packed)
  private internal_palette: CDGMagic_PALObject;

  // Backup palette for palette transitions
  private internal_palette_backup: CDGMagic_PALObject;

  // Border color (palette index 0-15)
  private internal_border_index: number;

  // Transparent color index (palette index 0-15, typically 0)
  private internal_transparent_index: number;

  // Output packet stream
  private internal_cdg_stream: CDGMagic_CDSCPacket[];

  // Current stream length (packet count)
  private internal_stream_length: number;

  /**
   * Constructor: Initialize graphics encoder with default state
   *
   * Initializes:
   * - VRAM filled with palette index 0
   * - 8 composition layer buffers
   * - Default palette (black/empty)
   * - Empty packet stream
   */
  constructor() {
    this.internal_vram = new Uint8Array(CDGEncoding.TOTAL_PIXELS);
    this.internal_vram.fill(0);

    // Initialize composition layers
    this.internal_composition_buffers = [];
    for (let i = 0; i < CDGEncoding.COMPOSITION_LAYERS; i++) {
      const layer = new Uint8Array(CDGEncoding.TOTAL_PIXELS);
      layer.fill(0);
      this.internal_composition_buffers.push(layer);
    }

    this.internal_palette = new CDGMagic_PALObject();
    this.internal_palette_backup = new CDGMagic_PALObject();
    this.internal_border_index = 0;
    this.internal_transparent_index = 0;

    this.internal_cdg_stream = [];
    this.internal_stream_length = 0;
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
   * Set VRAM buffer from external data
   *
   * @param new_vram Uint8Array of size 304×192 (58,368 bytes)
   */
  set_vram(new_vram: Uint8Array): void {
    if (new_vram.length === CDGEncoding.TOTAL_PIXELS) {
      this.internal_vram.set(new_vram);
    }
  }

  /**
   * Get single pixel from VRAM
   *
   * @param x X coordinate (0-303)
   * @param y Y coordinate (0-191)
   * @returns Palette index (0-15), or 0 if out of bounds
   */
  pixel(x: number, y: number): number {
    if (x < 0 || x >= CDGEncoding.WIDTH || y < 0 || y >= CDGEncoding.HEIGHT) {
      return 0;
    }
    return this.internal_vram[y * CDGEncoding.WIDTH + x]!;
  }

  /**
   * Set single pixel in VRAM
   *
   * @param x X coordinate (0-303)
   * @param y Y coordinate (0-191)
   * @param palette_index Palette index (0-15)
   */
  set_pixel(x: number, y: number, palette_index: number): void {
    if (x >= 0 && x < CDGEncoding.WIDTH && y >= 0 && y < CDGEncoding.HEIGHT) {
      this.internal_vram[y * CDGEncoding.WIDTH + x] = palette_index & 0x0f;
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
    this.internal_palette = new_palette;
  }

  /**
   * Get border color index
   *
   * Border is the area outside 304×192 display (typically 8 pixels on sides).
   *
   * @returns Palette index (0-15)
   */
  border_index(): number {
    return this.internal_border_index;
  }

  /**
   * Set border color index
   *
   * @param new_index Palette index (0-15, will be clamped)
   */
  set_border_index(new_index: number): void {
    this.internal_border_index = Math.max(0, Math.min(15, new_index));
  }

  /**
   * Get transparent color index
   *
   * Colors matching this index are treated as transparent in rendering.
   *
   * @returns Palette index (0-15)
   */
  transparent_index(): number {
    return this.internal_transparent_index;
  }

  /**
   * Set transparent color index
   *
   * @param new_index Palette index (0-15, will be clamped)
   */
  set_transparent_index(new_index: number): void {
    this.internal_transparent_index = Math.max(0, Math.min(15, new_index));
  }

  /**
   * Get current packet stream
   *
   * Returns the accumulated CD+G packets generated during encoding.
   *
   * @returns Array of CD_SCPacket objects
   */
  packet_stream(): CDGMagic_CDSCPacket[] {
    return this.internal_cdg_stream;
  }

  /**
   * Get current stream length (packet count)
   *
   * @returns Number of packets in stream
   */
  stream_length(): number {
    return this.internal_stream_length;
  }

  /**
   * Clear packet stream and reset encoder
   */
  clear_stream(): void {
    this.internal_cdg_stream = [];
    this.internal_stream_length = 0;
  }

  /**
   * Reset encoder to initial state
   *
   * Clears VRAM, composition layers, resets palette and border settings.
   */
  reset(): void {
    this.internal_vram.fill(0);
    for (const layer of this.internal_composition_buffers) {
      layer.fill(0);
    }
    this.internal_palette = new CDGMagic_PALObject();
    this.internal_palette_backup = new CDGMagic_PALObject();
    this.internal_border_index = 0;
    this.internal_transparent_index = 0;
    this.clear_stream();
  }

  /**
   * Clone encoder with independent state
   *
   * @returns New encoder with copied VRAM, palette, and settings
   */
  clone(): CDGMagic_GraphicsEncoder {
    const cloned = new CDGMagic_GraphicsEncoder();
    cloned.internal_vram.set(this.internal_vram);
    for (let i = 0; i < CDGEncoding.COMPOSITION_LAYERS; i++) {
      cloned.internal_composition_buffers[i]!.set(this.internal_composition_buffers[i]!);
    }
    cloned.internal_palette = this.internal_palette.clone();
    cloned.internal_palette_backup = this.internal_palette_backup.clone();
    cloned.internal_border_index = this.internal_border_index;
    cloned.internal_transparent_index = this.internal_transparent_index;
    cloned.internal_cdg_stream = this.internal_cdg_stream.map((pkt) => pkt.clone());
    cloned.internal_stream_length = this.internal_stream_length;
    return cloned;
  }

  /**
   * Add packet to output stream
   *
   * Internal helper to append a CD+G packet to the output stream.
   *
   * @param packet Packet to add
   */
  private add_packet(packet: CDGMagic_CDSCPacket): void {
    this.internal_cdg_stream.push(packet.clone());
    this.internal_stream_length++;
  }

  /**
   * Generate MEMORY_PRESET (0x01) packet
   *
   * Clears all of VRAM to a specified fill color and mode.
   * Used to reset screen between scenes or transitions.
   *
   * Packet format:
   * - Byte 0: Repeat count (usually 0 = 1 fill, 1 = 2 fills, etc.)
   * - Byte 1: Fill color (palette index 0-15)
   * - Bytes 2-15: Unused
   *
   * @param fill_color Palette index to fill with (0-15, will be clamped)
   * @param repeat_count Repeat count (default 0 = single fill)
   */
  memory_preset(fill_color: number, repeat_count: number = 0): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x01); // MEMORY_PRESET
    packet.set_data_byte(0, Math.max(0, Math.min(15, repeat_count)));
    packet.set_data_byte(1, Math.max(0, Math.min(15, fill_color)));
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate BORDER_PRESET (0x02) packet
   *
   * Sets the border color (area outside 304×192 display region).
   * Typically 8 pixels on each side.
   *
   * Packet format:
   * - Byte 0: Border color (palette index 0-15)
   * - Bytes 1-15: Unused
   *
   * @param border_color Palette index for border (0-15, will be clamped)
   */
  border_preset(border_color: number): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x02); // BORDER_PRESET
    packet.set_data_byte(0, Math.max(0, Math.min(15, border_color)));
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate LOAD_CLUT_LO (0x04) packet
   *
   * Loads palette colors 0-7 (16-bit color values).
   * Each color is 2 bytes: low 8 bits of R, then high 2 bits of R, G, B (packed).
   *
   * Packet format:
   * - Bytes 0-1: Color 0 (16-bit)
   * - Bytes 2-3: Color 1 (16-bit)
   * - Bytes 4-5: Color 2 (16-bit)
   * - Bytes 6-7: Color 3 (16-bit)
   * - Bytes 8-9: Color 4 (16-bit)
   * - Bytes 10-11: Color 5 (16-bit)
   * - Bytes 12-13: Color 6 (16-bit)
   * - Bytes 14-15: Color 7 (16-bit)
   *
   * Note: This encodes CD+G 12-bit RGB format in 16-bit words.
   * Each color: CCRRRRR GGGBBBBB (in little-endian CD+G format)
   *
   * @param palette Palette object to read colors 0-7 from
   */
  load_palette_lo(palette: CDGMagic_PALObject): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x04); // LOAD_CLUT_LO
    const data = packet.data();

    for (let i = 0; i < 8; i++) {
      const argb = palette.color(i);
      // Extract 8-bit RGBA
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;

      // Convert to CD+G 12-bit RGB: take upper 4 bits of each channel
      // and encode into 2-byte word (little-endian):
      // Byte 0: R[7:4] | G[7:4]
      // Byte 1: B[7:4] | R[3:0]
      const r12 = (r >> 4) & 0x0f;
      const g12 = (g >> 4) & 0x0f;
      const b12 = (b >> 4) & 0x0f;

      const byte0 = ((r12 << 4) | g12) & 0xff;
      const byte1 = ((b12 << 4) | r12) & 0xff;

      data[i * 2] = byte0;
      data[i * 2 + 1] = byte1;
    }

    packet.set_data(data);
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate LOAD_CLUT_HI (0x0C) packet
   *
   * Loads palette colors 8-15 (16-bit color values).
   * Format is identical to LOAD_CLUT_LO, but for colors 8-15.
   *
   * @param palette Palette object to read colors 8-15 from
   */
  load_palette_hi(palette: CDGMagic_PALObject): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x0c); // LOAD_CLUT_HI
    const data = packet.data();

    for (let i = 0; i < 8; i++) {
      const argb = palette.color(8 + i);
      // Extract 8-bit RGBA
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;

      // Convert to CD+G 12-bit RGB
      const r12 = (r >> 4) & 0x0f;
      const g12 = (g >> 4) & 0x0f;
      const b12 = (b >> 4) & 0x0f;

      const byte0 = ((r12 << 4) | g12) & 0xff;
      const byte1 = ((b12 << 4) | r12) & 0xff;

      data[i * 2] = byte0;
      data[i * 2 + 1] = byte1;
    }

    packet.set_data(data);
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate TRANSPARENT_COLOR (0x1F) packet
   *
   * Sets which palette color is treated as transparent in rendering.
   *
   * Packet format:
   * - Byte 0: Transparent color index (0-15)
   * - Bytes 1-15: Unused
   *
   * @param transparent_index Palette index to treat as transparent (0-15, will be clamped)
   */
  transparent_color(transparent_index: number): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x1f); // TRANSPARENT_COLOR
    packet.set_data_byte(0, Math.max(0, Math.min(15, transparent_index)));
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate SCROLL_PRESET (0x14) packet
   *
   * Sets the scroll/pan offset for screen display.
   * Special case: offset (0,0) = initialization/mode switch marker (SCROLL_PRESET variant).
   *
   * Packet format:
   * - Byte 0: Flags (bit 0-1 = scroll mode, bit 4-5 = copy/preset flags)
   * - Byte 1: Horizontal scroll pixels (0-299)
   * - Bytes 2-15: Vertical scroll pixels (0-191) and unused
   *
   * @param x_scroll Horizontal scroll offset in pixels (0-299)
   * @param y_scroll Vertical scroll offset in pixels (0-191)
   */
  scroll_preset(x_scroll: number, y_scroll: number): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x14); // SCROLL_PRESET
    packet.set_data_byte(0, 0); // Flags: basic scroll mode
    packet.set_data_byte(1, Math.max(0, Math.min(299, x_scroll)));
    packet.set_data_byte(2, Math.max(0, Math.min(191, y_scroll)));
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate COPY_FONT (0x06) packet
   *
   * Renders a 12×6 pixel font block (tile) directly to VRAM without blending.
   * Used for opaque text and graphics rendering.
   *
   * Packet format (bytes 0-15):
   * - Byte 0: Color 0 (lower palette index, bits 0-3)
   * - Byte 1: Color 1 (upper palette index, bits 4-7)
   * - Byte 2: X coordinate (tile units 0-49, bits 0-5)
   * - Byte 3: Y coordinate (tile units 0-15, bits 0-4)
   * - Bytes 4-15: Pixel data (12 rows of 6-bit bitmaps)
   *
   * @param x_tile X position in tile units (0-49, will be clamped)
   * @param y_tile Y position in tile units (0-15, will be clamped)
   * @param color0 First foreground color (0-15, will be clamped)
   * @param color1 Second foreground color (0-15, will be clamped)
   * @param pixel_data 12 bytes of pixel data (6 bits per row, 12 rows)
   */
  copy_font(
    x_tile: number,
    y_tile: number,
    color0: number,
    color1: number,
    pixel_data: Uint8Array
  ): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x06); // COPY_FONT
    const data = packet.data();

    // Colors: low 4 bits = color0, high 4 bits = color1
    data[0] = ((Math.max(0, Math.min(15, color1)) << 4) |
      Math.max(0, Math.min(15, color0))) &
      0xff;

    // Coordinates: 6 bits X, 5 bits Y
    data[1] = Math.max(0, Math.min(49, x_tile)) & 0x3f;
    data[2] = Math.max(0, Math.min(15, y_tile)) & 0x1f;

    // Pixel data (12 bytes): 6 pixels per row as 6-bit value
    for (let i = 0; i < 12; i++) {
      data[3 + i] = (pixel_data[i] ?? 0) & 0x3f;
    }

    packet.set_data(data);
    this.add_packet(packet);
    return packet;
  }

  /**
   * Generate XOR_FONT (0x26) packet
   *
   * Renders a 12×6 pixel font block using XOR blend mode.
   * XOR combines new pixels with existing VRAM content using bitwise XOR.
   * Used for multi-color text and highlighting effects.
   *
   * Packet format is identical to COPY_FONT (see above).
   *
   * @param x_tile X position in tile units (0-49, will be clamped)
   * @param y_tile Y position in tile units (0-15, will be clamped)
   * @param color0 First blend color (0-15, will be clamped)
   * @param color1 Second blend color (0-15, will be clamped)
   * @param pixel_data 12 bytes of pixel data (6 bits per row, 12 rows)
   */
  xor_font(
    x_tile: number,
    y_tile: number,
    color0: number,
    color1: number,
    pixel_data: Uint8Array
  ): CDGMagic_CDSCPacket {
    const packet = new CDGMagic_CDSCPacket();
    packet.instruction(0x26); // XOR_FONT
    const data = packet.data();

    // Colors: low 4 bits = color0, high 4 bits = color1
    data[0] = ((Math.max(0, Math.min(15, color1)) << 4) |
      Math.max(0, Math.min(15, color0))) &
      0xff;

    // Coordinates: 6 bits X, 5 bits Y
    data[1] = Math.max(0, Math.min(49, x_tile)) & 0x3f;
    data[2] = Math.max(0, Math.min(15, y_tile)) & 0x1f;

    // Pixel data (12 bytes): 6 pixels per row as 6-bit value
    for (let i = 0; i < 12; i++) {
      data[3 + i] = (pixel_data[i] ?? 0) & 0x3f;
    }

    packet.set_data(data);
    this.add_packet(packet);
    return packet;
  }

  /**
   * Render font block to VRAM with direct copy mode
   *
   * Decodes a font block and renders it to VRAM at tile coordinates.
   * This applies the block directly without blending.
   * Note: Font blocks are 6×12 based on internal layout.
   *
   * @param font_block Font block to render
   * @param use_xor If true, use XOR blend; if false, use direct copy
   */
  render_font_block_to_vram(
    font_block: CDGMagic_FontBlock,
    use_xor: boolean = false
  ): void {
    // Font block position is in tile units; convert to pixels
    // Using 6 pixels wide × 12 pixels tall per block
    const x_pixel = font_block.x_location() * 6;
    const y_pixel = font_block.y_location() * 12;

    // Font block is 6 wide × 12 tall
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 6; x++) {
        const pixel_index = font_block.pixel_value(x, y);

        // Skip transparent pixels
        if (pixel_index === font_block.overlay_transparent_color()) {
          continue;
        }

        const vram_x = x_pixel + x;
        const vram_y = y_pixel + y;

        if (use_xor) {
          // XOR blend mode
          const existing = this.pixel(vram_x, vram_y);
          this.set_pixel(vram_x, vram_y, existing ^ pixel_index);
        } else {
          // Direct copy mode
          this.set_pixel(vram_x, vram_y, pixel_index);
        }
      }
    }
  }

  /**
   * Create a font block from a portion of a bitmap
   *
   * Extracts a 6×12 pixel region from a bitmap and creates a font block.
   * (Font blocks are 6 pixels wide × 12 pixels tall based on internal layout)
   * Used for converting bitmap content to CD+G tiles.
   *
   * @param bitmap BMP object to extract from
   * @param x_pixel Starting X pixel in bitmap (will be clamped to bitmap bounds)
   * @param y_pixel Starting Y pixel in bitmap (will be clamped to bitmap bounds)
   * @param x_tile X tile position in CD+G grid (0-49)
   * @param y_tile Y tile position in CD+G grid (0-15)
   * @returns New font block with extracted pixel data
   */
  create_font_block_from_bitmap(
    bitmap: CDGMagic_BMPObject,
    x_pixel: number,
    y_pixel: number,
    x_tile: number,
    y_tile: number
  ): CDGMagic_FontBlock {
    const font_block = new CDGMagic_FontBlock(x_tile, y_tile);
    font_block.overlay_transparent_color(bitmap.fill_index());

    // Extract 6×12 pixels from bitmap (font blocks are 6 wide, 12 tall)
    for (let fy = 0; fy < 12; fy++) {
      for (let fx = 0; fx < 6; fx++) {
        const bmp_x = x_pixel + fx;
        const bmp_y = y_pixel + fy;

        // Get pixel from bitmap (default to fill color if out of bounds)
        let pixel_value = bitmap.fill_index();
        if (
          bmp_x >= 0 &&
          bmp_x < bitmap.width() &&
          bmp_y >= 0 &&
          bmp_y < bitmap.height()
        ) {
          pixel_value = bitmap.pixel(bmp_x, bmp_y);
        }

        font_block.pixel_value(fx, fy, pixel_value);
      }
    }

    return font_block;
  }

  /**
   * Composite a bitmap into VRAM at specified position
   *
   * Tiles the bitmap (converting each 12×6 region to a font block)
   * and renders it to VRAM, respecting transparency and XOR mode.
   *
   * @param bitmap BMP object to composite
   * @param x_offset X pixel offset (default 0)
   * @param y_offset Y pixel offset (default 0)
   * @param use_xor If true, use XOR blend; if false, use direct copy
   */
  composite_bitmap_to_vram(
    bitmap: CDGMagic_BMPObject,
    x_offset: number = 0,
    y_offset: number = 0,
    use_xor: boolean = false
  ): void {
    // Iterate through tiles that overlap the bitmap
    for (let tile_y = 0; tile_y < CDGEncoding.TILES_HIGH; tile_y++) {
      for (let tile_x = 0; tile_x < CDGEncoding.TILES_WIDE; tile_x++) {
        const pixel_x = tile_x * CDGEncoding.TILE_WIDTH + x_offset;
        const pixel_y = tile_y * CDGEncoding.TILE_HEIGHT + y_offset;

        // Create font block from bitmap
        const font_block = this.create_font_block_from_bitmap(
          bitmap,
          pixel_x,
          pixel_y,
          tile_x,
          tile_y
        );

        // Render to VRAM
        this.render_font_block_to_vram(font_block, use_xor);
      }
    }
  }

  /**
   * Clear a composition layer
   *
   * @param layer_index Layer index (0-7)
   */
  clear_composition_layer(layer_index: number): void {
    if (layer_index >= 0 && layer_index < CDGEncoding.COMPOSITION_LAYERS) {
      this.internal_composition_buffers[layer_index]!.fill(0);
    }
  }

  /**
   * Clear all composition layers
   */
  clear_all_composition_layers(): void {
    for (let i = 0; i < CDGEncoding.COMPOSITION_LAYERS; i++) {
      this.clear_composition_layer(i);
    }
  }

  /**
   * Composite all layers into VRAM
   *
   * Merges composition layers (0-7) from back to front, with higher
   * layers taking precedence over lower ones. Non-zero pixels override
   * pixels from lower layers.
   */
  flatten_composition_layers(): void {
    this.internal_vram.fill(0);

    for (let layer = 0; layer < CDGEncoding.COMPOSITION_LAYERS; layer++) {
      const layer_data = this.internal_composition_buffers[layer]!;
      for (let i = 0; i < CDGEncoding.TOTAL_PIXELS; i++) {
        const layer_pixel = layer_data[i]!;
        if (layer_pixel !== 0) {
          this.internal_vram[i] = layer_pixel;
        }
      }
    }
  }

  /**
   * Encode current VRAM state as CD+G font block packets
   *
   * Scans VRAM and generates COPY_FONT packets for each non-empty tile.
   * This converts the pixel buffer to a packet stream representation.
   *
   * @param use_xor If true, use XOR_FONT (0x26); if false, use COPY_FONT (0x06)
   */
  encode_vram_as_packets(use_xor: boolean = false): void {
    // Process VRAM tile by tile
    for (let tile_y = 0; tile_y < CDGEncoding.TILES_HIGH; tile_y++) {
      for (let tile_x = 0; tile_x < CDGEncoding.TILES_WIDE; tile_x++) {
        const pixel_data = new Uint8Array(12);
        let has_content = false;

        // Extract 12×6 tile pixels and encode as 6-bit rows
        for (let row = 0; row < 6; row++) {
          let row_bits = 0;
          for (let col = 0; col < 12; col++) {
            const vram_x = tile_x * CDGEncoding.TILE_WIDTH + col;
            const vram_y = tile_y * CDGEncoding.TILE_HEIGHT + row;
            const pixel = this.pixel(vram_x, vram_y);

            // Check if pixel should be encoded
            if (pixel !== 0 && pixel !== this.internal_transparent_index) {
              row_bits |= 1 << col;
              has_content = true;
            }
          }
          pixel_data[row] = row_bits & 0x3f;
        }

        // Only emit packet if tile has content
        if (has_content) {
          if (use_xor) {
            this.xor_font(
              tile_x,
              tile_y,
              this.internal_transparent_index,
              0, // Color 1 unused in this context
              pixel_data
            );
          } else {
            this.copy_font(
              tile_x,
              tile_y,
              this.internal_transparent_index,
              0,
              pixel_data
            );
          }
        }
      }
    }
  }

  /**
   * Generate complete CD+G packet stream from media clips with event processing
   *
   * Implements the full event-processing pipeline from C++:
   * 1. Sort clips by start time
   * 2. For each clip, extract MediaEvent array
   * 3. Sort MediaEvents by start time (within clip)
   * 4. Process events in chronological order
   * 5. Emit event-level border/memory preset packets
   * 6. Render event content (bitmap to font blocks)
   * 7. Generate COPY_FONT/XOR_FONT packets
   *
   * Critical: Respects event.border_index and event.memory_preset_index
   * - Index value 16 = DISABLED (don't emit preset)
   * - Only emits when index < 16
   *
   * @param clips Array of MediaClip objects to encode
   * @returns Generated packet stream (CD_SCPacket array)
   */
  compute_graphics_from_clips(clips: any[]): CDGMagic_CDSCPacket[] {
    // Reset output stream
    this.clear_stream();

    // Emit global palette setup packets
    this.load_palette_lo(this.internal_palette);
    this.load_palette_hi(this.internal_palette);

    // Emit transparent color setting
    this.transparent_color(this.internal_transparent_index);

    // Sort clips by start pack time
    const sorted_clips = [...clips].sort((a, b) => {
      const aStart = a.start_pack?.() ?? 0;
      const bStart = b.start_pack?.() ?? 0;
      return aStart - bStart;
    });

    // Process each clip and its media events
    for (const clip of sorted_clips) {
      const clip_start_pack = clip.start_pack?.() ?? 0;
      const events = clip.events?.() ?? [];

      // Sort events within clip by start_offset
      const sorted_events = [...events].sort((a, b) => {
        return (a.start_offset ?? 0) - (b.start_offset ?? 0);
      });

      // Process each media event in the clip
      for (const event of sorted_events) {
        const event_pack = clip_start_pack + (event.start_offset ?? 0);

        // Emit event-specific border preset if set (index < 16)
        const border_idx = event.border_index ?? 16;
        if (border_idx < 16) {
          this.border_preset(border_idx);
        }

        // Emit event-specific memory preset if set (index < 16)
        const memory_idx = event.memory_preset_index ?? 16;
        if (memory_idx < 16) {
          this.memory_preset(memory_idx, 0);
        }

        // Handle scroll events
        const x_scroll = event.x_scroll ?? -1;
        const y_scroll = event.y_scroll ?? -1;

        // Special case: SCROLL(zero) packet for initialization
        if (x_scroll === 0 && y_scroll === 0) {
          // SCROLL_PRESET command - special initialization marker
          this.scroll_preset(0, 0);
        } else if (x_scroll >= 0 || y_scroll >= 0) {
          // Regular scroll command
          const sx = Math.max(0, Math.min(299, x_scroll ?? 0));
          const sy = Math.max(0, Math.min(191, y_scroll ?? 0));
          this.scroll_preset(sx, sy);
        }

        // TODO: Render BMPObject if present
        // This requires bmp_to_fontblocks converter and font block emission
        // if (event.BMPObject) {
        //   const font_blocks = bmp_to_fontblocks(event.BMPObject, event_pack);
        //   for (const fb of font_blocks) {
        //     this.copy_font(fb);
        //   }
        // }

        // TODO: Handle PALObject if present (palette transitions/dissolves)
        // if (event.PALObject) {
        //   // Emit palette transition packets
        // }
      }
    }

    // Fallback: encode current VRAM state as packets (for now)
    // This ensures basic rendering works even without BMP processing
    this.encode_vram_as_packets(false);

    return this.internal_cdg_stream;
  }

  /**
   * Main encoding orchestration method
   *
   * Converts media clips and bitmap content to a complete CD+G packet stream.
   * This is the primary public API for encoding graphics.
   *
   * High-level algorithm:
   * 1. Clear state (VRAM, palette, stream)
   * 2. Emit palette setup packets (LOAD_CLUT_LO, LOAD_CLUT_HI)
   * 3. Emit border and memory preset packets
   * 4. Iterate through events at scheduled pack times
   * 5. For each event, render its content (bitmap → tiles)
   * 6. Generate COPY_FONT/XOR_FONT packets for tile updates
   * 7. Return complete packet stream
   *
   * Note: This is a stub/template. Full implementation requires:
   * - Event scheduling and sorting by pack time
   * - MediaClip object iteration (Phase 6 dependency)
   * - Transition and effect handling
   * - Advanced composition algorithms
   *
   * @returns Generated packet stream (CD_SCPacket array)
   */
  compute_graphics(): CDGMagic_CDSCPacket[] {
    // Reset output stream
    this.clear_stream();

    // Emit palette setup packets
    this.load_palette_lo(this.internal_palette);
    this.load_palette_hi(this.internal_palette);

    // Emit border and memory preset
    this.border_preset(this.internal_border_index);
    this.memory_preset(0, 0); // Fill with color 0

    // Emit transparent color setting
    this.transparent_color(this.internal_transparent_index);

    // TODO: Event scheduling and clip rendering
    // This section requires:
    // - MediaClip array input
    // - Event sorting by pack time
    // - Per-event bitmap rendering

    // For now, encode current VRAM state as packets (useful for testing)
    this.encode_vram_as_packets(false);

    return this.internal_cdg_stream;
  }
}

// VIM: set ft=typescript :
// END