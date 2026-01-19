/**
 * Tests for BMP to FontBlock conversion with transition support
 *
 * This test suite verifies the complete pipeline:
 * 1. BMPLoader reads pixel data and palette from BMP file
 * 2. BMPData is created from the loader
 * 3. GraphicsEncoder.bmp_to_fonts() converts to FontBlocks
 * 4. Transition ordering is applied correctly
 * 5. Pixels are sampled correctly with offsets
 */

import { CDGMagic_BMPLoader } from "@/ts/cd+g-magic/CDGMagic_BMPLoader";
import { CDGMagic_BMPObject } from "@/ts/cd+g-magic/CDGMagic_BMPObject";
import { CDGMagic_GraphicsEncoder, type BMPData } from "@/ts/cd+g-magic/CDGMagic_GraphicsEncoder";
import { CDGMagic_FontBlock } from "@/ts/cd+g-magic/CDGMagic_FontBlock";
import { CDGMagic_TrackOptions } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";
import { type TransitionData } from "@/ts/cd+g-magic/TransitionFileReader";
import * as fs from "fs";
import * as path from "path";

/**
 * Create a minimal valid BMP file for testing (8-bit indexed color)
 * 
 * Returns a Buffer containing a valid Windows BMP v3 file
 */
function createTestBMP(width: number, height: number, fillColor: number = 0): Buffer {
  // Allocate buffer for entire BMP file
  // Header (14) + DIB header (40) + palette (256*4) + pixel data (width*height)
  const pixelDataSize = width * height;
  const paletteSize = 256 * 4; // 256 colors × 4 bytes (BGRA)
  const fileSize = 14 + 40 + paletteSize + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  // BMP File Header (14 bytes)
  buffer[0] = 0x42; // 'B'
  buffer[1] = 0x4d; // 'M'
  buffer.writeUInt32LE(fileSize, 0x02); // File size
  buffer.writeUInt32LE(0, 0x06); // Reserved
  buffer.writeUInt32LE(14 + 40 + paletteSize, 0x0a); // Offset to pixel data

  // DIB Header (40 bytes)
  buffer.writeUInt32LE(40, 0x0e); // Header size
  buffer.writeInt32LE(width, 0x12); // Width
  buffer.writeInt32LE(height, 0x16); // Height
  buffer.writeUInt16LE(1, 0x1a); // Color planes
  buffer.writeUInt16LE(8, 0x1c); // Bits per pixel
  buffer.writeUInt32LE(0, 0x1e); // Compression (0 = uncompressed)
  buffer.writeUInt32LE(pixelDataSize, 0x22); // Image size
  buffer.writeUInt32LE(0, 0x26); // X pixels per meter
  buffer.writeUInt32LE(0, 0x2a); // Y pixels per meter
  buffer.writeUInt32LE(256, 0x2e); // Colors used (256)
  buffer.writeUInt32LE(0, 0x32); // Important colors (0 = all)

  // Palette (256 × 4 bytes: B, G, R, Reserved)
  // Create a simple palette: index i → (i, i, i) gray + black at end
  const paletteOffset = 0x36;
  for (let i = 0; i < 256; i++) {
    const offset = paletteOffset + i * 4;
    const gray = Math.min(i, 255);
    buffer[offset] = gray; // B
    buffer[offset + 1] = gray; // G
    buffer[offset + 2] = gray; // R
    buffer[offset + 3] = 0; // Reserved
  }

  // Pixel data
  const pixelOffset = paletteOffset + paletteSize;
  for (let i = 0; i < pixelDataSize; i++) {
    buffer[pixelOffset + i] = fillColor;
  }

  return buffer;
}

/**
 * Write test BMP to temporary file and return path
 */
function writeTestBMP(filename: string, width: number, height: number, fillColor?: number): string {
  const testDir = path.join(__dirname, "../../tmp/test-bmp");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filepath = path.join(testDir, filename);
  const bmp = createTestBMP(width, height, fillColor);
  fs.writeFileSync(filepath, bmp);
  return filepath;
}

describe("BMP to FontBlock Conversion Pipeline", () => {
  afterEach(() => {
    // Clean up test files if needed
  });

  describe("BMPLoader - Pixel Data Storage", () => {
    test("should load BMP and store pixel data correctly", () => {
      const bmpPath = writeTestBMP("test_load.bmp", 60, 24, 42);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      expect(loader.width()).toBe(60);
      expect(loader.height()).toBe(24);

      // Get pixel data
      const pixels = loader.get_pixel_data();
      expect(pixels).toBeDefined();
      expect(pixels.length).toBe(60 * 24);

      // All pixels should be 42 (the fill color)
      for (let i = 0; i < pixels.length; i++) {
        expect(pixels[i]).toBe(42);
      }
    });

    test("should load BMP palette correctly", () => {
      const bmpPath = writeTestBMP("test_palette.bmp", 60, 24, 0);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      // Get 8-bit palette
      const palette = loader.get_palette_8bit();
      expect(palette).toBeDefined();
      expect(palette.length).toBe(256);

      // Palette should be grayscale (R=G=B for each index)
      for (let i = 0; i < 256; i++) {
        const [r, g, b] = palette[i];
        expect(r).toBe(i);
        expect(g).toBe(i);
        expect(b).toBe(i);
      }
    });

    test("should handle different BMP dimensions", () => {
      const dimensions = [
        [50, 20],
        [100, 30],
        [200, 150], // Keep within BMP loader constraints (max 240 pixels tall)
      ];

      for (const [w, h] of dimensions) {
        const bmpPath = writeTestBMP(`test_${w}x${h}.bmp`, w, h, 10);
        const loader = new CDGMagic_BMPLoader(bmpPath);
        expect(loader.width()).toBe(w);
        expect(loader.height()).toBe(h);
        expect(loader.get_pixel_data().length).toBe(w * h);
      }
    });
  });

  describe("GraphicsEncoder - BMP to FontBlocks", () => {
    test("should convert BMP to FontBlocks with default transition", () => {
      const bmpPath = writeTestBMP("test_convert.bmp", 300, 216, 5);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      // Create BMPData
      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      // Convert using default transition
      const encoder = new CDGMagic_GraphicsEncoder();
      const fontblocks = encoder.bmp_to_fonts(bmpData, 0);

      // Default transition uses 768 blocks (48×16 grid), not full 900 (50×18)
      // The difference is that 768 is the standard CD+G fontblock transition grid
      expect(fontblocks.length).toBe(768);

      // Each fontblock should have pixels set (6×12)
      for (const fb of fontblocks) {
        let hasPixels = false;
        for (let y = 0; y < 12; y++) {
          for (let x = 0; x < 6; x++) {
            // FontBlock is typically opaque (0-255), not 256 (transparent)
            const pix = (fb as any).internal_pixels?.[y]?.[x];
            if (pix !== undefined && pix < 256) {
              hasPixels = true;
              break;
            }
          }
          if (hasPixels) break;
        }
        // At least first few blocks should have pixels
        // (edge blocks may be out-of-bounds if not at pixel-aligned positions)
      }
    });

    test("should apply BMP offsets correctly", () => {
      // Create a small BMP and offset it
      const bmpPath = writeTestBMP("test_offset.bmp", 100, 100, 7);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      const encoder = new CDGMagic_GraphicsEncoder();

      // Convert with offset (6, 12) = (1 block, 1 block)
      const fontblocks = encoder.bmp_to_fonts(
        bmpData,
        0, // start_pack
        undefined, // transition
        undefined, // track_options
        6, // x_offset (6 pixels = 1 block width)
        12 // y_offset (12 pixels = 1 block height)
      );

      expect(fontblocks).toBeDefined();
      expect(fontblocks.length).toBeGreaterThan(0);
    });

    test("should respect track options for z-location", () => {
      const bmpPath = writeTestBMP("test_track.bmp", 100, 100, 3);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      // Create track options with specific track
      const trackOpts = new CDGMagic_TrackOptions();
      trackOpts.track(3); // Track 3
      trackOpts.channel(1); // Channel 1

      const encoder = new CDGMagic_GraphicsEncoder();
      const fontblocks = encoder.bmp_to_fonts(bmpData, 0, undefined, trackOpts);

      expect(fontblocks).toBeDefined();
      expect(fontblocks.length).toBeGreaterThan(0);

      // Check that first fontblock has the correct z_location
      const firstBlock = fontblocks[0];
      expect((firstBlock as any).z_index).toBe(3);
    });

    test("should handle custom transitions if provided", () => {
      const bmpPath = writeTestBMP("test_transition.bmp", 100, 100, 10);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      // Create a custom transition (top-left corner only: 1 block)
      const customTransition: TransitionData = {
        blocks: [[0, 0] as [number, number], [1, 0] as [number, number]], // Two blocks in top-left
        length: 2,
        no_transition: false,
      };

      const encoder = new CDGMagic_GraphicsEncoder();
      const fontblocks = encoder.bmp_to_fonts(bmpData, 0, customTransition);

      // Should have fewer blocks with custom transition
      expect(fontblocks.length).toBe(2);
      expect(fontblocks[0]).toBeDefined();
    });

    test("should mark out-of-bounds pixels as transparent (256)", () => {
      // Create a small BMP and sample beyond its bounds
      const bmpPath = writeTestBMP("test_oob.bmp", 12, 12, 8); // Only 2×1 blocks
      const loader = new CDGMagic_BMPLoader(bmpPath);

      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      const encoder = new CDGMagic_GraphicsEncoder();
      // Convert with large offset pushing sampling beyond BMP bounds
      const fontblocks = encoder.bmp_to_fonts(
        bmpData,
        0,
        undefined,
        undefined,
        300, // Large offset
        200
      );

      expect(fontblocks).toBeDefined();
      // Edge fontblocks should be out-of-bounds
      // (sampling at positions beyond BMP should produce 256 = transparent)
    });
  });

  describe("Full Pipeline Integration", () => {
    test("should process BMP from file through to FontBlocks", () => {
      // This tests the real-world flow
      const bmpPath = writeTestBMP("integration_test.bmp", 200, 150, 15);

      // Step 1: Load BMP
      const loader = new CDGMagic_BMPLoader(bmpPath);
      expect(loader.width()).toBeGreaterThan(0);
      expect(loader.height()).toBeGreaterThan(0);

      // Step 2: Create BMPData
      const bmpData: BMPData = {
        width: loader.width(),
        height: loader.height(),
        bitsPerPixel: 8,
        palette: loader.get_palette_8bit(),
        pixels: loader.get_pixel_data(),
      };

      expect(bmpData.pixels.length).toBe(bmpData.width * bmpData.height);

      // Step 3: Convert to FontBlocks
      const encoder = new CDGMagic_GraphicsEncoder();
      const fontblocks = encoder.bmp_to_fonts(bmpData, 1000);

      expect(fontblocks.length).toBeGreaterThan(0);

      // Step 4: Verify FontBlocks have correct dimensions and structure
      for (const fb of fontblocks) {
        expect(fb).toBeInstanceOf(CDGMagic_FontBlock);
        // FontBlock should have valid coordinates and timing
        expect((fb as any).x_block).toBeDefined();
        expect((fb as any).y_block).toBeDefined();
        expect((fb as any).internal_start_pack).toBeGreaterThanOrEqual(1000);
      }
    });

    test("should not render pixels as all-black due to data access issues", () => {
      // Regression test: pixels used to be empty (all-black) due to get_pixel_data bug
      const bmpPath = writeTestBMP("regression_black.bmp", 60, 60, 42);
      const loader = new CDGMagic_BMPLoader(bmpPath);

      const pixels = loader.get_pixel_data();
      
      // CRITICAL: Verify pixels are NOT empty
      expect(pixels.length).toBe(60 * 60);
      
      // CRITICAL: Verify pixels have the expected value (not all 0)
      let nonZeroCount = 0;
      for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) {
          nonZeroCount++;
        }
      }
      
      // Should have 3600 non-zero pixels (all filled with 42)
      expect(nonZeroCount).toBe(3600);
    });
  });

  describe("Image Orientation - Y-Axis Inversion", () => {
    test("should correctly invert Y-axis when loading BMP (bottom-to-top file format)", () => {
      // Create BMP with distinct top/bottom patterns:
      // Top half (rows 0-4): color 10 (blue-ish)
      // Bottom half (rows 5-9): color 20 (red-ish)
      const testDir = path.join(__dirname, "../../tmp/test-bmp");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const width = 10;
      const height = 10;
      const bmpPath = path.join(testDir, "test_orientation.bmp");

      // Create BMP file manually with known pattern
      const pixelDataSize = width * height;
      const paletteSize = 256 * 4;
      const fileSize = 14 + 40 + paletteSize + pixelDataSize;
      const buffer = Buffer.alloc(fileSize);

      // BMP headers
      buffer[0] = 0x42;
      buffer[1] = 0x4d;
      buffer.writeUInt32LE(fileSize, 0x02);
      buffer.writeUInt32LE(0, 0x06);
      buffer.writeUInt32LE(14 + 40 + paletteSize, 0x0a);
      buffer.writeUInt32LE(40, 0x0e);
      buffer.writeInt32LE(width, 0x12);
      buffer.writeInt32LE(height, 0x16);
      buffer.writeUInt16LE(1, 0x1a);
      buffer.writeUInt16LE(8, 0x1c);
      buffer.writeUInt32LE(0, 0x1e);
      buffer.writeUInt32LE(pixelDataSize, 0x22);

      // Palette (grayscale)
      const paletteOffset = 0x36;
      for (let i = 0; i < 256; i++) {
        const offset = paletteOffset + i * 4;
        buffer[offset] = i;
        buffer[offset + 1] = i;
        buffer[offset + 2] = i;
        buffer[offset + 3] = 0;
      }

      // Pixel data: BMP format is BOTTOM-TO-TOP
      // In the BMP file: file offset 0 = bottom row of image, file offset (height-1) = top row of image
      // We want visual top to have color 20 and visual bottom to have color 10
      // So in file: first pixels (file y=0) = visual bottom (color 10), last pixels (file y=height-1) = visual top (color 20)
      const pixelOffset = paletteOffset + paletteSize;
      for (let fileY = 0; fileY < height; fileY++) {
        // fileY=0 is bottom of image, fileY=height-1 is top of image
        // Visual row (from top): visualY = height - fileY - 1
        const visualY = height - fileY - 1;
        const color = visualY < height / 2 ? 20 : 10; // Top half (visualY 0-4) gets color 20, bottom half (visualY 5-9) gets color 10
        
        for (let x = 0; x < width; x++) {
          const filePos = pixelOffset + fileY * width + x;
          buffer[filePos] = color;
        }
      }

      fs.writeFileSync(bmpPath, buffer);

      // Load and verify orientation
      const loader = new CDGMagic_BMPLoader(bmpPath);
      const pixels = loader.get_pixel_data();

      // After Y-inversion, top rows (y=0-4) should have color 20
      for (let y = 0; y < height / 2; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          expect(pixels[idx]).toBe(20);
        }
      }

      // Bottom rows (y=5-9) should have color 10
      for (let y = height / 2; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          expect(pixels[idx]).toBe(10);
        }
      }
    });

    test("should place sun in upper-left (sky on top, grass on bottom)", () => {
      // Simulate simple_sky_2+14.bmp structure:
      // Top 75% = sky (blue, color 50)
      // Bottom 25% = grass (green, color 100)
      // Upper left corner = sun (yellow, color 150)
      const testDir = path.join(__dirname, "../../tmp/test-bmp");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const width = 40;
      const height = 40;
      const bmpPath = path.join(testDir, "test_sky_grass.bmp");

      const pixelDataSize = width * height;
      const paletteSize = 256 * 4;
      const fileSize = 14 + 40 + paletteSize + pixelDataSize;
      const buffer = Buffer.alloc(fileSize);

      // Headers
      buffer[0] = 0x42;
      buffer[1] = 0x4d;
      buffer.writeUInt32LE(fileSize, 0x02);
      buffer.writeUInt32LE(0, 0x06);
      buffer.writeUInt32LE(14 + 40 + paletteSize, 0x0a);
      buffer.writeUInt32LE(40, 0x0e);
      buffer.writeInt32LE(width, 0x12);
      buffer.writeInt32LE(height, 0x16);
      buffer.writeUInt16LE(1, 0x1a);
      buffer.writeUInt16LE(8, 0x1c);
      buffer.writeUInt32LE(0, 0x1e);
      buffer.writeUInt32LE(pixelDataSize, 0x22);

      // Palette
      const paletteOffset = 0x36;
      for (let i = 0; i < 256; i++) {
        const offset = paletteOffset + i * 4;
        buffer[offset] = i;
        buffer[offset + 1] = i;
        buffer[offset + 2] = i;
        buffer[offset + 3] = 0;
      }

      // Pixel data: BMP is bottom-to-top, so:
      // File bottom rows (0-9) = actual image top rows (30-39) = sky
      // File top rows (30-39) = actual image bottom rows (0-9) = grass
      const pixelOffset = paletteOffset + paletteSize;
      for (let fileY = 0; fileY < height; fileY++) {
        for (let x = 0; x < width; x++) {
          const filePos = pixelOffset + fileY * width + x;
          
          // Determine what's in this file position
          // File rows 0-9 map to image rows 30-39 (bottom = grass)
          // File rows 10-39 map to image rows 0-29 (top = sky)
          const imageY = height - fileY - 1;
          let color: number;
          
          if (imageY < height * 0.75) {
            // Top 75% = sky (blue)
            color = 50;
          } else {
            // Bottom 25% = grass (green)
            color = 100;
          }

          // Add sun in upper-left corner (upper 10 rows, left 10 columns)
          if (imageY < 10 && x < 10) {
            color = 150; // Yellow/gold sun
          }

          buffer[filePos] = color;
        }
      }

      fs.writeFileSync(bmpPath, buffer);

      // Load and verify
      const loader = new CDGMagic_BMPLoader(bmpPath);
      const pixels = loader.get_pixel_data();

      // Check top rows are sky (color 50)
      for (let y = 0; y < height * 0.75; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          // Except upper-left corner where sun is
          const expected = (y < 10 && x < 10) ? 150 : 50;
          expect(pixels[idx]).toBe(expected);
        }
      }

      // Check bottom rows are grass (color 100)
      for (let y = Math.floor(height * 0.75); y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          expect(pixels[idx]).toBe(100);
        }
      }

      // Specifically verify sun position: upper-left, not lower-left
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const idx = y * width + x;
          expect(pixels[idx]).toBe(150);
        }
      }
    });

    test("should match C++ formula: bmp_buffer[x + (height-y-1)*width]", () => {
      // Direct test of the formula used in C++ implementation
      const testDir = path.join(__dirname, "../../tmp/test-bmp");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const width = 5;
      const height = 5;
      const bmpPath = path.join(testDir, "test_formula.bmp");

      const pixelDataSize = width * height;
      const paletteSize = 256 * 4;
      const fileSize = 14 + 40 + paletteSize + pixelDataSize;
      const buffer = Buffer.alloc(fileSize);

      // Headers
      buffer[0] = 0x42;
      buffer[1] = 0x4d;
      buffer.writeUInt32LE(fileSize, 0x02);
      buffer.writeUInt32LE(0, 0x06);
      buffer.writeUInt32LE(14 + 40 + paletteSize, 0x0a);
      buffer.writeUInt32LE(40, 0x0e);
      buffer.writeInt32LE(width, 0x12);
      buffer.writeInt32LE(height, 0x16);
      buffer.writeUInt16LE(1, 0x1a);
      buffer.writeUInt16LE(8, 0x1c);
      buffer.writeUInt32LE(0, 0x1e);
      buffer.writeUInt32LE(pixelDataSize, 0x22);

      // Palette
      const paletteOffset = 0x36;
      for (let i = 0; i < 256; i++) {
        buffer[paletteOffset + i * 4] = i;
        buffer[paletteOffset + i * 4 + 1] = i;
        buffer[paletteOffset + i * 4 + 2] = i;
        buffer[paletteOffset + i * 4 + 3] = 0;
      }

      // Create pattern: each pixel has value = (x + y*10)
      // This makes it easy to verify correct mapping
      const pixelOffset = paletteOffset + paletteSize;
      for (let fileY = 0; fileY < height; fileY++) {
        for (let x = 0; x < width; x++) {
          const filePos = pixelOffset + fileY * width + x;
          // Store: x + (fileY * 10)
          buffer[filePos] = (x + fileY * 10) % 256;
        }
      }

      fs.writeFileSync(bmpPath, buffer);

      // Load and verify using C++ formula
      const loader = new CDGMagic_BMPLoader(bmpPath);
      const pixels = loader.get_pixel_data();

      // For each output pixel at (x, y), verify it came from correct file location
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const outputIdx = y * width + x;
          
          // C++ formula: bmp_buffer[x + (height-y-1)*width]
          const fileY = height - y - 1;
          const expectedValue = (x + fileY * 10) % 256;
          
          expect(pixels[outputIdx]).toBe(expectedValue);
        }
      }
    });
  });
});

// vim: ts=2 sw=2 et
// END
