/**
 * CDG Generation Demo
 *
 * Loads an LRC file and generates a CDG file
 */

import { LRCParser } from '../../formats/LRCFormat'
import { TimingConverter } from '../presentation/TimingConverter'
import { CDGFileRenderer } from '../renderers/CDGFileRenderer'
import type { AnyPresentationCommand } from '../presentation/Command'
import * as fs from 'fs'
import * as path from 'path'

async function generateCDG(lrcPath: string, cdgPath: string) {
  console.log('🎤 CDG Generation Demo\n')

  // Load LRC file
  const lrcContent = fs.readFileSync(lrcPath, 'utf-8')
  const project = LRCParser.toKaraokeProject(lrcContent)

  console.log(`📂 ${project.name} by ${project.artist}`)
  console.log(`📊 ${project.lyrics.length} lines`)

  // Generate presentation script
  const converter = new TimingConverter()
  const commands = converter.convert(project)

  // Find max timestamp for duration
  const maxTimestamp = Math.max(...commands.map((cmd: AnyPresentationCommand) => cmd.timestamp))

  const script = {
    commands,
    durationMs: maxTimestamp + 5000,  // Add 5 seconds buffer
    metadata: {
      title: project.name,
      artist: project.artist
    }
  }

  console.log(`\n🎬 ${commands.length} presentation commands generated`)

  // Render to CDG
  const renderer = new CDGFileRenderer(cdgPath)
  await renderer.renderToFile(script)

  console.log(`\n✨ CDG file generated successfully!`)
  console.log(`📁 ${cdgPath}`)
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log('Usage: npx tsx src/karaoke/demo/generateCDG.ts <lrc-file> <output-cdg>')
  console.log('\nExample:')
  console.log('  npx tsx src/karaoke/demo/generateCDG.ts src/utils/meet_me_in_november.lrc output/november.cdg')
  process.exit(1)
}

const lrcPath = path.resolve(args[0])
const cdgPath = path.resolve(args[1])

if (!fs.existsSync(lrcPath)) {
  console.error(`❌ LRC file not found: ${lrcPath}`)
  process.exit(1)
}

generateCDG(lrcPath, cdgPath)
  .then(() => {
    console.log('\n✅ Done!')
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  })
