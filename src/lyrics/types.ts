/**
 * Song Data Types
 *
 * Defines the structure for storing lyrics and timing data for testing.
 * These types allow us to define songs directly in TypeScript files rather
 * than requiring external LRC files, making them available for unit testing
 * the TextLayoutEngine.
 */

/**
 * A syllable within a word, with timing information
 */
export interface SongSyllable
{
  text: string
  startTime: number // milliseconds
}

/**
 * A word within a lyric line, composed of syllables
 */
export interface SongWord
{
  text: string
  startTime: number // milliseconds
  syllables: SongSyllable[]
}

/**
 * A lyric line with timing and optional caption
 */
export interface SongLine
{
  text: string
  startTime: number // milliseconds
  caption?: string // e.g., "Verse 1", "Chorus", "Bridge"
  words: SongWord[]
}

/**
 * Complete song with metadata and all lyrics
 */
export interface Song
{
  title: string
  artist: string // songwriter/lyricist
  duration: number // milliseconds
  lines: SongLine[]
}

// VIM: set ts=2 sw=2 et:
// END
