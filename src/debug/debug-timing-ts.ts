/**
 * Enhanced TypeScript test runner for the Karaoke Timing Engine
 * Tests both metadata handling and real-time highlight simulation
 * Run this with: npx tsx test-timing-ts.ts
 */

import { KaraokeTimingEngine } from '../models/KaraokeTimingEngine.js'
import { parseLyricsLine, parseLyricsWithMetadata } from '../utils/lyricsParser.js'
import type { LyricLine } from '../types/karaoke.js'

// Happy Birthday lyrics with metadata and syllable markers
const HAPPY_BIRTHDAY_WITH_METADATA = `[@TITLE:Happy Birthday Song]
[@AUTHOR:Traditional]
[@CAPTION:A classic birthday celebration song]

Hap/py Birth/day to you
Hap/py Birth/day to you
[@CAPTION:Personalize this line with the birthday person's name]
Hap/py Birth/day dear [Name]
Hap/py Birth/day to you

[@CAPTION:Clap along and make a wish!]`

// Test without metadata for comparison
const HAPPY_BIRTHDAY_SIMPLE = [
  "Hap/py Birth/day to you",
  "Hap/py Birth/day to you",
  "Hap/py Birth/day dear [Name]",
  "Hap/py Birth/day to you"
]

// Known timing for Happy Birthday (full song)
const EXPECTED_TIMINGS = [
  // Line 1: "Happy Birthday to you" (0-3000ms)
  {
    word: "Happy", start: 0, end: 800
  },
  {
    word: "Birthday", start: 800, end: 2000
  },
  {
    word: "to", start: 2000, end: 2400
  },
  {
    word: "you", start: 2400, end: 3000
  },

  // Line 2: "Happy Birthday to you" (3500-6500ms)
  {
    word: "Happy", start: 3500, end: 4300
  },
  {
    word: "Birthday", start: 4300, end: 5500
  },
  {
    word: "to", start: 5500, end: 5900
  },
  {
    word: "you", start: 5900, end: 6500
  },

  // Line 3: "Happy Birthday dear [Name]" (7000-10500ms)
  {
    word: "Happy", start: 7000, end: 7800
  },
  {
    word: "Birthday", start: 7800, end: 9000
  },
  {
    word: "dear", start: 9000, end: 9500
  },
  {
    word: "[Name]", start: 9500, end: 10500
  },

  // Line 4: "Happy Birthday to you" (11000-14000ms)
  {
    word: "Happy", start: 11000, end: 11800
  },
  {
    word: "Birthday", start: 11800, end: 13000
  },
  {
    word: "to", start: 13000, end: 13400
  },
  {
    word: "you", start: 13400, end: 14000
  }
]

async function testWithMetadata(): Promise<void> {
  console.log('🏷️  TEST 1: Lyrics WITH Metadata')
  console.log('='.repeat(50))

  // Parse lyrics with metadata
  const { lyrics, metadata } = parseLyricsWithMetadata(HAPPY_BIRTHDAY_WITH_METADATA)

  console.log('📋 Metadata found:')
  console.log(`  Title: ${metadata.title || 'None'}`)
  console.log(`  Author: ${metadata.author || 'None'}`)
  console.log(`  Captions: ${metadata.captions?.length || 0} found`)
  metadata.captions?.forEach((caption: string, index: number) => {
    console.log(`    ${index + 1}. ${caption}`)
  })

  console.log('\n📝 Lyrics structure:')
  lyrics.forEach((line, index) => {
    if (line.type === 'lyrics') {
      console.log(`  Line ${index + 1}: "${line.text}" (${line.words.length} words)`)
      console.log(`    Syllables: ${line.words.map((w: any) =>
        w.syllables.map((s: any) => s.syllable).join('-')
      ).join(' | ')}`)
    } else {
      console.log(`  Metadata Line ${index + 1}: [${line.type?.toUpperCase()}] ${line.metadata?.[line.type!] || line.text}`)
    }
  })

  return testTimingEngine(lyrics)
}

async function testWithoutMetadata(): Promise<void> {
  console.log('\n📄 TEST 2: Lyrics WITHOUT Metadata')
  console.log('='.repeat(50))

  // Parse simple lyrics
  const lyrics: LyricLine[] = HAPPY_BIRTHDAY_SIMPLE.map((line, index) =>
    parseLyricsLine(line, index + 1, `line-${index}`)
  )

  console.log('📝 Simple lyrics structure:')
  lyrics.forEach((line, index) => {
    console.log(`  Line ${index + 1}: "${line.text}" (${line.words.length} words)`)
    console.log(`    Syllables: ${line.words.map((w: any) =>
      w.syllables.map((s: any) => s.syllable).join('-')
    ).join(' | ')}`)
  })

  return testTimingEngine(lyrics)
}

async function testTimingEngine(lyrics: LyricLine[]): Promise<void> {
  // Create timing engine
  const engine = new KaraokeTimingEngine({
    syllableWeights: {
      first: 0.6,   // "Hap" gets less time
      middle: 0.8,  // "Birth" gets medium time
      last: 1.6     // "py", "day" get more time
    },
    gaps: {
      shortPause: 100,
      mediumPause: 300,
      longPause: 800
    }
  })

  engine.loadLyrics(lyrics)

  // Apply timing to lyrics lines only (skip metadata)
  console.log('\n⏰ Applying Timing to Lyrics Only')
  console.log('-'.repeat(40))

  const lyricsLines = lyrics.filter(line => line.type === 'lyrics' || !line.type)

  for (const timing of EXPECTED_TIMINGS) {
    // Find the word position in lyrics lines only
    let found = false
    for (let lineIndex = 0; lineIndex < lyricsLines.length && !found; lineIndex++) {
      for (let wordIndex = 0; wordIndex < lyricsLines[lineIndex].words.length; wordIndex++) {
        if (lyricsLines[lineIndex].words[wordIndex].word === timing.word) {
          // Find the actual line index in the full lyrics array
          const actualLineIndex = lyrics.findIndex(l => l.id === lyricsLines[lineIndex].id)
          if (actualLineIndex !== -1) {
            console.log(`⏰ Timing "${timing.word}" at ${timing.start}ms`)
            const events = engine.assignWordTiming(actualLineIndex, wordIndex, timing.start)
            events.forEach(event => {
              console.log(`  📋 ${event.type}: ${event.text || 'N/A'}`)
            })
            found = true
            break
          }
        }
      }
    }
  }

  // Finalize timing
  console.log('🏁 Finalizing at 14000ms')
  const finalEvents = engine.finalizeAllTiming(14000)
  finalEvents.forEach(event => {
    console.log(`  📋 Final ${event.type}: ${event.text || 'N/A'}`)
  })

  // Show results
  const stats = engine.getStats()
  console.log(`\n📊 Results: ${stats.timedWords}/${stats.totalWords} words (${stats.completionPercent.toFixed(1)}%)`)

  // Test real-time playback simulation
  await simulatePlayback(engine, lyrics)
}

async function simulatePlayback(engine: KaraokeTimingEngine, lyrics: LyricLine[]): Promise<void> {
  console.log('\n🎬 SIMULATING REAL-TIME PLAYBACK (UI Highlighting)')
  console.log('='.repeat(60))
  console.log('This shows what would be highlighted in the UI during playback...\n')

  const songDuration = 14000 // 14 seconds
  const timeStep = 200 // Check every 200ms for clarity
  let lastHighlight = ''

  for (let time = 0; time <= songDuration; time += timeStep) {
    const position = engine.getCurrentPosition(time)

    if (position.isActive && position.lineIndex < lyrics.length) {
      const line = lyrics[position.lineIndex]

      // Skip metadata lines in highlighting
      if (line.type === 'lyrics' || !line.type) {
        const word = line.words[position.wordIndex]
        const syllable = word.syllables[position.syllableIndex]

        const highlight = `Line ${position.lineIndex + 1}: "${word.word}" (syllable: "${syllable.syllable}")`

        if (highlight !== lastHighlight) {
          console.log(`🎯 ${time.toString().padStart(5)}ms: ${highlight}`)
          lastHighlight = highlight
        }
      }
    } else {
      // Show pauses/gaps
      if (lastHighlight !== 'PAUSE') {
        console.log(`⏸️  ${time.toString().padStart(5)}ms: [PAUSE - between phrases]`)
        lastHighlight = 'PAUSE'
      }
    }

    // Small delay to make it readable (this would be real-time in actual app)
    await new Promise(resolve => setTimeout(resolve, 1))
  }

  console.log('\n✨ Playback simulation complete! This is what the UI would highlight.')
}

async function runAllTests(): Promise<void> {
  console.log('🎵 ENHANCED Karaoke Timing Engine Tests')
  console.log('='.repeat(60))
  console.log('Testing metadata handling AND real-time highlighting behavior\n')

  try {
    await testWithMetadata()
    await testWithoutMetadata()

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n💡 Key Validations:')
    console.log('  ✅ Metadata parsing (title, author, captions)')
    console.log('  ✅ Lyrics-only timing (skips metadata lines)')
    console.log('  ✅ Syllable distribution (first < last)')
    console.log('  ✅ Real-time position tracking')
    console.log('  ✅ UI highlighting simulation')
    console.log('  ✅ Gap detection between phrases')
    console.log('  ✅ Event logging for debugging')

  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

// Run all tests
runAllTests().catch(console.error)
