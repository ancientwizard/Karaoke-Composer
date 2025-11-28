/**
 * CD+Graphics Magic - Text Clip
 *
 * Base class for text and karaoke clips.
 * Extends MediaClip for clips that render text with various karaoke modes.
 */

import { CDGMagic_MediaClip } from "./CDGMagic_MediaClip";

/**
 * Karaoke display modes for TextClip
 */
export enum KaraokeModes {
  TITLES = 0x00,      // Title: Single page, multiline text
  LYRICS = 0x01,      // Lyrics: Multipage, single line
  MODE_5TLINE = 0x02, // 5 Lines (36px), Top, Line-by-line
  MODE_5BLINE = 0x03, // 5 Lines (36px), Bottom, Line-by-line
  MODE_5TPAGE = 0x04, // 5 Lines (36px), Top, Page-by-page
  MODE_5BPAGE = 0x05, // 5 Lines (36px), Bottom, Page-by-page
  MODE_8MLINE = 0x06, // 8 Lines (24px), Middle, Line-by-line
  MODE_8MPAGE = 0x07, // 8 Lines (24px), Middle, Page-by-page
  MODE_6MLINE = 0x08, // 6 Lines (24px), Middle, Line-by-line
  MODE_6MPAGE = 0x09, // 6 Lines (24px), Middle, Page-by-page
  MODE_4TLIN = 0x0a,  // 4 Lines (24px), Top, Line-by-line
  MODE_4BLIN = 0x0b,  // 4 Lines (24px), Bottom, Line-by-line
  MODE_5LNCT = 0x0c,  // 5 Lines (36px, 3 colors), Top, Line Cut
  MODE_5LNFD = 0x0d,  // 5 Lines (36px, 3 colors), Top, Line Fade
  MODE_7LNCT = 0x0e,  // 7 Lines (24px, 2 colors), Middle, Line Cut
  MODE_7LNFD = 0x0f,  // 7 Lines (24px, 2 colors), Middle, Line Fade
}

/**
 * Text event information
 */
export interface TextEventInfo {
  text_string: string;
  line_num: number;
  word_num: number;
  karaoke_type: number;
}

/**
 * Text Clip - Text and karaoke clip
 *
 * Represents a clip containing text events with karaoke display modes.
 * Supports multiple text lines, karaoke effects, color modes.
 * Extends MediaClip with text-specific functionality.
 */
export class CDGMagic_TextClip extends CDGMagic_MediaClip {
  private internal_karaoke_mode: KaraokeModes = KaraokeModes.TITLES;
  private internal_font_size: number = 12;
  private internal_font_index: number = 0;
  private internal_foreground_color: number = 15; // White
  private internal_background_color: number = 0;  // Black
  private internal_outline_color: number = 0;
  private internal_text_content: string = "";
  private internal_antialias_mode: number = 1;

  /**
   * Create text clip
   *
   * @param start_pack Start pack number
   * @param duration Duration in packs
   */
  constructor(start_pack: number = 0, duration: number = 300) {
    super(start_pack, duration);
  }

  /**
   * Get karaoke display mode
   *
   * @returns Current karaoke mode
   */
  karaoke_mode(): KaraokeModes;
  /**
   * Set karaoke display mode
   *
   * @param mode New karaoke mode
   */
  karaoke_mode(mode: KaraokeModes): void;
  karaoke_mode(mode?: KaraokeModes): KaraokeModes | void {
    if (mode === undefined) {
      return this.internal_karaoke_mode;
    } else {
      this.internal_karaoke_mode = mode;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get font size
   *
   * @returns Font size in pixels
   */
  font_size(): number;
  /**
   * Set font size
   *
   * @param size Font size in pixels
   */
  font_size(size: number): void;
  font_size(size?: number): number | void {
    if (size === undefined) {
      return this.internal_font_size;
    } else {
      this.internal_font_size = Math.max(1, Math.min(72, size));
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get font index
   *
   * @returns Font index (0 = default)
   */
  font_index(): number;
  /**
   * Set font index
   *
   * @param index Font index
   */
  font_index(index: number): void;
  font_index(index?: number): number | void {
    if (index === undefined) {
      return this.internal_font_index;
    } else {
      this.internal_font_index = Math.max(0, index);
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get foreground color index
   *
   * @returns Palette index (0-255)
   */
  foreground_color(): number;
  /**
   * Set foreground color index
   *
   * @param index Palette index
   */
  foreground_color(index: number): void;
  foreground_color(index?: number): number | void {
    if (index === undefined) {
      return this.internal_foreground_color;
    } else {
      this.internal_foreground_color = Math.max(0, Math.min(255, index));
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get background color index
   *
   * @returns Palette index (0-255)
   */
  background_color(): number;
  /**
   * Set background color index
   *
   * @param index Palette index
   */
  background_color(index: number): void;
  background_color(index?: number): number | void {
    if (index === undefined) {
      return this.internal_background_color;
    } else {
      this.internal_background_color = Math.max(0, Math.min(255, index));
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get outline color index
   *
   * @returns Palette index (0-255)
   */
  outline_color(): number;
  /**
   * Set outline color index
   *
   * @param index Palette index
   */
  outline_color(index: number): void;
  outline_color(index?: number): number | void {
    if (index === undefined) {
      return this.internal_outline_color;
    } else {
      this.internal_outline_color = Math.max(0, Math.min(255, index));
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get text content
   *
   * @returns Text string
   */
  text_content(): string {
    return this.internal_text_content;
  }

  /**
   * Set text content
   *
   * @param content New text
   */
  set_text_content(content: string): void {
    this.internal_text_content = content || "";
    this.invalidate_graphics_cache();
  }

  /**
   * Get antialiasing mode
   *
   * @returns Antialiasing mode (0=off, 1=on)
   */
  antialias_mode(): number;
  /**
   * Set antialiasing mode
   *
   * @param mode Antialiasing mode
   */
  antialias_mode(mode: number): void;
  antialias_mode(mode?: number): number | void {
    if (mode === undefined) {
      return this.internal_antialias_mode;
    } else {
      this.internal_antialias_mode = mode ? 1 : 0;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Clone text clip with all state
   *
   * @returns New clip with same configuration
   */
  clone(): CDGMagic_TextClip {
    const parent_clone = super.clone();
    const cloned = new CDGMagic_TextClip(
      parent_clone.start_pack(),
      parent_clone.duration()
    );

    // Copy all events
    for (let i = 0; i < parent_clone.event_count(); i++) {
      const event = parent_clone.event_at_index(i);
      if (event) {
        cloned.add_event(event);
      }
    }

    // Copy audio frame state
    cloned.audio_frames(parent_clone.audio_frames());

    // Copy text-specific state
    cloned.karaoke_mode(this.internal_karaoke_mode);
    cloned.font_size(this.internal_font_size);
    cloned.font_index(this.internal_font_index);
    cloned.foreground_color(this.internal_foreground_color);
    cloned.background_color(this.internal_background_color);
    cloned.outline_color(this.internal_outline_color);
    cloned.set_text_content(this.internal_text_content);
    cloned.antialias_mode(this.internal_antialias_mode);

    return cloned;
  }

  /**
   * Serialize text clip to JSON
   *
   * @returns JSON string representation
   */
  to_json(): string {
    const parent_json = JSON.parse(super.to_json());
    const json_obj = {
      type: "TextClip",
      karaoke_mode: this.internal_karaoke_mode,
      font_size: this.internal_font_size,
      font_index: this.internal_font_index,
      foreground_color: this.internal_foreground_color,
      background_color: this.internal_background_color,
      outline_color: this.internal_outline_color,
      text_content: this.internal_text_content,
      antialias_mode: this.internal_antialias_mode,
      ...parent_json,
    };

    return JSON.stringify(json_obj);
  }

  /**
   * Deserialize text clip from JSON
   *
   * @param json_str JSON string representation
   * @returns True if successful
   */
  from_json(json_str: string): boolean {
    try {
      const json_obj = JSON.parse(json_str);

      // Verify type
      if (json_obj.type !== "TextClip") {
        return false;
      }

      // Call parent deserialization
      if (!super.from_json(json_str)) {
        return false;
      }

      // Restore text-specific fields
      if (json_obj.karaoke_mode !== undefined) {
        this.internal_karaoke_mode = json_obj.karaoke_mode;
      }
      if (json_obj.font_size !== undefined) {
        this.internal_font_size = json_obj.font_size;
      }
      if (json_obj.font_index !== undefined) {
        this.internal_font_index = json_obj.font_index;
      }
      if (json_obj.foreground_color !== undefined) {
        this.internal_foreground_color = json_obj.foreground_color;
      }
      if (json_obj.background_color !== undefined) {
        this.internal_background_color = json_obj.background_color;
      }
      if (json_obj.outline_color !== undefined) {
        this.internal_outline_color = json_obj.outline_color;
      }
      if (json_obj.text_content !== undefined) {
        this.internal_text_content = json_obj.text_content;
      }
      if (json_obj.antialias_mode !== undefined) {
        this.internal_antialias_mode = json_obj.antialias_mode;
      }

      return true;
    }

    catch {
      return false;
    }
  }
}

// VIM: set ft=typescript :
// END