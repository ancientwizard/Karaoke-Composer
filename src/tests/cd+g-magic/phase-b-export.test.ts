/**
 * phase-b-export.test.ts
 * Phase B: CDG export pipeline tests
 *
 * Tests export functionality:
 * - Packet generation and scheduling
 * - Color palette management
 * - Binary CDG file output
 * - Clip-to-packet mapping
 */

import { CDGMagic_CDGExporter } from "@/ts/cd+g-magic/CDGMagic_CDGExporter";
import { CDGMagic_MediaClip } from "@/ts/cd+g-magic/CDGMagic_MediaClip";
import { CDGMagic_TextClip, KaraokeModes } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CDGMagic_ScrollClip, ScrollDirection } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";
import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { createMediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";

describe("Phase B: CDG Export Pipeline", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ============ Exporter Initialization Tests ============
  describe("Exporter Initialization", () => {
    test("should create exporter with default configuration", () => {
      const exporter = new CDGMagic_CDGExporter();
      expect(exporter).toBeDefined();
      expect(exporter.clip_count()).toBe(0);
    });

    test("should create exporter with target duration", () => {
      const exporter = new CDGMagic_CDGExporter(18000); // 60 seconds
      expect(exporter).toBeDefined();
    });

    test("should register single clip", () => {
      const exporter = new CDGMagic_CDGExporter();
      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100);

      expect(exporter.register_clip(clip)).toBe(true);
      expect(exporter.clip_count()).toBe(1);
    });

    test("should register multiple clips", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip1 = new CDGMagic_MediaClip(0, 1000);
      const clip2 = new CDGMagic_MediaClip(1000, 1000);
      const clip3 = new CDGMagic_MediaClip(2000, 1000);

      clip1.audio_frames(44100);
      clip2.audio_frames(44100);
      clip3.audio_frames(44100);

      expect(exporter.register_clip(clip1)).toBe(true);
      expect(exporter.register_clip(clip2)).toBe(true);
      expect(exporter.register_clip(clip3)).toBe(true);

      expect(exporter.clip_count()).toBe(3);
    });

    test("should reject invalid clips", () => {
      const exporter = new CDGMagic_CDGExporter();

      const invalid_clip = new CDGMagic_MediaClip(0, 0);
      expect(exporter.register_clip(invalid_clip)).toBe(false);
      expect(exporter.clip_count()).toBe(0);
    });
  });

  // ============ Packet Scheduling Tests ============
  describe("Packet Scheduling", () => {
    test("should schedule packets from registered clips", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(0, 3000);
      clip.set_text_content("Test");
      clip.audio_frames(132300);

      expect(exporter.register_clip(clip)).toBe(true);

      const total_packets = exporter.schedule_packets();
      expect(total_packets).toBeGreaterThan(0);
    });

    test("should schedule text clip packets", () => {
      const exporter = new CDGMagic_CDGExporter();

      const text_clip = new CDGMagic_TextClip(100, 1500);
      text_clip.set_text_content("Karaoke text");
      text_clip.karaoke_mode(KaraokeModes.LYRICS);
      text_clip.audio_frames(66150);

      for (let i = 0; i < 5; i++) {
        text_clip.add_event(createMediaEvent(i * 300, 100));
      }

      expect(exporter.register_clip(text_clip)).toBe(true);
      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(text_clip.duration());
    });

    test("should schedule scroll clip packets", () => {
      const exporter = new CDGMagic_CDGExporter();

      const scroll_clip = new CDGMagic_ScrollClip(500, 2000);
      scroll_clip.scroll_direction(ScrollDirection.UP);
      scroll_clip.scroll_speed(2);
      scroll_clip.audio_frames(88200);

      expect(exporter.register_clip(scroll_clip)).toBe(true);
      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);
    });

    test("should schedule palette clip packets", () => {
      const exporter = new CDGMagic_CDGExporter();

      const pal_clip = new CDGMagic_PALGlobalClip(0, 300);
      expect(exporter.register_clip(pal_clip)).toBe(true);

      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);
    });

    test("should pad to target duration", () => {
      const exporter = new CDGMagic_CDGExporter(6000); // Target 6000 packets

      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100);

      expect(exporter.register_clip(clip)).toBe(true);

      const packets = exporter.schedule_packets();
      expect(packets).toBe(6000);
    });
  });

  // ============ Binary Export Tests ============
  describe("Binary Export", () => {
    test("should export to binary CDG format", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_MediaClip(0, 300);
      clip.audio_frames(13230);

      expect(exporter.register_clip(clip)).toBe(true);
      exporter.schedule_packets();

      const binary = exporter.export_to_binary();
      expect(binary).toBeDefined();
      expect(binary instanceof Uint8Array).toBe(true);
      expect(binary.length % 24).toBe(0); // Must be multiple of packet size
    });

    test("should generate valid packet structure", () => {
      const exporter = new CDGMagic_CDGExporter(300);

      const clip = new CDGMagic_MediaClip(0, 300);
      clip.audio_frames(13230);

      expect(exporter.register_clip(clip)).toBe(true);
      exporter.schedule_packets();

      const binary = exporter.export_to_binary();

      // Verify packet structure
      expect(binary.length).toBe(300 * 24);

      // First packet should be prelude (LOAD_LOW = 0x0E)
      expect(binary[0]).toBe(0x0E);
    });

    test("should export multiple clips to binary", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip1 = new CDGMagic_TextClip(0, 1000);
      clip1.set_text_content("Clip 1");
      clip1.audio_frames(44100);

      const clip2 = new CDGMagic_TextClip(1000, 1000);
      clip2.set_text_content("Clip 2");
      clip2.audio_frames(44100);

      expect(exporter.register_clip(clip1)).toBe(true);
      expect(exporter.register_clip(clip2)).toBe(true);

      exporter.schedule_packets();
      const binary = exporter.export_to_binary();

      expect(binary).toBeDefined();
      expect(binary.length).toBeGreaterThan(0);
      expect(binary.length % 24).toBe(0);
    });

    test("should handle empty timeline export", () => {
      const exporter = new CDGMagic_CDGExporter(300);

      // Register single empty clip
      const clip = new CDGMagic_MediaClip(0, 300);
      expect(exporter.register_clip(clip)).toBe(true);

      exporter.schedule_packets();
      const binary = exporter.export_to_binary();

      expect(binary).toBeDefined();
      expect(binary.length).toBeGreaterThan(0);
    });
  });

  // ============ Composition Export Tests ============
  describe("Complex Export Scenarios", () => {
    test("should export full CD+G composition", () => {
      const exporter = new CDGMagic_CDGExporter();

      // Title clip
      const title = new CDGMagic_TextClip(0, 1500);
      title.set_text_content("Song Title");
      title.karaoke_mode(KaraokeModes.TITLES);
      title.font_size(24);
      title.audio_frames(66150);

      // Lyrics clip
      const lyrics = new CDGMagic_TextClip(1500, 6000);
      lyrics.set_text_content("Verse 1");
      lyrics.karaoke_mode(KaraokeModes.LYRICS);
      lyrics.font_size(16);
      lyrics.audio_frames(264600);

      for (let i = 0; i < 10; i++) {
        lyrics.add_event(createMediaEvent(i * 600, 300));
      }

      // Scroll effect
      const scroll = new CDGMagic_ScrollClip(7500, 1500);
      scroll.scroll_direction(ScrollDirection.UP);
      scroll.scroll_speed(2);

      expect(exporter.register_clip(title)).toBe(true);
      expect(exporter.register_clip(lyrics)).toBe(true);
      expect(exporter.register_clip(scroll)).toBe(true);

      expect(exporter.clip_count()).toBe(3);

      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThanOrEqual(9000);

      const binary = exporter.export_to_binary();
      expect(binary.length % 24).toBe(0);
    });

    test("should validate exporter state", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(0, 3000);
      clip.set_text_content("Test");
      clip.audio_frames(132300);

      expect(exporter.register_clip(clip)).toBe(true);
      exporter.schedule_packets();

      expect(exporter.validate()).toBe(true);
    });

    test("should reject validation on empty exporter", () => {
      const exporter = new CDGMagic_CDGExporter();
      expect(exporter.validate()).toBe(false);
    });
  });

  // ============ Palette Management Tests ============
  describe("Palette Management", () => {
    test("should initialize standard CD+G palette", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_MediaClip(0, 300);
      expect(exporter.register_clip(clip)).toBe(true);

      exporter.schedule_packets();
      expect(exporter.validate()).toBe(true);
    });

    test("should generate palette packets in prelude", () => {
      const exporter = new CDGMagic_CDGExporter(300);

      const clip = new CDGMagic_MediaClip(0, 300);
      expect(exporter.register_clip(clip)).toBe(true);

      exporter.schedule_packets();
      const binary = exporter.export_to_binary();

      // Packets 0-3 should be prelude (LOAD_LOW, LOAD_HIGH, MEMORY_PRESET, BORDER_PRESET)
      const packet1_cmd = binary[0];     // LOAD_LOW = 0x0E
      const packet2_cmd = binary[24];    // LOAD_HIGH = 0x1E
      const packet3_cmd = binary[48];    // MEMORY_PRESET = 0x01
      const packet4_cmd = binary[72];    // BORDER_PRESET = 0x02

      expect(packet1_cmd).toBe(0x0E);
      expect(packet2_cmd).toBe(0x1E);
      expect(packet3_cmd).toBe(0x01);
      expect(packet4_cmd).toBe(0x02);
    });
  });

  // ============ Edge Cases Tests ============
  describe("Edge Cases", () => {
    test("should handle zero-duration clip gracefully", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_MediaClip(0, 0);
      expect(exporter.register_clip(clip)).toBe(false);
      expect(exporter.clip_count()).toBe(0);
    });

    test("should handle very large duration targets", () => {
      const exporter = new CDGMagic_CDGExporter(1800000); // 100 minutes

      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100);

      expect(exporter.register_clip(clip)).toBe(true);

      // Should not crash or hang
      const packets = exporter.schedule_packets();
      expect(packets).toBe(1800000);
    });

    test("should handle overlapping clip times", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip1 = new CDGMagic_MediaClip(0, 2000);
      const clip2 = new CDGMagic_MediaClip(1000, 2000); // Overlaps with clip1

      clip1.audio_frames(88200);
      clip2.audio_frames(88200);

      expect(exporter.register_clip(clip1)).toBe(true);
      expect(exporter.register_clip(clip2)).toBe(true);

      exporter.schedule_packets();
      expect(exporter.validate()).toBe(true);
    });

    test("should handle clips with gaps in timeline", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip1 = new CDGMagic_MediaClip(0, 1000);
      const clip2 = new CDGMagic_MediaClip(5000, 1000); // Large gap

      clip1.audio_frames(44100);
      clip2.audio_frames(44100);

      expect(exporter.register_clip(clip1)).toBe(true);
      expect(exporter.register_clip(clip2)).toBe(true);

      const packets = exporter.schedule_packets();
      expect(packets).toBe(6000); // Should include gap
    });
  });
});

// VIM: set ft=typescript :
// END
