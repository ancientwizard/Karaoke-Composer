import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

// Test syllable timing with unfinalized words (current word detection)
console.log('🔧 DEBUG: Testing syllable detection in current (unfinalized) words')

const engine = new KaraokeTimingEngine()
const line = parseLyricsLine('Hap/py birth/day to you', 0, 'test-line-1')
engine.loadLyrics([line])

console.log('\n🔧 DEBUG: Parsed syllables:')
line.words.forEach((word, wIndex) => {
  console.log(`  Word ${wIndex} "${word.word}" syllables:`, word.syllables.map(s => s.syllable))
})

// Assign timing to first word (has syllables!)
console.log('\n🔧 DEBUG: Assigning timing to "Happy" at 0ms')
engine.assignWordTiming(0, 0, 0)

console.log('\n🔧 DEBUG: Testing position during "Happy" (should detect syllables)')
const testTimes = [0, 50, 100, 150, 200, 250, 300]
testTimes.forEach(time => {
  const pos = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: L${pos.lineIndex}W${pos.wordIndex}S${pos.syllableIndex} (active: ${pos.isActive})`)
})

console.log('\n🔧 DEBUG: Assigning timing to "birthday" at 300ms')
engine.assignWordTiming(0, 1, 300)

console.log('\n🔧 DEBUG: Check Happy syllables after finalization:')
console.log(line.words[0].syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime
})))

console.log('\n🔧 DEBUG: Testing position during "birthday" (should detect syllables)')
const testTimes2 = [300, 350, 400, 450, 500]
testTimes2.forEach(time => {
  const pos = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: L${pos.lineIndex}W${pos.wordIndex}S${pos.syllableIndex} (active: ${pos.isActive})`)
})
