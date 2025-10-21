/**
 * Pure TypeScript Karaoke Timing Engine
 * Handles all timing logic independent of Vue/UI
 * Can be tested with synthetic time progression
 */

import type { LyricLine, WordTiming } from '@/types/karaoke'

export interface TimingEvent {
  type: 'word_start' | 'word_end' | 'syllable_start' | 'syllable_end' | 'line_start' | 'line_end' | 'phrase_gap'
  timestamp: number
  lineIndex: number
  wordIndex?: number
  syllableIndex?: number
  text?: string
  expectedDuration?: number
}

export interface TimingConfiguration {
  // Syllable timing weights
  syllableWeights: {
    first: number
    middle: number
    last: number
  }

  // Gap detection settings
  gaps: {
    shortPause: number // ms - comma, short breath
    mediumPause: number // ms - period, end of phrase
    longPause: number // ms - line break, new verse
  }

  // Minimum durations
  minimums: {
    syllableDuration: number // ms
    wordDuration: number // ms
    lineDuration: number // ms
  }
}

export class KaraokeTimingEngine {
  private lyrics: LyricLine[] = []
  private eventLog: TimingEvent[] = []
  private config: TimingConfiguration
  private silent: boolean

  constructor(config?: Partial<TimingConfiguration> & { silent?: boolean }) {
    this.silent = config?.silent || false

    this.config = {
      syllableWeights: {
        first: 0.7,
        middle: 0.8,
        last: 2.0
      },
      gaps: {
        shortPause: 100,   // comma, quick breath
        mediumPause: 300,  // period, phrase end
        longPause: 800     // line break, verse change
      },
      minimums: {
        syllableDuration: 150,
        wordDuration: 200,
        lineDuration: 1000
      },
      ...config
    }

    this.log('ENGINE_INIT', 0, -1, undefined, undefined, 'Karaoke Timing Engine initialized')
  }

  /**
   * Load lyrics into the engine
   */
  loadLyrics(lyrics: LyricLine[]): void {
    this.lyrics = [...lyrics]
    this.eventLog = []
    this.log('LYRICS_LOADED', 0, -1, undefined, undefined, `Loaded ${lyrics.length} lines`)
  }

  /**
   * Apply timing to a word at the current timestamp
   */
  assignWordTiming(lineIndex: number, wordIndex: number, timestamp: number): TimingEvent[] {
    const events: TimingEvent[] = []

    if (!this.isValidPosition(lineIndex, wordIndex)) {
      this.log('ERROR_INVALID_POSITION', timestamp, lineIndex, wordIndex)
      return events
    }

    const word = this.lyrics[lineIndex].words[wordIndex]
    const previousWord = this.getPreviousWord(lineIndex, wordIndex)

    // Finalize previous word if it exists and has timing
    if (previousWord && previousWord.word.startTime !== undefined) {
      const actualDuration = timestamp - previousWord.word.startTime
      this.finalizeWordTiming(previousWord, actualDuration, timestamp)

      events.push({
        type: 'word_end',
        timestamp,
        lineIndex: previousWord.lineIndex,
        wordIndex: previousWord.wordIndex,
        text: previousWord.word.word,
        expectedDuration: actualDuration
      })

      // Detect gap between words
      const gap = this.detectGap(word.word, actualDuration)
      if (gap > this.config.gaps.shortPause) {
        events.push({
          type: 'phrase_gap',
          timestamp,
          lineIndex,
          wordIndex,
          expectedDuration: gap
        })
      }
    }

    // Start new word
    word.startTime = timestamp
    word.endTime = undefined // Will be set when next word starts

    events.push({
      type: 'word_start',
      timestamp,
      lineIndex,
      wordIndex,
      text: word.word
    })

    this.log('WORD_ASSIGNED', timestamp, lineIndex, wordIndex, undefined, word.word)
    return events
  }

  /**
   * Finalize all remaining words (end of song)
   */
  finalizeAllTiming(endTimestamp: number): TimingEvent[] {
    const events: TimingEvent[] = []

    // Find the last word with timing
    const lastWord = this.findLastTimedWord()
    if (lastWord && lastWord.word.startTime !== undefined) {
      const estimatedDuration = this.estimateWordDuration(lastWord.word)
      this.finalizeWordTiming(lastWord, estimatedDuration, endTimestamp)

      events.push({
        type: 'word_end',
        timestamp: endTimestamp,
        lineIndex: lastWord.lineIndex,
        wordIndex: lastWord.wordIndex,
        text: lastWord.word.word,
        expectedDuration: estimatedDuration
      })
    }

    this.log('TIMING_FINALIZED', endTimestamp, -1)
    return events
  }

  /**
   * Get current position based on timestamp
   */
  getCurrentPosition(timestamp: number): {
    lineIndex: number
    wordIndex: number
    syllableIndex: number
    isActive: boolean
  } {
    for (let lineIndex = 0; lineIndex < this.lyrics.length; lineIndex++) {
      const line = this.lyrics[lineIndex]

      for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
        const word = line.words[wordIndex]

        if (word.startTime !== undefined) {
          if (word.endTime !== undefined) {
            // Finalized word - use exact timing
            // Use < for endTime to ensure proper word transitions at boundaries
            if (timestamp >= word.startTime && timestamp < word.endTime) {
              const syllableIndex = this.findCurrentSyllable(word, timestamp)
              return {
                lineIndex, wordIndex, syllableIndex, isActive: true
              }
            }
          } else {
            // Current active word (not finalized yet)
            // Check if this is the current word by seeing if timestamp is after its start
            // and there's no next word with timing yet
            if (timestamp >= word.startTime) {
              // Check if there's a next word that started
              const nextWord = this.getNextWord(lineIndex, wordIndex)
              if (!nextWord || nextWord.word.startTime === undefined || timestamp < nextWord.word.startTime) {
                // This is the current active word
                const syllableIndex = this.findCurrentSyllable(word, timestamp)
                return {
                  lineIndex, wordIndex, syllableIndex, isActive: true
                }
              }
            }
          }
        }
      }
    }

    return {
      lineIndex: 0, wordIndex: 0, syllableIndex: 0, isActive: false
    }
  }

  /**
   * Get all events that occurred during timing
   */
  getEventLog(): TimingEvent[] {
    return [...this.eventLog]
  }

  /**
   * Get timing statistics
   */
  getStats(): {
    totalWords: number
    timedWords: number
    totalSyllables: number
    timedSyllables: number
    averageWordDuration: number
    completionPercent: number
    eventCount: number
  } {
    let totalWords = 0
    let timedWords = 0
    let totalSyllables = 0
    let timedSyllables = 0
    let totalDuration = 0

    this.lyrics.forEach(line => {
      line.words.forEach(word => {
        totalWords++
        if (word.startTime !== undefined) {
          timedWords++
          if (word.endTime !== undefined) {
            totalDuration += (word.endTime - word.startTime)
          }
        }

        word.syllables.forEach(syllable => {
          totalSyllables++
          if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
            timedSyllables++
          }
        })
      })
    })

    return {
      totalWords,
      timedWords,
      totalSyllables,
      timedSyllables,
      averageWordDuration: timedWords > 0 ? totalDuration / timedWords : 0,
      completionPercent: totalWords > 0 ? (timedWords / totalWords) * 100 : 0,
      eventCount: this.eventLog.length
    }
  }

  // Private helper methods

  private isValidPosition(lineIndex: number, wordIndex: number): boolean {
    return lineIndex >= 0 &&
      lineIndex < this.lyrics.length &&
      wordIndex >= 0 &&
      wordIndex < this.lyrics[lineIndex].words.length
  }

  private getPreviousWord(lineIndex: number, wordIndex: number): {
    lineIndex: number
    wordIndex: number
    word: WordTiming
  } | null {
    if (wordIndex > 0) {
      return {
        lineIndex,
        wordIndex: wordIndex - 1,
        word: this.lyrics[lineIndex].words[wordIndex - 1]
      }
    } else if (lineIndex > 0) {
      const prevLine = this.lyrics[lineIndex - 1]
      if (prevLine.words.length > 0) {
        return {
          lineIndex: lineIndex - 1,
          wordIndex: prevLine.words.length - 1,
          word: prevLine.words[prevLine.words.length - 1]
        }
      }
    }
    return null
  }

  private getNextWord(lineIndex: number, wordIndex: number): {
    lineIndex: number
    wordIndex: number
    word: WordTiming
  } | null {
    const currentLine = this.lyrics[lineIndex]
    if (wordIndex < currentLine.words.length - 1) {
      return {
        lineIndex,
        wordIndex: wordIndex + 1,
        word: currentLine.words[wordIndex + 1]
      }
    } else if (lineIndex < this.lyrics.length - 1) {
      const nextLine = this.lyrics[lineIndex + 1]
      if (nextLine.words.length > 0) {
        return {
          lineIndex: lineIndex + 1,
          wordIndex: 0,
          word: nextLine.words[0]
        }
      }
    }
    return null
  }

  private finalizeWordTiming(
    wordRef: { lineIndex: number, wordIndex: number, word: WordTiming },
    actualDuration: number,
    endTimestamp: number
  ): void {
    const { word } = wordRef

    word.endTime = endTimestamp
    word.duration = actualDuration

    // Distribute syllable timing
    this.distributeSyllableTiming(word, actualDuration)

    this.log('WORD_FINALIZED', endTimestamp, wordRef.lineIndex, wordRef.wordIndex, undefined,
      `${word.word} (${actualDuration}ms)`)
  }

  private distributeSyllableTiming(word: WordTiming, totalDuration: number): void {
    if (word.syllables.length <= 1) {
      // Single syllable gets full duration
      if (word.syllables[0] && word.startTime !== undefined) {
        word.syllables[0].startTime = word.startTime
        word.syllables[0].endTime = word.startTime + totalDuration
        word.syllables[0].duration = totalDuration
      }
      return
    }

    // Multiple syllables - use weighted distribution
    const weights = word.syllables.map((_, index) => {
      if (index === 0) return this.config.syllableWeights.first
      if (index === word.syllables.length - 1) return this.config.syllableWeights.last
      return this.config.syllableWeights.middle
    })

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    const syllableDurations = weights.map(weight => (weight / totalWeight) * totalDuration)

    let currentTime = word.startTime!
    word.syllables.forEach((syllable, index) => {
      syllable.startTime = currentTime
      syllable.endTime = currentTime + syllableDurations[index]
      syllable.duration = syllableDurations[index]
      currentTime = syllable.endTime

      this.log('SYLLABLE_TIMED', syllable.startTime, -1, -1, index,
        `${syllable.syllable} (${syllableDurations[index].toFixed(1)}ms)`)
    })
  }

  private detectGap(text: string, previousDuration: number): number {
    // Look at punctuation and word patterns to estimate gaps
    if (text.includes(',') || text.includes(';')) {
      return this.config.gaps.shortPause
    } else if (text.includes('.') || text.includes('!') || text.includes('?')) {
      return this.config.gaps.mediumPause
    } else if (previousDuration > this.config.minimums.wordDuration * 2) {
      // Previous word was held long - likely end of phrase
      return this.config.gaps.mediumPause
    }

    return 0 // No gap detected
  }

  private findLastTimedWord(): {
    lineIndex: number
    wordIndex: number
    word: WordTiming
  } | null {
    for (let lineIndex = this.lyrics.length - 1; lineIndex >= 0; lineIndex--) {
      const line = this.lyrics[lineIndex]
      for (let wordIndex = line.words.length - 1; wordIndex >= 0; wordIndex--) {
        const word = line.words[wordIndex]
        if (word.startTime !== undefined) {
          return {
            lineIndex, wordIndex, word
          }
        }
      }
    }
    return null
  }

  private estimateWordDuration(word: WordTiming): number {
    // Simple estimation based on syllable count and word length
    const syllableCount = word.syllables.length
    const baseTime = this.config.minimums.wordDuration
    return baseTime + (syllableCount - 1) * this.config.minimums.syllableDuration
  }

  private findCurrentSyllable(word: WordTiming, timestamp: number): number {
    // Check if syllables have timing (word has been finalized)
    const hasTimedSyllables = word.syllables.some(s => s.startTime !== undefined && s.endTime !== undefined)

    if (hasTimedSyllables) {
      // Use actual syllable timing
      for (let i = 0; i < word.syllables.length; i++) {
        const syllable = word.syllables[i]
        if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
          // Use < instead of <= for endTime to ensure proper syllable transitions
          // At exactly the boundary time, we should move to the next syllable
          if (timestamp >= syllable.startTime && timestamp < syllable.endTime) {
            return i
          }
        }
      }
      // If we're past all syllables, return the last valid syllable index
      return Math.max(0, word.syllables.length - 1)
    } else {
      // Word hasn't been finalized yet - estimate syllable timing on-the-fly
      if (word.startTime === undefined || word.syllables.length <= 1) {
        return 0
      }

      // Estimate which syllable should be active based on elapsed time
      const elapsedTime = timestamp - word.startTime

      // Use a simple progression: each syllable gets a minimum duration
      // Find which syllable we should be in based on time thresholds
      for (let i = 0; i < word.syllables.length; i++) {
        const minTimeForThisSyllable = (i + 1) * this.config.minimums.syllableDuration

        // If we haven't reached the time threshold for this syllable, return previous
        if (elapsedTime < minTimeForThisSyllable) {
          return Math.max(0, i)
        }
      }

      // If we're well into the word, return the last syllable
      return word.syllables.length - 1

      // If we're well into the word, return the last syllable
      return word.syllables.length - 1
    }
  }

  private log(event: string, timestamp: number, lineIndex: number, wordIndex?: number, syllableIndex?: number, details?: string): void {
    const logEntry = `[${timestamp.toFixed(0).padStart(6)}ms] ${event.padEnd(20)} L:${lineIndex.toString().padStart(2)} W:${(wordIndex ?? -1).toString().padStart(2)} S:${(syllableIndex ?? -1).toString().padStart(2)} ${details || ''}`

    // Only log to console if not in silent mode (still store in eventLog for testing)
    if (!this.silent) {
      console.log(logEntry)
    }

    // Also store structured events for testing
    this.eventLog.push({
      type: event as any,
      timestamp,
      lineIndex,
      wordIndex,
      syllableIndex,
      text: details
    })
  }
}
