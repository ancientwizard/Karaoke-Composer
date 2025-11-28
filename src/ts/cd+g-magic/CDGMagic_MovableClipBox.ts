/**
 * CD+Graphics Magic - Movable Clip Box
 *
 * Draggable UI element representing a media clip on the timeline.
 */

import type { CDGMagic_MediaClip } from "@/ts/cd+g-magic/CDGMagic_MediaClip";

/**
 * MovableClipBox: Draggable timeline clip element
 *
 * Represents a media clip as a draggable box on the timeline.
 *
 * Responsibilities:
 * - Track clip reference and position
 * - Calculate pixel position and dimensions
 * - Manage drag state
 * - Detect mouse interactions
 *
 * Use Cases:
 * 1. Display clips on timeline
 * 2. Enable clip dragging to adjust timing
 * 3. Detect clip selection/clicking
 * 4. Show clip duration visually
 *
 * Note: Actual rendering and drag handling is performed by
 * the parent EditingLanes component. This class tracks state.
 */
export class CDGMagic_MovableClipBox {
  // Reference to media clip
  private internal_clip: CDGMagic_MediaClip;

  // Clip index on lane
  private internal_clip_index: number;

  // Timeline dimensions and scaling
  private internal_timeline_start_frame: number;
  private internal_timeline_duration_frames: number;
  private internal_pixel_width: number;

  // Frame-to-pixel scale factor
  private internal_pixels_per_frame: number;

  // Display state
  private internal_is_selected: boolean;
  private internal_is_dragging: boolean;
  private internal_drag_offset_frames: number;

  /**
   * Constructor: Create clip box for display
   *
   * @param clip MediaClip to display
   * @param index Clip index on lane (for identification)
   * @param timeline_width Width of timeline (pixels)
   * @param start_frame Timeline start frame
   * @param duration_frames Timeline duration frames
   */
  constructor(
    clip: CDGMagic_MediaClip,
    index: number = 0,
    timeline_width: number = 800,
    start_frame: number = 0,
    duration_frames: number = 30000
  ) {
    this.internal_clip = clip;
    this.internal_clip_index = index;
    this.internal_timeline_start_frame = start_frame;
    this.internal_timeline_duration_frames = Math.max(1, duration_frames);
    this.internal_pixel_width = Math.max(1, timeline_width);

    // Calculate pixels per frame
    this.internal_pixels_per_frame =
      this.internal_pixel_width / this.internal_timeline_duration_frames;

    this.internal_is_selected = false;
    this.internal_is_dragging = false;
    this.internal_drag_offset_frames = 0;
  }

  /**
   * Get media clip reference
   *
   * @returns MediaClip
   */
  clip(): CDGMagic_MediaClip {
    return this.internal_clip;
  }

  /**
   * Get clip index
   *
   * @returns Index on lane
   */
  clip_index(): number {
    return this.internal_clip_index;
  }

  /**
   * Calculate clip position in pixels (left edge)
   *
   * @returns X position from timeline left edge
   */
  pixel_x(): number {
    const clip_start = this.internal_clip.start_pack();
    const offset_from_timeline_start =
      clip_start - this.internal_timeline_start_frame;

    return Math.round(offset_from_timeline_start * this.internal_pixels_per_frame);
  }

  /**
   * Calculate clip width in pixels
   *
   * @returns Width (pixels)
   */
  pixel_width(): number {
    const duration = this.internal_clip.duration();
    return Math.max(1, Math.round(duration * this.internal_pixels_per_frame));
  }

  /**
   * Get bounding box
   *
   * @returns { x, width } for rendering
   */
  bounding_box(): { x: number; width: number } {
    return {
      x: this.pixel_x(),
      width: this.pixel_width(),
    };
  }

  /**
   * Check if point is inside clip box
   *
   * @param pixel_x X coordinate (pixels)
   * @param _pixel_y Y coordinate (pixels, for lane detection)
   * @returns True if inside
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contains_point(pixel_x: number, _pixel_y: number): boolean {
    const { x, width } = this.bounding_box();
    return pixel_x >= x && pixel_x < x + width;
  }

  /**
   * Check if selected
   *
   * @returns True if selected
   */
  is_selected(): boolean;
  /**
   * Set selected state
   *
   * @param selected Selection flag
   */
  is_selected(selected: boolean): void;
  is_selected(selected?: boolean): boolean | void {
    if (selected === undefined) {
      return this.internal_is_selected;
    } else {
      this.internal_is_selected = selected;
    }
  }

  /**
   * Check if currently dragging
   *
   * @returns True if dragging
   */
  is_dragging(): boolean;
  /**
   * Set dragging state
   *
   * @param dragging Dragging flag
   * @param pixel_x Current mouse X for drag initialization
   */
  is_dragging(dragging: boolean, pixel_x?: number): void;
  is_dragging(dragging?: boolean, pixel_x?: number): boolean | void {
    if (dragging === undefined) {
      return this.internal_is_dragging;
    } else {
      this.internal_is_dragging = dragging;

      if (dragging && pixel_x !== undefined) {
        // Calculate drag offset when starting drag
        const clip_pixel_x = this.pixel_x();
        this.internal_drag_offset_frames =
          pixel_x - clip_pixel_x / this.internal_pixels_per_frame;
      }
    }
  }

  /**
   * Calculate new clip position during drag
   *
   * @param current_pixel_x Current mouse X position
   * @returns New frame position for clip
   */
  calculate_drag_position(current_pixel_x: number): number {
    const target_pixel_x = current_pixel_x - this.internal_drag_offset_frames * this.internal_pixels_per_frame;
    const frame_offset = target_pixel_x / this.internal_pixels_per_frame;

    return Math.max(
      0,
      this.internal_timeline_start_frame + Math.floor(frame_offset)
    );
  }

  /**
   * Update timeline dimensions (recalculate scaling)
   *
   * @param pixel_width Timeline width (pixels)
   * @param start_frame Timeline start frame
   * @param duration_frames Timeline duration frames
   */
  update_timeline_dimensions(
    pixel_width: number,
    start_frame: number,
    duration_frames: number
  ): void {
    this.internal_pixel_width = Math.max(1, pixel_width);
    this.internal_timeline_start_frame = start_frame;
    this.internal_timeline_duration_frames = Math.max(1, duration_frames);

    // Recalculate scale
    this.internal_pixels_per_frame =
      this.internal_pixel_width / this.internal_timeline_duration_frames;
  }

  /**
   * Reset selection and drag state
   */
  reset_ui_state(): void {
    this.internal_is_selected = false;
    this.internal_is_dragging = false;
    this.internal_drag_offset_frames = 0;
  }

  /**
   * Convert pixel coordinate to frame number
   *
   * @param pixel_x X position (pixels)
   * @returns Frame number
   */
  frame_from_pixel(pixel_x: number): number {
    const frame_offset = pixel_x / this.internal_pixels_per_frame;
    return (
      this.internal_timeline_start_frame + Math.floor(frame_offset)
    );
  }
}

// VIM: set ft=typescript :
// END