import type { LyricLine, WordTiming } from '../types/karaoke'

/**
 * Debug script to analyze timing overlaps in song data
 * Helps identify if words have overlapping timing that could cause UI/editing issues
 */

console.log('🔍 TIMING OVERLAP ANALYSIS')
console.log('==========================')

// You'll need to replace this with your actual song data
// For now, let's create a function that can analyze any timing data structure

interface TimingOverlap {
  word1: WordTiming
  word2: WordTiming
  overlapStart: number
  overlapEnd: number
  overlapDuration: number
  lineIndex1: number
  lineIndex2: number
  wordIndex1: number
  wordIndex2: number
}

function analyzeTimingOverlaps(lyrics: LyricLine[]): {
  overlaps: TimingOverlap[]
  totalWords: number
  timedWords: number
  summary: string
} {
  const overlaps: TimingOverlap[] = []
  let totalWords = 0
  let timedWords = 0
  const allWords: Array<WordTiming & { lineIndex: number; wordIndex: number }> = []

  // Collect all words with their positions
  lyrics.forEach((line, lineIndex) => {
    line.words.forEach((word, wordIndex) => {
      totalWords++
      if (word.startTime !== undefined && word.endTime !== undefined) {
        timedWords++
        allWords.push({
          ...word,
          lineIndex,
          wordIndex
        })
      }
    })
  })

  console.log(`📊 Found ${timedWords} timed words out of ${totalWords} total words`)

  // Sort words by start time for easier analysis
  allWords.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

  // Check for overlaps
  for (let i = 0; i < allWords.length - 1; i++) {
    const word1 = allWords[i]
    const word2 = allWords[i + 1]

    if (word1.endTime! > word2.startTime!) {
      const overlapStart = word2.startTime!
      const overlapEnd = Math.min(word1.endTime!, word2.endTime!)
      const overlapDuration = overlapEnd - overlapStart

      overlaps.push({
        word1: word1,
        word2: word2,
        overlapStart,
        overlapEnd,
        overlapDuration,
        lineIndex1: word1.lineIndex,
        lineIndex2: word2.lineIndex,
        wordIndex1: word1.wordIndex,
        wordIndex2: word2.wordIndex
      })

      console.log(`❌ OVERLAP DETECTED:`)
      console.log(`   Word 1: "${word1.word}" [L${word1.lineIndex}W${word1.wordIndex}] ${word1.startTime}ms - ${word1.endTime}ms`)
      console.log(`   Word 2: "${word2.word}" [L${word2.lineIndex}W${word2.wordIndex}] ${word2.startTime}ms - ${word2.endTime}ms`)
      console.log(`   Overlap: ${overlapStart}ms - ${overlapEnd}ms (${overlapDuration}ms duration)`)
      console.log(`   Gap should be: ${word1.endTime! - word2.startTime!}ms`)
      console.log('')
    }
  }

  // Check for gaps that are too small (might indicate near-overlaps)
  let smallGaps = 0
  for (let i = 0; i < allWords.length - 1; i++) {
    const word1 = allWords[i]
    const word2 = allWords[i + 1]
    const gap = word2.startTime! - word1.endTime!

    if (gap >= 0 && gap < 50) { // Less than 50ms gap
      smallGaps++
      console.log(`⚠️  SMALL GAP: "${word1.word}" -> "${word2.word}" gap: ${gap}ms`)
    }
  }

  const summary = overlaps.length === 0
    ? `✅ No overlaps found! ${timedWords} words have clean timing.${smallGaps > 0 ? ` (${smallGaps} small gaps detected)` : ''}`
    : `❌ Found ${overlaps.length} overlapping word pairs! This could cause UI/editing issues.`

  console.log('\n🎯 SUMMARY:')
  console.log(summary)

  if (overlaps.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:')
    console.log('• Consider resetting timing and re-adding from scratch')
    console.log('• Or manually fix overlaps by adjusting end times to not exceed next start times')
    console.log('• Check KaraokeTimingEngine.finalizeWordTiming() for bugs')
  }

  return {
    overlaps,
    totalWords,
    timedWords,
    summary
  }
}

// Function to fix overlaps automatically
function fixTimingOverlaps(lyrics: LyricLine[]): number {
  let fixCount = 0
  const allWords: Array<WordTiming & { lineIndex: number; wordIndex: number }> = []

  // Collect all timed words
  lyrics.forEach((line, lineIndex) => {
    line.words.forEach((word, wordIndex) => {
      if (word.startTime !== undefined && word.endTime !== undefined) {
        allWords.push({
          ...word,
          lineIndex,
          wordIndex
        })
      }
    })
  })

  // Sort by start time
  allWords.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

  // Fix overlaps by adjusting end times
  for (let i = 0; i < allWords.length - 1; i++) {
    const word1 = allWords[i]
    const word2 = allWords[i + 1]

    if (word1.endTime! > word2.startTime!) {
      const originalEnd = word1.endTime!
      word1.endTime = word2.startTime! - 1 // Leave 1ms gap
      word1.duration = word1.endTime - word1.startTime!

      console.log(`🔧 FIXED: "${word1.word}" end time ${originalEnd}ms -> ${word1.endTime}ms`)
      fixCount++

      // Also need to update syllable timing within the word
      if (word1.syllables && word1.syllables.length > 0) {
        const wordDuration = word1.duration
        let currentTime = word1.startTime!

        word1.syllables.forEach((syllable) => {
          const syllableDuration = wordDuration / word1.syllables.length
          syllable.startTime = currentTime
          syllable.endTime = currentTime + syllableDuration
          syllable.duration = syllableDuration
          currentTime = syllable.endTime
        })
      }
    }
  }

  return fixCount
}

// Test with sample data (you can replace this with your actual song data)
console.log('\n🧪 Testing with sample data...')

// If you want to test this with your actual song data, you would:
// 1. Load your song data from localStorage or wherever it's stored
// 2. Call analyzeTimingOverlaps(yourSongLyrics)
// 3. If overlaps found, optionally call fixTimingOverlaps(yourSongLyrics)

export { analyzeTimingOverlaps, fixTimingOverlaps }
