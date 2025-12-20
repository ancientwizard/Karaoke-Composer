/**
 * Glyph Test Patterns (Diagnostic)
 *
 * Diagnostic test patterns for validating glyph rendering alignment.
 * Purely for development/testing - not for production use.
 *
 * These patterns help verify:
 * - Pixel-to-tile alignment
 * - Glyph positioning at arbitrary coordinates
 * - Boundary conditions and wrapping
 * - Tile extraction accuracy
 */

/**
 * Alignment test: Render pixel grid showing 1-pixel markers
 * Helps verify pixel positions are exactly where expected
 */
export function createPixelGridPattern(width: number, height: number): Uint8Array
{
  const data = new Uint8Array(width * height).fill(0)

  // Draw vertical and horizontal lines at 6-pixel intervals (tile boundaries)
  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      // Mark tile boundaries (x = 0, 6, 12, 18... and y = 0, 12, 24, 36...)
      if (x % 6 === 0 || y % 12 === 0)
      {
        data[y * width + x] = 1
      }
    }
  }

  return data
}

/**
 * Boundary test: Draw frame at screen edges to verify no clipping
 */
export function createBoundaryTestPattern(width: number, height: number): Uint8Array
{
  const data = new Uint8Array(width * height).fill(0)

  // Top and bottom edges
  for (let x = 0; x < width; x++)
  {
    data[x] = 2           // Top row
    data[(height - 1) * width + x] = 2  // Bottom row
  }

  // Left and right edges
  for (let y = 0; y < height; y++)
  {
    data[y * width] = 2                  // Left column
    data[y * width + (width - 1)] = 2    // Right column
  }

  return data
}

/**
 * Checkerboard pattern: Alternating blocks for visual reference
 */
export function createCheckerboardPattern(width: number, height: number, blockSize: number = 24): Uint8Array
{
  const data = new Uint8Array(width * height)

  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      const checker = ((Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2) * 7
      data[y * width + x] = checker
    }
  }

  return data
}

/**
 * Rainbow gradient: Cycle through all 16 colors
 */
export function createRainbowPattern(width: number, height: number): Uint8Array
{
  const data = new Uint8Array(width * height)

  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      // Gradient across X axis (0-15 colors)
      const colorIndex = Math.floor((x / width) * 16) % 16
      data[y * width + x] = colorIndex
    }
  }

  return data
}

// VIM: set filetype=typescript :
// END
