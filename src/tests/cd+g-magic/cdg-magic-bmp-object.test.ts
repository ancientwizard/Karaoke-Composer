/**
 * Tests for CDGMagic_BMPObject
 *
 * This test suite covers bitmap pixel operations, palette management,
 * color transitions, cloning, and bitmap manipulation.
 */

import { CDGMagic_BMPObject } from "@/ts/cd+g-magic/CDGMagic_BMPObject";
import { CDGMagic_PALObject } from "@/ts/cd+g-magic/CDGMagic_PALObject";

describe("CDGMagic_BMPObject - Bitmap Object", () => {
  let bitmap: CDGMagic_BMPObject;

  beforeEach(() => {
    bitmap = new CDGMagic_BMPObject(100, 50);
  });

  test("Constructor allocates bitmap buffer", () => {
    expect(bitmap.width()).toBe(100);
    expect(bitmap.height()).toBe(50);
  });

  test("Constructor with zero dimensions creates empty bitmap", () => {
    const empty = new CDGMagic_BMPObject(0, 0);
    expect(empty.width()).toBe(0);
    expect(empty.height()).toBe(0);
  });

  test("Default fill index is 0", () => {
    expect(bitmap.fill_index()).toBe(0);
  });

  test("Default offsets are 0", () => {
    expect(bitmap.x_offset()).toBe(0);
    expect(bitmap.y_offset()).toBe(0);
  });

  test("Default XOR bandwidth is 3.0", () => {
    expect(bitmap.xor_bandwidth()).toBe(3.0);
  });

  test("pixel() getter returns fill_index out of bounds", () => {
    expect(bitmap.pixel(200, 200)).toBe(0); // Out of bounds
    bitmap.fill_index(42);
    expect(bitmap.pixel(200, 200)).toBe(42);
  });

  test("pixel() setter stores and retrieves color", () => {
    bitmap.pixel(10, 20, 100);
    expect(bitmap.pixel(10, 20)).toBe(100);
  });

  test("pixel() operations don't affect other pixels", () => {
    bitmap.pixel(10, 10, 50);
    bitmap.pixel(20, 20, 75);
    expect(bitmap.pixel(10, 10)).toBe(50);
    expect(bitmap.pixel(20, 20)).toBe(75);
    expect(bitmap.pixel(15, 15)).toBe(0);
  });

  test("linear_pixel() with index calculation", () => {
    bitmap.pixel(5, 3, 111); // x=5, y=3, linear = 3*100+5 = 305
    expect(bitmap.linear_pixel(305)).toBe(111);
  });

  test("linear_pixel() returns fill_index out of bounds", () => {
    expect(bitmap.linear_pixel(9999)).toBe(0);
    bitmap.fill_index(88);
    expect(bitmap.linear_pixel(9999)).toBe(88);
  });

  test("get_rgb_pixel() combines pixel and palette lookup", () => {
    bitmap.pixel(10, 10, 50);
    bitmap.PALObject().color(50, 0xff0000ff); // Red
    expect(bitmap.get_rgb_pixel(10, 10)).toBe(0xff0000ff);
  });

  test("PALObject() returns valid palette", () => {
    const pal = bitmap.PALObject();
    expect(pal).toBeInstanceOf(CDGMagic_PALObject);
    expect(pal.number_of_colors()).toBe(256);
  });

  test("fill_index() get/set", () => {
    bitmap.fill_index(200);
    expect(bitmap.fill_index()).toBe(200);
  });

  test("x_offset() get/set", () => {
    bitmap.x_offset(-50);
    expect(bitmap.x_offset()).toBe(-50);
  });

  test("y_offset() get/set", () => {
    bitmap.y_offset(30);
    expect(bitmap.y_offset()).toBe(30);
  });

  test("xor_only() get/set", () => {
    bitmap.xor_only(1);
    expect(bitmap.xor_only()).toBe(1);
    bitmap.xor_only(0);
    expect(bitmap.xor_only()).toBe(0);
  });

  test("should_composite() get/set", () => {
    bitmap.should_composite(1);
    expect(bitmap.should_composite()).toBe(1);
  });

  test("composite_index() get/set", () => {
    bitmap.composite_index(120);
    expect(bitmap.composite_index()).toBe(120);
  });

  test("xor_bandwidth() clamps to minimum 1.0", () => {
    bitmap.xor_bandwidth(0.5);
    expect(bitmap.xor_bandwidth()).toBe(1.0);
    bitmap.xor_bandwidth(2.5);
    expect(bitmap.xor_bandwidth()).toBe(2.5);
  });

  test("draw_delay() get/set", () => {
    bitmap.draw_delay(500);
    expect(bitmap.draw_delay()).toBe(500);
  });

  test("transition_length() returns block count", () => {
    expect(bitmap.transition_length()).toBe(768);
  });

  test("transition_block() returns block location", () => {
    const x = bitmap.transition_block(0, 0); // First block, X
    expect(x).toBeGreaterThanOrEqual(1);
    expect(x).toBeLessThanOrEqual(48);

    const y = bitmap.transition_block(0, 1); // First block, Y
    expect(y).toBeGreaterThanOrEqual(1);
    expect(y).toBeLessThanOrEqual(16);
  });

  test("transition_block() bounds check", () => {
    expect(bitmap.transition_block(9999, 0)).toBe(0);
    expect(bitmap.transition_block(-1, 0)).toBe(0);
  });

  test("transition_file() getter/setter", () => {
    expect(bitmap.transition_file()).toBeNull();
    const result = bitmap.transition_file(null); // Reset
    expect(result).toBe(0);
  });

  test("transition_row_mask() creates row pattern", () => {
    bitmap.transition_row_mask(0x0f); // Enable rows 0-3
    expect(bitmap.transition_length()).toBeGreaterThan(0);
  });

  test("alter_buffer_size() reallocates buffer", () => {
    bitmap.alter_buffer_size(200, 100);
    expect(bitmap.width()).toBe(200);
    expect(bitmap.height()).toBe(100);
  });

  test("alter_buffer_size() skips unnecessary reallocation", () => {
    bitmap.alter_buffer_size(100, 50); // Same size
    expect(bitmap.width()).toBe(100);
    expect(bitmap.height()).toBe(50);
  });

  test("get_bitmap_data() returns pixel array", () => {
    const data = bitmap.get_bitmap_data();
    expect(data).not.toBeNull();
    expect(data?.length).toBe(100 * 50);
  });

  test("clone() creates independent copy", () => {
    bitmap.pixel(10, 10, 123);
    bitmap.fill_index(45);
    bitmap.x_offset(15);
    bitmap.xor_only(1);

    const cloned = bitmap.clone();

    expect(cloned.width()).toBe(100);
    expect(cloned.height()).toBe(50);
    expect(cloned.pixel(10, 10)).toBe(123);
    expect(cloned.fill_index()).toBe(45);
    expect(cloned.x_offset()).toBe(15);
    expect(cloned.xor_only()).toBe(1);

    // Modify original
    bitmap.pixel(10, 10, 200);
    expect(cloned.pixel(10, 10)).toBe(123); // Unchanged
  });
});

// vim: ts=2 sw=2 et
// END
