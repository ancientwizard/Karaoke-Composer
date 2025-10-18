/**
 * Project Export Service
 *
 * Exports KaraokeProject as JSON file with all timing data
 * for use with terminal renderer and other tools.
 */

import type { KaraokeProject } from '../types/karaoke'

/**
 * Export project as JSON file download
 */
export function exportProjectAsJSON(project: KaraokeProject): void {
  // Create clean export data
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      artist: project.artist,
      genre: project.genre,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      audioFile: {
        name: project.audioFile.name,
        duration: project.audioFile.duration,
        // Note: Don't export actual file blob, just metadata
      },
      lyrics: project.lyrics,
      timings: project.timings,
      isCompleted: project.isCompleted,
      metadata: project.metadata
    }
  }

  // Convert to JSON with nice formatting
  const json = JSON.stringify(exportData, null, 2)

  // Create blob
  const blob = new Blob([json], { type: 'application/json' })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // Generate filename from project name
  const filename = `${sanitizeFilename(project.name)}_karaoke_project.json`
  link.download = filename

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup
  URL.revokeObjectURL(url)
}

/**
 * Export project for terminal renderer demo
 * (TypeScript format for direct import)
 */
export function exportProjectForTerminal(project: KaraokeProject): void {
  // Create TypeScript code
  const tsCode = `/**
 * Exported Karaoke Project: ${project.name}
 * Exported: ${new Date().toISOString()}
 *
 * Import this in terminal demo to test with real timing data!
 */

import type { KaraokeProject } from '../../types/karaoke'

export const ${sanitizeVariableName(project.name)}: KaraokeProject = ${JSON.stringify(
    {
      id: project.id,
      name: project.name,
      artist: project.artist,
      genre: project.genre,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      audioFile: {
        name: project.audioFile.name,
        file: null,
        url: 'exported://audio',
        duration: project.audioFile.duration
      },
      lyrics: project.lyrics,
      timings: project.timings,
      isCompleted: project.isCompleted,
      metadata: project.metadata
    },
    null,
    2
  )}
`

  // Download as .ts file
  const blob = new Blob([tsCode], { type: 'text/typescript' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilename(project.name)}_export.ts`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Import project from JSON file
 */
export async function importProjectFromJSON(file: File): Promise<KaraokeProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const data = JSON.parse(json)

        // Validate version
        if (!data.version || !data.project) {
          throw new Error('Invalid project file format')
        }

        // Reconstruct project with proper Date objects
        const project: KaraokeProject = {
          ...data.project,
          createdAt: new Date(data.project.createdAt),
          updatedAt: new Date(data.project.updatedAt),
          audioFile: {
            ...data.project.audioFile,
            file: null, // File blob not stored in JSON
            url: undefined // Will need to re-load audio
          }
        }

        resolve(project)
      } catch (error) {
        reject(new Error(`Failed to parse project file: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Sanitize for use as TypeScript variable name
 */
function sanitizeVariableName(name: string): string {
  const clean = name
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  // Ensure starts with letter
  return /^[a-zA-Z]/.test(clean) ? clean : `project_${clean}`
}

/**
 * Generate summary stats for export
 */
export function getProjectStats(project: KaraokeProject): {
  totalLines: number
  totalWords: number
  totalSyllables: number
  timedLines: number
  timedWords: number
  timedSyllables: number
  duration: number
  completionPercentage: number
} {
  let totalWords = 0
  let totalSyllables = 0
  let timedWords = 0
  let timedSyllables = 0

  const timedLines = project.lyrics.filter(line => line.startTime !== undefined).length

  for (const line of project.lyrics) {
    for (const word of line.words) {
      totalWords++
      if (word.startTime !== undefined) {
        timedWords++
      }

      for (const syllable of word.syllables) {
        totalSyllables++
        if (syllable.startTime !== undefined) {
          timedSyllables++
        }
      }
    }
  }

  const duration = project.audioFile.duration || 0
  const completionPercentage = totalSyllables > 0
    ? Math.round((timedSyllables / totalSyllables) * 100)
    : 0

  return {
    totalLines: project.lyrics.length,
    totalWords,
    totalSyllables,
    timedLines,
    timedWords,
    timedSyllables,
    duration,
    completionPercentage
  }
}
