/**
 * CD+Graphics Magic - Editing Lanes Playback Head
 *
 * Visual indicator for current playback position on the timeline.
 */

/**
 * EditingLanes_PlaybackHead: Timeline playback position indicator
 *
 * Manages the visual playback head that shows current position during playback.
 *
 * Responsibilities:
 * - Track current position (frame number)
 * - Manage visual state (playing, paused, stopped)
 * - Calculate pixel position on timeline
 * - Update position during playback
 *
 * Use Cases:
 * 1. Show current playback position in timeline
 * 2. Update position during audio playback
 * 3. Drag to seek (future enhancement)
 * 4. Visual feedback during playback
 *
 * Note: This is a lightweight position tracker.
 * Rendering is handled by the parent EditingLanes component.
 */
export class CDGMagic_EditingLanes_PlaybackHead {
  // Current position
  private internal_current_frame: number;

  // Timeline dimensions
  private internal_timeline_start_frame: number;
  private internal_timeline_duration_frames: number;

  // Display parameters
  private internal_timeline_pixel_width: number;
  private internal_is_visible: boolean;

  // State
  private internal_is_playing: boolean;

  /**
   * Constructor: Create playback head
   *
   * @param timeline_width Width of timeline in pixels
   * @param start_frame Timeline start (default 0)
   * @param duration_frames Timeline duration (default 30000 frames ≈ 100 seconds)
   */
  constructor(
    timeline_width: number = 800,
    start_frame: number = 0,
    duration_frames: number = 30000
  ) {
    this.internal_current_frame = start_frame;
    this.internal_timeline_start_frame = start_frame;
    this.internal_timeline_duration_frames = Math.max(1, duration_frames);
    this.internal_timeline_pixel_width = Math.max(1, timeline_width);
    this.internal_is_visible = true;
    this.internal_is_playing = false;
  }

  /**
   * Get current position (frame number)
   *
   * @returns Frame number
   */
  current_frame(): number;
  /**
   * Set current position
   *
   * @param frame_number Frame number (clamped to timeline range)
   */
  current_frame(frame_number: number): void;
  current_frame(frame_number?: number): number | void {
    if (frame_number === undefined) {
      return this.internal_current_frame;
    } else {
      const min_frame = this.internal_timeline_start_frame;
      const max_frame =
        this.internal_timeline_start_frame +
        this.internal_timeline_duration_frames;

      this.internal_current_frame = Math.max(
        min_frame,
        Math.min(frame_number, max_frame)
      );
    }
  }

  /**
   * Get position as offset from timeline start
   *
   * @returns Frame offset (0 = timeline start)
   */
  frame_offset(): number {
    return this.internal_current_frame - this.internal_timeline_start_frame;
  }

  /**
   * Get pixel position on timeline
   *
   * Calculates X coordinate where playhead should be drawn.
   *
   * @returns Pixel X position (0 = timeline left edge)
   */
  pixel_position(): number {
    const offset = this.frame_offset();
    const position_ratio = offset / this.internal_timeline_duration_frames;

    return Math.round(position_ratio * this.internal_timeline_pixel_width);
  }

  /**
   * Set timeline dimensions
   *
   * @param pixel_width Width of timeline display (pixels)
   * @param start_frame Timeline start frame
   * @param duration_frames Timeline duration (frames)
   */
  set_timeline_dimensions(
    pixel_width: number,
    start_frame: number,
    duration_frames: number
  ): void {
    this.internal_timeline_pixel_width = Math.max(1, pixel_width);
    this.internal_timeline_start_frame = start_frame;
    this.internal_timeline_duration_frames = Math.max(1, duration_frames);

    // Clamp current position to new range
    const min_frame = this.internal_timeline_start_frame;
    const max_frame =
      this.internal_timeline_start_frame +
      this.internal_timeline_duration_frames;

    this.internal_current_frame = Math.max(
      min_frame,
      Math.min(this.internal_current_frame, max_frame)
    );
  }

  /**
   * Get timeline range
   *
   * @returns { start_frame, duration_frames }
   */
  timeline_range(): { start_frame: number; duration_frames: number } {
    return {
      start_frame: this.internal_timeline_start_frame,
      duration_frames: this.internal_timeline_duration_frames,
    };
  }

  /**
   * Check if playhead is visible
   *
   * @returns True if visible
   */
  is_visible(): boolean;
  /**
   * Set visibility
   *
   * @param visible Show/hide playhead
   */
  is_visible(visible: boolean): void;
  is_visible(visible?: boolean): boolean | void {
    if (visible === undefined) {
      return this.internal_is_visible;
    } else {
      this.internal_is_visible = visible;
    }
  }

  /**
   * Check if currently playing
   *
   * @returns True if playing
   */
  is_playing(): boolean;
  /**
   * Set playing state
   *
   * @param playing Playing flag
   */
  is_playing(playing: boolean): void;
  is_playing(playing?: boolean): boolean | void {
    if (playing === undefined) {
      return this.internal_is_playing;
    } else {
      this.internal_is_playing = playing;
    }
  }

  /**
   * Increment position by frame
   *
   * Used during playback to advance the playhead.
   *
   * @param frames Number of frames to advance
   */
  advance(frames: number): void {
    this.current_frame(this.internal_current_frame + frames);
  }

  /**
   * Reset to timeline start
   */
  reset(): void {
    this.internal_current_frame = this.internal_timeline_start_frame;
    this.internal_is_playing = false;
  }

  /**
   * Convert pixel position back to frame number
   *
   * Inverse of pixel_position(). Used for seek-by-click.
   *
   * @param pixel_x X position in pixels
   * @returns Frame number
   */
  frame_from_pixel(pixel_x: number): number {
    const ratio = Math.max(0, Math.min(1, pixel_x / this.internal_timeline_pixel_width));
    const frame_offset = ratio * this.internal_timeline_duration_frames;

    return (
      this.internal_timeline_start_frame + Math.floor(frame_offset)
    );
  }
}

// VIM: set ft=typescript :
// END