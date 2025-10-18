import { TIMING, TimingUtils } from '@/models/TimingConstants'

/**
 * RelativeSyllableTiming - A proper TypeScript model for handling syllable timing
 *
 * Key Design Principles:
 * 1. Syllables are stored as relative offsets/durations from word start
 * 2. Word movement automatically moves all syllables (no manual sync needed)
 * 3. Word resizing only affects the last syllable
 * 4. Conversion methods handle absolute time calculations for UI display
 */

export interface RelativeSyllable {
  text: string
  startOffset: number  // Offset from word start (milliseconds)
  duration: number     // Syllable duration (milliseconds)
}

export interface AbsoluteSyllable {
  text: string
  startTime: number    // Absolute start time (milliseconds)
  endTime: number      // Absolute end time (milliseconds)
}

export interface TimedWordData {
  id: string
  text: string
  startTime: number    // Milliseconds
  endTime: number      // Milliseconds
  syllables: RelativeSyllable[]
}

export class RelativeSyllableTiming {
  private word: TimedWordData

  constructor(wordData: TimedWordData) {
    this.word = { ...wordData }
    this.validateSyllables()
  }

  /**
   * Validate that syllables are properly structured
   */
  private validateSyllables(): void {
    if (this.word.syllables.length === 0) {
      throw new Error('Word must have at least one syllable')
    }

    let currentOffset = 0
    for (const syllable of this.word.syllables) {
      if (syllable.startOffset !== currentOffset) {
        throw new Error(`Syllable "${syllable.text}" has gap or overlap. Expected startOffset: ${currentOffset}, got: ${syllable.startOffset}`)
      }
      if (syllable.duration <= 0) {
        throw new Error(`Syllable "${syllable.text}" must have positive duration, got: ${syllable.duration}`)
      }
      currentOffset += syllable.duration
    }

    const expectedWordDuration = this.word.endTime - this.word.startTime
    const actualSyllablesTotalDuration = currentOffset
    if (Math.abs(expectedWordDuration - actualSyllablesTotalDuration) > TIMING.validation.durationTolerance) {
      throw new Error(`Word duration (${expectedWordDuration}ms) doesn't match total syllable duration (${actualSyllablesTotalDuration}ms)`)
    }
  }

  /**
   * Get word data (immutable copy)
   */
  getWordData(): Readonly<TimedWordData> {
    return { ...this.word }
  }

  /**
   * Get word duration
   */
  getWordDuration(): number {
    return this.word.endTime - this.word.startTime
  }

  /**
   * Convert relative syllables to absolute positions for UI display
   */
  getAbsoluteSyllables(): AbsoluteSyllable[] {
    return this.word.syllables.map(syllable => ({
      text: syllable.text,
      startTime: this.word.startTime + syllable.startOffset,
      endTime: this.word.startTime + syllable.startOffset + syllable.duration
    }))
  }

  /**
   * Move word to new start time - syllables automatically follow
   */
  moveWord(newStartTime: number): RelativeSyllableTiming {
    const duration = this.getWordDuration()
    return new RelativeSyllableTiming({
      ...this.word,
      startTime: newStartTime,
      endTime: newStartTime + duration
    })
  }

  /**
   * Resize word by changing end time - only affects last syllable
   */
  resizeWordEnd(newEndTime: number): RelativeSyllableTiming {
    if (newEndTime <= this.word.startTime) {
      throw new Error('Word end time must be after start time')
    }

    const newWordDuration = newEndTime - this.word.startTime
    const syllables = [...this.word.syllables]

    if (syllables.length === 1) {
      // Single syllable: adjust its duration
      syllables[0] = {
        ...syllables[0],
        duration: newWordDuration
      }
    } else {
      // Multi-syllable: only adjust last syllable duration
      const lastIndex = syllables.length - 1
      const lastSyllableStartOffset = syllables[lastIndex].startOffset
      const newLastSyllableDuration = newWordDuration - lastSyllableStartOffset

      if (newLastSyllableDuration <= 1) { // 1ms minimum duration
        throw new Error('Resizing would make last syllable have zero or negative duration')
      }

      syllables[lastIndex] = {
        ...syllables[lastIndex],
        duration: newLastSyllableDuration
      }
    }

    return new RelativeSyllableTiming({
      ...this.word,
      endTime: newEndTime,
      syllables
    })
  }

  /**
   * Resize word by changing start time - only affects first syllable
   */
  resizeWordStart(newStartTime: number): RelativeSyllableTiming {
    if (newStartTime >= this.word.endTime) {
      throw new Error('Word start time must be before end time')
    }

    const newWordDuration = this.word.endTime - newStartTime
    const syllables = [...this.word.syllables]

    if (syllables.length === 1) {
      // Single syllable: adjust its duration and reset offset to 0
      syllables[0] = {
        ...syllables[0],
        startOffset: 0,
        duration: newWordDuration
      }
    } else {
      // Multi-syllable: adjust first syllable duration, shift others
      const oldFirstDuration = syllables[0].duration
      const newFirstDuration = newWordDuration - (this.getWordDuration() - oldFirstDuration)

      if (newFirstDuration <= 1) { // 1ms minimum duration
        throw new Error('Resizing would make first syllable have zero or negative duration')
      }

      const deltaOffset = oldFirstDuration - newFirstDuration

      // Adjust first syllable
      syllables[0] = {
        ...syllables[0],
        startOffset: 0,
        duration: newFirstDuration
      }

      // Shift all other syllables
      for (let i = 1; i < syllables.length; i++) {
        syllables[i] = {
          ...syllables[i],
          startOffset: syllables[i].startOffset - deltaOffset
        }
      }
    }

    return new RelativeSyllableTiming({
      ...this.word,
      startTime: newStartTime,
      syllables
    })
  }

  /**
   * Move and resize word in one operation
   */
  moveAndResize(newStartTime: number, newEndTime: number): RelativeSyllableTiming {
    if (newStartTime >= newEndTime) {
      throw new Error('Word start time must be before end time')
    }

    // First move, then resize
    return this.moveWord(newStartTime).resizeWordEnd(newEndTime)
  }

  /**
   * Adjust individual syllable boundary
   */
  adjustSyllableBoundary(syllableIndex: number, newEndTime: number): RelativeSyllableTiming {
    if (syllableIndex < 0 || syllableIndex >= this.word.syllables.length - 1) {
      throw new Error('Can only adjust boundaries between syllables')
    }

    const absoluteNewEndTime = newEndTime - this.word.startTime
    if (absoluteNewEndTime <= this.word.syllables[syllableIndex].startOffset ||
      absoluteNewEndTime >= this.word.syllables[syllableIndex + 1].startOffset + this.word.syllables[syllableIndex + 1].duration) {
      throw new Error('New syllable boundary is outside valid range')
    }

    const syllables = [...this.word.syllables]
    const currentSyllable = syllables[syllableIndex]
    const nextSyllable = syllables[syllableIndex + 1]

    // Adjust current syllable's duration
    const newCurrentDuration = absoluteNewEndTime - currentSyllable.startOffset
    syllables[syllableIndex] = {
      ...currentSyllable,
      duration: newCurrentDuration
    }

    // Adjust next syllable's start offset and duration
    const nextSyllableEndOffset = nextSyllable.startOffset + nextSyllable.duration
    syllables[syllableIndex + 1] = {
      ...nextSyllable,
      startOffset: absoluteNewEndTime,
      duration: nextSyllableEndOffset - absoluteNewEndTime
    }

    return new RelativeSyllableTiming({
      ...this.word,
      syllables
    })
  }

  /**
   * Create from legacy absolute syllable data (expects milliseconds)
   * Automatically fixes small gaps/overlaps in syllable timing
   */
  static fromAbsoluteSyllables(wordId: string, wordText: string, wordStartTime: number, wordEndTime: number, absoluteSyllables: AbsoluteSyllable[]): RelativeSyllableTiming {
    if (absoluteSyllables.length === 0) {
      throw new Error('Must have at least one syllable')
    }

    // Clean up syllable timing to ensure continuity
    const cleanedSyllables: AbsoluteSyllable[] = []
    let currentTime = wordStartTime

    for (let i = 0; i < absoluteSyllables.length; i++) {
      const syllable = absoluteSyllables[i]
      const isLast = i === absoluteSyllables.length - 1

      let startTime = Math.round(syllable.startTime)
      let endTime = Math.round(syllable.endTime)

      // Fix small gaps/overlaps using centralized tolerance
      if (Math.abs(startTime - currentTime) <= TIMING.validation.gapTolerance) {
        startTime = currentTime
      }

      // Ensure positive duration using centralized minimum
      if (endTime <= startTime) {
        const minEndTime = startTime + TIMING.validation.timingPrecision
        console.warn(`⚠️ Fixed negative duration for syllable "${syllable.text}": was ${startTime}-${endTime}, now ${startTime}-${minEndTime}`)
        endTime = minEndTime
      }

      // For last syllable, ensure it ends exactly at word end
      if (isLast) {
        endTime = Math.round(wordEndTime)
      }

      cleanedSyllables.push({
        text: syllable.text,
        startTime,
        endTime
      })

      currentTime = endTime
    }

    // Convert to relative syllables
    const relativeSyllables: RelativeSyllable[] = cleanedSyllables.map(syllable => {
      const duration = syllable.endTime - syllable.startTime
      if (duration <= 0) {
        console.error(`❌ Still negative duration after cleanup for "${syllable.text}": ${syllable.startTime}-${syllable.endTime} = ${duration}`)
      }
      return {
        text: syllable.text,
        startOffset: syllable.startTime - Math.round(wordStartTime),
        duration: duration
      }
    })

    return new RelativeSyllableTiming({
      id: wordId,
      text: wordText,
      startTime: Math.round(wordStartTime),
      endTime: Math.round(wordEndTime),
      syllables: relativeSyllables
    })
  }

  /**
   * Create from UI data (converts seconds to milliseconds)
   */
  static fromSecondsData(wordId: string, wordText: string, wordStartSeconds: number, wordEndSeconds: number, syllableTexts: string[], lastSyllableWeight: number = 1.2): RelativeSyllableTiming {
    const wordStartTime = Math.round(wordStartSeconds * 1000)
    const wordEndTime = Math.round(wordEndSeconds * 1000)
    return RelativeSyllableTiming.createWeightedSyllables(wordId, wordText, wordStartTime, wordEndTime, syllableTexts, lastSyllableWeight)
  }

  /**
   * Convert to UI data (milliseconds to seconds)
   */
  toSecondsData(): { word: { id: string, text: string, startTime: number, endTime: number }, syllables: { text: string, startTime: number, endTime: number }[] } {
    const absoluteSyllables = this.getAbsoluteSyllables()
    return {
      word: {
        id: this.word.id,
        text: this.word.text,
        startTime: this.word.startTime / 1000,
        endTime: this.word.endTime / 1000
      },
      syllables: absoluteSyllables.map(syl => ({
        text: syl.text,
        startTime: syl.startTime / 1000,
        endTime: syl.endTime / 1000
      }))
    }
  }

  /**
   * Create a simple word with even syllable distribution (expects milliseconds)
   */
  static createEvenSyllables(wordId: string, wordText: string, startTime: number, endTime: number, syllableTexts: string[]): RelativeSyllableTiming {
    const wordDuration = Math.round(endTime - startTime)
    const baseSyllableDuration = Math.floor(wordDuration / syllableTexts.length)
    const remainder = wordDuration % syllableTexts.length

    const syllables: RelativeSyllable[] = []
    let currentOffset = 0

    syllableTexts.forEach((text, index) => {
      // Distribute remainder across first syllables to ensure exact total
      const duration = baseSyllableDuration + (index < remainder ? 1 : 0)
      syllables.push({
        text,
        startOffset: currentOffset,
        duration
      })
      currentOffset += duration
    })

    return new RelativeSyllableTiming({
      id: wordId,
      text: wordText,
      startTime: Math.round(startTime),
      endTime: Math.round(endTime),
      syllables
    })
  }

  /**
   * Create a word with weighted syllable distribution (last syllable gets more time) - expects milliseconds
   */
  static createWeightedSyllables(wordId: string, wordText: string, startTime: number, endTime: number, syllableTexts: string[], lastSyllableWeight: number = 1.2): RelativeSyllableTiming {
    const wordDuration = Math.round(endTime - startTime)

    // Calculate weights
    const weights = syllableTexts.map((_, index) =>
      index === syllableTexts.length - 1 ? lastSyllableWeight : 1.0
    )
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

    // Create syllables with weighted durations (ensure integer milliseconds)
    const syllables: RelativeSyllable[] = []
    let currentOffset = 0
    let totalAssigned = 0

    syllableTexts.forEach((text, index) => {
      let duration: number
      if (index === syllableTexts.length - 1) {
        // Last syllable gets whatever is left to ensure exact total
        duration = wordDuration - totalAssigned
      } else {
        duration = Math.round((weights[index] / totalWeight) * wordDuration)
        totalAssigned += duration
      }

      syllables.push({
        text,
        startOffset: currentOffset,
        duration
      })
      currentOffset += duration
    })

    return new RelativeSyllableTiming({
      id: wordId,
      text: wordText,
      startTime: Math.round(startTime),
      endTime: Math.round(endTime),
      syllables
    })
  }
}
