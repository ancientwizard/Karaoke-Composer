/**
 * Row Row Row Your Boat
 *
 * Traditional nursery rhyme and round (18th century origin)
 * Public domain
 *
 * Tempo: ~120 BPM (quarter note = 500ms), simple melody
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Row Row Row Your Boat
@artist: Traditional
@duration: 00:25.00

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse]
00:01.00 <00:01.00>Row, <00:01.60>row, <00:02.20>row <00:02.80>your <00:03.40>boat,
00:04.20 <00:04.20>Gent<00:04.80>ly <00:05.40>down <00:06.00>the <00:06.60>stream.
00:07.40 <00:07.40>Mer<00:08.00>ri<00:08.60>ly, <00:09.40>mer<00:10.00>ri<00:10.60>ly,
00:11.40 <00:11.40>Mer<00:12.00>ri<00:12.60>ly, <00:13.40>mer<00:14.00>ri<00:14.60>ly,
00:15.40 <00:15.40>Life <00:16.00>is <00:16.60>but <00:17.20>a <00:17.80>dream.

[Outro]
00:20.00 (Thank you for singing with Karaoke Composer!)
`

export const rowRowRowYourBoat: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
