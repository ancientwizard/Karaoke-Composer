/**
 * Demo: Terminal Karaoke Renderer
 *
 * Demonstrates the full pipeline working:
 * KaraokeProject → PresentationEngine → TerminalRenderer
 *
 * Run with: npx tsx src/karaoke/demo/terminalDemo.ts
 */

import { KaraokePresentationEngine } from '../presentation/KaraokePresentationEngine'
import { TerminalRenderer } from '../renderers/TerminalRenderer'
import type { KaraokeProject } from '../../types/karaoke'

/**
 * Create a demo karaoke project
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
      duration: 20
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
                startTime: 1000,
                endTime: 1500
              },
              {
                syllable: 'kle',
                startTime: 1500,
                endTime: 2000
              }
            ],
            startTime: 1000,
            endTime: 2000
          },
          {
            word: 'twinkle',
            syllables: [
              {
                syllable: 'twin',
                startTime: 2200,
                endTime: 2700
              },
              {
                syllable: 'kle',
                startTime: 2700,
                endTime: 3200
              }
            ],
            startTime: 2200,
            endTime: 3200
          },
          {
            word: 'little',
            syllables: [
              {
                syllable: 'lit',
                startTime: 3400,
                endTime: 3800
              },
              {
                syllable: 'tle',
                startTime: 3800,
                endTime: 4200
              }
            ],
            startTime: 3400,
            endTime: 4200
          },
          {
            word: 'star',
            syllables: [
              {
                syllable: 'star',
                startTime: 4400,
                endTime: 5000
              }
            ],
            startTime: 4400,
            endTime: 5000
          }
        ],
        startTime: 1000,
        endTime: 5000
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
                startTime: 6000,
                endTime: 6500
              }
            ],
            startTime: 6000,
            endTime: 6500
          },
          {
            word: 'I',
            syllables: [
              {
                syllable: 'I',
                startTime: 6700,
                endTime: 7000
              }
            ],
            startTime: 6700,
            endTime: 7000
          },
          {
            word: 'wonder',
            syllables: [
              {
                syllable: 'won',
                startTime: 7200,
                endTime: 7600
              },
              {
                syllable: 'der',
                startTime: 7600,
                endTime: 8000
              }
            ],
            startTime: 7200,
            endTime: 8000
          },
          {
            word: 'what',
            syllables: [
              {
                syllable: 'what',
                startTime: 8200,
                endTime: 8700
              }
            ],
            startTime: 8200,
            endTime: 8700
          },
          {
            word: 'you',
            syllables: [
              {
                syllable: 'you',
                startTime: 8900,
                endTime: 9300
              }
            ],
            startTime: 8900,
            endTime: 9300
          },
          {
            word: 'are',
            syllables: [
              {
                syllable: 'are',
                startTime: 9500,
                endTime: 10000
              }
            ],
            startTime: 9500,
            endTime: 10000
          }
        ],
        startTime: 6000,
        endTime: 10000
      }
    ],
    timings: [],
    isCompleted: true
  }
}

/**
 * Run the demo
 */
async function runDemo() {
  console.log('\n🎤 Terminal Karaoke Demo\n')
  console.log('='.repeat(60))

  // Create demo project
  const project = createDemoProject()
  console.log(`Song: ${project.name}`)
  console.log(`Artist: ${project.artist}`)
  console.log(`Lines: ${project.lyrics.length}`)
  console.log('='.repeat(60))
  console.log()

  // Generate presentation script
  const engine = new KaraokePresentationEngine()
  const validation = engine.validateProject(project)

  if (!validation.valid) {
    console.error('❌ Project validation failed:')
    validation.errors.forEach(err => console.error(`  - ${err}`))
    return
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Warnings:')
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`))
    console.log()
  }

  const script = engine.generateScript(project)

  console.log(`✅ Generated ${script.commands.length} presentation commands`)
  console.log(`   Duration: ${script.durationMs}ms`)
  console.log()

  // Analyze commands
  const commandTypes = script.commands.reduce((acc, cmd) => {
    acc[cmd.type] = (acc[cmd.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('Command breakdown:')
  Object.entries(commandTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })
  console.log()

  console.log('='.repeat(60))
  console.log('\nRendering to terminal (simulated playback)...\n')
  console.log('='.repeat(60))
  console.log()

  // Create terminal renderer
  const renderer = new TerminalRenderer({
    width: 1000,
    height: 1000
  })

  await renderer.initialize()

  // Render each command (in real-time this would be synchronized with audio)
  // For demo purposes, we'll just show a few key moments
  const keyCommands = [
    script.commands.find(cmd => cmd.type === 'show_metadata'),
    script.commands.find(cmd => cmd.type === 'show_text'),
    ...script.commands.filter(cmd => cmd.type === 'change_color').slice(0, 3)
  ].filter(cmd => cmd !== undefined)

  for (const cmd of keyCommands) {
    console.log(`[${cmd.timestamp}ms] ${cmd.type}`)
    if ('text' in cmd) {
      console.log(`  Text: "${cmd.text}"`)
    }
    if ('title' in cmd && cmd.title) {
      console.log(`  Title: "${cmd.title}"`)
    }
    if ('startChar' in cmd && 'endChar' in cmd) {
      console.log(`  Chars: ${cmd.startChar}-${cmd.endChar}`)
    }
    console.log()
  }

  await renderer.finalize()

  console.log('='.repeat(60))
  console.log('\n✨ Demo complete!\n')
  console.log('To render in real-time, integrate with audio playback.')
  console.log('Commands are executed at their timestamp relative to audio start.\n')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error)
}

export { createDemoProject, runDemo }
