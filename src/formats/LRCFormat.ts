/**
 * LRC (Lyrics) File Format - V2+ Implementation
 *
 * STANDARD LRC V2 FEATURES:
 * =========================
 * - Line-level timing: [mm:ss.xx]Line text
 * - Word-level timing: [mm:ss.xx]<mm:ss.xx>word
 * - Metadata tags: [au:Author] [ti:Title] [al:Album] [by:Creator] [offset:±ms]
 *   Note: We use [au:] for author/songwriter instead of [ar:] for artist/performer
 * - Multiple timestamps per line (repeated choruses)
 *
 * OUR V2+ EXTENSIONS:
 * ===================
 * We extend the format to preserve our rich syllable timing data:
 *
 * 1. SYLLABLE-LEVEL TIMING (Extension)
 *    Format: [mm:ss.xx]<mm:ss.xx>wo<mm:ss.xx>rd
 *    The '<' marker before a syllable indicates its start time
 *    Example: [00:10.50]<00:10.50>No<00:10.80>vem<00:11.20>ber
 *
 * 2. EXTENDED METADATA (Extension)
 *    [duration:mm:ss.xx] - Total song duration
 *    [creator:Application Name] - Creation tool
 *    [version:2.1] - Enhanced LRC version marker
 *    [syllable_timing:true] - Indicates syllable data present
 *
 * 3. LINE METADATA (Extension)
 *    #[line:N:metadata] format for line-specific data
 *    Examples: #[line:0:title:Verse 1], #[line:0:author:John Doe], #[line:0:caption:Lyrics]
 *
 * PARSING STRATEGY:
 * =================
 * - Read file line by line
 * - Parse metadata tags
 * - Extract timestamps and text
 * - Reconstruct syllable boundaries from timing markers
 * - Handle both standard LRC and our extensions gracefully
 *
 * WRITING STRATEGY:
 * =================
 * - Write metadata header first
 * - Convert milliseconds to mm:ss.xx format
 * - Insert syllable timing markers
 * - Sort lines by timestamp
 * - Ensure backward compatibility (standard players ignore extensions)
 */

import type { KaraokeProject, LyricLine } from '@/types/karaoke'

/**
 * LRC file metadata
 * Note: 'author' refers to the songwriter/lyricist, not the performer
 */
export interface LRCMetadata {
  author?: string // The songwriter/lyricist (our 'artist' field maps here)
  title?: string
  album?: string
  creator?: string
  version?: string
  offset?: number // milliseconds
  duration?: number // milliseconds
  syllableTiming?: boolean
}

/**
 * LRC line with timing information
 */
export interface LRCLine {
  timestamp: number // milliseconds
  text: string
  words?: Array<{
    text: string
    timestamp: number
    syllables?: Array<{
      text: string
      timestamp: number
    }>
  }>
}

/**
 * LRC Writer - Converts our rich timing data to LRC V2+ format
 */
export class LRCWriter {
  /**
   * Convert KaraokeProject to LRC V2+ format
   */
  static toLRC(project: KaraokeProject): string {
    const lines: string[] = []

    // Write metadata header
    lines.push(`[version:2.1]`)
    lines.push(`[syllable_timing:true]`)

    if (project.name) {
      lines.push(`[ti:${this.escapeMetadata(project.name)}]`)
    }
    if (project.artist) {
      // Use [au:] tag for author/songwriter (not [ar:] for artist/performer)
      lines.push(`[au:${this.escapeMetadata(project.artist)}]`)
    }

    lines.push(`[creator:Karaoke Composer]`)

    // Calculate duration from last word
    const duration = this.calculateDuration(project.lyrics)
    if (duration > 0) {
      lines.push(`[duration:${this.formatTimestamp(duration)}]`)
    }

    lines.push('') // Blank line after metadata

    // Write lyrics with timing
    for (const lyricLine of project.lyrics) {
      // Skip metadata lines
      if (lyricLine.type && lyricLine.type !== 'lyrics') {
        continue
      }

      if (!lyricLine.words || lyricLine.words.length === 0) {
        continue
      }

      const lineTimestamp = lyricLine.words[0].startTime || 0
      const lineText = this.formatLine(lyricLine)

      lines.push(`[${this.formatTimestamp(lineTimestamp)}]${lineText}`)
    }

    return lines.join('\n') + '\n'
  }

  /**
   * Format a lyric line with syllable timing
   */
  private static formatLine(line: LyricLine): string {
    if (!line.words) {
      return line.text
    }

    const parts: string[] = []

    for (const word of line.words) {
      if (!word.syllables || word.syllables.length === 0) {
        // Simple word without syllables
        if (word.startTime !== undefined) {
          parts.push(`<${this.formatTimestamp(word.startTime)}>${word.word}`)
        } else {
          parts.push(word.word)
        }
      } else {
        // Word with syllable timing
        for (const syllable of word.syllables) {
          if (syllable.startTime !== undefined) {
            parts.push(`<${this.formatTimestamp(syllable.startTime)}>${syllable.syllable}`)
          } else {
            parts.push(syllable.syllable)
          }
        }
      }

      parts.push(' ') // Space between words
    }

    // Remove trailing space
    return parts.join('').trim()
  }

  /**
   * Format timestamp as mm:ss.xx
   */
  private static formatTimestamp(ms: number): string {
    const totalSeconds = ms / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`
  }

  /**
   * Escape metadata values
   */
  private static escapeMetadata(value: string): string {
    // Remove line breaks and brackets
    return value.replace(/[\r\n]/g, ' ').replace(/[[\]]/g, '')
  }

  /**
   * Calculate total duration from lyrics
   */
  private static calculateDuration(lyrics: LyricLine[]): number {
    let maxTime = 0

    for (const line of lyrics) {
      if (line.words) {
        for (const word of line.words) {
          if (word.endTime !== undefined && word.endTime > maxTime) {
            maxTime = word.endTime
          }
        }
      }
    }

    return maxTime
  }
}

/**
 * LRC Parser - Reads LRC V2+ format back to our data structure
 */
export class LRCParser {
  /**
   * Parse LRC file content
   */
  static parse(content: string): { metadata: LRCMetadata; lines: LRCLine[] } {
    const metadata: LRCMetadata = {}
    const lines: LRCLine[] = []

    const fileLines = content.split(/\r?\n/)

    for (const fileLine of fileLines) {
      const trimmed = fileLine.trim()

      if (!trimmed) {
        continue // Skip empty lines
      }

      // Check if this is a timestamp line (starts with [MM:SS.xx])
      const isTimestampLine = /^\[\d+:\d+\.\d+\]/.test(trimmed)

      if (trimmed.startsWith('[') && !isTimestampLine) {
        // This is metadata (tags like [ti:Title], [au:Author])
        this.parseMetadata(trimmed, metadata)
        continue
      }

      // Parse timed lines (lines with timestamps)
      if (isTimestampLine) {
        const parsedLine = this.parseLine(trimmed)
        if (parsedLine) {
          lines.push(parsedLine)
        }
      }
    }

    // Sort lines by timestamp
    lines.sort((a, b) => a.timestamp - b.timestamp)

    return {
      metadata,
      lines
    }
  }

  /**
   * Parse metadata tag
   */
  private static parseMetadata(line: string, metadata: LRCMetadata): void {
    const match = line.match(/\[([^:]+):([^\]]+)\]/)
    if (!match) return

    const [, key, value] = match

    switch (key.toLowerCase()) {
      case 'au': // Author/songwriter
        metadata.author = value
        break
      case 'ar': // Also accept artist tag for compatibility
        metadata.author = value
        break
      case 'ti':
        metadata.title = value
        break
      case 'al':
        metadata.album = value
        break
      case 'creator':
        metadata.creator = value
        break
      case 'version':
        metadata.version = value
        break
      case 'offset':
        metadata.offset = parseInt(value, 10)
        break
      case 'duration':
        metadata.duration = this.parseTimestamp(value)
        break
      case 'syllable_timing':
        metadata.syllableTiming = value.toLowerCase() === 'true'
        break
    }
  }

  /**
   * Parse a timed line with syllable markers
   */
  private static parseLine(line: string): LRCLine | null {
    // Extract timestamp and text
    const match = line.match(/\[([^\]]+)\](.+)/)
    if (!match) return null

    const [, timestampStr, text] = match
    const timestamp = this.parseTimestamp(timestampStr)

    // Check for syllable timing markers
    if (text.includes('<')) {
      return this.parseLineWithTiming(timestamp, text)
    }

    // Simple line without timing
    return {
      timestamp,
      text: text.trim()
    }
  }

  /**
   * Parse line with word/syllable timing markers
   */
  private static parseLineWithTiming(lineTimestamp: number, text: string): LRCLine {
    const words: LRCLine['words'] = []
    let currentWord = ''
    let currentTimestamp = lineTimestamp
    const syllables: Array<{ text: string; timestamp: number }> = []

    // Split by < markers
    const parts = text.split('<')

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      if (i === 0 && !text.startsWith('<')) {
        // Text before first marker
        currentWord += part
        continue
      }

      // Extract timestamp and text
      const markerMatch = part.match(/^([^>]+)>(.*)$/)
      if (!markerMatch) continue

      const [, timestampStr, syllableText] = markerMatch
      const syllableTimestamp = this.parseTimestamp(timestampStr)

      // Check if this is end of word (has space)
      const spaceIndex = syllableText.indexOf(' ')
      if (spaceIndex !== -1) {
        // End of word
        syllables.push({
          text: syllableText.substring(0, spaceIndex),
          timestamp: syllableTimestamp
        })

        words.push({
          text: currentWord + syllableText.substring(0, spaceIndex),
          timestamp: currentTimestamp,
          syllables: syllables.length > 0 ? [...syllables] : undefined
        })

        // Start new word
        currentWord = ''
        syllables.length = 0
        // Don't update currentTimestamp here - it will be set by the next marker
        // currentTimestamp will be updated when we process the next syllable/word

        // Continue with text after space
        if (spaceIndex + 1 < syllableText.length) {
          currentWord = syllableText.substring(spaceIndex + 1)
        }
      } else {
        // Middle of word or start of word
        syllables.push({
          text: syllableText,
          timestamp: syllableTimestamp
        })
        currentWord += syllableText

        // If this is the first syllable of a word, update the word timestamp
        if (syllables.length === 1) {
          currentTimestamp = syllableTimestamp
        }
      }
    }

    // Add last word if exists
    if (currentWord.trim()) {
      words.push({
        text: currentWord.trim(),
        timestamp: currentTimestamp,
        syllables: syllables.length > 0 ? [...syllables] : undefined
      })
    }

    return {
      timestamp: lineTimestamp,
      text: words.map(w => w.text).join(' '),
      words
    }
  }

  /**
   * Parse timestamp from mm:ss.xx or mm:ss:xx format
   */
  private static parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':')
    if (parts.length < 2) return 0

    const minutes = parseInt(parts[0], 10) || 0
    const secondsParts = parts[1].split('.')
    const seconds = parseInt(secondsParts[0], 10) || 0
    const centiseconds = parseInt(secondsParts[1], 10) || 0

    return (minutes * 60 + seconds) * 1000 + centiseconds * 10
  }

  /**
   * Convert parsed LRC data to KaraokeProject
   */
  static toKaraokeProject(
    content: string,
    projectId: string = 'imported-song'
  ): KaraokeProject {
    const { metadata, lines } = this.parse(content)

    const lyrics: LyricLine[] = []
    let lineNumber = 1

    for (const lrcLine of lines) {
      if (!lrcLine.words || lrcLine.words.length === 0) {
        // Simple text line
        lyrics.push({
          id: `line-${lineNumber}`,
          lineNumber: lineNumber++,
          text: lrcLine.text,
          startTime: lrcLine.timestamp,
          endTime: lrcLine.timestamp + 1000, // 1 second default duration
          words: [
            {
              word: lrcLine.text,
              startTime: lrcLine.timestamp,
              syllables: [
                {
                  syllable: lrcLine.text,
                  startTime: lrcLine.timestamp
                }
              ]
            }
          ]
        })
        continue
      }

      // Convert LRC words to our Word format
      const words = lrcLine.words.map(lrcWord => ({
        word: lrcWord.text,
        startTime: lrcWord.timestamp,
        syllables: lrcWord.syllables
          ? lrcWord.syllables.map(s => ({
            syllable: s.text,
            startTime: s.timestamp
          }))
          : [
            {
              syllable: lrcWord.text,
              startTime: lrcWord.timestamp
            }
          ]
      }))

      // Calculate line start and end times from words/syllables
      let lineStartTime = lrcLine.timestamp
      let lineEndTime = lrcLine.timestamp

      if (words.length > 0) {
        // Start time is the first word/syllable
        lineStartTime = words[0].startTime || lrcLine.timestamp

        // End time is after the last syllable
        const lastWord = words[words.length - 1]
        if (lastWord.syllables && lastWord.syllables.length > 0) {
          const lastSyllable = lastWord.syllables[lastWord.syllables.length - 1]
          // Add ~300ms per syllable as duration estimate
          lineEndTime = (lastSyllable.startTime || lrcLine.timestamp) + 300
        } else {
          lineEndTime = (lastWord.startTime || lrcLine.timestamp) + 500
        }
      }

      lyrics.push({
        id: `line-${lineNumber}`,
        lineNumber: lineNumber++,
        text: lrcLine.text,
        words,
        startTime: lineStartTime,
        endTime: lineEndTime
      })
    }

    return {
      id: projectId,
      name: metadata.title || 'Imported Song',
      artist: metadata.author || 'Unknown Artist',
      genre: '',
      lyrics,
      timings: [],
      isCompleted: true,
      audioFile: {
        name: '',
        file: null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}
