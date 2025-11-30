/**
 * Advanced FontBlock Encoding
 *
 * Implements sophisticated multi-color block encoding matching C++ reference.
 * Handles 1-color, 2-color, 3-color, and 4+ color blocks with optimal packet sequences.
 *
 * Reference: CDGMagic_GraphicsEncoder__write_fontblock.cpp (lines 18-500+)
 */

export interface ColorEncoding {
  packet_count: number;           // How many packets needed
  instructions: Array<{
    instruction: 'COPY_FONT' | 'XOR_FONT';
    color_0: number;
    color_1: number;
    pixel_bits: Uint8Array;       // 12 bytes (one per row)
  }>;
}

/**
 * Analyze block colors and determine optimal encoding
 *
 * @param pixel_data Block pixels (72 elements)
 * @returns Set of unique non-transparent colors
 */
export function analyze_colors(pixel_data: Uint16Array): Set<number> {
  const colors = new Set<number>();
  for (let i = 0; i < 72; i++) {
    const color = pixel_data[i];
    if (color !== 256) {  // Not transparent
      colors.add(color & 0x0F);
    }
  }
  return colors;
}

/**
 * Encode block with single color
 *
 * @param color Palette index (0-15)
 * @returns Encoding with 1 packet, all bits set (0x3F)
 */
export function encode_single_color(color: number): ColorEncoding {
  const bits = new Uint8Array(12);
  bits.fill(0x3F);  // All 6 pixels set

  return {
    packet_count: 1,
    instructions: [
      {
        instruction: 'COPY_FONT',
        color_0: color,
        color_1: color,
        pixel_bits: bits,
      },
    ],
  };
}

/**
 * Encode block with two colors
 *
 * @param pixel_data Block pixels (72 elements)
 * @param color_0 First color (used for 0-bits)
 * @param color_1 Second color (used for 1-bits)
 * @returns Encoding with 1 packet
 */
export function encode_two_color(
  pixel_data: Uint16Array,
  color_0: number,
  color_1: number
): ColorEncoding {
  const bits = new Uint8Array(12);

  for (let row = 0; row < 12; row++) {
    let byte = 0;
    for (let col = 0; col < 6; col++) {
      const idx = row * 6 + col;
      const pixel_color = pixel_data[idx] & 0x0F;
      const bit = pixel_color === color_1 ? 1 : 0;
      byte |= (bit << (5 - col));
    }
    bits[row] = byte;
  }

  return {
    packet_count: 1,
    instructions: [
      {
        instruction: 'COPY_FONT',
        color_0: color_0,
        color_1: color_1,
        pixel_bits: bits,
      },
    ],
  };
}

/**
 * Encode block with three colors
 *
 * Uses 2 packets: COPY_FONT + XOR_FONT
 * Reference: CDGMagic_GraphicsEncoder__write_fontblock.cpp lines 200-260
 *
 * @param pixel_data Block pixels (72 elements)
 * @param colors Array of color indices sorted by prominence
 * @returns Encoding with 2 packets
 */
export function encode_three_color(
  pixel_data: Uint16Array,
  colors: number[]
): ColorEncoding {
  if (colors.length < 3) {
    throw new Error('encode_three_color requires at least 3 colors');
  }

  const color_0 = colors[1];  // Second most common
  const color_1 = colors[0];  // Most common
  const color_2 = colors[2];  // Third

  // First packet: COPY with color_0 and color_1
  const copy_bits = new Uint8Array(12);
  for (let row = 0; row < 12; row++) {
    let byte = 0;
    for (let col = 0; col < 6; col++) {
      const idx = row * 6 + col;
      const pixel_color = pixel_data[idx] & 0x0F;
      const bit = (pixel_color === color_1) || (pixel_color === color_2) ? 1 : 0;
      byte |= (bit << (5 - col));
    }
    copy_bits[row] = byte;
  }

  // Second packet: XOR to distinguish color_1 and color_2
  const xor_bits = new Uint8Array(12);
  for (let row = 0; row < 12; row++) {
    let byte = 0;
    for (let col = 0; col < 6; col++) {
      const idx = row * 6 + col;
      const pixel_color = pixel_data[idx] & 0x0F;
      const bit = pixel_color === color_2 ? 1 : 0;
      byte |= (bit << (5 - col));
    }
    xor_bits[row] = byte;
  }

  return {
    packet_count: 2,
    instructions: [
      {
        instruction: 'COPY_FONT',
        color_0: color_0,
        color_1: color_1,
        pixel_bits: copy_bits,
      },
      {
        instruction: 'XOR_FONT',
        color_0: 0x00,
        color_1: color_1 ^ color_2,
        pixel_bits: xor_bits,
      },
    ],
  };
}

/**
 * Encode block with four colors using bitplane decomposition
 *
 * For colors where XOR relationships exist (common case):
 * Uses 2-3 packets with bitplane encoding
 *
 * Reference: CDGMagic_GraphicsEncoder__write_fontblock.cpp lines 300+
 *
 * @param pixel_data Block pixels (72 elements)
 * @param colors Array of color indices (length 4)
 * @returns Encoding with variable packets
 */
export function encode_four_color(
  pixel_data: Uint16Array,
  colors: number[]
): ColorEncoding {
  if (colors.length < 4) {
    throw new Error('encode_four_color requires at least 4 colors');
  }

  // Analyze color relationships via XOR
  let colors_or = 0;
  let colors_and = 0xFF;

  for (const color of colors) {
    colors_or |= color;
    colors_and &= color;
  }

  const instructions: Array<{
    instruction: 'COPY_FONT' | 'XOR_FONT';
    color_0: number;
    color_1: number;
    pixel_bits: Uint8Array;
  }> = [];

  // Simple approach: write as 2-color packets for each bit plane
  let copy_type: 'COPY_FONT' | 'XOR_FONT' = 'COPY_FONT';

  for (let bit_plane = 3; bit_plane >= 0; bit_plane--) {
    const bit_mask = 1 << bit_plane;

    // Skip if this bit is never or always set
    if (((colors_or & bit_mask) === 0) || ((colors_and & bit_mask) !== 0)) {
      continue;
    }

    const color_0 = 0;
    let color_1 = bit_mask;

    // If this is the first plane and some bits are always set, OR them in
    if (copy_type === 'COPY_FONT' && colors_and > 0) {
      color_1 |= colors_and;
    }

    const bits = new Uint8Array(12);
    for (let row = 0; row < 12; row++) {
      let byte = 0;
      for (let col = 0; col < 6; col++) {
        const idx = row * 6 + col;
        const pixel_color = pixel_data[idx] & 0x0F;
        const bit = (pixel_color >> bit_plane) & 0x01;
        byte |= (bit << (5 - col));
      }
      bits[row] = byte;
    }

    instructions.push({
      instruction: copy_type,
      color_0: color_0,
      color_1: color_1,
      pixel_bits: bits,
    });

    copy_type = 'XOR_FONT';
  }

  return {
    packet_count: instructions.length,
    instructions: instructions,
  };
}

/**
 * Encode block with many colors using bitplane decomposition
 *
 * Uses bit-by-bit encoding for optimal compression
 * Reference: CDGMagic_GraphicsEncoder__write_fontblock.cpp lines 370+
 *
 * @param pixel_data Block pixels (72 elements)
 * @returns Encoding with variable packets (up to 4)
 */
export function encode_many_colors(pixel_data: Uint16Array): ColorEncoding {
  let colors_or = 0;
  let colors_and = 0xFF;

  for (let i = 0; i < 72; i++) {
    const color = pixel_data[i] & 0x0F;
    colors_or |= color;
    colors_and &= color;
  }

  const instructions: Array<{
    instruction: 'COPY_FONT' | 'XOR_FONT';
    color_0: number;
    color_1: number;
    pixel_bits: Uint8Array;
  }> = [];

  let copy_type: 'COPY_FONT' | 'XOR_FONT' = 'COPY_FONT';

  for (let bit_plane = 3; bit_plane >= 0; bit_plane--) {
    const bit_mask = 1 << bit_plane;

    // Skip if this bit is never or always set
    if (((colors_or & bit_mask) === 0) || ((colors_and & bit_mask) !== 0)) {
      continue;
    }

    let color_0 = 0;
    let color_1 = bit_mask;

    // If this is the first plane and some bits are always set, OR them in
    if (copy_type === 'COPY_FONT' && colors_and > 0) {
      color_0 |= colors_and;
      color_1 |= colors_and;
    }

    const bits = new Uint8Array(12);
    for (let row = 0; row < 12; row++) {
      let byte = 0;
      for (let col = 0; col < 6; col++) {
        const idx = row * 6 + col;
        const pixel_color = pixel_data[idx] & 0x0F;
        const bit = (pixel_color >> bit_plane) & 0x01;
        byte |= (bit << (5 - col));
      }
      bits[row] = byte;
    }

    instructions.push({
      instruction: copy_type,
      color_0: color_0,
      color_1: color_1,
      pixel_bits: bits,
    });

    copy_type = 'XOR_FONT';
  }

  return {
    packet_count: instructions.length,
    instructions: instructions,
  };
}

/**
 * Encode block with optimal multi-color packet sequence
 *
 * Analyzes the block and chooses the best encoding strategy
 *
 * @param pixel_data Block pixels (72 elements)
 * @param prominent_colors Array of colors in prominence order (optional)
 * @returns Optimal ColorEncoding
 */
export function encode_block(
  pixel_data: Uint16Array,
  prominent_colors?: number[]
): ColorEncoding {
  const colors = prominent_colors || Array.from(analyze_colors(pixel_data));

  if (colors.length === 0) {
    // Empty block
    return encode_single_color(0);
  } else if (colors.length === 1) {
    return encode_single_color(colors[0]);
  } else if (colors.length === 2) {
    return encode_two_color(pixel_data, colors[0], colors[1]);
  } else if (colors.length === 3) {
    return encode_three_color(pixel_data, colors);
  } else if (colors.length === 4) {
    return encode_four_color(pixel_data, colors);
  } else {
    return encode_many_colors(pixel_data);
  }
}

// VIM: set ft=typescript :
// END
