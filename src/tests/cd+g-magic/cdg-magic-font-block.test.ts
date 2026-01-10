/**
 * Tests for CDGMagic_FontBlock
 *
 * This test suite covers 6×12 pixel glyph rendering, pixel operations,
 * color prominence calculation, and transparency detection.
 */

import { CDGMagic_FontBlock } from "@/ts/cd+g-magic/CDGMagic_FontBlock";

describe("CDGMagic_FontBlock - Font Glyph Rendering", () => {
  let fontblock: CDGMagic_FontBlock;

  beforeEach(() => {
    fontblock = new CDGMagic_FontBlock();
  });

  test("Constructor initializes with default position and pack", () => {
    expect(fontblock.x_location()).toBe(0);
    expect(fontblock.y_location()).toBe(0);
    expect(fontblock.start_pack()).toBe(0);
  });

  test("Constructor initializes flags and indices", () => {
    expect(fontblock.vram_only()).toBe(0);
    expect(fontblock.xor_only()).toBe(0);
    expect(fontblock.z_location()).toBe(0);
    expect(fontblock.channel()).toBe(0);
    expect(fontblock.replacement_transparent_color()).toBe(256); // 256 = invalid
    expect(fontblock.overlay_transparent_color()).toBe(256); // 256 = invalid
  });

  test("Constructor initializes block with single color (1)", () => {
    expect(fontblock.num_colors()).toBe(1);
  });

  test("pixel_value() getter returns color at coordinates", () => {
    expect(fontblock.pixel_value(0, 0)).toBe(0); // all start as 0
  });

  test("pixel_value() setter stores color at coordinates", () => {
    fontblock.pixel_value(3, 2, 42);
    expect(fontblock.pixel_value(3, 2)).toBe(42);
  });

  test("pixel_value() preserves other pixels", () => {
    fontblock.pixel_value(0, 0, 10);
    fontblock.pixel_value(5, 5, 20);
    expect(fontblock.pixel_value(0, 0)).toBe(10);
    expect(fontblock.pixel_value(5, 5)).toBe(20);
    expect(fontblock.pixel_value(1, 1)).toBe(0);
  });

  test("pixel_value() handles bounds correctly", () => {
    // Valid: 0-5 in X (width 6), 0-11 in Y (height 12)
    fontblock.pixel_value(5, 11, 99);
    expect(fontblock.pixel_value(5, 11)).toBe(99);
  });

  test("num_colors() counts unique colors correctly", () => {
    fontblock.color_fill(0); // all black
    expect(fontblock.num_colors()).toBe(1);

    fontblock.pixel_value(0, 0, 1); // add one red pixel
    expect(fontblock.num_colors()).toBe(2);

    fontblock.pixel_value(1, 0, 1); // add another red pixel
    expect(fontblock.num_colors()).toBe(2); // still 2 unique
  });

  test("prominent_color() returns most frequent color", () => {
    fontblock.color_fill(100);
    fontblock.pixel_value(0, 0, 200); // one different pixel

    // Color 100 appears 71 times, color 200 appears 1 time
    expect(fontblock.prominent_color(0)).toBe(100); // most prominent
    expect(fontblock.prominent_color(1)).toBe(200); // second most
  });

  test("prominent_color() excludes transparent color", () => {
    fontblock.color_fill(50);
    fontblock.replacement_transparent_color(50);

    fontblock.pixel_value(0, 0, 100); // add different color

    // With transparent=50, color 100 should be most prominent
    expect(fontblock.prominent_color(0)).toBe(100);
  });

  test("is_fully_transparent() detects all transparent pixels", () => {
    fontblock.replacement_transparent_color(42);
    fontblock.color_fill(42);
    expect(fontblock.is_fully_transparent()).toBe(1);
  });

  test("is_fully_transparent() returns 0 with non-transparent pixels", () => {
    fontblock.replacement_transparent_color(42);
    fontblock.color_fill(42);
    fontblock.pixel_value(0, 0, 99); // add non-transparent
    expect(fontblock.is_fully_transparent()).toBe(0);
  });

  test("color_fill() fills entire block with single color", () => {
    fontblock.color_fill(77);
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 12; y++) {
        expect(fontblock.pixel_value(x, y)).toBe(77);
      }
    }
    expect(fontblock.num_colors()).toBe(1);
  });

  test("x_location() getter/setter works", () => {
    expect(fontblock.x_location()).toBe(0);
    fontblock.x_location(25);
    expect(fontblock.x_location()).toBe(25);
  });

  test("y_location() getter/setter works", () => {
    expect(fontblock.y_location()).toBe(0);
    fontblock.y_location(10);
    expect(fontblock.y_location()).toBe(10);
  });

  test("z_location() getter/setter works", () => {
    fontblock.z_location(5);
    expect(fontblock.z_location()).toBe(5);
  });

  test("start_pack() getter/setter works", () => {
    expect(fontblock.start_pack()).toBe(0);
    fontblock.start_pack(1000);
    expect(fontblock.start_pack()).toBe(1000);
  });

  test("channel() getter/setter works", () => {
    fontblock.channel(3);
    expect(fontblock.channel()).toBe(3);
  });

  test("vram_only() getter/setter works", () => {
    fontblock.vram_only(1);
    expect(fontblock.vram_only()).toBe(1);
  });

  test("xor_only() getter/setter works", () => {
    fontblock.xor_only(1);
    expect(fontblock.xor_only()).toBe(1);
  });

  test("replacement_transparent_color() getter/setter works", () => {
    fontblock.replacement_transparent_color(123);
    expect(fontblock.replacement_transparent_color()).toBe(123);
  });

  test("overlay_transparent_color() getter/setter works", () => {
    fontblock.overlay_transparent_color(45);
    expect(fontblock.overlay_transparent_color()).toBe(45);
  });

  test("get_bitmap_data() returns raw pixel data", () => {
    fontblock.pixel_value(1, 1, 55);
    const data = fontblock.get_bitmap_data();
    expect(data.length).toBe(72); // 6 × 12
    expect(data[1 + 1 * 6]).toBe(55);
  });

  test("clone() creates independent copy", () => {
    fontblock.x_location(10);
    fontblock.y_location(5);
    fontblock.color_fill(88);
    fontblock.z_location(3);
    fontblock.replacement_transparent_color(42);

    const cloned = fontblock.clone();

    // Verify cloned has same values
    expect(cloned.x_location()).toBe(10);
    expect(cloned.y_location()).toBe(5);
    expect(cloned.z_location()).toBe(3);
    expect(cloned.pixel_value(2, 2)).toBe(88);
    expect(cloned.replacement_transparent_color()).toBe(42);

    // Modify original
    fontblock.pixel_value(0, 0, 99);

    // Verify cloned is unchanged
    expect(cloned.pixel_value(0, 0)).toBe(88);
  });

  test("Integration: Creating and manipulating a glyph", () => {
    // Create a "checkerboard" pattern for testing
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 12; y++) {
        if ((x + y) % 2 === 0) {
          fontblock.pixel_value(x, y, 200);
        } else {
          fontblock.pixel_value(x, y, 100);
        }
      }
    }

    expect(fontblock.num_colors()).toBe(2);
    expect(fontblock.is_fully_transparent()).toBe(0);

    // Set one color as transparent
    fontblock.replacement_transparent_color(100);
    expect(fontblock.is_fully_transparent()).toBe(0); // still has 200
  });
});

// vim: ts=2 sw=2 et
// END
