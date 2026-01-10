/**
 * Tests for Clip Editor Windows
 *
 * This test suite covers specialized editor windows for each clip type:
 * - CDGMagic_BMPClip_Window: Bitmap clip editor
 * - CDGMagic_PALGlobalClip_Window: Palette-only clip editor
 * - CDGMagic_TextClip_Window: Text clip editor
 * - CDGMagic_ScrollClip_Window: Scrolling clip editor
 * - CDGMagic_TrackOptions_MaskWindow: Track mask/options editor
 * Dependencies: CDGMagic_BMPClip, CDGMagic_TrackOptions_Core
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import { CDGMagic_BMPClip, CDGMagic_PALGlobalClip
  , CDGMagic_TextClip, CDGMagic_ScrollClip  } from "@/ts/cd+g-magic/CDGMagic_BMPClip";
import { CDGMagic_BMPClip_Window            } from "@/ts/cd+g-magic/CDGMagic_BMPClip_Window";
import { CDGMagic_PALGlobalClip_Window      } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip_Window";
import { CDGMagic_TextClip_Window           } from "@/ts/cd+g-magic/CDGMagic_TextClip_Window";
import { CDGMagic_ScrollClip_Window         } from "@/ts/cd+g-magic/CDGMagic_ScrollClip_Window";
import { CDGMagic_TrackOptions_MaskWindow   } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_MaskWindow";
import { CDGMagic_TrackOptions              } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";

describe("Clip Editor Windows", () => {
  describe("CDGMagic_BMPClip_Window", () => {
    let bmp_clip: CDGMagic_BMPClip;
    let window: CDGMagic_BMPClip_Window;

    beforeEach(() => {
      bmp_clip = new CDGMagic_BMPClip();
      window = new CDGMagic_BMPClip_Window(bmp_clip);
    });

    test("should construct", () => {
      expect(window).toBeDefined();
    });

    test("should manage window state", () => {
      expect(window.is_open()).toBe(false);
      window.is_open(true);
      expect(window.is_open()).toBe(true);
    });

    test("should manage dimensions", () => {
      window.width(200);
      window.height(150);
      expect(window.width()).toBe(200);
      expect(window.height()).toBe(150);
    });

    test("should clamp width bounds", () => {
      window.width(305); // Out of bounds
      expect(window.width()).toBe(304);
    });

    test("should clamp height bounds", () => {
      window.height(217); // Out of bounds
      expect(window.height()).toBe(216);
    });

    test("should manage XOR mode", () => {
      window.use_xor(true);
      expect(window.use_xor()).toBe(true);
      window.use_xor(false);
      expect(window.use_xor()).toBe(false);
    });

    test("should manage transparent color", () => {
      window.transparent_color(128);
      expect(window.transparent_color()).toBe(128);
    });

    test("should validate properties", () => {
      expect(typeof window.validate()).toBe("boolean");
    });

    test("should apply changes", () => {
      expect(window.apply_changes()).toBe(true);
    });

    test("should revert changes", () => {
      window.width(250);
      window.revert_changes();
      expect(window.width()).not.toBe(250);
    });

    test("should return clip reference", () => {
      const clip = window.clip();
      expect(clip).toBe(bmp_clip);
    });
  });

  describe("CDGMagic_PALGlobalClip_Window", () => {
    let pal_clip: CDGMagic_PALGlobalClip;
    let window: CDGMagic_PALGlobalClip_Window;

    beforeEach(() => {
      pal_clip = new CDGMagic_PALGlobalClip();
      window = new CDGMagic_PALGlobalClip_Window(pal_clip, true);
    });

    test("should construct", () => {
      expect(window).toBeDefined();
    });

    test("should manage selected color", () => {
      window.set_selected_color(100);
      expect(window.get_selected_color()).toBe(100);
    });

    test("should manage fade type", () => {
      window.set_fade_type("fade");
      expect(window.get_fade_type()).toBe("fade");
    });

    test("should manage fade duration", () => {
      window.set_fade_duration(300);
      expect(window.get_fade_duration()).toBe(300);
    });

    test("should manage update mask", () => {
      window.set_update_mask_entry(0, true);
      expect(window.get_update_mask()[0]).toBe(1);
    });

    test("should manage palette entries", () => {
      window.set_palette_entry(0, 255, 0, 0);
      const entries = window.get_palette_entries();
      expect(entries.length).toBeGreaterThan(0);
    });

    test("should manage preview alpha", () => {
      window.set_preview_alpha(0.5);
      expect(window.get_preview_alpha()).toBe(0.5);
    });

    test("should validate properties", () => {
      expect(typeof window.validate()).toBe("boolean");
    });

    test("should apply changes", () => {
      expect(window.apply_changes()).toBe(true);
    });

    test("should revert changes", () => {
      window.set_selected_color(200);
      window.revert_changes();
      expect(window.get_selected_color()).not.toBe(200);
    });
  });

  describe("CDGMagic_TextClip_Window", () => {
    let text_clip: CDGMagic_TextClip;
    let window: CDGMagic_TextClip_Window;

    beforeEach(() => {
      text_clip = new CDGMagic_TextClip();
      window = new CDGMagic_TextClip_Window(text_clip, true);
    });

    test("should construct", () => {
      expect(window).toBeDefined();
    });

    test("should manage text content", () => {
      window.set_text_content("Hello");
      expect(window.get_text_content()).toBe("Hello");
    });

    test("should manage font properties", () => {
      window.set_font_face("Arial");
      window.set_font_size(24);
      expect(window.get_font_face()).toBe("Arial");
      expect(window.get_font_size()).toBe(24);
    });

    test("should manage colors", () => {
      window.set_foreground_color(200);
      window.set_background_color(50);
      window.set_outline_color(100);
      expect(window.get_foreground_color()).toBe(200);
      expect(window.get_background_color()).toBe(50);
      expect(window.get_outline_color()).toBe(100);
    });

    test("should manage karaoke mode", () => {
      window.set_karaoke_mode(false);
      expect(window.is_karaoke_mode()).toBe(false);
    });

    test("should manage highlight mode", () => {
      window.set_highlight_mode("outline");
      expect(window.get_highlight_mode()).toBe("outline");
    });

    test("should manage syllables", () => {
      window.add_syllable(0, 100, "Hel");
      window.add_syllable(100, 100, "lo");
      let syllables = window.get_syllables();
      expect(syllables.length).toBe(2);

      window.update_syllable(0, 0, 150, "Updated");
      syllables = window.get_syllables();
      expect(syllables[0].text).toBe("Updated");

      window.remove_syllable(0);
      syllables = window.get_syllables();
      expect(syllables.length).toBe(1);
    });

    test("should manage positioning", () => {
      window.set_x_position(100);
      window.set_y_position(50);
      expect(window.get_x_position()).toBe(100);
      expect(window.get_y_position()).toBe(50);
    });

    test("should validate properties", () => {
      expect(typeof window.validate()).toBe("boolean");
    });

    test("should apply changes", () => {
      window.set_text_content("Test");
      window.add_syllable(0, 100, "Test");
      expect(window.apply_changes()).toBe(true);
    });

    test("should revert changes", () => {
      window.set_text_content("Test");
      window.set_font_size(28);
      window.revert_changes();
      expect(window.get_font_size()).not.toBe(28);
    });
  });

  describe("CDGMagic_ScrollClip_Window", () => {
    let scroll_clip: CDGMagic_ScrollClip;
    let window: CDGMagic_ScrollClip_Window;

    beforeEach(() => {
      scroll_clip = new CDGMagic_ScrollClip();
      window = new CDGMagic_ScrollClip_Window(scroll_clip, true);
    });

    test("should construct", () => {
      expect(window).toBeDefined();
    });

    test("should manage scroll direction", () => {
      window.set_scroll_direction("vertical");
      expect(window.get_scroll_direction()).toBe("vertical");
    });

    test("should manage scroll speed", () => {
      window.set_scroll_speed(5);
      expect(window.get_scroll_speed()).toBe(5);
    });

    test("should clamp scroll speed bounds", () => {
      window.set_scroll_speed(100); // Too high
      expect(window.get_scroll_speed()).toBeLessThanOrEqual(50);
    });

    test("should manage scroll delay", () => {
      window.set_scroll_delay(10);
      expect(window.get_scroll_delay()).toBe(10);
    });

    test("should manage wrap mode", () => {
      window.set_wrap_mode("bounce");
      expect(window.get_wrap_mode()).toBe("bounce");
    });

    test("should manage background file", () => {
      window.set_background_file("bg.bmp");
      expect(window.get_background_file()).toBe("bg.bmp");
    });

    test("should manage background dimensions", () => {
      window.set_background_width(400);
      window.set_background_height(300);
      expect(window.get_background_width()).toBe(400);
      expect(window.get_background_height()).toBe(300);
    });

    test("should manage tile mode", () => {
      window.set_tile_mode("vertical");
      expect(window.get_tile_mode()).toBe("vertical");
    });

    test("should manage colors", () => {
      window.set_border_color(10);
      window.set_background_color(20);
      expect(window.get_border_color()).toBe(10);
      expect(window.get_background_color()).toBe(20);
    });

    test("should manage preview speed", () => {
      window.set_preview_speed(2.0);
      expect(window.get_preview_speed()).toBe(2.0);
    });

    test("should validate properties", () => {
      expect(typeof window.validate()).toBe("boolean");
    });

    test("should apply changes", () => {
      expect(window.apply_changes()).toBe(true);
    });

    test("should revert changes", () => {
      window.set_scroll_speed(10);
      window.revert_changes();
      expect(window.get_scroll_speed()).not.toBe(10);
    });
  });

  describe("CDGMagic_TrackOptions_MaskWindow", () => {
    let track_options: CDGMagic_TrackOptions;
    let window: CDGMagic_TrackOptions_MaskWindow;

    beforeEach(() => {
      track_options = new CDGMagic_TrackOptions();
      window = new CDGMagic_TrackOptions_MaskWindow(track_options, true);
    });

    test("should construct", () => {
      expect(window).toBeDefined();
    });

    test("should manage channel mask", () => {
      window.set_channel_mask(0, 255);
      expect(window.get_channel_mask()[0]).toBe(255);
    });

    test("should manage channel enabled status", () => {
      window.set_channel_enabled(2, false);
      expect(window.is_channel_enabled(2)).toBe(false);
    });

    test("should manage active channel", () => {
      window.set_active_channel(4);
      expect(window.get_active_channel()).toBe(4);
    });

    test("should manage mask position", () => {
      window.set_mask_x(100);
      window.set_mask_y(50);
      expect(window.get_mask_x()).toBe(100);
      expect(window.get_mask_y()).toBe(50);
    });

    test("should manage mask dimensions", () => {
      window.set_mask_width(150);
      window.set_mask_height(100);
      expect(window.get_mask_width()).toBe(150);
      expect(window.get_mask_height()).toBe(100);
    });

    test("should manage mask alpha", () => {
      window.set_mask_alpha(0.5);
      expect(window.get_mask_alpha()).toBe(0.5);
    });

    test("should manage blend mode", () => {
      window.set_blend_mode("multiply");
      expect(window.get_blend_mode()).toBe("multiply");
    });

    test("should manage mix mode", () => {
      window.set_mix_mode("mono");
      expect(window.get_mix_mode()).toBe("mono");
    });

    test("should manage mix volume", () => {
      window.set_mix_volume(1.5);
      expect(window.get_mix_volume()).toBe(1.5);
    });

    test("should validate properties", () => {
      expect(typeof window.validate()).toBe("boolean");
    });

    test("should apply changes", () => {
      expect(window.apply_changes()).toBe(true);
    });

    test("should revert changes", () => {
      window.set_active_channel(5);
      window.revert_changes();
      expect(window.get_active_channel()).not.toBe(5);
    });
  });

  describe("Integration Tests", () => {
    test("should create all 5 editor windows", () => {
      const bmp_window = new CDGMagic_BMPClip_Window(new CDGMagic_BMPClip());
      const pal_window = new CDGMagic_PALGlobalClip_Window(new CDGMagic_PALGlobalClip(), true);
      const text_window = new CDGMagic_TextClip_Window(new CDGMagic_TextClip(), true);
      const scroll_window = new CDGMagic_ScrollClip_Window(new CDGMagic_ScrollClip(), true);
      const mask_window = new CDGMagic_TrackOptions_MaskWindow(new CDGMagic_TrackOptions(), true);

      expect(bmp_window).toBeDefined();
      expect(pal_window).toBeDefined();
      expect(text_window).toBeDefined();
      expect(scroll_window).toBeDefined();
      expect(mask_window).toBeDefined();
    });

    test("all windows support apply/revert pattern", () => {
      const windows = [
        new CDGMagic_BMPClip_Window(new CDGMagic_BMPClip()),
        new CDGMagic_PALGlobalClip_Window(new CDGMagic_PALGlobalClip(), true),
        new CDGMagic_TextClip_Window(new CDGMagic_TextClip(), true),
        new CDGMagic_ScrollClip_Window(new CDGMagic_ScrollClip(), true),
        new CDGMagic_TrackOptions_MaskWindow(new CDGMagic_TrackOptions(), true),
      ];

      windows.forEach((w) => {
        expect(typeof w.apply_changes()).toBe("boolean");
        w.revert_changes();
      });
    });

    test("all windows support validation", () => {
      const windows = [
        new CDGMagic_BMPClip_Window(new CDGMagic_BMPClip()),
        new CDGMagic_PALGlobalClip_Window(new CDGMagic_PALGlobalClip(), true),
        new CDGMagic_TextClip_Window(new CDGMagic_TextClip(), true),
        new CDGMagic_ScrollClip_Window(new CDGMagic_ScrollClip(), true),
        new CDGMagic_TrackOptions_MaskWindow(new CDGMagic_TrackOptions(), true),
      ];

      windows.forEach((w) => {
        expect(typeof w.validate()).toBe("boolean");
      });
    });
  });
});

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END