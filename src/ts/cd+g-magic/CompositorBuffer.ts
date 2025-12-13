/**
 * CompositorBuffer - Multi-layer compositing engine for CD+G
 *
 * Implements the C++ CD+Graphics Magic compositor architecture:
 * - 8 layers (tracks/z-positions)
 * - Each pixel stores color index (0-255) or transparency (256)
 * - Compositing reads from top-most opaque layer
 * - Used for blending overlapping clips (BMPClips, TextClips, etc.)
 */

/**
 * CompositorBuffer: Manages multi-layer pixel composition
 *
 * Architecture:
 * - Buffer size: width × height × COMP_LAYERS
 * - Each pixel: 0-255 = opaque palette index, 256 = transparent
 * - Layer 0 = bottom (rendered first), Layer 7 = top (rendered last)
 * - Compositing: Read from top-most opaque layer, fall back to preset if all transparent
 *
 * Corresponds to C++ CDGMagic_GraphicsEncoder member variables:
 * - comp_buffer
 * - comp_width, comp_height
 * - COMP_LAYERS = 8
 */
export
class CompositorBuffer {
  // Configuration
  private width: number;
  private height: number;
  private static readonly COMP_LAYERS = 8;
  private static readonly TRANSPARENCY = 256;  // Pixel value representing transparency

  // The actual buffer: 3D array stored as 1D
  // Offset = (z * (width * height)) + (y * width) + x
  private buffer: Uint16Array;

  // Background color (fallback when all layers transparent)
  private last_preset_index: number = 0;

  /**
   * Create compositor buffer
   *
   * @param width Buffer width in pixels (300 for standard CD+G)
   * @param height Buffer height in pixels (216 for standard CD+G)
   */
  constructor(width: number = 300, height: number = 216) {
    this.width = width;
    this.height = height;

    // Allocate buffer: width × height × 8 layers
    const total_size = width * height * CompositorBuffer.COMP_LAYERS;
    this.buffer = new Uint16Array(total_size);

    // Initialize to transparency
    this.clear();
  }

  /**
   * Clear all layers to transparent
   */
  public clear(): void {
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = CompositorBuffer.TRANSPARENCY;
    }
  }

  /**
   * Set background color (used when all layers are transparent)
   *
   * @param preset_index Palette index (0-15 for TV Graphics)
   */
  public set_preset_index(preset_index: number): void {
    this.last_preset_index = preset_index;
  }

  /**
   * Get background color (preset index)
   *
   * @returns Palette index (0-15 for TV Graphics)
   */
  public get_preset_index(): number {
    return this.last_preset_index;
  }

  /**
   * Write pixel to specific layer
   *
   * @param x X coordinate (0 to width-1)
   * @param y Y coordinate (0 to height-1)
   * @param z Layer/track index (0-7)
   * @param color_index Palette index (0-255) or TRANSPARENCY (256)
   */
  public write_pixel(x: number, y: number, z: number, color_index: number): void {
    // Bounds check
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;  // Out of bounds
    }
    if (z < 0 || z >= CompositorBuffer.COMP_LAYERS) {
      return;  // Invalid layer
    }

    // Calculate offset in linear buffer
    const layer_offset = z * (this.width * this.height);
    const pixel_offset = y * this.width + x;
    const final_offset = layer_offset + pixel_offset;

    // Write the color
    this.buffer[final_offset] = color_index;
  }

  /**
   * Read composited pixel value (highest opaque layer)
   *
   * Compositing algorithm:
   * 1. Start with background (last_preset_index)
   * 2. For each layer 0-7 (bottom to top):
   *    - If pixel is opaque (< 256), use it (override previous)
   * 3. Return the result
   *
   * @param x X coordinate (0 to width-1)
   * @param y Y coordinate (0 to height-1)
   * @returns Palette index (0-255) or preset index if all transparent
   */
  public read_composited_pixel(x: number, y: number): number {
    // Bounds check
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return this.last_preset_index;  // Out of bounds = background
    }

    // Start with background
    let result = this.last_preset_index;

    // For each layer (0=bottom, 7=top)
    for (let z = 0; z < CompositorBuffer.COMP_LAYERS; z++) {
      const layer_offset = z * (this.width * this.height);
      const pixel_offset = y * this.width + x;
      const final_offset = layer_offset + pixel_offset;

      const layer_pixel = this.buffer[final_offset];

      // If opaque (< 256), use it; if transparent (256), keep current
      if (layer_pixel < CompositorBuffer.TRANSPARENCY) {
        result = layer_pixel;
      }
    }

    return result;
  }

  /**
   * Read entire block from composited result (for tile extraction)
   *
   * Used to extract a 6×12 pixel block for CDG tile rendering.
   * Each block is rendered as a 6×12 pixel tile in the final output.
   *
   * @param block_x X coordinate in tiles (0-49)
   * @param block_y Y coordinate in tiles (0-17)
   * @returns 72-element Uint16Array (6×12 pixels, one per element)
   */
  public read_composited_block(block_x: number, block_y: number): Uint16Array {
    const result = new Uint16Array(72);  // 6×12 pixels
    let idx = 0;

    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < 6; px++) {
        const pixel_x = block_x * 6 + px;
        const pixel_y = block_y * 12 + py;
        result[idx++] = this.read_composited_pixel(pixel_x, pixel_y);
      }
    }

    return result;
  }

  /**
   * Write entire block to specific layer
   *
   * Used to render a 6×12 pixel tile to a specific layer.
   *
   * @param block_x X coordinate in tiles (0-49)
   * @param block_y Y coordinate in tiles (0-17)
   * @param z Layer/track index (0-7)
   * @param pixel_data 72-element Uint16Array (values 0-255=opaque, 256=transparent)
   */
  public write_block(
    block_x: number,
    block_y: number,
    z: number,
    pixel_data: Uint16Array
  ): void {
    if (pixel_data.length !== 72) {
      console.warn(`[CompositorBuffer.write_block] Invalid pixel_data length: ${pixel_data.length}, expected 72`);
      return;
    }

    let idx = 0;
    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < 6; px++) {
        const pixel_x = block_x * 6 + px;
        const pixel_y = block_y * 12 + py;
        const color = pixel_data[idx++];
        this.write_pixel(pixel_x, pixel_y, z, color);
      }
    }
  }

  /**
   * Get width in pixels
   */
  public get_width(): number {
    return this.width;
  }

  /**
   * Get height in pixels
   */
  public get_height(): number {
    return this.height;
  }

  /**
   * Get width in blocks (tiles)
   */
  public get_width_blocks(): number {
    return Math.ceil(this.width / 6);
  }

  /**
   * Get height in blocks (tiles)
   */
  public get_height_blocks(): number {
    return Math.ceil(this.height / 12);
  }

  /**
   * Get number of layers
   */
  public static get_num_layers(): number {
    return CompositorBuffer.COMP_LAYERS;
  }

  /**
   * Get transparency value
   */
  public static get_transparency(): number {
    return CompositorBuffer.TRANSPARENCY;
  }
}

// VIM: ts=2 sw=2 et
// END
