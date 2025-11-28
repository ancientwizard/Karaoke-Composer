/**
 * CD+Graphics Magic - Time Output Display
 *
 * Format and display time in MM:SS:FF (minutes:seconds:frames) format.
 * Used throughout the UI for timeline and playback position display.
 */

/**
 * TimeOutput: CD+G frame time formatting
 *
 * Converts between numerical time values and MM:SS:FF display format.
 *
 * Format Details:
 * - MM: Minutes (00-59)
 * - SS: Seconds (00-59)
 * - FF: Frames (00-299, where 300 frames = 1 second at CD+G standard)
 *
 * Examples:
 * - 0 frames → "00:00:00"
 * - 300 frames → "00:01:00" (1 second)
 * - 18000 frames → "01:00:00" (1 minute)
 * - 54300 frames → "03:01:00" (3 minutes 1 second)
 *
 * Use Cases:
 * 1. Display current playback position
 * 2. Show clip start/end times
 * 3. Format timeline markers
 * 4. Display total duration
 */
export class CDGMagic_TimeOutput {
  // Frames per second (CD+G standard)
  private static readonly FRAMES_PER_SECOND = 300;
  private static readonly FRAMES_PER_MINUTE = 300 * 60;

  /**
   * Constructor: TimeOutput is utility class (no state)
   */
  constructor() {}

  /**
   * Convert frame number to MM:SS:FF string
   *
   * @param frame_number Frame number (0-based)
   * @returns String in format "MM:SS:FF"
   */
  static format_frames(frame_number: number): string {
    const clamped = Math.max(0, Math.floor(frame_number));

    const minutes = Math.floor(
      clamped / CDGMagic_TimeOutput.FRAMES_PER_MINUTE
    );
    const remainder_after_minutes =
      clamped % CDGMagic_TimeOutput.FRAMES_PER_MINUTE;

    const seconds = Math.floor(
      remainder_after_minutes / CDGMagic_TimeOutput.FRAMES_PER_SECOND
    );
    const frames =
      remainder_after_minutes % CDGMagic_TimeOutput.FRAMES_PER_SECOND;

    // Format with zero padding
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    const ff = String(frames).padStart(2, "0");

    return `${mm}:${ss}:${ff}`;
  }

  /**
   * Convert seconds to MM:SS:FF string
   *
   * @param seconds Time in seconds
   * @returns String in format "MM:SS:FF"
   */
  static format_seconds(seconds: number): string {
    const frames = Math.floor(
      seconds * CDGMagic_TimeOutput.FRAMES_PER_SECOND
    );
    return CDGMagic_TimeOutput.format_frames(frames);
  }

  /**
   * Parse MM:SS:FF string to frame number
   *
   * Handles various input formats:
   * - "01:02:30" → (1×18000) + (2×300) + 30 = 18630 frames
   * - "00:05:150" → (0×18000) + (5×300) + 150 = 1650 frames
   * - "100" → 100 frames (single number)
   * - "1:30" → (1×300) + 30 = 330 frames
   *
   * @param time_string Input string (MM:SS:FF or variations)
   * @returns Frame number, or 0 if parse fails
   */
  static parse_to_frames(time_string: string): number {
    time_string = time_string.trim();

    // Split by colons
    const parts = time_string.split(":");

    if (parts.length === 1) {
      // Single number: frames
      const frames = parseInt(parts[0], 10);
      return isNaN(frames) ? 0 : Math.max(0, frames);
    }

    if (parts.length === 2) {
      // MM:SS or MM:FF format (assume MM:SS)
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);

      if (isNaN(minutes) || isNaN(seconds)) {
        return 0;
      }

      return (
        Math.max(0, minutes) * CDGMagic_TimeOutput.FRAMES_PER_MINUTE +
        Math.max(0, seconds) * CDGMagic_TimeOutput.FRAMES_PER_SECOND
      );
    }

    if (parts.length === 3) {
      // MM:SS:FF format
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      const frames = parseInt(parts[2], 10);

      if (isNaN(minutes) || isNaN(seconds) || isNaN(frames)) {
        return 0;
      }

      return (
        Math.max(0, minutes) * CDGMagic_TimeOutput.FRAMES_PER_MINUTE +
        Math.max(0, seconds) * CDGMagic_TimeOutput.FRAMES_PER_SECOND +
        Math.max(0, frames)
      );
    }

    // Invalid format
    return 0;
  }

  /**
   * Parse MM:SS:FF string to seconds
   *
   * @param time_string Input string
   * @returns Time in seconds
   */
  static parse_to_seconds(time_string: string): number {
    const frames = CDGMagic_TimeOutput.parse_to_frames(time_string);
    return frames / CDGMagic_TimeOutput.FRAMES_PER_SECOND;
  }

  /**
   * Validate MM:SS:FF format string
   *
   * Checks if string is valid MM:SS:FF or related format.
   *
   * @param time_string String to validate
   * @returns True if valid format
   */
  static is_valid_format(time_string: string): boolean {
    time_string = time_string.trim();

    // Allow single number
    if (/^\d+$/.test(time_string)) {
      return true;
    }

    // Allow MM:SS or MM:SS:FF
    if (/^\d+:\d+$/.test(time_string)) {
      return true;
    }

    if (/^\d+:\d+:\d+$/.test(time_string)) {
      return true;
    }

    return false;
  }

  /**
   * Get frames per second (CD+G standard)
   *
   * @returns 300 (CD+G frame standard)
   */
  static frames_per_second(): number {
    return CDGMagic_TimeOutput.FRAMES_PER_SECOND;
  }

  /**
   * Get frames per minute
   *
   * @returns 18000 (300 fps × 60 seconds)
   */
  static frames_per_minute(): number {
    return CDGMagic_TimeOutput.FRAMES_PER_MINUTE;
  }

  /**
   * Convert duration string to total duration for display
   *
   * @param frame_count Total frame count
   * @returns String "MM:SS:FF"
   */
  static format_duration(frame_count: number): string {
    return CDGMagic_TimeOutput.format_frames(frame_count);
  }
}

// VIM: set ft=typescript :
// END