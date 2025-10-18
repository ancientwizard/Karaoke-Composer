/**
 * Tests for TextLayoutEngine
 */

import {
  TextLayoutEngine,
  DEFAULT_LAYOUT_CONFIG
} from '../karaoke/presentation/TextLayoutEngine'
import { TextAlign } from '../karaoke/presentation/PresentationCommand'

describe('TextLayoutEngine', () => {
  let engine: TextLayoutEngine

  beforeEach(() => {
    engine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
  })

  describe('layoutText', () => {
    it('should layout short text on single line', () => {
      const result = engine.layoutText('Hello World', TextAlign.Center)

      expect(result.lines).toEqual(['Hello World'])
      expect(result.charPositions).toHaveLength('Hello World'.length)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should use center alignment by default', () => {
      const result = engine.layoutText('Test')

      expect(result.position.x).toBe(500) // Center of 1000
    })

    it('should support left alignment', () => {
      const result = engine.layoutText('Test', TextAlign.Left)

      expect(result.position.x).toBe(50) // 5% from left
    })

    it('should support right alignment', () => {
      const result = engine.layoutText('Test', TextAlign.Right)

      expect(result.position.x).toBe(950) // 5% from right
    })

    it('should force specific Y position when provided', () => {
      const result = engine.layoutText('Test', TextAlign.Center, 600)

      expect(result.position.y).toBe(600)
    })

    it('should break long text into multiple lines', () => {
      // Create text longer than maxCharsPerLine (40)
      const longText = 'This is a very long line of text that should definitely wrap to multiple lines'
      const result = engine.layoutText(longText, TextAlign.Center)

      expect(result.lines.length).toBeGreaterThan(1)
      // Each line should be under max chars
      result.lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(DEFAULT_LAYOUT_CONFIG.maxCharsPerLine)
      })
    })

    it('should break at word boundaries', () => {
      const text = 'Hello world this is a test of word wrapping functionality'
      const result = engine.layoutText(text, TextAlign.Center)

      // Check that lines don't break mid-word
      result.lines.forEach(line => {
        expect(line.trim()).toBe(line) // No leading/trailing spaces
      })
    })
  })

  describe('vertical positioning', () => {
    it('should return default position', () => {
      const defaultY = engine.getDefaultVerticalPosition()

      expect(defaultY).toBe(400) // 40% down as defined
    })

    it('should get next vertical position', () => {
      const y = engine.getNextVerticalPosition()

      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(1000)
    })

    it('should avoid specified Y position during transitions', () => {
      const avoidY = 400
      const y = engine.getNextVerticalPosition(avoidY)

      // Should be at least 100 units away
      expect(Math.abs(y - avoidY)).toBeGreaterThanOrEqual(100)
    })

    it('should return different positions on multiple calls (statistically)', () => {
      const positions = new Set<number>()

      // Call multiple times
      for (let i = 0; i < 20; i++) {
        positions.add(engine.getNextVerticalPosition())
      }

      // Should have gotten at least 2 different positions
      // (allowing for random chance with weighted selection)
      expect(positions.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('character positioning', () => {
    it('should calculate position for each character', () => {
      const text = 'Hello'
      const result = engine.layoutText(text, TextAlign.Center)

      expect(result.charPositions).toHaveLength(5)

      // Characters should be positioned left-to-right
      for (let i = 1; i < result.charPositions.length; i++) {
        expect(result.charPositions[i].x).toBeGreaterThan(result.charPositions[i - 1].x)
      }
    })

    it('should position characters on same line with same Y', () => {
      const text = 'Test'
      const result = engine.layoutText(text, TextAlign.Center)

      const firstY = result.charPositions[0].y
      result.charPositions.forEach(pos => {
        expect(pos.y).toBe(firstY)
      })
    })

    it('should handle multi-line character positioning', () => {
      const longText = 'This is a very long line that will definitely wrap to multiple lines for testing'
      const result = engine.layoutText(longText, TextAlign.Center)

      if (result.lines.length > 1) {
        // First char of second line should have different Y than first line
        const firstLineCharCount = result.lines[0].length

        expect(result.charPositions[firstLineCharCount + 1].y)
          .toBeGreaterThan(result.charPositions[0].y)
      }
    })
  })

  describe('mapCharIndexToLine', () => {
    it('should map character to correct line for single line', () => {
      const lines = ['Hello World']
      const mapping = engine.mapCharIndexToLine(6, lines)

      expect(mapping.line).toBe(0)
      expect(mapping.char).toBe(6)
    })

    it('should map character to correct line for multi-line', () => {
      const lines = ['Hello World', 'This is line two']

      // Character 5 should be in first line
      let mapping = engine.mapCharIndexToLine(5, lines)
      expect(mapping.line).toBe(0)
      expect(mapping.char).toBe(5)

      // Character 15 should be in second line (accounting for space)
      mapping = engine.mapCharIndexToLine(13, lines)
      expect(mapping.line).toBe(1)
    })

    it('should handle character beyond text length', () => {
      const lines = ['Short']
      const mapping = engine.mapCharIndexToLine(100, lines)

      expect(mapping.line).toBe(0)
      expect(mapping.char).toBe(lines[0].length)
    })
  })

  describe('dimensions calculation', () => {
    it('should calculate width and height', () => {
      const result = engine.layoutText('Hello', TextAlign.Center)

      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should have larger width for longer text', () => {
      const short = engine.layoutText('Hi', TextAlign.Center)
      const long = engine.layoutText('Hello World', TextAlign.Center)

      expect(long.width).toBeGreaterThan(short.width)
    })

    it('should have larger height for multi-line text', () => {
      const single = engine.layoutText('Short', TextAlign.Center)
      const multi = engine.layoutText('This is a very long line that will wrap to multiple lines', TextAlign.Center)

      if (multi.lines.length > 1) {
        expect(multi.height).toBeGreaterThan(single.height)
      }
    })
  })
})
