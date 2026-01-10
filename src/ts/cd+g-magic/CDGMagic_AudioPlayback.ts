/**
 * CD+Graphics Magic - Audio Playback
 *
 * Audio management and playback control using Web Audio API.
 * Handles WAVE file loading, playback, sample rate negotiation, and visualization.
 */

import { CDGEnv } from "./CDGMagic_Environment";

/**
 * AudioPlayback: Web Audio API audio management
 *
 * Manages audio playback for CD+G projects:
 * - WAVE file loading and parsing
 * - Web Audio Context setup and control
 * - Playback state management (playing, paused, stopped)
 * - Frame-accurate timing (1,176 frame buffers, 44,100 Hz)
 * - Waveform visualization bitmap
 * - Latency and synchronization tracking
 *
 * Architecture:
 * - Web Audio API context for audio synthesis and playback
 * - AudioBuffer stores decoded PCM data
 * - BufferSource node for playback control
 * - ScriptProcessorNode for frame-by-frame analysis (if needed)
 * - Visualization as RGBA bitmap (2048×128 typical)
 *
 * Use Cases:
 * 1. Load and decode WAVE files from disk or URLs
 * 2. Play/pause/stop audio with precise timing
 * 3. Synchronize graphics to audio playback
 * 4. Analyze waveform for visualization
 * 5. Monitor latency for AV sync
 *
 * Constraints:
 * - Web Audio API requires user gesture for autoplay
 * - Sample rate must be 44,100 Hz (CD audio standard)
 * - Stereo audio typical (mono supported)
 * - Frame buffer = 1,176 samples (26.7 ms at 44,100 Hz)
 */
export class CDGMagic_AudioPlayback {
  // Web Audio Context (shared or per-instance)
  private internal_audio_context: AudioContext | null;

  // Decoded audio buffer
  private internal_audio_buffer: AudioBuffer | null;

  // Current playback source node
  private internal_source_node: AudioBufferSourceNode | null;

  // Playback state
  private internal_is_playing: boolean;
  private internal_start_time: number;  // Context time when playback started
  private internal_pause_offset: number; // Samples into the buffer when paused

  // Audio parameters
  private internal_sample_rate: number;
  private internal_frame_buffer_size: number;
  private internal_duration_seconds: number;

  // Waveform visualization
  private internal_waveform_bitmap: Uint32Array | null;
  private internal_waveform_width: number;
  private internal_waveform_height: number;

  // Latency tracking
  private internal_measured_latency_ms: number;

  /**
   * Constructor: Create audio playback manager
   *
   * Initializes Web Audio context and default parameters.
   * Does not require user gesture here; playback does.
   */
  constructor() {
    this.internal_audio_context = null;
    this.internal_audio_buffer = null;
    this.internal_source_node = null;
    this.internal_is_playing = false;
    this.internal_start_time = 0;
    this.internal_pause_offset = 0;

    // CD audio standard: 44,100 Hz, 1,176 frame buffer (26.7 ms)
    this.internal_sample_rate = 44100;
    this.internal_frame_buffer_size = 1176;
    this.internal_duration_seconds = 0;

    // Waveform visualization (2048×128 RGBA)
    this.internal_waveform_bitmap = null;
    this.internal_waveform_width = 2048;
    this.internal_waveform_height = 128;

    this.internal_measured_latency_ms = 0;
  }

  /**
   * Initialize Web Audio Context
   *
   * Must be called before loading or playing audio.
   * Uses default sample rate if available, ensures 44,100 Hz compatible.
   * In CLI environment, returns true but does not create actual context (graceful degradation).
   *
   * @returns True if context initialized successfully (or in CLI mode)
   */
  initialize_context(): boolean {
    // In CLI environment, skip audio context initialization
    if (!CDGEnv.isBrowser) {
      return true; // Allow graceful operation
    }

    try {
      const audioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!audioContext) {
        CDGEnv.logError("Web Audio API not supported");
        return false;
      }

      this.internal_audio_context = new audioContext();

      // Note: Modern Web Audio API typically runs at 48kHz or 44.1kHz
      // We'll accept the system's sample rate and document in meta
      const actual_sr = this.internal_audio_context!.sampleRate;
      if (actual_sr !== 44100 && actual_sr !== 48000) {
        CDGEnv.warnIfBrowser(
          `Audio context sample rate ${actual_sr} Hz (expected 44100 or 48000)`
        );
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to initialize Web Audio context:", error);
      return false;
    }
  }

  /**
   * Load and decode WAVE file from URL or File
   *
   * Handles WAVE format parsing and decoding via Web Audio API.
   * In CLI environment, returns false (no audio playback).
   *
   * @param source URL string or File object
   * @returns True if loaded successfully
   */
  async load_wave_file(source: string | File): Promise<boolean> {
    if (!CDGEnv.isBrowser) {
      return false; // No audio in CLI
    }

    if (!this.internal_audio_context) {
      CDGEnv.logError("Audio context not initialized");
      return false;
    }

    try {
      let arrayBuffer: ArrayBuffer;

      if (typeof source === "string") {
        // Load from URL
        const response = await fetch(source);
        if (!response.ok) {
          CDGEnv.logError(`Failed to fetch audio: ${response.statusText}`);
          return false;
        }
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Load from File object
        arrayBuffer = await source.arrayBuffer();
      }

      // Decode audio data
      this.internal_audio_buffer = await this.internal_audio_context.decodeAudioData(
        arrayBuffer
      );

      // Update duration
      this.internal_duration_seconds =
        this.internal_audio_buffer.duration;

      // Generate waveform visualization
      this.generate_waveform_bitmap();

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to load WAVE file:", error);
      return false;
    }
  }

  /**
   * Start audio playback from current position
   *
   * Requires Web Audio context and loaded audio buffer.
   * First playback requires user gesture (click, keydown, etc.).
   * In CLI environment, returns false (no audio).
   *
   * @returns True if playback started
   */
  play(): boolean {
    if (!CDGEnv.isBrowser) {
      return false; // No audio in CLI
    }

    if (!this.internal_audio_context || !this.internal_audio_buffer) {
      CDGEnv.logError("Audio context or buffer not ready");
      return false;
    }

    // Resume context if suspended
    if (this.internal_audio_context.state === "suspended") {
      this.internal_audio_context.resume().catch((err) => {
        CDGEnv.logError("Failed to resume audio context:", err);
      });
    }

    if (this.internal_is_playing) {
      return true; // Already playing
    }

    try {
      // Create new buffer source node
      this.internal_source_node = this.internal_audio_context.createBufferSource();
      this.internal_source_node.buffer = this.internal_audio_buffer;

      // Connect to destination (speakers)
      this.internal_source_node.connect(this.internal_audio_context.destination);

      // Start playback from pause offset
      this.internal_source_node.start(
        0,
        this.internal_pause_offset / this.internal_sample_rate
      );

      this.internal_start_time = this.internal_audio_context.currentTime;
      this.internal_is_playing = true;

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to start playback:", error);
      return false;
    }
  }

  /**
   * Pause audio playback
   *
   * Pauses at current position; can be resumed with play().
   *
   * @returns True if paused successfully
   */
  pause(): boolean {
    if (!CDGEnv.isBrowser) {
      return false; // No audio in CLI
    }

    if (!this.internal_is_playing || !this.internal_source_node) {
      return false;
    }

    try {
      // Calculate current position in samples
      const elapsed_time = this.internal_audio_context!.currentTime - this.internal_start_time;
      this.internal_pause_offset += elapsed_time * this.internal_sample_rate;

      // Stop the source node
      this.internal_source_node.stop();
      this.internal_source_node.disconnect();

      this.internal_is_playing = false;

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to pause playback:", error);
      return false;
    }
  }

  /**
   * Stop audio playback and reset position
   *
   * @returns True if stopped successfully
   */
  stop(): boolean {
    const result = this.pause();
    this.internal_pause_offset = 0;
    return result;
  }

  /**
   * Check if currently playing
   *
   * @returns True if audio is playing
   */
  is_playing(): boolean {
    return this.internal_is_playing;
  }

  /**
   * Get current playback position in seconds
   *
   * @returns Current time (0.0 to duration)
   */
  current_time(): number {
    if (!this.internal_is_playing || !this.internal_audio_context) {
      return this.internal_pause_offset / this.internal_sample_rate;
    }

    const elapsed = this.internal_audio_context.currentTime - this.internal_start_time;
    return (this.internal_pause_offset + elapsed * this.internal_sample_rate) /
      this.internal_sample_rate;
  }

  /**
   * Set playback position
   *
   * @param seconds Position in seconds (clamped to 0-duration, or allowed for offline editing)
   */
  set_current_time(seconds: number): void {
    // Sanitize NaN and Infinity
    if (!Number.isFinite(seconds)) {
      seconds = 0;
    }

    // Allow setting time even without loaded audio (for timeline editing)
    // If audio is loaded, clamp to duration
    let clamped_seconds = Math.max(0, seconds);
    if (this.internal_duration_seconds > 0) {
      clamped_seconds = Math.min(
        clamped_seconds,
        this.internal_duration_seconds
      );
    }

    const sample_pos = clamped_seconds * this.internal_sample_rate;

    const was_playing = this.internal_is_playing;
    if (was_playing) {
      this.pause();
    }

    this.internal_pause_offset = sample_pos;

    if (was_playing) {
      this.play();
    }
  }

  /**
   * Get total audio duration in seconds
   *
   * @returns Duration (0 if no audio loaded)
   */
  duration(): number {
    return this.internal_duration_seconds;
  }

  /**
   * Get sample rate
   *
   * @returns Sample rate in Hz (typically 44,100 or 48,000)
   */
  sample_rate(): number {
    return this.internal_sample_rate;
  }

  /**
   * Get frame buffer size
   *
   * @returns Frame buffer size in samples (CD standard: 1,176)
   */
  frame_buffer_size(): number {
    return this.internal_frame_buffer_size;
  }

  /**
   * Get current frame number
   *
   * Frame = 1/300 of a second (CD+G standard).
   * Converts from seconds: frames = seconds × 300
   *
   * @returns Frame number
   */
  current_frame(): number {
    // CD frames: 75 per second at 1× speed, but CD+G uses 300 frames per second
    return Math.floor(this.current_time() * 300);
  }

  /**
   * Set playback position by frame number
   *
   * @param frame_num Frame number (0-based)
   */
  set_current_frame(frame_num: number): void {
    this.set_current_time(frame_num / 300.0);
  }

  /**
   * Get measured playback latency
   *
   * Latency = time from play() call to first audio output.
   * Typically 10–100 ms depending on system and buffer size.
   *
   * @returns Latency in milliseconds
   */
  measured_latency_ms(): number {
    return this.internal_measured_latency_ms;
  }

  /**
   * Measure and update latency
   *
   * Should be called after play() to measure actual latency.
   * Uses AudioContext.baseLatency and outputLatency if available.
   */
  update_latency_measurement(): void {
    if (!this.internal_audio_context) {
      this.internal_measured_latency_ms = 0;
      return;
    }

    // Modern Web Audio API provides latency info
    const baseLatency =
      (this.internal_audio_context as any).baseLatency || 0;
    const outputLatency =
      (this.internal_audio_context as any).outputLatency || 0;

    this.internal_measured_latency_ms = (baseLatency + outputLatency) * 1000;
  }

  /**
   * Generate waveform visualization bitmap
   *
   * Creates a 2048×128 RGBA bitmap showing audio levels.
   * Samples audio buffer and renders peak levels per pixel column.
   * Skipped in CLI environment.
   *
   * @returns True if generated successfully
   */
  private generate_waveform_bitmap(): boolean {
    if (!CDGEnv.isBrowser) {
      return true; // Skip in CLI (graceful)
    }

    if (!this.internal_audio_buffer) {
      return false;
    }

    try {
      const width = this.internal_waveform_width;
      const height = this.internal_waveform_height;

      // Create RGBA bitmap
      this.internal_waveform_bitmap = new Uint32Array(width * height);

      // Get audio data (use first channel if stereo)
      const channel_data = this.internal_audio_buffer.getChannelData(0);
      const samples_per_pixel = Math.max(
        1,
        Math.floor(channel_data.length / width)
      );

      // Render waveform
      for (let x = 0; x < width; x++) {
        let max_level = 0;

        // Sample range for this pixel column
        for (
          let i = 0;
          i < samples_per_pixel && x * samples_per_pixel + i < channel_data.length;
          i++
        ) {
          const sample_idx = x * samples_per_pixel + i;
          const level = Math.abs(channel_data[sample_idx]);
          max_level = Math.max(max_level, level);
        }

        // Scale to pixel height (0–127)
        const pixel_height = Math.floor(max_level * (height - 1));

        // Draw column from center outward
        const center_y = Math.floor(height / 2);
        for (let y = 0; y < height; y++) {
          const distance_from_center = Math.abs(y - center_y);

          // Light up pixels within waveform height
          if (distance_from_center <= pixel_height) {
            const pixel_idx = y * width + x;
            // RGBA: (R=200, G=220, B=255, A=255) - light blue
            this.internal_waveform_bitmap[pixel_idx] = 0xc8dcffff;
          }
        }
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to generate waveform:", error);
      return false;
    }
  }

  /**
   * Get waveform visualization bitmap
   *
   * @returns RGBA bitmap (2048×128) or null if not generated
   */
  waveform_bitmap(): Uint32Array | null {
    return this.internal_waveform_bitmap;
  }

  /**
   * Get waveform bitmap dimensions
   *
   * @returns [width, height] in pixels
   */
  waveform_dimensions(): [number, number] {
    return [this.internal_waveform_width, this.internal_waveform_height];
  }

  /**
   * Reset to initial state
   *
   * Stops playback and clears loaded audio.
   */
  reset(): void {
    this.stop();
    this.internal_audio_buffer = null;
    this.internal_waveform_bitmap = null;
    this.internal_duration_seconds = 0;
    this.internal_pause_offset = 0;
  }

  /**
   * Clean up resources
   *
   * Should be called before destroying instance.
   */
  dispose(): void {
    this.stop();

    if (this.internal_audio_context) {
      // Web Audio context can't be closed, but can be left for GC
      this.internal_audio_context = null;
    }

    this.internal_audio_buffer = null;
    this.internal_waveform_bitmap = null;
  }
}

// VIM: set ft=typescript :
// END