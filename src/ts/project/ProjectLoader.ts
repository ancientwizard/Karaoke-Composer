/**
 * Karaoke Composer - Project Loader Service
 *
 * Handles loading, saving, and managing CDG projects
 * Integrates file I/O with Vue reactive state
 *
 * Path Normalization Strategy:
 * - When loading a .cmp file, if paths reference Sample_Files\ (broken),
 *   normalize them to cdg-projects/ (correct) during load
 * - This is a one-time fix-up for legacy .cmp files
 * - UI sees already-correct paths and doesn't need to know about normalization
 * - When saving, paths are already correct
 */

import { CMPParser                } from '@/ts/cd+g-magic/CMPParser';
import { PathNormalizationFacade  } from '@/ts/cd+g-magic/PathNormalizationFacade';
import type { CMPProject          } from '@/ts/cd+g-magic/CMPParser';

export interface LoadedProject {
  name: string;
  audioFile: string;
  projectPath: string;
  duration: number; // in packets
  clipsCount: number;
  lastModified: Date;
  rawData: CMPProject;
}

/**
 * Project Loader Service
 *
 * Loads .cmp project files and provides access to project data
 */
export class ProjectLoader {
  /**
   * Load a project from file buffer
   *
   * Applies one-time path normalization if needed (for legacy .cmp files).
   * After this, paths are correct and UI doesn't need to know about fixes.
   *
   * @param buffer Binary data from .cmp file
   * @param fileName Name of the file being loaded
   * @returns LoadedProject with parsed and normalized data
   */
  static loadFromBuffer(buffer: ArrayBuffer, fileName: string): LoadedProject | null {
    try {
      const uint8Array = new Uint8Array(buffer);
      const parser = new CMPParser(uint8Array);
      let rawData = parser.parse();

      // One-time normalization: fix Sample_Files\ paths to cdg-projects/
      // This is transparent to the UI - after this, paths are correct
      rawData = this.normalizePathsIfNeeded(rawData);

      const projectName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

      // Calculate total duration from clips
      let maxEnd = 0;
      for (const clip of rawData.clips) {
        const clipEnd = clip.start + clip.duration;
        if (clipEnd > maxEnd) {
          maxEnd = clipEnd;
        }
      }

      return {
        name: projectName,
        audioFile: rawData.audioFile,
        projectPath: fileName,
        duration: maxEnd,
        clipsCount: rawData.clips.length,
        lastModified: new Date(),
        rawData,
      };
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }

  /**
   * Check if paths need normalization (Sample_Files\ → cdg-projects/)
   * and apply one-time fix-up if needed.
   *
   * This is a temporary bridge for legacy .cmp files.
   * Once all projects are created/saved in the new system, this won't be needed.
   */
  private static normalizePathsIfNeeded(project: CMPProject): CMPProject {
    const facade = new PathNormalizationFacade({
      normalizeSlashes: true,
      replaceSampleFiles: true,
    });

    // Check if normalization is actually needed
    const audioHasSampleFiles = project.audioFile?.includes('Sample_Files');
    let clipsHaveSampleFiles = false;

    for (const clip of project.clips) {
      if (clip.type === 'BMPClip' && clip.data.events) {
        const events = clip.data.events as Array<{ bmpPath?: string; transitionFile?: string }>;
        for (const evt of events) {
          if (evt.bmpPath?.includes('Sample_Files') || evt.transitionFile?.includes('Sample_Files')) {
            clipsHaveSampleFiles = true;
            break;
          }
        }
      }
      if (clipsHaveSampleFiles) break;
    }

    // Only normalize if needed (paths reference Sample_Files)
    if (audioHasSampleFiles || clipsHaveSampleFiles) {
      return facade.normalize(project);
    }

    return project;
  }

  /**
   * Convert project to clip data for editor
   */
  static projectToClips(project: LoadedProject) {
    return project.rawData.clips.map((clip) => ({
      type: clip.type,
      track: clip.track,
      start_ms: (clip.start / 300) * 1000, // Convert packets to milliseconds at 300 pps
      start_packets: clip.start,
      duration_ms: (clip.duration / 300) * 1000,
      duration_packets: clip.duration,
      data: clip.data,
    }));
  }

  /**
   * Check if a file would be accessible (for debugging)
   * Returns true if file matches known asset names in cdg-projects
   */
  static async checkFileAccessibility(filePath: string): Promise<boolean> {
    // This is a browser environment, so we can't actually check filesystem
    // Instead, we'll check if the path looks valid and would resolve
    if (!filePath) {
      return false;
    }

    // For now, just verify the path looks valid (has a filename)
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    return filename.length > 0 && !filename.includes('\\');
  }

  /**
   * Extract all file references from a project (raw, unnormalized paths)
   */
  static extractFileReferences(project: LoadedProject): Map<string, 'audio' | 'bmp' | 'transition' | 'cdg'> {
    const refs = new Map<string, 'audio' | 'bmp' | 'transition' | 'cdg'>();

    // Add audio file (raw from project)
    if (project.audioFile) {
      refs.set(project.audioFile, 'audio');
    }

    // Extract from all clips (raw data)
    for (const clip of project.rawData.clips) {
      if (clip.type === 'BMPClip' && clip.data.events) {
        const events = clip.data.events as Array<{ bmpPath?: string; transitionFile?: string }>;
        for (const evt of events) {
          if (evt.bmpPath) {
            refs.set(evt.bmpPath, 'bmp');
          }
          if (evt.transitionFile && evt.transitionFile.endsWith('.cmt')) {
            refs.set(evt.transitionFile, 'transition');
          }
        }
      }
    }

    return refs;
  }

  /**
   * Get the project data (paths already correct from load-time normalization)
   *
   * UI components use this - they see already-correct paths.
   * There's no need for dual-path system since normalization happened during load.
   */
  static getProject(project: LoadedProject): CMPProject {
    return project.rawData;
  }
}

// VIM: set ft=typescript :
// END