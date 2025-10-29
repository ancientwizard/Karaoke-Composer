#!/usr/bin/env -S npx tsx

import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine'
import { parseLyricsLine } from '../utils/lyricsParser'

console.log('🔧 DEBUG: Testing 1127ms boundary issue')

// Use exact same setup as test
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

// Parse test lyrics exactly like test
const HAPPY_BIRTHDAY_SIMPLE = [
  'Hap/py Birth/day to you',
  'Hap/py Birth/day to you',
  'Hap/py Birth/day dear [Name]',
  'Hap/py Birth/day to you'
]

const testLyrics = HAPPY_BIRTHDAY_SIMPLE.map((line, index) =>
  parseLyricsLine(line, index + 1, `line-${index}`)
)

engine.loadLyrics(testLyrics)

// Apply exact same timing sequence as test applyAllTimings() function
// Line 1: Happy Birthday to you
engine.assignWordTiming(0, 0, 0)     // Happy starts at 0ms
engine.assignWordTiming(0, 1, 800)   // Birthday starts at 800ms
engine.assignWordTiming(0, 2, 2000)  // to starts at 2000ms
engine.assignWordTiming(0, 3, 2400)  // you starts at 2400ms

// Line 2: Happy Birthday to you
engine.assignWordTiming(1, 0, 3500)  // Happy starts at 3500ms
engine.assignWordTiming(1, 1, 4300)  // Birthday starts at 4300ms
engine.assignWordTiming(1, 2, 5500)  // to starts at 5500ms
engine.assignWordTiming(1, 3, 5900)  // you starts at 5900ms

// Line 3: Happy Birthday dear [Name]
engine.assignWordTiming(2, 0, 7000)  // Happy starts at 7000ms
engine.assignWordTiming(2, 1, 7800)  // Birthday starts at 7800ms
engine.assignWordTiming(2, 2, 9000)  // dear starts at 9000ms
engine.assignWordTiming(2, 3, 9500)  // [Name] starts at 9500ms

// Line 4: Happy Birthday to you
engine.assignWordTiming(3, 0, 11000) // Happy starts at 11000ms
engine.assignWordTiming(3, 1, 11800) // Birthday starts at 11800ms
engine.assignWordTiming(3, 2, 13000) // to starts at 13000ms
engine.assignWordTiming(3, 3, 13400) // you starts at 13400ms

// Finalize all timing
engine.finalizeAllTiming(14000)

// Get the first "Birthday" word syllables to see exact timing
const firstBirthday = testLyrics[0].words[1]
console.log('\nFirst Birthday syllables:')
firstBirthday.syllables.forEach((syllable: any, index: number) => {
  console.log(`  ${index}: "${syllable.syllable}" -> ${syllable.startTime}ms to ${syllable.endTime}ms`)
})

// Test the specific problematic time (1127ms)
console.log(`\nTesting 1127ms boundary:`)
const pos1126 = engine.getCurrentPosition(1126)
console.log(`  1126ms: L${pos1126.lineIndex}W${pos1126.wordIndex}S${pos1126.syllableIndex}`)

const pos1127 = engine.getCurrentPosition(1127)
console.log(`  1127ms: L${pos1127.lineIndex}W${pos1127.wordIndex}S${pos1127.syllableIndex}`)

const pos1128 = engine.getCurrentPosition(1128)
console.log(`  1128ms: L${pos1128.lineIndex}W${pos1128.wordIndex}S${pos1128.syllableIndex}`)
