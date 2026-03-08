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

interface DemoFlags {
  leaseDebug: boolean
  leaseRows?: number
  analyzeOnly: boolean
  eraseDelayMs?: number
}

function parseFlags(args: string[]): DemoFlags {
  const leaseDebug = args.includes('--lease-debug')

  const rowIndex = args.indexOf('--lease-rows')
  const leaseRows = rowIndex !== -1 && args[rowIndex + 1]
    ? Number(args[rowIndex + 1])
    : undefined
  const analyzeOnly = args.includes('--analyze-only')
  const eraseDelayIndex = args.indexOf('--erase-delay-ms')
  const eraseDelayMs = eraseDelayIndex !== -1 && args[eraseDelayIndex + 1]
    ? Number(args[eraseDelayIndex + 1])
    : undefined

  return {
    leaseDebug,
    leaseRows: Number.isFinite(leaseRows) ? leaseRows : undefined,
    analyzeOnly,
    eraseDelayMs: Number.isFinite(eraseDelayMs) ? eraseDelayMs : undefined
  }
}

async function generateCDG(lrcPath: string, cdgPath: string, flags: DemoFlags) {
  console.log('🎤 CDG Generation Demo\n')

  if (flags.leaseDebug) {
    process.env.KARAOKE_LEASE_DEBUG = '1'
    console.log('🔎 Lease diagnostics enabled')
  }

  if (flags.leaseRows !== undefined) {
    process.env.KARAOKE_LEASE_ROWS = String(flags.leaseRows)
    console.log(`📏 Lease rows override: ${flags.leaseRows}`)
  }

  // Load LRC file
  const lrcContent = fs.readFileSync(lrcPath, 'utf-8')
  const project = LRCParser.toKaraokeProject(lrcContent)

  console.log(`📂 ${project.name} by ${project.artist}`)
  console.log(`📊 ${project.lyrics.length} lines`)

  // Generate presentation script
  const converter = new TimingConverter({
    eraseDelayMs: flags.eraseDelayMs
  })
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

  if (flags.analyzeOnly) {
    console.log('🧪 Analyze-only mode: skipping CDG file render')
    return
  }

  // Render to CDG with font settings matching DeveloperView POC
  const renderer = new CDGFileRenderer(cdgPath, {
    fontFamily: 'Arial',
    fontSize: 16
  })
  await renderer.renderToFile(script)

  console.log(`\n✨ CDG file generated successfully!`)
  console.log(`📁 ${cdgPath}`)
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log('Usage: npx tsx src/karaoke/demo/generateCDG.ts <lrc-file> <output-cdg> [--lease-debug] [--lease-rows N] [--erase-delay-ms N] [--analyze-only]')
  console.log('\nExample:')
  console.log('  npx tsx src/karaoke/demo/generateCDG.ts src/utils/meet_me_in_november.lrc output/november.cdg')
  console.log('  npx tsx src/karaoke/demo/generateCDG.ts tmp/cli/meet_me_in_november.lrc diag/cli-debug.cdg --lease-debug --lease-rows 5 --erase-delay-ms 200 --analyze-only')
  process.exit(1)
}

const lrcPath = path.resolve(args[0])
const cdgPath = path.resolve(args[1])
const flags = parseFlags(args)

if (!fs.existsSync(lrcPath)) {
  console.error(`❌ LRC file not found: ${lrcPath}`)
  process.exit(1)
}

generateCDG(lrcPath, cdgPath, flags)
  .then(() => {
    console.log('\n✅ Done!')
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  })
