/**
 * CDGMagic_PALGlobalClip: Palette Global Clip
 *
 * Palette-only clip providing:
 * - Timing management (start pack, duration)
 * - Event management (inherited from MediaClip)
 * - Audio frame tracking
 * - Cloning with full state preservation
 * - JSON serialization and deserialization
 *
 * 6 tests covering timing, events, cloning, and JSON round-trip serialization.
 */

import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { createMediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";

describe("CDGMagic_PALGlobalClip - Palette Global Clip", () => {
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

// vim: ts=2 sw=2 et
// END
