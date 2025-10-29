#!/usr/bin/env -S npx tsx

/**
 * Debug syllable timing to find the root cause
 */

import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

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

const lyrics = ["Hap/py Birth/day to you"].map((line, index) =>
  parseLyricsLine(line, index + 1, `line-${index}`)
)

engine.loadLyrics(lyrics)

// Apply timing to first word
console.log('🔧 DEBUG: Before assigning timing')
const happyWord = lyrics[0].words[0]
console.log('  Happy word syllables:', happyWord.syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime,
  duration: s.duration
})))

engine.assignWordTiming(0, 0, 0)

console.log('\n🔧 DEBUG: After assigning timing')
console.log('  Happy word syllables:', happyWord.syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime,
  duration: s.duration
})))

console.log('\n🔧 DEBUG: Testing getCurrentPosition at various times')
for (const time of [0, 100, 218, 219, 400, 600, 800]) {
  const position = engine.getCurrentPosition(time)
  console.log(`  ${time}ms: L${position.lineIndex}W${position.wordIndex}S${position.syllableIndex} (active: ${position.isActive})`)
}

console.log('\n🔧 DEBUG: Manual syllable checking at 218ms')
const timestamp = 218
const word = lyrics[0].words[0]
console.log(`  Word timing: ${word.startTime} - ${word.endTime}`)
for (let i = 0; i < word.syllables.length; i++) {
  const syllable = word.syllables[i]
  const inRange = timestamp >= (syllable.startTime ?? -1) && timestamp < (syllable.endTime ?? -1)
  console.log(`    Syllable ${i} "${syllable.syllable}": ${syllable.startTime} - ${syllable.endTime} → ${inRange ? 'MATCH' : 'no'}`)
}
