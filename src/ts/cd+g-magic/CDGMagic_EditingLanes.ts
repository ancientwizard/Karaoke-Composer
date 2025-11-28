/**
 * CD+Graphics Magic - Editing Lanes
 *
 * Timeline display with multiple media clip lanes.
 */

import { CDGMagic_EditingLanes_PlaybackHead } from "@/ts/cd+g-magic/CDGMagic_EditingLanes_PlaybackHead";
import { CDGMagic_MovableClipBox            } from "@/ts/cd+g-magic/CDGMagic_MovableClipBox";
import type { CDGMagic_MediaClip            } from "@/ts/cd+g-magic/CDGMagic_MediaClip";

/**
 * EditingLanes: Multi-lane timeline display
 *
 * Manages multiple tracks/lanes of clips with playback head.
 *
 * Responsibilities:
 * - Manage multiple lanes (tracks)
 * - Create and track clip boxes
 * - Manage playback head position
 * - Handle timeline zooming/panning
 * - Coordinate lane positioning
 *
 * Use Cases:
 * 1. Display CD+G project timeline
 * 2. Show multiple tracks
 * 3. Provide clip positioning and selection
 * 4. Coordinate with audio playback
 *
 * Architecture:
 * - Internal lanes array stores clip lists
 * - PlaybackHead tracks playback position
 * - MovableClipBoxes represent visual clips
 * - Timeline dimensions are shared across lanes
 */
export class CDGMagic_EditingLanes {
  // Lanes: each lane contains clips
  private internal_lanes: Array<CDGMagic_MovableClipBox[]>;

  // Playback head
  private internal_playback_head: CDGMagic_EditingLanes_PlaybackHead;

  // Timeline parameters
  private internal_timeline_start_frame: number;
  private internal_timeline_duration_frames: number;
  private internal_pixel_width: number;

  // Lane layout
  private internal_lane_height: number;
  private internal_lane_count: number;

  // Zoom and pan
  private internal_zoom_level: number; // 1.0 = 100%

  /**
   * Constructor: Create timeline lanes
   *
   * @param num_lanes Number of tracks (default 4)
   * @param timeline_width Width of timeline (pixels, default 800)
   * @param lane_height Height per lane (pixels, default 60)
   */
  constructor(
    num_lanes: number = 4,
    timeline_width: number = 800,
    lane_height: number = 60
  ) {
    this.internal_lane_count = Math.max(1, num_lanes);
    this.internal_pixel_width = Math.max(1, timeline_width);
    this.internal_lane_height = Math.max(20, lane_height);

    // Initialize lanes
    this.internal_lanes = [];
    for (let i = 0; i < this.internal_lane_count; i++) {
      this.internal_lanes.push([]);
    }

    // Timeline parameters
    this.internal_timeline_start_frame = 0;
    this.internal_timeline_duration_frames = 30000; // ~100 seconds

    // Playback head
    this.internal_playback_head = new CDGMagic_EditingLanes_PlaybackHead(
      this.internal_pixel_width,
      this.internal_timeline_start_frame,
      this.internal_timeline_duration_frames
    );

    this.internal_zoom_level = 1.0;
  }

  /**
   * Get number of lanes
   *
   * @returns Lane count
   */
  lane_count(): number {
    return this.internal_lane_count;
  }

  /**
   * Get number of clips on lane
   *
   * @param lane_index Lane number (0-based)
   * @returns Clip count, or 0 if lane doesn't exist
   */
  clip_count(lane_index: number): number {
    if (lane_index >= 0 && lane_index < this.internal_lanes.length) {
      return this.internal_lanes[lane_index].length;
    }
    return 0;
  }

  /**
   * Add clip to lane
   *
   * @param lane_index Lane number (0-based)
   * @param clip MediaClip to add
   * @returns Clip box index, or -1 if lane doesn't exist
   */
  add_clip(lane_index: number, clip: CDGMagic_MediaClip): number {
    if (lane_index < 0 || lane_index >= this.internal_lanes.length) {
      return -1;
    }

    const clip_index = this.internal_lanes[lane_index].length;
    const clip_box = new CDGMagic_MovableClipBox(
      clip,
      clip_index,
      this.internal_pixel_width,
      this.internal_timeline_start_frame,
      this.internal_timeline_duration_frames
    );

    this.internal_lanes[lane_index].push(clip_box);
    return clip_index;
  }

  /**
   * Remove clip from lane
   *
   * @param lane_index Lane number
   * @param clip_index Clip index
   * @returns True if removed
   */
  remove_clip(lane_index: number, clip_index: number): boolean {
    if (
      lane_index < 0 ||
      lane_index >= this.internal_lanes.length ||
      clip_index < 0 ||
      clip_index >= this.internal_lanes[lane_index].length
    ) {
      return false;
    }

    this.internal_lanes[lane_index].splice(clip_index, 1);
    return true;
  }

  /**
   * Get clip box at position
   *
   * @param lane_index Lane number
   * @param clip_index Clip index
   * @returns MovableClipBox or undefined
   */
  clip_at(lane_index: number, clip_index: number): CDGMagic_MovableClipBox | undefined {
    if (
      lane_index >= 0 &&
      lane_index < this.internal_lanes.length &&
      clip_index >= 0 &&
      clip_index < this.internal_lanes[lane_index].length
    ) {
      return this.internal_lanes[lane_index][clip_index];
    }
    return undefined;
  }

  /**
   * Get all clips on lane
   *
   * @param lane_index Lane number
   * @returns Array of clip boxes (or empty array if invalid lane)
   */
  clips_on_lane(lane_index: number): CDGMagic_MovableClipBox[] {
    if (lane_index >= 0 && lane_index < this.internal_lanes.length) {
      return [...this.internal_lanes[lane_index]];
    }
    return [];
  }

  /**
   * Clear all clips from lane
   *
   * @param lane_index Lane number
   */
  clear_lane(lane_index: number): void {
    if (lane_index >= 0 && lane_index < this.internal_lanes.length) {
      this.internal_lanes[lane_index] = [];
    }
  }

  /**
   * Clear all clips from all lanes
   */
  clear_all_lanes(): void {
    for (let i = 0; i < this.internal_lanes.length; i++) {
      this.internal_lanes[i] = [];
    }
  }

  /**
   * Get playback head
   *
   * @returns PlaybackHead
   */
  playback_head(): CDGMagic_EditingLanes_PlaybackHead {
    return this.internal_playback_head;
  }

  /**
   * Set timeline dimensions
   *
   * @param pixel_width Width in pixels
   * @param start_frame Timeline start
   * @param duration_frames Timeline duration
   */
  set_timeline_dimensions(
    pixel_width: number,
    start_frame: number,
    duration_frames: number
  ): void {
    this.internal_pixel_width = Math.max(1, pixel_width);
    this.internal_timeline_start_frame = start_frame;
    this.internal_timeline_duration_frames = Math.max(1, duration_frames);

    // Update playback head
    this.internal_playback_head.set_timeline_dimensions(
      pixel_width,
      start_frame,
      duration_frames
    );

    // Update all clip boxes
    for (const lane of this.internal_lanes) {
      for (const clip_box of lane) {
        clip_box.update_timeline_dimensions(
          pixel_width,
          start_frame,
          duration_frames
        );
      }
    }
  }

  /**
   * Get lane height
   *
   * @returns Height in pixels
   */
  lane_height(): number;
  /**
   * Set lane height
   *
   * @param height Height in pixels
   */
  lane_height(height: number): void;
  lane_height(height?: number): number | void {
    if (height === undefined) {
      return this.internal_lane_height;
    } else {
      this.internal_lane_height = Math.max(20, height);
    }
  }

  /**
   * Get Y position of lane
   *
   * @param lane_index Lane number
   * @returns Y coordinate from top
   */
  lane_y_position(lane_index: number): number {
    return lane_index * this.internal_lane_height;
  }

  /**
   * Get total height of all lanes
   *
   * @returns Total height in pixels
   */
  total_height(): number {
    return this.internal_lane_count * this.internal_lane_height;
  }

  /**
   * Find clip at pixel position
   *
   * @param pixel_x X position
   * @param pixel_y Y position
   * @returns Object with lane_index and clip_box, or null if not found
   */
  clip_at_position(
    pixel_x: number,
    pixel_y: number
  ):
    | {
        lane_index: number;
        clip_box: CDGMagic_MovableClipBox;
      }
    | null {
    // Determine lane from Y position
    const lane_index = Math.floor(pixel_y / this.internal_lane_height);

    if (lane_index < 0 || lane_index >= this.internal_lanes.length) {
      return null;
    }

    // Find clip in lane
    for (const clip_box of this.internal_lanes[lane_index]) {
      if (clip_box.contains_point(pixel_x, pixel_y)) {
        return {
          lane_index,
          clip_box,
        };
      }
    }

    return null;
  }

  /**
   * Set zoom level
   *
   * @param zoom_factor Zoom factor (1.0 = 100%, 2.0 = 200%, etc.)
   */
  set_zoom(zoom_factor: number): void {
    this.internal_zoom_level = Math.max(0.1, zoom_factor);
  }

  /**
   * Get zoom level
   *
   * @returns Current zoom factor
   */
  zoom_level(): number {
    return this.internal_zoom_level;
  }

  /**
   * Reset all UI state
   */
  reset(): void {
    for (const lane of this.internal_lanes) {
      for (const clip_box of lane) {
        clip_box.reset_ui_state();
      }
    }
    this.internal_playback_head.reset();
  }
}

// VIM: set ft=typescript :
// END