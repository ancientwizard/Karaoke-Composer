#!/usr/bin/env node
/**
 * Live Terminal Karaoke Display Demo
 *
 * Experience karaoke in your terminal! This shows what the actual
 * karaoke screen would look like, with:
 * - Full-screen display
 * - Syllable-by-syllable highlighting
 * - Smooth visual updates
 *
 * Run with: npx tsx src/karaoke/demo/liveTerminalDemo.ts
 */

import { TerminalRenderer } from '../renderers/TerminalRenderer'

console.log('\n🎤 Live Terminal Karaoke Display Demo')
console.log('=====================================\n')
console.log('This will show an actual karaoke display in your terminal!')
console.log('Press Ctrl+C to exit at any time.\n')
console.log('Starting in 3 seconds...\n')

// Wait a moment for user to read
await new Promise(resolve => setTimeout(resolve, 3000))

// Run the built-in test which shows a real karaoke display
await TerminalRenderer.test()

console.log('Demo complete!')
console.log('\nThis is what karaoke looks like in the terminal! 🎵')
console.log('Next: Run the full demo with timing from a KaraokeProject\n')
