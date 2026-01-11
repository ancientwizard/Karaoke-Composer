/**
 * Path Normalization Facade
 *
 * Applies optional path transformations to CMPProject data.
 * This facade pattern allows path normalization to be optional:
 * - Use for UI/editor display (normalize Windows paths to web-friendly paths)
 * - Skip for save operations (preserve original paths for round-trip fidelity)
 *
 * Design: Transforms happen AFTER parsing, not during parsing.
 * This allows CMPParser to remain pure and faithful to the binary format.
 */

import type { CMPProject, CMPClip } from './CMPParser';

export interface PathNormalizationOptions {
  /**
   * Convert Windows backslashes to forward slashes
   */
  normalizeSlashes?: boolean;

  /**
   * Replace Sample_Files\ paths with cdg-projects/
   */
  replaceSampleFiles?: boolean;
}

/**
 * Path Normalization Facade
 *
 * Provides optional path transformations for CMPProject data.
 */
export class PathNormalizationFacade {
  private options: PathNormalizationOptions;

  constructor(options: PathNormalizationOptions = {}) {
    this.options = {
      normalizeSlashes: true,
      replaceSampleFiles: true,
      ...options,
    };
  }

  /**
   * Apply path normalization to a project
   */
  normalize(project: CMPProject): CMPProject {
    // Deep clone to avoid mutating original
    const normalized: CMPProject = {
      audioFile: this.normalizePath(project.audioFile),
      playPosition: project.playPosition,
      tracks: project.tracks,
      clips: project.clips.map((clip) => this.normalizeClip(clip)),
    };

    return normalized;
  }

  /**
   * Normalize a single clip
   */
  private normalizeClip(clip: CMPClip): CMPClip {
    const normalized: CMPClip = {
      ...clip,
      data: { ...clip.data },
    };

    if (clip.type === 'BMPClip' && clip.data.events) {
      const events = (clip.data.events as Array<{ bmpPath?: string; transitionFile?: string }>).map(
        (evt) => ({
          ...evt,
          bmpPath: evt.bmpPath ? this.normalizePath(evt.bmpPath) : evt.bmpPath,
          transitionFile: evt.transitionFile ? this.normalizePath(evt.transitionFile) : evt.transitionFile,
        })
      );
      normalized.data.events = events;
    }

    if (clip.type === 'TextClip' && clip.data.events) {
      const events = (clip.data.events as Array<{ transitionFile?: string }>).map((evt) => ({
        ...evt,
        transitionFile: evt.transitionFile ? this.normalizePath(evt.transitionFile) : evt.transitionFile,
      }));
      normalized.data.events = events;
    }

    return normalized;
  }

  /**
   * Normalize a single path string
   */
  private normalizePath(path: string): string {
    if (!path) {
      return path;
    }

    let normalized = path;

    // Convert Windows backslashes to forward slashes
    if (this.options.normalizeSlashes) {
      normalized = normalized.replace(/\\/g, '/');
    }

    // Handle absolute Windows paths: Extract filename from paths like
    // C:\Temp\CD+Graphics Magic\cdg-projects\simple_sky_2+14.bmp
    // Replace with just cdg-projects/simple_sky_2+14.bmp
    if (this.options.replaceSampleFiles) {
      // Match pattern: ...cdg-projects/filename.ext or ...Sample_Files/filename.ext
      const cdgMatch = normalized.match(/cdg-projects\/([^/]+)$/i);
      const sampleMatch = normalized.match(/Sample_Files\/([^/]+)$/i);
      
      if (cdgMatch) {
        // Extract filename and prepend cdg-projects/
        normalized = 'cdg-projects/' + cdgMatch[1];
      } else if (sampleMatch) {
        // Replace Sample_Files with cdg-projects
        normalized = 'cdg-projects/' + sampleMatch[1];
      }
    }

    return normalized;
  }
}

// VIM: set ft=typescript :
// END