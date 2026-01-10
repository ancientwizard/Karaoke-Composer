/**
 * Tests for CDGMagic_BMPClip
 *
 * This test suite covers bitmap clip timing, file path management,
 * and inheritance from BMPObject base class.
 */

import { CDGMagic_BMPClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

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

// vim: ts=2 sw=2 et
// END
