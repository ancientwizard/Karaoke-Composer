/**
 * integration.test.ts
 * Phase A: Integration tests for cross-component workflows
 *
 * Tests interactions between major subsystems:
 * - Data persistence (serialization round-trips)
 * - Clip creation and editing workflows
 * - MediaClip synchronization with audio
 * - Application state management
 */

import { CDGMagic_Application } from "@/ts/cd+g-magic/CDGMagic_Application";
import { CDGMagic_MediaClip } from "@/ts/cd+g-magic/CDGMagic_MediaClip";
import { CDGMagic_BMPClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";
import { CDGMagic_TextClip, KaraokeModes } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CDGMagic_ScrollClip, ScrollDirection } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";
import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { createMediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";

describe("Integration Testing - Phase A", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ============ Data Persistence Tests ============
  describe("Data Persistence & Serialization", () => {
    test("should serialize and deserialize MediaClip with events", () => {
      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100);

      // Add multiple events
      for (let i = 0; i < 5; i++) {
        clip.add_event(createMediaEvent(i * 200, 100));
      }

      // Serialize to JSON
      const json_str = clip.to_json();

      // Deserialize to new clip
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json(json_str)).toBe(true);

      // Verify all state preserved
      expect(clip2.start_pack()).toBe(0);
      expect(clip2.duration()).toBe(1000);
      expect(clip2.audio_frames()).toBe(44100);
      expect(clip2.event_count()).toBe(5);
    });

    test("should serialize and deserialize TextClip with styling", () => {
      const clip = new CDGMagic_TextClip(100, 2000);
      clip.set_text_content("Karaoke lyrics here");
      clip.karaoke_mode(KaraokeModes.MODE_5TLINE);
      clip.font_size(18);
      clip.foreground_color(200);
      clip.audio_frames(88200);

      const json_str = clip.to_json();
      const clip2 = new CDGMagic_TextClip();
      expect(clip2.from_json(json_str)).toBe(true);

      expect(clip2.start_pack()).toBe(100);
      expect(clip2.duration()).toBe(2000);
      expect(clip2.text_content()).toBe("Karaoke lyrics here");
      expect(clip2.karaoke_mode()).toBe(KaraokeModes.MODE_5TLINE);
      expect(clip2.font_size()).toBe(18);
      expect(clip2.foreground_color()).toBe(200);
      expect(clip2.audio_frames()).toBe(88200);
    });

    test("should serialize and deserialize ScrollClip with offsets", () => {
      const clip = new CDGMagic_ScrollClip(50, 1500);
      clip.scroll_direction(ScrollDirection.DOWN);
      clip.scroll_speed(2);
      clip.x_offset(-20);
      clip.y_offset(10);
      clip.wrap_mode(true);

      const json_str = clip.to_json();
      const clip2 = new CDGMagic_ScrollClip();
      expect(clip2.from_json(json_str)).toBe(true);

      expect(clip2.scroll_direction()).toBe(ScrollDirection.DOWN);
      expect(clip2.scroll_speed()).toBe(2);
      expect(clip2.x_offset()).toBe(-20);
      expect(clip2.y_offset()).toBe(10);
      expect(clip2.wrap_mode()).toBe(true);
    });

    test("should support binary serialization round-trip", () => {
      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100);

      for (let i = 0; i < 3; i++) {
        clip.add_event(createMediaEvent(i * 300, 100));
      }

      // Serialize to binary
      const binary = clip.to_binary();
      expect(binary).toBeDefined();
      expect(binary.length).toBeGreaterThan(0);

      // Deserialize from binary
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_binary(binary)).toBe(true);

      expect(clip2.start_pack()).toBe(0);
      expect(clip2.duration()).toBe(1000);
      expect(clip2.audio_frames()).toBe(44100);
      expect(clip2.event_count()).toBe(3);
    });
  });

  // ============ Clip Creation & Editing Workflows ============
  describe("Clip Creation & Editing Workflows", () => {
    test("should create and edit text clip with full workflow", () => {
      const clip = new CDGMagic_TextClip(0, 3000);

      // Set up clip parameters
      clip.set_text_content("Welcome to the show!");
      clip.karaoke_mode(KaraokeModes.LYRICS);
      clip.font_size(16);
      clip.foreground_color(15); // White
      clip.background_color(0);  // Black

      // Add timed events
      for (let i = 0; i < 10; i++) {
        clip.add_event(createMediaEvent(i * 300, 100));
      }

      // Set audio synchronization
      clip.audio_frames(132300); // 3 seconds at 44.1 kHz

      // Verify complete state
      expect(clip.text_content()).toBe("Welcome to the show!");
      expect(clip.karaoke_mode()).toBe(KaraokeModes.LYRICS);
      expect(clip.event_count()).toBe(10);
      expect(clip.audio_frames()).toBe(132300);

      // Clone for parallel processing
      const cloned = clip.clone();
      expect(cloned.event_count()).toBe(clip.event_count());
      expect(cloned.text_content()).toBe(clip.text_content());
    });

    test("should create multiple clip instances", () => {
      // Create various clip types
      const text_clip = new CDGMagic_TextClip(0, 1000);
      const scroll_clip = new CDGMagic_ScrollClip(1000, 1000);
      const pal_clip = new CDGMagic_PALGlobalClip(2000, 1000);
      const bmp_clip = new CDGMagic_BMPClip(3000, 1000);

      // Verify all created successfully
      expect(text_clip).toBeDefined();
      expect(scroll_clip).toBeDefined();
      expect(pal_clip).toBeDefined();
      expect(bmp_clip).toBeDefined();

      // Verify properties
      expect(text_clip.start_pack()).toBe(0);
      expect(scroll_clip.start_pack()).toBe(1000);
      expect(pal_clip.start_pack()).toBe(2000);
      expect(bmp_clip.start_pack()).toBe(3000);
    });

    test("should track clip modifications", () => {
      const clip = new CDGMagic_MediaClip(0, 1000);

      // Initial state
      expect(clip.duration()).toBe(1000);
      expect(clip.event_count()).toBe(0);

      // Modify duration
      clip.duration(2000);
      expect(clip.duration()).toBe(2000);

      // Add events
      clip.add_event(createMediaEvent(0, 100));
      clip.add_event(createMediaEvent(100, 100));
      expect(clip.event_count()).toBe(2);

      // Verify after modifications
      expect(clip.validate()).toBe(true);
    });
  });

  // ============ Audio Synchronization Tests ============
  describe("Audio Synchronization & Playback", () => {
    test("should synchronize clip to audio frame positions", () => {
      const clip = new CDGMagic_MediaClip(0, 10000);
      clip.audio_frames(441000); // 10 seconds

      // Add events at specific frame positions
      const event1 = createMediaEvent(0, 500);   // Packet 0
      const event2 = createMediaEvent(300, 500); // Packet 300
      const event3 = createMediaEvent(600, 500); // Packet 600

      clip.add_event(event1);
      clip.add_event(event2);
      clip.add_event(event3);

      // Sync to audio frames
      const audio_frame_0 = clip.packet_to_audio_frame(0);
      const audio_frame_300 = clip.packet_to_audio_frame(300);
      const audio_frame_600 = clip.packet_to_audio_frame(600);

      expect(audio_frame_0).toBe(0);
      expect(audio_frame_300).toBe(300 * 147);
      expect(audio_frame_600).toBe(600 * 147);

      // Convert back to packets
      expect(clip.audio_frame_to_packet(audio_frame_0)).toBe(0);
      expect(clip.audio_frame_to_packet(audio_frame_300)).toBe(300);
      expect(clip.audio_frame_to_packet(audio_frame_600)).toBe(600);
    });

    test("should maintain sync state during playback simulation", () => {
      const clip = new CDGMagic_MediaClip(0, 1000);
      clip.audio_frames(44100); // 1 second

      // Simulate playback progression
      const packets = [0, 50, 100, 150, 200, 300];

      for (const packet of packets) {
        expect(clip.sync_to_packet(packet)).toBe(true);
        expect(clip.last_sync_packet()).toBe(packet);
      }

      // Sync to end
      expect(clip.sync_to_packet(999)).toBe(true);
      expect(clip.last_sync_packet()).toBe(999);
    });

    test("should invalidate graphics cache on audio frame changes", () => {
      const clip = new CDGMagic_MediaClip(0, 1000);

      // Set graphics buffer
      clip.set_graphics_buffer(new Uint8Array(1000));
      expect(clip.is_graphics_cached()).toBe(true);

      // Changing audio frames should invalidate cache
      clip.audio_frames(88200);
      expect(clip.is_graphics_cached()).toBe(false);

      // Re-set graphics buffer
      clip.set_graphics_buffer(new Uint8Array(1000));
      expect(clip.is_graphics_cached()).toBe(true);

      // Duration change should also invalidate
      clip.duration(2000);
      expect(clip.is_graphics_cached()).toBe(false);
    });

    test("should track audio playback through editing operations", () => {
      const clip = new CDGMagic_TextClip(0, 3000);
      const original_frames = 132300;
      clip.audio_frames(original_frames);

      // Edit text
      clip.set_text_content("Modified text");
      // Audio frames should be preserved
      expect(clip.audio_frames()).toBe(original_frames);

      // Change font
      clip.font_size(20);
      // Audio frames should still be preserved
      expect(clip.audio_frames()).toBe(original_frames);

      // Clone preserves audio sync
      const cloned = clip.clone();
      expect(cloned.audio_frames()).toBe(original_frames);
    });
  });

  // ============ Application State Management Tests ============
  describe("Application State Management", () => {
    test("should create and manage application state", () => {
      const app = new CDGMagic_Application();

      expect(app).toBeDefined();
      expect(app.get_version()).toBe("1.0.0");
    });

    test("should initialize and access application components", () => {
      const app = new CDGMagic_Application();

      // Initialize application
      expect(app.initialize()).toBe(true);

      // Access components
      expect(app.get_main_window()).toBeDefined();
      expect(app.get_preview_window()).toBeDefined();
      expect(app.get_audio_playback()).toBeDefined();
    });

    test("should support undo/redo management", () => {
      const app = new CDGMagic_Application();
      app.initialize();

      // Query undo limits
      const max_levels = app.get_max_undo_levels();
      expect(max_levels > 0).toBe(true);

      // Modify undo level
      app.set_max_undo_levels(50);
      expect(app.get_max_undo_levels()).toBe(50);

      // Clamp to reasonable range
      app.set_max_undo_levels(10000);
      expect(app.get_max_undo_levels() <= 1000).toBe(true); // Clamped

      // Reset to default
      app.set_max_undo_levels(100);
      expect(app.get_max_undo_levels()).toBe(100);
    });

    test("should query undo/redo state", () => {
      const app = new CDGMagic_Application();
      app.initialize();

      // Initially no undo/redo
      expect(app.can_undo()).toBe(false);
      expect(app.can_redo()).toBe(false);
    });
  });

  // ============ Complex Integration Scenarios ============
  describe("Complex Integration Scenarios", () => {
    test("should create full CD+G composition with multiple clips", () => {
      // 1. Create title clip
      const title_clip = new CDGMagic_TextClip(0, 1500);
      title_clip.set_text_content("Song Title");
      title_clip.karaoke_mode(KaraokeModes.TITLES);
      title_clip.font_size(24);
      title_clip.foreground_color(15);
      title_clip.audio_frames(66150); // 1.5 seconds

      // 2. Create lyrics clip
      const lyrics_clip = new CDGMagic_TextClip(1500, 6000);
      lyrics_clip.set_text_content("Verse 1 lyrics...");
      lyrics_clip.karaoke_mode(KaraokeModes.MODE_5TLINE);
      lyrics_clip.font_size(16);
      lyrics_clip.audio_frames(264600); // 6 seconds
      for (let i = 0; i < 10; i++) {
        lyrics_clip.add_event(createMediaEvent(i * 600, 300));
      }

      // 3. Create scroll effect
      const scroll_clip = new CDGMagic_ScrollClip(7500, 1500);
      scroll_clip.scroll_direction(ScrollDirection.UP);
      scroll_clip.scroll_speed(2);

      // 4. Verify all clips are valid
      expect(title_clip.validate()).toBe(true);
      expect(lyrics_clip.validate()).toBe(true);
      expect(scroll_clip.validate()).toBe(true);

      // 5. Calculate total duration
      const total_frames = title_clip.audio_frames() + lyrics_clip.audio_frames();
      expect(total_frames).toBe(330750);
    });

    test("should handle palette and BMP composition", () => {
      // Create palette clip to set colors
      const pal_clip = new CDGMagic_PALGlobalClip(0, 1000);
      expect(pal_clip.validate()).toBe(true);

      // Create BMP clip
      const bmp_clip = new CDGMagic_BMPClip(1000, 1000);

      // Verify both clips are valid
      expect(pal_clip.start_pack()).toBe(0);
      expect(bmp_clip.start_pack()).toBe(1000);
    });

    test("should validate complete editing workflow", () => {
      // 1. Create clip with all features
      const clip = new CDGMagic_TextClip(0, 3000);
      clip.set_text_content("Complete test");
      clip.karaoke_mode(KaraokeModes.MODE_8MLINE);
      clip.font_size(16);
      clip.audio_frames(132300);

      // 2. Add events
      for (let i = 0; i < 10; i++) {
        clip.add_event(createMediaEvent(i * 300, 100));
      }

      // 3. Validate state
      expect(clip.validate()).toBe(true);

      // 4. Serialize
      const json_str = clip.to_json();
      expect(json_str.length > 0).toBe(true);

      // 5. Deserialize
      const clip2 = new CDGMagic_TextClip();
      expect(clip2.from_json(json_str)).toBe(true);

      // 6. Verify all state preserved
      expect(clip2.text_content()).toBe("Complete test");
      expect(clip2.event_count()).toBe(10);
      expect(clip2.audio_frames()).toBe(132300);
      expect(clip2.validate()).toBe(true);

      // 7. Clone and verify
      const cloned = clip2.clone();
      expect(cloned.event_count()).toBe(10);
      expect(cloned.validate()).toBe(true);
    });

    test("should handle multiple clip serialization workflows", () => {
      // Create array of different clip types
      const clips: CDGMagic_MediaClip[] = [
        new CDGMagic_TextClip(0, 1000),
        new CDGMagic_ScrollClip(1000, 1000),
        new CDGMagic_PALGlobalClip(2000, 1000),
        new CDGMagic_MediaClip(3000, 1000),
      ];

      // Configure each clip
      const text_clip = clips[0] as CDGMagic_TextClip;
      text_clip.set_text_content("Text");
      text_clip.audio_frames(44100);

      const scroll_clip = clips[1] as CDGMagic_ScrollClip;
      scroll_clip.scroll_direction(ScrollDirection.RIGHT);
      scroll_clip.audio_frames(44100);

      clips[2].audio_frames(44100);
      clips[3].audio_frames(44100);

      // Serialize all clips
      for (const clip of clips) {
        const json = clip.to_json();
        expect(json.length > 0).toBe(true);
        expect(clip.validate()).toBe(true);
      }

      // Clone all clips
      for (const clip of clips) {
        const cloned = clip.clone();
        expect(cloned.validate()).toBe(true);
        expect(cloned.audio_frames()).toBe(clip.audio_frames());
      }
    });
  });
});

// VIM: set ft=typescript :
// END
