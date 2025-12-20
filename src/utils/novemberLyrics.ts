// Utility to parse November lyrics and create timed word data for testing

import { parseLyricsWithMetadata } from './lyricsParser'

import { TIMING, TimingUtils } from '../models/TimingConstants'

interface Syllable {
  text: string
  startTime: number
  endTime: number
}

interface TimedWord {
  id: string
  text: string
  startTime: number
  endTime: number
  syllables: Syllable[]
}



const NOVEMBER_LYRICS = `[@TITLE:Meet Me In November]
[@AUTHOR:Ancient Wizard]

[@CAPTION:You GO Marry Poppins!]
Su/per/cal/i/frag/i/lis/tic/ex/pi/al/i/do/cious!

[@CAPTION:Verse 1]
Meet me in No/vem/ber, like a song of sto/ries told.
So per/fect it can't be real, yet hope will make it so.
Speak my name with love, and I will know your soul.
Where love can find a voice, two hearts will live as one.

[@CAPTION:Verse 2]
We meet in No/vem/ber, like a song of sto/ries told.
So per/fect it be/came real, where hope has made it so.
You spoke my name with love; you'd al/ways felt it so.
I al/rea/dy fall/ing, my heart knew it was home.

[@CAPTION:Pre Chorus]
Come meet me this No/vem/ber, to live our life fore/told.
Our Mo/ments yet to hap/pen, al/rea/dy feel like old.

[@CAPTION:Chorus]
I Choose You! Wal/king hand in hand.
I Choose You! Danc/ing through the night.
I Choose You.

[@CAPTION:Verse 3]
Our time a con/ver/sa/tion, our words a love song.
We sang in/to each ot/her, where love we grew made strong.
In that per/fect mel/o/dy, our souls had found their home.

[@CAPTION:Verse 4]
You're my Tex/as in No/vem/ber; our life made a new.
So per/fect it be/came truth, where hope has made it so.
I al/rea/dy fall/ing, my heart has come home.

[@CAPTION:Chorus]
I Choose You! Now and in Nov/em/ber.
I Choose You! Now and in for/e/ver.
I Choose You!

[@CAPTION:Bridge]
We star/ted in, A Tex/as No/vem/ber,
and in that mo/ment, you found your heart a home.

[@CAPTION:Pre Chorus (reprise)]
Come meet me in No/vem/ber, to live our life fore/told.
Our mo/ments yet to hap/pen, al/rea/dy feel like old.

[@CAPTION:Final Chorus]
You Choose Me! In all No/vem/ber.
You Choose Me! Make it for/e/ver.

[@CAPTION:(whisper)]
I do.
`

export function parseNovemberLyrics(): TimedWord[] {
  const words: TimedWord[] = []
  let currentTime = 0
  let wordId = 0
  const beatInterval = 0.8 // Longer intervals for more obvious gaps
  const wordDuration = 0.4 // Words are shorter than the beat interval

  console.log(`🎵 Generating lyrics with: wordDuration=${wordDuration}s, beatInterval=${beatInterval}s`)
  console.log(`⚙️ Using centralized timing: minGap=${TIMING.word.collisionMargin}ms, minSyllable=${TIMING.syllable.minDuration}ms`)

  // Parse the lyrics with metadata handling (like the main app)
  const { lyrics, metadata } = parseLyricsWithMetadata(NOVEMBER_LYRICS)

  console.log('📋 Parsed metadata:', {
    title: metadata.title,
    author: metadata.author,
    captions: metadata.captions?.length || 0
  })

  // Process only the lyrics lines (skip metadata)
  const lyricsLines = lyrics.filter(line => line.type === 'lyrics' || !line.type)
  console.log(`🎵 Processing ${lyricsLines.length} lyrics lines (skipping ${lyrics.length - lyricsLines.length} metadata lines)`)

  for (const lyricLine of lyricsLines) {
    const lineText = lyricLine.text

    // Skip empty lines
    if (!lineText.trim()) {
      continue
    }

    // Handle special stage directions
    if (lineText.trim().startsWith('(') && lineText.trim().endsWith(')')) {
      const stageLine = lineText.trim().slice(1, -1) // Remove parentheses
      words.push(createTimedWord(wordId++, stageLine, currentTime, currentTime + 1))
      currentTime += 1.5
      continue
    }

    // Split line into words (separated by spaces)
    const lineWords = lineText.split(/\s+/).filter((word: string) => word.trim())

    for (const word of lineWords) {
      // Remove punctuation for processing but keep it for display
      const cleanWord = word.replace(/[.,!?;:]/g, '')
      const punctuation = word.match(/[.,!?;:]/g)?.[0] || ''

      // Calculate actual word duration (may be extended for minimum syllable requirements)
      let actualWordDuration = wordDuration

      if (cleanWord.includes('/')) {
        // Multi-syllable word with musical timing distribution
        const syllableParts = cleanWord.split('/')
        const syllables: Syllable[] = []

        // Use centralized syllable weighting system for consistent timing
        const weights = TimingUtils.calculateSyllableWeights(syllableParts.length)

        const totalWeight = weights.reduce((sum: number, weight: number) => sum + weight, 0)

        // Ensure syllable durations meet minimum requirements
        const minSyllableDurationSec = TIMING.syllable.minDuration / 1000
        const totalMinDuration = minSyllableDurationSec * syllableParts.length

        if (wordDuration < totalMinDuration) {
          actualWordDuration = totalMinDuration
          console.warn(`⚠️ Test data: Extended word "${cleanWord}" from ${wordDuration}s to ${actualWordDuration}s for ${syllableParts.length} syllables`)
        }

        const syllableDurations = weights.map((weight: number) => {
          const baseDuration = minSyllableDurationSec
          const extraDuration = ((weight / totalWeight) * (actualWordDuration - totalMinDuration))
          return baseDuration + extraDuration
        })

        let syllableStartTime = currentTime
        syllableParts.forEach((syllable: string, index: number) => {
          const endTime = syllableStartTime + syllableDurations[index]
          syllables.push({
            text: syllable + (index === syllableParts.length - 1 ? punctuation : ''),
            startTime: syllableStartTime,
            endTime,
          })
          syllableStartTime = endTime
        })

        words.push({
          id: `word-${wordId++}`,
          text: cleanWord.replace(/\//g, '') + punctuation,
          startTime: currentTime,
          endTime: currentTime + actualWordDuration,
          syllables,
        })
      } else {
        // Single word or "FULL" word
        const isFullWord = cleanWord.length > 6 // Longer words become "FULL"

        if (isFullWord) {
          words.push({
            id: `word-${wordId++}`,
            text: 'FULL',
            startTime: currentTime,
            endTime: currentTime + wordDuration,
            syllables: [
              {
                text: 'FULL',
                startTime: currentTime,
                endTime: currentTime + wordDuration,
              },
            ],
          })
        } else {
          words.push(createTimedWord(wordId++, cleanWord + punctuation, currentTime, currentTime + actualWordDuration))
        }
      }

      // Apply realistic word spacing using beat-based gaps
      // Use a fraction of the beat interval as gap (more musical)
      const wordGap = beatInterval - actualWordDuration // Remaining time in beat
      const minGap = TIMING.word.collisionMargin / 1000 // Minimum safe gap
      const actualGap = Math.max(wordGap * 0.6, minGap) // Use 60% of available gap, minimum safe gap

      // Debug first few words to show gap calculations
      if (wordId <= 5) {
        console.log(`📏 Word "${cleanWord}": duration=${actualWordDuration.toFixed(3)}s, gap=${actualGap.toFixed(3)}s, next=${(currentTime + actualWordDuration + actualGap).toFixed(3)}s`)
      }

      currentTime += actualWordDuration + actualGap
    }

    // Add pause between lines
    currentTime += beatInterval * 0.5
  }

  // Debug: Log first few words to see timing and gaps
  console.log('📊 First 5 words with gaps:')
  words.slice(0, 5).forEach((word, index) => {
    const nextWord = words[index + 1]
    const gap = nextWord ? nextWord.startTime - word.endTime : 0
    console.log(
      `  ${index + 1}. "${word.text}": ${word.startTime.toFixed(3)}s - ${word.endTime.toFixed(3)}s` +
      (gap > 0 ? ` → gap: ${gap.toFixed(3)}s` : ' (last)')
    )
  })

  return words
}

function createTimedWord(id: number, text: string, startTime: number, endTime: number): TimedWord {
  return {
    id: `word-${id}`,
    text,
    startTime,
    endTime,
    syllables: [
      {
        text,
        startTime,
        endTime,
      },
    ],
  }
}

// Calculate total duration for the test
export function getTestDuration(): number {
  const words = parseNovemberLyrics()
  return words.length > 0 ? Math.max(...words.map(w => w.endTime)) + 2 : 60
}

// Debug function to test metadata parsing
export function debugNovemberParsing() {
  console.log('🧪 DEBUG: Testing November lyrics parsing with metadata')
  const { lyrics, metadata } = parseLyricsWithMetadata(NOVEMBER_LYRICS)

  console.log('📋 Metadata extracted:')
  console.log(`  Title: "${metadata.title}"`)
  console.log(`  Author: "${metadata.author}"`)
  console.log(`  Captions: ${metadata.captions?.length || 0} found`)
  metadata.captions?.forEach((caption: string, index: number) => {
    console.log(`    ${index + 1}. "${caption}"`)
  })

  console.log(`\n📝 Lines breakdown (${lyrics.length} total):`)
  lyrics.forEach((line, index) => {
    const isMetadata = line.type !== 'lyrics' && line.type !== undefined
    console.log(`  ${index + 1}. [${isMetadata ? 'META' : 'LYRICS'}] "${line.text}"`)
    if (!isMetadata && line.words) {
      console.log(`     → ${line.words.length} words: ${line.words.map(w => w.word).join(', ')}`)
    }
  })

  const lyricsOnly = lyrics.filter(line => line.type === 'lyrics' || !line.type)
  console.log(`\n✅ Result: ${lyricsOnly.length} lyrics lines, ${lyrics.length - lyricsOnly.length} metadata lines skipped`)
}

export { type TimedWord, type Syllable, NOVEMBER_LYRICS }
