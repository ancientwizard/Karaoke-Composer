// Jest provides describe, it, expect globally
import { RelativeSyllableTiming, type RelativeSyllable, type AbsoluteSyllable, type TimedWordData } from '../models/RelativeSyllableTiming'

describe('RelativeSyllableTiming', () => {
  const createTestWord = (): TimedWordData => ({
    id: 'test-word-1',
    text: 'November',
    startTime: 1000, // 1000ms = 1s
    endTime: 2000,   // 2000ms = 2s
    syllables: [
      {
        text: 'No', startOffset: 0, duration: 300
      },   // 300ms
      {
        text: 'vem', startOffset: 300, duration: 300
      }, // 300ms
      {
        text: 'ber', startOffset: 600, duration: 400
      }  // 400ms
    ]
  })

  describe('Construction and Validation', () => {
    it('should create a valid word with syllables', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const wordData = timing.getWordData()

      expect(wordData.text).toBe('November')
      expect(wordData.startTime).toBe(1.0)
      expect(wordData.endTime).toBe(2.0)
      expect(wordData.syllables).toHaveLength(3)
    })

    it('should validate syllable continuity', () => {
      const invalidWord: TimedWordData = {
        id: 'invalid',
        text: 'test',
        startTime: 0,
        endTime: 1,
        syllables: [
          {
            text: 'te', startOffset: 0.0, duration: 0.3
          },
          {
            text: 'st', startOffset: 0.5, duration: 0.5
          } // Gap at 0.3-0.5
        ]
      }

      expect(() => new RelativeSyllableTiming(invalidWord)).toThrow('has gap or overlap')
    })

    it('should validate word duration matches syllable total', () => {
      const invalidWord: TimedWordData = {
        id: 'invalid',
        text: 'test',
        startTime: 0,
        endTime: 1,
        syllables: [
          {
            text: 'te', startOffset: 0.0, duration: 0.3
          },
          {
            text: 'st', startOffset: 0.3, duration: 0.3
          } // Total 0.6, but word is 1.0
        ]
      }

      expect(() => new RelativeSyllableTiming(invalidWord)).toThrow("duration doesn't match")
    })

    it('should require at least one syllable', () => {
      const invalidWord: TimedWordData = {
        id: 'invalid',
        text: 'test',
        startTime: 0,
        endTime: 1,
        syllables: []
      }

      expect(() => new RelativeSyllableTiming(invalidWord)).toThrow('must have at least one syllable')
    })
  })

  describe('Absolute Position Conversion', () => {
    it('should convert relative syllables to absolute positions', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const absoluteSyllables = timing.getAbsoluteSyllables()

      expect(absoluteSyllables).toEqual([
        {
          text: 'No', startTime: 1.0, endTime: 1.3
        },
        {
          text: 'vem', startTime: 1.3, endTime: 1.6
        },
        {
          text: 'ber', startTime: 1.6, endTime: 2.0
        }
      ])
    })

    it('should handle single syllable word', () => {
      const singleSyllableWord: TimedWordData = {
        id: 'single',
        text: 'cat',
        startTime: 0.5,
        endTime: 1.0,
        syllables: [{
          text: 'cat', startOffset: 0.0, duration: 0.5
        }]
      }

      const timing = new RelativeSyllableTiming(singleSyllableWord)
      const absoluteSyllables = timing.getAbsoluteSyllables()

      expect(absoluteSyllables).toEqual([
        {
          text: 'cat', startTime: 0.5, endTime: 1.0
        }
      ])
    })
  })

  describe('Word Movement', () => {
    it('should move word and all syllables automatically', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const moved = timing.moveWord(2.5)

      const movedData = moved.getWordData()
      expect(movedData.startTime).toBe(2.5)
      expect(movedData.endTime).toBe(3.5) // Duration preserved

      // Syllables should have same relative positions
      expect(movedData.syllables).toEqual([
        {
          text: 'No', startOffset: 0.0, duration: 0.3
        },
        {
          text: 'vem', startOffset: 0.3, duration: 0.3
        },
        {
          text: 'ber', startOffset: 0.6, duration: 0.4
        }
      ])

      // But absolute positions should be shifted
      const absoluteSyllables = moved.getAbsoluteSyllables()
      expect(absoluteSyllables[0]).toEqual({
        text: 'No', startTime: 2.5, endTime: 2.8
      })
      expect(absoluteSyllables[1].text).toBe('vem')
      expect(absoluteSyllables[1].startTime).toBeCloseTo(2.8, 1)
      expect(absoluteSyllables[1].endTime).toBeCloseTo(3.1, 1)
      expect(absoluteSyllables[2]).toEqual({
        text: 'ber', startTime: 3.1, endTime: 3.5
      })
    })

    it('should preserve original object (immutability)', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const moved = timing.moveWord(2.5)

      // Original should be unchanged
      const originalData = timing.getWordData()
      expect(originalData.startTime).toBe(1.0)
      expect(originalData.endTime).toBe(2.0)

      // New object should have different times
      const movedData = moved.getWordData()
      expect(movedData.startTime).toBe(2.5)
      expect(movedData.endTime).toBe(3.5)
    })
  })

  describe('Word End Resizing', () => {
    it('should resize word end by adjusting only last syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordEnd(2.5) // 0.5s longer

      const resizedData = resized.getWordData()
      expect(resizedData.startTime).toBe(1.0) // Unchanged
      expect(resizedData.endTime).toBe(2.5)

      // First two syllables unchanged
      expect(resizedData.syllables[0]).toEqual({
        text: 'No', startOffset: 0.0, duration: 0.3
      })
      expect(resizedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 0.3, duration: 0.3
      })

      // Last syllable extended
      expect(resizedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 0.6, duration: 0.9
      })
    })

    it('should resize word end shorter by shrinking last syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordEnd(1.8) // 0.2s shorter

      const resizedData = resized.getWordData()
      expect(resizedData.endTime).toBe(1.8)

      // First two syllables unchanged
      expect(resizedData.syllables[0].duration).toBe(0.3)
      expect(resizedData.syllables[1].duration).toBe(0.3)

      // Last syllable shrunk
      expect(resizedData.syllables[2].duration).toBeCloseTo(0.2, 1)
    })

    it('should handle single syllable word resize', () => {
      const singleSyllableWord: TimedWordData = {
        id: 'single',
        text: 'cat',
        startTime: 0.5,
        endTime: 1.0,
        syllables: [{
          text: 'cat', startOffset: 0.0, duration: 0.5
        }]
      }

      const timing = new RelativeSyllableTiming(singleSyllableWord)
      const resized = timing.resizeWordEnd(1.5)

      const resizedData = resized.getWordData()
      expect(resizedData.syllables[0].duration).toBe(1.0)
    })

    it('should prevent making last syllable have zero duration', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      // Trying to resize to exactly where last syllable starts
      expect(() => timing.resizeWordEnd(1.61)).toThrow('zero or negative duration')
    })

    it('should prevent end time before start time', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      expect(() => timing.resizeWordEnd(0.5)).toThrow('must be after start time')
    })
  })

  describe('Word Start Resizing', () => {
    it('should resize word start by adjusting first syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordStart(0.8) // Start 0.2s earlier

      const resizedData = resized.getWordData()
      expect(resizedData.startTime).toBe(0.8)
      expect(resizedData.endTime).toBe(2.0) // Unchanged

      // First syllable should be longer and start at 0
      expect(resizedData.syllables[0]).toEqual({
        text: 'No', startOffset: 0.0, duration: 0.5
      })

      // Other syllables should shift their offsets
      expect(resizedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 0.5, duration: 0.3
      })
      expect(resizedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 0.8, duration: 0.4
      })
    })
  })

  describe('Move and Resize', () => {
    it('should move and resize word in one operation', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const result = timing.moveAndResize(0.5, 1.8)

      const resultData = result.getWordData()
      expect(resultData.startTime).toBe(0.5)
      expect(resultData.endTime).toBe(1.8)
      expect(resultData.syllables[2].duration).toBeCloseTo(0.7, 1) // Last syllable adjusted
    })

    it('should validate start < end time', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      expect(() => timing.moveAndResize(2.0, 1.5)).toThrow('must be before end time')
    })
  })

  describe('Syllable Boundary Adjustment', () => {
    it('should adjust boundary between syllables', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      // Move boundary between "No" and "vem" from 1.3 to 1.4
      const adjusted = timing.adjustSyllableBoundary(0, 1.4)

      const adjustedData = adjusted.getWordData()

      // First syllable should be longer
      expect(adjustedData.syllables[0].text).toBe('No')
      expect(adjustedData.syllables[0].startOffset).toBe(0.0)
      expect(adjustedData.syllables[0].duration).toBeCloseTo(0.4, 1)

      // Second syllable should start later and be shorter
      expect(adjustedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 0.4, duration: 0.2
      })

      // Third syllable unchanged
      expect(adjustedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 0.6, duration: 0.4
      })
    })

    it('should prevent adjusting invalid syllable boundaries', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      // Can't adjust boundary of last syllable
      expect(() => timing.adjustSyllableBoundary(2, 1.5)).toThrow('Can only adjust boundaries between syllables')

      // Can't adjust negative index
      expect(() => timing.adjustSyllableBoundary(-1, 1.5)).toThrow('Can only adjust boundaries between syllables')
    })

    it('should prevent moving boundary outside valid range', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      // Can't move boundary before first syllable starts
      expect(() => timing.adjustSyllableBoundary(0, 0.9)).toThrow('outside valid range')

      // Can't move boundary after second syllable ends
      expect(() => timing.adjustSyllableBoundary(0, 1.7)).toThrow('outside valid range')
    })
  })

  describe('Factory Methods', () => {
    it('should create from absolute syllable data', () => {
      const absoluteSyllables: AbsoluteSyllable[] = [
        {
          text: 'hel', startTime: 2.0, endTime: 2.3
        },
        {
          text: 'lo', startTime: 2.3, endTime: 2.6
        }
      ]

      const timing = RelativeSyllableTiming.fromAbsoluteSyllables('hello-1', 'hello', 2.0, 2.6, absoluteSyllables)
      const wordData = timing.getWordData()

      expect(wordData.syllables[0].text).toBe('hel')
      expect(wordData.syllables[0].startOffset).toBeCloseTo(0.0, 1)
      expect(wordData.syllables[0].duration).toBeCloseTo(0.3, 1)
      expect(wordData.syllables[1].text).toBe('lo')
      expect(wordData.syllables[1].startOffset).toBeCloseTo(0.3, 1)
      expect(wordData.syllables[1].duration).toBeCloseTo(0.3, 1)
    })

    it('should create even syllable distribution', () => {
      const timing = RelativeSyllableTiming.createEvenSyllables('test-1', 'testing', 1.0, 2.0, ['test', 'ing'])
      const wordData = timing.getWordData()

      expect(wordData.syllables).toEqual([
        {
          text: 'test', startOffset: 0.0, duration: 0.5
        },
        {
          text: 'ing', startOffset: 0.5, duration: 0.5
        }
      ])
    })

    it('should create weighted syllable distribution', () => {
      const timing = RelativeSyllableTiming.createWeightedSyllables('test-1', 'testing', 1.0, 2.0, ['test', 'ing'], 1.5)
      const wordData = timing.getWordData()

      // Total weight: 1.0 + 1.5 = 2.5
      // First syllable: (1.0/2.5) * 1.0 = 0.4
      // Second syllable: (1.5/2.5) * 1.0 = 0.6
      expect(wordData.syllables[0].duration).toBeCloseTo(0.4, 2)
      expect(wordData.syllables[1].duration).toBeCloseTo(0.6, 2)
      expect(wordData.syllables[1].startOffset).toBeCloseTo(0.4, 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very short durations', () => {
      const shortWord: TimedWordData = {
        id: 'short',
        text: 'hi',
        startTime: 0,
        endTime: 0.1,
        syllables: [
          {
            text: 'hi', startOffset: 0, duration: 0.1
          }
        ]
      }

      const timing = new RelativeSyllableTiming(shortWord)
      const moved = timing.moveWord(5.0)

      expect(moved.getWordData().startTime).toBe(5.0)
      expect(moved.getWordData().endTime).toBe(5.1)
    })

    it('should handle precision issues with floating point', () => {
      const word: TimedWordData = {
        id: 'precision',
        text: 'test',
        startTime: 0.1,
        endTime: 0.4,
        syllables: [
          {
            text: 'te', startOffset: 0, duration: 0.15
          },
          {
            text: 'st', startOffset: 0.15, duration: 0.15
          }
        ]
      }

      // Should not throw despite potential floating point precision issues
      expect(() => new RelativeSyllableTiming(word)).not.toThrow()
    })
  })
})
