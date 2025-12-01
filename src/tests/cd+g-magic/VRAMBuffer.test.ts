/**
 * VRAMBuffer Unit Tests
 *
 * Tests the VRAM (screen memory) buffer implementation.
 * Validates that VRAM tracks on-screen state correctly for change detection.
 */

import { VRAMBuffer } from '@/ts/cd+g-magic/VRAMBuffer';

describe('VRAMBuffer', () => {
  let vram: VRAMBuffer;

  beforeEach(() => {
    vram = new VRAMBuffer(300, 216);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(vram.width()).toBe(300);
      expect(vram.height()).toBe(216);
    });

    it('should initialize all pixels to 0', () => {
      for (let x = 0; x < 300; x += 50) {
        for (let y = 0; y < 216; y += 50) {
          expect(vram.read_pixel(x, y)).toBe(0);
        }
      }
    });

    it('should support custom dimensions', () => {
      const custom = new VRAMBuffer(640, 480);
      expect(custom.width()).toBe(640);
      expect(custom.height()).toBe(480);
    });
  });

  describe('Pixel Operations', () => {
    it('should write and read single pixels', () => {
      vram.write_pixel(10, 20, 5);
      expect(vram.read_pixel(10, 20)).toBe(5);
    });

    it('should handle color masking (0xFF)', () => {
      vram.write_pixel(0, 0, 0xFF);
      expect(vram.read_pixel(0, 0)).toBe(0xFF);
    });

    it('should ignore out-of-bounds writes', () => {
      vram.write_pixel(-1, 0, 5);
      vram.write_pixel(300, 0, 5);
      vram.write_pixel(0, -1, 5);
      vram.write_pixel(0, 216, 5);
      expect(vram.read_pixel(0, 0)).toBe(0);
    });

    it('should return 0 for out-of-bounds reads', () => {
      expect(vram.read_pixel(-1, 0)).toBe(0);
      expect(vram.read_pixel(300, 0)).toBe(0);
      expect(vram.read_pixel(0, -1)).toBe(0);
      expect(vram.read_pixel(0, 216)).toBe(0);
    });

    it('should write patterns of pixels', () => {
      for (let i = 0; i < 50; i++) {
        vram.write_pixel(i, 0, i);
      }
      for (let i = 0; i < 50; i++) {
        expect(vram.read_pixel(i, 0)).toBe(i);
      }
    });
  });

  describe('Block Operations', () => {
    it('should write and read 6×12 blocks', () => {
      const block = new Uint8Array(72);
      for (let i = 0; i < 72; i++) {
        block[i] = (i % 16);
      }

      vram.write_block(0, 0, block);
      const read_back = vram.read_block(0, 0);

      expect(read_back).toEqual(block);
    });

    it('should write blocks at different positions', () => {
      const block = new Uint8Array(72);
      block.fill(7);

      // Write to block (10, 5)
      vram.write_block(10, 5, block);

      // Read it back
      const read_back = vram.read_block(10, 5);
      expect(read_back).toEqual(block);

      // Verify different block is still empty
      const other = vram.read_block(20, 10);
      expect(other.every(p => p === 0)).toBe(true);
    });

    it('should handle full screen of blocks', () => {
      const block = new Uint8Array(72);
      let value = 0;

      // Write 50×18 = 900 blocks
      for (let by = 0; by < 18; by++) {
        for (let bx = 0; bx < 50; bx++) {
          for (let i = 0; i < 72; i++) {
            block[i] = value % 256;
          }
          vram.write_block(bx, by, block);
          value++;
        }
      }

      // Verify a few
      value = 0;
      for (let by = 0; by < 18; by++) {
        for (let bx = 0; bx < 50; bx++) {
          const expected = new Uint8Array(72);
          for (let i = 0; i < 72; i++) {
            expected[i] = value % 256;
          }
          const actual = vram.read_block(bx, by);
          expect(actual).toEqual(expected);
          value++;
          if (value >= 5) break;  // Just test a few
        }
        if (value >= 5) break;
      }
    });

    it('should reject invalid block length', () => {
      const bad_block = new Uint8Array(64);
      bad_block.fill(5);

      // Should silently ignore
      vram.write_block(0, 0, bad_block);

      // VRAM should still be empty
      const read_back = vram.read_block(0, 0);
      expect(read_back.every(p => p === 0)).toBe(true);
    });
  });

  describe('Clear Operations', () => {
    it('should clear VRAM to default color (0)', () => {
      const block = new Uint8Array(72);
      block.fill(15);
      vram.write_block(0, 0, block);

      vram.clear();

      const read_back = vram.read_block(0, 0);
      expect(read_back.every(p => p === 0)).toBe(true);
    });

    it('should clear VRAM to specified color', () => {
      const block = new Uint8Array(72);
      block.fill(5);
      vram.write_block(5, 5, block);

      vram.clear(3);

      // Read multiple blocks to verify full clear
      for (let by = 0; by < 5; by++) {
        for (let bx = 0; bx < 5; bx++) {
          const read_back = vram.read_block(bx, by);
          expect(read_back.every(p => p === 3)).toBe(true);
        }
      }
    });
  });

  describe('Block Comparison (Change Detection)', () => {
    it('should detect identical blocks', () => {
      const block = new Uint8Array(72);
      block.fill(7);

      vram.write_block(0, 0, block);

      // Same block should match
      expect(vram.block_matches(0, 0, block)).toBe(true);
    });

    it('should detect different blocks', () => {
      const block1 = new Uint8Array(72);
      block1.fill(3);

      const block2 = new Uint8Array(72);
      block2.fill(5);

      vram.write_block(0, 0, block1);

      // Different block should not match
      expect(vram.block_matches(0, 0, block2)).toBe(false);
    });

    it('should detect single pixel difference', () => {
      const block = new Uint8Array(72);
      block.fill(7);

      vram.write_block(0, 0, block);

      const modified = new Uint8Array(72);
      modified.set(block);
      modified[35] = 9;  // Change one pixel

      expect(vram.block_matches(0, 0, modified)).toBe(false);
    });

    it('should compare blocks at different positions', () => {
      const block = new Uint8Array(72);
      block.fill(4);

      vram.write_block(5, 5, block);

      // Same data at different position should not match
      expect(vram.block_matches(6, 5, block)).toBe(false);

      // Same data at same position should match
      expect(vram.block_matches(5, 5, block)).toBe(true);
    });

    it('should handle invalid block length in comparison', () => {
      const bad_block = new Uint8Array(64);
      expect(vram.block_matches(0, 0, bad_block)).toBe(false);
    });
  });

  describe('Memory Preset', () => {
    it('should clear VRAM via memory_preset', () => {
      const block = new Uint8Array(72);
      block.fill(12);
      vram.write_block(0, 0, block);

      vram.memory_preset(0, 6);

      // Should be cleared to color 6
      const read_back = vram.read_block(0, 0);
      expect(read_back.every(p => p === 6)).toBe(true);
    });
  });

  describe('Buffer Access', () => {
    it('should provide direct buffer access', () => {
      const buffer = vram.get_buffer();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBe(300 * 216);
    });

    it('should allow direct buffer modification', () => {
      const buffer = vram.get_buffer();
      buffer[0] = 42;

      expect(vram.read_pixel(0, 0)).toBe(42);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track overlay scenario', () => {
      // BMP on background
      const bmp_block = new Uint8Array(72);
      bmp_block.fill(2);
      vram.write_block(10, 5, bmp_block);

      // Text overlay replaces some pixels
      const text_block = new Uint8Array(72);
      text_block.set(bmp_block);
      for (let i = 0; i < 24; i++) {
        text_block[i] = 15;  // Text color
      }

      // Should detect difference
      expect(vram.block_matches(10, 5, text_block)).toBe(false);

      // After update
      vram.write_block(10, 5, text_block);
      expect(vram.block_matches(10, 5, text_block)).toBe(true);
    });

    it('should handle multiple block updates', () => {
      // Write initial state
      for (let bx = 0; bx < 10; bx++) {
        const block = new Uint8Array(72);
        block.fill(bx);
        vram.write_block(bx, 0, block);
      }

      // Update some blocks
      for (let bx = 0; bx < 5; bx++) {
        const block = new Uint8Array(72);
        block.fill(100 + bx);
        vram.write_block(bx, 0, block);
      }

      // Verify state
      for (let bx = 0; bx < 10; bx++) {
        const expected = new Uint8Array(72);
        expected.fill(bx < 5 ? 100 + bx : bx);
        expect(vram.block_matches(bx, 0, expected)).toBe(true);
      }
    });
  });
});

// VIM: set ft=typescript :
// END