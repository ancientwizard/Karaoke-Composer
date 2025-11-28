/**
 * CDGMagic_MainWindow.ts
 * Main application window containing editing UI, timeline, and controls
 */

import { CDGMagic_EditingGroup  } from "@/ts/cd+g-magic/CDGMagic_EditingGroup";
import { CDGMagic_TimeOutput    } from "@/ts/cd+g-magic/CDGMagic_TimeOutput";

/**
 * MainWindow: Primary application UI container
 *
 * Contains:
 * - Menu bar with File, Edit, Tools, Window, Help menus
 * - Editing lanes showing timeline and clips
 * - Playback controls (play, pause, stop, seek)
 * - Current time display in MM:SS:FF format
 * - Status bar with project info
 *
 * Responsibilities:
 * - Manage main window lifecycle
 * - Handle menu commands
 * - Display editing interface
 * - Manage audio/video synchronization
 * - Display status information
 *
 * Use Cases:
 * 1. Create new projects
 * 2. Open existing projects
 * 3. Add/remove clips
 * 4. Play/preview projects
 * 5. Export to CDG format
 */
export
class CDGMagic_MainWindow {
  // Window state
  private internal_is_open: boolean;
  private internal_width: number;
  private internal_height: number;
  private internal_title: string;

  // Editing state
  private internal_editing_group: CDGMagic_EditingGroup | null;
  private internal_current_track: number;

  // Playback state
  private internal_is_playing: boolean;
  private internal_playback_position: number;
  private internal_playback_speed: number;

  // Menu state
  private internal_can_undo: boolean;
  private internal_can_redo: boolean;
  private internal_has_unsaved_changes: boolean;

  // Status state
  private internal_status_message: string;
  private internal_project_file_path: string;
  private internal_project_duration: number;

  /**
   * Create main application window
   */
  constructor() {
    this.internal_is_open = false;
    this.internal_width = 1024;
    this.internal_height = 768;
    this.internal_title = "CD+Graphics Magic";

    this.internal_editing_group = null;
    this.internal_current_track = 0;

    this.internal_is_playing = false;
    this.internal_playback_position = 0;
    this.internal_playback_speed = 1.0;

    this.internal_can_undo = false;
    this.internal_can_redo = false;
    this.internal_has_unsaved_changes = false;

    this.internal_status_message = "Ready";
    this.internal_project_file_path = "";
    this.internal_project_duration = 0;
  }

  /**
   * Open the main window
   *
   * @returns True if opened successfully
   */
  open(): boolean {
    try {
      this.internal_is_open = true;
      this.internal_status_message = "Window opened";
      return true;
    } catch (error) {
      console.error("Failed to open main window:", error);
      this.internal_is_open = false;
      return false;
    }
  }

  /**
   * Close the main window
   *
   * @returns True if closed successfully
   */
  close(): boolean {
    try {
      this.internal_is_open = false;
      this.internal_status_message = "Window closed";
      return true;
    } catch (error) {
      console.error("Failed to close main window:", error);
      return false;
    }
  }

  /**
   * Check if window is open
   *
   * @returns True if window displayed
   */
  is_open(): boolean {
    return this.internal_is_open;
  }

  /**
   * Get window width
   *
   * @returns Width in pixels
   */
  get_width(): number {
    return this.internal_width;
  }

  /**
   * Set window width
   *
   * @param width Width in pixels
   */
  set_width(width: number): void {
    if (width >= 640 && width <= 2560) {
      this.internal_width = width;
    }
  }

  /**
   * Get window height
   *
   * @returns Height in pixels
   */
  get_height(): number {
    return this.internal_height;
  }

  /**
   * Set window height
   *
   * @param height Height in pixels
   */
  set_height(height: number): void {
    if (height >= 480 && height <= 1440) {
      this.internal_height = height;
    }
  }

  /**
   * Get window title
   *
   * @returns Title string
   */
  get_title(): string {
    return this.internal_title;
  }

  /**
   * Set window title
   *
   * @param title New title
   */
  set_title(title: string): void {
    if (title.length > 0) {
      this.internal_title = title;
    }
  }

  /**
   * Set editing group for timeline display
   *
   * @param group EditingGroup to display
   */
  set_editing_group(group: CDGMagic_EditingGroup): void {
    this.internal_editing_group = group;
  }

  /**
   * Get current editing group
   *
   * @returns EditingGroup or null
   */
  get_editing_group(): CDGMagic_EditingGroup | null {
    return this.internal_editing_group;
  }

  /**
   * Get current active track
   *
   * @returns Track index
   */
  get_current_track(): number {
    return this.internal_current_track;
  }

  /**
   * Set current active track
   *
   * @param track Track index
   */
  set_current_track(track: number): void {
    if (track >= 0 && track < 16) {
      this.internal_current_track = track;
    }
  }

  /**
   * Start playback
   *
   * @returns True if playback started
   */
  start_playback(): boolean {
    if (this.internal_editing_group) {
      this.internal_is_playing = true;
      this.internal_playback_position = 0;
      return true;
    }
    return false;
  }

  /**
   * Stop playback
   *
   * @returns True if playback stopped
   */
  stop_playback(): boolean {
    this.internal_is_playing = false;
    this.internal_playback_position = 0;
    return true;
  }

  /**
   * Pause playback
   *
   * @returns True if playback paused
   */
  pause_playback(): boolean {
    this.internal_is_playing = false;
    return true;
  }

  /**
   * Check if currently playing
   *
   * @returns True if playback active
   */
  is_playing(): boolean {
    return this.internal_is_playing;
  }

  /**
   * Get playback position in packets
   *
   * @returns Current packet position
   */
  get_playback_position(): number {
    return this.internal_playback_position;
  }

  /**
   * Set playback position
   *
   * @param position Packet position
   */
  set_playback_position(position: number): void {
    if (position >= 0 && position <= this.internal_project_duration) {
      this.internal_playback_position = position;
    }
  }

  /**
   * Get playback speed multiplier
   *
   * @returns Speed factor (1.0 = normal)
   */
  get_playback_speed(): number {
    return this.internal_playback_speed;
  }

  /**
   * Set playback speed
   *
   * @param speed Speed multiplier (0.25-2.0)
   */
  set_playback_speed(speed: number): void {
    if (speed >= 0.25 && speed <= 2.0) {
      this.internal_playback_speed = speed;
    }
  }

  /**
   * Check if undo is available
   *
   * @returns True if can undo
   */
  can_undo(): boolean {
    return this.internal_can_undo;
  }

  /**
   * Set undo availability
   *
   * @param available Can undo
   */
  set_can_undo(available: boolean): void {
    this.internal_can_undo = available;
  }

  /**
   * Check if redo is available
   *
   * @returns True if can redo
   */
  can_redo(): boolean {
    return this.internal_can_redo;
  }

  /**
   * Set redo availability
   *
   * @param available Can redo
   */
  set_can_redo(available: boolean): void {
    this.internal_can_redo = available;
  }

  /**
   * Check if project has unsaved changes
   *
   * @returns True if unsaved changes exist
   */
  has_unsaved_changes(): boolean {
    return this.internal_has_unsaved_changes;
  }

  /**
   * Set unsaved changes flag
   *
   * @param unsaved Has unsaved changes
   */
  set_unsaved_changes(unsaved: boolean): void {
    this.internal_has_unsaved_changes = unsaved;
    this.update_title_from_path();
  }

  /**
   * Get status message
   *
   * @returns Current status text
   */
  get_status_message(): string {
    return this.internal_status_message;
  }

  /**
   * Set status message
   *
   * @param message New status text
   */
  set_status_message(message: string): void {
    if (message.length > 0) {
      this.internal_status_message = message;
    }
  }

  /**
   * Get project file path
   *
   * @returns File path or empty string
   */
  get_project_file_path(): string {
    return this.internal_project_file_path;
  }

  /**
   * Set project file path
   *
   * @param path File path
   */
  set_project_file_path(path: string): void {
    this.internal_project_file_path = path;
    this.update_title_from_path();
  }

  /**
   * Get project duration in packets
   *
   * @returns Duration (300 pps)
   */
  get_project_duration(): number {
    return this.internal_project_duration;
  }

  /**
   * Set project duration
   *
   * @param duration Duration in packets
   */
  set_project_duration(duration: number): void {
    if (duration >= 0) {
      this.internal_project_duration = duration;
    }
  }

  /**
   * Handle new project
   *
   * @returns True if successful
   */
  new_project(): boolean {
    try {
      this.internal_project_file_path = "";
      this.internal_project_duration = 0;
      this.internal_playback_position = 0;
      this.internal_has_unsaved_changes = false;
      this.update_title_from_path();
      this.internal_status_message = "New project created";
      return true;
    } catch (error) {
      console.error("Failed to create new project:", error);
      return false;
    }
  }

  /**
   * Handle open project
   *
   * @param path File path to open
   * @returns True if successful
   */
  open_project(path: string): boolean {
    try {
      this.set_project_file_path(path);
      this.internal_has_unsaved_changes = false;
      this.internal_status_message = `Opened: ${path}`;
      return true;
    } catch (error) {
      console.error("Failed to open project:", error);
      return false;
    }
  }

  /**
   * Handle save project
   *
   * @returns True if successful
   */
  save_project(): boolean {
    try {
      if (this.internal_project_file_path.length === 0) {
        this.internal_status_message = "Save path not set";
        return false;
      }
      this.internal_has_unsaved_changes = false;
      this.internal_status_message = `Saved: ${this.internal_project_file_path}`;
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  }

  /**
   * Handle export to CDG
   *
   * @param output_path Output file path
   * @returns True if successful
   */
  export_cdg(output_path: string): boolean {
    try {
      if (!this.internal_editing_group) {
        this.internal_status_message = "No project loaded";
        return false;
      }
      if (output_path.length === 0) {
        this.internal_status_message = "Output path not set";
        return false;
      }
      this.internal_status_message = `Exported to: ${output_path}`;
      return true;
    } catch (error) {
      console.error("Failed to export CDG:", error);
      return false;
    }
  }

  /**
   * Update window title based on file path
   *
   * @private
   */
  private update_title_from_path(): void {
    if (this.internal_project_file_path.length === 0) {
      this.internal_title = "CD+Graphics Magic - [Untitled]";
    } else {
      const file_name = this.internal_project_file_path.split("/").pop() || "Untitled";
      const modified = this.internal_has_unsaved_changes ? " *" : "";
      this.internal_title = `CD+Graphics Magic - ${file_name}${modified}`;
    }
  }

  /**
   * Validate window state
   *
   * @returns True if valid
   */
  validate(): boolean {
    return (
      this.internal_width >= 640 &&
      this.internal_width <= 2560 &&
      this.internal_height >= 480 &&
      this.internal_height <= 1440 &&
      this.internal_title.length > 0 &&
      this.internal_current_track >= 0 &&
      this.internal_current_track < 16 &&
      this.internal_playback_speed >= 0.25 &&
      this.internal_playback_speed <= 2.0 &&
      this.internal_project_duration >= 0
    );
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END