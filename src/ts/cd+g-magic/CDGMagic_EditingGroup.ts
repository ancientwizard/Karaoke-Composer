/**
 * CD+Graphics Magic - Editing Group
 *
 * Multi-lane editing controls and coordination.
 */

import { CDGMagic_EditingLanes } from "@/ts/cd+g-magic/CDGMagic_EditingLanes";
import { CDGMagic_TrackOptions } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";

/**
 * EditingGroup: Multi-lane editing controller
 *
 * Coordinates editing operations across multiple tracks/lanes.
 *
 * Responsibilities:
 * - Manage group-wide settings
 * - Track options for each lane
 * - Handle multi-selection
 * - Coordinate lane operations
 * - Manage mask windows and properties
 *
 * Use Cases:
 * 1. Apply settings to multiple lanes at once
 * 2. Manage lane-specific track options
 * 3. Coordinate clip editing across lanes
 * 4. Handle mask and channel settings
 *
 * Architecture:
 * - EditingLanes component for display
 * - TrackOptions per lane for configuration
 * - Selection tracking for multi-edit
 * - Callback system for external coordination
 */
export class CDGMagic_EditingGroup {
  // Editing lanes
  private internal_editing_lanes: CDGMagic_EditingLanes;

  // Track options per lane
  private internal_track_options: CDGMagic_TrackOptions[];

  // Selection state
  private internal_selected_lanes: Set<number>;

  // Zoom and scrolling
  private internal_scroll_x: number;
  private internal_scroll_y: number;

  // Callbacks for external coordination
  private internal_on_selection_changed:
    | ((lane_indices: number[]) => void)
    | null;
  private internal_on_clip_moved:
    | ((lane_index: number, from_frame: number, to_frame: number) => void)
    | null;

  /**
   * Constructor: Create editing group
   *
   * @param num_lanes Number of tracks (default 4)
   * @param timeline_width Width of timeline (pixels)
   */
  constructor(num_lanes: number = 4, timeline_width: number = 800) {
    this.internal_editing_lanes = new CDGMagic_EditingLanes(
      num_lanes,
      timeline_width
    );

    // Initialize track options for each lane
    this.internal_track_options = [];
    for (let i = 0; i < num_lanes; i++) {
      this.internal_track_options.push(new CDGMagic_TrackOptions());
    }

    this.internal_selected_lanes = new Set();
    this.internal_scroll_x = 0;
    this.internal_scroll_y = 0;

    this.internal_on_selection_changed = null;
    this.internal_on_clip_moved = null;
  }

  /**
   * Get editing lanes
   *
   * @returns EditingLanes component
   */
  editing_lanes(): CDGMagic_EditingLanes {
    return this.internal_editing_lanes;
  }

  /**
   * Get track options for lane
   *
   * @param lane_index Lane number
   * @returns TrackOptions or null if invalid lane
   */
  track_options(lane_index: number): CDGMagic_TrackOptions | null {
    if (lane_index >= 0 && lane_index < this.internal_track_options.length) {
      return this.internal_track_options[lane_index];
    }
    return null;
  }

  /**
   * Set track options for lane
   *
   * @param lane_index Lane number
   * @param options TrackOptions to apply
   */
  set_track_options(lane_index: number, options: CDGMagic_TrackOptions): void {
    if (lane_index >= 0 && lane_index < this.internal_track_options.length) {
      this.internal_track_options[lane_index] = options.clone();
    }
  }

  /**
   * Select lane
   *
   * @param lane_index Lane number
   * @param exclusive If true, deselect others (default true)
   */
  select_lane(lane_index: number, exclusive: boolean = true): void {
    if (exclusive) {
      this.internal_selected_lanes.clear();
    }

    if (
      lane_index >= 0 &&
      lane_index < this.internal_editing_lanes.lane_count()
    ) {
      this.internal_selected_lanes.add(lane_index);
      this.notify_selection_changed();
    }
  }

  /**
   * Deselect lane
   *
   * @param lane_index Lane number
   */
  deselect_lane(lane_index: number): void {
    this.internal_selected_lanes.delete(lane_index);
    this.notify_selection_changed();
  }

  /**
   * Toggle lane selection
   *
   * @param lane_index Lane number
   */
  toggle_lane_selection(lane_index: number): void {
    if (this.internal_selected_lanes.has(lane_index)) {
      this.deselect_lane(lane_index);
    } else {
      this.select_lane(lane_index, false);
    }
  }

  /**
   * Check if lane is selected
   *
   * @param lane_index Lane number
   * @returns True if selected
   */
  is_lane_selected(lane_index: number): boolean {
    return this.internal_selected_lanes.has(lane_index);
  }

  /**
   * Get selected lanes
   *
   * @returns Array of selected lane indices
   */
  selected_lanes(): number[] {
    return Array.from(this.internal_selected_lanes).sort((a, b) => a - b);
  }

  /**
   * Clear selection
   */
  clear_selection(): void {
    if (this.internal_selected_lanes.size > 0) {
      this.internal_selected_lanes.clear();
      this.notify_selection_changed();
    }
  }

  /**
   * Get scroll position X
   *
   * @returns Horizontal scroll offset (pixels)
   */
  scroll_x(): number;
  /**
   * Set scroll position X
   *
   * @param x Horizontal scroll offset
   */
  scroll_x(x: number): void;
  scroll_x(x?: number): number | void {
    if (x === undefined) {
      return this.internal_scroll_x;
    } else {
      this.internal_scroll_x = Math.max(0, x);
    }
  }

  /**
   * Get scroll position Y
   *
   * @returns Vertical scroll offset (pixels)
   */
  scroll_y(): number;
  /**
   * Set scroll position Y
   *
   * @param y Vertical scroll offset
   */
  scroll_y(y: number): void;
  scroll_y(y?: number): number | void {
    if (y === undefined) {
      return this.internal_scroll_y;
    } else {
      this.internal_scroll_y = Math.max(0, y);
    }
  }

  /**
   * Scroll by delta
   *
   * @param dx Horizontal delta
   * @param dy Vertical delta
   */
  scroll_by(dx: number, dy: number): void {
    this.internal_scroll_x = Math.max(0, this.internal_scroll_x + dx);
    this.internal_scroll_y = Math.max(0, this.internal_scroll_y + dy);
  }

  /**
   * Register callback for selection changes
   *
   * @param callback Function to call when selection changes
   */
  on_selection_changed(
    callback: (lane_indices: number[]) => void
  ): void {
    this.internal_on_selection_changed = callback;
  }

  /**
   * Register callback for clip moved
   *
   * @param callback Function to call when clip is moved
   */
  on_clip_moved(
    callback: (lane_index: number, from_frame: number, to_frame: number) => void
  ): void {
    this.internal_on_clip_moved = callback;
  }

  /**
   * Notify external listeners of clip movement
   *
   * @param lane_index Lane number
   * @param from_frame Original position
   * @param to_frame New position
   */
  notify_clip_moved(lane_index: number, from_frame: number, to_frame: number): void {
    if (this.internal_on_clip_moved) {
      this.internal_on_clip_moved(lane_index, from_frame, to_frame);
    }
  }

  /**
   * Apply operation to selected lanes
   *
   * @param operation Function to apply to each selected lane
   */
  apply_to_selected_lanes(
    operation: (lane_index: number) => void
  ): void {
    for (const lane_index of this.selected_lanes()) {
      operation(lane_index);
    }
  }

  /**
   * Reset all UI state
   */
  reset(): void {
    this.internal_editing_lanes.reset();
    this.clear_selection();
    this.internal_scroll_x = 0;
    this.internal_scroll_y = 0;
  }

  /**
   * Notify external listeners of selection change
   */
  private notify_selection_changed(): void {
    if (this.internal_on_selection_changed) {
      this.internal_on_selection_changed(this.selected_lanes());
    }
  }
}

// VIM: set ft=typescript :
// END
