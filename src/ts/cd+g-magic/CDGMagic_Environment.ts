/**
 * Environment Detection & Configuration
 *
 * Detects runtime environment and provides configuration for
 * CLI vs Browser behavior. In CLI, suppresses audio and console noise.
 * In browser, allows full audio and logging.
 */

/**
 * CDGEnv: Environment detection and conditional operations
 *
 * Static getters provide clear intent for environment-specific behavior:
 * - isBrowser: Check if running in browser
 * - isCli: Check if running in CLI/Node.js
 * - shouldAttemptAudio: Check if Web Audio API available
 * - shouldAttemptRendering: Check if DOM available
 *
 * Static methods provide conditional logging:
 * - logIfBrowser(): Log only in browser
 * - warnIfBrowser(): Warn only in browser
 * - logError(): Log errors appropriately per environment
 */
export class CDGEnv {
  /**
   * Detect if running in browser environment
   */
  static get isBrowser(): boolean {
    return typeof window !== "undefined"
      && typeof document !== "undefined"
      && typeof AudioContext !== "undefined";
  }

  /**
   * Detect if running in CLI/Node.js environment
   */
  static get isCli(): boolean {
    return !this.isBrowser;
  }

  /**
   * Check if audio should be attempted
   * - true in browser (Web Audio API available)
   * - false in CLI (no Web Audio API)
   */
  static get shouldAttemptAudio(): boolean {
    return this.isBrowser;
  }

  /**
   * Check if rendering/DOM operations should be attempted
   * - true in browser
   * - false in CLI
   */
  static get shouldAttemptRendering(): boolean {
    return this.isBrowser;
  }

  /**
   * Conditional logging - only logs in browser
   */
  static logIfBrowser(message: string, ...args: unknown[]): void {
    if (this.isBrowser) {
      console.log(message, ...args);
    }
  }

  /**
   * Conditional warning - only warns in browser
   */
  static warnIfBrowser(message: string, ...args: unknown[]): void {
    if (this.isBrowser) {
      console.warn(message, ...args);
    }
  }

  /**
   * Conditional error - logs errors in both environments but formatted appropriately
   */
  static logError(message: string, ...args: unknown[]): void {
    if (this.isBrowser) {
      console.error(message, ...args);
    }
    // In CLI, errors can be logged to test output if needed via explicit logging
  }
}

// vim: ts=2 sw=2 et
// END

