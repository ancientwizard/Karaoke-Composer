/**
 * Song Format Parser
 *
 * Converts simple, human-readable song format to Song data structure.
 *
 * Format:
 * -------
 * @title: Song Title
 * @artist: Songwriter/Lyricist
 * @duration: mm:ss.xx
 *
 * [CAPTION]
 * mm:ss.xx line text with optional <syllable markers>
 *   <mm:ss.xx>syl<mm:ss.xx>la<mm:ss.xx>ble
 *
 * Example:
 * --------
 * @title: Amazing Grace
 * @artist: John Newton
 * @duration: 03:00.00
 *
 * [Verse 1]
 * 00:00.00 Amazing grace, how sweet the sound
 *   <00:00.00>A<00:00.20>maz<00:00.40>ing grace,<00:01.00>
 *   <00:01.20>how<00:01.50> sweet<00:02.00> the<00:02.30> sound
 */

import type { Song, SongLine } from './types'

interface ParsedMetadata {
  title: string
  artist: string
  duration: number
}

export class SongParser {
  /**
   * Parse simple song format into Song data structure
   */
  static parse(content: string): Song {
    const lines = content.split('\n').map(line => line.trimEnd())

    // Extract metadata
    const metadata = this.parseMetadata(lines)

    // Extract lyrics
    const lyrics = this.parseLyrics(lines)

    return {
      title: metadata.title,
      artist: metadata.artist,
      duration: metadata.duration,
      lines: lyrics
    }
  }

  private static parseMetadata(lines: string[]): ParsedMetadata {
    const metadata: Partial<ParsedMetadata> = {}

    for (const line of lines) {
      if (line.startsWith('@title:')) {
        metadata.title = line.substring('@title:'.length).trim()
      } else if (line.startsWith('@artist:')) {
        metadata.artist = line.substring('@artist:'.length).trim()
      } else if (line.startsWith('@duration:')) {
        const durStr = line.substring('@duration:'.length).trim()
        metadata.duration = this.timeToMs(durStr)
      }
    }

    if (!metadata.title || !metadata.artist || metadata.duration === undefined) {
      throw new Error('Missing required metadata: @title, @artist, @duration')
    }

    return metadata as ParsedMetadata
  }

  private static parseLyrics(lines: string[]): SongLine[] {
    const result: SongLine[] = []
    let currentCaption: string | undefined
    let currentLine: Partial<SongLine> | undefined

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip metadata lines
      if (trimmed.startsWith('@')) continue
      if (!trimmed) continue

      // Caption line [CAPTION]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentCaption = trimmed.substring(1, trimmed.length - 1)
        continue
      }

      // Lyrics line: mm:ss.xx text
      const match = trimmed.match(/^(\d{2}:\d{2}\.\d{2})\s+(.+)$/)
      if (match) {
        const [, timeStr, textLine] = match
        const startTime = this.timeToMs(timeStr)

        currentLine = {
          text: textLine,
          startTime,
          caption: currentCaption,
          words: []
        }

        // Parse syllable markers if present
        if (textLine.includes('<')) {
          this.parseWordsWithSyllables(textLine, currentLine as SongLine)
        } else {
          // Simple line without syllable timing
          this.parseWordsSimple(textLine, currentLine as SongLine)
        }

        result.push(currentLine as SongLine)
      }
    }

    return result
  }

  private static parseWordsWithSyllables(text: string, line: SongLine): void {
    const words = line.words || []
    let currentWord = ''
    let currentWordStart: number | undefined
    const syllables = []

    // Split by < markers
    const parts = text.split('<')

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      if (i === 0) {
        // Text before first marker
        currentWord = part
        continue
      }

      // Extract timestamp and syllable text
      const match = part.match(/^(\d{2}:\d{2}\.\d{2})>(.*)$/)
      if (!match) continue

      const [, timeStr, sylText] = match
      const sylStart = this.timeToMs(timeStr)

      if (currentWordStart === undefined) {
        currentWordStart = sylStart
      }

      syllables.push({
 text: sylText, startTime: sylStart 
})

      // Check if this is end of word (has space)
      if (sylText.includes(' ')) {
        const spaceIdx = sylText.indexOf(' ')
        const finalSyl = sylText.substring(0, spaceIdx)
        const afterSpace = sylText.substring(spaceIdx + 1)

        // Update last syllable
        if (syllables.length > 0) {
          syllables[syllables.length - 1].text = finalSyl
        }

        // Create word
        const wordText = currentWord + syllables.map(s => s.text).join('')
        words.push({
          text: wordText,
          startTime: currentWordStart,
          syllables: [...syllables]
        })

        // Reset for next word
        currentWord = afterSpace
        syllables.length = 0
        currentWordStart = undefined
      }
    }

    // Add last word if any
    if (syllables.length > 0 || currentWord) {
      const wordText = currentWord + syllables.map(s => s.text).join('')
      const finalStart = currentWordStart || line.startTime
      words.push({
        text: wordText,
        startTime: finalStart,
        syllables: syllables.length > 0 ? syllables : [{
 text: wordText, startTime: finalStart 
}]
      })
    }

    line.words = words
  }

  private static parseWordsSimple(text: string, line: SongLine): void {
    // Simple split by spaces
    const wordTexts = text.split(/\s+/)
    const words = wordTexts.map((w, idx) => ({
      text: w,
      startTime: line.startTime + idx * 200, // Rough estimate
      syllables: [{
 text: w, startTime: line.startTime + idx * 200 
}]
    }))

    line.words = words
  }

  /**
   * Convert mm:ss.xx or mm:ss to milliseconds
   */
  private static timeToMs(timeStr: string): number {
    const parts = timeStr.split(':')
    const minutes = parseInt(parts[0], 10)
    const secondParts = parts[1].split('.')
    const seconds = parseInt(secondParts[0], 10)
    const centiseconds = secondParts[1] ? parseInt(secondParts[1], 10) : 0

    return minutes * 60000 + seconds * 1000 + centiseconds * 10
  }
}

// VIM: set ts=2 sw=2 et:
// END
