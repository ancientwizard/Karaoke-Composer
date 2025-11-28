/**
 * CDGMagic_PreviewWindow.ts
 * Real-time preview window displaying CDG graphics
 */

import { CDGMagic_GraphicsDecoder } from "@/ts/cd+g-magic/CDGMagic_GraphicsDecoder";

/**
 * PreviewWindow: Real-time CDG graphics display
 *
 * Contains:
 * - Graphics canvas showing current frame
 * - Frame navigation controls (previous, next, goto)
 * - Playback synchronization with MainWindow
 * - Real-time graphics decoding
 * - Display mode options (preview, actual size, fit)
 *
 * Responsibilities:
 * - Manage preview window lifecycle
 * - Decode and display graphics
 * - Handle user navigation
 * - Synchronize with playback
 * - Manage display options
 *
 * Use Cases:
 * 1. Preview edited content in real-time
 * 2. Navigate to specific frames
 * 3. Verify graphics before export
 * 4. Debug rendering issues
 */
export
class CDGMagic_PreviewWindow {
  // Window state
  private internal_is_open: boolean;
  private internal_width: number;
  private internal_height: number;
  private internal_title: string;
  private internal_is_modeless: boolean;

  // Display state
  private internal_graphics_decoder: CDGMagic_GraphicsDecoder | null;
  private internal_current_frame: number;
  private internal_total_frames: number;

  // Display mode
  private internal_display_mode: "preview" | "actual" | "fit";
  private internal_zoom_level: number;
  private internal_auto_update: boolean;

  // Preview state
  private internal_background_color: number;
  private internal_show_grid: boolean;
  private internal_grid_opacity: number;

  /**
   * Create preview window
   */
  constructor() {
    this.internal_is_open = false;
    this.internal_width = 320;
    this.internal_height = 240;
    this.internal_title = "CD+Graphics Preview";
    this.internal_is_modeless = false;

    this.internal_graphics_decoder = null;
    this.internal_current_frame = 0;
    this.internal_total_frames = 0;

    this.internal_display_mode = "preview";
    this.internal_zoom_level = 1.0;
    this.internal_auto_update = true;

    this.internal_background_color = 0;
    this.internal_show_grid = false;
    this.internal_grid_opacity = 0.5;
  }

  /**
   * Open the preview window
   *
   * @param modeless If true, window stays on top
   * @returns True if opened successfully
   */
  open(modeless: boolean = false): boolean {
    try {
      this.internal_is_open = true;
      this.internal_is_modeless = modeless;
      return true;
    } catch (error) {
      console.error("Failed to open preview window:", error);
      this.internal_is_open = false;
      return false;
    }
  }

  /**
   * Close the preview window
   *
   * @returns True if closed successfully
   */
  close(): boolean {
    try {
      this.internal_is_open = false;
      return true;
    } catch (error) {
      console.error("Failed to close preview window:", error);
      return false;
    }
  }

  /**
   * Check if window is open
   *
   * @returns True if displayed
   */
  is_open(): boolean {
    return this.internal_is_open;
  }

  /**
   * Check if window is modeless
   *
   * @returns True if modeless (stays on top)
   */
  is_modeless(): boolean {
    return this.internal_is_modeless;
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
    if (width >= 320 && width <= 1280) {
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
    if (height >= 240 && height <= 960) {
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
   * Set graphics decoder
   *
   * @param decoder GraphicsDecoder instance
   */
  set_graphics_decoder(decoder: CDGMagic_GraphicsDecoder): void {
    this.internal_graphics_decoder = decoder;
  }

  /**
   * Get graphics decoder
   *
   * @returns GraphicsDecoder or null
   */
  get_graphics_decoder(): CDGMagic_GraphicsDecoder | null {
    return this.internal_graphics_decoder;
  }

  /**
   * Get current frame number
   *
   * @returns Frame index
   */
  get_current_frame(): number {
    return this.internal_current_frame;
  }

  /**
   * Set current frame
   *
   * @param frame Frame index
   */
  set_current_frame(frame: number): void {
    if (frame >= 0 && frame <= this.internal_total_frames) {
      this.internal_current_frame = frame;
    }
  }

  /**
   * Get total frames
   *
   * @returns Total frame count
   */
  get_total_frames(): number {
    return this.internal_total_frames;
  }

  /**
   * Set total frames
   *
   * @param total Total frame count
   */
  set_total_frames(total: number): void {
    if (total >= 0) {
      this.internal_total_frames = total;
    }
  }

  /**
   * Get display mode
   *
   * @returns Mode: "preview", "actual", or "fit"
   */
  get_display_mode(): "preview" | "actual" | "fit" {
    return this.internal_display_mode;
  }

  /**
   * Set display mode
   *
   * @param mode Display mode
   */
  set_display_mode(mode: "preview" | "actual" | "fit"): void {
    const valid_modes = ["preview", "actual", "fit"];
    if (valid_modes.includes(mode)) {
      this.internal_display_mode = mode;
    }
  }

  /**
   * Get zoom level
   *
   * @returns Zoom factor
   */
  get_zoom_level(): number {
    return this.internal_zoom_level;
  }

  /**
   * Set zoom level
   *
   * @param zoom Zoom factor (0.5-4.0)
   */
  set_zoom_level(zoom: number): void {
    if (zoom >= 0.5 && zoom <= 4.0) {
      this.internal_zoom_level = zoom;
    }
  }

  /**
   * Check if auto-update is enabled
   *
   * @returns True if auto-update active
   */
  is_auto_update_enabled(): boolean {
    return this.internal_auto_update;
  }

  /**
   * Set auto-update enabled
   *
   * @param enabled Enable auto-update
   */
  set_auto_update_enabled(enabled: boolean): void {
    this.internal_auto_update = enabled;
  }

  /**
   * Get background color
   *
   * @returns Color index
   */
  get_background_color(): number {
    return this.internal_background_color;
  }

  /**
   * Set background color
   *
   * @param color Color index
   */
  set_background_color(color: number): void {
    if (color >= 0 && color <= 15) {
      this.internal_background_color = color;
    }
  }

  /**
   * Check if grid is shown
   *
   * @returns True if grid visible
   */
  is_grid_shown(): boolean {
    return this.internal_show_grid;
  }

  /**
   * Set grid visibility
   *
   * @param show Show grid
   */
  set_grid_visible(show: boolean): void {
    this.internal_show_grid = show;
  }

  /**
   * Get grid opacity
   *
   * @returns Opacity value (0.0-1.0)
   */
  get_grid_opacity(): number {
    return this.internal_grid_opacity;
  }

  /**
   * Set grid opacity
   *
   * @param opacity Opacity value (0.0-1.0)
   */
  set_grid_opacity(opacity: number): void {
    if (opacity >= 0.0 && opacity <= 1.0) {
      this.internal_grid_opacity = opacity;
    }
  }

  /**
   * Navigate to next frame
   *
   * @returns True if frame exists
   */
  next_frame(): boolean {
    if (this.internal_current_frame < this.internal_total_frames) {
      this.internal_current_frame++;
      return true;
    }
    return false;
  }

  /**
   * Navigate to previous frame
   *
   * @returns True if frame exists
   */
  previous_frame(): boolean {
    if (this.internal_current_frame > 0) {
      this.internal_current_frame--;
      return true;
    }
    return false;
  }

  /**
   * Jump to first frame
   *
   * @returns True if successful
   */
  first_frame(): boolean {
    if (this.internal_total_frames > 0) {
      this.internal_current_frame = 0;
      return true;
    }
    return false;
  }

  /**
   * Jump to last frame
   *
   * @returns True if successful
   */
  last_frame(): boolean {
    if (this.internal_total_frames > 0) {
      this.internal_current_frame = this.internal_total_frames;
      return true;
    }
    return false;
  }

  /**
   * Render current frame
   *
   * @returns True if rendered successfully
   */
  render_frame(): boolean {
    try {
      if (!this.internal_graphics_decoder) {
        return false;
      }
      // Graphics rendering would happen here
      return true;
    } catch (error) {
      console.error("Failed to render frame:", error);
      return false;
    }
  }

  /**
   * Update frame from playback position
   *
   * @param position Playback position in packets
   */
  update_from_playback(position: number): void {
    if (this.internal_auto_update) {
      this.set_current_frame(position);
    }
  }

  /**
   * Zoom in one level
   *
   * @returns True if zoomed
   */
  zoom_in(): boolean {
    const new_zoom = Math.min(this.internal_zoom_level * 1.2, 4.0);
    if (new_zoom !== this.internal_zoom_level) {
      this.internal_zoom_level = new_zoom;
      return true;
    }
    return false;
  }

  /**
   * Zoom out one level
   *
   * @returns True if zoomed
   */
  zoom_out(): boolean {
    const new_zoom = Math.max(this.internal_zoom_level / 1.2, 0.5);
    if (new_zoom !== this.internal_zoom_level) {
      this.internal_zoom_level = new_zoom;
      return true;
    }
    return false;
  }

  /**
   * Reset zoom to 1:1
   *
   * @returns True if reset
   */
  zoom_reset(): boolean {
    if (this.internal_zoom_level !== 1.0) {
      this.internal_zoom_level = 1.0;
      return true;
    }
    return false;
  }

  /**
   * Validate preview state
   *
   * @returns True if valid
   */
  validate(): boolean {
    return (
      this.internal_width >= 320 &&
      this.internal_width <= 1280 &&
      this.internal_height >= 240 &&
      this.internal_height <= 960 &&
      this.internal_title.length > 0 &&
      this.internal_current_frame >= 0 &&
      this.internal_current_frame <= this.internal_total_frames &&
      this.internal_total_frames >= 0 &&
      (
        this.internal_display_mode === "preview" ||
        this.internal_display_mode === "actual" ||
        this.internal_display_mode === "fit"
      ) &&
      this.internal_zoom_level >= 0.5 &&
      this.internal_zoom_level <= 4.0 &&
      this.internal_background_color >= 0 &&
      this.internal_background_color <= 15 &&
      this.internal_grid_opacity >= 0.0 &&
      this.internal_grid_opacity <= 1.0
    );
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END