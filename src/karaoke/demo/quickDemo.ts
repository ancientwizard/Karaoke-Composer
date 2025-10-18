#!/usr/bin/env node
/**
 * Quick Demo - Play first 30 seconds of a song
 *
 * Usage:
 *   npx tsx src/karaoke/demo/quickDemo.ts <lrc-file>
 */

import { readFileSync } from 'fs'
import { KaraokePresentationEngine } from '../presentation/KaraokePresentationEngine'
import { TerminalRenderer } from '../renderers/TerminalRenderer'
import { LRCParser } from '../../formats/LRCFormat'

async function quickDemo(filePath: string, durationSeconds: number = 30) {
  console.log(`\n🎤 Quick Demo - Playing first ${durationSeconds} seconds\n`)

  try {
    const lrcContent = readFileSync(filePath, 'utf-8')
    const project = LRCParser.toKaraokeProject(lrcContent, 'quick-demo')

    console.log(`📂 ${project.name} by ${project.artist}`)
    console.log(`📊 ${project.lyrics.length} lines\n`)

    const engine = new KaraokePresentationEngine({
      timingConfig: {
        showMetadata: true,
        metadataDurationMs: 2000,
        previewDurationMs: 800
      }
    })

    const script = engine.generateScript(project)
    const maxTimestamp = durationSeconds * 1000

    // Filter commands to only play first N seconds
    const commands = script.commands.filter(cmd => cmd.timestamp <= maxTimestamp)
    console.log(`🎬 Playing ${commands.length} commands in ${durationSeconds}s...\n`)

    const renderer = new TerminalRenderer({
      simulateCDG: true,  // Use CDG-like dimensions (18 rows x 50 cols)
      backgroundColor: 'black',
      showBorder: false
    })

    await renderer.initialize()

    // Play commands
    const startTime = Date.now()
    for (const command of commands) {
      const executeAt = startTime + command.timestamp
      const now = Date.now()
      const delay = executeAt - now

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      await renderer.renderCommand(command)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
    await renderer.finalize()

    console.log('\n✨ Demo complete!\n')
  } catch (error) {
    console.error(`\n❌ Error: ${error}\n`)
    process.exit(1)
  }
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('\n🎤 Quick Demo\n')
  console.log('Usage:')
  console.log('  npx tsx src/karaoke/demo/quickDemo.ts <lrc-file> [seconds]\n')
  console.log('Example:')
  console.log('  npx tsx src/karaoke/demo/quickDemo.ts src/utils/meet_me_in_november.lrc 30\n')
  process.exit(1)
}

const lrcFile = args[0]
const seconds = args[1] ? parseInt(args[1], 10) : 30
quickDemo(lrcFile, seconds).catch(console.error)
