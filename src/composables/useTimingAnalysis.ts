//
// AI RULES:
//  - do not remove these comments
//  - KEEP & FOLLOW the style as you see here
//

import type { LyricLine, WordTiming } from '@/types/karaoke'
import { TIMING } from '@/models/TimingConstants'

export interface TimingOverlap {
  word1: WordTiming & { lineIndex: number; wordIndex: number }
  word2: WordTiming & { lineIndex: number; wordIndex: number }
  overlapStart: number
  overlapEnd: number
  overlapDuration: number
}

export interface TimingAnalysisResult {
  overlaps: TimingOverlap[]
  totalWords: number
  timedWords: number
  smallGaps: Array<{
    word1: string
    word2: string
    gap: number
  }>
  sequenceViolations: Array<{
    word1: string
    word2: string
    issue: string
  }>
  summary: string
  hasIssues: boolean
}

const formatTime = (timeMs: number): string =>
{
  const seconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function useTimingAnalysis()
{

  function analyzeTimingOverlaps(lyrics: LyricLine[]): TimingAnalysisResult
  {
    const overlaps: TimingOverlap[] = []
    const smallGaps: { word1: string; word2: string; gap: number }[] = []
    const sequenceViolations: { word1: string; word2: string; issue: string }[] = []
    let totalWords = 0
    let timedWords = 0
    const allWords: Array<WordTiming & { lineIndex: number; wordIndex: number }> = []

    // Collect all words with their positions
    lyrics.forEach((line, lineIndex) =>
    {
      line.words.forEach((word, wordIndex) =>
      {
        totalWords++
        if (word.startTime !== undefined && word.endTime !== undefined)
        {
          timedWords++
          allWords.push({
            ...word,
            lineIndex,
            wordIndex
          })
        }
      })
    })

    if (timedWords === 0)
    {
      return {
        overlaps: [],
        totalWords,
        timedWords,
        smallGaps: [],
        sequenceViolations: [],
        summary: 'No timed words found.',
        hasIssues: false
      }
    }

    // Check for sequence violations within each line BEFORE sorting
    lyrics.forEach((line) =>
    {
      const lineWords = line.words.filter(w => w.startTime !== undefined && w.endTime !== undefined)
      for (let i = 0; i < lineWords.length - 1; i++)
      {
        const word1 = lineWords[i]
        const word2 = lineWords[i + 1]

        if (word1.startTime! > word2.startTime!)
        {
          sequenceViolations.push({
            word1: word1.word,
            word2: word2.word,
            issue: `"${word1.word}" starts at ${word1.startTime}ms but comes before "${word2.word}" at ${word2.startTime}ms`
          })
        }
      }
    })

    // Sort words by start time for overlap analysis
    allWords.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

    // Check for overlaps
    for (let i = 0; i < allWords.length - 1; i++)
    {
      const word1 = allWords[i]
      const word2 = allWords[i + 1]

      if (word1.endTime! > word2.startTime!)
      {
        const overlapStart = word2.startTime!
        const overlapEnd = Math.min(word1.endTime!, word2.endTime!)
        const overlapDuration = overlapEnd - overlapStart

        overlaps.push({
          word1,
          word2,
          overlapStart,
          overlapEnd,
          overlapDuration
        })
      }
    }

    // Check for small gaps
    for (let i = 0; i < allWords.length - 1; i++)
    {
      const word1 = allWords[i]
      const word2 = allWords[i + 1]
      const gap = word2.startTime! - word1.endTime!

      if (gap >= 0 && gap < TIMING.word.collisionMargin)
      {
        const timeStr = formatTime(word1.startTime!)

        console.log(`⚠️ Small gap detected between "${word1.word}" and "${word2.word}": ${gap}ms at time ${timeStr}`)
        smallGaps.push({
          word1: word1.word,
          word2: word2.word,
          gap
        })
      }
    }

    const hasIssues = overlaps.length > 0 || smallGaps.length > 3 || sequenceViolations.length > 0
    const totalIssues = overlaps.length + smallGaps.length + sequenceViolations.length

    let summary = ''
    if (sequenceViolations.length > 0)
    {
      summary = `🚨 Critical: ${sequenceViolations.length} words out of sequence! This breaks timing order.`
    }
    else if (overlaps.length === 0 && smallGaps.length <= 3)
    {
      summary = `✅ Clean timing: ${timedWords} words, good spacing`
    }
    else
    {
      summary = `⚠️ Found ${totalIssues} spacing issues (${overlaps.length} overlaps, ${smallGaps.length} tight gaps) - may affect editing`
    }

    return {
      overlaps,
      totalWords,
      timedWords,
      smallGaps,
      sequenceViolations,
      summary,
      hasIssues
    }
  }

  function fixTimingOverlaps(lyrics: LyricLine[]): { fixCount: number; details: string[] }
  {
    console.log('🔧 Starting timing overlap fix...')
    const details: string[] = []
    let fixCount = 0

    // Process each line to collect and fix overlapping words
    const allWords: Array<{ word: WordTiming; lineIndex: number; wordIndex: number }> = []

    // Collect references to actual word objects (not copies)
    lyrics.forEach((line, lineIndex) =>
    {
      line.words.forEach((word, wordIndex) =>
      {
        if (word.startTime !== undefined && word.endTime !== undefined)
        {
          allWords.push({
            word, // Reference to actual word object
            lineIndex,
            wordIndex
          })
        }
      })
    })

    console.log(`🔍 Found ${allWords.length} timed words to check`)

    // Sort by start time
    allWords.sort((a, b) => (a.word.startTime || 0) - (b.word.startTime || 0))

    // Fix overlaps AND words that are too close together
    const minGap = TIMING.word.collisionMargin // Minimum gap (ms) from centralized timing rules

    for (let i = 0; i < allWords.length - 1; i++)
    {
      const wordRef1 = allWords[i]
      const wordRef2 = allWords[i + 1]
      const word1 = wordRef1.word
      const word2 = wordRef2.word

      const currentGap = word2.startTime! - word1.endTime!
      const needsFix = currentGap < minGap

      if (needsFix)
      { 
        const originalEnd = word1.endTime!
        const newEnd = word2.startTime! - minGap

        if (currentGap < 0)
          console.log(`🔧 Fixing overlap: "${word1.word}" (${originalEnd}ms) → "${word2.word}" (${word2.startTime}ms)`)
        else
          console.log(`🔧 Fixing tight spacing: "${word1.word}" → "${word2.word}" (${currentGap}ms gap → ${minGap}ms gap)`)
        console.log(`   Adjusting "${word1.word}" end time: ${originalEnd}ms → ${newEnd}ms`)

        word1.endTime = newEnd
        word1.duration = word1.endTime - word1.startTime!

        const actionType = currentGap < 0 ? 'overlap' : 'tight spacing'
        details.push(`Fixed ${actionType} "${word1.word}": ${originalEnd}ms → ${word1.endTime}ms`)
        fixCount++

        // Fix syllable timing if present
        if (word1.syllables && word1.syllables.length > 0)
        {
          const wordDuration = word1.duration
          let currentTime = word1.startTime!

          word1.syllables.forEach((syllable) =>
          {
            const syllableDuration = wordDuration / word1.syllables.length
            syllable.startTime = currentTime
            syllable.endTime = currentTime + syllableDuration
            syllable.duration = syllableDuration
            currentTime = syllable.endTime
          })
          console.log(`   Updated ${word1.syllables.length} syllables for "${word1.word}"`)
        }
      }
    }

    console.log(`✅ Fixed ${fixCount} overlaps`)

    return {
      fixCount,
      details
    }
  }

  return {
    analyzeTimingOverlaps,
    fixTimingOverlaps
  }
}

// END