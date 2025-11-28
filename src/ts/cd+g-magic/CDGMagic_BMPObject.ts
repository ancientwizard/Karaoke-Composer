/**
 * CD+Graphics Magic - Bitmap Object
 *
 * Manages raster image data with palette association, pixel manipulation,
 * and transition/animation support for CD+G composition.
 */

import { CDGMagic_PALObject } from "@/ts/cd+g-magic/CDGMagic_PALObject";

/**
 * Bitmap Object: Raster image data with palette management
 *
 * Stores pixel data indexed into a color palette. Supports:
 * - Arbitrary width/height bitmaps
 * - Pixel-level get/set operations
 * - Palette association and color lookups
 * - Transition blocks for animation timing
 * - XOR compositing mode
 * - Fill/background color
 *
 * Used for rendering graphics objects in CD+G composition.
 */
export class CDGMagic_BMPObject {
  private internal_bmp_width: number;           // Image width in pixels
  private internal_bmp_height: number;          // Image height in pixels
  private internal_bmp_data: Uint8Array | null; // Pixel data (indexed color)
  private internal_palette: CDGMagic_PALObject; // Palette for color lookup
  private internal_x_offset: number;            // X position offset
  private internal_y_offset: number;            // Y position offset
  private internal_fill_index: number;          // Background/fill color index
  private internal_xor_only: number;            // XOR mode flag (0 or 1)
  private internal_should_composite: number;    // Composite flag (0 or 1)
  private internal_composite_index: number;     // Composite color index
  private internal_xor_bandwidth: number;       // XOR effect width (pixels)
  private internal_draw_delay: number;          // Rendering delay in milliseconds
  private internal_transition_blocks: Uint8Array; // Transition animation blocks (768 entries × 2 bytes)
  private internal_transition_length: number;     // Number of active transition blocks
  private internal_transition_file: string | null; // Path to custom transition file

  /**
   * Constructor: Create a new bitmap object
   *
   * @param requested_width Initial bitmap width (0 = no allocation)
   * @param requested_height Initial bitmap height (0 = no allocation)
   */
  constructor(requested_width: number = 0, requested_height: number = 0) {
    this.internal_bmp_width = 0;
    this.internal_bmp_height = 0;
    this.internal_bmp_data = null;
    this.internal_x_offset = 0;
    this.internal_y_offset = 0;
    this.internal_fill_index = 0;
    this.internal_xor_only = 0;
    this.internal_should_composite = 0;
    this.internal_composite_index = 0;
    this.internal_xor_bandwidth = 3.0;
    this.internal_draw_delay = 0;

    // Create default transition: top-to-bottom, left-to-right sweep
    // 768 blocks = 48 columns × 16 rows (standard CD+G grid)
    this.internal_transition_blocks = new Uint8Array(768 * 2);
    this.internal_transition_length = 768;
    for (let cur_blk = 0; cur_blk < 768; cur_blk++) {
      this.internal_transition_blocks[cur_blk * 2 + 0] = Math.floor(cur_blk / 16) + 1; // X: 1-48
      this.internal_transition_blocks[cur_blk * 2 + 1] = (cur_blk % 16) + 1;             // Y: 1-16
    }

    this.internal_transition_file = null;

    // Create a new palette object
    this.internal_palette = new CDGMagic_PALObject();

    // Allocate bitmap buffer
    this.alter_buffer_size(requested_width, requested_height);
  }

  /**
   * Get bitmap width in pixels
   * @returns Width (0 if no allocation)
   */
  width(): number {
    return this.internal_bmp_width;
  }

  /**
   * Get bitmap height in pixels
   * @returns Height (0 if no allocation)
   */
  height(): number {
    return this.internal_bmp_height;
  }

  /**
   * Reallocate bitmap buffer to new dimensions
   *
   * Only reallocates if size changes. Max 8MB for safety.
   *
   * @param requested_width New width
   * @param requested_height New height
   */
  alter_buffer_size(requested_width: number, requested_height: number): void {
    // Skip if already correct size
    if (this.internal_bmp_width === requested_width && this.internal_bmp_height === requested_height) {
      return;
    }

    // Calculate required memory
    const size_of_data = requested_width * requested_height;

    // Allocate only if reasonable size (>0 and <8MB)
    if (size_of_data > 0 && size_of_data <= 0x800000) {
      // Delete previous allocation
      this.internal_bmp_data = null;

      // Allocate new buffer
      this.internal_bmp_data = new Uint8Array(size_of_data);

      // Set dimensions
      this.internal_bmp_width = requested_width;
      this.internal_bmp_height = requested_height;
    } else if (size_of_data > 0) {
      console.warn(
        `CDGMagic_BMPObject: Buffer allocation failed (too large). w: ${requested_width}, h: ${requested_height}, size: ${size_of_data}`
      );
    }

    // Force zero dimensions if requested
    if (requested_width === 0) this.internal_bmp_width = 0;
    if (requested_height === 0) this.internal_bmp_height = 0;
  }

  /**
   * Get pixel color at x,y coordinates
   * @param requested_x X coordinate
   * @param requested_y Y coordinate
   * @returns Color index (or fill_index if out of bounds)
   */
  pixel(requested_x: number, requested_y: number): number;
  /**
   * Set pixel color at x,y coordinates
   * @param requested_x X coordinate
   * @param requested_y Y coordinate
   * @param requested_index Color index to set
   */
  pixel(requested_x: number, requested_y: number, requested_index: number): void;
  pixel(requested_x: number, requested_y: number, requested_index?: number): number | void {
    if (requested_index === undefined) {
      // Getter
      if (
        this.internal_bmp_data &&
        requested_x < this.internal_bmp_width &&
        requested_y < this.internal_bmp_height
      ) {
        return this.internal_bmp_data[requested_x + requested_y * this.internal_bmp_width];
      }
      return this.internal_fill_index;
    } else {
      // Setter
      if (
        this.internal_bmp_data &&
        requested_x < this.internal_bmp_width &&
        requested_y < this.internal_bmp_height
      ) {
        this.internal_bmp_data[requested_x + requested_y * this.internal_bmp_width] = requested_index;
      }
    }
  }

  /**
   * Get pixel color by linear index
   *
   * Linear index = y * width + x
   *
   * @param requested_pixel Linear index into pixel array
   * @returns Color index (or fill_index if out of bounds)
   */
  linear_pixel(requested_pixel: number): number;
  /**
   * Set pixel color by linear index
   *
   * @param requested_pixel Linear index
   * @param requested_index Color index to set
   */
  linear_pixel(requested_pixel: number, requested_index: number): void;
  linear_pixel(requested_pixel: number, requested_index?: number): number | void {
    const max_pixels = this.internal_bmp_width * this.internal_bmp_height;

    if (requested_index === undefined) {
      // Getter
      if (this.internal_bmp_data && requested_pixel < max_pixels) {
        return this.internal_bmp_data[requested_pixel];
      }
      return this.internal_fill_index;
    } else {
      // Setter
      if (this.internal_bmp_data && requested_pixel < max_pixels) {
        this.internal_bmp_data[requested_pixel] = requested_index;
      }
    }
  }

  /**
   * Get RGBA color value for pixel at x,y
   *
   * Convenience function: combines pixel lookup with palette lookup
   *
   * @param requested_x X coordinate
   * @param requested_y Y coordinate
   * @returns 32-bit RGBA color value
   */
  get_rgb_pixel(requested_x: number, requested_y: number): number {
    const palette_index = this.pixel(requested_x, requested_y);
    return this.internal_palette.color(palette_index);
  }

  /**
   * Get reference to palette object
   * @returns PALObject for color management
   */
  PALObject(): CDGMagic_PALObject {
    return this.internal_palette;
  }

  /**
   * Get fill/background color index
   * @returns Color index used for out-of-bounds pixels
   */
  fill_index(): number;
  /**
   * Set fill/background color index
   * @param requested_index Color index (0-255)
   */
  fill_index(requested_index: number): void;
  fill_index(requested_index?: number): number | void {
    if (requested_index === undefined) {
      return this.internal_fill_index;
    } else {
      this.internal_fill_index = requested_index;
    }
  }

  /**
   * Get XOR-only mode flag
   * @returns 1 if XOR mode enabled, 0 otherwise
   */
  xor_only(): number;
  /**
   * Set XOR-only mode flag
   * @param requested_setting 1 to enable, 0 to disable
   */
  xor_only(requested_setting: number): void;
  xor_only(requested_setting?: number): number | void {
    if (requested_setting === undefined) {
      return this.internal_xor_only;
    } else {
      this.internal_xor_only = requested_setting ? 1 : 0;
    }
  }

  /**
   * Get should-composite flag
   * @returns 1 if compositing enabled, 0 otherwise
   */
  should_composite(): number;
  /**
   * Set should-composite flag
   * @param requested_setting 1 to enable, 0 to disable
   */
  should_composite(requested_setting: number): void;
  should_composite(requested_setting?: number): number | void {
    if (requested_setting === undefined) {
      return this.internal_should_composite;
    } else {
      this.internal_should_composite = requested_setting ? 1 : 0;
    }
  }

  /**
   * Get composite color index
   * @returns Color index for compositing
   */
  composite_index(): number;
  /**
   * Set composite color index
   * @param requested_index Color index (0-255)
   */
  composite_index(requested_index: number): void;
  composite_index(requested_index?: number): number | void {
    if (requested_index === undefined) {
      return this.internal_composite_index;
    } else {
      this.internal_composite_index = requested_index;
    }
  }

  /**
   * Get X offset
   * @returns Horizontal position offset
   */
  x_offset(): number;
  /**
   * Set X offset
   * @param requested_x_offset Horizontal offset
   */
  x_offset(requested_x_offset: number): void;
  x_offset(requested_x_offset?: number): number | void {
    if (requested_x_offset === undefined) {
      return this.internal_x_offset;
    } else {
      this.internal_x_offset = requested_x_offset;
    }
  }

  /**
   * Get Y offset
   * @returns Vertical position offset
   */
  y_offset(): number;
  /**
   * Set Y offset
   * @param requested_y_offset Vertical offset
   */
  y_offset(requested_y_offset: number): void;
  y_offset(requested_y_offset?: number): number | void {
    if (requested_y_offset === undefined) {
      return this.internal_y_offset;
    } else {
      this.internal_y_offset = requested_y_offset;
    }
  }

  /**
   * Get XOR bandwidth (effect width)
   * @returns Bandwidth in pixels (minimum 1.0)
   */
  xor_bandwidth(): number;
  /**
   * Set XOR bandwidth
   * @param requested_bandwidth Bandwidth (will be clamped to ≥1.0)
   */
  xor_bandwidth(requested_bandwidth: number): void;
  xor_bandwidth(requested_bandwidth?: number): number | void {
    if (requested_bandwidth === undefined) {
      return this.internal_xor_bandwidth;
    } else {
      this.internal_xor_bandwidth = Math.max(1.0, requested_bandwidth);
    }
  }

  /**
   * Get draw delay
   * @returns Delay in milliseconds
   */
  draw_delay(): number;
  /**
   * Set draw delay
   * @param requested_delay Delay in milliseconds
   */
  draw_delay(requested_delay: number): void;
  draw_delay(requested_delay?: number): number | void {
    if (requested_delay === undefined) {
      return this.internal_draw_delay;
    } else {
      this.internal_draw_delay = requested_delay;
    }
  }

  /**
   * Get transition block count
   * @returns Number of active transition blocks
   */
  transition_length(): number {
    return this.internal_transition_length;
  }

  /**
   * Get transition block location (X or Y)
   *
   * @param requested_block_num Block index (0-767)
   * @param x_or_y 0 for X coordinate, non-zero for Y
   * @returns Block location (1-48 for X, 1-16 for Y)
   */
  transition_block(requested_block_num: number, x_or_y: number): number {
    // Bounds check
    if (requested_block_num < 0 || requested_block_num >= this.internal_transition_length) {
      return 0;
    }

    const block_offset = requested_block_num * 2;
    const xy_offset = x_or_y !== 0 ? 1 : 0;
    return this.internal_transition_blocks[block_offset + xy_offset];
  }

  /**
   * Set transition from row mask
   *
   * Creates transition pattern from bitmask of rows (1-16).
   * Columns processed in order 1-48.
   *
   * @param requested_row_mask Bitmask of active rows
   */
  transition_row_mask(requested_row_mask: number): void {
    this.internal_transition_length = 0;

    for (let current_column = 1; current_column < 49; current_column++) {
      for (let current_row = 1; current_row < 17; current_row++) {
        if ((requested_row_mask >> current_row) & 0x01) {
          this.internal_transition_blocks[this.internal_transition_length * 2 + 0] = current_column;
          this.internal_transition_blocks[this.internal_transition_length * 2 + 1] = current_row;
          this.internal_transition_length++;
        }
      }
    }

    // Clear file reference
    this.internal_transition_file = null;
  }

  /**
   * Get transition file path
   * @returns Path to transition file, or null if not set
   */
  transition_file(): string | null;
  /**
   * Set transition from file
   *
   * Loads 1536-byte transition file (768 blocks × 2 bytes each).
   * If file is null, resets to default transition.
   *
   * @param selected_file Path to file, or null for default
   * @returns 0 on success, 1 on error
   */
  transition_file(selected_file: string | null): number;
  transition_file(selected_file?: string | null): string | null | number {
    if (selected_file === undefined) {
      // Getter
      return this.internal_transition_file;
    } else {
      // Setter
      if (selected_file === null) {
        // Reset to default transition
        this.internal_transition_length = 768;
        for (let cur_blk = 0; cur_blk < 768; cur_blk++) {
          this.internal_transition_blocks[cur_blk * 2 + 0] = Math.floor(cur_blk / 16) + 1;
          this.internal_transition_blocks[cur_blk * 2 + 1] = (cur_blk % 16) + 1;
        }
        this.internal_transition_file = null;
        return 0;
      }

      // Note: File I/O would require Node.js fs module or similar
      // For browser/portable code, this would need to be async
      // For now, we'll stub it - implementation depends on runtime environment
      console.warn("CDGMagic_BMPObject.transition_file(): File I/O not implemented in TypeScript");
      this.internal_transition_file = selected_file;
      return 1; // Error: not implemented
    }
  }

  /**
   * Get raw bitmap data (Uint8Array)
   * @returns Reference to pixel data, or null if not allocated
   */
  get_bitmap_data(): Uint8Array | null {
    return this.internal_bmp_data;
  }

  /**
   * Clone this bitmap object
   *
   * Creates a new BMPObject with copied pixel data and settings.
   * The palette is shared (shallow copy) - modifications affect both.
   *
   * @returns New BMPObject with identical data
   */
  clone(): CDGMagic_BMPObject {
    const cloned = new CDGMagic_BMPObject(this.internal_bmp_width, this.internal_bmp_height);

    // Copy pixel data
    if (this.internal_bmp_data && cloned.internal_bmp_data) {
      cloned.internal_bmp_data.set(this.internal_bmp_data);
    }

    // Copy settings
    cloned.internal_x_offset = this.internal_x_offset;
    cloned.internal_y_offset = this.internal_y_offset;
    cloned.internal_fill_index = this.internal_fill_index;
    cloned.internal_xor_only = this.internal_xor_only;
    cloned.internal_should_composite = this.internal_should_composite;
    cloned.internal_composite_index = this.internal_composite_index;
    cloned.internal_xor_bandwidth = this.internal_xor_bandwidth;
    cloned.internal_draw_delay = this.internal_draw_delay;

    // Copy transition
    cloned.internal_transition_blocks.set(this.internal_transition_blocks);
    cloned.internal_transition_length = this.internal_transition_length;
    cloned.internal_transition_file = this.internal_transition_file;

    return cloned;
  }
}

// VIM: set ft=typescript :
// END