import { distributeSyllablesMusically, detectRestPattern, beatLearner } from '../models/MusicalTimingModel'
import { parseLyricsLine } from '../utils/lyricsParser'

describe('Musical Timing Model', () => {

  test('should detect rest patterns from punctuation', () => {
    // Test comma detection
    const restPattern1 = detectRestPattern('Happy,', 'Birthday', 1000)
    expect(restPattern1.hasRest).toBe(true)
    expect(restPattern1.restType).toBeDefined()
    expect(restPattern1.estimatedRestDuration).toBeGreaterThan(0)

    // Test period detection
    const restPattern2 = detectRestPattern('you.', 'Happy', 1500)
    expect(restPattern2.hasRest).toBe(true)
    expect(restPattern2.restType).toBeDefined()
    expect(restPattern2.estimatedRestDuration).toBeGreaterThanOrEqual(restPattern1.estimatedRestDuration)
  })

  test('should distribute syllables musically with rest reservation', () => {
    const line1 = parseLyricsLine('Hap/py, Birth/day', 0, 'test-1')
    const happyWord = line1.words[0]

    distributeSyllablesMusically(happyWord, 0, 1000, 'Birthday', {}, true)

    expect(happyWord.syllables[0].startTime).toBeDefined()
    expect(happyWord.syllables[0].endTime).toBeDefined()
    expect(happyWord.duration).toBeLessThan(1000) // Should reserve space for rest

    // Syllables should have proper timing
    happyWord.syllables.forEach(syl => {
      expect(syl.startTime).toBeGreaterThanOrEqual(0)
      expect(syl.endTime).toBeGreaterThan(syl.startTime!)
      expect(syl.duration).toBeGreaterThan(0)
    })
  })

  test('should learn timing patterns from examples', () => {
    // Clear any previous learning
    beatLearner.addTimingExample(500, 2) // "Happy" took 500ms, 2 syllables
    beatLearner.addTimingExample(800, 3) // "Birthday" took 800ms, 3 syllables
    beatLearner.addTimingExample(400, 1) // "to" took 400ms, 1 syllable

    const context = beatLearner.getTimingContext()
    expect(context.bpm).toBeDefined()
    expect(context.estimatedBeatDuration).toBeDefined()
    expect(context.bpm).toBeGreaterThan(0)
    expect(context.estimatedBeatDuration).toBeGreaterThan(0)
  })

  test('should export all required functions', () => {
    expect(typeof distributeSyllablesMusically).toBe('function')
    expect(typeof detectRestPattern).toBe('function')
    expect(typeof beatLearner).toBe('object')
  })
})
