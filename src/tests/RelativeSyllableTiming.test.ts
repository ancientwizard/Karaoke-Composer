// Jest provides describe, it, expect globally
import { RelativeSyllableTiming, type AbsoluteSyllable, type TimedWordData } from '../models/RelativeSyllableTiming'

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
      expect(wordData.startTime).toBe(1000)
      expect(wordData.endTime).toBe(2000)
      expect(wordData.syllables).toHaveLength(3)
    })

    it('should validate syllable continuity', () => {
      const invalidWord: TimedWordData = {
        id: 'invalid',
        text: 'test',
        startTime: 0,
        endTime: 1000,
        syllables: [
          {
            text: 'te', startOffset: 0, duration: 300
          },
          {
            text: 'st', startOffset: 500, duration: 500
          } // Gap at 300-500
        ]
      }

      expect(() => new RelativeSyllableTiming(invalidWord)).toThrow('has gap or overlap')
    })

    it('should validate word duration matches syllable total', () => {
      const invalidWord: TimedWordData = {
        id: 'invalid',
        text: 'test',
        startTime: 0,
        endTime: 1000,
        syllables: [
          {
            text: 'te', startOffset: 0, duration: 300
          },
          {
            text: 'st', startOffset: 300, duration: 300
          } // Total 600, but word is 1000
        ]
      }

      expect(() => new RelativeSyllableTiming(invalidWord)).toThrow("doesn't match")
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
          text: 'No', startTime: 1000, endTime: 1300
        },
        {
          text: 'vem', startTime: 1300, endTime: 1600
        },
        {
          text: 'ber', startTime: 1600, endTime: 2000
        }
      ])
    })

    it('should handle single syllable word', () => {
      const singleSyllableWord: TimedWordData = {
        id: 'single',
        text: 'cat',
        startTime: 500,
        endTime: 1000,
        syllables: [{
          text: 'cat', startOffset: 0, duration: 500
        }]
      }

      const timing = new RelativeSyllableTiming(singleSyllableWord)
      const absoluteSyllables = timing.getAbsoluteSyllables()

      expect(absoluteSyllables).toEqual([
        {
          text: 'cat', startTime: 500, endTime: 1000
        }
      ])
    })
  })

  describe('Word Movement', () => {
    it('should move word and all syllables automatically', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const moved = timing.moveWord(2500) // 2.5s = 2500ms

      const movedData = moved.getWordData()
      expect(movedData.startTime).toBe(2500)
      expect(movedData.endTime).toBe(3500) // Duration preserved

      // Syllables should have same relative positions
      expect(movedData.syllables).toEqual([
        {
          text: 'No', startOffset: 0, duration: 300
        },
        {
          text: 'vem', startOffset: 300, duration: 300
        },
        {
          text: 'ber', startOffset: 600, duration: 400
        }
      ])

      // But absolute positions should be shifted
      const absoluteSyllables = moved.getAbsoluteSyllables()
      expect(absoluteSyllables[0]).toEqual({
        text: 'No', startTime: 2500, endTime: 2800
      })
      expect(absoluteSyllables[1].text).toBe('vem')
      expect(absoluteSyllables[1].startTime).toBeCloseTo(2800, 0)
      expect(absoluteSyllables[1].endTime).toBeCloseTo(3100, 0)
      expect(absoluteSyllables[2]).toEqual({
        text: 'ber', startTime: 3100, endTime: 3500
      })
    })

    it('should preserve original object (immutability)', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const moved = timing.moveWord(2500) // 2.5s = 2500ms

      // Original should be unchanged
      const originalData = timing.getWordData()
      expect(originalData.startTime).toBe(1000)
      expect(originalData.endTime).toBe(2000)

      // New object should have different times
      const movedData = moved.getWordData()
      expect(movedData.startTime).toBe(2500)
      expect(movedData.endTime).toBe(3500)
    })
  })

  describe('Word End Resizing', () => {
    it('should resize word end by adjusting only last syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordEnd(2500) // 500ms longer

      const resizedData = resized.getWordData()
      expect(resizedData.startTime).toBe(1000) // Unchanged
      expect(resizedData.endTime).toBe(2500)

      // First two syllables unchanged
      expect(resizedData.syllables[0]).toEqual({
        text: 'No', startOffset: 0, duration: 300
      })
      expect(resizedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 300, duration: 300
      })

      // Last syllable extended
      expect(resizedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 600, duration: 900
      })
    })

    it('should resize word end shorter by shrinking last syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordEnd(1800) // 200ms shorter

      const resizedData = resized.getWordData()
      expect(resizedData.endTime).toBe(1800)

      // First two syllables unchanged
      expect(resizedData.syllables[0].duration).toBe(300)
      expect(resizedData.syllables[1].duration).toBe(300)

      // Last syllable shrunk
      expect(resizedData.syllables[2].duration).toBeCloseTo(200, 0)
    })

    it('should handle single syllable word resize', () => {
      const singleSyllableWord: TimedWordData = {
        id: 'single',
        text: 'cat',
        startTime: 500,
        endTime: 1000,
        syllables: [{
          text: 'cat', startOffset: 0, duration: 500
        }]
      }

      const timing = new RelativeSyllableTiming(singleSyllableWord)
      const resized = timing.resizeWordEnd(1500)

      const resizedData = resized.getWordData()
      expect(resizedData.syllables[0].duration).toBe(1000)
    })

    it('should prevent making last syllable have zero duration', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      // Trying to resize to exactly where last syllable starts (1000ms + 600ms = 1600ms)
      expect(() => timing.resizeWordEnd(1600)).toThrow('zero or negative duration')
    })

    it('should prevent end time before start time', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      expect(() => timing.resizeWordEnd(500)).toThrow('must be after start time')
    })
  })

  describe('Word Start Resizing', () => {
    it('should resize word start by adjusting first syllable', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const resized = timing.resizeWordStart(800) // Start 200ms earlier

      const resizedData = resized.getWordData()
      expect(resizedData.startTime).toBe(800)
      expect(resizedData.endTime).toBe(2000) // Unchanged

      // First syllable should be longer and start at 0
      expect(resizedData.syllables[0]).toEqual({
        text: 'No', startOffset: 0, duration: 500
      })

      // Other syllables should shift their offsets
      expect(resizedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 500, duration: 300
      })
      expect(resizedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 800, duration: 400
      })
    })
  })

  describe('Move and Resize', () => {
    it('should move and resize word in one operation', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      const result = timing.moveAndResize(500, 1800)

      const resultData = result.getWordData()
      expect(resultData.startTime).toBe(500)
      expect(resultData.endTime).toBe(1800)
      expect(resultData.syllables[2].duration).toBeCloseTo(700, 0) // Last syllable adjusted
    })

    it('should validate start < end time', () => {
      const timing = new RelativeSyllableTiming(createTestWord())

      expect(() => timing.moveAndResize(2000, 1500)).toThrow('must be before end time')
    })
  })

  describe('Syllable Boundary Adjustment', () => {
    it('should adjust boundary between syllables', () => {
      const timing = new RelativeSyllableTiming(createTestWord())
      // Move boundary between "No" and "vem" from 1300ms to 1400ms
      const adjusted = timing.adjustSyllableBoundary(0, 1400)

      const adjustedData = adjusted.getWordData()

      // First syllable should be longer
      expect(adjustedData.syllables[0].text).toBe('No')
      expect(adjustedData.syllables[0].startOffset).toBe(0)
      expect(adjustedData.syllables[0].duration).toBeCloseTo(400, 0)

      // Second syllable should start later and be shorter
      expect(adjustedData.syllables[1]).toEqual({
        text: 'vem', startOffset: 400, duration: 200
      })

      // Third syllable unchanged
      expect(adjustedData.syllables[2]).toEqual({
        text: 'ber', startOffset: 600, duration: 400
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
          text: 'hel', startTime: 2000, endTime: 2300
        },
        {
          text: 'lo', startTime: 2300, endTime: 2600
        }
      ]

      const timing = RelativeSyllableTiming.fromAbsoluteSyllables('hello-1', 'hello', 2000, 2600, absoluteSyllables)
      const wordData = timing.getWordData()

      expect(wordData.syllables[0].text).toBe('hel')
      expect(wordData.syllables[0].startOffset).toBeCloseTo(0, 0)
      expect(wordData.syllables[0].duration).toBeCloseTo(300, 0)
      expect(wordData.syllables[1].text).toBe('lo')
      expect(wordData.syllables[1].startOffset).toBeCloseTo(300, 0)
      expect(wordData.syllables[1].duration).toBeCloseTo(300, 0)
    })

    it('should create even syllable distribution', () => {
      const timing = RelativeSyllableTiming.createEvenSyllables('test-1', 'testing', 1000, 2000, ['test', 'ing'])
      const wordData = timing.getWordData()

      expect(wordData.syllables).toEqual([
        {
          text: 'test', startOffset: 0, duration: 500
        },
        {
          text: 'ing', startOffset: 500, duration: 500
        }
      ])
    })

    it('should create weighted syllable distribution', () => {
      const timing = RelativeSyllableTiming.createWeightedSyllables('test-1', 'testing', 1000, 2000, ['test', 'ing'], 1.5)
      const wordData = timing.getWordData()

      // Total weight: 1.0 + 1.5 = 2.5
      // Total duration: 1000ms
      // First syllable: (1.0/2.5) * 1000 = 400ms
      // Second syllable: (1.5/2.5) * 1000 = 600ms
      expect(wordData.syllables[0].duration).toBeCloseTo(400, 0)
      expect(wordData.syllables[1].duration).toBeCloseTo(600, 0)
      expect(wordData.syllables[1].startOffset).toBeCloseTo(400, 0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very short durations', () => {
      const shortWord: TimedWordData = {
        id: 'short',
        text: 'hi',
        startTime: 0,
        endTime: 100,
        syllables: [
          {
            text: 'hi', startOffset: 0, duration: 100
          }
        ]
      }

      const timing = new RelativeSyllableTiming(shortWord)
      const moved = timing.moveWord(5000)

      expect(moved.getWordData().startTime).toBe(5000)
      expect(moved.getWordData().endTime).toBe(5100)
    })

    it('should handle precision issues with floating point', () => {
      const word: TimedWordData = {
        id: 'precision',
        text: 'test',
        startTime: 100,
        endTime: 400,
        syllables: [
          {
            text: 'te', startOffset: 0, duration: 150
          },
          {
            text: 'st', startOffset: 150, duration: 150
          }
        ]
      }

      // Should not throw despite potential floating point precision issues
      expect(() => new RelativeSyllableTiming(word)).not.toThrow()
    })
  })
})
