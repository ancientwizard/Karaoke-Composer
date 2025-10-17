/**
 * SIMPLE BASIC TIMING - Phase 1
 * Fast, minimal syllable timing for real-time editing workflow
 * Doesn't fill all space - leaves room for manual adjustments
 */

import type { WordTiming } from '@/types/karaoke'

/**
 * Simple syllable distribution for basic timing workflow
 * - Fast execution during spacebar presses
 * - Conservative space usage (leaves gaps for editing)
 * - Equal distribution with slight first/last syllable weighting
 */
export function distributeBasicSyllableTiming(
  word: WordTiming,
  wordStartTime: number,
  totalAvailableTime: number
): void {
  if (word.syllables.length === 0) return

  // Use only 70% of available time - leaves space for manual editing
  const usableTime = totalAvailableTime * 0.7
  const minSyllableDuration = 150 // Minimum 150ms per syllable

  // Simple weighting: first syllable slightly shorter, last slightly longer
  const weights = word.syllables.map((_, index) => {
    if (word.syllables.length === 1) return 1.0
    if (index === 0) return 0.8 // First syllable: 20% shorter
    if (index === word.syllables.length - 1) return 1.2 // Last syllable: 20% longer
    return 1.0 // Middle syllables: normal
  })

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  // Calculate durations with minimum constraints
  const rawDurations = weights.map(weight => (weight / totalWeight) * usableTime)
  const durations = rawDurations.map(duration => Math.max(duration, minSyllableDuration))

  // Apply timing
  let currentTime = wordStartTime
  word.syllables.forEach((syllable, index) => {
    syllable.startTime = currentTime
    syllable.endTime = currentTime + durations[index]
    syllable.duration = durations[index]
    currentTime = syllable.endTime
  })

  // Set word boundaries
  word.startTime = wordStartTime
  word.endTime = currentTime
  word.duration = currentTime - wordStartTime

  console.log(`⚡ Basic timing: "${word.word}" uses ${word.duration?.toFixed(0)}ms of ${totalAvailableTime}ms available (${((word.duration / totalAvailableTime) * 100).toFixed(0)}% usage)`)
}

/**
 * Reset all syllable timing for a word
 */
export function resetWordSyllableTiming(word: WordTiming): void {
  word.syllables.forEach(syllable => {
    syllable.startTime = undefined
    syllable.endTime = undefined
    syllable.duration = undefined
  })

  // Keep word start time but clear end time and duration
  // This allows the word to be "re-timed" while preserving its position
  word.endTime = undefined
  word.duration = undefined
}
