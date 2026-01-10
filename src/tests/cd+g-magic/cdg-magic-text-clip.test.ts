/**
 * CDGMagic_TextClip: Text Rendering Clip
 *
 * Text rendering clip providing:
 * - Karaoke mode management (titles, lyrics, 5-line)
 * - Font size and index control
 * - Color management (foreground, background, outline)
 * - Text content management
 * - Antialiasing control
 * - Cloning with full state preservation
 * - JSON serialization and deserialization
 *
 * 13 tests covering text properties, font management, cloning, and JSON round-trip serialization.
 */

import { CDGMagic_TextClip, KaraokeModes } from "@/ts/cd+g-magic/CDGMagic_TextClip";

describe("CDGMagic_TextClip - Text Rendering Clip", () => {
  let clip: CDGMagic_TextClip;

  beforeEach(() => {
    clip = new CDGMagic_TextClip(0, 1000);
  });

  test("should create text clip", () => {
    expect(clip).toBeDefined();
    expect(clip.start_pack()).toBe(0);
  });

  test("should get/set karaoke mode", () => {
    expect(clip.karaoke_mode()).toBe(KaraokeModes.TITLES);

    clip.karaoke_mode(KaraokeModes.LYRICS);
    expect(clip.karaoke_mode()).toBe(KaraokeModes.LYRICS);
  });

  test("should get/set font size", () => {
    expect(clip.font_size()).toBe(12);

    clip.font_size(24);
    expect(clip.font_size()).toBe(24);
  });

  test("should clamp font size", () => {
    clip.font_size(200);
    expect(clip.font_size()).toBe(72); // Max
  });

  test("should get/set font index", () => {
    expect(clip.font_index()).toBe(0);

    clip.font_index(3);
    expect(clip.font_index()).toBe(3);
  });

  test("should get/set foreground color", () => {
    expect(clip.foreground_color()).toBe(15);

    clip.foreground_color(128);
    expect(clip.foreground_color()).toBe(128);
  });

  test("should get/set background color", () => {
    expect(clip.background_color()).toBe(0);

    clip.background_color(64);
    expect(clip.background_color()).toBe(64);
  });

  test("should get/set outline color", () => {
    expect(clip.outline_color()).toBe(0);

    clip.outline_color(255);
    expect(clip.outline_color()).toBe(255);
  });

  test("should get/set text content", () => {
    expect(clip.text_content()).toBe("");

    clip.set_text_content("Hello, Karaoke!");
    expect(clip.text_content()).toBe("Hello, Karaoke!");
  });

  test("should get/set antialias mode", () => {
    expect(clip.antialias_mode()).toBe(1);

    clip.antialias_mode(0);
    expect(clip.antialias_mode()).toBe(0);
  });

  test("should clone text clip with full state", () => {
    clip.karaoke_mode(KaraokeModes.MODE_5TLINE);
    clip.font_size(18);
    clip.font_index(2);
    clip.foreground_color(32);
    clip.background_color(192);
    clip.set_text_content("Test Text");
    clip.audio_frames(44100);

    const cloned = clip.clone();
    expect(cloned.karaoke_mode()).toBe(KaraokeModes.MODE_5TLINE);
    expect(cloned.font_size()).toBe(18);
    expect(cloned.font_index()).toBe(2);
    expect(cloned.foreground_color()).toBe(32);
    expect(cloned.background_color()).toBe(192);
    expect(cloned.text_content()).toBe("Test Text");
    expect(cloned.audio_frames()).toBe(44100);
  });

  test("should serialize text clip to JSON", () => {
    clip.set_text_content("Karaoke Text");
    clip.font_size(20);
    const json_str = clip.to_json();

    expect(json_str).toContain("TextClip");
    expect(json_str).toContain("Karaoke Text");
    expect(json_str).toContain("20");
  });

  test("should deserialize text clip from JSON", () => {
    clip.set_text_content("Lyrics");
    clip.karaoke_mode(KaraokeModes.LYRICS);
    clip.font_size(16);
    const json_str = clip.to_json();

    const clip2 = new CDGMagic_TextClip();
    expect(clip2.from_json(json_str)).toBe(true);
    expect(clip2.text_content()).toBe("Lyrics");
    expect(clip2.karaoke_mode()).toBe(KaraokeModes.LYRICS);
    expect(clip2.font_size()).toBe(16);
  });

  test("should fail deserializing wrong type", () => {
    const clip2 = new CDGMagic_TextClip();
    expect(clip2.from_json('{"type": "ScrollClip"}')).toBe(false);
  });
});

// vim: ts=2 sw=2 et
// END
