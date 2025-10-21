#!/usr/bin/env node
/**
 * LRC File Karaoke Player
 *
 * Load an exported LRC file and play it in the terminal!
 *
 * Usage:
 *   npx tsx src/karaoke/demo/lrcPlayer.ts <path-to-lrc-file>
 *   npx tsx src/karaoke/demo/lrcPlayer.ts exported_song.lrc
 */

import { readFileSync } from 'fs'
import { KaraokePresentationEngine } from '../presentation/KaraokePresentationEngine'
import { TerminalRenderer } from '../renderers/TerminalRenderer'
import { LRCParser } from '../../formats/LRCFormat'

async function playLRCFile(filePath: string) {
  console.log('\n🎤 LRC Karaoke Player\n')
  console.log('='.repeat(60))

  try {
    // Read LRC file
    console.log(`📂 Loading: ${filePath}`)
    const lrcContent = readFileSync(filePath, 'utf-8')

    // Parse LRC to KaraokeProject
    console.log('📝 Parsing LRC format...')
    const project = LRCParser.toKaraokeProject(lrcContent, 'imported-song')

    console.log(`✅ Loaded: ${project.name}`)
    console.log(`   Artist: ${project.artist}`)
    console.log(`   Lines: ${project.lyrics.length}`)

    // Debug: Show first few lines
    console.log('\n🔍 First 3 lines of lyrics:')
    for (let i = 0; i < Math.min(3, project.lyrics.length); i++) {
      const line = project.lyrics[i]
      console.log(`   Line ${i + 1}: "${line.text}"`)
      console.log(`      Words: ${line.words.length}`)
      if (line.words.length > 0) {
        console.log(`      First word: "${line.words[0].word}" at ${line.words[0].startTime}ms`)
      }
    }

    // Count syllables
    let totalSyllables = 0
    let timedSyllables = 0
    for (const line of project.lyrics) {
      for (const word of line.words) {
        for (const syllable of word.syllables) {
          totalSyllables++
          if (syllable.startTime !== undefined) {
            timedSyllables++
          }
        }
      }
    }

    console.log(`   Syllables: ${timedSyllables} / ${totalSyllables} timed`)
    console.log('='.repeat(60))

    if (timedSyllables === 0) {
      console.error('\n❌ No timing data found in LRC file!')
      console.error('   Make sure the file was exported from Karaoke Composer\n')
      process.exit(1)
    }

    console.log('\n🎬 Starting playback in 2 seconds...\n')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate presentation script
    const engine = new KaraokePresentationEngine({
      timingConfig: {
        showMetadata: true,
        metadataDurationMs: 3000,
        previewDurationMs: 1000
      }
    })

    const script = engine.generateScript(project)
    console.log(`📊 Generated ${script.commands.length} presentation commands`)

    // Debug: Show first few commands
    console.log('\n🔍 First 5 commands:')
    for (let i = 0; i < Math.min(5, script.commands.length); i++) {
      const cmd = script.commands[i]
      console.log(`   ${i + 1}. [${cmd.timestamp}ms] ${cmd.type}`)
    }
    console.log('')

    // Create terminal renderer with CDG simulation
    const renderer = new TerminalRenderer({
      simulateCDG: true,  // Use CDG-like dimensions (18 rows x 50 cols)
      backgroundColor: 'black',
      showBorder: false
    })

    await renderer.initialize()

    // Real-time playback
    const startTime = Date.now()

    for (const command of script.commands) {
      const executeAt = startTime + command.timestamp
      const now = Date.now()
      const delay = executeAt - now

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      await renderer.renderCommand(command)

      // Optional: Stop after first N commands for testing
      // if (commandCount >= 50) break
    }

    // Hold final display
    await new Promise(resolve => setTimeout(resolve, 2000))

    await renderer.finalize()

    console.log('\n✨ Playback complete!\n')

  } catch (error) {
    console.error(`\n❌ Error: ${error}\n`)
    process.exit(1)
  }
}

// Main
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('\n🎤 LRC Karaoke Player\n')
  console.log('Usage:')
  console.log('  npx tsx src/karaoke/demo/lrcPlayer.ts <lrc-file>\n')
  console.log('Example:')
  console.log('  npx tsx src/karaoke/demo/lrcPlayer.ts meet_me_in_november.lrc\n')
  process.exit(1)
}

const lrcFile = args[0]
playLRCFile(lrcFile).catch(console.error)
