/**
 * VRAM Buffer - Screen Memory for CD+G
 *
 * Tracks the current "on-screen" state of the 300×216 pixel display.
 * Used to determine which blocks have changed and need to be written as packets.
 *
 * CD+G VRAM is 300×216 pixels = 50×18 tiles (blocks)
 * Each tile is 6×12 pixels, so VRAM is 72,000 bytes per palette index
 */

export
class VRAMBuffer {
  // Current screen state: 300×216 = 64,800 pixels
  // Stored as flat array in row-major order
  private internal_vram: Uint8Array;
  private internal_width: number;
  private internal_height: number;

  /**
   * Constructor: Create VRAM buffer
   *
   * @param width Screen width in pixels (default 300)
   * @param height Screen height in pixels (default 216)
   */
  constructor(width: number = 300, height: number = 216) {
    this.internal_width = width;
    this.internal_height = height;
    this.internal_vram = new Uint8Array(width * height);
  }

  /**
   * Get width in pixels
   */
  public width(): number {
    return this.internal_width;
  }

  /**
   * Get height in pixels
   */
  public height(): number {
    return this.internal_height;
  }

  /**
   * Write pixel to VRAM
   *
   * @param x X coordinate (0-299)
   * @param y Y coordinate (0-215)
   * @param color Palette index (0-255)
   */
  public write_pixel(x: number, y: number, color: number): void {
    if (x < 0 || x >= this.internal_width || y < 0 || y >= this.internal_height) {
      return;  // Bounds check - silently ignore out-of-bounds writes
    }
    this.internal_vram[y * this.internal_width + x] = color & 0xFF;
  }

  /**
   * Read pixel from VRAM
   *
   * @param x X coordinate (0-299)
   * @param y Y coordinate (0-215)
   * @returns Palette index (0-255), or 0 if out of bounds
   */
  public read_pixel(x: number, y: number): number {
    if (x < 0 || x >= this.internal_width || y < 0 || y >= this.internal_height) {
      return 0;
    }
    return this.internal_vram[y * this.internal_width + x];
  }

  /**
   * Write 6×12 tile block to VRAM
   *
   * Block data is laid out as 6 pixels × 12 rows = 72 pixels linear array.
   * Pixels are row-major: pixels 0-5 are row 0, pixels 6-11 are row 1, etc.
   *
   * @param block_x Block X coordinate in tiles (0-49)
   * @param block_y Block Y coordinate in tiles (0-17)
   * @param pixel_data Array of 72 pixels (values 0-255)
   */
  public write_block(block_x: number, block_y: number, pixel_data: Uint8Array): void {
    if (pixel_data.length !== 72) {
      return;
    }

    let idx = 0;

    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < 6; px++) {
        const pixel_x = block_x * 6 + px;
        const pixel_y = block_y * 12 + py;
        this.write_pixel(pixel_x, pixel_y, pixel_data[idx++]);
      }
    }
  }

  /**
   * Read 6×12 tile block from VRAM
   *
   * Used to extract current on-screen state for comparison.
   * Block data is laid out as 6 pixels × 12 rows = 72 pixels linear array.
   *
   * @param block_x Block X coordinate in tiles (0-49)
   * @param block_y Block Y coordinate in tiles (0-17)
   * @returns 72-element Uint8Array (6×12 pixels, one per element)
   */
  public read_block(block_x: number, block_y: number): Uint8Array {
    const result = new Uint8Array(72);
    let idx = 0;

    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < 6; px++) {
        const pixel_x = block_x * 6 + px;
        const pixel_y = block_y * 12 + py;
        result[idx++] = this.read_pixel(pixel_x, pixel_y);
      }
    }

    return result;
  }

  /**
   * Clear VRAM to specified color
   *
   * @param color Palette index to fill (default 0)
   */
  public clear(color: number = 0): void {
    this.internal_vram.fill(color & 0xFF);
  }

  /**
   * Fill preset memory - used when MEMORY_PRESET packets are sent
   *
   * CD+G MEMORY_PRESET clears one "group" of memory (12×12 blocks)
   * We simplify by just clearing the entire VRAM
   *
   * @param index Preset index (not used in simplified version)
   * @param color Color to fill with
   */
  public memory_preset(index: number, color: number): void {
    this.clear(color);
  }

  /**
   * Comparison helper: Check if block matches VRAM state
   *
   * Used to determine if a block needs to be written as packets.
   *
   * @param block_x Block X coordinate
   * @param block_y Block Y coordinate
   * @param pixel_data Block pixels to compare
   * @returns true if block matches VRAM, false if different
   */
  public block_matches(block_x: number, block_y: number, pixel_data: Uint8Array): boolean {
    if (pixel_data.length !== 72) {
      return false;
    }

    const vram_block = this.read_block(block_x, block_y);

    for (let i = 0; i < 72; i++) {
      if (pixel_data[i] !== vram_block[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get raw VRAM buffer for direct access
   *
   * @returns Reference to internal VRAM array
   */
  public get_buffer(): Uint8Array {
    return this.internal_vram;
  }
}

// VIM: set ft=typescript :
// END
