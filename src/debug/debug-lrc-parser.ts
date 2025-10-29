#!/usr/bin/env -S npx tsx

/**
 * Debug LRC Parser
 */

import { LRCParser } from '../formats/LRCFormat'

const lrcWithCaptions = `[version:2.1]
[syllable_timing:true]
[ti:Test Song]
[au:Test Artist]

#[line:0:caption:Intro]
[00:01.00]This is line zero
#[line:1:caption:Verse 1]
[00:02.00]This is line one
`

console.log('🔍 Debugging LRC Parser\n')

const { metadata, lines } = LRCParser.parse(lrcWithCaptions)

console.log('Metadata:', metadata)
console.log(`\nParsed ${lines.length} lines:`)
lines.forEach((line, idx) => {
  console.log(`\n  Line ${idx}:`)
  console.log(`    timestamp: ${line.timestamp}`)
  console.log(`    text: "${line.text}"`)
  console.log(`    caption: ${line.caption || 'undefined'}`)
})
