/**
 * Karaoke Composer - Project Loader Service
 *
 * Handles loading, saving, and managing CDG projects
 * Integrates file I/O with Vue reactive state
 */

import { CMPParser } from '@/ts/cd+g-magic/CMPParser';
import type { CMPProject } from '@/ts/cd+g-magic/CMPParser';

export interface LoadedProject {
  name: string;
  audioFile: string;
  audioPath: string;
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
   * @param buffer Binary data from .cmp file
   * @param fileName Name of the file being loaded
   * @returns LoadedProject with parsed data
   */
  static loadFromBuffer(buffer: ArrayBuffer, fileName: string): LoadedProject | null {
    try {
      const uint8Array = new Uint8Array(buffer);
      const parser = new CMPParser(uint8Array);
      const rawData = parser.parse();

      const projectName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
      const audioPath = this.resolveAudioPath(rawData.audioFile);

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
        audioPath,
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
   * Resolve audio file path relative to project
   */
  private static resolveAudioPath(audioFile: string): string {
    // Handle Windows paths
    const normalized = audioFile.replace(/\\/g, '/');
    // Extract just the filename if it has a path
    const parts = normalized.split('/');
    return parts[parts.length - 1];
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
}

// VIM: set ft=typescript :
// END
