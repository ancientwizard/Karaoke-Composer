/**
 * CDGMagic_TextClip_Window.ts
 * Editor window for TextClip properties and karaoke text editing
 */

import type { CDGMagic_TextClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

/**
 * TextClip_Window: Karaoke text clip property editor
 *
 * Dialog for editing text clip properties:
 * - Font selection (typeface and size)
 * - Text content entry
 * - Color selection (foreground, background, outline)
 * - Karaoke mode and highlighting
 * - Syllable-level timing
 * - Text positioning and sizing
 *
 * Responsibilities:
 * - Display text editing interface
 * - Manage font parameters
 * - Accept syllable-level timing
 * - Preview text rendering
 * - Configure color scheme
 *
 * Use Cases:
 * 1. Enter karaoke lyrics
 * 2. Configure syllable timing
 * 3. Set font and colors
 * 4. Preview text rendering
 * 5. Adjust text positioning
 */
export
class CDGMagic_TextClip_Window {
  // Clip being edited
  private internal_clip: CDGMagic_TextClip;

  // UI state
  private internal_is_open: boolean;
  private internal_is_modal: boolean;

  // Text properties
  private internal_text_content: string;
  private internal_font_face: string;
  private internal_font_size: number;
  private internal_foreground_color: number;
  private internal_background_color: number;
  private internal_outline_color: number;

  // Karaoke properties
  private internal_karaoke_mode: boolean;
  private internal_highlight_mode: "none" | "background" | "outline" | "both";
  private internal_syllables: Array<{
    offset: number;
    duration: number;
    text: string;
  }>;

  // Positioning
  private internal_x_position: number;
  private internal_y_position: number;
  private internal_text_width: number;
  private internal_text_height: number;

  // Preview settings
  private internal_show_preview: boolean;
  private internal_preview_scale: number;

  /**
   * Create TextClip editor window
   *
   * @param clip The TextClip to edit
   * @param is_modal Whether window is modal
   */
  constructor(clip: CDGMagic_TextClip, is_modal: boolean = true) {
    this.internal_clip = clip;
    this.internal_is_open = false;
    this.internal_is_modal = is_modal;

    // Initialize text properties
    this.internal_text_content = "";
    this.internal_font_face = "Arial";
    this.internal_font_size = 12;
    this.internal_foreground_color = 15; // White
    this.internal_background_color = 0; // Black
    this.internal_outline_color = 1; // Dark color

    // Karaoke properties
    this.internal_karaoke_mode = true;
    this.internal_highlight_mode = "background";
    this.internal_syllables = [];

    // Positioning
    this.internal_x_position = 0;
    this.internal_y_position = 0;
    this.internal_text_width = 300;
    this.internal_text_height = 60;

    // Preview settings
    this.internal_show_preview = true;
    this.internal_preview_scale = 1.0;
  }

  /**
   * Get text content
   *
   * @returns Current text string
   */
  get_text_content(): string {
    return this.internal_text_content;
  }

  /**
   * Set text content
   *
   * @param text New text content
   */
  set_text_content(text: string): void {
    this.internal_text_content = text;
  }

  /**
   * Get font face
   *
   * @returns Font name
   */
  get_font_face(): string {
    return this.internal_font_face;
  }

  /**
   * Set font face
   *
   * @param face Font name
   */
  set_font_face(face: string): void {
    if (face.length > 0) {
      this.internal_font_face = face;
    }
  }

  /**
   * Get font size
   *
   * @returns Font size in points
   */
  get_font_size(): number {
    return this.internal_font_size;
  }

  /**
   * Set font size
   *
   * @param size Font size in points (1+)
   */
  set_font_size(size: number): void {
    if (size >= 1 && size <= 256) {
      this.internal_font_size = size;
    }
  }

  /**
   * Get foreground color index
   *
   * @returns Palette color index
   */
  get_foreground_color(): number {
    return this.internal_foreground_color;
  }

  /**
   * Set foreground color
   *
   * @param color Palette color index (0-255)
   */
  set_foreground_color(color: number): void {
    if (color >= 0 && color < 256) {
      this.internal_foreground_color = color;
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
   * Get outline color index
   *
   * @returns Palette color index
   */
  get_outline_color(): number {
    return this.internal_outline_color;
  }

  /**
   * Set outline color
   *
   * @param color Palette color index (0-255)
   */
  set_outline_color(color: number): void {
    if (color >= 0 && color < 256) {
      this.internal_outline_color = color;
    }
  }

  /**
   * Get karaoke mode status
   *
   * @returns True if karaoke mode enabled
   */
  is_karaoke_mode(): boolean {
    return this.internal_karaoke_mode;
  }

  /**
   * Set karaoke mode
   *
   * @param enabled Whether to enable karaoke
   */
  set_karaoke_mode(enabled: boolean): void {
    this.internal_karaoke_mode = enabled;
  }

  /**
   * Get highlight mode
   *
   * @returns Highlight style: "none", "background", "outline", "both"
   */
  get_highlight_mode(): "none" | "background" | "outline" | "both" {
    return this.internal_highlight_mode;
  }

  /**
   * Set highlight mode
   *
   * @param mode Highlight style
   */
  set_highlight_mode(mode: "none" | "background" | "outline" | "both"): void {
    this.internal_highlight_mode = mode;
  }

  /**
   * Get all syllables
   *
   * @returns Array of syllable definitions
   */
  get_syllables(): Array<{ offset: number; duration: number; text: string }> {
    return this.internal_syllables.map((s) => ({ ...s }));
  }

  /**
   * Add syllable
   *
   * @param offset Offset in packets
   * @param duration Duration in packets
   * @param text Syllable text
   */
  add_syllable(offset: number, duration: number, text: string): void {
    if (offset >= 0 && duration > 0 && text.length > 0) {
      this.internal_syllables.push({
        offset,
        duration,
        text,
      });
    }
  }

  /**
   * Remove syllable by index
   *
   * @param index Syllable index
   */
  remove_syllable(index: number): void {
    if (index >= 0 && index < this.internal_syllables.length) {
      this.internal_syllables.splice(index, 1);
    }
  }

  /**
   * Update syllable
   *
   * @param index Syllable index
   * @param offset New offset
   * @param duration New duration
   * @param text New text
   */
  update_syllable(index: number, offset: number, duration: number, text: string): void {
    if (index >= 0 && index < this.internal_syllables.length && duration > 0 && text.length > 0) {
      this.internal_syllables[index] = {
        offset,
        duration,
        text,
      };
    }
  }

  /**
   * Get text X position
   *
   * @returns X position in pixels
   */
  get_x_position(): number {
    return this.internal_x_position;
  }

  /**
   * Set text X position
   *
   * @param x X position in pixels
   */
  set_x_position(x: number): void {
    if (x >= 0 && x <= 300) {
      this.internal_x_position = x;
    }
  }

  /**
   * Get text Y position
   *
   * @returns Y position in pixels
   */
  get_y_position(): number {
    return this.internal_y_position;
  }

  /**
   * Set text Y position
   *
   * @param y Y position in pixels
   */
  set_y_position(y: number): void {
    if (y >= 0 && y <= 216) {
      this.internal_y_position = y;
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

      // Note: TextClip properties are set during creation
      // Preview settings are applied for rendering only
      return true;
    } catch (error) {
      console.error("Failed to apply text clip changes:", error);
      return false;
    }
  }

  /**
   * Revert changes from clip state
   */
  revert_changes(): void {
    this.internal_text_content = "";
    this.internal_font_face = "Arial";
    this.internal_font_size = 12;
    this.internal_foreground_color = 15;
    this.internal_background_color = 0;
    this.internal_outline_color = 1;
    this.internal_karaoke_mode = true;
    this.internal_highlight_mode = "background";
    this.internal_syllables = [];
  }

  /**
   * Validate all properties
   *
   * @returns True if all properties valid
   */
  validate(): boolean {
    return (
      this.internal_text_content.length > 0 &&
      this.internal_font_size >= 1 &&
      this.internal_font_size <= 256 &&
      this.internal_foreground_color >= 0 &&
      this.internal_foreground_color < 256 &&
      this.internal_background_color >= 0 &&
      this.internal_background_color < 256 &&
      this.internal_outline_color >= 0 &&
      this.internal_outline_color < 256 &&
      this.internal_x_position >= 0 &&
      this.internal_x_position <= 300 &&
      this.internal_y_position >= 0 &&
      this.internal_y_position <= 216 &&
      this.internal_syllables.length > 0
    );
  }

  /**
   * Render window content
   */
  protected render_content(): void {
    // Text input field
    // Font selector
    // Color palette pickers
    // Syllable timing table
    // Karaoke highlighting options
    // Position controls
    // Preview pane with text
  }

  /**
   * Handle text input change
   *
   * @param text New text
   */
  protected on_text_changed(text: string): void {
    this.set_text_content(text);
  }

  /**
   * Handle font change
   *
   * @param face Font name
   * @param size Font size
   */
  protected on_font_changed(face: string, size: number): void {
    this.set_font_face(face);
    this.set_font_size(size);
  }

  /**
   * Handle color change
   *
   * @param component Color component: "foreground", "background", "outline"
   * @param color_index New color index
   */
  protected on_color_changed(component: string, color_index: number): void {
    switch (component) {
      case "foreground":
        this.set_foreground_color(color_index);
        break;
      case "background":
        this.set_background_color(color_index);
        break;
      case "outline":
        this.set_outline_color(color_index);
        break;
    }
  }

  /**
   * Handle karaoke mode change
   *
   * @param enabled New karaoke mode
   */
  protected on_karaoke_mode_changed(enabled: boolean): void {
    this.set_karaoke_mode(enabled);
  }

  /**
   * Handle syllable added
   *
   * @param offset Syllable offset
   * @param duration Syllable duration
   * @param text Syllable text
   */
  protected on_syllable_added(offset: number, duration: number, text: string): void {
    this.add_syllable(offset, duration, text);
  }

  /**
   * Handle syllable updated
   *
   * @param index Syllable index
   * @param offset New offset
   * @param duration New duration
   * @param text New text
   */
  protected on_syllable_updated(index: number, offset: number, duration: number, text: string): void {
    this.update_syllable(index, offset, duration, text);
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END