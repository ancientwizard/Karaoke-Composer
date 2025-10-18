/**
 * Integration Test - Full Karaoke Presentation Pipeline
 *
 * Tests the complete flow: KaraokeProject → PresentationEngine → Commands
 */

import { KaraokePresentationEngine } from '../karaoke/presentation/KaraokePresentationEngine'
import type { KaraokeProject } from '../types/karaoke'

describe('Karaoke Presentation Integration', () => {
  // Create a simple test project
  const createTestProject = (): KaraokeProject => ({
    id: 'test-1',
    name: 'Test Song',
    artist: 'Test Artist',
    genre: 'Pop',
    createdAt: new Date(),
    updatedAt: new Date(),
    audioFile: {
      name: 'test.mp3',
      file: null,
      url: 'https://example.com/test.mp3', // Add URL so validation passes
      duration: 10 // 10 seconds
    },
    lyrics: [
      {
        id: 'line-1',
        lineNumber: 1,
        text: 'Hel/lo world',
        words: [
          {
            word: 'Hello',
            syllables: [
              {
                syllable: 'Hel',
                startTime: 1000,
                endTime: 1200
              },
              {
                syllable: 'lo',
                startTime: 1200,
                endTime: 1500
              }
            ],
            startTime: 1000,
            endTime: 1500
          },
          {
            word: 'world',
            syllables: [
              {
                syllable: 'world',
                startTime: 1600,
                endTime: 2000
              }
            ],
            startTime: 1600,
            endTime: 2000
          }
        ],
        startTime: 1000,
        endTime: 2000
      },
      {
        id: 'line-2',
        lineNumber: 2,
        text: 'Good/bye now',
        words: [
          {
            word: 'Goodbye',
            syllables: [
              {
                syllable: 'Good',
                startTime: 3000,
                endTime: 3300
              },
              {
                syllable: 'bye',
                startTime: 3300,
                endTime: 3600
              }
            ],
            startTime: 3000,
            endTime: 3600
          },
          {
            word: 'now',
            syllables: [
              {
                syllable: 'now',
                startTime: 3700,
                endTime: 4000
              }
            ],
            startTime: 3700,
            endTime: 4000
          }
        ],
        startTime: 3000,
        endTime: 4000
      }
    ],
    timings: [],
    isCompleted: true
  })

  describe('KaraokePresentationEngine', () => {
    let engine: KaraokePresentationEngine

    beforeEach(() => {
      engine = new KaraokePresentationEngine()
    })

    it('should validate a complete project', () => {
      const project = createTestProject()
      const validation = engine.validateProject(project)

      if (!validation.valid) {
        console.log('Validation errors:', validation.errors)
        console.log('Validation warnings:', validation.warnings)
      }

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing audio file', () => {
      const project = createTestProject()
      project.audioFile.file = null
      project.audioFile.url = undefined

      const validation = engine.validateProject(project)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('No audio file loaded')
    })

    it('should detect missing lyrics', () => {
      const project = createTestProject()
      project.lyrics = []

      const validation = engine.validateProject(project)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('No lyrics found')
    })

    it('should generate presentation script', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      expect(script).toBeDefined()
      expect(script.commands).toBeDefined()
      expect(script.commands.length).toBeGreaterThan(0)
      expect(script.durationMs).toBeGreaterThan(0)
      expect(script.metadata.title).toBe('Test Song')
      expect(script.metadata.artist).toBe('Test Artist')
    })

    it('should generate clear screen command at start', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      const clearCmd = script.commands.find(cmd => cmd.type === 'clear_screen')
      expect(clearCmd).toBeDefined()
      expect(clearCmd?.timestamp).toBe(0)
    })

    it('should generate metadata commands', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      // Metadata now uses two show_text commands (title and artist on separate lines)
      const titleCmd = script.commands.find(cmd =>
        cmd.type === 'show_text' &&
        'textId' in cmd &&
        cmd.textId === 'metadata-title'
      )
      const artistCmd = script.commands.find(cmd =>
        cmd.type === 'show_text' &&
        'textId' in cmd &&
        cmd.textId === 'metadata-artist'
      )

      expect(titleCmd).toBeDefined()
      expect(artistCmd).toBeDefined()

      if (titleCmd && 'text' in titleCmd) {
        expect(titleCmd.text).toBe('Test Song')
      }
      if (artistCmd && 'text' in artistCmd) {
        expect(artistCmd.text).toBe('by Test Artist')
      }
    })

    it('should generate show_text commands for each line', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      const showTextCmds = script.commands.filter(cmd => cmd.type === 'show_text')
      expect(showTextCmds.length).toBeGreaterThanOrEqual(2) // At least 2 lyric lines
    })

    it('should generate syllable highlighting commands', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      const colorChangeCmds = script.commands.filter(cmd => cmd.type === 'change_color')

      // Should have color changes for each syllable
      // Line 1: 3 syllables (Hel, lo, world)
      // Line 2: 3 syllables (Good, bye, now)
      expect(colorChangeCmds.length).toBeGreaterThanOrEqual(6)
    })

    it('should generate commands in chronological order', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      // Verify commands are sorted by timestamp
      for (let i = 1; i < script.commands.length; i++) {
        expect(script.commands[i].timestamp).toBeGreaterThanOrEqual(
          script.commands[i - 1].timestamp
        )
      }
    })

    it('should show text before syllables start (preview)', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      // Find first lyric show_text command (not metadata)
      const showTextCmds = script.commands.filter(cmd => cmd.type === 'show_text')
      const firstLyricCmd = showTextCmds[0]

      // First line starts at 1000ms
      // Preview should show 1000ms before (configurable, default 1000ms)
      // So show_text should be at 0ms or close to it
      expect(firstLyricCmd.timestamp).toBeLessThan(1000)
    })

    it('should clean up text after line ends', () => {
      const project = createTestProject()
      const script = engine.generateScript(project)

      const removeTextCmds = script.commands.filter(cmd => cmd.type === 'remove_text')

      // Should remove each lyric line (and metadata)
      expect(removeTextCmds.length).toBeGreaterThanOrEqual(2)
    })

    it('should calculate duration from audio file', () => {
      const project = createTestProject()
      project.audioFile.duration = 15.5 // seconds

      const script = engine.generateScript(project)

      expect(script.durationMs).toBe(15500) // Converted to ms
    })

    it('should handle project without audio duration', () => {
      const project = createTestProject()
      project.audioFile.duration = undefined

      const script = engine.generateScript(project)

      // Should calculate from last lyric line
      expect(script.durationMs).toBeGreaterThan(4000) // Last line ends at 4000ms
    })
  })

  describe('Full Pipeline', () => {
    it('should convert project to commands without errors', () => {
      const project = createTestProject()
      const engine = new KaraokePresentationEngine()

      expect(() => {
        const script = engine.generateScript(project)
        expect(script.commands.length).toBeGreaterThan(0)
      }).not.toThrow()
    })

    it('should handle multi-syllable words correctly', () => {
      const project = createTestProject()
      const engine = new KaraokePresentationEngine()
      const script = engine.generateScript(project)

      // Check that syllable highlighting respects character positions
      const colorChanges = script.commands.filter(cmd => cmd.type === 'change_color')

      colorChanges.forEach(cmd => {
        if ('startChar' in cmd && 'endChar' in cmd) {
          expect(cmd.endChar).toBeGreaterThan(cmd.startChar)
        }
      })
    })
  })
})
