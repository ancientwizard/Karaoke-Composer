/**
 * CD+Graphics Magic - MediaClip
 *
 * Core timeline structure: manages media events with timing and track options.
 * Orchestrates clips, effects, and timing for CD+G content production.
 * Synchronizes audio frames with graphics rendering pipeline.
 */

import type { CDGMagic_MediaEvent } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";
import { cloneMediaEvent          } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";
import { CDGMagic_TrackOptions    } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";

/**
 * MediaClip: Timeline media event container
 *
 * Manages a collection of media events (graphics, text, effects) with:
 * - Event queue management (sorted by start time)
 * - Clip timing and duration tracking
 * - Track options and configuration
 * - Event querying by time or index
 * - Serialization for file storage
 *
 * Architecture:
 * - Events are stored in an array and kept sorted by start_pack time
 * - Each event has associated media (bitmap, text, effect) and timing
 * - Track options apply global configuration to the clip
 * - Serialization format preserves all event and timing data
 *
 * Use Cases:
 * 1. Timeline management for CD+G projects
 * 2. Event scheduling and timing
 * 3. Multi-track composition (via track options)
 * 4. Project persistence (serialize/deserialize)
 */
export class CDGMagic_MediaClip {
  // Event queue: all media events in this clip
  private internal_events: CDGMagic_MediaEvent[];

  // Clip timing
  private internal_start_pack: number;
  private internal_duration_packs: number;

  // Track options (global configuration)
  private internal_track_options: CDGMagic_TrackOptions;

  // Dirty flag for optimization
  private internal_events_sorted: boolean;

  // Audio/Graphics synchronization state
  private internal_audio_frames: number;          // Total frames in audio
  private internal_frame_rate: number;            // Frames per second (300 for CD+G)
  private internal_graphics_buffer: Uint8Array;   // Pre-rendered graphics cache
  private internal_graphics_cache_valid: boolean; // Whether cache is current
  private internal_last_sync_packet: number;      // Last packet synchronized

  /**
   * Constructor: Create a new media clip
   *
   * @param start_pack Starting pack number (default 0)
   * @param duration Duration in packs (default 300, ~10 seconds at 30fps)
   */
  constructor(start_pack: number = 0, duration: number = 300) {
    this.internal_events = [];
    this.internal_start_pack = start_pack;
    this.internal_duration_packs = duration;
    this.internal_track_options = new CDGMagic_TrackOptions();
    this.internal_events_sorted = true;

    // Initialize audio/graphics sync state
    this.internal_audio_frames = 0;
    this.internal_frame_rate = 300; // CD+G standard: 300 frames/second
    this.internal_graphics_buffer = new Uint8Array(0);
    this.internal_graphics_cache_valid = false;
    this.internal_last_sync_packet = 0;
  }

  /**
   * Get clip start time (in pack numbers)
   *
   * Pack numbers are CD+G frame units (75 packs per second on CD media).
   *
   * @returns Start pack number
   */
  start_pack(): number;
  /**
   * Set clip start time
   *
   * @param requested_start Starting pack number
   */
  start_pack(requested_start: number): void;
  start_pack(requested_start?: number): number | void {
    if (requested_start === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = requested_start;
    }
  }

  /**
   * Get clip duration (in pack numbers)
   *
   * @returns Duration in packs
   */
  duration(): number;
  /**
   * Set clip duration
   *
   * @param requested_duration Duration in packs (minimum 1)
   */
  duration(requested_duration: number): void;
  duration(requested_duration?: number): number | void {
    if (requested_duration === undefined) {
      return this.internal_duration_packs;
    } else {
      this.internal_duration_packs = requested_duration;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Calculate clip end time
   *
   * @returns End pack number (start + duration)
   */
  end_pack(): number {
    return this.internal_start_pack + this.internal_duration_packs;
  }

  /**
   * Get track options
   *
   * Track options contain global configuration for this clip's track
   * (channel, mask settings, etc.).
   *
   * @returns Reference to TrackOptions
   */
  track_options(): CDGMagic_TrackOptions {
    return this.internal_track_options;
  }

  /**
   * Set track options
   *
   * @param new_options New TrackOptions object
   */
  set_track_options(new_options: CDGMagic_TrackOptions): void {
    this.internal_track_options = new_options;
  }

  /**
   * Get number of events in clip
   *
   * @returns Event count
   */
  event_count(): number {
    return this.internal_events.length;
  }

  /**
   * Get event by index
   *
   * @param index Event index (0-based)
   * @returns Event at index, or undefined if out of bounds
   */
  event_at_index(index: number): CDGMagic_MediaEvent | undefined {
    if (index >= 0 && index < this.internal_events.length) {
      return this.internal_events[index];
    }
    return undefined;
  }

  /**
   * Find all events at a specific pack time
   *
   * @param pack_time Pack number to query
   * @returns Array of events starting at this pack time
   */
  events_at_time(pack_time: number): CDGMagic_MediaEvent[] {
    this.ensure_sorted();
    const result: CDGMagic_MediaEvent[] = [];

    for (const event of this.internal_events) {
      if (event.start_offset === pack_time) {
        result.push(event);
      } else if (event.start_offset > pack_time) {
        break; // Events are sorted, no need to continue
      }
    }

    return result;
  }

  /**
   * Find events within a pack time range
   *
   * @param pack_start Start of time range (inclusive)
   * @param pack_end End of time range (exclusive)
   * @returns Array of events in the range
   */
  events_in_range(pack_start: number, pack_end: number): CDGMagic_MediaEvent[] {
    this.ensure_sorted();
    const result: CDGMagic_MediaEvent[] = [];

    for (const event of this.internal_events) {
      const event_start = event.start_offset;
      if (event_start >= pack_end) {
        break; // Events are sorted
      }
      if (event_start >= pack_start) {
        result.push(event);
      }
    }

    return result;
  }

  /**
   * Get all events
   *
   * @returns Array of all events (sorted by start_pack)
   */
  all_events(): CDGMagic_MediaEvent[] {
    this.ensure_sorted();
    return [...this.internal_events];
  }

  /**
   * Add event to clip
   *
   * Event is inserted maintaining sorted order by start_pack.
   *
   * @param event MediaEvent to add
   */
  add_event(event: CDGMagic_MediaEvent): void {
    this.internal_events.push(cloneMediaEvent(event));
    this.internal_events_sorted = false;
    this.invalidate_graphics_cache();
  }

  /**
   * Remove event by index
   *
   * @param index Index of event to remove
   * @returns True if removed, false if index out of bounds
   */
  remove_event(index: number): boolean {
    if (index >= 0 && index < this.internal_events.length) {
      this.internal_events.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove all events
   */
  clear_events(): void {
    this.internal_events = [];
    this.internal_events_sorted = true;
    this.invalidate_graphics_cache();
  }

  /**
   * Ensure events are sorted by start_pack
   *
   * Internal helper for lazy sorting.
   */
  private ensure_sorted(): void {
    if (!this.internal_events_sorted) {
      this.internal_events.sort((a, b) => {
        return a.start_offset - b.start_offset;
      });
      this.internal_events_sorted = true;
    }
  }

  /**
   * Reset clip to default state
   *
   * Clears all events and resets timing/options.
   */
  reset(): void {
    this.internal_events = [];
    this.internal_start_pack = 0;
    this.internal_duration_packs = 300;
    this.internal_track_options = new CDGMagic_TrackOptions();
    this.internal_events_sorted = true;
    this.internal_audio_frames = 0;
    this.internal_last_sync_packet = 0;
    this.invalidate_graphics_cache();
  }

  /**
   * Clone clip with all events
   *
   * @returns New MediaClip with copied events and options
   */
  clone(): CDGMagic_MediaClip {
    const cloned = new CDGMagic_MediaClip(
      this.internal_start_pack,
      this.internal_duration_packs
    );

    // Clone all events
    for (const event of this.internal_events) {
      cloned.internal_events.push(cloneMediaEvent(event));
    }

    // Clone track options
    cloned.internal_track_options = this.internal_track_options.clone();
    cloned.internal_events_sorted = this.internal_events_sorted;

    // Clone audio frame state
    cloned.internal_audio_frames = this.internal_audio_frames;

    return cloned;
  }

  /**
   * Validate clip state
   *
   * @returns True if clip is valid (timing, events consistent)
   */
  validate(): boolean {
    // Check timing consistency
    if (this.internal_start_pack < 0 || this.internal_duration_packs < 1) {
      return false;
    }

    // Check events are within clip bounds
    for (const event of this.internal_events) {
      if (event.start_offset < 0 || event.start_offset >= this.internal_duration_packs) {
        return false;
      }
      if (event.duration < 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get audio frame count for clip
   *
   * CD+G uses 44,100 Hz audio with 1,176-frame buffers (26.7 ms).
   * This represents the total audio frames for the clip duration.
   *
   * @returns Total audio frames (44,100 Hz samples)
   */
  audio_frames(): number;
  /**
   * Set audio frame count
   *
   * @param requested_frames Total audio frames
   */
  audio_frames(requested_frames: number): void;
  audio_frames(requested_frames?: number): number | void {
    if (requested_frames === undefined) {
      return this.internal_audio_frames;
    } else {
      this.internal_audio_frames = Math.max(0, requested_frames);
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get frame rate (frames per second)
   *
   * Standard CD+G uses 300 fps for packet timing.
   *
   * @returns Frames per second
   */
  frame_rate(): number {
    return this.internal_frame_rate;
  }

  /**
   * Calculate audio/graphics synchronization point
   *
   * Converts CD+G packet number to audio sample position.
   * At 44,100 Hz and 300 packets/second:
   * - 1 packet = 147 audio samples (44,100 / 300)
   * - Packet N = N × 147 samples
   *
   * @param packet_number CD+G packet index
   * @returns Audio sample position in 44,100 Hz samples
   */
  packet_to_audio_frame(packet_number: number): number {
    // CD audio: 44,100 Hz; CD+G: 300 pps
    // 44,100 / 300 = 147 samples per packet
    const SAMPLES_PER_PACKET = 44100 / 300;
    return Math.floor(packet_number * SAMPLES_PER_PACKET);
  }

  /**
   * Calculate graphics packet from audio frame
   *
   * Converts audio sample position to CD+G packet number.
   *
   * @param audio_frame Audio sample position (44,100 Hz)
   * @returns CD+G packet index
   */
  audio_frame_to_packet(audio_frame: number): number {
    const SAMPLES_PER_PACKET = 44100 / 300;
    return Math.floor(audio_frame / SAMPLES_PER_PACKET);
  }

  /**
   * Get graphics cache buffer
   *
   * Pre-rendered graphics for the clip (if available).
   * Cache is invalidated when events change.
   *
   * @returns Graphics buffer (Uint8Array) or empty if not cached
   */
  graphics_buffer(): Uint8Array {
    return new Uint8Array(this.internal_graphics_buffer);
  }

  /**
   * Set graphics cache buffer
   *
   * @param buffer Pre-rendered graphics data
   */
  set_graphics_buffer(buffer: Uint8Array): void {
    this.internal_graphics_buffer = new Uint8Array(buffer);
    this.internal_graphics_cache_valid = true;
  }

  /**
   * Check if graphics cache is valid
   *
   * @returns True if graphics cache is current
   */
  is_graphics_cached(): boolean {
    return this.internal_graphics_cache_valid;
  }

  /**
   * Invalidate graphics cache
   *
   * Called when events change or timing updates.
   * Signals that graphics need to be re-rendered.
   */
  invalidate_graphics_cache(): void {
    this.internal_graphics_cache_valid = false;
  }

  /**
   * Get last synchronized packet number
   *
   * Tracks the furthest packet that has been processed
   * for audio/graphics synchronization.
   *
   * @returns Last synchronized packet number
   */
  last_sync_packet(): number;
  /**
   * Set last synchronized packet
   *
   * @param packet_number Packet to sync to
   */
  last_sync_packet(packet_number: number): void;
  last_sync_packet(packet_number?: number): number | void {
    if (packet_number === undefined) {
      return this.internal_last_sync_packet;
    } else {
      this.internal_last_sync_packet = Math.max(0, packet_number);
    }
  }

  /**
   * Synchronize clip to playback position
   *
   * Updates clip state for rendering at the given playback packet.
   * Should be called during playback to keep graphics in sync with audio.
   *
   * @param packet_number Current playback packet
   * @returns True if synchronization successful
   */
  sync_to_packet(packet_number: number): boolean {
    try {
      if (packet_number < 0) {
        return false;
      }

      // Check if packet is within clip bounds
      const clip_start = this.internal_start_pack;
      const clip_end = this.end_pack();

      if (packet_number < clip_start) {
        // Before clip starts - no graphics
        this.internal_last_sync_packet = packet_number;
        return true;
      }

      if (packet_number >= clip_end) {
        // After clip ends - update sync point
        this.internal_last_sync_packet = clip_end - 1;
        return true;
      }

      // Within clip - update sync point
      const local_packet = packet_number - clip_start;
      this.internal_last_sync_packet = packet_number;

      // Query events at this position
      this.events_at_time(local_packet);

      return true;
    } catch (error) {
      console.error("Failed to synchronize clip:", error);
      return false;
    }
  }

  /**
   * Estimate total CDG packets needed for clip
   *
   * Each packet is 24 bytes. This helps pre-allocate buffers.
   *
   * @returns Estimated packet count
   */
  estimate_packet_count(): number {
    // Rough estimate: ~100 packets per second of content
    const seconds = this.internal_duration_packs / 300;
    return Math.ceil(seconds * 100);
  }

  /**
   * Serialize clip state
   *
   * JSON format:
   * {
   *   "start_pack": number,
   *   "duration": number,
   *   "audio_frames": number,
   *   "frame_rate": number,
   *   "track_options": {...},
   *   "events": [...]
   * }
   *
   * @returns JSON string representation
   */
  to_json(): string {
    this.ensure_sorted();

    const clip_data = {
      start_pack: this.internal_start_pack,
      duration: this.internal_duration_packs,
      audio_frames: this.internal_audio_frames,
      frame_rate: this.internal_frame_rate,
      track_options: { channel: this.internal_track_options.channel() },
      events: this.internal_events.map((event) => ({
        start_offset: event.start_offset,
        duration: event.duration,
      })),
    };

    return JSON.stringify(clip_data, null, 2);
  }

  /**
   * Deserialize clip from JSON
   *
   * @param json_string JSON string to deserialize
   * @returns True if successful, false if format invalid
   */
  from_json(json_string: string): boolean {
    try {
      const clip_data = JSON.parse(json_string);

      if (
        typeof clip_data.start_pack !== "number" ||
        typeof clip_data.duration !== "number"
      ) {
        return false;
      }

      this.internal_start_pack = clip_data.start_pack;
      this.internal_duration_packs = clip_data.duration;
      this.internal_audio_frames = clip_data.audio_frames || 0;
      this.internal_frame_rate = clip_data.frame_rate || 300;

      // Deserialize track options if present
      if (clip_data.track_options && typeof clip_data.track_options.channel === "number") {
        this.internal_track_options.channel(clip_data.track_options.channel);
      }

      // Clear existing events
      this.internal_events = [];

      // Deserialize events if present
      if (Array.isArray(clip_data.events)) {
        for (const event_data of clip_data.events) {
          if (typeof event_data.start_offset === "number") {
            // Create basic event (would need full MediaEvent deserialization)
            // For now, just track the structure
            this.internal_events.push({
              start_offset: event_data.start_offset,
              duration: event_data.duration || 0,
            } as unknown as CDGMagic_MediaEvent);
          }
        }
      }

      this.internal_events_sorted = false;
      this.invalidate_graphics_cache();

      return true;
    } catch (error) {
      console.error("Failed to deserialize clip:", error);
      return false;
    }
  }

  /**
   * Serialize clip to binary format
   *
   * Format:
   * - Bytes 0-3: Start pack (uint32, big-endian)
   * - Bytes 4-7: Duration (uint32, big-endian)
   * - Bytes 8-11: Audio frames (uint32, big-endian)
   * - Bytes 12-13: Event count (uint16, big-endian)
   * - Bytes 14+: TrackOptions serialized
   * - Bytes N+: Events serialized sequentially
   *
   * @returns Uint8Array with serialized data
   */
  to_binary(): Uint8Array {
    // Allocate buffer for header + event data
    const buffer_size = 16 + this.internal_events.length * 8;
    const buffer = new Uint8Array(buffer_size);
    const view = new DataView(buffer.buffer);

    let offset = 0;

    // Write header: start pack (uint32)
    view.setUint32(offset, this.internal_start_pack, false);
    offset += 4;

    // Write duration (uint32)
    view.setUint32(offset, this.internal_duration_packs, false);
    offset += 4;

    // Write audio frames (uint32)
    view.setUint32(offset, this.internal_audio_frames, false);
    offset += 4;

    // Write event count (uint16)
    view.setUint16(offset, this.internal_events.length, false);
    offset += 2;

    // Write frame rate (uint16)
    view.setUint16(offset, this.internal_frame_rate, false);
    offset += 2;

    // Write events (each: start_offset uint32 + duration uint32)
    for (const event of this.internal_events) {
      view.setUint32(offset, event.start_offset, false);
      offset += 4;
      view.setUint32(offset, event.duration, false);
      offset += 4;
    }

    return buffer;
  }

  /**
   * Deserialize clip from binary format
   *
   * @param data Uint8Array with serialized data
   * @returns True if successful, false if format invalid
   */
  from_binary(data: Uint8Array): boolean {
    try {
      if (data.length < 16) {
        return false; // Minimum header size
      }

      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      let offset = 0;

      // Read header: start pack (uint32)
      const start_pack = view.getUint32(offset, false);
      offset += 4;

      // Read duration (uint32)
      const duration = view.getUint32(offset, false);
      offset += 4;

      // Read audio frames (uint32)
      const audio_frames = view.getUint32(offset, false);
      offset += 4;

      // Read event count (uint16)
      const event_count = view.getUint16(offset, false);
      offset += 2;

      // Read frame rate (uint16)
      const frame_rate = view.getUint16(offset, false);
      offset += 2;

      // Validate size
      if (offset + event_count * 8 !== data.length) {
        return false;
      }

      // Update clip state
      this.internal_start_pack = start_pack;
      this.internal_duration_packs = duration;
      this.internal_audio_frames = audio_frames;
      this.internal_frame_rate = frame_rate;
      this.internal_events = [];

      // Read events
      for (let i = 0; i < event_count; i++) {
        const start_offset = view.getUint32(offset, false);
        offset += 4;
        const event_duration = view.getUint32(offset, false);
        offset += 4;

        this.internal_events.push({
          start_offset,
          duration: event_duration,
        } as unknown as CDGMagic_MediaEvent);
      }

      this.internal_events_sorted = true;
      this.invalidate_graphics_cache();

      return true;
    } catch (error) {
      console.error("Failed to deserialize from binary:", error);
      return false;
    }
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END