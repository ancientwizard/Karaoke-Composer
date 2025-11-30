/**
 * MultiColorEncoder Unit Tests
 *
 * Tests the multi-color block encoding implementation.
 * Validates encoding strategies for 1-color through 16-color blocks.
 */

import {
  analyze_colors,
  encode_single_color,
  encode_two_color,
  encode_three_color,
  encode_four_color,
  encode_many_colors,
  encode_block,
} from '@/ts/cd+g-magic/MultiColorEncoder';

describe('MultiColorEncoder', () => {
  describe('analyze_colors', () => {
    it('should identify colors in block', () => {
      const block = new Uint16Array(72);
      block.fill(256);  // All transparent
      block[0] = 3;     // Color 3
      block[1] = 5;     // Color 5

      const colors = analyze_colors(block);
      expect(colors.has(3)).toBe(true);
      expect(colors.has(5)).toBe(true);
      expect(colors.size).toBe(2);
    });

    it('should ignore transparent pixels (256)', () => {
      const block = new Uint16Array(72);
      block.fill(256);
      block[0] = 7;

      const colors = analyze_colors(block);
      expect(colors.size).toBe(1);
      expect(colors.has(7)).toBe(true);
    });

    it('should handle empty blocks', () => {
      const block = new Uint16Array(72);
      block.fill(256);  // All transparent

      const colors = analyze_colors(block);
      expect(colors.size).toBe(0);
    });

    it('should mask colors to 4-bit range', () => {
      const block = new Uint16Array(72);
      block.fill(256);  // Start with transparent
      block[0] = 0x1F;  // Should be masked to 0x0F
      block[1] = 0x2F;  // Should be masked to 0x0F

      const colors = analyze_colors(block);
      expect(colors.has(0x0F)).toBe(true);
      expect(colors.size).toBe(1);
    });
  });

  describe('Single Color Encoding', () => {
    it('should encode single color block', () => {
      const encoding = encode_single_color(5);

      expect(encoding.packet_count).toBe(1);
      expect(encoding.instructions.length).toBe(1);
      expect(encoding.instructions[0].instruction).toBe('COPY_FONT');
      expect(encoding.instructions[0].color_0).toBe(5);
      expect(encoding.instructions[0].color_1).toBe(5);
      // All pixels should be set (0x3F = 111111 in binary)
      expect(encoding.instructions[0].pixel_bits.every(b => b === 0x3F)).toBe(true);
    });

    it('should have 12 rows of pixel data', () => {
      const encoding = encode_single_color(7);
      expect(encoding.instructions[0].pixel_bits.length).toBe(12);
    });
  });

  describe('Two Color Encoding', () => {
    it('should encode two color block', () => {
      const block = new Uint16Array(72);
      block.fill(3);
      block[0] = 5;  // One pixel different

      const encoding = encode_two_color(block, 3, 5);

      expect(encoding.packet_count).toBe(1);
      expect(encoding.instructions.length).toBe(1);
      expect(encoding.instructions[0].instruction).toBe('COPY_FONT');
      expect(encoding.instructions[0].color_0).toBe(3);
      expect(encoding.instructions[0].color_1).toBe(5);
    });

    it('should set correct pixel bits for two colors', () => {
      const block = new Uint16Array(72);
      block.fill(3);
      // Set first row: 5,5,5,5,5,3 = 11110 in bits
      for (let i = 0; i < 5; i++) block[i] = 5;

      const encoding = encode_two_color(block, 3, 5);
      const byte = encoding.instructions[0].pixel_bits[0];

      // First 5 bits should be 1 (color 5), last bit should be 0 (color 3)
      // Layout: bit 5 4 3 2 1 0 = 1 1 1 1 1 0 = 0x3E
      expect(byte).toBe(0x3E);
    });
  });

  describe('Three Color Encoding', () => {
    it('should encode three color block with 2 packets', () => {
      const block = new Uint16Array(72);
      block.fill(1);     // Most common
      for (let i = 0; i < 24; i++) block[i] = 2;     // Second color
      block[0] = 3;      // Third color (rare)

      const encoding = encode_three_color(block, [1, 2, 3]);

      expect(encoding.packet_count).toBe(2);
      expect(encoding.instructions.length).toBe(2);
      expect(encoding.instructions[0].instruction).toBe('COPY_FONT');
      expect(encoding.instructions[1].instruction).toBe('XOR_FONT');
    });

    it('should use color XOR for distinction', () => {
      // encode_three_color uses colors as:
      // color_0 = colors[1], color_1 = colors[0], color_2 = colors[2]
      // XOR output = color_1 ^ color_2 = colors[0] ^ colors[2]
      const encoding = encode_three_color(new Uint16Array(72), [1, 2, 3]);

      const xor_color = encoding.instructions[1].color_1;
      const expected = 1 ^ 3;  // colors[0] ^ colors[2] = 1 ^ 3 = 2
      expect(xor_color).toBe(expected);
    });
  });

  describe('Four Color Encoding', () => {
    it('should encode four color block', () => {
      const block = new Uint16Array(72);
      block.fill(1);

      const encoding = encode_four_color(block, [1, 2, 4, 8]);

      expect(encoding.packet_count).toBeGreaterThanOrEqual(1);
      expect(encoding.packet_count).toBeLessThanOrEqual(4);
      expect(encoding.instructions.length).toEqual(encoding.packet_count);
    });

    it('should use bitplane decomposition', () => {
      const block = new Uint16Array(72);
      block.fill(0);  // All color 0

      const encoding = encode_four_color(block, [0, 1, 2, 4]);

      // Each packet represents a bit plane
      for (const instr of encoding.instructions) {
        expect([0, 1, 2, 4]).toContain(instr.color_1);
      }
    });
  });

  describe('Many Colors Encoding', () => {
    it('should handle 5+ colors', () => {
      const block = new Uint16Array(72);
      for (let i = 0; i < 72; i++) {
        block[i] = i % 16;  // 16 different colors
      }

      const encoding = encode_many_colors(block);

      expect(encoding.packet_count).toBeGreaterThanOrEqual(1);
      expect(encoding.packet_count).toBeLessThanOrEqual(4);
    });

    it('should use bitplane encoding', () => {
      const block = new Uint16Array(72);
      block.fill(0);
      block[0] = 15;  // One pixel with all bits set

      const encoding = encode_many_colors(block);

      expect(encoding.instructions.length).toBeGreaterThan(0);
      // First instruction should be COPY_FONT
      expect(encoding.instructions[0].instruction).toBe('COPY_FONT');
      // Rest should be XOR_FONT
      for (let i = 1; i < encoding.instructions.length; i++) {
        expect(encoding.instructions[i].instruction).toBe('XOR_FONT');
      }
    });
  });

  describe('Comprehensive Encoding', () => {
    it('should encode empty block', () => {
      const block = new Uint16Array(72);
      block.fill(256);  // All transparent

      const encoding = encode_block(block);
      expect(encoding.packet_count).toBeGreaterThanOrEqual(1);
    });

    it('should choose single color for uniform block', () => {
      const block = new Uint16Array(72);
      block.fill(7);

      const encoding = encode_block(block);
      expect(encoding.packet_count).toBe(1);
      expect(encoding.instructions[0].color_0).toBe(7);
      expect(encoding.instructions[0].color_1).toBe(7);
    });

    it('should choose two color encoding for two colors', () => {
      const block = new Uint16Array(72);
      block.fill(3);
      for (let i = 0; i < 36; i++) block[i] = 5;

      const encoding = encode_block(block);
      expect(encoding.packet_count).toBe(1);
    });

    it('should choose three color encoding for three colors', () => {
      const block = new Uint16Array(72);
      block.fill(1);
      for (let i = 0; i < 24; i++) block[i] = 2;
      for (let i = 0; i < 12; i++) block[i] = 3;

      const encoding = encode_block(block);
      expect(encoding.packet_count).toBe(2);
    });

    it('should respect provided prominent colors order', () => {
      const block = new Uint16Array(72);
      block.fill(5);
      block[0] = 3;
      block[1] = 7;

      // Force specific order: 5, 3, 7
      const encoding = encode_block(block, [5, 3, 7]);
      expect(encoding.instructions[0].color_0).toBe(3);  // Second most common per sort
    });
  });

  describe('Pixel Bit Encoding', () => {
    it('should correctly encode pixel bits', () => {
      const block = new Uint16Array(72);
      // First row: alternating colors 0 and 1
      block[0] = 0;
      block[1] = 1;
      block[2] = 0;
      block[3] = 1;
      block[4] = 0;
      block[5] = 1;
      // Rest transparent
      for (let i = 6; i < 72; i++) block[i] = 256;

      const encoding = encode_two_color(block, 0, 1);
      const byte = encoding.instructions[0].pixel_bits[0];

      // Pattern: bit5=0, bit4=1, bit3=0, bit2=1, bit1=0, bit0=1
      // = 010101 = 0x15
      expect(byte).toBe(0x15);
    });

    it('should have correct row count', () => {
      const encoding = encode_single_color(5);
      expect(encoding.instructions[0].pixel_bits.length).toBe(12);
    });

    it('should handle all-zeros row', () => {
      const block = new Uint16Array(72);
      // All pixels in first row are color 0 (bit 0)
      for (let i = 0; i < 6; i++) block[i] = 0;
      // Rest are color 1 (bit 1)
      for (let i = 6; i < 72; i++) block[i] = 1;

      const encoding = encode_two_color(block, 0, 1);
      expect(encoding.instructions[0].pixel_bits[0]).toBe(0x00);  // First row: all 0
      expect(encoding.instructions[0].pixel_bits[1]).toBe(0x3F);  // Second row: all 1
    });
  });
});

// VIM: set ft=typescript :
// END
