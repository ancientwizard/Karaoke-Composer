// Utility functions for parsing lyrics with syllable markers
import type { LyricLine, WordTiming, SyllableTiming } from '@/types/karaoke'

/**
 * Parse a line of text with syllable markers (/) into structured word/syllable data
 * Example: "Hel/lo world a/maz/ing" -> [{ word: "Hello", syllables: ["Hel", "lo"] }, ...]
 */
export function parseLyricsLine(text: string, lineNumber: number, lineId: string): LyricLine {
  const words: WordTiming[] = []

  // Split by spaces to get words
  const wordTexts = text.split(/\s+/).filter(word => word.length > 0)

  wordTexts.forEach((wordText, wordIndex) => {
    // Split word by "/" to get syllables
    const syllableTexts = wordText.split('/').filter(syl => syl.length > 0)

    const syllables: SyllableTiming[] = syllableTexts.map((syllableText, syllableIndex) => ({
      syllable: syllableText,
      // startTime, endTime, duration will be added during timing
    }))

    // Reconstruct the full word without syllable markers
    const fullWord = syllableTexts.join('')

    words.push({
      word: fullWord,
      syllables: syllables,
      // startTime, endTime, duration will be added during timing
    })
  })

  return {
    id: lineId,
    lineNumber: lineNumber,
    text: text, // Keep original text with markers
    words: words,
    // startTime, endTime, duration will be added during timing
  }
}

/**
 * Convert structured lyrics back to text with syllable markers
 */
export function lyricLineToText(lyricLine: LyricLine): string {
  return lyricLine.words
    .map(word => {
      if (word.syllables.length <= 1) {
        return word.word
      } else {
        return word.syllables.map(syl => syl.syllable).join('/')
      }
    })
    .join(' ')
}

/**
 * Parse multiple lines of lyrics text
 */
export function parseLyricsText(lyricsText: string): LyricLine[] {
  if (!lyricsText || typeof lyricsText !== 'string') {
    return []
  }

  const lines = lyricsText.split('\n').filter(line => line.trim().length > 0)

  return lines.map((line, index) => parseLyricsLine(line.trim(), index + 1, `line-${Date.now()}-${index}`))
}

/**
 * Find the current word/syllable based on playback time
 */
export function getCurrentPosition(
  lyrics: LyricLine[],
  currentTime: number
): {
  lineIndex: number
  wordIndex: number
  syllableIndex: number
  line?: LyricLine
  word?: WordTiming
  syllable?: SyllableTiming
} {
  for (let lineIndex = 0; lineIndex < lyrics.length; lineIndex++) {
    const line = lyrics[lineIndex]

    // Check if we're within this line's timeframe
    if (line.startTime !== undefined && line.endTime !== undefined) {
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        // Find current word within the line
        for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
          const word = line.words[wordIndex]

          if (word.startTime !== undefined && word.endTime !== undefined) {
            if (currentTime >= word.startTime && currentTime <= word.endTime) {
              // Find current syllable within the word
              for (let syllableIndex = 0; syllableIndex < word.syllables.length; syllableIndex++) {
                const syllable = word.syllables[syllableIndex]

                if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
                  if (currentTime >= syllable.startTime && currentTime <= syllable.endTime) {
                    return {
                      lineIndex,
                      wordIndex,
                      syllableIndex,
                      line,
                      word,
                      syllable,
                    }
                  }
                }
              }

              // If no syllable timing found, return word timing
              return {
                lineIndex,
                wordIndex,
                syllableIndex: 0,
                line,
                word,
                syllable: word.syllables[0],
              }
            }
          }
        }

        // If no word timing found, return line timing
        return {
          lineIndex,
          wordIndex: 0,
          syllableIndex: 0,
          line,
          word: line.words[0],
          syllable: line.words[0]?.syllables[0],
        }
      }
    }
  }

  // No timing found, return first position
  return {
    lineIndex: 0,
    wordIndex: 0,
    syllableIndex: 0,
    line: lyrics[0],
    word: lyrics[0]?.words[0],
    syllable: lyrics[0]?.words[0]?.syllables[0],
  }
}

/**
 * Assign timing to a word (spacebar functionality)
 */
export function assignWordTiming(
  lyrics: LyricLine[],
  lineIndex: number,
  wordIndex: number,
  startTime: number,
  estimatedWordDuration: number = 500 // Default 500ms per word
): LyricLine[] {
  const updatedLyrics = [...lyrics]
  const line = updatedLyrics[lineIndex]

  if (line && line.words[wordIndex]) {
    const word = line.words[wordIndex]
    word.startTime = startTime
    word.endTime = startTime + estimatedWordDuration
    word.duration = estimatedWordDuration

    // Distribute timing across syllables if multiple
    if (word.syllables.length > 1) {
      const syllableDuration = estimatedWordDuration / word.syllables.length

      word.syllables.forEach((syllable, index) => {
        syllable.startTime = startTime + index * syllableDuration
        syllable.endTime = startTime + (index + 1) * syllableDuration
        syllable.duration = syllableDuration
      })
    } else if (word.syllables.length === 1) {
      // Single syllable gets full word timing
      word.syllables[0].startTime = startTime
      word.syllables[0].endTime = startTime + estimatedWordDuration
      word.syllables[0].duration = estimatedWordDuration
    }

    // Update line timing
    updateLineTiming(line)
  }

  return updatedLyrics
}

/**
 * Assign timing to a specific syllable (manual adjustment)
 */
export function assignSyllableTiming(
  lyrics: LyricLine[],
  lineIndex: number,
  wordIndex: number,
  syllableIndex: number,
  startTime: number,
  duration: number
): LyricLine[] {
  const updatedLyrics = [...lyrics]
  const line = updatedLyrics[lineIndex]

  if (line && line.words[wordIndex] && line.words[wordIndex].syllables[syllableIndex]) {
    const syllable = line.words[wordIndex].syllables[syllableIndex]
    syllable.startTime = startTime
    syllable.endTime = startTime + duration
    syllable.duration = duration

    // Update word timing based on syllables
    updateWordTiming(line.words[wordIndex])

    // Update line timing
    updateLineTiming(line)
  }

  return updatedLyrics
}

/**
 * Update word timing based on syllable timings
 */
function updateWordTiming(word: WordTiming): void {
  const timedSyllables = word.syllables.filter(syl => syl.startTime !== undefined && syl.endTime !== undefined)

  if (timedSyllables.length > 0) {
    const startTimes = timedSyllables.map(syl => syl.startTime!).filter(t => t !== undefined)
    const endTimes = timedSyllables.map(syl => syl.endTime!).filter(t => t !== undefined)

    word.startTime = Math.min(...startTimes)
    word.endTime = Math.max(...endTimes)
    word.duration = word.endTime - word.startTime
  }
}

/**
 * Update line timing based on word timings
 */
function updateLineTiming(line: LyricLine): void {
  const timedWords = line.words.filter(word => word.startTime !== undefined && word.endTime !== undefined)

  if (timedWords.length > 0) {
    const startTimes = timedWords.map(word => word.startTime!).filter(t => t !== undefined)
    const endTimes = timedWords.map(word => word.endTime!).filter(t => t !== undefined)

    line.startTime = Math.min(...startTimes)
    line.endTime = Math.max(...endTimes)
    line.duration = line.endTime - line.startTime
  }
}

/**
 * Calculate completion statistics
 */
export function getTimingStats(lyrics: LyricLine[]): {
  totalLines: number
  timedLines: number
  totalWords: number
  timedWords: number
  totalSyllables: number
  timedSyllables: number
  completionPercent: number
} {
  let totalWords = 0
  let timedWords = 0
  let totalSyllables = 0
  let timedSyllables = 0
  let timedLines = 0

  lyrics.forEach(line => {
    if (line.startTime !== undefined && line.endTime !== undefined) {
      timedLines++
    }

    line.words.forEach(word => {
      totalWords++
      if (word.startTime !== undefined && word.endTime !== undefined) {
        timedWords++
      }

      word.syllables.forEach(syllable => {
        totalSyllables++
        if (syllable.startTime !== undefined && syllable.endTime !== undefined) {
          timedSyllables++
        }
      })
    })
  })

  const completionPercent = totalSyllables > 0 ? Math.round((timedSyllables / totalSyllables) * 100) : 0

  return {
    totalLines: lyrics.length,
    timedLines,
    totalWords,
    timedWords,
    totalSyllables,
    timedSyllables,
    completionPercent,
  }
}
