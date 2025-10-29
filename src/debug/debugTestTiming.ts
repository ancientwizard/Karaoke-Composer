#!/usr/bin/env -S npx tsx

import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

// Test to understand the timing behavior in tests
console.log('🔧 DEBUG: Understanding syllable timing behavior in tests')

const engine = new KaraokeTimingEngine()
const lines = [
  parseLyricsLine('Hap/py Birth/day to you', 0, 'line-1'),
  parseLyricsLine('Hap/py Birth/day to you', 1, 'line-2'),
  parseLyricsLine('Hap/py Birth/day dear [Name]', 2, 'line-3'),
  parseLyricsLine('Hap/py Birth/day to you', 3, 'line-4')
]
engine.loadLyrics(lines)

console.log('\n🔧 DEBUG: Initial syllable state')
const happyWord = lines[0].words[0]
console.log('Happy syllables:', happyWord.syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime,
  duration: s.duration
})))

console.log('\n🔧 DEBUG: Assigning timing to first word "Happy" at 0ms')
const events = engine.assignWordTiming(0, 0, 0)
console.log('Events:', events)

console.log('\n🔧 DEBUG: Syllable state after assignment (should still be undefined)')
console.log('Happy syllables:', happyWord.syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime,
  duration: s.duration
})))

console.log('\n🔧 DEBUG: Assigning timing to second word "Birthday" at 800ms (should finalize "Happy")')
const events2 = engine.assignWordTiming(0, 1, 800)
console.log('Events:', events2)

console.log('\n🔧 DEBUG: Syllable state after finalization (should now have timing)')
console.log('Happy syllables:', happyWord.syllables.map(s => ({
  syllable: s.syllable,
  startTime: s.startTime,
  endTime: s.endTime,
  duration: s.duration
})))

const hapSyllable = happyWord.syllables[0]
const pySyllable = happyWord.syllables[1]
console.log('\n🔧 DEBUG: Individual syllable check:')
console.log('Hap syllable startTime:', hapSyllable.startTime)
console.log('Py syllable endTime:', pySyllable.endTime)
console.log('Hap duration:', hapSyllable.duration)
console.log('Py duration:', pySyllable.duration)
