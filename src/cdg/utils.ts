// Small CDG-related utilities extracted for reuse.
// Keep implementations minimal and well-typed; these are currently
// thin wrappers around simple calculations used by the debug generator
// and (eventually) the scheduler.

export function msToPacks(ms: number, pps = 300): number {
  return Math.floor((ms / 1000) * pps)
}

/**
 * Convert a time value from parsed JSON into CDG packet units.
 *
 * The parsed JSON may express times either in packet counts or in
 * milliseconds. This helper accepts explicit flags to control the
 * interpretation rather than relying on ambient globals.
 */
export function timeToPacks(value: number | undefined, pps = 300, timesInMs = false, timesInPacks = false): number {
  if (value == null) return 0
  if (timesInMs && !timesInPacks) return msToPacks(value, pps)
  return Math.floor(value)
}

/**
 * Compute the output duration in seconds from parsed JSON timeline data.
 * Behavior:
 *  - If parsedJson.duration_seconds > 0, return that (ceiled to integer seconds)
 *  - Else if parsedJson.duration_ms > 0, convert to seconds
 *  - Else if maxEndPacksEstimate > 0, convert to seconds via pps and add 1s padding
 *  - Else return fallbackSeconds
 */
export function computeDurationSecondsFromParsedJson(parsedJson: any, maxEndPacksEstimate: number, ppsVal: number, fallbackSeconds = 20): number {
  if (parsedJson.duration_seconds && Number.isFinite(parsedJson.duration_seconds) && parsedJson.duration_seconds > 0) {
    return Math.ceil(parsedJson.duration_seconds)
  }
  if (parsedJson.duration_ms && Number.isFinite(parsedJson.duration_ms) && parsedJson.duration_ms > 0) {
    return Math.ceil(parsedJson.duration_ms / 1000)
  }
  if (maxEndPacksEstimate && maxEndPacksEstimate > 0) {
    const timelineSeconds = Math.ceil(maxEndPacksEstimate / Math.max(1, ppsVal))
    return Math.max(1, timelineSeconds + 1)
  }
  return fallbackSeconds
}

export default {
  msToPacks,
  timeToPacks,
  computeDurationSecondsFromParsedJson,
}
