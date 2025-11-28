/**
 * CD+Graphics Magic - Media Event
 *
 * Event structure for CD+G media clips.
 * Represents a single scheduled event with timing, object references, and rendering options.
 */

// Forward type declarations to avoid circular dependencies
type CDGMagic_PALObject = unknown;
type CDGMagic_BMPObject = unknown;

/**
 * Media Event: Single scheduled CD+G composition event
 *
 * Represents a timed event in a CD+G composition:
 * - Timing: start offset, duration, and actual timing
 * - Media: Palette and bitmap object references
 * - Rendering: border, memory preset, scrolling
 * - User data: arbitrary application data pointer
 *
 * Used to compose CD+G frames from media objects with timing control.
 */
export interface CDGMagic_MediaEvent {
  /**
   * Timing: Start position in CD+G frames
   * (Frame = 1/300 of a second at NTSC, 1/250 at PAL)
   */
  start_offset: number;

  /**
   * Timing: Duration in CD+G frames
   */
  duration: number;

  /**
   * Timing: Actual start position (after interpolation/adjustment)
   */
  actual_start_offset: number;

  /**
   * Timing: Actual duration (after interpolation/adjustment)
   */
  actual_duration: number;

  /**
   * Media: Reference to palette object for this event
   * Can be null if no palette change is needed
   * Type: CDGMagic_PALObject | null
   */
  PALObject: CDGMagic_PALObject | null;

  /**
   * Media: Reference to bitmap object for this event
   * Can be null for palette-only events
   * Type: CDGMagic_BMPObject | null
   */
  BMPObject: CDGMagic_BMPObject | null;

  /**
   * Rendering: Border color palette index (0-255)
   * Used if border needs to be drawn
   */
  border_index: number;

  /**
   * Rendering: Memory preset command index
   * Selects which memory preset to apply (0-255)
   */
  memory_preset_index: number;

  /**
   * Rendering: Horizontal scroll offset in pixels
   * Signed: positive = scroll right, negative = scroll left
   */
  x_scroll: number;

  /**
   * Rendering: Vertical scroll offset in pixels
   * Signed: positive = scroll down, negative = scroll up
   */
  y_scroll: number;

  /**
   * Application: User-defined data pointer
   * Can store any application-specific data
   */
  user_obj: unknown;
}

/**
 * Create a new media event with default values
 *
 * @param start_offset Event start position (frames)
 * @param duration Event duration (frames)
 * @param pal_object Palette object reference (optional)
 * @param bmp_object Bitmap object reference (optional)
 * @returns New MediaEvent with sensible defaults
 */
export function createMediaEvent(
  start_offset: number = 0,
  duration: number = 0,
  pal_object: CDGMagic_PALObject | null = null,
  bmp_object: CDGMagic_BMPObject | null = null
): CDGMagic_MediaEvent {
  return {
    start_offset,
    duration,
    actual_start_offset: start_offset,
    actual_duration: duration,
    PALObject: pal_object,
    BMPObject: bmp_object,
    border_index: 0,           // No border by default
    memory_preset_index: 0,    // No memory preset by default
    x_scroll: 0,               // No scroll by default
    y_scroll: 0,               // No scroll by default
    user_obj: null,            // No user data by default
  };
}

/**
 * Clone a media event, creating an independent copy
 *
 * Note: Clones reference the same PALObject and BMPObject (shallow copy).
 * If deep cloning of media objects is needed, clone those separately.
 *
 * @param source Event to clone
 * @returns New event with same values
 */
export function cloneMediaEvent(source: CDGMagic_MediaEvent): CDGMagic_MediaEvent {
  return {
    start_offset: source.start_offset,
    duration: source.duration,
    actual_start_offset: source.actual_start_offset,
    actual_duration: source.actual_duration,
    PALObject: source.PALObject,
    BMPObject: source.BMPObject,
    border_index: source.border_index,
    memory_preset_index: source.memory_preset_index,
    x_scroll: source.x_scroll,
    y_scroll: source.y_scroll,
    user_obj: source.user_obj,
  };
}

/**
 * Compare two media events by start offset
 * Useful for sorting events chronologically
 *
 * @param event_a First event
 * @param event_b Second event
 * @returns Negative if event_a comes before event_b, positive if after, 0 if equal
 */
export function compareMediaEventsByStart(
  event_a: CDGMagic_MediaEvent,
  event_b: CDGMagic_MediaEvent
): number {
  return event_a.start_offset - event_b.start_offset;
}

/**
 * Calculate event end time
 * @param event Event to calculate for
 * @returns Event end position (start_offset + duration)
 */
export function getMediaEventEnd(event: CDGMagic_MediaEvent): number {
  return event.start_offset + event.duration;
}

/**
 * Calculate actual event end time (after timing adjustments)
 * @param event Event to calculate for
 * @returns Event actual end position
 */
export function getMediaEventActualEnd(event: CDGMagic_MediaEvent): number {
  return event.actual_start_offset + event.actual_duration;
}

// VIM: set ft=typescript :
// END
