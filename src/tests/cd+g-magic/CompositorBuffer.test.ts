/**
 * CompositorBuffer Unit Tests
 *
 * Tests for multi-layer pixel compositing engine
 */

import { CompositorBuffer } from '@/ts/cd+g-magic/CompositorBuffer';

describe('CompositorBuffer', () => {
  let compositor: CompositorBuffer;

  beforeEach(() => {
    compositor = new CompositorBuffer(300, 216);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(compositor.get_width()).toBe(300);
      expect(compositor.get_height()).toBe(216);
    });

    it('should initialize all pixels to transparent (reads as preset index)', () => {
      // When all layers are transparent, composited pixel returns preset_index
      // Preset starts at 0, so reading transparent pixel should give 0
      const pixel = compositor.read_composited_pixel(100, 100);
      expect(pixel).toBe(0);  // Default preset_index is 0
    });

    it('should have correct number of layers', () => {
      expect(CompositorBuffer.get_num_layers()).toBe(8);
    });

    it('should calculate block dimensions correctly', () => {
      expect(compositor.get_width_blocks()).toBe(50);   // 300/6
      expect(compositor.get_height_blocks()).toBe(18);  // 216/12
    });
  });

  describe('Preset Index (Background Color)', () => {
    it('should use preset index as fallback when all layers transparent', () => {
      compositor.set_preset_index(7);
      const pixel = compositor.read_composited_pixel(50, 50);
      expect(pixel).toBe(7);
    });

    it('should change preset index', () => {
      compositor.set_preset_index(3);
      expect(compositor.read_composited_pixel(0, 0)).toBe(3);

      compositor.set_preset_index(15);
      expect(compositor.read_composited_pixel(0, 0)).toBe(15);
    });
  });

  describe('Single Pixel Operations', () => {
    it('should write pixel to layer 0', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(10, 10, 0, 5);
      expect(compositor.read_composited_pixel(10, 10)).toBe(5);
    });

    it('should write pixel to layer 7 (top)', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(10, 10, 7, 12);
      expect(compositor.read_composited_pixel(10, 10)).toBe(12);
    });

    it('should skip transparent pixels', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(10, 10, 7, CompositorBuffer.get_transparency());
      // Should fall back to preset
      expect(compositor.read_composited_pixel(10, 10)).toBe(0);
    });

    it('should use top-most opaque layer', () => {
      compositor.set_preset_index(0);
      // Write to layer 0
      compositor.write_pixel(10, 10, 0, 3);
      expect(compositor.read_composited_pixel(10, 10)).toBe(3);

      // Write transparent to layer 7 - should still be 3
      compositor.write_pixel(10, 10, 7, CompositorBuffer.get_transparency());
      expect(compositor.read_composited_pixel(10, 10)).toBe(3);

      // Write opaque to layer 7 - should be 8
      compositor.write_pixel(10, 10, 7, 8);
      expect(compositor.read_composited_pixel(10, 10)).toBe(8);
    });

    it('should handle layer 0 overridden by layer 1', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(20, 20, 0, 2);
      compositor.write_pixel(20, 20, 1, 5);
      // Layer 1 is on top, so should be 5
      expect(compositor.read_composited_pixel(20, 20)).toBe(5);
    });

    it('should handle multiple intermediate layers', () => {
      compositor.set_preset_index(1);
      compositor.write_pixel(30, 30, 0, 2);
      compositor.write_pixel(30, 30, 1, CompositorBuffer.get_transparency());
      compositor.write_pixel(30, 30, 2, 4);
      compositor.write_pixel(30, 30, 3, CompositorBuffer.get_transparency());
      compositor.write_pixel(30, 30, 4, 7);
      // Should find 7 at layer 4
      expect(compositor.read_composited_pixel(30, 30)).toBe(7);
    });
  });

  describe('Bounds Checking', () => {
    it('should ignore writes outside bounds', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(-1, 0, 0, 5);
      expect(compositor.read_composited_pixel(-1, 0)).toBe(0);

      compositor.write_pixel(300, 0, 0, 5);
      expect(compositor.read_composited_pixel(300, 0)).toBe(0);

      compositor.write_pixel(0, 216, 0, 5);
      expect(compositor.read_composited_pixel(0, 216)).toBe(0);
    });

    it('should accept edge coordinates', () => {
      compositor.set_preset_index(0);
      compositor.write_pixel(0, 0, 0, 3);
      expect(compositor.read_composited_pixel(0, 0)).toBe(3);

      compositor.write_pixel(299, 215, 0, 5);
      expect(compositor.read_composited_pixel(299, 215)).toBe(5);
    });

    it('should ignore invalid layers', () => {
      compositor.set_preset_index(1);
      compositor.write_pixel(10, 10, -1, 5);
      compositor.write_pixel(10, 10, 8, 7);
      expect(compositor.read_composited_pixel(10, 10)).toBe(1);
    });
  });

  describe('Block Operations (6×12 tiles)', () => {
    it('should write block to layer', () => {
      compositor.set_preset_index(0);
      const block = new Uint16Array(72);
      block.fill(5);
      compositor.write_block(0, 0, 0, block);

      // Check corners of block
      expect(compositor.read_composited_pixel(0, 0)).toBe(5);
      expect(compositor.read_composited_pixel(5, 0)).toBe(5);
      expect(compositor.read_composited_pixel(0, 11)).toBe(5);
      expect(compositor.read_composited_pixel(5, 11)).toBe(5);
    });

    it('should read composited block correctly', () => {
      compositor.set_preset_index(0);

      // Write pattern to layer 0: all 3s
      const block0 = new Uint16Array(72);
      block0.fill(3);
      compositor.write_block(0, 0, 0, block0);

      // Write pattern to layer 1: all 7s
      const block1 = new Uint16Array(72);
      block1.fill(7);
      compositor.write_block(0, 0, 1, block1);

      // Read composited should get layer 1 (top) = 7
      const composited = compositor.read_composited_block(0, 0);
      expect(composited.every(p => p === 7)).toBe(true);
    });

    it('should handle partial transparency in blocks', () => {
      compositor.set_preset_index(1);
      const transparency = CompositorBuffer.get_transparency();

      // Layer 0: all 3
      const block0 = new Uint16Array(72);
      block0.fill(3);
      compositor.write_block(0, 0, 0, block0);

      // Layer 1: alternating transparent and 8
      const block1 = new Uint16Array(72);
      for (let i = 0; i < 72; i++) {
        block1[i] = i % 2 === 0 ? transparency : 8;
      }
      compositor.write_block(0, 0, 1, block1);

      // Read composited
      const composited = compositor.read_composited_block(0, 0);

      // Even indices should show 3 (from layer 0)
      // Odd indices should show 8 (from layer 1)
      for (let i = 0; i < 72; i++) {
        expect(composited[i]).toBe(i % 2 === 0 ? 3 : 8);
      }
    });

    it('should handle different block positions', () => {
      compositor.set_preset_index(0);
      const block = new Uint16Array(72);

      // Create pattern block
      for (let i = 0; i < 72; i++) {
        block[i] = i % 16;
      }

      // Write to block at (1, 1)
      compositor.write_block(1, 1, 0, block);

      // Read it back
      const composited = compositor.read_composited_block(1, 1);
      expect(composited).toEqual(block);
    });

    it('should validate block data length', () => {
      const badBlock = new Uint16Array(64);  // Wrong length (should be 72)
      
      // Spy on console.warn to capture the expected warning
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Should not throw, just warn and return early
      expect(() => {
        compositor.write_block(0, 0, 0, badBlock);
      }).not.toThrow();
      
      // Verify that a warning was issued for the invalid length
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid pixel_data length: 64, expected 72')
      );
      
      // Restore console.warn
      warnSpy.mockRestore();
    });
  });

  describe('Layer Stacking (Compositing)', () => {
    it('should composite 8 layers correctly', () => {
      compositor.set_preset_index(0);
      const transparency = CompositorBuffer.get_transparency();

      // Write different colors to each layer at same location
      for (let z = 0; z < 8; z++) {
        compositor.write_pixel(50, 50, z, z + 1);
      }

      // Should read layer 7 (top-most)
      expect(compositor.read_composited_pixel(50, 50)).toBe(8);
    });

    it('should find first opaque layer when top is transparent', () => {
      compositor.set_preset_index(0);
      const transparency = CompositorBuffer.get_transparency();

      compositor.write_pixel(60, 60, 0, 2);
      compositor.write_pixel(60, 60, 1, 3);
      compositor.write_pixel(60, 60, 2, transparency);  // Skip this
      compositor.write_pixel(60, 60, 3, 5);
      compositor.write_pixel(60, 60, 4, transparency);  // Skip
      compositor.write_pixel(60, 60, 5, 7);
      compositor.write_pixel(60, 60, 6, transparency);  // Skip
      compositor.write_pixel(60, 60, 7, transparency);  // Skip

      // Should find layer 5
      expect(compositor.read_composited_pixel(60, 60)).toBe(7);
    });

    it('should handle all layers transparent', () => {
      compositor.set_preset_index(9);
      const transparency = CompositorBuffer.get_transparency();

      // Write transparent to all layers
      for (let z = 0; z < 8; z++) {
        compositor.write_pixel(70, 70, z, transparency);
      }

      // Should fall back to preset
      expect(compositor.read_composited_pixel(70, 70)).toBe(9);
    });

    it('should demonstrate BMPClip + TextClip overlap scenario', () => {
      // Simulate real-world scenario:
      // Layer 0: BMPClip (background)
      // Layer 1: TextClip (overlay)

      compositor.set_preset_index(0);

      // BMPClip on layer 0: has blue (2) background with some transparent areas
      const bmpBlock = new Uint16Array(72);
      bmpBlock.fill(2);
      // Some transparent pixels (checkerboard pattern)
      for (let i = 0; i < 72; i += 2) {
        bmpBlock[i] = CompositorBuffer.get_transparency();
      }
      compositor.write_block(10, 5, 0, bmpBlock);

      // TextClip on layer 1: white text (15) with transparent background
      const textBlock = new Uint16Array(72);
      textBlock.fill(CompositorBuffer.get_transparency());
      // Write text pattern (first 24 pixels have text)
      for (let i = 0; i < 24; i++) {
        textBlock[i] = 15;
      }
      compositor.write_block(10, 5, 1, textBlock);

      // Read composited result
      const result = compositor.read_composited_block(10, 5);

      // First 24 pixels should be text (15) - both opaque, layer 1 wins
      for (let i = 0; i < 24; i++) {
        expect(result[i]).toBe(15);
      }

      // After that (24-71): even indices have transparent BMP (falls to preset 0), odd indices have visible BMP (2)
      for (let i = 24; i < 72; i++) {
        const expected = i % 2 === 0 ? 0 : 2;  // Even = preset, odd = BMP
        expect(result[i]).toBe(expected);
      }
    });
  });

  describe('Clear Operation', () => {
    it('should reset all pixels to transparent', () => {
      compositor.set_preset_index(0);
      // Write data
      for (let z = 0; z < 8; z++) {
        compositor.write_pixel(100, 100, z, z + 1);
      }
      expect(compositor.read_composited_pixel(100, 100)).toBe(8);

      // Clear
      compositor.clear();

      // Should all be transparent now
      expect(compositor.read_composited_pixel(100, 100)).toBe(0);
    });

    it('should clear all layers', () => {
      compositor.set_preset_index(1);

      // Write pattern to multiple locations and layers
      for (let x = 0; x < 50; x += 10) {
        for (let y = 0; y < 50; y += 10) {
          for (let z = 0; z < 8; z++) {
            compositor.write_pixel(x, y, z, z + 5);
          }
        }
      }

      compositor.clear();

      // All should be preset (background fallback)
      expect(compositor.read_composited_pixel(0, 0)).toBe(1);
      expect(compositor.read_composited_pixel(20, 20)).toBe(1);
      expect(compositor.read_composited_pixel(40, 40)).toBe(1);
    });
  });

  describe('Color Index Range', () => {
    it('should handle palette indices 0-255', () => {
      compositor.set_preset_index(0);

      // Test extremes
      compositor.write_pixel(10, 10, 0, 0);
      expect(compositor.read_composited_pixel(10, 10)).toBe(0);

      compositor.write_pixel(20, 20, 0, 255);
      expect(compositor.read_composited_pixel(20, 20)).toBe(255);

      compositor.write_pixel(30, 30, 0, 128);
      expect(compositor.read_composited_pixel(30, 30)).toBe(128);
    });

    it('should distinguish between 255 (opaque) and 256 (transparent)', () => {
      compositor.set_preset_index(7);
      compositor.write_pixel(40, 40, 0, 255);
      expect(compositor.read_composited_pixel(40, 40)).toBe(255);

      compositor.write_pixel(50, 50, 0, CompositorBuffer.get_transparency());
      expect(compositor.read_composited_pixel(50, 50)).toBe(7);
    });
  });
});

// VIM: ts=2 sw=2 et
// END
