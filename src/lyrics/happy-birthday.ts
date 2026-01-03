/**
 * Happy Birthday
 *
 * Traditional song by Mildred J. Hill and Patty S. Hill (1893)
 * Public domain
 *
 * Tempo: ~100 BPM (quarter note = 600ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Happy Birthday
@artist: Mildred J. Hill & Patty S. Hill
@duration: 00:40.00

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse]
00:02.40 <00:02.40>Hap<00:03.00>py <00:03.60>birth<00:04.20>day <00:04.80>to <00:05.40>you,
00:06.00 <00:06.00>hap<00:06.60>py <00:07.20>birth<00:07.80>day <00:08.40>to <00:09.00>you.
00:09.60 <00:09.60>Hap<00:10.20>py <00:10.80>birth<00:11.40>day <00:12.00>dear <00:13.20>friend,
00:13.80 <00:13.80>hap<00:14.40>py <00:15.00>birth<00:15.60>day <00:16.20>to <00:16.80>you.

[Outro]
00:18.00 (Thank you for singing with Karaoke Composer!)
`

export const happyBirthday: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
