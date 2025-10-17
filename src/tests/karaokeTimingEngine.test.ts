/**
 * Jest Unit Tests for Karaoke Timing Engine and UI Highlighting Logic
 * Tests the "gold highlighting bobbing" issue and comprehensive timing behavior
 */

import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine, parseLyricsWithMetadata } from '../utils/lyricsParser'
import type { LyricLine, SyllableTiming } from '../types/karaoke'

describe('KaraokeTimingEngine', () => {
  let engine: KaraokeTimingEngine
  let testLyrics: LyricLine[]

  const HAPPY_BIRTHDAY_SIMPLE = [
    "Hap/py Birth/day to you",
    "Hap/py Birth/day to you",
    "Hap/py Birth/day dear [Name]",
    "Hap/py Birth/day to you"
  ]

  // Complete timing for all words to test gold highlighting stability
  const COMPLETE_TIMINGS = [
    // Line 1: "Happy Birthday to you" (0-3000ms)
    {
      word: "Happy", start: 0, end: 800
    },
    {
      word: "Birthday", start: 800, end: 2000
    },
    {
      word: "to", start: 2000, end: 2400
    },
    {
      word: "you", start: 2400, end: 3000
    },

    // Line 2: "Happy Birthday to you" (3500-6500ms)
    {
      word: "Happy", start: 3500, end: 4300, lineIndex: 1
    },
    {
      word: "Birthday", start: 4300, end: 5500, lineIndex: 1
    },
    {
      word: "to", start: 5500, end: 5900, lineIndex: 1
    },
    {
      word: "you", start: 5900, end: 6500, lineIndex: 1
    },

    // Line 3: "Happy Birthday dear [Name]" (7000-10500ms)
    {
      word: "Happy", start: 7000, end: 7800, lineIndex: 2
    },
    {
      word: "Birthday", start: 7800, end: 9000, lineIndex: 2
    },
    {
      word: "dear", start: 9000, end: 9500, lineIndex: 2
    },
    {
      word: "[Name]", start: 9500, end: 10500, lineIndex: 2
    },

    // Line 4: "Happy Birthday to you" (11000-14000ms)
    {
      word: "Happy", start: 11000, end: 11800, lineIndex: 3
    },
    {
      word: "Birthday", start: 11800, end: 13000, lineIndex: 3
    },
    {
      word: "to", start: 13000, end: 13400, lineIndex: 3
    },
    {
      word: "you", start: 13400, end: 14000, lineIndex: 3
    }
  ]

  // Helper function to apply all timings
  const applyAllTimings = (): void => {
    // Apply all timings to create fully timed song
    for (const timing of COMPLETE_TIMINGS) {
      const lineIndex = timing.lineIndex || 0
      let wordIndex = -1

      // Find word in the specified line
      for (let i = 0; i < testLyrics[lineIndex].words.length; i++) {
        if (testLyrics[lineIndex].words[i].word === timing.word) {
          wordIndex = i
          break
        }
      }

      if (wordIndex >= 0) {
        engine.assignWordTiming(lineIndex, wordIndex, timing.start)
      }
    }

    engine.finalizeAllTiming(14000)
  }

  beforeEach(() => {
    engine = new KaraokeTimingEngine({
      syllableWeights: {
        first: 0.6,
        middle: 0.8,
        last: 1.6
      },
      gaps: {
        shortPause: 100,
        mediumPause: 300,
        longPause: 800
      },
      silent: true  // Suppress console output during tests
    })

    // Parse test lyrics
    testLyrics = HAPPY_BIRTHDAY_SIMPLE.map((line, index) =>
      parseLyricsLine(line, index + 1, `line-${index}`)
    )

    engine.loadLyrics(testLyrics)
  })

  describe('Basic Engine Functionality', () => {
    test('should initialize with correct configuration', () => {
      expect(engine).toBeDefined()
      const stats = engine.getStats()
      expect(stats.totalWords).toBe(16) // 4 words per line × 4 lines
      expect(stats.timedWords).toBe(0)
      expect(stats.completionPercent).toBe(0)
    })

    test('should load lyrics correctly', () => {
      const stats = engine.getStats()
      expect(stats.totalWords).toBe(16)

      // Check syllable structure
      const firstLine = testLyrics[0]
      expect(firstLine.words).toHaveLength(4)
      expect(firstLine.words[0].syllables).toHaveLength(2) // "Hap-py"
      expect(firstLine.words[1].syllables).toHaveLength(2) // "Birth-day"
    })

    test('should apply syllable weighting correctly', () => {
      // Apply timing to first word "Happy" (0ms) and second word "Birthday" (800ms)
      // This will finalize "Happy" with 800ms duration
      engine.assignWordTiming(0, 0, 0)
      engine.assignWordTiming(0, 1, 800)

      const stats = engine.getStats()
      expect(stats.timedWords).toBe(2) // Now we have 2 timed words

      // Check syllable timing: first syllable should get less time than second
      const happyWord = testLyrics[0].words[0]
      const hapSyllable = happyWord.syllables[0]
      const pySyllable = happyWord.syllables[1]

      expect(hapSyllable.startTime).toBe(0)
      expect(pySyllable.endTime).toBe(800)

      // Check duration with proper type safety
      const hapDuration = hapSyllable.duration ?? 0
      const pyDuration = pySyllable.duration ?? 0
      expect(hapDuration).toBeGreaterThan(0)
      expect(pyDuration).toBeGreaterThan(0)
      expect(hapDuration).toBeLessThan(pyDuration)
    })
  })

  describe('Gold Highlighting Stability (Anti-Bobbing Tests)', () => {
    interface WordHighlightClass {
      isPast: boolean
      isCurrent: boolean
      isFuture: boolean
    }

    interface SyllableHighlightClass {
      isPast: boolean
      isCurrent: boolean
      isFuture: boolean
    }

    // Simulate the Vue component's highlighting logic
    function getWordHighlightClass(
      currentTime: number,
      line: LyricLine,
      wordIndex: number,
      currentWord: number,
      currentLine: number,
      lineIndex: number
    ): WordHighlightClass {
      const word = line.words[wordIndex]

      return {
        isPast: (word?.endTime !== undefined && currentTime > word.endTime),
        isCurrent: (lineIndex === currentLine && wordIndex === currentWord),
        isFuture: (word?.startTime !== undefined && currentTime < word.startTime)
      }
    }

    function getSyllableHighlightClass(
      currentTime: number,
      syllable: SyllableTiming,
      currentWord: number,
      currentSyllable: number,
      wordIndex: number,
      syllableIndex: number
    ): SyllableHighlightClass {
      return {
        isPast: (syllable?.endTime !== undefined && currentTime > syllable.endTime),
        isCurrent: (wordIndex === currentWord && syllableIndex === currentSyllable),
        isFuture: (syllable?.startTime !== undefined && currentTime < syllable.startTime)
      }
    }

    test('should track current position accurately throughout song', () => {
      applyAllTimings()

      // Test key moments in the song
      const testMoments = [
        {
          time: 0, expectedLine: 0, expectedWord: 0, expectedSyllable: 0
        }, // Start of "Hap"
        {
          time: 218, expectedLine: 0, expectedWord: 0, expectedSyllable: 0
        }, // Still in "Hap" (ends at ~218.2ms)
        {
          time: 219, expectedLine: 0, expectedWord: 0, expectedSyllable: 1
        }, // Now in "py"
        {
          time: 800, expectedLine: 0, expectedWord: 1, expectedSyllable: 0
        }, // Start of "Birth"
        {
          time: 1128, expectedLine: 0, expectedWord: 1, expectedSyllable: 1
        }, // Start of "day" (actually at ~1127.27ms)
        {
          time: 2000, expectedLine: 0, expectedWord: 2, expectedSyllable: 0
        }, // Start of "to"
        {
          time: 3000, expectedLine: 0, expectedWord: 3, expectedSyllable: 0
        }, // End of line 1
        {
          time: 3500, expectedLine: 1, expectedWord: 0, expectedSyllable: 0
        }, // Start of line 2
      ]

      testMoments.forEach(({
        time, expectedLine, expectedWord, expectedSyllable
      }) => {
        const position = engine.getCurrentPosition(time)

        expect(position.isActive).toBe(true)
        expect(position.lineIndex).toBe(expectedLine)
        expect(position.wordIndex).toBe(expectedWord)
        expect(position.syllableIndex).toBe(expectedSyllable)
      })
    })

    test('should detect gold highlighting stability (no unexpected bobbing)', () => {
      applyAllTimings()

      // Test fine-grained time progression to catch bobbing
      const bobbingDetection: Array<{
        time: number, line: number, word: number, syllable: number
      }> = []

      for (let time = 0; time <= 14000; time += 50) { // Every 50ms
        const position = engine.getCurrentPosition(time)
        if (position.isActive) {
          bobbingDetection.push({
            time,
            line: position.lineIndex,
            word: position.wordIndex,
            syllable: position.syllableIndex
          })
        }
      }

      // Analyze for unexpected jumps (bobbing)
      let unexpectedJumps = 0
      const jumpDetails: Array<{
        time: number, from: string, to: string
      }> = []

      for (let i = 1; i < bobbingDetection.length; i++) {
        const prev = bobbingDetection[i - 1]
        const curr = bobbingDetection[i]

        // Check for unexpected backward movement or large forward jumps
        const lineJump = curr.line - prev.line
        const wordJump = curr.word - prev.word
        const syllableJump = curr.syllable - prev.syllable

        // Allow reasonable progression: same position, next syllable, next word, or next line
        const isValidProgression = (
          // Same position (common during syllable duration)
          (lineJump === 0 && wordJump === 0 && syllableJump === 0) ||
          // Next syllable in same word
          (lineJump === 0 && wordJump === 0 && syllableJump === 1) ||
          // Next word in same line (syllable resets to 0)
          (lineJump === 0 && wordJump === 1 && curr.syllable === 0) ||
          // Next line (word and syllable reset to 0)
          (lineJump === 1 && curr.word === 0 && curr.syllable === 0)
        )

        if (!isValidProgression) {
          unexpectedJumps++
          jumpDetails.push({
            time: curr.time,
            from: `L${prev.line}W${prev.word}S${prev.syllable}`,
            to: `L${curr.line}W${curr.word}S${curr.syllable}`
          })
        }
      }

      // Log jump details for analysis
      if (jumpDetails.length > 0) {
        console.warn('Unexpected position jumps detected (gold highlighting bobbing):')
        jumpDetails.forEach(({
          time, from, to
        }) => {
          console.warn(`  ${time}ms: ${from} → ${to}`)
        })
      }

      // Should have very few or no unexpected jumps in a well-timed song
      expect(unexpectedJumps).toBeLessThan(5) // Allow some tolerance for timing boundaries
    })

    test('should provide consistent highlighting classes throughout playback', () => {
      applyAllTimings()

      // Test at several time points during the first word "Happy" (0-800ms)
      const testTimes = [100, 200, 300, 400, 500, 600, 700]

      testTimes.forEach(time => {
        const position = engine.getCurrentPosition(time)
        if (!position.isActive) return

        const line = testLyrics[position.lineIndex]

        // Test word highlighting classes for all words in current line
        line.words.forEach((word, wordIndex) => {
          const wordClass = getWordHighlightClass(
            time, line, wordIndex, position.wordIndex, position.lineIndex, position.lineIndex
          )

          // Current word should have exactly one true class
          if (wordIndex === position.wordIndex) {
            expect(wordClass.isCurrent).toBe(true)
            expect(wordClass.isPast).toBe(false)
            expect(wordClass.isFuture).toBe(false)
          }

          // Past/future words should not be current
          if (wordClass.isPast || wordClass.isFuture) {
            expect(wordClass.isCurrent).toBe(false)
          }
        })

        // Test syllable highlighting for current word
        const currentWord = line.words[position.wordIndex]
        currentWord.syllables.forEach((syllable, syllableIndex) => {
          const syllableClass = getSyllableHighlightClass(
            time, syllable, position.wordIndex, position.syllableIndex, position.wordIndex, syllableIndex
          )

          // Current syllable should have exactly one true class
          if (syllableIndex === position.syllableIndex) {
            expect(syllableClass.isCurrent).toBe(true)
            expect(syllableClass.isPast).toBe(false)
            expect(syllableClass.isFuture).toBe(false)
          }
        })
      })
    })

    test('should handle timing boundary conditions correctly', () => {
      applyAllTimings()

      // Test exact timing boundaries where bobbing is most likely
      const boundaries = [
        {
          time: 0, desc: "Song start"
        },
        {
          time: 218, desc: "Hap→py syllable boundary"
        },
        {
          time: 800, desc: "Happy→Birthday word boundary"
        },
        {
          time: 3000, desc: "End of first line"
        },
        {
          time: 3500, desc: "Start of second line"
        },
        {
          time: 14000, desc: "Song end"
        }
      ]

      boundaries.forEach(({ time }) => {
        const position = engine.getCurrentPosition(time)

        // Position should be stable and predictable
        expect(position.lineIndex).toBeGreaterThanOrEqual(0)
        expect(position.wordIndex).toBeGreaterThanOrEqual(0)
        expect(position.syllableIndex).toBeGreaterThanOrEqual(0)

        // Test very close times (±1ms) should be consistent
        const positionBefore = engine.getCurrentPosition(time - 1)
        const positionAfter = engine.getCurrentPosition(time + 1)

        if (positionBefore.isActive && position.isActive && positionAfter.isActive) {
          // Should not have dramatic jumps in short time spans
          const beforeToNow = Math.abs(
            (positionBefore.lineIndex * 1000 + positionBefore.wordIndex * 100 + positionBefore.syllableIndex) -
            (position.lineIndex * 1000 + position.wordIndex * 100 + position.syllableIndex)
          )
          const nowToAfter = Math.abs(
            (position.lineIndex * 1000 + position.wordIndex * 100 + position.syllableIndex) -
            (positionAfter.lineIndex * 1000 + positionAfter.wordIndex * 100 + positionAfter.syllableIndex)
          )

          // Large jumps in 1ms should be rare (only at precise boundaries)
          expect(beforeToNow).toBeLessThan(1000) // No line jumps in 1ms
          expect(nowToAfter).toBeLessThan(1000)
        }
      })
    })
  })

  describe('Metadata Handling', () => {
    test('should parse metadata correctly and skip in timing', () => {
      const metadataLyrics = `[@TITLE:Test Song]
[@AUTHOR:Test Author]
[@CAPTION:Test Caption]

Hap/py Birth/day to you`

      const { lyrics, metadata } = parseLyricsWithMetadata(metadataLyrics)

      expect(metadata.title).toBe('Test Song')
      expect(metadata.author).toBe('Test Author')
      expect(metadata.captions).toHaveLength(1)
      expect(metadata.captions?.[0]).toBe('Test Caption')

      // Should have metadata lines plus lyric line
      expect(lyrics).toHaveLength(4) // 3 metadata + 1 lyrics

      // Only lyrics lines should be timeable
      const lyricsOnly = lyrics.filter(line => line.type === 'lyrics' || !line.type)
      expect(lyricsOnly).toHaveLength(1)
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle rapid position queries efficiently', () => {
      applyAllTimings()

      const startTime = performance.now()

      // Simulate rapid UI updates (60 FPS for 1 second)
      for (let frame = 0; frame < 60; frame++) {
        const time = frame * 16.67 // ~60 FPS
        engine.getCurrentPosition(time)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should be very fast (under 10ms for 60 queries)
      expect(duration).toBeLessThan(10)
    })

    test('should handle empty or malformed timing gracefully', () => {
      // Don't apply any timings
      const position = engine.getCurrentPosition(1000)

      // Should not crash and return safe defaults
      expect(position.isActive).toBe(false)
      expect(position.lineIndex).toBeGreaterThanOrEqual(-1)
      expect(position.wordIndex).toBeGreaterThanOrEqual(-1)
      expect(position.syllableIndex).toBeGreaterThanOrEqual(-1)
    })
  })
})
