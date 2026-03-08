/**
 * Line Reservation Regression Tests
 *
 * Uses the user's current project LRC to validate that reservation output
 * does not place multiple active lyric lines on the same leased row.
 */

import * as fs from 'fs'
import * as path from 'path'
import { LRCParser } from '../formats/LRCFormat'
import { TimingConverter } from '../karaoke/presentation/TimingConverter'

interface ActiveLyric
{
  id: string
  y: number
}

const collectSameRowOverlapEvents = (commands: ReturnType<TimingConverter['convert']>): string[] =>
{
  const active = new Map<string, ActiveLyric>()
  const sameRowOverlapEvents: string[] = []

  for (const command of commands)
  {
    if (command.type === 'remove_text')
    {
      if (command.textId.startsWith('lyric-'))
      {
        active.delete(command.textId)
      }
    }
    else if (command.type === 'show_text')
    {
      if (command.textId.startsWith('lyric-'))
      {
        active.set(command.textId, {
          id: command.textId,
          y: command.position.y
        })
      }
    }

    const yToIds = new Map<number, string[]>()
    for (const lyric of active.values())
    {
      const ids = yToIds.get(lyric.y) || []
      ids.push(lyric.id)
      yToIds.set(lyric.y, ids)
    }

    for (const [y, ids] of yToIds.entries())
    {
      if (ids.length > 1)
      {
        sameRowOverlapEvents.push(
          `t=${command.timestamp} y=${y} ids=${ids.join(',')}`
        )
      }
    }
  }

  return sameRowOverlapEvents
}

describe('Line reservation regression', () =>
{
  it('does not assign the same y row to overlapping active lyric lines (project LRC)', () =>
  {
    const lrcPath = path.join(process.cwd(), 'projects', 'meet-me-in-november-Cmjr.lrc')
    expect(fs.existsSync(lrcPath)).toBe(true)

    const lrc = fs.readFileSync(lrcPath, 'utf-8')
    const project = LRCParser.toKaraokeProject(lrc, 'reservation-regression')

    const converter = new TimingConverter()
    const commands = converter.convert(project)

    const sameRowOverlapEvents = collectSameRowOverlapEvents(commands)

    expect(sameRowOverlapEvents).toEqual([])
  })

  it('does not re-lease active lyric rows when erase delay is applied', () =>
  {
    const lrcPath = path.join(process.cwd(), 'projects', 'meet-me-in-november-Cmjr.lrc')
    expect(fs.existsSync(lrcPath)).toBe(true)

    const lrc = fs.readFileSync(lrcPath, 'utf-8')
    const project = LRCParser.toKaraokeProject(lrc, 'reservation-regression-erase-delay')

    const converter = new TimingConverter({ eraseDelayMs: 1250 })
    const commands = converter.convert(project)
    const sameRowOverlapEvents = collectSameRowOverlapEvents(commands)

    expect(sameRowOverlapEvents).toEqual([])
  })
})

// VIM: set filetype=typescript :
// END
