/**
 * Tests for Presentation Command system
 */

import {
  LogicalColor,
  TextAlign,
  PresentationCommands,
  // type ClearScreenCommand,
  // type ShowTextCommand,
  // type ChangeColorCommand
} from '../karaoke/presentation/PresentationCommand'

describe('PresentationCommand', () => {
  describe('LogicalColor enum', () => {
    it('should have expected color values', () => {
      expect(LogicalColor.Background).toBe('background')
      expect(LogicalColor.ActiveText).toBe('active')
      expect(LogicalColor.TransitionText).toBe('transition')
    })
  })

  describe('TextAlign enum', () => {
    it('should have expected alignment values', () => {
      expect(TextAlign.Left).toBe('left')
      expect(TextAlign.Center).toBe('center')
      expect(TextAlign.Right).toBe('right')
    })
  })

  describe('PresentationCommands factory', () => {
    it('should create clearScreen command', () => {
      const cmd = PresentationCommands.clearScreen(1000, LogicalColor.Background)

      expect(cmd.type).toBe('clear_screen')
      expect(cmd.timestamp).toBe(1000)
      expect(cmd.color).toBe(LogicalColor.Background)
    })

    it('should create showText command with defaults', () => {
      const cmd = PresentationCommands.showText(
        2000,
        'text-0',
        'Hello World',
        {
          x: 500, y: 400
        }
      )

      expect(cmd.type).toBe('show_text')
      expect(cmd.timestamp).toBe(2000)
      expect(cmd.textId).toBe('text-0')
      expect(cmd.text).toBe('Hello World')
      expect(cmd.position).toEqual({
        x: 500, y: 400
      })
      expect(cmd.color).toBe(LogicalColor.ActiveText)
      expect(cmd.align).toBe(TextAlign.Center)
    })

    it('should create showText command with custom values', () => {
      const cmd = PresentationCommands.showText(
        3000,
        'text-1',
        'Test',
        {
          x: 100, y: 200
        },
        LogicalColor.TransitionText,
        TextAlign.Left
      )

      expect(cmd.textId).toBe('text-1')
      expect(cmd.color).toBe(LogicalColor.TransitionText)
      expect(cmd.align).toBe(TextAlign.Left)
    })

    it('should create changeColor command', () => {
      const cmd = PresentationCommands.changeColor(
        1500,
        'text-1',
        0,
        5,
        LogicalColor.ActiveText
      )

      expect(cmd.type).toBe('change_color')
      expect(cmd.timestamp).toBe(1500)
      expect(cmd.textId).toBe('text-1')
      expect(cmd.startChar).toBe(0)
      expect(cmd.endChar).toBe(5)
      expect(cmd.color).toBe(LogicalColor.ActiveText)
    })

    it('should create removeText command', () => {
      const cmd = PresentationCommands.removeText(4000, 'text-1')

      expect(cmd.type).toBe('remove_text')
      expect(cmd.timestamp).toBe(4000)
      expect(cmd.textId).toBe('text-1')
    })

    it('should create transition command', () => {
      const cmd = PresentationCommands.transition(
        5000,
        'text-1',
        'text-2',
        300,
        {
          x: 500, y: 400
        },
        {
          x: 500, y: 450
        }
      )

      expect(cmd.type).toBe('transition')
      expect(cmd.timestamp).toBe(5000)
      expect(cmd.fromTextId).toBe('text-1')
      expect(cmd.toTextId).toBe('text-2')
      expect(cmd.durationMs).toBe(300)
      expect(cmd.fromPosition).toEqual({
        x: 500, y: 400
      })
      expect(cmd.toPosition).toEqual({
        x: 500, y: 450
      })
    })

    it('should create showMetadata command', () => {
      const cmd = PresentationCommands.showMetadata(
        0,
        {
          x: 500, y: 300
        },
        {
          title: 'Test Song', artist: 'Test Artist'
        }
      )

      expect(cmd.type).toBe('show_metadata')
      expect(cmd.timestamp).toBe(0)
      expect(cmd.position).toEqual({
        x: 500, y: 300
      })
      expect(cmd.title).toBe('Test Song')
      expect(cmd.artist).toBe('Test Artist')
      expect(cmd.align).toBe(TextAlign.Center)
    })
  })

  describe('PresentationScript', () => {
    it('should organize commands with metadata', () => {
      const commands = [
        PresentationCommands.clearScreen(0),
        PresentationCommands.showText(1000, 'text-0', 'Hello', {
          x: 500, y: 400
        })
      ]

      const script = {
        commands,
        durationMs: 5000,
        metadata: {
          title: 'Test Song',
          artist: 'Test Artist'
        }
      }

      expect(script.commands).toHaveLength(2)
      expect(script.durationMs).toBe(5000)
      expect(script.metadata.title).toBe('Test Song')
    })
  })
})
