/**
 * MUSICAL TIMING MODEL - Beat-Aware Syllable Distribution
 * Addresses the user's concern that current timing "takes up all available space"
 * instead of being musically intelligent about rests and note patterns.
 */

import type { WordTiming, SyllableTiming } from '@/types/karaoke'
import { TIMING, TimingUtils } from '@/models/TimingConstants'

export interface MusicalNote {
  type: 'eighth' | 'quarter' | 'half' | 'whole'
  duration: number // in milliseconds
}

export interface TimingContext {
  bpm?: number // beats per minute
  timeSignature?: [number, number] // e.g., [4, 4]
  estimatedBeatDuration?: number // milliseconds per beat
}

export interface RestPattern {
  hasRest: boolean
  restType: 'comma' | 'period' | 'breath' | 'phrase'
  estimatedRestDuration: number
}

/**
 * Analyze text for musical rest indicators
 */
export function detectRestPattern(
  currentWord: string,
  nextWordText?: string,
  timeToNextWord?: number
): RestPattern {
  // Check punctuation that indicates rests
  const wordEndsWithComma = /[,;]$/.test(currentWord)
  const wordEndsWithPeriod = /[.!?]$/.test(currentWord)
  const nextWordIsCapitalized = nextWordText ? /^[A-Z]/.test(nextWordText) : false

  if (wordEndsWithPeriod || nextWordIsCapitalized) {
    return {
      hasRest: true,
      restType: 'phrase',
      estimatedRestDuration: TIMING.musical.restDuration.period
    }
  }

  if (wordEndsWithComma) {
    return {
      hasRest: true,
      restType: 'comma',
      estimatedRestDuration: TIMING.musical.restDuration.comma
    }
  }

  // Use timing gap to infer rest
  if (timeToNextWord && timeToNextWord > 1000) {
    return {
      hasRest: true,
      restType: 'breath',
      estimatedRestDuration: Math.min(timeToNextWord * 0.3, TIMING.musical.restDuration.breath)
    }
  }

  return {
    hasRest: false,
    restType: 'breath',
    estimatedRestDuration: 0
  }
}

/**
 * Estimate note durations based on syllable count and musical context
 */
export function estimateNotePattern(
  syllableCount: number,
  availableTime: number,
  context: TimingContext = {}
): MusicalNote[] {
  const { estimatedBeatDuration = 500 } = context // Default: 120 BPM = 500ms per beat

  // Common note durations in milliseconds (at 120 BPM)
  const noteDurations = {
    eighth: estimatedBeatDuration / 2,    // 250ms
    quarter: estimatedBeatDuration,       // 500ms
    half: estimatedBeatDuration * 2,      // 1000ms
    whole: estimatedBeatDuration * 4      // 2000ms
  }

  // Musical patterns based on syllable count
  if (syllableCount === 1) {
    // Single syllable - usually gets a clean note value
    if (availableTime > noteDurations.half) {
      return [{
        type: 'half', duration: noteDurations.half
      }]
    } else if (availableTime > noteDurations.quarter) {
      return [{
        type: 'quarter', duration: noteDurations.quarter
      }]
    } else {
      return [{
        type: 'eighth', duration: noteDurations.eighth
      }]
    }
  }

  if (syllableCount === 2) {
    // Two syllables - common patterns: quarter+quarter, eighth+quarter, etc.
    const halfTime = availableTime / 2
    if (halfTime > noteDurations.quarter) {
      return [
        {
          type: 'quarter', duration: noteDurations.quarter
        },
        {
          type: 'quarter', duration: noteDurations.quarter
        }
      ]
    } else {
      return [
        {
          type: 'eighth', duration: noteDurations.eighth
        },
        {
          type: 'quarter', duration: noteDurations.quarter
        }
      ]
    }
  }

  if (syllableCount === 3) {
    // Three syllables - triplet or eighth+quarter pattern
    return [
      {
        type: 'eighth', duration: noteDurations.eighth
      },
      {
        type: 'eighth', duration: noteDurations.eighth
      },
      {
        type: 'quarter', duration: noteDurations.quarter
      }
    ]
  }

  // Fallback: distribute evenly but prefer musical note values
  const avgDuration = availableTime / syllableCount
  const closestNote = avgDuration > noteDurations.quarter ? 'quarter' : 'eighth'

  return Array(syllableCount).fill(null).map(() => ({
    type: closestNote,
    duration: noteDurations[closestNote]
  })) as MusicalNote[]
}

/**
 * MUSICAL SYLLABLE DISTRIBUTION - The core improvement
 * Instead of filling all available space, use musical intelligence
 */
export function distributeSyllablesMusically(
  word: WordTiming,
  wordStartTime: number,
  timeToNextWord: number,
  nextWordText?: string,
  context: TimingContext = {},
  silent = false,
  preserveWordBoundaries = false
): void {
  if (word.syllables.length === 0) return

  // Step 1: Detect if there should be a rest after this word
  const restPattern = detectRestPattern(word.word, nextWordText, timeToNextWord)

  // Step 2: Calculate available time for actual singing (minus rest)
  let availableTime = timeToNextWord - restPattern.estimatedRestDuration

  // If preserving word boundaries, constrain to existing word duration
  if (preserveWordBoundaries && word.endTime !== undefined && word.startTime !== undefined) {
    const existingWordDuration = word.endTime - word.startTime
    availableTime = Math.min(availableTime, existingWordDuration)
    console.log(`🎵 Constraining "${word.word}" to existing duration: ${existingWordDuration}ms`)
  }

  // Step 3: Use musical note patterns instead of filling all space
  const notePattern = estimateNotePattern(word.syllables.length, availableTime, context)

  // Step 4: Apply timing to syllables
  let currentTime = wordStartTime
  word.syllables.forEach((syllable, index) => {
    const note = notePattern[index] || notePattern[notePattern.length - 1]

    syllable.startTime = currentTime
    syllable.endTime = currentTime + note.duration
    syllable.duration = note.duration

    currentTime = syllable.endTime
  })

  // Step 5: Set word boundaries (only if not preserving existing boundaries)
  word.startTime = wordStartTime
  if (!preserveWordBoundaries) {
    word.endTime = currentTime
    word.duration = currentTime - wordStartTime
  } else {
    // Keep existing word boundaries, just redistribute syllables within them
    console.log(`🎵 Preserving word boundaries for "${word.word}": ${word.startTime}-${word.endTime}`)
  }

  if (!silent) {
    console.log(`🎵 Musical timing: "${word.word}" uses ${word.duration}ms of ${timeToNextWord}ms available` +
      (restPattern.hasRest ? ` (${restPattern.estimatedRestDuration}ms rest reserved)` : ''))
  }
}

/**
 * BEAT LEARNING SYSTEM - Your idea about improving with more timing data
 */
export class BeatLearningSystem {
  private timingHistory: Array<{
    wordDuration: number
    syllableCount: number
    timestamp: number
  }> = []

  addTimingExample(wordDuration: number, syllableCount: number): void {
    this.timingHistory.push({
      wordDuration,
      syllableCount,
      timestamp: Date.now()
    })

    // Keep only recent examples (last 50)
    if (this.timingHistory.length > 50) {
      this.timingHistory.shift()
    }
  }

  estimateBPM(): number {
    if (this.timingHistory.length < 3) return 120 // Default BPM

    // Analyze common word durations to infer beat patterns
    const durations = this.timingHistory.map(h => h.wordDuration)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

    // Estimate BPM assuming average word is roughly one beat
    const estimatedBPM = 60000 / avgDuration // 60000ms per minute

    // Clamp to reasonable range
    return Math.max(80, Math.min(200, estimatedBPM))
  }

  getTimingContext(): TimingContext {
    const bpm = this.estimateBPM()
    return {
      bpm,
      timeSignature: [4, 4],
      estimatedBeatDuration: 60000 / bpm
    }
  }
}

// Global instance for the app to learn from user's timing patterns
export const beatLearner = new BeatLearningSystem()

/**
 * BATCH MUSICAL TIMING PROCESSOR - Phase 2
 * Analyzes entire song at once for optimal musical timing
 */
export interface SongAnalysis {
  totalWords: number
  avgWordDuration: number
  estimatedBPM: number
  detectedRests: number
  timingQuality: 'poor' | 'good' | 'excellent'
}

export function analyzeSongTiming(lyrics: Array<{ words: WordTiming[] }>): SongAnalysis {
  let totalWords = 0
  let totalDuration = 0
  let detectedRests = 0

  for (const line of lyrics) {
    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i]
      if (word.startTime !== undefined && word.endTime !== undefined) {
        totalWords++
        totalDuration += word.endTime - word.startTime

        // Check for rests
        const nextWord = line.words[i + 1]
        if (nextWord?.startTime !== undefined) {
          const gap = nextWord.startTime - word.endTime
          const restPattern = detectRestPattern(word.word, nextWord.word, gap)
          if (restPattern.hasRest) detectedRests++
        }
      }
    }
  }

  const avgWordDuration = totalWords > 0 ? totalDuration / totalWords : 500
  const estimatedBPM = totalWords > 0 ? 60000 / avgWordDuration : 120

  // Clamp BPM to reasonable range
  const clampedBPM = Math.max(80, Math.min(200, estimatedBPM))

  // Determine timing quality based on word count and rest detection
  let timingQuality: 'poor' | 'good' | 'excellent' = 'poor'
  if (totalWords > 10 && detectedRests > 2) timingQuality = 'good'
  if (totalWords > 20 && detectedRests > 5) timingQuality = 'excellent'

  return {
    totalWords,
    avgWordDuration,
    estimatedBPM: clampedBPM,
    detectedRests,
    timingQuality
  }
}

/**
 * Apply musical timing to entire song (batch operation)
 */
export function applyMusicalTimingToSong(
  lyrics: Array<{ words: WordTiming[] }>,
  options: {
    preserveWordTiming?: boolean // Keep word start/end times, only redistribute syllables
    aggressiveness?: 'conservative' | 'moderate' | 'aggressive' // How much to change
    onlyProcessUntimedSyllables?: boolean // Only fix syllables that have no timing yet
  } = {}
): SongAnalysis {
  const {
    preserveWordTiming = true,
    onlyProcessUntimedSyllables = true
  } = options

  // First, analyze the song to understand its musical context
  const analysis = analyzeSongTiming(lyrics)
  console.log(`🎵 Song Analysis: ${analysis.totalWords} words, ${analysis.estimatedBPM.toFixed(0)} BPM, ${analysis.detectedRests} rests (${analysis.timingQuality} quality)`)

  const context: TimingContext = {
    bpm: analysis.estimatedBPM,
    timeSignature: [4, 4],
    estimatedBeatDuration: 60000 / analysis.estimatedBPM
  }

  // Apply musical timing to each word
  for (const line of lyrics) {
    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i]
      if (word.startTime !== undefined) {

        // Skip words that already have good syllable timing (unless forced)
        if (onlyProcessUntimedSyllables) {
          const hasExistingSyllableTiming = word.syllables.some(s => s.startTime !== undefined)
          if (hasExistingSyllableTiming) {
            console.log(`🎵 Skipping "${word.word}" - already has syllable timing`)
            continue
          }
        }
        // Calculate time to next word
        let timeToNextWord = 1000 // Default
        const nextWord = line.words[i + 1]
        if (nextWord?.startTime !== undefined) {
          timeToNextWord = nextWord.startTime - word.startTime
        }

        // Get next word text for rest detection
        const nextWordText = nextWord?.word

        if (preserveWordTiming && word.endTime !== undefined) {
          // Only redistribute syllables within existing word duration - DON'T change word boundaries
          const wordDuration = word.endTime - word.startTime
          distributeSyllablesMusically(word, word.startTime, wordDuration, nextWordText, context, false, true)
        } else {
          // Allow word timing to change based on musical analysis, using centralized conservative rules
          const conservativeTime = Math.min(timeToNextWord * TIMING.musical.conservativeMultiplier, TIMING.autoTiming.maxPhraseBreakDuration)
          distributeSyllablesMusically(word, word.startTime, conservativeTime, nextWordText, context, false, false)
        }
      }
    }
  }

  return analysis
}

/**
 * Reset all syllable timing in the song
 */
export function resetSongSyllableTiming(lyrics: Array<{ words: WordTiming[] }>): void {
  let resetCount = 0

  for (const line of lyrics) {
    for (const word of line.words) {
      word.syllables.forEach(syllable => {
        if (syllable.startTime !== undefined) resetCount++
        syllable.startTime = undefined
        syllable.endTime = undefined
        syllable.duration = undefined
      })
    }
  }

  console.log(`🔄 Reset syllable timing for ${resetCount} syllables`)
}
