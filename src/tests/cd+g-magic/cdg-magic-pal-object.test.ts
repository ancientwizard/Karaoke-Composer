/**
 * Tests for CDGMagic_PALObject
 *
 * This test suite covers 256-color palette initialization, color get/set operations,
 * dissolve effects, and color palette manipulation.
 */

import { CDGMagic_PALObject } from "@/ts/cd+g-magic/CDGMagic_PALObject";

describe("CDGMagic_PALObject - Palette Management", () => {
  let palette: CDGMagic_PALObject;

  beforeEach(() => {
    palette = new CDGMagic_PALObject();
  });

  test("Constructor initializes 256 colors to black (0x000000FF)", () => {
    expect(palette.number_of_colors()).toBe(256);
    // Check a few colors
    expect(palette.color(0)).toBe(0x000000ff);
    expect(palette.color(127)).toBe(0x000000ff);
    expect(palette.color(255)).toBe(0x000000ff);
  });

  test("Constructor initializes update mask to 0xFFFF", () => {
    expect(palette.update_mask()).toBe(0xffff);
  });

  test("Constructor initializes dissolve interval and steps to 0", () => {
    expect(palette.dissolve_interval()).toBe(0);
    expect(palette.dissolve_steps()).toBe(0);
  });

  test("color() getter retrieves color at index", () => {
    expect(palette.color(10)).toBe(0x000000ff);
  });

  test("color() setter updates color at index", () => {
    const red_opaque = 0xff0000ff;
    palette.color(0, red_opaque);
    expect(palette.color(0)).toBe(red_opaque);
  });

  test("color() setter preserves other palette entries", () => {
    palette.color(42, 0x00ff00ff); // green
    expect(palette.color(0)).toBe(0x000000ff); // black still
    expect(palette.color(42)).toBe(0x00ff00ff); // green at 42
    expect(palette.color(255)).toBe(0x000000ff); // black still
  });

  test("update_mask() getter returns current mask", () => {
    expect(palette.update_mask()).toBe(0xffff);
  });

  test("update_mask() setter updates mask", () => {
    palette.update_mask(0x00ff);
    expect(palette.update_mask()).toBe(0x00ff);
  });

  test("dissolve() sets interval and steps", () => {
    palette.dissolve(150, 15);
    expect(palette.dissolve_interval()).toBe(150);
    expect(palette.dissolve_steps()).toBe(15);
  });

  test("dissolve() uses default steps=15 when not provided", () => {
    palette.dissolve(100);
    expect(palette.dissolve_interval()).toBe(100);
    expect(palette.dissolve_steps()).toBe(15);
  });

  test("get_palette_array() returns reference to internal palette", () => {
    palette.color(5, 0xffffff00); // cyan
    const arr = palette.get_palette_array();
    expect(arr[5]).toBe(0xffffff00);
  });

  test("clone() creates independent copy", () => {
    palette.color(10, 0xff0000ff); // red
    palette.update_mask(0x1234);
    palette.dissolve(200, 20);

    const cloned = palette.clone();

    // Verify cloned has same values
    expect(cloned.color(10)).toBe(0xff0000ff);
    expect(cloned.update_mask()).toBe(0x1234);
    expect(cloned.dissolve_interval()).toBe(200);
    expect(cloned.dissolve_steps()).toBe(20);

    // Modify original
    palette.color(10, 0x00ff00ff);

    // Verify cloned is unchanged
    expect(cloned.color(10)).toBe(0xff0000ff);
  });
});

// vim: ts=2 sw=2 et
// END
