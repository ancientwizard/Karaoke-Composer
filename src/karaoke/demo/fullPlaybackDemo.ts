#!/usr/bin/env node
/**
 * Full Karaoke Playback Demo
 *
 * Complete karaoke experience in your terminal:
 * - Real-time command execution synchronized to timestamps
 * - Full-screen karaoke display
 * - Syllable-by-syllable highlighting
 * - Automatic timing (no audio, just visual)
 *
 * Run with: npx tsx src/karaoke/demo/fullPlaybackDemo.ts
 */

import { KaraokePresentationEngine } from '../presentation/KaraokePresentationEngine'
import { TerminalRenderer } from '../renderers/TerminalRenderer'
import type { KaraokeProject } from '../../types/karaoke'

/**
 * Create demo project - "Twinkle Twinkle Little Star"
 */
function createDemoProject(): KaraokeProject {
  return {
    id: 'demo-1',
    name: 'Twinkle Twinkle Little Star',
    artist: 'Traditional',
    genre: 'Children',
    createdAt: new Date(),
    updatedAt: new Date(),
    audioFile: {
      name: 'twinkle.mp3',
      file: null,
      url: 'demo://twinkle',
      duration: 15
    },
    lyrics: [
      {
        id: 'line-1',
        lineNumber: 1,
        text: 'Twin/kle twin/kle lit/tle star',
        words: [
          {
            word: 'Twinkle',
            syllables: [
              {
                syllable: 'Twin',
                startTime: 2000,
                endTime: 2500
              },
              {
                syllable: 'kle',
                startTime: 2500,
                endTime: 3000
              }
            ],
            startTime: 2000,
            endTime: 3000
          },
          {
            word: 'twinkle',
            syllables: [
              {
                syllable: 'twin',
                startTime: 3200,
                endTime: 3700
              },
              {
                syllable: 'kle',
                startTime: 3700,
                endTime: 4200
              }
            ],
            startTime: 3200,
            endTime: 4200
          },
          {
            word: 'little',
            syllables: [
              {
                syllable: 'lit',
                startTime: 4400,
                endTime: 4800
              },
              {
                syllable: 'tle',
                startTime: 4800,
                endTime: 5200
              }
            ],
            startTime: 4400,
            endTime: 5200
          },
          {
            word: 'star',
            syllables: [
              {
                syllable: 'star',
                startTime: 5400,
                endTime: 6000
              }
            ],
            startTime: 5400,
            endTime: 6000
          }
        ],
        startTime: 2000,
        endTime: 6000
      },
      {
        id: 'line-2',
        lineNumber: 2,
        text: 'How I won/der what you are',
        words: [
          {
            word: 'How',
            syllables: [
              {
                syllable: 'How',
                startTime: 7000,
                endTime: 7500
              }
            ],
            startTime: 7000,
            endTime: 7500
          },
          {
            word: 'I',
            syllables: [
              {
                syllable: 'I',
                startTime: 7700,
                endTime: 8000
              }
            ],
            startTime: 7700,
            endTime: 8000
          },
          {
            word: 'wonder',
            syllables: [
              {
                syllable: 'won',
                startTime: 8200,
                endTime: 8600
              },
              {
                syllable: 'der',
                startTime: 8600,
                endTime: 9000
              }
            ],
            startTime: 8200,
            endTime: 9000
          },
          {
            word: 'what',
            syllables: [
              {
                syllable: 'what',
                startTime: 9200,
                endTime: 9700
              }
            ],
            startTime: 9200,
            endTime: 9700
          },
          {
            word: 'you',
            syllables: [
              {
                syllable: 'you',
                startTime: 9900,
                endTime: 10300
              }
            ],
            startTime: 9900,
            endTime: 10300
          },
          {
            word: 'are',
            syllables: [
              {
                syllable: 'are',
                startTime: 10500,
                endTime: 11000
              }
            ],
            startTime: 10500,
            endTime: 11000
          }
        ],
        startTime: 7000,
        endTime: 11000
      }
    ],
    timings: [],
    isCompleted: true
  }
}

/**
 * Run full karaoke playback
 */
async function runPlayback() {
  console.log('\n🎤 Full Terminal Karaoke Playback\n')
  console.log('This is a real karaoke experience in your terminal!')
  console.log('Watch as syllables highlight in real-time.\n')
  console.log('Starting in 2 seconds...\n')

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Create project and generate script
  const project = createDemoProject()
  const engine = new KaraokePresentationEngine({
    timingConfig: {
      showMetadata: true,
      metadataDurationMs: 2000,  // Show title for 2 seconds
      previewDurationMs: 800     // Show line 800ms before singing
    }
  })

  const script = engine.generateScript(project)

  // Create terminal renderer (use full terminal size)
  const renderer = new TerminalRenderer({
    backgroundColor: 'black',
    showBorder: false
  })

  await renderer.initialize()

  // REAL-TIME PLAYBACK!
  // Execute commands at their scheduled timestamps
  const startTime = Date.now()

  for (const command of script.commands) {
    // Calculate when this command should execute
    const executeAt = startTime + command.timestamp
    const now = Date.now()
    const delay = executeAt - now

    // Wait until it's time for this command
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    // Execute the command
    await renderer.renderCommand(command)
  }

  // Hold final display for a moment
  await new Promise(resolve => setTimeout(resolve, 2000))

  await renderer.finalize()

  console.log('\n✨ Karaoke playback complete!\n')
  console.log(`Rendered ${script.commands.length} commands over ${script.durationMs}ms`)
  console.log('\nThis is what real karaoke looks like in the terminal! 🎵\n')
}

// Run
runPlayback().catch(console.error)
