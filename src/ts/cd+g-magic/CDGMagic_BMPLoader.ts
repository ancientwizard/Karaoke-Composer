/**
 * CD+Graphics Magic - BMP Image Loader
 *
 * Loads and validates BMP image files for use in CD+G compositions.
 * Supports Windows v3.0 BMP format with 8-bit indexed color.
 * Extends BMPObject with file I/O and format validation.
 */

import fs from "fs";
import { CDGMagic_BMPObject } from "@/ts/cd+g-magic/CDGMagic_BMPObject";

/**
 * BMP loading error conditions
 */
export enum BMPLoaderError {
  NO_PATH = "NO_PATH",
  OPEN_FAIL = "OPEN_FAIL",
  TOO_LARGE = "TOO_LARGE",
  TOO_SMALL = "TOO_SMALL",
  NOT_BMP = "NOT_BMP",
  BAD_SIZE = "BAD_SIZE",
  BAD_OFFSET = "BAD_OFFSET",
  UNSUPPORTED_HEADER = "UNSUPPORTED_HEADER",
  TOO_WIDE = "TOO_WIDE",
  TOO_TALL = "TOO_TALL",
  INVALID_COLORPLANES = "INVALID_COLORPLANES",
  UNSUPPORTED_COLORDEPTH = "UNSUPPORTED_COLORDEPTH",
  UNSUPPORTED_COMPRESSION = "UNSUPPORTED_COMPRESSION",
  UNSUPPORTED_PALETTE = "UNSUPPORTED_PALETTE",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

/**
 * BMP Loader - Load and validate BMP image files
 *
 * Extends BMPObject to add file I/O and format validation.
 * Supports Windows v3.0 BMP format only (40-byte header).
 * Validates file integrity and CD+G constraints.
 */
export class CDGMagic_BMPLoader extends CDGMagic_BMPObject {
  private internal_filepath: string;
  private internal_file_size: number = 0;

  /**
   * Load BMP file from path
   *
   * Validates BMP format and dimensions. Throws error if validation fails.
   * Supports Windows v3.0 BMP format (40-byte header) with 8-bit indexed color.
   *
   * @param file_path Path to BMP file
   * @throws {BMPLoaderError} If file cannot be loaded or is invalid
   */
  constructor(file_path: string) {
    super();
    this.internal_filepath = file_path;

    // Validate path provided
    if (!file_path || file_path.length === 0) {
      throw new Error(BMPLoaderError.NO_PATH);
    }

    // In Node.js environment, load file data
    // In browser environment, this would use File API
    try {
      this.load_from_path(file_path);
    } catch (error) {
      // Always re-throw the original error with its true message
      if (error instanceof Error) {
        throw error;
      }
      // Only wrap if it's not an Error object
      throw new Error(String(error));
    }
  }

  /**
   * Load and parse BMP file from filesystem
   *
   * @param file_path Path to BMP file
   * @throws {BMPLoaderError} If file cannot be loaded or validated
   * @private
   */
  private load_from_path(file_path: string): void {
    // Try to use Node.js fs module if available
    let data: Buffer | undefined;

    try {
      data = fs.readFileSync(file_path);
    } catch (e) {
      throw new Error(BMPLoaderError.OPEN_FAIL);
    }

    if (!data) {
      throw new Error(BMPLoaderError.OPEN_FAIL);
    }

    // Parse BMP data (may throw BMPLoaderError for invalid format)
    this.parse_bmp_data(data);
  }

  /**
   * Parse and validate BMP format
   *
   * @param data Buffer containing BMP file data
   * @throws {BMPLoaderError} If BMP format is invalid
   * @private
   */
  private parse_bmp_data(data: Buffer): void {
    // Check file size constraints
    if (data.length > 10000000) {
      throw new Error(BMPLoaderError.TOO_LARGE);
    }
    if (data.length < 100) {
      throw new Error(BMPLoaderError.TOO_SMALL);
    }

    this.internal_file_size = data.length;

    // Check BMP signature
    if (data[0] !== 0x42 || data[1] !== 0x4d) {
      // 'B' and 'M'
      throw new Error(BMPLoaderError.NOT_BMP);
    }

    // Get file size from header (little-endian)
    const header_file_size = this.read_uint32_le(data, 0x02);
    if (header_file_size !== this.internal_file_size) {
      throw new Error(BMPLoaderError.BAD_SIZE);
    }

    // Get pixel data offset (little-endian)
    const data_offset = this.read_uint32_le(data, 0x0a);
    if (data_offset >= this.internal_file_size) {
      throw new Error(BMPLoaderError.BAD_OFFSET);
    }

    // Get header size (little-endian)
    const header_size = this.read_uint32_le(data, 0x0e);
    if (header_size !== 40) {
      throw new Error(BMPLoaderError.UNSUPPORTED_HEADER);
    }

    // Get image width (signed little-endian)
    const bmp_width = this.read_int32_le(data, 0x12);
    if (bmp_width > 320) {
      throw new Error(BMPLoaderError.TOO_WIDE);
    }
    if (bmp_width < 1) {
      throw new Error(BMPLoaderError.TOO_WIDE);
    }

    // Get image height (signed little-endian)
    const bmp_height = this.read_int32_le(data, 0x16);
    // CD+G screen is 216 pixels tall, so allow heights up to 216
    // (some BMPs may be slightly larger for compositing/masking)
    if (Math.abs(bmp_height) > 240) {
      throw new Error(BMPLoaderError.TOO_TALL);
    }
    if (Math.abs(bmp_height) < 1) {
      throw new Error(BMPLoaderError.TOO_TALL);
    }

    // Get color planes
    const color_planes = this.read_uint16_le(data, 0x1a);
    if (color_planes !== 1) {
      throw new Error(BMPLoaderError.INVALID_COLORPLANES);
    }

    // Get color depth
    const color_depth = this.read_uint16_le(data, 0x1c);
    if (color_depth !== 8) {
      throw new Error(BMPLoaderError.UNSUPPORTED_COLORDEPTH);
    }

    // Get compression type (must be 0 for uncompressed)
    const compression = this.read_uint32_le(data, 0x1e);
    if (compression !== 0) {
      throw new Error(BMPLoaderError.UNSUPPORTED_COMPRESSION);
    }

    // Validate palette size (should be 256 for 8-bit)
    const palette_size = this.read_uint32_le(data, 0x2e);
    if (palette_size !== 0 && palette_size !== 256) {
      throw new Error(BMPLoaderError.UNSUPPORTED_PALETTE);
    }

    // Validate sufficient data for image
    const pixel_data_size = Math.abs(bmp_height) * bmp_width;
    if (data.length - data_offset < pixel_data_size) {
      throw new Error(BMPLoaderError.INSUFFICIENT_DATA);
    }

    // Load palette data from BMP into PALObject
    this.load_palette_from_bmp(data);

    // Store BMP data for later use
    this.store_bmp_data(data, data_offset, bmp_width, Math.abs(bmp_height));
  }

  /**
   * Store BMP pixel data in BMPObject
   *
   * BMP format stores pixels bottom-to-top, so we invert Y coordinates
   * during loading to match standard image orientation (top-to-bottom).
   *
   * Mirrors C++ reference: CDGMagic_BMPLoader.cpp line 208
   *   bmp_buffer[cur_x + (bmp_height-cur_y-1)*aligned_width]
   *
   * @param data Full BMP file buffer
   * @param data_offset Offset to pixel data
   * @param width Image width
   * @param height Image height
   * @private
   */
  private store_bmp_data(data: Buffer, data_offset: number, width: number, height: number): void {
    // Create pixel buffer with Y-axis inversion
    // BMP files store pixels bottom-to-top, so map BMP row (height-y-1) to pixel row y
    const pixels = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      // Map Y coordinate: file row (height-y-1) → output row y
      const bmp_row = height - y - 1;
      const src_offset = data_offset + bmp_row * width;
      const dst_offset = y * width;

      for (let x = 0; x < width && src_offset + x < data.length; x++) {
        pixels[dst_offset + x] = data[src_offset + x];
      }
    }

    // Store in parent BMPObject
    // Allocate buffer and set dimensions
    this.alter_buffer_size(width, height);

    // Copy pixel data into allocated buffer using protected setter
    this.set_pixel_data(pixels);
  }

  /**
   * Load BMP palette into PALObject
   *
   * Reads 256-color palette from BMP header (starting at offset 0x36).
   * Each BMP color is 4 bytes: B, G, R, reserved (0).
   * Converts to 32-bit RGBA format for PALObject storage.
   *
   * @param data BMP file buffer
   * @private
   */
  private load_palette_from_bmp(data: Buffer): void {
    const palette_offset = 0x36; // Standard BMP palette location
    const pal_obj = this.PALObject();

    // Load up to 256 colors (BMP uses BGR format)
    for (let i = 0; i < 256 && palette_offset + i * 4 + 3 < data.length; i++) {
      const offset = palette_offset + i * 4;
      const b_8bit = data[offset] || 0;
      const g_8bit = data[offset + 1] || 0;
      const r_8bit = data[offset + 2] || 0;
      // Reserved byte at offset + 3 is ignored

      // Store as 32-bit RGBA (RRGGBBAA format where AA=FF for full opacity)
      const rgba = (r_8bit << 24) | (g_8bit << 16) | (b_8bit << 8) | 0xFF;
      pal_obj.color(i, rgba);
    }
  }

  /**
   * Extract palette in CD+G 6-bit format
   *
   * CONSUMERS (will be retired with CLI):
   * - bin/render-cdg.ts: Used to extract palette for CDG export
   * - src/tests/cd+g-magic/multiEventTextClips.test.ts: Used in palette testing
   *
   * Converts loaded BMP palette from 8-bit RGB to 6-bit CD+G format.
   * CD+G uses 6 bits per color channel (0-63 instead of 0-255).
   * Returns up to 16 colors (CD+G limit), padded with black.
   *
   * @returns Array of 16 [R, G, B] tuples in 6-bit CD+G format
   */
  get_palette_6bit(): Array<[number, number, number]>
  {
    const pal_obj = this.PALObject();
    const palette: Array<[number, number, number]> = [];

    for (let i = 0; i < 16; i++) {
      const rgba = pal_obj.color(i);

      // Extract 8-bit channels from RRGGBBAA format
      const r_8bit = (rgba >> 24) & 0xFF;
      const g_8bit = (rgba >> 16) & 0xFF;
      const b_8bit = (rgba >> 8) & 0xFF;

      // Convert 8-bit to 6-bit by scaling
      const r_6bit = Math.round((r_8bit / 255) * 63);
      const g_6bit = Math.round((g_8bit / 255) * 63);
      const b_6bit = Math.round((b_8bit / 255) * 63);

      palette.push([r_6bit, g_6bit, b_6bit]);
    }

    return palette;
  }

  /**
   * Get pixel data in rendering format (8-bit indexed color)
   *
   * CONSUMER (will be retired with CLI):
   * - src/ts/cd+g-magic/CDGMagic_CDGExporter.ts: Used to render BMP clips to screen
   *
   * Returns raw pixel data indexed into palette for efficient rendering.
   * Palette colors are stored as 8-bit RGB (as read from BMP file).
   *
   * @returns Uint8Array of pixel data (width × height bytes)
   */
  get_pixel_data(): Uint8Array {
    // Return the actual bitmap data stored in parent class
    const bitmapData = this.get_bitmap_data();
    return bitmapData || new Uint8Array(0);
  }

  /**
   * Get palette in 8-bit RGB format (for rendering, not CD+G encoding)
   *
   * CONSUMER (will be retired with CLI):
   * - src/ts/cd+g-magic/CDGMagic_CDGExporter.ts: Used to render BMP clips to screen
   *
   * Returns palette as 8-bit RGB tuples. Converts from internal 32-bit RGBA storage.
   * Pads to 16 colors minimum (CD+G requirement).
   *
   * @returns Array of [R, G, B] tuples in 8-bit format
   */
  get_palette_8bit(): Array<[number, number, number]> {
    const pal_obj = this.PALObject();
    const palette: Array<[number, number, number]> = [];

    for (let i = 0; i < 256; i++) {
      const rgba = pal_obj.color(i);

      // Extract 8-bit channels from RRGGBBAA format
      const r_8bit = (rgba >> 24) & 0xFF;
      const g_8bit = (rgba >> 16) & 0xFF;
      const b_8bit = (rgba >> 8) & 0xFF;

      palette.push([r_8bit, g_8bit, b_8bit]);
    }

    // Ensure at least 16 colors
    while (palette.length < 16) {
      palette.push([0, 0, 0]);
    }

    return palette;
  }

  /**
   * Get loaded file path
   *
   * @returns Path to BMP file
   */
  file_path(): string {
    return this.internal_filepath;
  }

  /**
   * Get loaded image width
   *
   * @returns Image width in pixels
   */
  width(): number {
    return super.width();
  }

  /**
   * Get loaded image height
   *
   * @returns Image height in pixels
   */
  height(): number {
    return super.height();
  }

  /**
   * Convert error code to human-readable message
   *
   * @param error Error code or message
   * @returns Human-readable error description
   */
  static error_to_text(error: string | BMPLoaderError): string {
    const error_messages: Record<string, string> = {
      [BMPLoaderError.NO_PATH]: "No file path provided",
      [BMPLoaderError.OPEN_FAIL]: "Failed to open file",
      [BMPLoaderError.TOO_LARGE]: "File too large (max 10MB)",
      [BMPLoaderError.TOO_SMALL]: "File too small",
      [BMPLoaderError.NOT_BMP]: "File is not a valid BMP",
      [BMPLoaderError.BAD_SIZE]: "File size mismatch in BMP header",
      [BMPLoaderError.BAD_OFFSET]: "Invalid pixel data offset",
      [BMPLoaderError.UNSUPPORTED_HEADER]: "BMP header format not supported (requires Windows v3.0)",
      [BMPLoaderError.TOO_WIDE]: "Image width exceeds CD+G limits (max 320 pixels)",
      [BMPLoaderError.TOO_TALL]: "Image height exceeds CD+G limits (max 200 pixels)",
      [BMPLoaderError.INVALID_COLORPLANES]: "Invalid color planes (must be 1)",
      [BMPLoaderError.UNSUPPORTED_COLORDEPTH]: "Unsupported color depth (requires 8-bit indexed)",
      [BMPLoaderError.UNSUPPORTED_COMPRESSION]: "Compression not supported (requires uncompressed)",
      [BMPLoaderError.UNSUPPORTED_PALETTE]: "Invalid palette size",
      [BMPLoaderError.INSUFFICIENT_DATA]: "Insufficient pixel data in file",
    };

    return error_messages[error] || "Unknown error";
  }

  /**
   * Read 16-bit little-endian unsigned integer
   *
   * @param data Buffer
   * @param offset Offset in buffer
   * @returns Value
   * @private
   */
  private read_uint16_le(data: Buffer, offset: number): number {
    return data[offset] | (data[offset + 1] << 8);
  }

  /**
   * Read 32-bit little-endian unsigned integer
   *
   * @param data Buffer
   * @param offset Offset in buffer
   * @returns Value
   * @private
   */
  private read_uint32_le(data: Buffer, offset: number): number {
    return (
      data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    );
  }

  /**
   * Read 32-bit little-endian signed integer
   *
   * @param data Buffer
   * @param offset Offset in buffer
   * @returns Value
   * @private
   */
  private read_int32_le(data: Buffer, offset: number): number {
    const value = this.read_uint32_le(data, offset);
    // Convert to signed if negative
    return value > 0x7fffffff ? value - 0x100000000 : value;
  }
}

// VIM: set ft=typescript :
// END