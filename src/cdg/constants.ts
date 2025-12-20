// Canonical CDG constants used throughout the project
export const CDG_PACKET_SIZE = 24
export const CDG_PPS = 300

// Screen / tile geometry (re-exported for convenience)
export const CDG_SCREEN_WIDTH = 300
export const CDG_SCREEN_HEIGHT = 216

/**
 * RGB color (8-bit per channel)
 */
export interface RGB
{
  r: number
  g: number
  b: number
}

/**
 * DefaultPalette
 *
 * Canonical default karaoke palette shared across the project.
 * Stores colors as RGB (8-bit per channel) for clarity and to avoid confusion
 * with intermediate packed formats.
 */
export class DefaultPalette
{
  /**
   * Palette array with all 16 colors
   */
  private static readonly palette: RGB[] = [
    /* eslint-disable */
    { r:   0, g:   0, b:   0 },  // 0: Black (background)
    { r: 255, g: 255, b:   0 },  // 1: Yellow (active text)
    { r: 200, g: 200, b: 200 },  // 2: Light gray (transition text)
    { r: 255, g: 255, b: 255 },  // 3: White (bright text)
    { r:   0, g:   0, b: 128 },  // 4: Dark blue
    { r:   0, g: 128, b: 255 },  // 5: Light blue
    { r: 128, g: 128, b: 128 },  // 6: Medium gray
    { r:  64, g:  64, b:  64 },  // 7: Dark gray
    { r: 255, g:   0, b:   0 },  // 8: Red
    { r:   0, g: 255, b:   0 },  // 9: Green
    { r:   0, g:   0, b: 255 },  // 10: Blue
    { r: 255, g:   0, b: 255 },  // 11: Magenta
    { r:   0, g: 255, b: 255 },  // 12: Cyan
    { r: 255, g: 128, b:   0 },  // 13: Orange
    { r: 128, g:   0, b: 128 },  // 14: Purple
    { r:   0, g: 128, b:   0 }   // 15: Dark green
    /* eslint-enable */
  ]

  static get black()      : RGB  { return this.palette[0] }
  static get yellow()     : RGB  { return this.palette[1] }
  static get lightGray()  : RGB  { return this.palette[2] }
  static get white()      : RGB  { return this.palette[3] }
  static get darkBlue()   : RGB  { return this.palette[4] }
  static get lightBlue()  : RGB  { return this.palette[5] }
  static get mediumGray() : RGB  { return this.palette[6] }
  static get darkGray()   : RGB  { return this.palette[7] }
  static get red()        : RGB  { return this.palette[8] }
  static get green()      : RGB  { return this.palette[9] }
  static get blue()       : RGB  { return this.palette[10] }
  static get magenta()    : RGB  { return this.palette[11] }
  static get cyan()       : RGB  { return this.palette[12] }
  static get orange()     : RGB  { return this.palette[13] }
  static get purple()     : RGB  { return this.palette[14] }
  static get darkGreen()  : RGB  { return this.palette[15] }

  /**
   * Get palette as array (RGB format)
   * Returns the 16-color default palette in order
   */
  static get colors(): RGB[]
  {
    return [...this.palette]
  }
}

/**
 * CdgConstants
 *
 * Static class providing centralized access to CDG-related constants.
 * Use static getters to maintain consistency across the codebase.
 */
export class CdgConstants
{
  /**
   * CDG packet size in bytes (24 bytes per packet)
   */
  static get packetSize(): number
  {
    return CDG_PACKET_SIZE
  }

  /**
   * CDG packets per second (standard CDG timing: 300 pps)
   */
  static get packetsPerSecond(): number
  {
    return CDG_PPS
  }

  /**
   * CDG screen width in pixels (300 pixels)
   */
  static get screenWidth(): number
  {
    return CDG_SCREEN_WIDTH
  }

  /**
   * CDG screen height in pixels (216 pixels)
   */
  static get screenHeight(): number
  {
    return CDG_SCREEN_HEIGHT
  }

  /**
   * CDG color palette size (16 colors)
   */
  static get paletteSize(): number
  {
    return 16
  }

  /**
   * CDG tile width in pixels (6 pixels per tile)
   */
  static get tileWidth(): number
  {
    return 6
  }

  /**
   * CDG tile height in pixels (12 pixels per tile)
   */
  static get tileHeight(): number
  {
    return 12
  }

  /**
   * CDG color format: 12-bit per color (RRRRGGGGBBBB)
   */
  static get colorBits(): number
  {
    return 12
  }

  /**
   * CDG color component bits (4 bits per channel: R, G, B)
   */
  static get colorComponentBits(): number
  {
    return 4
  }

  /**
   * Display refresh rate for VRAM rendering to canvas (75 fps)
   * VLC and other players capture VRAM state at 75 fps regardless of packet rate (300 pps)
   */
  static get displayRefreshRate(): number
  {
    return 75
  }

  /**
   * Display frame interval in milliseconds (1000/75 ≈ 13.33ms per frame)
   */
  static get displayFrameIntervalMs(): number
  {
    return 1000 / this.displayRefreshRate
  }

  /**
   * Default karaoke palette
   */
  static get defaultPalette(): typeof DefaultPalette
  {
    return DefaultPalette
  }
}

/**
 * ColorUtils
 *
 * Utility functions for working with RGB colors.
 * Use these only when converting to specific formats (e.g., packet encoding, canvas rendering).
 */
export class ColorUtils
{
  /**
   * Convert RGB (8-bit per channel) to 4-bit per channel
   * Used when encoding colors into CDG packet structures
   */
  static rgb8ToCDG4(rgb: RGB): { r4: number; g4: number; b4: number }
  {
    return {
      r4: Math.floor(rgb.r / 17) & 0x0F,
      g4: Math.floor(rgb.g / 17) & 0x0F,
      b4: Math.floor(rgb.b / 17) & 0x0F
    }
  }

  /**
   * Convert 4-bit per channel to 8-bit per channel (for display)
   * Expands 4-bit values by shifting left 4 and copying to low bits
   */
  static cdg4ToRGB8(r4: number, g4: number, b4: number): RGB
  {
    return {
      r: (r4 << 4) | r4,
      g: (g4 << 4) | g4,
      b: (b4 << 4) | b4
    }
  }
}

// Alias for shorter import/usage
export const CDG = CdgConstants

// VIM: set filetype=typescript :
// END