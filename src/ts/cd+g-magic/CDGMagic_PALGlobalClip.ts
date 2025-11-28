/**
 * CD+Graphics Magic - Palette Global Clip
 *
 * Base class for palette modification clips.
 * Extends MediaClip for clips that change the global color palette.
 */

import { CDGMagic_MediaClip } from "./CDGMagic_MediaClip";

/**
 * PAL Global Clip - Global palette modification clip
 *
 * Represents a clip that modifies the global CD+G palette.
 * Contains events for palette color changes.
 * Extends MediaClip with palette-specific functionality.
 */
export class CDGMagic_PALGlobalClip extends CDGMagic_MediaClip {
  /**
   * Create palette global clip
   *
   * @param start_pack Start pack number
   * @param duration Duration in packs
   */
  constructor(start_pack: number = 0, duration: number = 300) {
    super(start_pack, duration);
  }

  /**
   * Clone PAL global clip with all state
   *
   * @returns New clip with same configuration
   */
  clone(): CDGMagic_PALGlobalClip {
    const parent_clone = super.clone();
    const cloned = new CDGMagic_PALGlobalClip(
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

    return cloned;
  }

  /**
   * Serialize PAL global clip to JSON
   *
   * @returns JSON string representation
   */
  to_json(): string {
    const json_obj = {
      type: "PALGlobalClip",
      ...JSON.parse(super.to_json()),
    };

    return JSON.stringify(json_obj);
  }

  /**
   * Deserialize PAL global clip from JSON
   *
   * @param json_str JSON string representation
   * @returns True if successful
   */
  from_json(json_str: string): boolean {
    try {
      const json_obj = JSON.parse(json_str);

      // Verify type
      if (json_obj.type !== "PALGlobalClip") {
        return false;
      }

      // Call parent deserialization
      return super.from_json(json_str);
    } catch {
      return false;
    }
  }
}

// VIM: set ft=typescript :
// END
