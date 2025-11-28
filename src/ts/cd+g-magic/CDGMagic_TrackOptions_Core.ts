/**
 * CD+Graphics Magic - Track Options
 *
 * Track-level configuration for CD+G composition.
 * Manages channel assignment and mask settings.
 */

/**
 * Track Options: Track-level configuration
 *
 * Tracks represent separate streams within a CD+G composition.
 * Each track has independent channel and masking configuration.
 * Can be composed into a final CD+G file with all tracks merged.
 *
 * Channels (0-15):
 * - Channel 0: Standard/default channel
 * - Channels 1-15: Extended graphics (less commonly used)
 *
 * Mask (font mask):
 * - Static font mask applied to all text on this track
 * - Not yet fully implemented in CD+Graphics Magic
 */
export class CDGMagic_TrackOptions {
  private internal_track: number;    // Track number/identifier
  private internal_channel: number;  // Channel (0-15)
  private internal_mask_active: number; // Flag: mask is active (0 or 1)

  /**
   * Constructor: Create track options with default settings
   *
   * @param requested_track Track number/identifier (0-based or custom)
   */
  constructor(requested_track: number = 0) {
    this.internal_track = requested_track;
    this.internal_channel = 0;      // Default to channel 0
    this.internal_mask_active = 0;  // Mask disabled by default
  }

  /**
   * Get track number/identifier
   * @returns Track identifier
   */
  track(): number;
  /**
   * Set track number/identifier
   * @param requested_track New track identifier
   */
  track(requested_track: number): void;
  track(requested_track?: number): number | void {
    if (requested_track === undefined) {
      return this.internal_track;
    } else {
      this.internal_track = requested_track;
    }
  }

  /**
   * Get channel assignment (0-15)
   *
   * Channel 0 is standard CD+G.
   * Channels 1-15 are extended graphics (rarely used).
   *
   * @returns Channel number (0-15)
   */
  channel(): number;
  /**
   * Set channel assignment (0-15)
   *
   * @param requested_channel Channel number (will be clamped to 0-15)
   */
  channel(requested_channel: number): void;
  channel(requested_channel?: number): number | void {
    if (requested_channel === undefined) {
      return this.internal_channel;
    } else {
      // Clamp to 0-15 range
      const clamped = Math.max(0, Math.min(15, requested_channel));
      this.internal_channel = clamped;
    }
  }

  /**
   * Get font mask active state
   *
   * Note: Font masking is not yet fully implemented in CD+Graphics Magic.
   * Use for future compatibility.
   *
   * @returns 1 if mask is active, 0 if inactive
   */
  mask_active(): number;
  /**
   * Set font mask active state
   *
   * @param requested_state 1 to activate, 0 to deactivate
   */
  mask_active(requested_state: number): void;
  mask_active(requested_state?: number): number | void {
    if (requested_state === undefined) {
      return this.internal_mask_active;
    } else {
      this.internal_mask_active = requested_state ? 1 : 0;
    }
  }

  /**
   * Clone track options
   * @returns New TrackOptions with identical settings
   */
  clone(): CDGMagic_TrackOptions {
    const cloned = new CDGMagic_TrackOptions(this.internal_track);
    cloned.internal_channel = this.internal_channel;
    cloned.internal_mask_active = this.internal_mask_active;
    return cloned;
  }
}

// VIM: set ft=typescript :
// END