// Utility to parse November lyrics and create timed word data for testing

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

const NOVEMBER_LYRICS = `Meet me in No/vem/ber, like a song of sto/ries told.
So per/fect it can't be real, yet hope will make it so.
Speak my name with love, and I will know your soul.
Where love can find a voice, two hearts will live as one.

We meet in No/vem/ber, like a song of sto/ries told.
So per/fect it be/came real, where hope has made it so.
You spoke my name with love; you'd always felt it so.
I al/rea/dy fall/ing, my heart knew it was home.

Come meet me this No/vem/ber, to live our life fore/told.
Our Mo/ments yet to hap/pen, al/rea/dy feel like old.

I Choose You! Wal/king hand in hand.
I Choose You! Danc/ing through the night.
I Choose You.

Our time a con/ver/sa/tion, our words a love song.
We sang into each other, where love we grew made strong.
In that per/fect mel/o/dy, our souls had found their home.

You're my Tex/as in No/vem/ber; our life made a new.
So per/fect it be/came truth, where hope has made it so.
I al/rea/dy fall/ing, my heart has come home.

I Choose You! Now and in Nov/em/ber.
I Choose You! Now and in for/ever.
I Choose You!

We started in, A Texas No/vem/ber,
and in that moment, you found your heart a home.

Come meet me in No/vem/ber, to live our life fore/told.
Our mo/ments yet to hap/pen, al/rea/dy feel like old.

You Choose Me! In all No/vem/ber.
You Choose Me! Make it for/e/ver.

(whisper)
I do.`

export function parseNovemberLyrics(): TimedWord[] {
  const words: TimedWord[] = []
  let currentTime = 0
  let wordId = 0
  const beatInterval = 0.8 // Longer intervals for more obvious gaps
  const wordDuration = 0.4 // Words are shorter than the beat interval  
  const gapBetweenWords = 0.4 // Larger gap between words for easier dragging
  
  console.log(`🎵 Generating lyrics with: wordDuration=${wordDuration}s, beatInterval=${beatInterval}s, gap=${gapBetweenWords}s`)

  // Split into lines and process each line
  const lines = NOVEMBER_LYRICS.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    // Skip lines that are just stage directions
    if (line.trim().startsWith('(') && line.trim().endsWith(')')) {
      const stageLine = line.trim().slice(1, -1) // Remove parentheses
      words.push(createTimedWord(wordId++, stageLine, currentTime, currentTime + 1))
      currentTime += 1.5
      continue
    }

    // Split line into words (separated by spaces)
    const lineWords = line.split(/\s+/).filter(word => word.trim())
    
    for (const word of lineWords) {
      // Remove punctuation for processing but keep it for display
      const cleanWord = word.replace(/[.,!?;:]/g, '')
      const punctuation = word.match(/[.,!?;:]/g)?.[0] || ''
      
      if (cleanWord.includes('/')) {
        // Multi-syllable word
        const syllableParts = cleanWord.split('/')
        const syllables: Syllable[] = []
        const syllableDuration = wordDuration / syllableParts.length
        
        syllableParts.forEach((syllable, index) => {
          const startTime = currentTime + (index * syllableDuration)
          const endTime = startTime + syllableDuration
          syllables.push({
            text: syllable + (index === syllableParts.length - 1 ? punctuation : ''),
            startTime,
            endTime
          })
        })
        
        words.push({
          id: `word-${wordId++}`,
          text: cleanWord.replace(/\//g, '') + punctuation,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          syllables
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
            syllables: [{
              text: 'FULL',
              startTime: currentTime,
              endTime: currentTime + wordDuration
            }]
          })
        } else {
          words.push(createTimedWord(wordId++, cleanWord + punctuation, currentTime, currentTime + wordDuration))
        }
      }
      
      currentTime += beatInterval
    }
    
    // Add pause between lines
    currentTime += beatInterval * 0.5
  }

  // Debug: Log first few words to see timing
  console.log('📊 First 5 words timing:')
  words.slice(0, 5).forEach((word, index) => {
    console.log(`  ${index + 1}. "${word.text}": ${word.startTime.toFixed(2)}s - ${word.endTime.toFixed(2)}s (duration: ${(word.endTime - word.startTime).toFixed(2)}s)`)
  })

  return words
}

function createTimedWord(id: number, text: string, startTime: number, endTime: number): TimedWord {
  return {
    id: `word-${id}`,
    text,
    startTime,
    endTime,
    syllables: [{
      text,
      startTime,
      endTime
    }]
  }
}

// Calculate total duration for the test
export function getTestDuration(): number {
  const words = parseNovemberLyrics()
  return words.length > 0 ? Math.max(...words.map(w => w.endTime)) + 2 : 60
}

export { type TimedWord, type Syllable }