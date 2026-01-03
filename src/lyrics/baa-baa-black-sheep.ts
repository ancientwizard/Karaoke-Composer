/**
 * Baa Baa Black Sheep
 *
 * Traditional nursery rhyme/song
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Baa Baa Black Sheep
@artist: Traditional
@duration: 01:20.40

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>Baa, <00:01.20>baa, <00:01.80>black <00:02.40>sheep, <00:03.00>have <00:03.60>you <00:04.20>an<00:04.80>y <00:05.40>wool,
00:06.00 <00:06.00>Yes <00:06.60>sir, <00:07.20>yes <00:07.80>sir, <00:08.40>three <00:09.00>bags <00:09.60>full,
00:10.20 <00:10.20>One <00:10.80>for <00:11.40>my <00:12.00>mas<00:12.60>ter,
00:13.20 <00:13.20>One <00:13.80>for <00:14.40>my <00:15.00>dame,
00:15.60 <00:15.60>And <00:16.20>one <00:16.80>for <00:17.40>the <00:18.00>lit<00:18.60>tle <00:19.20>boy <00:19.80>who <00:20.40>lives <00:21.00>down <00:21.60>the <00:22.20>lane.

[Outro]
00:27.40 (Thank you for singing with Karaoke Composer!)
`

export const baaBaaBlackSheep: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
