/**
 * CDGMagic_ScrollClip: Scrolling Content Clip
 *
 * Scrolling content clip providing:
 * - Scroll direction control (none, left, right, up, down)
 * - Scroll speed management
 * - Position offset (X/Y coordinates)
 * - Wrap mode control
 * - Cloning with full state preservation
 * - JSON serialization and deserialization
 *
 * 11 tests covering scroll properties, offset management, cloning, and JSON round-trip serialization.
 */

import { CDGMagic_ScrollClip, ScrollDirection } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";

describe("CDGMagic_ScrollClip - Scrolling Content Clip", () => {
  let clip: CDGMagic_ScrollClip;

  beforeEach(() => {
    clip = new CDGMagic_ScrollClip(0, 1000);
  });

  test("should create scroll clip", () => {
    expect(clip).toBeDefined();
    expect(clip.start_pack()).toBe(0);
  });

  test("should get/set scroll direction", () => {
    expect(clip.scroll_direction()).toBe(ScrollDirection.NONE);

    clip.scroll_direction(ScrollDirection.LEFT);
    expect(clip.scroll_direction()).toBe(ScrollDirection.LEFT);
  });

  test("should get/set scroll speed", () => {
    expect(clip.scroll_speed()).toBe(1);

    clip.scroll_speed(3);
    expect(clip.scroll_speed()).toBe(3);
  });

  test("should clamp scroll speed to non-negative", () => {
    clip.scroll_speed(-5);
    expect(clip.scroll_speed()).toBe(0);
  });

  test("should get/set X offset", () => {
    expect(clip.x_offset()).toBe(0);

    clip.x_offset(50);
    expect(clip.x_offset()).toBe(50);
  });

  test("should get/set Y offset", () => {
    expect(clip.y_offset()).toBe(0);

    clip.y_offset(-30);
    expect(clip.y_offset()).toBe(-30);
  });

  test("should get/set wrap mode", () => {
    expect(clip.wrap_mode()).toBe(false);

    clip.wrap_mode(true);
    expect(clip.wrap_mode()).toBe(true);
  });

  test("should clone scroll clip with full state", () => {
    clip.scroll_direction(ScrollDirection.DOWN);
    clip.scroll_speed(2);
    clip.x_offset(10);
    clip.y_offset(20);
    clip.wrap_mode(true);
    clip.audio_frames(88200);

    const cloned = clip.clone();
    expect(cloned.scroll_direction()).toBe(ScrollDirection.DOWN);
    expect(cloned.scroll_speed()).toBe(2);
    expect(cloned.x_offset()).toBe(10);
    expect(cloned.y_offset()).toBe(20);
    expect(cloned.wrap_mode()).toBe(true);
    expect(cloned.audio_frames()).toBe(88200);
  });

  test("should serialize scroll clip to JSON", () => {
    clip.scroll_direction(ScrollDirection.RIGHT);
    clip.scroll_speed(2);
    const json_str = clip.to_json();

    expect(json_str).toContain("ScrollClip");
    expect(json_str).toContain("2");
  });

  test("should deserialize scroll clip from JSON", () => {
    clip.scroll_direction(ScrollDirection.UP);
    clip.scroll_speed(4);
    clip.x_offset(-15);
    const json_str = clip.to_json();

    const clip2 = new CDGMagic_ScrollClip();
    expect(clip2.from_json(json_str)).toBe(true);
    expect(clip2.scroll_direction()).toBe(ScrollDirection.UP);
    expect(clip2.scroll_speed()).toBe(4);
    expect(clip2.x_offset()).toBe(-15);
  });

  test("should fail deserializing wrong type", () => {
    const clip2 = new CDGMagic_ScrollClip();
    expect(clip2.from_json('{"type": "PALGlobalClip"}')).toBe(false);
  });
});

// vim: ts=2 sw=2 et
// END
