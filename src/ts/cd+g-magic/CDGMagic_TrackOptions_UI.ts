/**
 * CD+Graphics Magic - Track Options (UI Version)
 *
 * UI-focused track-level configuration with observable state management.
 * Designed for reactive frameworks (Vue, React, Angular) with change notifications.
 */

/**
 * Track Options (UI Version): Observable track configuration
 *
 * Extends core TrackOptions with reactive state management.
 * Changes to properties trigger observer notifications for UI updates.
 * Designed for frameworks with reactive data binding.
 *
 * Observers are called for any property change:
 * - channel assignment change
 * - mask state change
 * - clone operations
 *
 * Multiple observers can be attached for different UI components.
 */
export class CDGMagic_TrackOptions_UI {
  private internal_track: number;       // Track number/identifier
  private internal_channel: number;     // Channel (0-15)
  private internal_mask_active: number; // Flag: mask is active (0 or 1)
  private internal_observers: Set<() => void>; // Reactive observers

  /**
   * Observer callback type for state changes
   */
  private observer_callback: (() => void) | null;

  /**
   * Constructor: Create observable track options
   *
   * @param requested_track Track number/identifier (0-based or custom)
   */
  constructor(requested_track: number = 0) {
    this.internal_track = requested_track;
    this.internal_channel = 0;         // Default to channel 0
    this.internal_mask_active = 0;     // Mask disabled by default
    this.internal_observers = new Set();
    this.observer_callback = null;
  }

  /**
   * Get track number/identifier
   * @returns Track identifier
   */
  track(): number;
  /**
   * Set track number/identifier (does not notify observers - track ID shouldn't change)
   * @param requested_track New track identifier
   */
  track(requested_track: number): void;
  track(requested_track?: number): number | void {
    if (requested_track === undefined) {
      return this.internal_track;
    } else {
      this.internal_track = requested_track;
      // Note: track ID changes don't trigger observers
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
   * Set channel assignment (0-15) with observer notification
   *
   * Triggers all attached observers when value changes.
   * Value is automatically clamped to 0-15 range and truncated to integer.
   *
   * @param requested_channel Channel number (will be clamped to 0-15)
   */
  channel(requested_channel: number): void;
  channel(requested_channel?: number): number | void {
    if (requested_channel === undefined) {
      return this.internal_channel;
    } else {
      // Truncate to integer and clamp to 0-15 range
      const truncated = Math.trunc(requested_channel);
      const clamped = Math.max(0, Math.min(15, truncated));
      if (clamped !== this.internal_channel) {
        this.internal_channel = clamped;
        this.notify_observers();
      }
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
   * Set font mask active state with observer notification
   *
   * Triggers all attached observers when value changes.
   *
   * @param requested_state 1 to activate, 0 to deactivate
   */
  mask_active(requested_state: number): void;
  mask_active(requested_state?: number): number | void {
    if (requested_state === undefined) {
      return this.internal_mask_active;
    } else {
      const new_state = requested_state ? 1 : 0;
      if (new_state !== this.internal_mask_active) {
        this.internal_mask_active = new_state;
        this.notify_observers();
      }
    }
  }

  /**
   * Attach observer callback for reactive state changes
   *
   * Callback will be invoked whenever a property changes.
   * Use this for reactive framework integration (Vue computed, React setState, etc).
   *
   * @param callback Function to call on state change
   * @returns Function to detach observer (call to unsubscribe)
   */
  attach_observer(callback: () => void): () => void {
    this.internal_observers.add(callback);
    // Return detach function
    return () => {
      this.internal_observers.delete(callback);
    };
  }

  /**
   * Get all attached observers count
   * @returns Number of active observers
   */
  observer_count(): number {
    return this.internal_observers.size;
  }

  /**
   * Clear all attached observers
   */
  clear_observers(): void {
    this.internal_observers.clear();
  }

  /**
   * Notify all attached observers of state change
   * @internal
   */
  private notify_observers(): void {
    this.internal_observers.forEach((callback) => {
      callback();
    });
  }

  /**
   * Clone observable track options
   *
   * Clone includes all property values but NOT observer subscriptions.
   * Cloned instance starts with empty observer set.
   *
   * @returns New TrackOptions_UI with identical settings
   */
  clone(): CDGMagic_TrackOptions_UI {
    const cloned = new CDGMagic_TrackOptions_UI(this.internal_track);
    cloned.internal_channel = this.internal_channel;
    cloned.internal_mask_active = this.internal_mask_active;
    // Note: observers not copied - new instance starts clean
    return cloned;
  }

  /**
   * Batch update: Update multiple properties without triggering observer multiple times
   *
   * Applies all updates, then notifies observers once.
   * Useful for multiple simultaneous changes.
   *
   * @param updates Object with channel and/or mask_active properties
   */
  batch_update(updates: { channel?: number; mask_active?: number }): void {
    let changed = false;

    if (updates.channel !== undefined) {
      const truncated = Math.trunc(updates.channel);
      const clamped = Math.max(0, Math.min(15, truncated));
      if (clamped !== this.internal_channel) {
        this.internal_channel = clamped;
        changed = true;
      }
    }

    if (updates.mask_active !== undefined) {
      const new_state = updates.mask_active ? 1 : 0;
      if (new_state !== this.internal_mask_active) {
        this.internal_mask_active = new_state;
        changed = true;
      }
    }

    if (changed) {
      this.notify_observers();
    }
  }
}

// VIM: set ft=typescript :
// END