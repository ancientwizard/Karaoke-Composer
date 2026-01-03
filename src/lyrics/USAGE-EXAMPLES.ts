/**
 * Songs Library Usage Examples
 *
 * This file demonstrates how to use the songs library in tests
 * and development. The SONGS_LIBRARY provides a complete collection
 * of 12 public domain songs for testing the TextLayoutEngine.
 */

// ============================================================
// EXAMPLE 1: Import single song
// ============================================================

// import { meetMeInNovember } from '@/lyrics'
//
// describe('TextLayoutEngine with Meet Me In November', () => {
//   it('should layout modern song with many lines', () => {
//     const layout = new TextLayoutEngine().layout(meetMeInNovember)
//     expect(layout.lines.length).toBe(28)
//     expect(layout.lines[0].text).toContain('Meet me in November')
//   })
// })

// ============================================================
// EXAMPLE 2: Use library for batch testing
// ============================================================

// import { SONGS_LIBRARY } from '@/lyrics/library'
//
// describe('TextLayoutEngine with all songs', () => {
//   const songs = Object.values(SONGS_LIBRARY)
//
//   songs.forEach(song => {
//     it(`should layout ${song.title}`, () => {
//       const layout = new TextLayoutEngine().layout(song)
//       expect(layout.lines.length).toBeGreaterThan(0)
//       expect(layout.lines[0].text).toBeTruthy()
//     })
//   })
// })

// ============================================================
// EXAMPLE 3: Use library helper functions
// ============================================================

// import {
//   SONGS_LIBRARY,
//   getAllSongs,
//   getSong,
//   getSongCount,
//   getAllTitles,
// } from '@/lyrics/library'
//
// // Get all songs
// const allSongs = getAllSongs()
// console.log(`Testing ${getSongCount()} songs`)
//
// // Get specific song
// const grace = getSong('amazing-grace')
// if (grace) {
//   console.log(`Song: ${grace.title}`)
//   console.log(`Artist: ${grace.artist}`)
//   console.log(`Duration: ${grace.duration}ms`)
// }
//
// // Get all titles
// const titles = getAllTitles()
// titles.forEach(title => console.log(`- ${title}`))

// ============================================================
// EXAMPLE 4: Test syllable timing accuracy
// ============================================================

// import { happyBirthday } from '@/lyrics'
// import { TextLayoutEngine } from '@/cdg/layout/TextLayoutEngine'
//
// describe('Syllable timing', () => {
//   it('should preserve syllable times from Happy Birthday', () => {
//     const layout = new TextLayoutEngine().layout(happyBirthday)
//     const firstLine = layout.lines[0]
//
//     // Should have multiple words with syllable timings
//     expect(firstLine.words.length).toBeGreaterThan(0)
//     firstLine.words.forEach(word => {
//       expect(word.startTime).toBeDefined()
//       expect(word.syllables.length).toBeGreaterThan(0)
//     })
//   })
// })

// ============================================================
// AVAILABLE SONGS IN SONGS_LIBRARY
// ============================================================
//
// 1. Meet Me In November        (5:08) - Modern original
// 2. Happy Birthday             (0:33) - Simple, upbeat
// 3. Row Row Row Your Boat      (0:44) - Playful round
// 4. Twinkle Twinkle Little Star(0:36) - Gentle lullaby
// 5. Amazing Grace              (2:15) - Classic hymn
// 6. Swing Low Sweet Chariot    (2:00) - Spiritual
// 7. O Come All Ye Faithful     (2:00) - Christmas hymn
// 8. Auld Lang Syne             (2:15) - Scottish traditional
// 9. Yankee Doodle              (1:30) - Marching song
// 10. Simple Gifts               (1:45) - Shaker hymn
// 11. My Bonnie Lies Over...    (2:00) - Scottish ballad
// 12. Home on the Range         (2:30) - American folk
//
// ============================================================

// VIM: set ts=2 sw=2 et:
// END
