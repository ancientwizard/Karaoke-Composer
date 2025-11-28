/**
 * phase-11.test.ts
 * Tests for Phase 11: Missing data and utility classes
 */

import { CDGMagic_BMPLoader, BMPLoaderError } from "@/ts/cd+g-magic/CDGMagic_BMPLoader";
import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { CDGMagic_TextClip, KaraokeModes } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CDGMagic_ScrollClip, ScrollDirection } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";
import { createMediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";

describe("Phase 11: Missing data and utility classes", () => {
  // Suppress expected console errors
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("CDGMagic_BMPLoader", () => {
    test("should create BMPLoader and get error messages", () => {
      expect(BMPLoaderError.NO_PATH).toBe("NO_PATH");
      expect(BMPLoaderError.OPEN_FAIL).toBe("OPEN_FAIL");
    });

    test("should convert error codes to text", () => {
      const text = CDGMagic_BMPLoader.error_to_text(BMPLoaderError.NO_PATH);
      expect(text).toContain("path");
      expect(text.length).toBeGreaterThan(0);
    });

    test("should fail with missing file", () => {
      expect(() => {
        new CDGMagic_BMPLoader("/nonexistent/file.bmp");
      }).toThrow();
    });

    test("should handle unknown error codes", () => {
      const text = CDGMagic_BMPLoader.error_to_text("UNKNOWN_ERROR");
      expect(text).toContain("Unknown");
    });
  });

  describe("CDGMagic_PALGlobalClip", () => {
    let clip: CDGMagic_PALGlobalClip;

    beforeEach(() => {
      clip = new CDGMagic_PALGlobalClip(0, 1000);
    });

    test("should create PAL global clip", () => {
      expect(clip).toBeDefined();
      expect(clip.start_pack()).toBe(0);
      expect(clip.duration()).toBe(1000);
    });

    test("should add events to PAL clip", () => {
      const event = createMediaEvent(100, 200);
      clip.add_event(event);
      expect(clip.event_count()).toBe(1);
    });

    test("should clone PAL global clip", () => {
      clip.audio_frames(44100);
      const event = createMediaEvent(50, 100);
      clip.add_event(event);

      const cloned = clip.clone();
      expect(cloned.start_pack()).toBe(0);
      expect(cloned.duration()).toBe(1000);
      expect(cloned.audio_frames()).toBe(44100);
      expect(cloned.event_count()).toBe(1);
    });

    test("should serialize PAL clip to JSON", () => {
      clip.audio_frames(22050);
      const json_str = clip.to_json();

      expect(json_str).toContain("PALGlobalClip");
      expect(json_str).toContain("22050");
    });

    test("should deserialize PAL clip from JSON", () => {
      clip.audio_frames(22050);
      const json_str = clip.to_json();

      const clip2 = new CDGMagic_PALGlobalClip();
      expect(clip2.from_json(json_str)).toBe(true);
      expect(clip2.audio_frames()).toBe(22050);
    });

    test("should fail deserializing wrong type", () => {
      const clip2 = new CDGMagic_PALGlobalClip();
      expect(clip2.from_json('{"type": "TextClip"}')).toBe(false);
    });
  });

  describe("CDGMagic_TextClip", () => {
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

  describe("CDGMagic_ScrollClip", () => {
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
});

// VIM: set ft=typescript :
// END
