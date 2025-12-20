/**
 * Tile Screen Model - Text-based debug visualization
 *
 * Represents karaoke screen as a grid of tiles for debugging layout
 * Supports variable tile sizes to simulate different font scales:
 * - 1x1 tile: individual pixels (detailed, 300x216 grid)
 * - 2x2 tiles: pixel groups (standard view, 150x108 grid)
 * - 3x2 tiles: simulates larger fonts like CD+G-Magic (100x72 grid)
 * - Custom sizes: nx2 for variable font widths
 */

export interface TileScreenConfig {
  tileWidth: number   // pixels per tile (x-axis)
  tileHeight: number  // pixels per tile (y-axis)
  screenWidth: number // total screen width in pixels (300 for CDG)
  screenHeight: number // total screen height in pixels (216 for CDG)
}

export interface TileChar {
  char: string
  color: number
}

export class TileScreenModel
{
  private config: TileScreenConfig
  private grid: TileChar[][]
  private tilesWide: number
  private tilesTall: number

  constructor(config: TileScreenConfig) {
    this.config = config
    this.tilesWide = Math.ceil(config.screenWidth / config.tileWidth)
    this.tilesTall = Math.ceil(config.screenHeight / config.tileHeight)

    // Initialize grid with empty spaces
    this.grid = Array(this.tilesTall)
      .fill(null)
      .map(() =>
        Array(this.tilesWide).fill({
          char: ' ',
          color: 0
        })
      )
  }

  /**
   * Place a character at pixel coordinates
   * Automatically converts to tile coordinates
   */
  placeCharacter(
    pixelX: number,
    pixelY: number,
    char: string,
    color: number = 15
  ): void
  {
    const tileX = Math.floor(pixelX / this.config.tileWidth)
    const tileY = Math.floor(pixelY / this.config.tileHeight)

    if (this.isValidTile(tileX, tileY)) {
      this.grid[tileY][tileX] = {
        char: char || '.',
        color
      }
    }
  }

  /**
   * Place multiple characters in a line
   */
  placeLine(
    pixelX: number,
    pixelY: number,
    text: string,
    color: number = 15,
    charSpacingPixels: number = 0
  ): void
  {
    for (let i = 0; i < text.length; i++) {
      const x = pixelX + (i * (this.config.tileWidth + charSpacingPixels))
      this.placeCharacter(x, pixelY, text[i], color)
    }
  }

  /**
   * Render grid as ASCII art with grid lines
   */
  renderASCII(showGrid: boolean = true): string
  {
    let output = ''

    // Header with tile coordinates
    if (showGrid) {
      output += '   '
      for (let x = 0; x < this.tilesWide; x++) {
        output += (x % 10).toString()
      }
      output += '\n'
    }

    // Each row
    for (let y = 0; y < this.tilesTall; y++) {
      if (showGrid) {
        output += (y < 10 ? ' ' : '') + y + ' '
      }

      for (let x = 0; x < this.tilesWide; x++) {
        const tile = this.grid[y][x]
        output += tile.char
      }

      output += '\n'
    }

    return output
  }

  /**
   * Render with color codes for terminal output (optional)
   * Uses ANSI color codes if color differs from 0 (background)
   */
  renderWithColors(): string
  {
    let output = ''

    for (let y = 0; y < this.tilesTall; y++) {
      for (let x = 0; x < this.tilesWide; x++) {
        const tile = this.grid[y][x]
        output += tile.char
      }
      output += '\n'
    }

    return output
  }

  /**
   * Get a detailed report of text placements
   */
  getReport(): string
  {
    const nonEmpty = this.findNonEmptyTiles()

    let report = `Tile Screen Report (${this.tilesWide}x${this.tilesTall} tiles)\n`
    report += `Tile size: ${this.config.tileWidth}x${this.config.tileHeight} pixels\n`
    report += `Screen: ${this.config.screenWidth}x${this.config.screenHeight} pixels\n`
    report += `Non-empty tiles: ${nonEmpty.length}\n\n`

    if (nonEmpty.length > 0) {
      report += 'Placements:\n'
      for (const pos of nonEmpty) {
        const pixelX = pos.x * this.config.tileWidth
        const pixelY = pos.y * this.config.tileHeight
        report += `  [${pos.x},${pos.y}] @ (${pixelX},${pixelY}px) = '${pos.tile.char}' color:${pos.tile.color}\n`
      }
    }

    return report
  }

  /**
   * Clear the screen
   */
  clear(): void
  {
    for (let y = 0; y < this.tilesTall; y++) {
      for (let x = 0; x < this.tilesWide; x++) {
        this.grid[y][x] = { char: ' ', color: 0 }
      }
    }
  }

  /**
   * Get grid dimensions
   */
  getDimensions(): { width: number; height: number }
  {
    return { width: this.tilesWide, height: this.tilesTall }
  }

  /**
   * Get config
   */
  getConfig(): TileScreenConfig
  {
    return this.config
  }

  private isValidTile(x: number, y: number): boolean
  {
    return x >= 0 && x < this.tilesWide && y >= 0 && y < this.tilesTall
  }

  private findNonEmptyTiles(): Array<{
    x: number
    y: number
    tile: TileChar
  }>
  {
    const result = []

    for (let y = 0; y < this.tilesTall; y++) {
      for (let x = 0; x < this.tilesWide; x++) {
        const tile = this.grid[y][x]
        if (tile.char !== ' ') {
          result.push({ x, y, tile })
        }
      }
    }

    return result
  }
}

/**
 * Common tile configurations for different scenarios
 */
export const TILE_CONFIGS = {
  // Detail view: each tile is 1 pixel
  PIXEL: {
    tileWidth: 1,
    tileHeight: 1,
    screenWidth: 300,
    screenHeight: 216
  } as TileScreenConfig,

  // Standard view: each tile is 2x2 pixels (150x108 tiles)
  STANDARD: {
    tileWidth: 2,
    tileHeight: 2,
    screenWidth: 300,
    screenHeight: 216
  } as TileScreenConfig,

  // Large font simulation: 3x2 pixels per tile (like CD+G-Magic)
  // This mimics how larger glyphs would occupy multiple base tiles
  LARGE_FONT_3x2: {
    tileWidth: 3,
    tileHeight: 2,
    screenWidth: 300,
    screenHeight: 216
  } as TileScreenConfig,

  // Extra large: 4x4 pixels per tile
  EXTRA_LARGE: {
    tileWidth: 4,
    tileHeight: 4,
    screenWidth: 300,
    screenHeight: 216
  } as TileScreenConfig
}

// VIM: set filetype=typescript :
// END
