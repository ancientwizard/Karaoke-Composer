/**
 * phase-6.test.ts
 * Tests for MediaClip expansion with audio/graphics synchronization
 */

import { CDGMagic_MediaClip } from "@/ts/cd+g-magic/CDGMagic_MediaClip";
import { createMediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";

/**
 * MediaClip Expansion Tests
 */
describe("CDGMagic_MediaClip - Phase 6 Expansion", () => {
  let clip: CDGMagic_MediaClip;

  beforeEach(() => {
    clip = new CDGMagic_MediaClip(0, 1000);
  });

  // Audio/Graphics Synchronization
  describe("Audio synchronization", () => {
    test("should initialize with default frame rate", () => {
      expect(clip.frame_rate()).toBe(300); // CD+G standard
    });

    test("should get/set audio frame count", () => {
      clip.audio_frames(44100); // 1 second at 44.1 kHz
      expect(clip.audio_frames()).toBe(44100);
    });

    test("should clamp audio frames to non-negative", () => {
      clip.audio_frames(-1000);
      expect(clip.audio_frames()).toBe(0);
    });

    test("should invalidate graphics cache when audio frames change", () => {
      clip.set_graphics_buffer(new Uint8Array(100));
      expect(clip.is_graphics_cached()).toBe(true);

      clip.audio_frames(50000);
      expect(clip.is_graphics_cached()).toBe(false);
    });
  });

  // Packet to Audio Frame Conversion
  describe("Packet/audio conversion", () => {
    test("should convert packet to audio frame", () => {
      // At 44,100 Hz and 300 pps: 44100 / 300 = 147 samples per packet
      expect(clip.packet_to_audio_frame(0)).toBe(0);
      expect(clip.packet_to_audio_frame(300)).toBe(300 * 147);
    });

    test("should convert audio frame to packet", () => {
      const audio_frame = 147 * 100; // 100 packets worth (147 = 44100/300)
      expect(clip.audio_frame_to_packet(audio_frame)).toBe(100);
    });

    test("should round-trip packet conversions", () => {
      for (let i = 0; i < 10; i++) {
        const packet = i * 100;
        const audio_frame = clip.packet_to_audio_frame(packet);
        const back_to_packet = clip.audio_frame_to_packet(audio_frame);
        expect(back_to_packet).toBe(packet);
      }
    });
  });

  // Graphics Caching
  describe("Graphics caching", () => {
    test("should start with invalid cache", () => {
      expect(clip.is_graphics_cached()).toBe(false);
    });

    test("should cache and retrieve graphics buffer", () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      clip.set_graphics_buffer(buffer);

      expect(clip.is_graphics_cached()).toBe(true);
      expect(clip.graphics_buffer()).toEqual(buffer);
    });

    test("should not return original buffer (defensive copy)", () => {
      const buffer = new Uint8Array([1, 2, 3]);
      clip.set_graphics_buffer(buffer);

      const retrieved = clip.graphics_buffer();
      retrieved[0] = 99;

      // Original should not be modified
      expect(clip.graphics_buffer()[0]).toBe(1);
    });

    test("should invalidate cache on event changes", () => {
      clip.set_graphics_buffer(new Uint8Array(100));
      expect(clip.is_graphics_cached()).toBe(true);

      clip.clear_events();
      expect(clip.is_graphics_cached()).toBe(false);
    });

    test("should invalidate cache on duration change", () => {
      clip.set_graphics_buffer(new Uint8Array(100));
      clip.duration(2000);
      expect(clip.is_graphics_cached()).toBe(false);
    });
  });

  // Synchronization
  describe("Playback synchronization", () => {
    test("should get/set last sync packet", () => {
      clip.last_sync_packet(500);
      expect(clip.last_sync_packet()).toBe(500);
    });

    test("should clamp sync packet to non-negative", () => {
      clip.last_sync_packet(-100);
      expect(clip.last_sync_packet()).toBe(0);
    });

    test("should sync to packet before clip start", () => {
      clip.start_pack(1000);
      expect(clip.sync_to_packet(500)).toBe(true);
      expect(clip.last_sync_packet()).toBe(500);
    });

    test("should sync to packet after clip end", () => {
      clip.start_pack(0);
      clip.duration(1000);
      expect(clip.sync_to_packet(2000)).toBe(true);
      expect(clip.last_sync_packet()).toBe(999); // end_pack - 1
    });

    test("should sync to packet within clip", () => {
      clip.start_pack(0);
      clip.duration(1000);
      expect(clip.sync_to_packet(500)).toBe(true);
      expect(clip.last_sync_packet()).toBe(500);
    });

    test("should fail to sync with negative packet", () => {
      expect(clip.sync_to_packet(-1)).toBe(false);
    });
  });

  // Validation
  describe("Clip validation", () => {
    test("should validate valid clip", () => {
      expect(clip.validate()).toBe(true);
    });

    test("should invalidate negative start pack", () => {
      clip.start_pack(-1);
      expect(clip.validate()).toBe(false);
    });

    test("should invalidate zero duration", () => {
      clip.duration(0);
      expect(clip.validate()).toBe(false);
    });
  });

  // Packet Estimation
  describe("Packet estimation", () => {
    test("should estimate packet count for clip duration", () => {
      clip.duration(300); // 1 second
      const estimated = clip.estimate_packet_count();
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBeLessThanOrEqual(150); // At ~100 pps
    });

    test("should estimate higher for longer clips", () => {
      clip.duration(300);
      const estimate1 = clip.estimate_packet_count();

      clip.duration(3000); // 10 seconds
      const estimate10 = clip.estimate_packet_count();

      expect(estimate10).toBeGreaterThan(estimate1);
    });
  });

  // Reset
  describe("Reset", () => {
    test("should reset clip to defaults", () => {
      clip.start_pack(500);
      clip.duration(2000);
      clip.audio_frames(50000);
      clip.set_graphics_buffer(new Uint8Array(100));

      clip.reset();

      expect(clip.start_pack()).toBe(0);
      expect(clip.duration()).toBe(300);
      expect(clip.audio_frames()).toBe(0);
      expect(clip.is_graphics_cached()).toBe(false);
    });

    test("should clear all events on reset", () => {
      const event = createMediaEvent(50, 100);
      clip.add_event(event);
      expect(clip.event_count()).toBe(1);

      clip.reset();
      expect(clip.event_count()).toBe(0);
    });
  });

  // Clone with Audio/Graphics State
  describe("Clone with full state", () => {
    test("should clone audio frame count", () => {
      clip.audio_frames(44100);
      const cloned = clip.clone();
      expect(cloned.audio_frames()).toBe(44100);
    });

    test("should clone with events", () => {
      const event = createMediaEvent(50, 100);
      clip.add_event(event);

      const cloned = clip.clone();
      expect(cloned.event_count()).toBe(1);
      expect(cloned.event_at_index(0)).toBeDefined();
    });
  });

  // JSON Serialization
  describe("JSON serialization", () => {
    test("should serialize to JSON", () => {
      clip.start_pack(100);
      clip.duration(2000);
      clip.audio_frames(50000);

      const json_str = clip.to_json();
      expect(json_str).toContain("start_pack");
      expect(json_str).toContain("duration");
      expect(json_str).toContain("audio_frames");
    });

    test("should deserialize from JSON", () => {
      clip.start_pack(100);
      clip.duration(2000);
      clip.audio_frames(50000);

      const json_str = clip.to_json();
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json(json_str)).toBe(true);

      expect(clip2.start_pack()).toBe(100);
      expect(clip2.duration()).toBe(2000);
      expect(clip2.audio_frames()).toBe(50000);
    });

    test("should fail to deserialize invalid JSON", () => {
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json("not json")).toBe(false);
    });

    test("should fail to deserialize missing required fields", () => {
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json('{"start_pack": 100}')).toBe(false);
    });

    test("should preserve events in JSON", () => {
      const event = createMediaEvent(50, 100);
      clip.add_event(event);

      const json_str = clip.to_json();
      expect(json_str).toContain("events");

      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json(json_str)).toBe(true);
      expect(clip2.event_count()).toBe(1);
    });
  });

  // Binary Serialization
  describe("Binary serialization", () => {
    test("should serialize to binary", () => {
      clip.start_pack(100);
      clip.duration(2000);
      clip.audio_frames(50000);

      const binary = clip.to_binary();
      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThanOrEqual(16);
    });

    test("should deserialize from binary", () => {
      clip.start_pack(100);
      clip.duration(2000);
      clip.audio_frames(50000);

      const binary = clip.to_binary();
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_binary(binary)).toBe(true);

      expect(clip2.start_pack()).toBe(100);
      expect(clip2.duration()).toBe(2000);
      expect(clip2.audio_frames()).toBe(50000);
    });

    test("should fail with truncated binary", () => {
      const clip2 = new CDGMagic_MediaClip();
      const truncated = new Uint8Array(8); // Too small
      expect(clip2.from_binary(truncated)).toBe(false);
    });

    test("should round-trip with events", () => {
      const event = createMediaEvent(50, 100);
      clip.add_event(event);

      const binary = clip.to_binary();
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_binary(binary)).toBe(true);

      expect(clip2.event_count()).toBe(1);
    });

    test("should preserve multiple events", () => {
      for (let i = 0; i < 5; i++) {
        clip.add_event(createMediaEvent(i * 100, 50));
      }

      const binary = clip.to_binary();
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_binary(binary)).toBe(true);

      expect(clip2.event_count()).toBe(5);
    });
  });

  // Integration Tests
  describe("Integration with editing", () => {
    test("should maintain sync state through modifications", () => {
      clip.sync_to_packet(500);
      expect(clip.last_sync_packet()).toBe(500);

      clip.add_event(createMediaEvent(100, 50));
      expect(clip.last_sync_packet()).toBe(500); // Unchanged

      expect(clip.is_graphics_cached()).toBe(false);
    });

    test("should handle complete edit workflow", () => {
      // 1. Set timing
      clip.start_pack(100);
      clip.duration(3000);

      // 2. Add events
      for (let i = 0; i < 10; i++) {
        clip.add_event(createMediaEvent(i * 100, 50));
      }

      // 3. Set audio
      clip.audio_frames(44100 * 10); // 10 seconds

      // 4. Validate
      expect(clip.validate()).toBe(true);
      expect(clip.event_count()).toBe(10);

      // 5. Serialize
      const json = clip.to_json();
      const binary = clip.to_binary();

      // 6. Restore
      const clip2 = new CDGMagic_MediaClip();
      expect(clip2.from_json(json)).toBe(true);

      const clip3 = new CDGMagic_MediaClip();
      expect(clip3.from_binary(binary)).toBe(true);

      // 7. Verify
      expect(clip2.event_count()).toBe(10);
      expect(clip3.event_count()).toBe(10);
    });

    test("should support playback sync across duration", () => {
      clip.duration(3000); // 10 seconds

      // Simulate playback every 100 packets
      for (let packet = 0; packet < clip.end_pack(); packet += 100) {
        expect(clip.sync_to_packet(packet)).toBe(true);
        expect(clip.last_sync_packet()).toBe(packet);
      }
    });
  });
});
