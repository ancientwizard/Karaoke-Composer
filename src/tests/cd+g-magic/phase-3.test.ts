/**
 * Unit tests for Phase 3 CD+Graphics Magic TypeScript conversions
 *
 * Tests:
 * - CDGMagic_BMPObject: Bitmap object with palette association
 * - CDGMagic_BMPClip: Bitmap-based clip content
 * - CDGMagic_PALGlobalClip: Palette-only clip
 * - CDGMagic_TextClip: Text rendering clip
 * - CDGMagic_ScrollClip: Scrolling content clip
 */

import { CDGMagic_BMPObject } from "@/ts/cd+g-magic/CDGMagic_BMPObject";
import { CDGMagic_PALObject } from "@/ts/cd+g-magic/CDGMagic_PALObject";
import { CDGMagic_BMPClip, CDGMagic_PALGlobalClip, CDGMagic_TextClip
  , CDGMagic_ScrollClip     } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

describe("Phase 3: Bitmap Objects & Clip Specializations", () => {
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

  describe("CDGMagic_BMPClip - Bitmap Clip", () => {
    let clip: CDGMagic_BMPClip;

    beforeEach(() => {
      clip = new CDGMagic_BMPClip(100, 50);
    });

    test("Constructor sets timing", () => {
      expect(clip.start_pack()).toBe(100);
      expect(clip.duration()).toBe(50);
    });

    test("end_pack() calculates end time", () => {
      expect(clip.end_pack()).toBe(150);
    });

    test("start_pack() get/set", () => {
      clip.start_pack(200);
      expect(clip.start_pack()).toBe(200);
      expect(clip.end_pack()).toBe(250); // duration still 50
    });

    test("duration() get/set", () => {
      clip.duration(100);
      expect(clip.duration()).toBe(100);
      expect(clip.end_pack()).toBe(200); // start still 100
    });

    test("file_path() get/set", () => {
      clip.file_path("/path/to/file.bmp");
      expect(clip.file_path()).toBe("/path/to/file.bmp");
    });

    test("Inherits BMPObject methods", () => {
      clip.alter_buffer_size(320, 200);
      clip.pixel(10, 10, 64);
      expect(clip.width()).toBe(320);
      expect(clip.height()).toBe(200);
      expect(clip.pixel(10, 10)).toBe(64);
    });

    test("clone() preserves all data", () => {
      clip.alter_buffer_size(320, 200);
      clip.pixel(50, 50, 99);
      clip.file_path("test.bmp");

      const cloned = clip.clone();

      expect(cloned.start_pack()).toBe(100);
      expect(cloned.duration()).toBe(50);
      expect(cloned.width()).toBe(320);
      expect(cloned.height()).toBe(200);
      expect(cloned.file_path()).toBe("test.bmp");
    });
  });

  describe("CDGMagic_PALGlobalClip - Palette Global Clip", () => {
    let clip: CDGMagic_PALGlobalClip;

    beforeEach(() => {
      clip = new CDGMagic_PALGlobalClip(0, 100);
    });

    test("Constructor sets timing", () => {
      expect(clip.start_pack()).toBe(0);
      expect(clip.duration()).toBe(100);
      expect(clip.end_pack()).toBe(100);
    });

    test("Timing get/set works", () => {
      clip.start_pack(50);
      clip.duration(200);
      expect(clip.start_pack()).toBe(50);
      expect(clip.duration()).toBe(200);
      expect(clip.end_pack()).toBe(250);
    });

    test("Inherits BMPObject palette operations", () => {
      const pal = clip.PALObject();
      pal.color(0, 0xff0000ff);
      expect(clip.PALObject().color(0)).toBe(0xff0000ff);
    });

    test("clone() creates independent copy", () => {
      const cloned = clip.clone();
      expect(cloned.start_pack()).toBe(0);
      expect(cloned.duration()).toBe(100);
    });
  });

  describe("CDGMagic_TextClip - Text Clip", () => {
    let clip: CDGMagic_TextClip;

    beforeEach(() => {
      clip = new CDGMagic_TextClip(100, 300);
    });

    test("Constructor sets timing", () => {
      expect(clip.start_pack()).toBe(100);
      expect(clip.duration()).toBe(300);
    });

    test("Default text is empty", () => {
      expect(clip.text()).toBe("");
    });

    test("Default font is Arial", () => {
      expect(clip.font_name()).toBe("Arial");
    });

    test("Default font size is 12", () => {
      expect(clip.font_size()).toBe(12);
    });

    test("text() get/set", () => {
      clip.text("Hello World");
      expect(clip.text()).toBe("Hello World");
    });

    test("font_name() get/set", () => {
      clip.font_name("Courier");
      expect(clip.font_name()).toBe("Courier");
    });

    test("font_size() get/set", () => {
      clip.font_size(24);
      expect(clip.font_size()).toBe(24);
    });

    test("font_size() minimum is 1", () => {
      clip.font_size(0);
      expect(clip.font_size()).toBe(1);
      clip.font_size(-10);
      expect(clip.font_size()).toBe(1);
    });

    test("clone() preserves text properties", () => {
      clip.text("Test Text");
      clip.font_name("Times New Roman");
      clip.font_size(18);
      clip.alter_buffer_size(200, 100);

      const cloned = clip.clone();

      expect(cloned.text()).toBe("Test Text");
      expect(cloned.font_name()).toBe("Times New Roman");
      expect(cloned.font_size()).toBe(18);
      expect(cloned.width()).toBe(200);
      expect(cloned.height()).toBe(100);
    });
  });

  describe("CDGMagic_ScrollClip - Scroll Clip", () => {
    let clip: CDGMagic_ScrollClip;

    beforeEach(() => {
      clip = new CDGMagic_ScrollClip(50, 200);
    });

    test("Constructor sets timing", () => {
      expect(clip.start_pack()).toBe(50);
      expect(clip.duration()).toBe(200);
    });

    test("Default scroll direction is 0 (up)", () => {
      expect(clip.scroll_direction()).toBe(0);
    });

    test("Default scroll speed is 1.0", () => {
      expect(clip.scroll_speed()).toBe(1);
    });

    test("scroll_direction() get/set", () => {
      clip.scroll_direction(3); // Right
      expect(clip.scroll_direction()).toBe(3);
    });

    test("scroll_direction() clamps to 0-3", () => {
      clip.scroll_direction(10);
      expect(clip.scroll_direction()).toBe(3);
      clip.scroll_direction(-5);
      expect(clip.scroll_direction()).toBe(0);
    });

    test("scroll_speed() get/set", () => {
      clip.scroll_speed(2.5);
      expect(clip.scroll_speed()).toBe(2.5);
    });

    test("scroll_speed() minimum is 0.1", () => {
      clip.scroll_speed(0.01);
      expect(clip.scroll_speed()).toBeGreaterThanOrEqual(0.1);
    });

    test("clone() preserves scroll properties", () => {
      clip.scroll_direction(2); // Left
      clip.scroll_speed(3.5);
      clip.alter_buffer_size(256, 128);

      const cloned = clip.clone();

      expect(cloned.scroll_direction()).toBe(2);
      expect(cloned.scroll_speed()).toBe(3.5);
      expect(cloned.start_pack()).toBe(50);
      expect(cloned.duration()).toBe(200);
    });
  });

  describe("Phase 3 Integration", () => {
    test("Multiple clip types in sequence", () => {
      const bmp_clip = new CDGMagic_BMPClip(0, 100);
      const text_clip = new CDGMagic_TextClip(100, 150);
      const scroll_clip = new CDGMagic_ScrollClip(250, 200);
      const pal_clip = new CDGMagic_PALGlobalClip(450, 50);

      expect(bmp_clip.end_pack()).toBe(100);
      expect(text_clip.end_pack()).toBe(250);
      expect(scroll_clip.end_pack()).toBe(450);
      expect(pal_clip.end_pack()).toBe(500);
    });

    test("Bitmap with pixel data and palette", () => {
      const bmp = new CDGMagic_BMPObject(64, 64);
      bmp.alter_buffer_size(64, 64);

      // Fill with gradient-like pattern
      for (let i = 0; i < 64; i++) {
        bmp.pixel(i, 0, i * 2);
      }

      // Set up palette colors
      for (let i = 0; i < 128; i++) {
        const shade = Math.floor((i / 128) * 255);
        bmp.PALObject().color(i, (shade << 16) | (shade << 8) | shade | 0xff); // Grayscale
      }

      // Verify retrieval
      expect(bmp.pixel(32, 0)).toBe(64);
      expect(bmp.get_rgb_pixel(32, 0)).toBeGreaterThan(0);
    });
  });
});

// VIM: set ft=typescript :
// END