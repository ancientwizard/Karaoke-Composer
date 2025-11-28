/**
 * CD+Graphics Magic - Bitmap Clip
 *
 * Specialization of BMPObject for bitmap-based clip content.
 * Extends BMPObject with clip-specific timing and media event management.
 */

import { CDGMagic_BMPObject } from "@/ts/cd+g-magic/CDGMagic_BMPObject";

/**
 * Bitmap Clip: Bitmap-based CD+G content clip
 *
 * Extends BMPObject with:
 * - Clip timing (start, duration)
 * - Media event queue management
 * - File association
 */
export class CDGMagic_BMPClip extends CDGMagic_BMPObject {
  private internal_start_pack: number;
  private internal_duration: number;
  private internal_file_path: string | null;

  /**
   * Constructor: Create a bitmap clip
   *
   * @param requested_start Clip start time (CD+G frames)
   * @param requested_duration Clip duration (CD+G frames)
   */
  constructor(requested_start: number = 0, requested_duration: number = 0) {
    super(); // Initialize BMPObject with no default size
    this.internal_start_pack = requested_start;
    this.internal_duration = requested_duration;
    this.internal_file_path = null;
  }

  /**
   * Get clip start time
   * @returns Start position in frames
   */
  start_pack(): number;
  /**
   * Set clip start time
   * @param requested_start Start position
   */
  start_pack(requested_start: number): void;
  start_pack(requested_start?: number): number | void {
    if (requested_start === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = requested_start;
    }
  }

  /**
   * Get clip duration
   * @returns Duration in frames
   */
  duration(): number;
  /**
   * Set clip duration
   * @param requested_duration Duration
   */
  duration(requested_duration: number): void;
  duration(requested_duration?: number): number | void {
    if (requested_duration === undefined) {
      return this.internal_duration;
    } else {
      this.internal_duration = requested_duration;
    }
  }

  /**
   * Get clip end time
   * @returns End position (start + duration)
   */
  end_pack(): number {
    return this.internal_start_pack + this.internal_duration;
  }

  /**
   * Get file path
   * @returns Path to associated file, or null
   */
  file_path(): string | null;
  /**
   * Set file path
   * @param requested_path New file path
   */
  file_path(requested_path: string | null): void;
  file_path(requested_path?: string | null): string | null | void {
    if (requested_path === undefined) {
      return this.internal_file_path;
    } else {
      this.internal_file_path = requested_path;
    }
  }

  /**
   * Clone bitmap clip
   * @returns New BMPClip with identical data and settings
   */
  clone(): CDGMagic_BMPClip {
    const cloned = new CDGMagic_BMPClip(this.internal_start_pack, this.internal_duration);

    // Copy BMPObject data
    const bmp_clone = super.clone();
    cloned.alter_buffer_size(bmp_clone.width(), bmp_clone.height());

    // Copy pixel data
    const src_data = bmp_clone.get_bitmap_data();
    const dst_data = cloned.get_bitmap_data();
    if (src_data && dst_data) {
      dst_data.set(src_data);
    }

    // Copy file path
    cloned.internal_file_path = this.internal_file_path;

    return cloned;
  }
}

/**
 * Palette Global Clip: Global palette clip specialization
 *
 * Extends BMPObject for palette-only operations.
 */
export class CDGMagic_PALGlobalClip extends CDGMagic_BMPObject {
  private internal_start_pack: number;
  private internal_duration: number;

  /**
   * Constructor: Create palette global clip
   *
   * @param requested_start Clip start time
   * @param requested_duration Clip duration
   */
  constructor(requested_start: number = 0, requested_duration: number = 0) {
    super();
    this.internal_start_pack = requested_start;
    this.internal_duration = requested_duration;
  }

  /**
   * Get clip start time
   */
  start_pack(): number;
  start_pack(requested_start: number): void;
  start_pack(requested_start?: number): number | void {
    if (requested_start === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = requested_start;
    }
  }

  /**
   * Get clip duration
   */
  duration(): number;
  duration(requested_duration: number): void;
  duration(requested_duration?: number): number | void {
    if (requested_duration === undefined) {
      return this.internal_duration;
    } else {
      this.internal_duration = requested_duration;
    }
  }

  /**
   * Get clip end time
   */
  end_pack(): number {
    return this.internal_start_pack + this.internal_duration;
  }

  /**
   * Clone palette global clip
   */
  clone(): CDGMagic_PALGlobalClip {
    const cloned = new CDGMagic_PALGlobalClip(this.internal_start_pack, this.internal_duration);
    const bmp_clone = super.clone();
    cloned.alter_buffer_size(bmp_clone.width(), bmp_clone.height());
    return cloned;
  }
}

/**
 * Text Clip: Text rendering to bitmap specialization
 *
 * Extends BMPObject for text-based content.
 * Handles font rendering and text-specific transformations.
 */
export class CDGMagic_TextClip extends CDGMagic_BMPObject {
  private internal_start_pack: number;
  private internal_duration: number;
  private internal_text: string;
  private internal_font_name: string;
  private internal_font_size: number;

  /**
   * Constructor: Create text clip
   *
   * @param requested_start Clip start time
   * @param requested_duration Clip duration
   */
  constructor(requested_start: number = 0, requested_duration: number = 0) {
    super();
    this.internal_start_pack = requested_start;
    this.internal_duration = requested_duration;
    this.internal_text = "";
    this.internal_font_name = "Arial";
    this.internal_font_size = 12;
  }

  /**
   * Get clip start time
   */
  start_pack(): number;
  start_pack(requested_start: number): void;
  start_pack(requested_start?: number): number | void {
    if (requested_start === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = requested_start;
    }
  }

  /**
   * Get clip duration
   */
  duration(): number;
  duration(requested_duration: number): void;
  duration(requested_duration?: number): number | void {
    if (requested_duration === undefined) {
      return this.internal_duration;
    } else {
      this.internal_duration = requested_duration;
    }
  }

  /**
   * Get clip end time
   */
  end_pack(): number {
    return this.internal_start_pack + this.internal_duration;
  }

  /**
   * Get text content
   */
  text(): string;
  text(requested_text: string): void;
  text(requested_text?: string): string | void {
    if (requested_text === undefined) {
      return this.internal_text;
    } else {
      this.internal_text = requested_text;
    }
  }

  /**
   * Get font name
   */
  font_name(): string;
  font_name(requested_name: string): void;
  font_name(requested_name?: string): string | void {
    if (requested_name === undefined) {
      return this.internal_font_name;
    } else {
      this.internal_font_name = requested_name;
    }
  }

  /**
   * Get font size
   */
  font_size(): number;
  font_size(requested_size: number): void;
  font_size(requested_size?: number): number | void {
    if (requested_size === undefined) {
      return this.internal_font_size;
    } else {
      this.internal_font_size = Math.max(1, requested_size);
    }
  }

  /**
   * Clone text clip
   */
  clone(): CDGMagic_TextClip {
    const cloned = new CDGMagic_TextClip(this.internal_start_pack, this.internal_duration);
    const bmp_clone = super.clone();
    cloned.alter_buffer_size(bmp_clone.width(), bmp_clone.height());
    cloned.internal_text = this.internal_text;
    cloned.internal_font_name = this.internal_font_name;
    cloned.internal_font_size = this.internal_font_size;
    return cloned;
  }
}

/**
 * Scroll Clip: Scrolling bitmap specialization
 *
 * Extends BMPObject for scrolling content.
 * Manages scroll direction and speed.
 */
export class CDGMagic_ScrollClip extends CDGMagic_BMPObject {
  private internal_start_pack: number;
  private internal_duration: number;
  private internal_scroll_direction: number; // 0=up, 1=down, 2=left, 3=right
  private internal_scroll_speed: number;     // Pixels per frame

  /**
   * Constructor: Create scroll clip
   *
   * @param requested_start Clip start time
   * @param requested_duration Clip duration
   */
  constructor(requested_start: number = 0, requested_duration: number = 0) {
    super();
    this.internal_start_pack = requested_start;
    this.internal_duration = requested_duration;
    this.internal_scroll_direction = 0; // Up by default
    this.internal_scroll_speed = 1;     // 1 pixel per frame
  }

  /**
   * Get clip start time
   */
  start_pack(): number;
  start_pack(requested_start: number): void;
  start_pack(requested_start?: number): number | void {
    if (requested_start === undefined) {
      return this.internal_start_pack;
    } else {
      this.internal_start_pack = requested_start;
    }
  }

  /**
   * Get clip duration
   */
  duration(): number;
  duration(requested_duration: number): void;
  duration(requested_duration?: number): number | void {
    if (requested_duration === undefined) {
      return this.internal_duration;
    } else {
      this.internal_duration = requested_duration;
    }
  }

  /**
   * Get clip end time
   */
  end_pack(): number {
    return this.internal_start_pack + this.internal_duration;
  }

  /**
   * Get scroll direction
   * @returns 0=up, 1=down, 2=left, 3=right
   */
  scroll_direction(): number;
  scroll_direction(requested_direction: number): void;
  scroll_direction(requested_direction?: number): number | void {
    if (requested_direction === undefined) {
      return this.internal_scroll_direction;
    } else {
      this.internal_scroll_direction = Math.max(0, Math.min(3, requested_direction));
    }
  }

  /**
   * Get scroll speed
   * @returns Pixels per frame
   */
  scroll_speed(): number;
  scroll_speed(requested_speed: number): void;
  scroll_speed(requested_speed?: number): number | void {
    if (requested_speed === undefined) {
      return this.internal_scroll_speed;
    } else {
      this.internal_scroll_speed = Math.max(0.1, requested_speed);
    }
  }

  /**
   * Clone scroll clip
   */
  clone(): CDGMagic_ScrollClip {
    const cloned = new CDGMagic_ScrollClip(this.internal_start_pack, this.internal_duration);
    const bmp_clone = super.clone();
    cloned.alter_buffer_size(bmp_clone.width(), bmp_clone.height());
    cloned.internal_scroll_direction = this.internal_scroll_direction;
    cloned.internal_scroll_speed = this.internal_scroll_speed;
    return cloned;
  }
}

// VIM: set ft=typescript :
// END