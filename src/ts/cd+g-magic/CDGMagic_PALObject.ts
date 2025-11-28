/**
 * CD+Graphics Magic - Palette Object
 *
 * Manages color palettes for CD+G graphics (16-color or 256-color RGBA).
 * Supports palette transitions/dissolves and per-color update masking.
 */

/**
 * Palette Object: Manages RGBA color palette for CD+G graphics
 *
 * CD+G supports two palette modes:
 * - TV Graphics (16 colors): Uses first 16 entries of palette
 * - Extended Graphics (256 colors): Uses all 256 palette entries
 *
 * Each color is stored as a 32-bit RGBA value:
 * - Bits 24-31: Red (8-bit)
 * - Bits 16-23: Green (8-bit)
 * - Bits 8-15: Blue (8-bit)
 * - Bits 0-7: Alpha (8-bit, 0xFF = fully opaque)
 */
export class CDGMagic_PALObject {
  private internal_palette: Uint32Array;
  private internal_update_mask: number;
  private internal_dissolve_interval: number;
  private internal_dissolve_steps: number;

  /**
   * Constructor: Initialize palette with black (transparent)
   *
   * Default state:
   * - All 256 palette entries set to 0x000000FF (black, opaque)
   * - Update mask: 0xFFFF (all colors marked for update)
   * - No dissolve effect
   */
  constructor() {
    // Default color update mask - all 16 TV Graphics colors need update
    this.internal_update_mask = 0xFFFF;

    // No fade/dissolve by default
    this.internal_dissolve_interval = 0;
    this.internal_dissolve_steps = 0;

    // Allocate palette memory for 256 colors
    // Initialize to black with full opacity (0x000000FF)
    this.internal_palette = new Uint32Array(256);
    for (let idx = 0; idx < 256; idx++) {
      this.internal_palette[idx] = 0x000000FF;
    }
  }

  /**
   * Get total number of colors in palette
   * @returns Always returns 256 (all entries available)
   */
  number_of_colors(): number {
    return 256;
  }

  /**
   * Get RGBA color value at palette index
   * @param requested_index Palette index (0-255)
   * @returns 32-bit RGBA value
   */
  color(requested_index: number): number;

  /**
   * Set RGBA color value at palette index
   * @param requested_index Palette index (0-255)
   * @param requested_value 32-bit RGBA value
   */
  color(requested_index: number, requested_value: number): void;

  color(requested_index: number, requested_value?: number): number | void {
    if (requested_value === undefined) {
      // Getter: return color at index
      return this.internal_palette[requested_index];
    } else {
      // Setter: set color at index
      this.internal_palette[requested_index] = requested_value;
    }
  }

  /**
   * Get the palette update mask
   *
   * Bitmask indicating which palette entries need updating:
   * - TV Graphics: Bits 0-15 represent palette entries 0-15
   * - Extended Graphics: Full 32-bit mask for entries 0-31 (use multiple masks for 256)
   *
   * @returns 32-bit update mask
   */
  update_mask(): number;

  /**
   * Set the palette update mask
   * @param requested_mask 32-bit bitmask of colors needing update
   */
  update_mask(requested_mask: number): void;

  update_mask(requested_mask?: number): number | void {
    if (requested_mask === undefined) {
      return this.internal_update_mask;
    } else {
      this.internal_update_mask = requested_mask;
    }
  }

  /**
   * Get current dissolve interval (fade timing)
   * @returns Dissolve interval in milliseconds (0 = no dissolve)
   */
  dissolve_interval(): number {
    return this.internal_dissolve_interval;
  }

  /**
   * Get number of dissolve steps (fade granularity)
   * @returns Number of steps in fade animation (0 = no dissolve)
   */
  dissolve_steps(): number {
    return this.internal_dissolve_steps;
  }

  /**
   * Set palette dissolve/fade effect
   *
   * Creates a smooth color transition over time:
   * - Interval: Total duration of fade (in CD+G frame units)
   * - Steps: Number of intermediate frames in the fade
   * - Example: dissolve(150, 15) fades over 150 frames in 15 steps
   *
   * @param requested_interval Duration in CD+G frames
   * @param requested_steps Number of fade steps (default: 15)
   */
  dissolve(requested_interval: number, requested_steps: number = 15): void {
    this.internal_dissolve_interval = requested_interval;
    this.internal_dissolve_steps = requested_steps;
  }

  /**
   * Get entire palette array (for bulk operations)
   * @returns Reference to Uint32Array of all 256 colors
   */
  get_palette_array(): Uint32Array {
    return this.internal_palette;
  }

  /**
   * Create a copy of this palette
   * @returns New PALObject with identical colors and dissolve settings
   */
  clone(): CDGMagic_PALObject {
    const cloned = new CDGMagic_PALObject();
    cloned.internal_palette.set(this.internal_palette);
    cloned.internal_update_mask = this.internal_update_mask;
    cloned.internal_dissolve_interval = this.internal_dissolve_interval;
    cloned.internal_dissolve_steps = this.internal_dissolve_steps;
    return cloned;
  }
}

// VIM: set ft=typescript :
// END