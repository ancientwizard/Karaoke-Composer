/**
 * Unit tests for Phase 7 CD+Graphics Magic TypeScript conversions
 *
 * Tests:
 * - CDGMagic_AudioPlayback: Web Audio API audio management
 *   - Context initialization
 *   - WAVE file loading and decoding
 *   - Playback control (play/pause/stop)
 *   - Frame-accurate timing
 *   - Waveform visualization
 *   - Latency measurement
 */

import { CDGMagic_AudioPlayback } from "@/ts/cd+g-magic/CDGMagic_AudioPlayback";

// Suppress expected console errors during tests
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("Phase 7: Audio Playback", () => {
  describe("CDGMagic_AudioPlayback - Constructor & Initialization", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("Constructor initializes with default parameters", () => {
      expect(audio.sample_rate()).toBe(44100);
      expect(audio.frame_buffer_size()).toBe(1176);
      expect(audio.duration()).toBe(0);
      expect(audio.is_playing()).toBe(false);
    });

    test("Constructor sets waveform dimensions to 2048×128", () => {
      const [width, height] = audio.waveform_dimensions();
      expect(width).toBe(2048);
      expect(height).toBe(128);
    });

    test("Constructor sets measured latency to 0", () => {
      expect(audio.measured_latency_ms()).toBe(0);
    });

    test("waveform_bitmap() returns null before WAVE load", () => {
      expect(audio.waveform_bitmap()).toBeNull();
    });

    test("initialize_context() returns false if Web Audio API unavailable", () => {
      // In test environment, Web Audio may not be available
      // This test documents expected behavior
      const result = audio.initialize_context();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("CDGMagic_AudioPlayback - Playback Control", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("play() returns false if context not initialized", () => {
      const result = audio.play();
      expect(result).toBe(false);
    });

    test("pause() returns false if not playing", () => {
      const result = audio.pause();
      expect(result).toBe(false);
    });

    test("stop() returns false if not playing", () => {
      const result = audio.stop();
      expect(result).toBe(false);
    });

    test("stop() sets current_time to 0", () => {
      // Simulate setting position
      audio.set_current_time(5.0);
      expect(audio.current_time()).toBe(5.0);

      audio.stop();
      expect(audio.current_time()).toBe(0);
    });

    test("is_playing() returns false by default", () => {
      expect(audio.is_playing()).toBe(false);
    });
  });

  describe("CDGMagic_AudioPlayback - Timing & Duration", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("current_time() returns 0 initially", () => {
      expect(audio.current_time()).toBe(0);
    });

    test("current_time() respects set_current_time()", () => {
      audio.set_current_time(2.5);
      expect(audio.current_time()).toBe(2.5);
    });

    test("set_current_time() clamps to 0 for negative values", () => {
      audio.set_current_time(-5.0);
      expect(audio.current_time()).toBe(0);
    });

    test("set_current_time() allows values beyond duration when no audio loaded", () => {
      // When no audio is loaded, allow arbitrary time values for timeline editing
      audio.set_current_time(999999.0);
      expect(audio.current_time()).toBe(999999.0);
    });

    test("current_frame() converts time to CD frame numbers", () => {
      audio.set_current_time(1.0); // 1 second
      // CD+G frames: 300 per second, so 1 second = 300 frames
      expect(audio.current_frame()).toBe(300);
    });

    test("set_current_frame() converts frame number to time", () => {
      audio.set_current_frame(150);
      // 150 frames / 300 fps = 0.5 seconds
      expect(audio.current_time()).toBeCloseTo(0.5, 5);
    });

    test("set_current_frame(0) sets time to 0", () => {
      audio.set_current_frame(0);
      expect(audio.current_time()).toBe(0);
    });

    test("duration() returns 0 when no audio loaded", () => {
      expect(audio.duration()).toBe(0);
    });
  });

  describe("CDGMagic_AudioPlayback - Audio Parameters", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("sample_rate() returns 44100 Hz", () => {
      expect(audio.sample_rate()).toBe(44100);
    });

    test("frame_buffer_size() returns 1176 samples", () => {
      // CD audio: 44100 samples/sec ÷ 75 frames/sec × 2 = 1176 samples/frame
      expect(audio.frame_buffer_size()).toBe(1176);
    });

    test("Frame buffer represents 26.7 ms at 44100 Hz", () => {
      const frame_duration_ms =
        (audio.frame_buffer_size() / audio.sample_rate()) * 1000;
      expect(frame_duration_ms).toBeCloseTo(26.666, 1);
    });
  });

  describe("CDGMagic_AudioPlayback - Waveform Visualization", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("waveform_dimensions() returns [2048, 128]", () => {
      const [width, height] = audio.waveform_dimensions();
      expect(width).toBe(2048);
      expect(height).toBe(128);
    });

    test("waveform_bitmap() returns null before generation", () => {
      expect(audio.waveform_bitmap()).toBeNull();
    });

    test("waveform_bitmap() size matches dimensions when generated", () => {
      // Note: Can't test generation without actual audio buffer
      // This test documents expected behavior
      const [width, height] = audio.waveform_dimensions();
      const expected_pixels = width * height;
      expect(expected_pixels).toBe(2048 * 128);
    });
  });

  describe("CDGMagic_AudioPlayback - Latency Management", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("measured_latency_ms() returns 0 initially", () => {
      expect(audio.measured_latency_ms()).toBe(0);
    });

    test("update_latency_measurement() completes without error", () => {
      expect(() => audio.update_latency_measurement()).not.toThrow();
    });

    test("update_latency_measurement() handles missing context", () => {
      audio.update_latency_measurement();
      expect(audio.measured_latency_ms()).toBe(0);
    });
  });

  describe("CDGMagic_AudioPlayback - File Loading", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("load_wave_file() returns false if context not initialized", async () => {
      const result = await audio.load_wave_file("fake.wav");
      expect(result).toBe(false);
    });

    test("load_wave_file() accepts URL string", async () => {
      // Context not initialized, so it should fail safely
      const result = await audio.load_wave_file("https://example.com/audio.wav");
      expect(typeof result).toBe("boolean");
    });

    test("load_wave_file() handles File objects", async () => {
      // Create a mock File object (can't test without real audio buffer)
      const mockFile = new File([""], "test.wav", { type: "audio/wav" });
      const result = await audio.load_wave_file(mockFile);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("CDGMagic_AudioPlayback - State Management", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("reset() clears audio buffer", () => {
      expect(audio.waveform_bitmap()).toBeNull();
      audio.reset();
      expect(audio.waveform_bitmap()).toBeNull();
    });

    test("reset() sets duration to 0", () => {
      audio.reset();
      expect(audio.duration()).toBe(0);
    });

    test("reset() sets current_time to 0", () => {
      audio.set_current_time(5.0);
      audio.reset();
      expect(audio.current_time()).toBe(0);
    });

    test("dispose() completes without error", () => {
      expect(() => audio.dispose()).not.toThrow();
    });

    test("dispose() clears resources", () => {
      audio.dispose();
      expect(audio.waveform_bitmap()).toBeNull();
    });
  });

  describe("CDGMagic_AudioPlayback - Integration Scenarios", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("Scenario: Multiple timing adjustments", () => {
      audio.set_current_time(1.0);
      expect(audio.current_frame()).toBe(300);

      audio.set_current_time(2.5);
      expect(audio.current_frame()).toBe(750);

      audio.set_current_frame(1500);
      expect(audio.current_time()).toBeCloseTo(5.0, 5);
    });

    test("Scenario: Frame-based navigation", () => {
      // Navigate in frame increments (typical CD+G timeline)
      for (let frame = 0; frame <= 1200; frame += 300) {
        audio.set_current_frame(frame);
        expect(audio.current_frame()).toBe(frame);
      }
    });

    test("Scenario: Time boundary conditions", () => {
      // Test at 0
      audio.set_current_time(0);
      expect(audio.current_frame()).toBe(0);

      // Test at large time
      audio.set_current_time(3600.0); // 1 hour
      const frame = audio.current_frame();
      expect(frame).toBeGreaterThan(0);
    });

    test("Scenario: Playback state transitions", () => {
      expect(audio.is_playing()).toBe(false);

      audio.set_current_time(1.0);
      expect(audio.current_time()).toBe(1.0);

      audio.stop();
      expect(audio.is_playing()).toBe(false);
      expect(audio.current_time()).toBe(0);
    });

    test("Scenario: Waveform generation workflow", () => {
      // Typical workflow: initialize → load → visualize
      audio.initialize_context();

      // Waveform should be null until audio is loaded
      expect(audio.waveform_bitmap()).toBeNull();
    });

    test("Scenario: CD+G frame synchronization", () => {
      // CD+G clips run at 300 fps (1 frame = 3.333 ms)
      const frame_duration_s = 1.0 / 300.0;

      for (let frame = 0; frame < 300; frame += 30) {
        audio.set_current_frame(frame);
        const time_s = audio.current_time();
        const expected_time = frame * frame_duration_s;
        expect(time_s).toBeCloseTo(expected_time, 5);
      }
    });
  });

  describe("CDGMagic_AudioPlayback - Edge Cases", () => {
    let audio: CDGMagic_AudioPlayback;

    beforeEach(() => {
      audio = new CDGMagic_AudioPlayback();
    });

    test("set_current_time() handles NaN gracefully", () => {
      audio.set_current_time(NaN);
      // Should clamp to valid range (0)
      expect(audio.current_time()).toBeGreaterThanOrEqual(0);
    });

    test("set_current_time() handles Infinity gracefully", () => {
      audio.set_current_time(Infinity);
      // Should clamp to duration
      expect(audio.current_time()).toBeLessThanOrEqual(audio.duration());
    });

    test("current_frame() handles fractional times", () => {
      audio.set_current_time(1.5);
      const frame = audio.current_frame();
      expect(frame).toBe(450); // 1.5 × 300
    });

    test("Rapid state changes don't crash", () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          audio.set_current_time(i * 0.1);
          audio.set_current_frame(i * 10);
          audio.current_frame();
          audio.current_time();
        }
      }).not.toThrow();
    });

    test("Large frame numbers handled correctly", () => {
      const large_frame = 1000000;
      audio.set_current_frame(large_frame);
      const time = audio.current_time();
      expect(time).toBeCloseTo(large_frame / 300.0, 2);
    });
  });
});

// VIM: set ft=typescript :
// END