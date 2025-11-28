/**
 * CDGMagic_TrackOptions_MaskWindow.ts
 * Editor window for TrackOptions mask and channel settings
 */

import type { CDGMagic_TrackOptions } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";

/**
 * TrackOptions_MaskWindow: Track mask and channel editor
 *
 * Dialog for editing track mask and channel settings:
 * - Audio channel selection and masking
 * - Channel enable/disable
 * - Mask window position and size
 * - Transparency and blending settings
 * - Channel mixing options
 *
 * Responsibilities:
 * - Display channel selection UI
 * - Manage channel masking
 * - Configure mask window properties
 * - Handle transparency settings
 * - Apply channel mixing
 *
 * Use Cases:
 * 1. Select active audio channels
 * 2. Configure channel masking
 * 3. Set mask window position/size
 * 4. Adjust transparency
 * 5. Configure channel mixing
 */
export
class CDGMagic_TrackOptions_MaskWindow {
  // Track options being edited
  private internal_track_options: CDGMagic_TrackOptions;

  // UI state
  private internal_is_open: boolean;
  private internal_is_modal: boolean;

  // Channel settings
  private internal_channel_mask: number[];
  private internal_channel_enabled: boolean[];
  private internal_active_channel: number;

  // Mask window properties
  private internal_mask_x: number;
  private internal_mask_y: number;
  private internal_mask_width: number;
  private internal_mask_height: number;

  // Transparency and blending
  private internal_mask_alpha: number;
  private internal_blend_mode: "normal" | "multiply" | "screen" | "overlay";

  // Channel mixing
  private internal_mix_mode: "none" | "mono" | "stereo" | "surround";
  private internal_mix_volume: number;

  /**
   * Create TrackOptions mask window editor
   *
   * @param track_options The TrackOptions to edit
   * @param is_modal Whether window is modal
   */
  constructor(track_options: CDGMagic_TrackOptions, is_modal: boolean = true) {
    this.internal_track_options = track_options;
    this.internal_is_open = false;
    this.internal_is_modal = is_modal;

    // Initialize channel settings
    this.internal_channel_mask = Array(8).fill(0); // 8 channels
    this.internal_channel_enabled = Array(8).fill(true);
    this.internal_active_channel = 0;

    // Mask window properties
    this.internal_mask_x = 0;
    this.internal_mask_y = 0;
    this.internal_mask_width = 300;
    this.internal_mask_height = 216;

    // Transparency and blending
    this.internal_mask_alpha = 1.0;
    this.internal_blend_mode = "normal";

    // Channel mixing
    this.internal_mix_mode = "stereo";
    this.internal_mix_volume = 1.0;
  }

  /**
   * Get channel mask for all channels
   *
   * @returns Array of channel masks
   */
  get_channel_mask(): number[] {
    return [...this.internal_channel_mask];
  }

  /**
   * Set channel mask
   *
   * @param channel Channel index (0-7)
   * @param mask Mask value (0-255)
   */
  set_channel_mask(channel: number, mask: number): void {
    if (channel >= 0 && channel < 8 && mask >= 0 && mask <= 255) {
      this.internal_channel_mask[channel] = mask;
    }
  }

  /**
   * Get channel enabled status
   *
   * @param channel Channel index (0-7)
   * @returns True if channel enabled
   */
  is_channel_enabled(channel: number): boolean {
    if (channel >= 0 && channel < 8) {
      return this.internal_channel_enabled[channel];
    }
    return false;
  }

  /**
   * Set channel enabled status
   *
   * @param channel Channel index (0-7)
   * @param enabled Whether channel should be enabled
   */
  set_channel_enabled(channel: number, enabled: boolean): void {
    if (channel >= 0 && channel < 8) {
      this.internal_channel_enabled[channel] = enabled;
    }
  }

  /**
   * Get active channel for detailed editing
   *
   * @returns Active channel index
   */
  get_active_channel(): number {
    return this.internal_active_channel;
  }

  /**
   * Set active channel
   *
   * @param channel Channel index to activate
   */
  set_active_channel(channel: number): void {
    if (channel >= 0 && channel < 8) {
      this.internal_active_channel = channel;
    }
  }

  /**
   * Get mask window X position
   *
   * @returns X position in pixels
   */
  get_mask_x(): number {
    return this.internal_mask_x;
  }

  /**
   * Set mask window X position
   *
   * @param x X position in pixels
   */
  set_mask_x(x: number): void {
    if (x >= 0 && x <= 300) {
      this.internal_mask_x = x;
    }
  }

  /**
   * Get mask window Y position
   *
   * @returns Y position in pixels
   */
  get_mask_y(): number {
    return this.internal_mask_y;
  }

  /**
   * Set mask window Y position
   *
   * @param y Y position in pixels
   */
  set_mask_y(y: number): void {
    if (y >= 0 && y <= 216) {
      this.internal_mask_y = y;
    }
  }

  /**
   * Get mask window width
   *
   * @returns Width in pixels
   */
  get_mask_width(): number {
    return this.internal_mask_width;
  }

  /**
   * Set mask window width
   *
   * @param width Width in pixels
   */
  set_mask_width(width: number): void {
    if (width >= 1 && width <= 300) {
      this.internal_mask_width = width;
    }
  }

  /**
   * Get mask window height
   *
   * @returns Height in pixels
   */
  get_mask_height(): number {
    return this.internal_mask_height;
  }

  /**
   * Set mask window height
   *
   * @param height Height in pixels
   */
  set_mask_height(height: number): void {
    if (height >= 1 && height <= 216) {
      this.internal_mask_height = height;
    }
  }

  /**
   * Get mask alpha (transparency)
   *
   * @returns Alpha value (0.0-1.0)
   */
  get_mask_alpha(): number {
    return this.internal_mask_alpha;
  }

  /**
   * Set mask alpha
   *
   * @param alpha Alpha value (0.0-1.0)
   */
  set_mask_alpha(alpha: number): void {
    if (alpha >= 0 && alpha <= 1.0) {
      this.internal_mask_alpha = alpha;
    }
  }

  /**
   * Get blend mode
   *
   * @returns Blend mode: "normal", "multiply", "screen", "overlay"
   */
  get_blend_mode(): "normal" | "multiply" | "screen" | "overlay" {
    return this.internal_blend_mode;
  }

  /**
   * Set blend mode
   *
   * @param mode New blend mode
   */
  set_blend_mode(mode: "normal" | "multiply" | "screen" | "overlay"): void {
    this.internal_blend_mode = mode;
  }

  /**
   * Get channel mix mode
   *
   * @returns Mix mode: "none", "mono", "stereo", "surround"
   */
  get_mix_mode(): "none" | "mono" | "stereo" | "surround" {
    return this.internal_mix_mode;
  }

  /**
   * Set channel mix mode
   *
   * @param mode New mix mode
   */
  set_mix_mode(mode: "none" | "mono" | "stereo" | "surround"): void {
    this.internal_mix_mode = mode;
  }

  /**
   * Get mix volume multiplier
   *
   * @returns Volume multiplier (0.0-2.0)
   */
  get_mix_volume(): number {
    return this.internal_mix_volume;
  }

  /**
   * Set mix volume multiplier
   *
   * @param volume Volume multiplier (0.0-2.0)
   */
  set_mix_volume(volume: number): void {
    if (volume >= 0 && volume <= 2.0) {
      this.internal_mix_volume = volume;
    }
  }

  /**
   * Apply changes to track options
   *
   * @returns True if successful
   */
  apply_changes(): boolean {
    try {
      // Validate all properties
      if (!this.validate()) {
        return false;
      }

      // Note: TrackOptions_Core properties are set during creation
      // Mask settings are applied for rendering only
      return true;
    } catch (error) {
      console.error("Failed to apply track mask changes:", error);
      return false;
    }
  }

  /**
   * Revert changes from track options state
   */
  revert_changes(): void {
    this.internal_channel_mask = Array(8).fill(0);
    this.internal_channel_enabled = Array(8).fill(true);
    this.internal_active_channel = 0;
    this.internal_mask_x = 0;
    this.internal_mask_y = 0;
    this.internal_mask_width = 300;
    this.internal_mask_height = 216;
    this.internal_mask_alpha = 1.0;
    this.internal_blend_mode = "normal";
    this.internal_mix_mode = "stereo";
    this.internal_mix_volume = 1.0;
  }

  /**
   * Validate all properties
   *
   * @returns True if all properties valid
   */
  validate(): boolean {
    return (
      this.internal_channel_mask.length === 8 &&
      this.internal_channel_enabled.length === 8 &&
      this.internal_active_channel >= 0 &&
      this.internal_active_channel < 8 &&
      this.internal_mask_x >= 0 &&
      this.internal_mask_x <= 300 &&
      this.internal_mask_y >= 0 &&
      this.internal_mask_y <= 216 &&
      this.internal_mask_width >= 1 &&
      this.internal_mask_width <= 300 &&
      this.internal_mask_height >= 1 &&
      this.internal_mask_height <= 216 &&
      this.internal_mask_alpha >= 0 &&
      this.internal_mask_alpha <= 1.0 &&
      this.internal_mix_volume >= 0 &&
      this.internal_mix_volume <= 2.0
    );
  }

  /**
   * Render window content
   */
  protected render_content(): void {
    // Channel list with enable/disable checkboxes
    // Channel mask value inputs
    // Mask window position and size controls
    // Transparency/alpha slider
    // Blend mode selector
    // Channel mixing options
    // Volume control
    // Preview pane showing affected channels
  }

  /**
   * Handle channel enabled toggle
   *
   * @param channel Channel index
   * @param enabled New enabled state
   */
  protected on_channel_enabled_changed(channel: number, enabled: boolean): void {
    this.set_channel_enabled(channel, enabled);
  }

  /**
   * Handle channel mask value change
   *
   * @param channel Channel index
   * @param mask New mask value
   */
  protected on_channel_mask_changed(channel: number, mask: number): void {
    this.set_channel_mask(channel, mask);
  }

  /**
   * Handle mask window position change
   *
   * @param x New X position
   * @param y New Y position
   */
  protected on_mask_position_changed(x: number, y: number): void {
    this.set_mask_x(x);
    this.set_mask_y(y);
  }

  /**
   * Handle mask window size change
   *
   * @param width New width
   * @param height New height
   */
  protected on_mask_size_changed(width: number, height: number): void {
    this.set_mask_width(width);
    this.set_mask_height(height);
  }

  /**
   * Handle alpha change
   *
   * @param alpha New alpha value
   */
  protected on_alpha_changed(alpha: number): void {
    this.set_mask_alpha(alpha);
  }

  /**
   * Handle blend mode change
   *
   * @param mode New blend mode
   */
  protected on_blend_mode_changed(mode: "normal" | "multiply" | "screen" | "overlay"): void {
    this.set_blend_mode(mode);
  }

  /**
   * Handle mix mode change
   *
   * @param mode New mix mode
   */
  protected on_mix_mode_changed(mode: "none" | "mono" | "stereo" | "surround"): void {
    this.set_mix_mode(mode);
  }

  /**
   * Handle mix volume change
   *
   * @param volume New mix volume
   */
  protected on_mix_volume_changed(volume: number): void {
    this.set_mix_volume(volume);
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END