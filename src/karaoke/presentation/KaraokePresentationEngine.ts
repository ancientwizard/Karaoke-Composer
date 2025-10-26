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
        // Normalize stored audio duration to milliseconds. Projects can contain
        // either seconds (legacy) or milliseconds (stored by the browser). The
        // helper handles both cases so that downstream code gets a consistent
        // milliseconds value.
        songDurationMs: project.audioFile.duration
          ? this.normalizeAudioDurationToMs(project.audioFile.duration)
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
      // The stored `audioFile.duration` may be in seconds (legacy / test fixtures)
      // or in milliseconds (browser-detected and persisted). Normalize to ms.
      const normalized = this.normalizeAudioDurationToMs(project.audioFile.duration)
      return normalized
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
   * Normalize an audio duration value to milliseconds.
   * Accepts either seconds (common in test fixtures / legacy code) or
   * milliseconds (what the browser/audio service persists). Heuristic:
   * - If value looks large (> 10000) treat as milliseconds; otherwise
   *   treat as seconds and convert to milliseconds.
   */
  private normalizeAudioDurationToMs(audioDuration?: number): number {
    if (!audioDuration || isNaN(audioDuration)) return 0
    // If the value is large ( > 10,000 ) assume it's already ms
    if (audioDuration > 10000) return Math.floor(audioDuration)
    // Otherwise assume seconds -> convert to ms
    return Math.floor(audioDuration * 1000)
  }

  /**
   * Validate that a project is ready for presentation
   */
  validateProject(project: KaraokeProject, options: { allowMissingAudio?: boolean } = {}): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for audio file
    if (!options.allowMissingAudio) {
      if (!project.audioFile.file && !project.audioFile.url) {
        errors.push('No audio file loaded')
      }
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
