#!/usr/bin/env -S npx tsx

/**
 * Test LRC Caption Round-Trip
 *
 * Test that captions can be exported to LRC and imported back
 */

import { parseLyricsWithMetadata } from '../utils/lyricsParser'
import { LRCWriter, LRCParser } from '../formats/LRCFormat'
import type { KaraokeProject } from '../types/karaoke'

console.log('🎤 LRC Caption Round-Trip Test\n')

// Step 1: Create a project with captions using custom format
const customLyrics = `[@TITLE:Test Song]
[@AUTHOR:Test Artist]

[@CAPTION:Intro]
This is the in/tro line

[@CAPTION:Verse 1]
First verse with some words

[@CAPTION:Chorus]
Cho/rus goes here`

const { lyrics, metadata } = parseLyricsWithMetadata(customLyrics)

// Add some timing to the lyrics lines
let time = 1000
lyrics.forEach(line => {
  if (line.type === 'lyrics' && line.words) {
    line.startTime = time
    line.words.forEach(word => {
      word.startTime = time
      if (word.syllables) {
        word.syllables.forEach(syl => {
          syl.startTime = time
          time += 300
        })
      }
    })
    line.endTime = time
    time += 500
  }
})

const project: KaraokeProject = {
  id: 'test',
  name: metadata.title || 'Test',
  artist: metadata.author || 'Test',
  genre: 'Test',
  lyrics: lyrics,
  createdAt: new Date(),
  updatedAt: new Date(),
  audioFile: undefined,
  timings: []
}

console.log('📝 Original Project:')
console.log(`   - Total lines: ${lyrics.length}`)
console.log(`   - Caption lines: ${lyrics.filter(l => l.type === 'caption').length}`)
console.log(`   - Lyrics with caption metadata: ${lyrics.filter(l => l.type === 'lyrics' && l.metadata?.caption).length}`)

// Step 2: Export to LRC
console.log('\n📤 Exporting to LRC...')
const lrcContent = LRCWriter.toLRC(project)
console.log('\n--- LRC Output ---')
console.log(lrcContent)
console.log('--- End LRC ---\n')

// Check if captions are in the output
const captionLines = lrcContent.split('\n').filter(line => line.includes('#[line:') && line.includes(':caption:'))
console.log(`✅ Caption lines in LRC: ${captionLines.length}`)
captionLines.forEach(line => console.log(`   ${line}`))

// Step 3: Import back from LRC
console.log('\n📥 Importing back from LRC...')
const importedProject = LRCParser.toKaraokeProject(lrcContent, 'imported-test')

console.log('\n📝 Imported Project:')
console.log(`   - Total lines: ${importedProject.lyrics.length}`)
console.log(`   - Caption lines: ${importedProject.lyrics.filter(l => l.type === 'caption').length}`)
console.log(`   - Lyrics with caption metadata: ${importedProject.lyrics.filter(l => l.type === 'lyrics' && l.metadata?.caption).length}`)

// Step 4: Verify captions match
console.log('\n🔍 Verifying captions:')
const originalCaptions = lyrics.filter(l => l.type === 'caption').map(l => l.metadata?.caption)
const importedCaptions = importedProject.lyrics.filter(l => l.type === 'caption').map(l => l.metadata?.caption)

console.log(`   Original captions: ${JSON.stringify(originalCaptions)}`)
console.log(`   Imported captions: ${JSON.stringify(importedCaptions)}`)

if (JSON.stringify(originalCaptions) === JSON.stringify(importedCaptions)) {
  console.log('\n✅ SUCCESS: Captions match perfectly!')
} else {
  console.log('\n❌ FAIL: Captions do not match!')
}

// Verify caption metadata on lyrics lines
const originalLyricsWithCaptions = lyrics.filter(l => l.type === 'lyrics' && l.metadata?.caption)
const importedLyricsWithCaptions = importedProject.lyrics.filter(l => l.type === 'lyrics' && l.metadata?.caption)

console.log(`\n📋 Lyrics with caption metadata:`)
console.log(`   Original: ${originalLyricsWithCaptions.length}`)
originalLyricsWithCaptions.forEach(l => {
  console.log(`      - "${l.metadata?.caption}": ${l.text}`)
})
console.log(`   Imported: ${importedLyricsWithCaptions.length}`)
importedLyricsWithCaptions.forEach(l => {
  console.log(`      - "${l.metadata?.caption}": ${l.text}`)
})

console.log('\n✨ Round-trip test complete!')
