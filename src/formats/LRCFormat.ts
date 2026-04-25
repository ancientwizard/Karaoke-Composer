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
 *    Format: [mm:ss.xx]<mm:ss.xx~mm:ss.xx>wo<mm:ss.xx~mm:ss.xx>rd
 *    The '<...>' marker carries start and optional end timing for each syllable/word chunk
 *    Example: [00:10.50]<00:10.50~00:10.80>No<00:10.80~00:11.20>vem<00:11.20~00:11.50>ber
 *
 * 2. EXTENDED METADATA (Extension)
 *    [duration:mm:ss.xx] - Total song duration
 *    [creator:Application Name] - Creation tool
 *    [version:2.2] - Enhanced LRC version marker
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

import type { KaraokeProject, LyricLine, WordTiming, SyllableTiming } from '@/types/karaoke'

export type LRCTimingMode = 'none' | 'v2.1' | 'v2.2'

export interface LRCWriteOptions {
  timingMode?: LRCTimingMode
  includeMetadata?: boolean
  precisionDigits?: 2 | 3
}

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
  caption?: string // Optional caption for this line (e.g., "Verse 1", "Chorus")
  words?: Array<{
    text: string
    timestamp: number
    endTimestamp?: number
    syllables?: Array<{
      text: string
      timestamp: number
      endTimestamp?: number
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
  static toLRC(project: KaraokeProject, options: LRCWriteOptions = {}): string {
    const timingMode = options.timingMode ?? 'v2.2'
    const includeMetadata = options.includeMetadata ?? true
    const precisionDigits = options.precisionDigits ?? 2
    const lines: string[] = []

    if (includeMetadata) {
      // Write metadata header
      lines.push(`[version:${timingMode === 'none' ? '1.0' : timingMode === 'v2.1' ? '2.1' : '2.2'}]`)
      lines.push(`[syllable_timing:${timingMode === 'none' ? 'false' : 'true'}]`)

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
        lines.push(`[duration:${this.formatTimestamp(duration, precisionDigits)}]`)
      }

      lines.push('') // Blank line after metadata
    }

    // Write lyrics with timing
    let lyricsLineIndex = 0
    for (const lyricLine of project.lyrics) {
      // Skip metadata lines (title, author) but not caption
      if (lyricLine.type && lyricLine.type !== 'lyrics' && lyricLine.type !== 'caption') {
        continue
      }

      // Handle caption lines - output as extended metadata
      if (lyricLine.type === 'caption') {
        const captionText = lyricLine.metadata?.caption || lyricLine.text.replace(/^\[@CAPTION:\s*/, '').replace(/\]$/, '')
        lines.push(`#[line:${lyricsLineIndex}:caption:${this.escapeMetadata(captionText)}]`)
        continue
      }

      if (!lyricLine.words || lyricLine.words.length === 0) {
        continue
      }

      if (timingMode === 'none') {
        lines.push(lyricLine.text)
      } else {
        const lineTimestamp = lyricLine.words[0].startTime || 0
        const lineText = this.formatLine(lyricLine, timingMode, precisionDigits)
        lines.push(`[${this.formatTimestamp(lineTimestamp, precisionDigits)}]${lineText}`)
      }
      lyricsLineIndex++
    }

    return lines.join('\n') + '\n'
  }

  /**
   * Format a lyric line with syllable timing
   */
  private static formatLine(
    line: LyricLine,
    timingMode: Exclude<LRCTimingMode, 'none'>,
    precisionDigits: 2 | 3
  ): string {
    if (!line.words) {
      return line.text
    }

    const parts: string[] = []

    for (const word of line.words) {
      if (!word.syllables || word.syllables.length === 0) {
        // Simple word without syllables
        if (word.startTime !== undefined) {
          parts.push(this.formatTimedChunk(word.word, word.startTime, word.endTime, timingMode, precisionDigits))
        } else {
          parts.push(word.word)
        }
      } else {
        // Word with syllable timing
        for (const syllable of this.normalizeSyllablesForExport(word)) {
          if (syllable.startTime !== undefined) {
            parts.push(
              this.formatTimedChunk(syllable.syllable, syllable.startTime, syllable.endTime, timingMode, precisionDigits)
            )
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

  private static normalizeSyllablesForExport(word: WordTiming): SyllableTiming[] {
    const syllables = word.syllables.map(syllable => ({ ...syllable }))
    if (syllables.length === 0) {
      return syllables
    }

    const wordStart = word.startTime
    const wordEnd = word.endTime

    // Anchor to word bounds so edits at word-level are reflected in export.
    if (wordStart !== undefined) {
      if (syllables[0].startTime === undefined || syllables[0].startTime > wordStart) {
        syllables[0].startTime = wordStart
      }
    }
    if (wordEnd !== undefined) {
      const lastIndex = syllables.length - 1
      if (syllables[lastIndex].endTime === undefined || syllables[lastIndex].endTime < wordEnd) {
        syllables[lastIndex].endTime = wordEnd
      }
    }

    let previousEnd: number | undefined = undefined
    for (let index = 0; index < syllables.length; index++) {
      const syllable = syllables[index]
      const nextSyllable = syllables[index + 1]

      if (syllable.startTime === undefined) {
        syllable.startTime = previousEnd ?? wordStart
      }

      if (syllable.startTime === undefined) {
        continue
      }

      if (previousEnd !== undefined && syllable.startTime < previousEnd) {
        syllable.startTime = previousEnd
      }

      if (syllable.endTime === undefined && nextSyllable?.startTime !== undefined) {
        syllable.endTime = nextSyllable.startTime
      }

      if (nextSyllable?.startTime !== undefined && syllable.endTime !== undefined && syllable.endTime > nextSyllable.startTime) {
        syllable.endTime = nextSyllable.startTime
      }

      if (wordStart !== undefined && syllable.startTime < wordStart) {
        syllable.startTime = wordStart
      }
      if (wordEnd !== undefined && syllable.startTime > wordEnd) {
        syllable.startTime = wordEnd
      }

      if (syllable.endTime !== undefined && syllable.endTime < syllable.startTime) {
        syllable.endTime = syllable.startTime
      }

      if (wordEnd !== undefined && syllable.endTime !== undefined && syllable.endTime > wordEnd) {
        syllable.endTime = wordEnd
      }

      previousEnd = syllable.endTime ?? syllable.startTime
    }

    return syllables
  }

  private static formatTimedChunk(
    text: string,
    startTimeMs: number,
    endTimeMs: number | undefined,
    timingMode: Exclude<LRCTimingMode, 'none'>,
    precisionDigits: 2 | 3
  ): string {
    if (
      timingMode === 'v2.2' &&
      endTimeMs !== undefined &&
      Number.isFinite(endTimeMs) &&
      endTimeMs >= startTimeMs
    ) {
      return `<${this.formatTimestamp(startTimeMs, precisionDigits)}~${this.formatTimestamp(endTimeMs, precisionDigits)}>${text}`
    }

    return `<${this.formatTimestamp(startTimeMs, precisionDigits)}>${text}`
  }

  /**
   * Format timestamp as mm:ss.xx
   */
  private static formatTimestamp(ms: number, precisionDigits: 2 | 3 = 2): string {
    const totalSeconds = ms / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    const fixed = seconds.toFixed(precisionDigits)
    const width = precisionDigits === 3 ? 6 : 5
    return `${String(minutes).padStart(2, '0')}:${fixed.padStart(width, '0')}`
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
    const lineMetadata: Map<number, { caption?: string }> = new Map()

    const fileLines = content.split(/\r?\n/)

    // First pass: collect line metadata (captions, etc.)
    for (const fileLine of fileLines) {
      const trimmed = fileLine.trim()

      if (!trimmed) {
        continue // Skip empty lines
      }

      // Check for extended line metadata: #[line:N:key:value]
      const lineMetadataMatch = trimmed.match(/^#\[line:(\d+):(\w+):(.+)\]$/)
      if (lineMetadataMatch) {
        const [, lineIndexStr, key, value] = lineMetadataMatch
        const lineIndex = parseInt(lineIndexStr, 10)

        if (!lineMetadata.has(lineIndex)) {
          lineMetadata.set(lineIndex, {})
        }

        const lineMeta = lineMetadata.get(lineIndex)!
        if (key === 'caption') {
          lineMeta.caption = value
        }

        continue
      }
    }

    // Second pass: parse lyrics lines
    let lyricsLineIndex = 0
    for (const fileLine of fileLines) {
      const trimmed = fileLine.trim()

      if (!trimmed) {
        continue // Skip empty lines
      }

      // Skip line metadata lines (already processed)
      if (trimmed.startsWith('#[line:')) {
        continue
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
          // Attach caption metadata if exists
          const lineMeta = lineMetadata.get(lyricsLineIndex)
          if (lineMeta?.caption) {
            parsedLine.caption = lineMeta.caption
          }

          lines.push(parsedLine)
          lyricsLineIndex++
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
    const markerMatches = Array.from(text.matchAll(/<([^>]+)>([^<]*)/g))

    let currentWord = ''
    let currentWordStart: number | undefined = undefined
    let currentWordEnd: number | undefined = undefined
    let syllables: Array<{ text: string; timestamp: number; endTimestamp?: number }> = []

    const flushWord = (): void => {
      if (!currentWord.trim()) {
        return
      }

      words.push({
        text: currentWord.trim(),
        timestamp: currentWordStart ?? lineTimestamp,
        endTimestamp: currentWordEnd,
        syllables: syllables.length > 0 ? [...syllables] : undefined
      })

      currentWord = ''
      currentWordStart = undefined
      currentWordEnd = undefined
      syllables = []
    }

    for (const markerMatch of markerMatches) {
      const marker = markerMatch[1]
      const markerText = markerMatch[2] ?? ''
      const { start, end } = this.parseTimedMarker(marker)

      let chunk = ''
      for (const ch of markerText) {
        if (/\s/.test(ch)) {
          if (chunk.length > 0) {
            if (currentWordStart === undefined) {
              currentWordStart = start
            }

            currentWord += chunk
            currentWordEnd = end ?? currentWordEnd
            syllables.push({ text: chunk, timestamp: start, endTimestamp: end })
            chunk = ''
          }

          flushWord()
        } else {
          chunk += ch
        }
      }

      if (chunk.length > 0) {
        if (currentWordStart === undefined) {
          currentWordStart = start
        }

        currentWord += chunk
        currentWordEnd = end ?? currentWordEnd
        syllables.push({ text: chunk, timestamp: start, endTimestamp: end })
      }
    }

    flushWord()

    return {
      timestamp: lineTimestamp,
      text: words.map(w => w.text).join(' '),
      words
    }
  }

  private static parseTimedMarker(marker: string): { start: number; end?: number } {
    const parts = marker.split('~')
    const start = this.parseTimestamp(parts[0])

    if (parts.length < 2) {
      return { start }
    }

    const end = this.parseTimestamp(parts[1])
    if (!Number.isFinite(end) || end < start) {
      return { start }
    }

    return { start, end }
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
    const fractionRaw = (secondsParts[1] || '').replace(/\D/g, '')

    let milliseconds = 0
    if (fractionRaw.length > 0) {
      if (fractionRaw.length === 1) {
        milliseconds = parseInt(fractionRaw, 10) * 100
      } else if (fractionRaw.length === 2) {
        milliseconds = parseInt(fractionRaw, 10) * 10
      } else {
        milliseconds = parseInt(fractionRaw.slice(0, 3), 10)
      }
    }

    return (minutes * 60 + seconds) * 1000 + milliseconds
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
      // If this line has a caption, create a caption line first
      if (lrcLine.caption) {
        lyrics.push({
          id: `caption-${lineNumber}`,
          lineNumber: lineNumber++,
          text: `[@CAPTION:${lrcLine.caption}]`,
          words: [],
          type: 'caption',
          metadata: { caption: lrcLine.caption }
        })
      }

      if (!lrcLine.words || lrcLine.words.length === 0) {
        // Simple text line
        const lyricLine: LyricLine = {
          id: `line-${lineNumber}`,
          lineNumber: lineNumber++,
          text: lrcLine.text,
          type: 'lyrics',
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
        }

        // Attach caption metadata if exists
        if (lrcLine.caption) {
          if (!lyricLine.metadata) {
            lyricLine.metadata = {}
          }
          lyricLine.metadata.caption = lrcLine.caption
        }

        lyrics.push(lyricLine)
        continue
      }

      // Convert LRC words to our Word format
      const words = lrcLine.words.map(lrcWord => ({
        word: lrcWord.text,
        startTime: lrcWord.timestamp,
        endTime: lrcWord.endTimestamp,
        duration: lrcWord.endTimestamp !== undefined ? lrcWord.endTimestamp - lrcWord.timestamp : undefined,
        syllables: lrcWord.syllables
          ? lrcWord.syllables.map(s => ({
            syllable: s.text,
            startTime: s.timestamp,
            endTime: s.endTimestamp,
            duration: s.endTimestamp !== undefined ? s.endTimestamp - s.timestamp : undefined
          }))
          : [
            {
              syllable: lrcWord.text,
              startTime: lrcWord.timestamp,
              endTime: lrcWord.endTimestamp,
              duration: lrcWord.endTimestamp !== undefined ? lrcWord.endTimestamp - lrcWord.timestamp : undefined
            }
          ]
      }))

      // Calculate line start and end times from words/syllables
      let lineStartTime = lrcLine.timestamp
      let lineEndTime = lrcLine.timestamp

      if (words.length > 0) {
        // Start time is the first word/syllable
        lineStartTime = words[0].startTime || lrcLine.timestamp

        // Prefer explicit word end times when available.
        const lastWord = words[words.length - 1]
        if (lastWord.endTime !== undefined) {
          lineEndTime = lastWord.endTime
        } else if (lastWord.syllables && lastWord.syllables.length > 0) {
          const lastSyllable = lastWord.syllables[lastWord.syllables.length - 1]
          if (lastSyllable.endTime !== undefined) {
            lineEndTime = lastSyllable.endTime
          } else {
            // Fallback for legacy files with start-only markers.
            lineEndTime = (lastSyllable.startTime || lrcLine.timestamp) + 300
          }
        } else {
          lineEndTime = (lastWord.startTime || lrcLine.timestamp) + 500
        }
      }

      const lyricLine: LyricLine = {
        id: `line-${lineNumber}`,
        lineNumber: lineNumber++,
        text: lrcLine.text,
        type: 'lyrics',
        words,
        startTime: lineStartTime,
        endTime: lineEndTime,
        duration: lineEndTime - lineStartTime
      }

      // Attach caption metadata if exists
      if (lrcLine.caption) {
        if (!lyricLine.metadata) {
          lyricLine.metadata = {}
        }
        lyricLine.metadata.caption = lrcLine.caption
      }

      lyrics.push(lyricLine)
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
