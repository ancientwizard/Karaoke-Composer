/**
 * CD+Graphics Magic - Scroll Clip
 *
 * Base class for scrolling effect clips.
 * Extends MediaClip for clips with horizontal/vertical scrolling.
 */

import { CDGMagic_MediaClip } from "./CDGMagic_MediaClip";

/**
 * Scroll direction enumeration
 */
export enum ScrollDirection {
  NONE = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
  DOWN = 4,
  BOTH = 5,
}

/**
 * Scroll Clip - Scrolling effect clip
 *
 * Represents a clip with scrolling effects.
 * Supports horizontal and vertical scroll offsets.
 * Extends MediaClip with scroll-specific functionality.
 */
export class CDGMagic_ScrollClip extends CDGMagic_MediaClip {
  private internal_scroll_direction: ScrollDirection = ScrollDirection.NONE;
  private internal_scroll_speed: number = 1; // pixels per frame
  private internal_x_offset: number = 0;
  private internal_y_offset: number = 0;
  private internal_wrap_mode: boolean = false; // Wrap text instead of scroll

  /**
   * Create scroll clip
   *
   * @param start_pack Start pack number
   * @param duration Duration in packs
   */
  constructor(start_pack: number = 0, duration: number = 300) {
    super(start_pack, duration);
  }

  /**
   * Get scroll direction
   *
   * @returns Current scroll direction
   */
  scroll_direction(): ScrollDirection;
  /**
   * Set scroll direction
   *
   * @param direction New scroll direction
   */
  scroll_direction(direction: ScrollDirection): void;
  scroll_direction(direction?: ScrollDirection): ScrollDirection | void {
    if (direction === undefined) {
      return this.internal_scroll_direction;
    } else {
      this.internal_scroll_direction = direction;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get scroll speed
   *
   * @returns Pixels per frame
   */
  scroll_speed(): number;
  /**
   * Set scroll speed
   *
   * @param speed Pixels per frame
   */
  scroll_speed(speed: number): void;
  scroll_speed(speed?: number): number | void {
    if (speed === undefined) {
      return this.internal_scroll_speed;
    } else {
      this.internal_scroll_speed = Math.max(0, speed);
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get X offset
   *
   * @returns Horizontal offset in pixels
   */
  x_offset(): number;
  /**
   * Set X offset
   *
   * @param offset Horizontal offset
   */
  x_offset(offset: number): void;
  x_offset(offset?: number): number | void {
    if (offset === undefined) {
      return this.internal_x_offset;
    } else {
      this.internal_x_offset = offset;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get Y offset
   *
   * @returns Vertical offset in pixels
   */
  y_offset(): number;
  /**
   * Set Y offset
   *
   * @param offset Vertical offset
   */
  y_offset(offset: number): void;
  y_offset(offset?: number): number | void {
    if (offset === undefined) {
      return this.internal_y_offset;
    } else {
      this.internal_y_offset = offset;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Get wrap mode
   *
   * @returns True if wrapping text instead of scrolling
   */
  wrap_mode(): boolean;
  /**
   * Set wrap mode
   *
   * @param wrap Whether to wrap text
   */
  wrap_mode(wrap: boolean): void;
  wrap_mode(wrap?: boolean): boolean | void {
    if (wrap === undefined) {
      return this.internal_wrap_mode;
    } else {
      this.internal_wrap_mode = wrap;
      this.invalidate_graphics_cache();
    }
  }

  /**
   * Clone scroll clip with all state
   *
   * @returns New clip with same configuration
   */
  clone(): CDGMagic_ScrollClip {
    const parent_clone = super.clone();
    const cloned = new CDGMagic_ScrollClip(
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

    // Copy scroll-specific state
    cloned.scroll_direction(this.internal_scroll_direction);
    cloned.scroll_speed(this.internal_scroll_speed);
    cloned.x_offset(this.internal_x_offset);
    cloned.y_offset(this.internal_y_offset);
    cloned.wrap_mode(this.internal_wrap_mode);

    return cloned;
  }

  /**
   * Serialize scroll clip to JSON
   *
   * @returns JSON string representation
   */
  to_json(): string {
    const parent_json = JSON.parse(super.to_json());
    const json_obj = {
      type: "ScrollClip",
      scroll_direction: this.internal_scroll_direction,
      scroll_speed: this.internal_scroll_speed,
      x_offset: this.internal_x_offset,
      y_offset: this.internal_y_offset,
      wrap_mode: this.internal_wrap_mode,
      ...parent_json,
    };

    return JSON.stringify(json_obj);
  }

  /**
   * Deserialize scroll clip from JSON
   *
   * @param json_str JSON string representation
   * @returns True if successful
   */
  from_json(json_str: string): boolean {
    try {
      const json_obj = JSON.parse(json_str);

      // Verify type
      if (json_obj.type !== "ScrollClip") {
        return false;
      }

      // Call parent deserialization
      if (!super.from_json(json_str)) {
        return false;
      }

      // Restore scroll-specific fields
      if (json_obj.scroll_direction !== undefined) {
        this.internal_scroll_direction = json_obj.scroll_direction;
      }
      if (json_obj.scroll_speed !== undefined) {
        this.internal_scroll_speed = json_obj.scroll_speed;
      }
      if (json_obj.x_offset !== undefined) {
        this.internal_x_offset = json_obj.x_offset;
      }
      if (json_obj.y_offset !== undefined) {
        this.internal_y_offset = json_obj.y_offset;
      }
      if (json_obj.wrap_mode !== undefined) {
        this.internal_wrap_mode = json_obj.wrap_mode;
      }

      return true;
    } catch {
      return false;
    }
  }
}

// VIM: set ft=typescript :
// END
