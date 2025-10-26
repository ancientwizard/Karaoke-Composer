import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

// Test with multiple words to see syllable timing behavior
console.log('🔧 DEBUG: Testing with multiple words to see syllable timing')

const engine = new KaraokeTimingEngine()
const line = parseLyricsLine('Happy birthday to you', 0, 'test-line-1')
engine.loadLyrics([line])

console.log('\n🔧 DEBUG: Initial state - all syllables')
line.words.forEach((word, wIndex) => {
  console.log(`  Word ${wIndex} "${word.word}" syllables:`, word.syllables.map(s => ({
    syllable: s.syllable,
    startTime: s.startTime,
    endTime: s.endTime
  })))
})

// Assign timing to first word
console.log('\n🔧 DEBUG: Assigning timing to first word "Happy" at 0ms')
engine.assignWordTiming(0, 0, 0)

console.log('\n🔧 DEBUG: After first word timing - check syllables')
line.words.forEach((word, wIndex) => {
  console.log(`  Word ${wIndex} "${word.word}" syllables:`, word.syllables.map(s => ({
    syllable: s.syllable,
    startTime: s.startTime,
    endTime: s.endTime
  })))
})

// Assign timing to second word (this should finalize the first word)
console.log('\n🔧 DEBUG: Assigning timing to second word "birthday" at 500ms')
engine.assignWordTiming(0, 1, 500)

console.log('\n🔧 DEBUG: After second word timing - check syllables (first word should be finalized)')
line.words.forEach((word, wIndex) => {
  console.log(`  Word ${wIndex} "${word.word}" syllables:`, word.syllables.map(s => ({
    syllable: s.syllable,
    startTime: s.startTime,
    endTime: s.endTime
  })))
})

// Test position detection
console.log('\n🔧 DEBUG: Testing position detection at various times')
const testTimes = [0, 100, 200, 300, 400, 500, 600, 700, 800]
testTimes.forEach(time => {
  const pos = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: L${pos.lineIndex}W${pos.wordIndex}S${pos.syllableIndex} (active: ${pos.isActive})`)
})
