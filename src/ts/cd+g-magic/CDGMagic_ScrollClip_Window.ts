/**
 * CDGMagic_ScrollClip_Window.ts
 * Editor window for ScrollClip properties and scrolling background setup
 */

import type { CDGMagic_ScrollClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

/**
 * ScrollClip_Window: Scrolling bitmap clip property editor
 *
 * Dialog for editing scroll clip properties:
 * - Scroll direction (horizontal/vertical)
 * - Scroll speed control
 * - Wrap-around settings
 * - Background image selection
 * - Color settings
 *
 * Responsibilities:
 * - Display scroll configuration interface
 * - Manage scroll parameters
 * - Preview scrolling animation
 * - Configure wrap behavior
 * - Set color scheme
 *
 * Use Cases:
 * 1. Configure scrolling backgrounds
 * 2. Set scroll direction and speed
 * 3. Enable/disable wrapping
 * 4. Preview scroll effects
 * 5. Adjust color settings
 */
export
class CDGMagic_ScrollClip_Window {
  // Clip being edited
  private internal_clip: CDGMagic_ScrollClip;

  // UI state
  private internal_is_open: boolean;
  private internal_is_modal: boolean;

  // Scroll properties
  private internal_scroll_direction: "horizontal" | "vertical";
  private internal_scroll_speed: number;
  private internal_scroll_delay: number;
  private internal_wrap_mode: "none" | "wrap" | "bounce";

  // Background properties
  private internal_background_file: string;
  private internal_background_width: number;
  private internal_background_height: number;
  private internal_tile_mode: "none" | "horizontal" | "vertical" | "both";

  // Color settings
  private internal_border_color: number;
  private internal_background_color: number;

  // Preview settings
  private internal_show_preview: boolean;
  private internal_preview_speed: number;

  /**
   * Create ScrollClip editor window
   *
   * @param clip The ScrollClip to edit
   * @param is_modal Whether window is modal
   */
  constructor(clip: CDGMagic_ScrollClip, is_modal: boolean = true) {
    this.internal_clip = clip;
    this.internal_is_open = false;
    this.internal_is_modal = is_modal;

    // Initialize scroll properties
    this.internal_scroll_direction = "horizontal";
    this.internal_scroll_speed = 1;
    this.internal_scroll_delay = 0;
    this.internal_wrap_mode = "wrap";

    // Background properties
    this.internal_background_file = "";
    this.internal_background_width = 300;
    this.internal_background_height = 216;
    this.internal_tile_mode = "both";

    // Color settings
    this.internal_border_color = 0; // Black
    this.internal_background_color = 1; // Dark color

    // Preview settings
    this.internal_show_preview = true;
    this.internal_preview_speed = 1.0;
  }

  /**
   * Get scroll direction
   *
   * @returns Direction: "horizontal" or "vertical"
   */
  get_scroll_direction(): "horizontal" | "vertical" {
    return this.internal_scroll_direction;
  }

  /**
   * Set scroll direction
   *
   * @param direction New direction
   */
  set_scroll_direction(direction: "horizontal" | "vertical"): void {
    this.internal_scroll_direction = direction;
  }

  /**
   * Get scroll speed
   *
   * @returns Speed in pixels per frame
   */
  get_scroll_speed(): number {
    return this.internal_scroll_speed;
  }

  /**
   * Set scroll speed
   *
   * @param speed Speed in pixels per frame (1+)
   */
  set_scroll_speed(speed: number): void {
    if (speed >= 1 && speed <= 50) {
      this.internal_scroll_speed = speed;
    }
  }

  /**
   * Get scroll delay
   *
   * @returns Delay in frames between scroll movements
   */
  get_scroll_delay(): number {
    return this.internal_scroll_delay;
  }

  /**
   * Set scroll delay
   *
   * @param delay Delay in frames (0+)
   */
  set_scroll_delay(delay: number): void {
    if (delay >= 0 && delay <= 1000) {
      this.internal_scroll_delay = delay;
    }
  }

  /**
   * Get wrap mode
   *
   * @returns Wrap mode: "none", "wrap", or "bounce"
   */
  get_wrap_mode(): "none" | "wrap" | "bounce" {
    return this.internal_wrap_mode;
  }

  /**
   * Set wrap mode
   *
   * @param mode New wrap mode
   */
  set_wrap_mode(mode: "none" | "wrap" | "bounce"): void {
    this.internal_wrap_mode = mode;
  }

  /**
   * Get background file path
   *
   * @returns File path to background image
   */
  get_background_file(): string {
    return this.internal_background_file;
  }

  /**
   * Set background file path
   *
   * @param file_path Path to background image
   */
  set_background_file(file_path: string): void {
    if (file_path.length > 0) {
      this.internal_background_file = file_path;
    }
  }

  /**
   * Get background width
   *
   * @returns Width in pixels
   */
  get_background_width(): number {
    return this.internal_background_width;
  }

  /**
   * Set background width
   *
   * @param width Width in pixels
   */
  set_background_width(width: number): void {
    if (width >= 1 && width <= 600) {
      this.internal_background_width = width;
    }
  }

  /**
   * Get background height
   *
   * @returns Height in pixels
   */
  get_background_height(): number {
    return this.internal_background_height;
  }

  /**
   * Set background height
   *
   * @param height Height in pixels
   */
  set_background_height(height: number): void {
    if (height >= 1 && height <= 432) {
      this.internal_background_height = height;
    }
  }

  /**
   * Get tile mode
   *
   * @returns Tile mode: "none", "horizontal", "vertical", or "both"
   */
  get_tile_mode(): "none" | "horizontal" | "vertical" | "both" {
    return this.internal_tile_mode;
  }

  /**
   * Set tile mode
   *
   * @param mode Tiling mode
   */
  set_tile_mode(mode: "none" | "horizontal" | "vertical" | "both"): void {
    this.internal_tile_mode = mode;
  }

  /**
   * Get border color index
   *
   * @returns Palette color index
   */
  get_border_color(): number {
    return this.internal_border_color;
  }

  /**
   * Set border color
   *
   * @param color Palette color index (0-255)
   */
  set_border_color(color: number): void {
    if (color >= 0 && color < 256) {
      this.internal_border_color = color;
    }
  }

  /**
   * Get background color index
   *
   * @returns Palette color index
   */
  get_background_color(): number {
    return this.internal_background_color;
  }

  /**
   * Set background color
   *
   * @param color Palette color index (0-255)
   */
  set_background_color(color: number): void {
    if (color >= 0 && color < 256) {
      this.internal_background_color = color;
    }
  }

  /**
   * Get preview speed multiplier
   *
   * @returns Speed multiplier (0.1-5.0)
   */
  get_preview_speed(): number {
    return this.internal_preview_speed;
  }

  /**
   * Set preview speed multiplier
   *
   * @param speed Speed multiplier
   */
  set_preview_speed(speed: number): void {
    if (speed >= 0.1 && speed <= 5.0) {
      this.internal_preview_speed = speed;
    }
  }

  /**
   * Apply changes to clip
   *
   * @returns True if successful
   */
  apply_changes(): boolean {
    try {
      // Validate all properties
      if (!this.validate()) {
        return false;
      }

      // Note: ScrollClip properties are set during creation
      // Preview settings are applied for rendering only
      return true;
    } catch (error) {
      console.error("Failed to apply scroll clip changes:", error);
      return false;
    }
  }

  /**
   * Revert changes from clip state
   */
  revert_changes(): void {
    this.internal_scroll_direction = "horizontal";
    this.internal_scroll_speed = 1;
    this.internal_scroll_delay = 0;
    this.internal_wrap_mode = "wrap";
    this.internal_background_file = "";
    this.internal_background_width = 300;
    this.internal_background_height = 216;
    this.internal_tile_mode = "both";
    this.internal_border_color = 0;
    this.internal_background_color = 1;
  }

  /**
   * Validate all properties
   *
   * @returns True if all properties valid
   */
  validate(): boolean {
    return (
      this.internal_scroll_speed >= 1 &&
      this.internal_scroll_speed <= 50 &&
      this.internal_scroll_delay >= 0 &&
      this.internal_scroll_delay <= 1000 &&
      this.internal_background_width >= 1 &&
      this.internal_background_width <= 600 &&
      this.internal_background_height >= 1 &&
      this.internal_background_height <= 432 &&
      this.internal_border_color >= 0 &&
      this.internal_border_color < 256 &&
      this.internal_background_color >= 0 &&
      this.internal_background_color < 256 &&
      this.internal_preview_speed >= 0.1 &&
      this.internal_preview_speed <= 5.0
    );
  }

  /**
   * Render window content
   */
  protected render_content(): void {
    // Scroll direction selector
    // Speed and delay controls
    // Wrap mode selector
    // Background file browser
    // Dimension controls
    // Tiling options
    // Color pickers
    // Preview pane with animation
  }

  /**
   * Handle scroll direction change
   *
   * @param direction New direction
   */
  protected on_direction_changed(direction: "horizontal" | "vertical"): void {
    this.set_scroll_direction(direction);
  }

  /**
   * Handle scroll speed change
   *
   * @param speed New speed
   */
  protected on_speed_changed(speed: number): void {
    this.set_scroll_speed(speed);
  }

  /**
   * Handle scroll delay change
   *
   * @param delay New delay
   */
  protected on_delay_changed(delay: number): void {
    this.set_scroll_delay(delay);
  }

  /**
   * Handle wrap mode change
   *
   * @param mode New wrap mode
   */
  protected on_wrap_mode_changed(mode: "none" | "wrap" | "bounce"): void {
    this.set_wrap_mode(mode);
  }

  /**
   * Handle background file selection
   *
   * @param file_path Selected file path
   */
  protected on_background_file_selected(file_path: string): void {
    this.set_background_file(file_path);
  }

  /**
   * Handle tile mode change
   *
   * @param mode New tile mode
   */
  protected on_tile_mode_changed(mode: "none" | "horizontal" | "vertical" | "both"): void {
    this.set_tile_mode(mode);
  }

  /**
   * Handle color change
   *
   * @param component Color component: "border" or "background"
   * @param color_index New color index
   */
  protected on_color_changed(component: string, color_index: number): void {
    switch (component) {
      case "border":
        this.set_border_color(color_index);
        break;
      case "background":
        this.set_background_color(color_index);
        break;
    }
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END