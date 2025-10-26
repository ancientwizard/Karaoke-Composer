import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

// Test the exact scenario from the failing test
console.log('🔧 DEBUG: Testing the 218ms boundary issue')

const engine = new KaraokeTimingEngine()
const lines = [
  parseLyricsLine('Hap/py Birth/day to you', 0, 'line-1'),
  parseLyricsLine('Hap/py Birth/day to you', 1, 'line-2'),
  parseLyricsLine('Hap/py Birth/day dear [Name]', 2, 'line-3'),
  parseLyricsLine('Hap/py Birth/day to you', 3, 'line-4')
]
engine.loadLyrics(lines)

// Apply the same timing as the test
engine.assignWordTiming(0, 0, 0)     // Happy starts at 0ms
engine.assignWordTiming(0, 1, 800)   // Birthday starts at 800ms (finalizes Happy)

// Check the Happy word syllable timing
const happyWord = lines[0].words[0]
console.log('\n🔧 DEBUG: Happy syllable timing:')
happyWord.syllables.forEach((syllable, index) => {
  console.log(`  ${index}: "${syllable.syllable}" -> ${syllable.startTime}ms to ${syllable.endTime}ms`)
})

// Test position at key moments
const testTimes = [0, 200, 207, 208, 218, 220, 250, 300, 400, 800]
console.log('\n🔧 DEBUG: Position tests:')
testTimes.forEach(time => {
  const pos = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: L${pos.lineIndex}W${pos.wordIndex}S${pos.syllableIndex} (active: ${pos.isActive})`)
})

// Test exactly 218ms which the test expects to be syllable 1
console.log('\n🔧 DEBUG: Focus on 218ms:')
const pos218 = engine.getCurrentPosition(218)
console.log(`218ms position: L${pos218.lineIndex}W${pos218.wordIndex}S${pos218.syllableIndex} (expected: L0W0S1)`)
console.log(`Is this correct? ${pos218.syllableIndex === 1 ? 'YES' : 'NO'}`)

// Manual check: at 218ms, which syllable should be active?
const hapSyllable = happyWord.syllables[0]
const pySyllable = happyWord.syllables[1]
console.log('\n🔧 DEBUG: Manual syllable boundary check at 218ms:')
console.log(`Hap: ${hapSyllable.startTime}ms to ${hapSyllable.endTime}ms`)
console.log(`Py: ${pySyllable.startTime}ms to ${pySyllable.endTime}ms`)
console.log(`218ms should be in: ${218 >= (hapSyllable.startTime ?? 0) && 218 < (hapSyllable.endTime ?? Infinity) ? 'Hap (S0)' : 'Py (S1)'}`)
