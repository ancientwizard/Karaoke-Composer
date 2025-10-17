import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

// Create the exact same setup as the failing test
function createEngine() {
  const engine = new KaraokeTimingEngine()
  const lyrics = [
    parseLyricsLine('Hap/py Birth/day to you', 0, 'line-1'),
    parseLyricsLine('Hap/py Birth/day to you', 1, 'line-2'),
    parseLyricsLine('Hap/py Birth/day dear [Name]', 2, 'line-3'),
    parseLyricsLine('Hap/py Birth/day to you', 3, 'line-4')
  ]
  engine.loadLyrics(lyrics)
  return {
    engine, lyrics
  }
}

// Timing data from the test
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
    word: "you", start: 2400, end: 3500
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
    word: "you", start: 5900, end: 7000, lineIndex: 1
  },

  // Line 3: "Happy Birthday dear [Name]" (7000-11000ms)
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
    word: "[Name]", start: 9500, end: 11000, lineIndex: 2
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

function applyAllTimings(engine: KaraokeTimingEngine, lyrics: any): void {
  for (const timing of COMPLETE_TIMINGS) {
    const lineIndex = timing.lineIndex || 0
    let wordIndex = -1

    for (let i = 0; i < lyrics[lineIndex].words.length; i++) {
      if (lyrics[lineIndex].words[i].word === timing.word) {
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

console.log('🔧 DEBUG: Testing exact same setup as failing test')

const { engine, lyrics } = createEngine()
applyAllTimings(engine, lyrics)

// Test the exact same moments that the test is checking
const testMoments = [
  {
    time: 0, expectedLine: 0, expectedWord: 0, expectedSyllable: 0, desc: "Start of Hap"
  },
  {
    time: 218, expectedLine: 0, expectedWord: 0, expectedSyllable: 1, desc: "Start of py"
  },
  {
    time: 800, expectedLine: 0, expectedWord: 1, expectedSyllable: 0, desc: "Start of Birth"
  }
]

console.log('\n📍 Testing Key Position Moments (same as test):')
testMoments.forEach(({
  time, expectedLine, expectedWord, expectedSyllable, desc
}) => {
  const position = engine.getCurrentPosition(time)

  console.log(`  ${time}ms (${desc}): L${position.lineIndex}W${position.wordIndex}S${position.syllableIndex} ${position.isActive ? '✓' : '✗'}`)
  console.log(`    Expected: L${expectedLine}W${expectedWord}S${expectedSyllable}`)
  console.log(`    Match: ${position.lineIndex === expectedLine && position.wordIndex === expectedWord && position.syllableIndex === expectedSyllable ? 'YES' : 'NO'}`)
})

// Check syllable timing for first Happy word
console.log('\n🔧 DEBUG: First Happy word syllable timing:')
const happyWord = lyrics[0].words[0]
happyWord.syllables.forEach((syllable: any, index: number) => {
  console.log(`  ${index}: "${syllable.syllable}" -> ${syllable.startTime}ms to ${syllable.endTime}ms`)
})

console.log('\n🔧 DEBUG: Stats check:')
const stats = engine.getStats()
console.log(`timedWords: ${stats.timedWords} (total: ${stats.totalWords})`)
console.log(`timedSyllables: ${stats.timedSyllables} (total: ${stats.totalSyllables})`)
