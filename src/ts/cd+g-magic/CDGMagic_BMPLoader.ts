/**
 * CD+Graphics Magic - BMP Image Loader
 *
 * Loads and validates BMP image files for use in CD+G compositions.
 * Supports Windows v3.0 BMP format with 8-bit indexed color.
 * Extends BMPObject with file I/O and format validation.
 */

import { CDGMagic_BMPObject } from "./CDGMagic_BMPObject";

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
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(BMPLoaderError.OPEN_FAIL);
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require("fs");
      data = fs.readFileSync(file_path);
    } catch {
      throw new Error(BMPLoaderError.OPEN_FAIL);
    }

    if (!data) {
      throw new Error(BMPLoaderError.OPEN_FAIL);
    }

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
    if (Math.abs(bmp_height) > 200) {
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

    // Store BMP data for later use
    this.store_bmp_data(data, data_offset, bmp_width, Math.abs(bmp_height));
  }

  /**
   * Store BMP pixel data in BMPObject
   *
   * @param data Full BMP file buffer
   * @param data_offset Offset to pixel data
   * @param width Image width
   * @param height Image height
   * @private
   */
  private store_bmp_data(data: Buffer, data_offset: number, width: number, height: number): void {
    // Create pixel buffer (copy only pixel data)
    const pixel_size = width * height;
    const pixels = new Uint8Array(pixel_size);

    let pixel_idx = 0;
    for (let i = 0; i < pixel_size && data_offset + i < data.length; i++) {
      pixels[pixel_idx++] = data[data_offset + i];
    }

    // Store in parent BMPObject
    // Note: BMPObject expects pixel data in specific format
    // For now, we store dimensions for reference
    (this as any).internal_width = width;
    (this as any).internal_height = height;
    (this as any).internal_pixel_data = pixels;
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
