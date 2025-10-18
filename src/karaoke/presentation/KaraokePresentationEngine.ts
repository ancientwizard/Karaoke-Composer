/**
 * Karaoke Presentation Engine
 *
 * Main orchestrator that converts a KaraokeProject into a complete
 * PresentationScript that can be rendered by any renderer (Terminal, CDG, etc.)
 */

import type { KaraokeProject } from '../../types/karaoke'
import type { PresentationScript } from './PresentationCommand'
import { TimingConverter, type TimingConverterConfig } from './TimingConverter'

/**
 * Configuration for presentation engine
 */
export interface PresentationEngineConfig {
  timingConfig?: TimingConverterConfig
}

/**
 * Main engine for generating karaoke presentations
 */
export class KaraokePresentationEngine {
  private timingConverter: TimingConverter

  constructor(config: PresentationEngineConfig = {}) {
    this.timingConverter = new TimingConverter(config.timingConfig)
  }

  /**
   * Generate complete presentation script from karaoke project
   */
  generateScript(project: KaraokeProject): PresentationScript {
    // Convert timing data to commands
    const commands = this.timingConverter.convert(project)

    // Calculate total duration
    const durationMs = this.calculateDuration(project)

    // Build complete script
    return {
      commands,
      durationMs,
      metadata: {
        title: project.name,
        artist: project.artist,
        songDurationMs: project.audioFile.duration
          ? project.audioFile.duration * 1000
          : undefined
      }
    }
  }

  /**
   * Calculate total duration of presentation
   */
  private calculateDuration(project: KaraokeProject): number {
    // Use audio duration if available
    if (project.audioFile.duration) {
      return project.audioFile.duration * 1000 // Convert to ms
    }

    // Otherwise use last lyric line end time + buffer
    const lyricsWithTiming = project.lyrics.filter(line => line.endTime !== undefined)

    if (lyricsWithTiming.length > 0) {
      const lastLine = lyricsWithTiming[lyricsWithTiming.length - 1]
      return (lastLine.endTime || 0) + 3000 // Add 3 second buffer
    }

    // Default minimum duration
    return 30000 // 30 seconds
  }

  /**
   * Validate that a project is ready for presentation
   */
  validateProject(project: KaraokeProject): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for audio file
    if (!project.audioFile.file && !project.audioFile.url) {
      errors.push('No audio file loaded')
    }

    // Check for lyrics
    if (!project.lyrics || project.lyrics.length === 0) {
      errors.push('No lyrics found')
    }

    // Check for timing data
    const lyricsWithTiming = project.lyrics.filter(line =>
      line.startTime !== undefined && line.endTime !== undefined
    )

    if (lyricsWithTiming.length === 0) {
      errors.push('No timing data found')
    }

    // Check syllable timing
    const linesWithSyllableTiming = lyricsWithTiming.filter(line => {
      return line.words.some(word =>
        word.syllables.some(syllable => syllable.startTime !== undefined)
      )
    })

    if (linesWithSyllableTiming.length === 0) {
      warnings.push('No syllable-level timing found - only line-level highlighting will be available')
    } else if (linesWithSyllableTiming.length < lyricsWithTiming.length) {
      warnings.push(`Only ${linesWithSyllableTiming.length} of ${lyricsWithTiming.length} lines have syllable timing`)
    }

    // Check metadata
    if (!project.name) {
      warnings.push('No song title specified')
    }

    if (!project.artist) {
      warnings.push('No artist specified')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}
