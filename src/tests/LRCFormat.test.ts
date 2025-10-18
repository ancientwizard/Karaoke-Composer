/**
 * Tests for LRC Format (Writer and Parser)
 */

import { LRCWriter, LRCParser } from '../formats/LRCFormat'
import type { KaraokeProject } from '@/types/karaoke'

describe('LRCWriter', () => {
  describe('Basic LRC Generation', () => {
    it('should generate valid LRC header', () => {
      const project: KaraokeProject = {
        id: '1',
        name: 'Test Song',
        artist: 'Test Author',
        genre: 'Pop',
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFile: {
          name: 'test.mp3',
          file: null,
          duration: 120000
        },
        lyrics: [],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project)

      expect(lrc).toContain('[version:2.1]')
      expect(lrc).toContain('[syllable_timing:true]')
      expect(lrc).toContain('[ti:Test Song]')
      expect(lrc).toContain('[au:Test Author]') // Author, not artist
      expect(lrc).toContain('[creator:Karaoke Composer]')
    })

    it('should format timestamps correctly', () => {
      const project: KaraokeProject = {
        id: 'test-2',
        name: 'Test',
        artist: 'Test Author',
        genre: 'Pop',
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFile: {
          name: 'test.mp3',
          file: null,
          duration: 120000
        },
        lyrics: [
          {
            id: 'line-1',
            lineNumber: 1,
            text: 'Hello',
            words: [
              {
                word: 'Hello',
                startTime: 1500, // 1.5 seconds = 00:01.50
                endTime: 2000,
                syllables: []
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project)

      expect(lrc).toContain('[00:01.50]')
    })

    it('should handle syllable timing', () => {
      const project: KaraokeProject = {
        id: 'test-3',
        name: 'Test',
        artist: 'Test Author',
        genre: 'Pop',
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFile: {
          name: 'test.mp3',
          file: null,
          duration: 120000
        },
        lyrics: [
          {
            id: 'line-1',
            lineNumber: 1,
            text: 'November',
            words: [
              {
                word: 'November',
                startTime: 10000,
                endTime: 11000,
                syllables: [
                  {
                    syllable: 'No', startTime: 10000, endTime: 10300
                  },
                  {
                    syllable: 'vem', startTime: 10300, endTime: 10600
                  },
                  {
                    syllable: 'ber', startTime: 10600, endTime: 11000
                  }
                ]
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project)

      expect(lrc).toContain('<00:10.00>No<00:10.30>vem<00:10.60>ber')
    })
  })

  describe('Multiple Words', () => {
    it('should handle multiple words with spaces', () => {
      const project: KaraokeProject = {
        id: 'test-4',
        name: 'Test',
        artist: 'Test Author',
        genre: 'Pop',
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFile: {
          name: 'test.mp3',
          file: null,
          duration: 120000
        },
        lyrics: [
          {
            id: 'line-1',
            lineNumber: 1,
            text: 'Hello World',
            words: [
              {
                word: 'Hello',
                startTime: 1000,
                endTime: 1500,
                syllables: []
              },
              {
                word: 'World',
                startTime: 1500,
                endTime: 2000,
                syllables: []
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project)

      expect(lrc).toContain('<00:01.00>Hello <00:01.50>World')
    })
  })
})

describe('LRCParser', () => {
  describe('Metadata Parsing', () => {
    it('should parse standard metadata', () => {
      const lrcContent = `[ti:Test Song]
[au:Test Author]
[version:2.1]
[syllable_timing:true]
[duration:00:03.50]`

      const { metadata } = LRCParser.parse(lrcContent)

      expect(metadata.title).toBe('Test Song')
      expect(metadata.author).toBe('Test Author')
      expect(metadata.version).toBe('2.1')
      expect(metadata.syllableTiming).toBe(true)
      expect(metadata.duration).toBe(3500)
    })

    it('should accept [ar:] tag for backward compatibility', () => {
      const lrcContent = `[ti:Test Song]
[ar:Test Artist as Author]`

      const { metadata } = LRCParser.parse(lrcContent)

      expect(metadata.title).toBe('Test Song')
      expect(metadata.author).toBe('Test Artist as Author')
    })
  })

  describe('Simple Line Parsing', () => {
    it('should parse simple timed line', () => {
      const lrcContent = '[00:10.50]Hello World'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].timestamp).toBe(10500)
      expect(lines[0].text).toBe('Hello World')
    })
  })

  describe('Word Timing Parsing', () => {
    it('should parse word-level timing', () => {
      const lrcContent = '[00:01.00]<00:01.00>Hello <00:01.50>World'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].words).toHaveLength(2)
      expect(lines[0].words![0].text).toBe('Hello')
      expect(lines[0].words![0].timestamp).toBe(1000)
      expect(lines[0].words![1].text).toBe('World')
      expect(lines[0].words![1].timestamp).toBe(1500)
    })
  })

  describe('Syllable Timing Parsing', () => {
    it('should parse syllable-level timing', () => {
      const lrcContent = '[00:10.00]<00:10.00>No<00:10.30>vem<00:10.60>ber'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].words).toHaveLength(1)
      expect(lines[0].words![0].text).toBe('November')
      expect(lines[0].words![0].syllables).toHaveLength(3)
      expect(lines[0].words![0].syllables![0].text).toBe('No')
      expect(lines[0].words![0].syllables![0].timestamp).toBe(10000)
      expect(lines[0].words![0].syllables![1].text).toBe('vem')
      expect(lines[0].words![0].syllables![1].timestamp).toBe(10300)
      expect(lines[0].words![0].syllables![2].text).toBe('ber')
      expect(lines[0].words![0].syllables![2].timestamp).toBe(10600)
    })
  })

  describe('Round-trip Conversion', () => {
    it('should preserve data through write-parse cycle', () => {
      const originalProject: KaraokeProject = {
        id: 'test-round-trip',
        name: 'Round Trip Test',
        artist: 'Test Artist',
        genre: 'Pop',
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFile: {
          name: 'test.mp3',
          file: null,
          duration: 120000
        },
        lyrics: [
          {
            id: 'line-1',
            lineNumber: 1,
            text: 'Meet me in November',
            words: [
              {
                word: 'Meet',
                startTime: 9000,
                endTime: 9500,
                syllables: [
                  {
                    syllable: 'Meet', startTime: 9000, endTime: 9500
                  }
                ]
              },
              {
                word: 'me',
                startTime: 9500,
                endTime: 9700,
                syllables: [
                  {
                    syllable: 'me', startTime: 9500, endTime: 9700
                  }
                ]
              },
              {
                word: 'in',
                startTime: 9700,
                endTime: 9900,
                syllables: [
                  {
                    syllable: 'in', startTime: 9700, endTime: 9900
                  }
                ]
              },
              {
                word: 'November',
                startTime: 10000,
                endTime: 11000,
                syllables: [
                  {
                    syllable: 'No', startTime: 10000, endTime: 10300
                  },
                  {
                    syllable: 'vem', startTime: 10300, endTime: 10600
                  },
                  {
                    syllable: 'ber', startTime: 10600, endTime: 11000
                  }
                ]
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      // Write to LRC
      const lrcContent = LRCWriter.toLRC(originalProject)

      // Parse back
      const { metadata, lines } = LRCParser.parse(lrcContent)

      // Verify metadata
      expect(metadata.title).toBe('Round Trip Test')
      expect(metadata.author).toBe('Test Artist')
      expect(metadata.syllableTiming).toBe(true)

      // Verify lines
      expect(lines).toHaveLength(1)
      expect(lines[0].words).toHaveLength(4)

      // Verify November syllables
      const novemberWord = lines[0].words![3]
      expect(novemberWord.text).toBe('November')
      expect(novemberWord.syllables).toHaveLength(3)
      expect(novemberWord.syllables![0].text).toBe('No')
      expect(novemberWord.syllables![0].timestamp).toBe(10000)
    })
  })
})
