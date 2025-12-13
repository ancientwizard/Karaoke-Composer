/**
 * CD+Graphics Magic - Font Block
 *
 * 12×6 pixel font character glyph for CD+G graphics rendering.
 * Handles color indexing, transparency, z-ordering, and compositing.
 */

/**
 * Internal palette entry for color frequency analysis
 */
interface Palette_Entry {
  index: number;      // Color palette index (0-255)
  occurrence: number; // How many pixels use this color
}

/**
 * Font Block: 12×6 pixel CD+G font character
 *
 * Each font block represents a single character or graphical element in CD+G.
 * - Dimensions: 12 pixels wide × 6 pixels high = 72 pixels total
 * - Color mode: 8-bit indexed color (0-255)
 * - Features: Transparency, z-ordering, XOR mode, channel masking
 *
 * Used primarily for:
 * - Rendering 12×6 font characters
 * - Graphical overlays and transitions
 * - Compositing with existing VRAM content
 */
export class CDGMagic_FontBlock {
  private internal_start_pack: number;        // Earliest temporal position to write
  private x_block: number;                    // X position in CDG block coordinates (0-49)
  private y_block: number;                    // Y position in CDG block coordinates (0-17)
  private internal_vram_only: number;         // Flag: write to VRAM only
  private internal_xor_only: number;          // Flag: XOR with existing VRAM
  private z_index: number;                    // Z-order / compositing layer
  private internal_channel: number;           // Channel assignment (typically 0)
  private internal_transparent_index: number; // Color index treated as transparent (-1 = none)
  private internal_overlay_index: number;     // Color index used for overlay (-1 = none)
  private internal_bmp_data: Uint8Array;      // Bitmap data (72 bytes = 12×6 pixels)
  private numcolors_is_dirty: number;         // Flag: color count needs recalculation
  private number_of_colors: number;           // Cached count of unique colors
  private prom_colors_is_dirty: number;       // Flag: prominent colors need recalculation
  private prominence_of_colors: Uint8Array | null; // Colors sorted by frequency

  /**
   * Constructor: Create a new font block
   *
   * @param req_x X position in CDG blocks (default: 0)
   * @param req_y Y position in CDG blocks (default: 0)
   * @param req_startpack Starting pack number (default: 0)
   */
  constructor(req_x: number = 0, req_y: number = 0, req_startpack: number = 0) {
    this.x_block = req_x;
    this.y_block = req_y;
    this.internal_start_pack = req_startpack;

    this.internal_vram_only = 0;
    this.internal_xor_only = 0;
    this.z_index = 0;                       // Z/compositing index defaults to 0 (first layer, or ignored)
    this.internal_channel = 0;              // Channel is always zero by default
    this.internal_transparent_index = 256;  // 256 can't exist in index value, so all opaque
    this.internal_overlay_index = 256;      // 256 can't exist in index value, so all opaque
    this.number_of_colors = 1;              // Can't be less than one color
    this.numcolors_is_dirty = 1;            // Need to recalculate colors
    this.prom_colors_is_dirty = 1;          // Need to calculate prominence

    // Allocate storage for block data (72 bytes for 12×6 indexed color pixels)
    this.internal_bmp_data = new Uint8Array(6 * 12);

    // Prominence array allocated only if needed (saves memory)
    this.prominence_of_colors = null;
  }

  /**
   * Get number of unique colors in this block
   * Caches the result and recalculates only when dirty
   * IMPORTANT: Excludes the transparent index from the count!
   * This ensures num_colors() matches prominent_color() behavior
   * @returns Number of unique color indices used (excluding transparent)
   */
  num_colors(): number {
    if (this.numcolors_is_dirty) {
      // Initialize count
      this.number_of_colors = 0;

      // Create frequency array for each color index
      const clrs = new Uint8Array(256);

      // Count occurrences of each color
      for (let px = 0; px < 6 * 12; px++) {
        clrs[this.internal_bmp_data[px]]++;
      }

      // Count how many colors are actually used (excluding transparent)
      for (let px = 0; px < 256; px++) {
        if (clrs[px] > 0 && px !== this.internal_transparent_index) {
          this.number_of_colors++;
        }
      }

      this.numcolors_is_dirty = 0;
    }

    return this.number_of_colors;
  }

  /**
   * Get the most prominent (frequently used) color at given prominence level
   *
   * Colors are sorted by usage frequency (most used = 0)
   * Transparent colors are excluded from prominence ranking
   *
   * @param prominence Rank (0 = most used, 1 = second most, etc.)
   * @returns Color index at that prominence level
   */
  prominent_color(prominence: number = 0): number {
    if (this.prom_colors_is_dirty) {
      // Allocate prominence array on first use
      if (this.prominence_of_colors === null) {
        this.prominence_of_colors = new Uint8Array(6 * 12);
      }

      // Ensure current color count
      this.num_colors();

      // Create vector for sorting
      const clrs_vector: Palette_Entry[] = [];

      // Create frequency array
      const clrs = new Uint8Array(256);

      // Count occurrences
      for (let px = 0; px < 6 * 12; px++) {
        clrs[this.internal_bmp_data[px]]++;
      }

      // Add colors to vector (excluding transparent)
      for (let idx = 0; idx < 256; idx++) {
        if (clrs[idx] > 0 && idx !== this.internal_transparent_index) {
          clrs_vector.push({
            index: idx,
            occurrence: clrs[idx],
          });
        }
      }

      // Sort by frequency (descending)
      clrs_vector.sort((a, b) => b.occurrence - a.occurrence);

      // Check for overflow
      if (clrs_vector.length > 6 * 12) {
        console.warn(
          `prominent_color would have overrun array: ${clrs_vector.length} (Max: ${6 * 12})`
        );
        return 0;
      }

      // Store sorted colors
      for (let prm_idx = 0; prm_idx < clrs_vector.length; prm_idx++) {
        this.prominence_of_colors![prm_idx] = clrs_vector[prm_idx].index;
      }

      this.prom_colors_is_dirty = 0;
    }

    // Return color at requested prominence, or 0 if invalid
    if (prominence < this.number_of_colors && this.prominence_of_colors) {
      return this.prominence_of_colors[prominence];
    }

    console.warn(`prominent_color was requested invalid prominence: ${prominence}`);
    return 0;
  }

  /**
   * Get pixel color value at x, y coordinates
   * @param req_x X coordinate (0-11)
   * @param req_y Y coordinate (0-5)
   * @returns Color index (0-255)
   */
  pixel_value(req_x: number, req_y: number): number;
  /**
   * Set pixel color value at x, y coordinates
   * @param req_x X coordinate (0-11)
   * @param req_y Y coordinate (0-5)
   * @param clr_val Color index (0-255)
   */
  pixel_value(req_x: number, req_y: number, clr_val: number): void;
  pixel_value(req_x: number, req_y: number, clr_val?: number): number | void {
    if (clr_val === undefined) {
      // Getter
      if (req_x < 6 && req_y < 12) {
        return this.internal_bmp_data[req_x + req_y * 6];
      }
      console.warn(`CDGMagic_FontBlock: Requested get pixel was invalid! [x: ${req_x}, y: ${req_y}]`);
      return 0;
    } else {
      // Setter
      if (req_x < 6 && req_y < 12) {
        // Colors *could* be dirty after modification
        this.numcolors_is_dirty = 1;
        this.prom_colors_is_dirty = 1;
        this.internal_bmp_data[req_x + req_y * 6] = clr_val;
      } else {
        console.warn(`CDGMagic_FontBlock: Requested set pixel was invalid! [x: ${req_x}, y: ${req_y}]`);
      }
    }
  }

  /**
   * Check if entire block is fully transparent
   * @returns 1 if all pixels are transparent, 0 otherwise
   */
  is_fully_transparent(): number {
    for (let px = 0; px < 6 * 12; px++) {
      if (this.internal_bmp_data[px] !== this.internal_transparent_index) {
        return 0;
      }
    }
    return 1;
  }

  /**
   * Fill entire block with single color
   * @param clr_val Color index to fill with
   */
  color_fill(clr_val: number): void {
    this.numcolors_is_dirty = 1;
    this.prom_colors_is_dirty = 1;
    for (let pxl = 0; pxl < 6 * 12; pxl++) {
      this.internal_bmp_data[pxl] = clr_val;
    }
  }

  // Accessor methods for positioning and flags

  start_pack(): number;
  start_pack(req_startpack: number): void;
  start_pack(req_startpack?: number): number | void {
    if (req_startpack === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = req_startpack;
    }
  }

  x_location(): number;
  x_location(req_x: number): void;
  x_location(req_x?: number): number | void {
    if (req_x === undefined) {
      return this.x_block;
    } else {
      this.x_block = req_x;
    }
  }

  y_location(): number;
  y_location(req_y: number): void;
  y_location(req_y?: number): number | void {
    if (req_y === undefined) {
      return this.y_block;
    } else {
      this.y_block = req_y;
    }
  }

  z_location(): number;
  z_location(req_z: number): void;
  z_location(req_z?: number): number | void {
    if (req_z === undefined) {
      return this.z_index;
    } else {
      this.z_index = req_z;
    }
  }

  channel(): number;
  channel(req_channel: number): void;
  channel(req_channel?: number): number | void {
    if (req_channel === undefined) {
      return this.internal_channel;
    } else {
      this.internal_channel = req_channel;
    }
  }

  vram_only(): number;
  vram_only(req_option: number): void;
  vram_only(req_option?: number): number | void {
    if (req_option === undefined) {
      return this.internal_vram_only;
    } else {
      this.internal_vram_only = req_option;
    }
  }

  xor_only(): number;
  xor_only(req_option: number): void;
  xor_only(req_option?: number): number | void {
    if (req_option === undefined) {
      return this.internal_xor_only;
    } else {
      this.internal_xor_only = req_option;
    }
  }

  replacement_transparent_color(): number;
  replacement_transparent_color(requested_transparent: number): void;
  replacement_transparent_color(requested_transparent?: number): number | void {
    if (requested_transparent === undefined) {
      return this.internal_transparent_index;
    } else {
      this.numcolors_is_dirty = 1;
      this.prom_colors_is_dirty = 1;
      this.internal_transparent_index = requested_transparent;
    }
  }

  overlay_transparent_color(): number;
  overlay_transparent_color(requested_overlay: number): void;
  overlay_transparent_color(requested_overlay?: number): number | void {
    if (requested_overlay === undefined) {
      return this.internal_overlay_index;
    } else {
      this.numcolors_is_dirty = 1;
      this.prom_colors_is_dirty = 1;
      this.internal_overlay_index = requested_overlay;
    }
  }

  /**
   * Get reference to raw bitmap data (for advanced operations)
   * @returns Uint8Array of 72 bytes (12×6 indexed pixels)
   */
  get_bitmap_data(): Uint8Array {
    return this.internal_bmp_data;
  }

  /**
   * Clone this font block
   * @returns New FontBlock with identical pixel data and settings
   */
  clone(): CDGMagic_FontBlock {
    const cloned = new CDGMagic_FontBlock(this.x_block, this.y_block, this.internal_start_pack);
    cloned.internal_bmp_data.set(this.internal_bmp_data);
    cloned.internal_vram_only = this.internal_vram_only;
    cloned.internal_xor_only = this.internal_xor_only;
    cloned.z_index = this.z_index;
    cloned.internal_channel = this.internal_channel;
    cloned.internal_transparent_index = this.internal_transparent_index;
    cloned.internal_overlay_index = this.internal_overlay_index;
    return cloned;
  }
}

// VIM: set ft=typescript :
// END