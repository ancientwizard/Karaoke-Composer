import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

console.log('🔧 DEBUG: Testing 219ms specifically')

const engine = new KaraokeTimingEngine({
  syllableWeights: {
    first: 0.6,
    middle: 0.8,
    last: 1.6
  },
  gaps: {
    shortPause: 100,
    mediumPause: 300,
    longPause: 800
  }
})

// Set up the same test data as the main test
const lines = [
  parseLyricsLine('Hap/py Birth/day to you', 0, 'line-1'),
  parseLyricsLine('Hap/py Birth/day to you', 1, 'line-2'),
  parseLyricsLine('Hap/py Birth/day dear [Name]', 2, 'line-3'),
  parseLyricsLine('Hap/py Birth/day to you', 3, 'line-4')
]
engine.loadLyrics(lines)

// Apply timings using the same pattern as the main test (applyAllTimings equivalent)
engine.assignWordTiming(0, 0, 0)     // Happy starts at 0ms
engine.assignWordTiming(0, 1, 800)   // Birthday starts at 800ms (finalizes Happy to 0-800ms)

// Check syllable timing
const happyWord = lines[0].words[0]
console.log('Happy syllables:')
happyWord.syllables.forEach((syllable: any, index: number) => {
  console.log(`  ${index}: "${syllable.syllable}" -> ${syllable.startTime}ms to ${syllable.endTime}ms`)
})

// Test specifically at 219ms
const position219 = engine.getCurrentPosition(219)
console.log(`\nPosition at 219ms: L${position219.lineIndex}W${position219.wordIndex}S${position219.syllableIndex}`)
console.log(`Expected: L0W0S1`)
console.log(`Match? ${position219.syllableIndex === 1}`)

// Test adjacent times
const times = [217, 218, 218.5, 219, 219.5, 220]
console.log('\nAdjacent times:')
times.forEach(time => {
  const pos = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: syllable ${pos.syllableIndex}`)
})
