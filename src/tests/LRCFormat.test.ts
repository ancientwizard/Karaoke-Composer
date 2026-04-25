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

      expect(lrc).toContain('[version:2.2]')
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

      expect(lrc).toContain('<00:10.00~00:10.30>No<00:10.30~00:10.60>vem<00:10.60~00:11.00>ber')
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

      expect(lrc).toContain('<00:01.00~00:01.50>Hello <00:01.50~00:02.00>World')
    })

    it('should export v2.1 start-only timing when requested', () => {
      const project: KaraokeProject = {
        id: 'test-v21',
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

      const lrc = LRCWriter.toLRC(project, { timingMode: 'v2.1' })

      expect(lrc).toContain('[version:2.1]')
      expect(lrc).toContain('<00:01.00>Hello <00:01.50>World')
      expect(lrc).not.toContain('~')
    })

    it('should export untimed plain lyrics when none mode is requested', () => {
      const project: KaraokeProject = {
        id: 'test-none',
        name: 'Untimed',
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

      const lrc = LRCWriter.toLRC(project, { timingMode: 'none' })

      expect(lrc).toContain('[version:1.0]')
      expect(lrc).toContain('[syllable_timing:false]')
      expect(lrc).toContain('Hello World')
      expect(lrc).not.toContain('<')
      expect(lrc).not.toContain('[00:')
    })

    it('should export 3-digit millisecond precision when requested', () => {
      const project: KaraokeProject = {
        id: 'test-ms',
        name: 'MS Precision',
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
                startTime: 1234,
                endTime: 1789,
                syllables: []
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project, { timingMode: 'v2.2', precisionDigits: 3 })

      expect(lrc).toContain('[00:01.234]')
      expect(lrc).toContain('<00:01.234~00:01.789>Hello')
    })

    it('should align first and last syllable bounds with edited word timing', () => {
      const project: KaraokeProject = {
        id: 'test-syllable-word-bounds',
        name: 'Bounds',
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
                startTime: 1000,
                endTime: 2000,
                syllables: [
                  { syllable: 'No', startTime: 1100, endTime: 1300 },
                  { syllable: 'vem', startTime: 1300, endTime: 1500 },
                  { syllable: 'ber', startTime: 1500, endTime: 1600 }
                ]
              }
            ]
          }
        ],
        timings: [],
        isCompleted: false
      }

      const lrc = LRCWriter.toLRC(project, { timingMode: 'v2.2', precisionDigits: 3 })

      expect(lrc).toContain('<00:01.000~00:01.300>No<00:01.300~00:01.500>vem<00:01.500~00:02.000>ber')
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
      const lrcContent = '[00:01.00]<00:01.00~00:01.50>Hello <00:01.50~00:02.00>World'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].words).toHaveLength(2)
      expect(lines[0].words![0].text).toBe('Hello')
      expect(lines[0].words![0].timestamp).toBe(1000)
      expect(lines[0].words![0].endTimestamp).toBe(1500)
      expect(lines[0].words![1].text).toBe('World')
      expect(lines[0].words![1].timestamp).toBe(1500)
      expect(lines[0].words![1].endTimestamp).toBe(2000)
    })
  })

  describe('Syllable Timing Parsing', () => {
    it('should parse syllable-level timing', () => {
      const lrcContent = '[00:10.00]<00:10.00~00:10.30>No<00:10.30~00:10.60>vem<00:10.60~00:11.00>ber'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].words).toHaveLength(1)
      expect(lines[0].words![0].text).toBe('November')
      expect(lines[0].words![0].syllables).toHaveLength(3)
      expect(lines[0].words![0].syllables![0].text).toBe('No')
      expect(lines[0].words![0].syllables![0].timestamp).toBe(10000)
      expect(lines[0].words![0].syllables![0].endTimestamp).toBe(10300)
      expect(lines[0].words![0].syllables![1].text).toBe('vem')
      expect(lines[0].words![0].syllables![1].timestamp).toBe(10300)
      expect(lines[0].words![0].syllables![1].endTimestamp).toBe(10600)
      expect(lines[0].words![0].syllables![2].text).toBe('ber')
      expect(lines[0].words![0].syllables![2].timestamp).toBe(10600)
      expect(lines[0].words![0].syllables![2].endTimestamp).toBe(11000)
    })

    it('should parse 3-digit timing markers', () => {
      const lrcContent = '[00:01.234]<00:01.234~00:01.789>Hello'

      const { lines } = LRCParser.parse(lrcContent)

      expect(lines).toHaveLength(1)
      expect(lines[0].timestamp).toBe(1234)
      expect(lines[0].words).toHaveLength(1)
      expect(lines[0].words![0].timestamp).toBe(1234)
      expect(lines[0].words![0].endTimestamp).toBe(1789)
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

    it('should preserve exact timing from inline start-end markers', () => {
      const originalProject: KaraokeProject = {
        id: 'exact-timing-project',
        name: 'Exact Timing Test',
        artist: 'Timing Artist',
        genre: 'Pop',
        createdAt: new Date('2026-01-15T12:00:00.000Z'),
        updatedAt: new Date('2026-01-16T12:00:00.000Z'),
        audioFile: {
          name: 'timing.mp3',
          file: null,
          duration: 15000,
          sampleRate: 44100
        },
        lyrics: [
          {
            id: 'line-1',
            lineNumber: 1,
            text: 'No vem ber',
            type: 'lyrics',
            startTime: 1000,
            endTime: 2200,
            duration: 1200,
            words: [
              {
                word: 'November',
                startTime: 1000,
                endTime: 2200,
                duration: 1200,
                syllables: [
                  { syllable: 'No', startTime: 1000, endTime: 1400, duration: 400 },
                  { syllable: 'vem', startTime: 1450, endTime: 1800, duration: 350 },
                  { syllable: 'ber', startTime: 1900, endTime: 2200, duration: 300 }
                ]
              }
            ]
          }
        ],
        timings: [
          {
            lineId: 'line-1',
            wordIndex: 0,
            syllableIndex: 1,
            startTime: 1450,
            endTime: 1800,
            confidence: 0.95,
            type: 'syllable'
          }
        ],
        isCompleted: true,
        metadata: {
          bpm: 120,
          key: 'C'
        }
      }

      const lrcContent = LRCWriter.toLRC(originalProject)
      const importedProject = LRCParser.toKaraokeProject(lrcContent, 'imported-id')

      expect(importedProject.id).toBe('imported-id')
      expect(importedProject.name).toBe(originalProject.name)
      expect(importedProject.artist).toBe(originalProject.artist)
      expect(importedProject.lyrics[0].endTime).toBe(2200)
      expect(importedProject.lyrics[0].duration).toBe(1200)
      expect(importedProject.lyrics[0].words[0].endTime).toBe(2200)
      expect(importedProject.lyrics[0].words[0].duration).toBe(1200)
      expect(importedProject.lyrics[0].words[0].syllables[1].startTime).toBe(1450)
      expect(importedProject.lyrics[0].words[0].syllables[1].endTime).toBe(1800)
      expect(importedProject.lyrics[0].words[0].syllables[1].duration).toBe(350)
    })
  })
})
