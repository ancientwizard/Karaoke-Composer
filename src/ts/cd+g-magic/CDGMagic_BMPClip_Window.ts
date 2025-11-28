/**
 * CD+Graphics Magic - BMP Clip Window
 *
 * Edit dialog for bitmap clip properties.
 */

import type { CDGMagic_BMPClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

/**
 * BMPClip_Window: Bitmap clip property editor
 *
 * Dialog for editing BMP clip properties:
 * - Image dimensions
 * - XOR mode
 * - Color selection
 * - Transition timing
 *
 * Responsibilities:
 * - Display clip properties
 * - Accept user input
 * - Validate changes
 * - Preview rendering
 *
 * Use Cases:
 * 1. Edit bitmap clip parameters
 * 2. Preview clip rendering
 * 3. Adjust image properties
 * 4. Configure color/mode settings
 */
export class CDGMagic_BMPClip_Window {
  // Clip being edited
  private internal_clip: CDGMagic_BMPClip;

  // Window state
  private internal_is_open: boolean;
  private internal_is_modal: boolean;

  // Property fields
  private internal_width: number;
  private internal_height: number;
  private internal_use_xor: boolean;
  private internal_transparent_index: number;

  // Preview state
  private internal_show_preview: boolean;
  private internal_preview_scale: number;

  /**
   * Constructor: Create BMP clip editor
   *
   * @param clip BMPClip to edit
   * @param is_modal Whether to show as modal dialog
   */
  constructor(clip: CDGMagic_BMPClip, is_modal: boolean = true) {
    this.internal_clip = clip;
    this.internal_is_open = false;
    this.internal_is_modal = is_modal;

    // Initialize from clip
    this.internal_width = clip.width();
    this.internal_height = clip.height();
    this.internal_use_xor = clip.xor_only() ? true : false;
    this.internal_transparent_index = clip.fill_index();

    this.internal_show_preview = true;
    this.internal_preview_scale = 1.0;
  }

  /**
   * Get edited clip
   *
   * @returns BMPClip reference
   */
  clip(): CDGMagic_BMPClip {
    return this.internal_clip;
  }

  /**
   * Check if window is open
   *
   * @returns True if displayed
   */
  is_open(): boolean;
  /**
   * Set open state
   *
   * @param open Show/hide window
   */
  is_open(open: boolean): void;
  is_open(open?: boolean): boolean | void {
    if (open === undefined) {
      return this.internal_is_open;
    } else {
      this.internal_is_open = open;
    }
  }

  /**
   * Get modal flag
   *
   * @returns True if modal
   */
  is_modal(): boolean {
    return this.internal_is_modal;
  }

  /**
   * Get width property
   *
   * @returns Width in pixels
   */
  width(): number;
  /**
   * Set width property
   *
   * @param w Width in pixels
   */
  width(w: number): void;
  width(w?: number): number | void {
    if (w === undefined) {
      return this.internal_width;
    } else {
      this.internal_width = Math.max(1, Math.min(w, 304));
    }
  }

  /**
   * Get height property
   *
   * @returns Height in pixels
   */
  height(): number;
  /**
   * Set height property
   *
   * @param h Height in pixels
   */
  height(h: number): void;
  height(h?: number): number | void {
    if (h === undefined) {
      return this.internal_height;
    } else {
      this.internal_height = Math.max(1, Math.min(h, 216));
    }
  }

  /**
   * Get XOR rendering mode
   *
   * @returns True if XOR mode enabled
   */
  use_xor(): boolean;
  /**
   * Set XOR rendering mode
   *
   * @param xor Enable XOR mode
   */
  use_xor(xor: boolean): void;
  use_xor(xor?: boolean): boolean | void {
    if (xor === undefined) {
      return this.internal_use_xor;
    } else {
      this.internal_use_xor = xor;
    }
  }

  /**
   * Get transparent color index
   *
   * @returns Palette index (0-255)
   */
  transparent_color(): number;
  /**
   * Set transparent color index
   *
   * @param index Palette index
   */
  transparent_color(index: number): void;
  transparent_color(index?: number): number | void {
    if (index === undefined) {
      return this.internal_transparent_index;
    } else {
      this.internal_transparent_index = Math.max(0, Math.min(index, 255));
    }
  }

  /**
   * Get preview visibility
   *
   * @returns True if preview shown
   */
  show_preview(): boolean;
  /**
   * Set preview visibility
   *
   * @param show Display preview
   */
  show_preview(show: boolean): void;
  show_preview(show?: boolean): boolean | void {
    if (show === undefined) {
      return this.internal_show_preview;
    } else {
      this.internal_show_preview = show;
    }
  }

  /**
   * Get preview scale
   *
   * @returns Scale factor (1.0 = 100%)
   */
  preview_scale(): number;
  /**
   * Set preview scale
   *
   * @param scale Scale factor
   */
  preview_scale(scale: number): void;
  preview_scale(scale?: number): number | void {
    if (scale === undefined) {
      return this.internal_preview_scale;
    } else {
      this.internal_preview_scale = Math.max(0.1, Math.min(scale, 4.0));
    }
  }

  /**
   * Apply changes to clip
   *
   * @returns True if successful
   */
  apply_changes(): boolean {
    try {
      // Note: BMPObject dimensions are immutable after creation
      // Only preview settings can be modified at runtime
      // XOR rendering and fill index are determined at clip creation
      return true;
    } catch (error) {
      console.error("Failed to apply clip changes:", error);
      return false;
    }
  }

  /**
   * Revert changes from clip
   */
  revert_changes(): void {
    this.internal_width = this.internal_clip.width();
    this.internal_height = this.internal_clip.height();
    this.internal_use_xor = this.internal_clip.xor_only() ? true : false;
    this.internal_transparent_index = this.internal_clip.fill_index();
  }

  /**
   * Validate current properties
   *
   * @returns True if all properties valid
   */
  validate(): boolean {
    return (
      this.internal_width >= 1 &&
      this.internal_width <= 304 &&
      this.internal_height >= 1 &&
      this.internal_height <= 216 &&
      this.internal_transparent_index >= 0 &&
      this.internal_transparent_index <= 255
    );
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.internal_width = 304;
    this.internal_height = 216;
    this.internal_use_xor = false;
    this.internal_transparent_index = 0;
    this.internal_preview_scale = 1.0;
  }

  /**
   * Close window
   */
  close(): void {
    this.internal_is_open = false;
  }
}

// VIM: set ft=typescript :
// END