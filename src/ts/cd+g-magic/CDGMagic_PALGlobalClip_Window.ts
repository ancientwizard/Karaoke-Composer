/**
 * CDGMagic_PALGlobalClip_Window.ts
 * Editor window for PALGlobalClip properties and palette color editing
 */

import type { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

/**
 * PALGlobalClip_Window: Palette global clip property editor
 *
 * Dialog for editing palette color global clips:
 * - Palette color entries (RGB values)
 * - Fade/dissolve transition effects
 * - Update masks for selective palette updates
 * - Color preview with fade effects
 *
 * Responsibilities:
 * - Display palette color grid
 * - Accept color selection and modification
 * - Handle fade/dissolve configuration
 * - Manage update mask settings
 * - Preview with transparency
 *
 * Use Cases:
 * 1. Edit palette color values
 * 2. Configure fade/dissolve effects
 * 3. Set palette update masks
 * 4. Preview color transitions
 */
export
class CDGMagic_PALGlobalClip_Window {
  // Clip being edited
  private internal_clip: CDGMagic_PALGlobalClip;

  // UI state
  private internal_is_open: boolean;
  private internal_is_modal: boolean;

  // Editing state
  private internal_selected_color: number;
  private internal_fade_type: "none" | "fade" | "dissolve";
  private internal_fade_duration: number;
  private internal_update_mask: number[];
  private internal_palette_entries: Array<{ index: number; r: number; g: number; b: number }>;

  // Preview settings
  private internal_show_preview: boolean;
  private internal_preview_alpha: number;

  /**
   * Create PALGlobalClip editor window
   *
   * @param clip The PALGlobalClip to edit
   * @param is_modal Whether window is modal
   */
  constructor(clip: CDGMagic_PALGlobalClip, is_modal: boolean = true) {
    this.internal_clip = clip;
    this.internal_is_open = false;
    this.internal_is_modal = is_modal;

    // Initialize editing state
    this.internal_selected_color = 0;
    this.internal_fade_type = "none";
    this.internal_fade_duration = 0;
    this.internal_update_mask = Array(256).fill(0);
    this.internal_palette_entries = [];

    // Preview settings
    this.internal_show_preview = true;
    this.internal_preview_alpha = 1.0;
  }

  /**
   * Get currently selected palette color index
   *
   * @returns Color index (0-255)
   */
  get_selected_color(): number {
    return this.internal_selected_color;
  }

  /**
   * Set selected palette color index
   *
   * @param index Color index to select
   */
  set_selected_color(index: number): void {
    if (index >= 0 && index < 256) {
      this.internal_selected_color = index;
    }
  }

  /**
   * Get fade/dissolve type
   *
   * @returns Fade type: "none", "fade", or "dissolve"
   */
  get_fade_type(): "none" | "fade" | "dissolve" {
    return this.internal_fade_type;
  }

  /**
   * Set fade/dissolve type
   *
   * @param fade_type New fade type
   */
  set_fade_type(fade_type: "none" | "fade" | "dissolve"): void {
    this.internal_fade_type = fade_type;
  }

  /**
   * Get fade duration in frames
   *
   * @returns Duration in frames
   */
  get_fade_duration(): number {
    return this.internal_fade_duration;
  }

  /**
   * Set fade duration in frames
   *
   * @param duration Duration in frames (0+)
   */
  set_fade_duration(duration: number): void {
    if (duration >= 0) {
      this.internal_fade_duration = duration;
    }
  }

  /**
   * Get update mask for palette entries
   *
   * @returns Bitmask array where each bit represents if entry should update
   */
  get_update_mask(): number[] {
    return [...this.internal_update_mask];
  }

  /**
   * Set whether palette entry should update
   *
   * @param index Palette index (0-255)
   * @param should_update Whether entry should be updated
   */
  set_update_mask_entry(index: number, should_update: boolean): void {
    if (index >= 0 && index < 256) {
      this.internal_update_mask[index] = should_update ? 1 : 0;
    }
  }

  /**
   * Get palette entries from current clip
   *
   * @returns Array of color entries
   */
  get_palette_entries(): Array<{ index: number; r: number; g: number; b: number }> {
    return [...this.internal_palette_entries];
  }

  /**
   * Add or update palette entry
   *
   * @param index Palette index
   * @param r Red component (0-255)
   * @param g Green component (0-255)
   * @param b Blue component (0-255)
   */
  set_palette_entry(index: number, r: number, g: number, b: number): void {
    if (index >= 0 && index < 256 && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      const existing = this.internal_palette_entries.findIndex((e) => e.index === index);
      if (existing >= 0) {
        this.internal_palette_entries[existing] = {
          index,
          r,
          g,
          b,
        };
      } else {
        this.internal_palette_entries.push({
          index,
          r,
          g,
          b,
        });
      }
    }
  }

  /**
   * Get preview alpha (transparency) for fade effects
   *
   * @returns Alpha value (0.0-1.0)
   */
  get_preview_alpha(): number {
    return this.internal_preview_alpha;
  }

  /**
   * Set preview alpha
   *
   * @param alpha Alpha value (0.0-1.0)
   */
  set_preview_alpha(alpha: number): void {
    if (alpha >= 0 && alpha <= 1.0) {
      this.internal_preview_alpha = alpha;
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

      // Note: PALGlobalClip properties are set during creation
      // Preview settings are applied for rendering only
      return true;
    } catch (error) {
      console.error("Failed to apply palette clip changes:", error);
      return false;
    }
  }

  /**
   * Revert changes from clip state
   */
  revert_changes(): void {
    this.internal_selected_color = 0;
    this.internal_fade_type = "none";
    this.internal_fade_duration = 0;
    this.internal_update_mask = Array(256).fill(0);
    this.internal_palette_entries = [];
  }

  /**
   * Validate all properties
   *
   * @returns True if all properties valid
   */
  validate(): boolean {
    return (
      this.internal_selected_color >= 0 &&
      this.internal_selected_color < 256 &&
      this.internal_fade_duration >= 0 &&
      this.internal_palette_entries.length <= 256 &&
      this.internal_preview_alpha >= 0 &&
      this.internal_preview_alpha <= 1.0
    );
  }

  /**
   * Render window content
   */
  protected render_content(): void {
    // Color palette grid display
    // Fade/dissolve controls
    // Update mask checkboxes
    // Preview with alpha blending
  }

  /**
   * Handle color selection click
   *
   * @param index Selected color index
   */
  protected on_color_selected(index: number): void {
    this.set_selected_color(index);
  }

  /**
   * Handle fade type change
   *
   * @param fade_type New fade type
   */
  protected on_fade_type_changed(fade_type: "none" | "fade" | "dissolve"): void {
    this.set_fade_type(fade_type);
  }

  /**
   * Handle fade duration change
   *
   * @param duration New duration in frames
   */
  protected on_fade_duration_changed(duration: number): void {
    this.set_fade_duration(duration);
  }

  /**
   * Handle update mask change
   *
   * @param index Palette index
   * @param should_update Whether to update
   */
  protected on_update_mask_changed(index: number, should_update: boolean): void {
    this.set_update_mask_entry(index, should_update);
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END