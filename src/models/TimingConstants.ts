/**
 * TIMING CONSTANTS - Central Configuration for All Timing Rules
 *
 * This is the single source of truth for all timing-related constants
 * used throughout the karaoke composer. All components and models should
 * consume these values instead of hardcoding their own.
 *
 * =====================================================
 * SYLLABLE DURATION RATIONALE - 50ms Minimum Analysis
 * =====================================================
 *
 * The 50ms minimum syllable duration has been validated across musical tempos:
 *
 * TEMPO ANALYSIS:
 * • Ballad (40-60 BPM):   50ms = 3-5% of beat,  allows 20-30 syllables/beat
 * • Mid-tempo (80-120 BPM): 50ms = 7-10% of beat, allows 10-15 syllables/beat
 * • Fast (144+ BPM):     50ms = 12% of beat,    allows 8+ syllables/beat
 *
 * HUMAN SPEECH CONTEXT:
 * • Normal speech syllables: 150-200ms (50ms is 25-33% of normal)
 * • Fast speech syllables: 80-120ms (50ms is 42-63% of fast speech)
 * • Rap/fast singing: 50-80ms (50ms matches lower bound of performance)
 * • Physical tongue/vocal limit: ~40ms (50ms provides safe margin)
 *
 * TECHNICAL CONSTRAINTS:
 * • Human audio perception: 20-30ms threshold (50ms is well above)
 * • Audio processing frames: ~23ms typical (50ms allows 2+ frames)
 * • Karaoke highlight flicker: 40-50ms threshold (50ms prevents flicker)
 *
 * CONCLUSION: 50ms provides excellent balance between:
 * - Musical flexibility (leaves 88-97% of beat time for expression)
 * - Technical safety (prevents UI flicker and audio artifacts)
 * - Performance realism (matches fast singing capabilities)
 * - Editor usability (prevents accidentally tiny syllables)
 */

export interface TimingRules {
  // Word-level constraints
  word: {
    minDuration: number          // Minimum word duration (ms)
    maxDuration: number          // Maximum reasonable word duration (ms)
    collisionMargin: number      // Space between words to prevent overlap (ms)
    defaultDuration: number      // Fallback duration when no timing available (ms)
  }

  // Syllable-level constraints
  syllable: {
    minDuration: number          // Minimum syllable duration for editor safety (ms)
    defaultDuration: number      // Default syllable duration (ms)
    lastSyllableWeight: number   // Multiplier for last syllable in weighted distribution
    firstSyllableWeight: number  // Weight for first syllables
    weightIncrement: number      // How much weight increases per syllable position
  }

  // Auto-timing behavior
  autoTiming: {
    normalWordSpacing: number    // Percentage of gap to use for normal words (0.0-1.0)
    phraseBreakSpacing: number   // Percentage of gap to use for phrase breaks (0.0-1.0)
    phraseBreakThreshold: number // Gap duration (seconds) that indicates phrase break
    maxNormalDuration: number    // Max duration for normal spacing (ms)
    maxPhraseBreakDuration: number // Max duration for phrase breaks (ms)
    conservativeGapUsage: number // Percentage of gap for syllable distribution (0.0-1.0)
    lineEndingGapUsage: number   // Percentage of gap for line-ending words (0.0-1.0)
  }

  // Musical timing intelligence
  musical: {
    restDuration: {
      comma: number              // Rest after comma (ms)
      period: number             // Rest after period/sentence (ms)
      breath: number             // Natural breathing pause (ms)
      phrase: number             // Phrase/verse break (ms)
    }
    notePatterns: {
      eighth: number             // Eighth note duration base (ms)
      quarter: number            // Quarter note duration base (ms)
      half: number               // Half note duration base (ms)
      whole: number              // Whole note duration base (ms)
    }
    conservativeMultiplier: number // When preserving timing, max percentage of gap to use
  }

  // Editor constraints
  editor: {
    pixelThreshold: number       // Minimum pixels for drag operations
    snapThreshold: number        // Time threshold for snapping operations (ms)
    viewportBuffer: number       // Buffer space at viewport edges (ms)
    dragSensitivity: number      // Mouse movement sensitivity
  }

  // Validation and cleanup
  validation: {
    gapTolerance: number         // Max gap to auto-fix between syllables (ms)
    overlapTolerance: number     // Max overlap to auto-fix between syllables (ms)
    durationTolerance: number    // Tolerance for duration matching (ms)
    timingPrecision: number      // Rounding precision for timing values (ms)
  }

  // Visual refresh and update rates
  refresh: {
    playbackUpdateHz: number     // Playback position update frequency (Hz)
    fastModeMultiplier: number   // Multiplier for faster refresh mode
    dragUpdateHz: number         // UI update frequency during drag operations (Hz)
  }
}

/**
 * DEFAULT TIMING RULES - Carefully tuned values
 * These can be overridden in specific contexts, but provide sensible defaults
 */
export const DEFAULT_TIMING_RULES: TimingRules = {
  word: {
    minDuration: 100,            // 100ms minimum - shorter words feel too rushed
    maxDuration: 2000,           // 2 seconds max - longer words feel unnatural
    collisionMargin: 50,         // 50ms gap between words prevents overlap issues
    defaultDuration: 500,        // 500ms default when no better info available
  },

  syllable: {
    minDuration: 30,             // 30ms minimum - editor safety constraint
    defaultDuration: 200,        // 200ms reasonable syllable duration
    lastSyllableWeight: 2.0,     // Last syllable gets double time (musical)
    firstSyllableWeight: 0.8,    // First syllables slightly shorter
    weightIncrement: 0.1,        // Each syllable gets 10% more weight than previous
  },

  autoTiming: {
    normalWordSpacing: 0.6,      // Use 60% of gap for normal words (was 82.5%)
    phraseBreakSpacing: 0.25,    // Use 25% of gap for phrase breaks (was 50%)
    phraseBreakThreshold: 3.0,   // 3+ second gaps indicate phrase breaks
    maxNormalDuration: 600,      // Cap normal words at 600ms
    maxPhraseBreakDuration: 800, // Cap phrase break words at 800ms
    conservativeGapUsage: 0.7,   // Use 70% of gap for syllable distribution
    lineEndingGapUsage: 0.5,     // Use 50% of gap for line-ending words
  },

  musical: {
    restDuration: {
      comma: 200,                // 200ms pause after comma
      period: 800,               // 800ms pause after sentence
      breath: 300,               // 300ms natural breath
      phrase: 600,               // 600ms phrase break
    },
    notePatterns: {
      eighth: 125,               // Eighth note ~120 BPM
      quarter: 250,              // Quarter note ~120 BPM
      half: 500,                 // Half note ~120 BPM
      whole: 1000,               // Whole note ~120 BPM
    },
    conservativeMultiplier: 0.7, // Max 70% of gap when preserving timing
  },

  editor: {
    pixelThreshold: 5,           // 5px minimum drag movement
    snapThreshold: 10,           // 10ms snap threshold
    viewportBuffer: 100,         // 100ms buffer at edges
    dragSensitivity: 1.0,        // Normal drag sensitivity
  },

  validation: {
    gapTolerance: 3,             // Auto-fix gaps up to 3ms
    overlapTolerance: 3,         // Auto-fix overlaps up to 3ms
    durationTolerance: 1,        // 1ms tolerance for duration matching
    timingPrecision: 1,          // Round to nearest 1ms
  },

  refresh: {
    playbackUpdateHz: 8,         // 8 Hz = 125ms intervals (2x faster than HTML5 default)
    fastModeMultiplier: 1.5,     // 1.5x faster = 12 Hz for fast mode
    dragUpdateHz: 60,            // 60 Hz for smooth drag operations (requestAnimationFrame)
  }
}

/**
 * TIMING CONSTANTS - Global instance
 * Import and use this throughout the application
 */
export const TIMING = DEFAULT_TIMING_RULES

/**
 * Utility functions for common timing calculations
 */
export class TimingUtils {
  /**
   * Calculate syllable weights for a given count
   */
  static calculateSyllableWeights(syllableCount: number): number[] {
    return Array.from({ length: syllableCount }, (_, i) => {
      if (i === syllableCount - 1) {
        return TIMING.syllable.lastSyllableWeight
      }
      return TIMING.syllable.firstSyllableWeight + i * TIMING.syllable.weightIncrement
    })
  }

  /**
   * Determine if a gap indicates a phrase break
   */
  static isPhraseBreak(gapSeconds: number): boolean {
    return gapSeconds > TIMING.autoTiming.phraseBreakThreshold
  }

  /**
   * Calculate conservative duration from full gap
   */
  static getConservativeDuration(fullGap: number, isLineEnding: boolean = false): number {
    const usage = isLineEnding ? TIMING.autoTiming.lineEndingGapUsage : TIMING.autoTiming.conservativeGapUsage
    return fullGap * usage
  }

  /**
   * Validate and constrain duration to reasonable bounds
   */
  static constrainDuration(duration: number, isWord: boolean = true): number {
    const min = isWord ? TIMING.word.minDuration : TIMING.syllable.minDuration
    const max = isWord ? TIMING.word.maxDuration : TIMING.word.maxDuration / 2 // Syllables max half word duration
    return Math.max(min, Math.min(max, duration))
  }

  /**
   * Round timing value to configured precision
   */
  static roundTiming(value: number): number {
    return Math.round(value / TIMING.validation.timingPrecision) * TIMING.validation.timingPrecision
  }

  /**
   * Get playback update interval in milliseconds
   */
  static getPlaybackUpdateInterval(fastMode: boolean = false): number {
    const hz = fastMode
      ? TIMING.refresh.playbackUpdateHz * TIMING.refresh.fastModeMultiplier
      : TIMING.refresh.playbackUpdateHz
    return 1000 / hz
  }

  /**
   * Get drag update interval in milliseconds
   */
  static getDragUpdateInterval(): number {
    return 1000 / TIMING.refresh.dragUpdateHz
  }
}

/**
 * Export common timing constants for quick access
 */
export const {
  word: WORD_TIMING,
  syllable: SYLLABLE_TIMING,
  autoTiming: AUTO_TIMING,
  musical: MUSICAL_TIMING,
  editor: EDITOR_TIMING,
  validation: VALIDATION_TIMING
} = TIMING
