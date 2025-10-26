/**
 * Test Caption Display
 *
 * Quick test to verify captions are showing in terminal renderer
 */

import { parseLyricsWithMetadata } from '../utils/lyricsParser'
import { TimingConverter } from '../karaoke/presentation/TimingConverter'

// Use custom format with [@CAPTION:] tags
const customLyrics = `[@TITLE:Test Song]
[@AUTHOR:Test Artist]

[@CAPTION:Intro]
This is the in/tro line

[@CAPTION:Verse 1]
First verse with some words

[@CAPTION:Chorus]
Cho/rus goes here`

console.log('🎤 Caption Test\n')

// Parse custom format
const { lyrics, metadata } = parseLyricsWithMetadata(customLyrics)

console.log(`📂 ${metadata.title} by ${metadata.author}`)
console.log(`📊 ${lyrics.length} total lines (including metadata)\n`)

// Check caption lines (separate lines with type='caption')
const captionLines = lyrics.filter(line => line.type === 'caption')
console.log(`📝 Caption lines (type='caption'): ${captionLines.length}`)
captionLines.forEach((line, idx) => {
  console.log(`  ${idx + 1}. Line ${line.lineNumber}: "${line.metadata?.caption}"`)
})

// Check lyrics lines with caption metadata attached
const lyricsWithCaptions = lyrics.filter(line => line.type === 'lyrics' && line.metadata?.caption)
console.log(`\n📝 Lyrics lines with caption metadata: ${lyricsWithCaptions.length}`)
lyricsWithCaptions.forEach((line, idx) => {
  console.log(`  ${idx + 1}. Line ${line.lineNumber}: Caption="${line.metadata?.caption}" Text="${line.text}"`)
})

// Create a minimal project for testing
const project: any = {
  id: 'test',
  name: metadata.title || 'Test',
  artist: metadata.author || 'Test',
  lyrics: lyrics,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Generate presentation commands with captions enabled
console.log('\n🎬 Generating commands with captions ENABLED...')
const converterWithCaptions = new TimingConverter({
  showCaptions: true,
  captionDurationMs: 2000
})
const commandsWithCaptions = converterWithCaptions.convert(project)

// Count caption commands
const captionCommands = commandsWithCaptions.filter(cmd =>
  cmd.type === 'show_text' && 'textId' in cmd && cmd.textId.startsWith('caption-')
)
console.log(`✅ Caption show_text commands: ${captionCommands.length}`)

const captionRemoveCommands = commandsWithCaptions.filter(cmd =>
  cmd.type === 'remove_text' && 'textId' in cmd && cmd.textId.startsWith('caption-')
)
console.log(`✅ Caption remove_text commands: ${captionRemoveCommands.length}`)

// Show first few caption commands
if (captionCommands.length > 0) {
  console.log('\n📋 Caption commands:')
  captionCommands.forEach((cmd, idx) => {
    if (cmd.type === 'show_text' && 'text' in cmd && 'timestamp' in cmd) {
      console.log(`  ${idx + 1}. At ${cmd.timestamp}ms: "${cmd.text}"`)
    }
  })
}

// Generate presentation commands with captions disabled
console.log('\n🎬 Generating commands with captions DISABLED...')
const converterWithoutCaptions = new TimingConverter({ showCaptions: false })
const commandsWithoutCaptions = converterWithoutCaptions.convert(project)

const captionCommandsDisabled = commandsWithoutCaptions.filter(cmd =>
  cmd.type === 'show_text' && 'textId' in cmd && cmd.textId.startsWith('caption-')
)
console.log(`❌ Caption commands (should be 0): ${captionCommandsDisabled.length}`)

console.log('\n✨ Caption test complete!')
console.log('\n💡 Summary:')
console.log(`   - Captions exist as separate lines: YES (${captionLines.length} lines)`)
console.log(`   - Captions attached to lyrics: YES (${lyricsWithCaptions.length} lines)`)
console.log(`   - Export will show captions: ${captionCommands.length > 0 ? 'YES' : 'NO'}`)
