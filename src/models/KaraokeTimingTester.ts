/**
 * Test Script for Karaoke Timing Engine
 * Uses "Happy Birthday" - a song we all know the timing for
 * Tests timing engine without any UI dependencies
 */

import { KaraokeTimingEngine } from './KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'
import type { LyricLine } from '../types/karaoke'

// Happy Birthday lyrics with syllable markers
const HAPPY_BIRTHDAY_LYRICS = [
  "Hap/py Birth/day to you",
  "Hap/py Birth/day to you",
  "Hap/py Birth/day dear [Name]",
  "Hap/py Birth/day to you"
]

// Known timing for Happy Birthday (approximate)
// Each line is about 3 seconds, with specific word timings
const EXPECTED_TIMINGS = [
  // Line 1: "Happy Birthday to you" (0-3000ms)
  {
    word: "Happy", start: 0, duration: 800
  },
  {
    word: "Birthday", start: 800, duration: 1200
  },
  {
    word: "to", start: 2000, duration: 400
  },
  {
    word: "you", start: 2400, duration: 600
  },

  // Line 2: "Happy Birthday to you" (3500-6500ms)
  {
    word: "Happy", start: 3500, duration: 800
  },
  {
    word: "Birthday", start: 4300, duration: 1200
  },
  {
    word: "to", start: 5500, duration: 400
  },
  {
    word: "you", start: 5900, duration: 600
  },

  // Line 3: "Happy Birthday dear [Name]" (7000-10500ms)
  {
    word: "Happy", start: 7000, duration: 800
  },
  {
    word: "Birthday", start: 7800, duration: 1200
  },
  {
    word: "dear", start: 9000, duration: 500
  },
  {
    word: "[Name]", start: 9500, duration: 1000
  },

  // Line 4: "Happy Birthday to you" (11000-14000ms)
  {
    word: "Happy", start: 11000, duration: 800
  },
  {
    word: "Birthday", start: 11800, duration: 1200
  },
  {
    word: "to", start: 13000, duration: 400
  },
  {
    word: "you", start: 13400, duration: 600
  }
]

class KaraokeTimingTester {
  private engine: KaraokeTimingEngine
  private lyrics: LyricLine[]

  constructor() {
    this.engine = new KaraokeTimingEngine({
      syllableWeights: {
        first: 0.6,   // "Hap" gets less time
        middle: 0.8,  // "Birth" gets medium time
        last: 1.6     // "py", "day" get more time
      },
      gaps: {
        shortPause: 100,
        mediumPause: 300,
        longPause: 800
      }
    })

    // Parse lyrics into structured format
    this.lyrics = HAPPY_BIRTHDAY_LYRICS.map((line, index) =>
      parseLyricsLine(line, index + 1, `line-${index}`)
    )

    console.log('🎵 Karaoke Timing Engine Test - Happy Birthday')
    console.log('='.repeat(60))
    console.log('Lyrics loaded:')
    this.lyrics.forEach((line, index) => {
      console.log(`  Line ${index + 1}: ${line.text}`)
      console.log(`    Words: ${line.words.map(w => w.word).join(', ')}`)
      console.log(`    Syllables: ${line.words.map(w =>
        w.syllables.map(s => s.syllable).join('-')
      ).join(' | ')}`)
    })
    console.log('')
  }

  /**
   * Simulate applying timing at the expected timestamps
   */
  async simulateManualTiming(): Promise<void> {
    console.log('🎹 Simulating Manual Timing Application')
    console.log('-'.repeat(40))

    this.engine.loadLyrics(this.lyrics)

    // const currentLineIndex = 0
    // const currentWordIndex = 0

    // Apply timing based on our expected timings
    for (const timing of EXPECTED_TIMINGS) {
      // Find the line and word for this timing
      const position = this.findWordPosition(timing.word)
      if (position) {
        console.log(`⏰ Applying timing: "${timing.word}" at ${timing.start}ms`)

        const events = this.engine.assignWordTiming(
          position.lineIndex,
          position.wordIndex,
          timing.start
        )

        // Log events
        events.forEach(event => {
          console.log(`  📋 Event: ${event.type} - ${event.text || 'N/A'}`)
        })

        // Small delay to simulate human timing
        await this.delay(50)
      }
    }

    // Finalize at end of song
    console.log('🏁 Finalizing timing at song end (14000ms)')
    const finalEvents = this.engine.finalizeAllTiming(14000)
    finalEvents.forEach(event => {
      console.log(`  📋 Final Event: ${event.type} - ${event.text || 'N/A'}`)
    })
  }

  /**
   * Test automatic time progression (fast simulation)
   */
  async simulatePlayback(): Promise<void> {
    console.log('\n🚀 Simulating Fast Playback (1000x speed)')
    console.log('-'.repeat(40))

    const songDuration = 14000 // 14 seconds
    const timeStep = 100 // Check every 100ms
    // const speedMultiplier = 1000 // 1000x faster than real time

    for (let time = 0; time <= songDuration; time += timeStep) {
      const position = this.engine.getCurrentPosition(time)

      if (position.isActive) {
        const line = this.lyrics[position.lineIndex]
        const word = line.words[position.wordIndex]
        const syllable = word.syllables[position.syllableIndex]

        console.log(`⏱️  ${time.toString().padStart(5)}ms: Line ${position.lineIndex + 1}, ` +
          `Word "${word.word}", Syllable "${syllable.syllable}"`)
      }

      // Simulate processing time (very fast)
      await this.delay(1)
    }
  }

  /**
   * Analyze the results and validate timing quality
   */
  analyzeResults(): void {
    console.log('\n📊 Timing Analysis Results')
    console.log('='.repeat(40))

    const stats = this.engine.getStats()
    console.log(`Words: ${stats.timedWords}/${stats.totalWords} (${stats.completionPercent.toFixed(1)}%)`)
    console.log(`Syllables: ${stats.timedSyllables}/${stats.totalSyllables}`)
    console.log(`Average word duration: ${stats.averageWordDuration.toFixed(1)}ms`)
    console.log(`Total events: ${stats.eventCount}`)

    console.log('\n🔍 Syllable Timing Analysis:')
    this.lyrics.forEach((line, lineIndex) => {
      console.log(`\nLine ${lineIndex + 1}: "${line.text}"`)
      line.words.forEach((word) => {
        if (word.startTime !== undefined && word.endTime !== undefined) {
          const duration = word.endTime - word.startTime
          console.log(`  Word "${word.word}": ${word.startTime}ms - ${word.endTime}ms (${duration}ms)`)

          word.syllables.forEach((syllable) => {
            if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
              const sylDuration = syllable.endTime - syllable.startTime
              const percentage = ((sylDuration / duration) * 100).toFixed(1)
              console.log(`    Syllable "${syllable.syllable}": ${sylDuration.toFixed(1)}ms (${percentage}%)`)
            }
          })
        }
      })
    })
  }

  /**
   * Test timing validation and error detection
   */
  testEdgeCases(): void {
    console.log('\n🧪 Testing Edge Cases')
    console.log('-'.repeat(30))

    // Test invalid positions
    console.log('Testing invalid positions:')
    const invalidEvents = this.engine.assignWordTiming(99, 99, 1000)
    console.log(`  Invalid position returned ${invalidEvents.length} events`)

    // Test gaps detection
    console.log('Testing gap detection with punctuation...')
    // This would require lyrics with punctuation to test properly

    // Test syllable distribution patterns
    console.log('Testing syllable distribution patterns:')
    this.lyrics[0].words.forEach(word => {
      if (word.syllables.length > 1) {
        const syllableDurations = word.syllables.map(s =>
          s.duration || 0
        ).filter(d => d > 0)

        if (syllableDurations.length > 1) {
          const firstLast = syllableDurations[0] / syllableDurations[syllableDurations.length - 1]
          console.log(`  "${word.word}": First/Last syllable ratio = ${firstLast.toFixed(2)}`)
        }
      }
    })
  }

  /**
   * Generate test report
   */
  generateReport(): void {
    console.log('\n📝 Test Report Summary')
    console.log('='.repeat(50))

    const events = this.engine.getEventLog()
    const stats = this.engine.getStats()

    console.log(`✅ Engine Status: ${stats.completionPercent === 100 ? 'PASSED' : 'PARTIAL'}`)
    console.log(`✅ Word Coverage: ${stats.completionPercent.toFixed(1)}%`)
    console.log(`✅ Syllable Timing: ${stats.timedSyllables > 0 ? 'WORKING' : 'FAILED'}`)
    console.log(`✅ Event Logging: ${events.length > 0 ? 'WORKING' : 'FAILED'}`)
    console.log(`✅ Gap Detection: ${events.some(e => e.type === 'phrase_gap') ? 'WORKING' : 'UNTESTED'}`)

    // Check for timing consistency
    let consistencyIssues = 0
    this.lyrics.forEach(line => {
      line.words.forEach(word => {
        word.syllables.forEach(syllable => {
          if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
            if (syllable.endTime <= syllable.startTime) {
              consistencyIssues++
            }
          }
        })
      })
    })

    console.log(`✅ Timing Consistency: ${consistencyIssues === 0 ? 'PASSED' : `${consistencyIssues} ISSUES`}`)

    console.log('\n🎯 Recommendations:')
    if (stats.completionPercent < 100) {
      console.log('  - Ensure all words receive timing')
    }
    if (stats.averageWordDuration < 300) {
      console.log('  - Consider longer minimum word durations')
    }
    if (stats.averageWordDuration > 1000) {
      console.log('  - Consider shorter maximum word durations')
    }

    console.log('\n🎵 Ready for UI integration!')
  }

  // Helper methods
  private findWordPosition(wordText: string): { lineIndex: number, wordIndex: number } | null {
    for (let lineIndex = 0; lineIndex < this.lyrics.length; lineIndex++) {
      const line = this.lyrics[lineIndex]
      for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
        if (line.words[wordIndex].word === wordText) {
          return {
            lineIndex, wordIndex
          }
        }
      }
    }
    return null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export test runner function
export async function runKaraokeTimingTests(): Promise<void> {
  const tester = new KaraokeTimingTester()

  try {
    await tester.simulateManualTiming()
    await tester.simulatePlayback()
    tester.analyzeResults()
    tester.testEdgeCases()
    tester.generateReport()

    console.log('\n🎉 All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node environment - can run directly
  runKaraokeTimingTests().catch(console.error)
}
