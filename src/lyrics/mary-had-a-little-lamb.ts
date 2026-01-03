/**
 * Mary Had a Little Lamb
 *
 * Traditional nursery rhyme/song
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Mary Had a Little Lamb
@artist: Traditional
@duration: 01:35.60

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>Ma<00:01.31>ry <00:01.92>had <00:02.53>a <00:03.14>lit<00:03.75>tle <00:04.36>lamb,
00:04.97 <00:04.97>Lit<00:05.58>tle <00:06.19>lamb, <00:06.80>lit<00:07.41>tle <00:08.02>lamb,
00:08.63 <00:08.63>Ma<00:09.24>ry <00:09.85>had <00:10.46>a <00:11.07>lit<00:11.68>tle <00:12.29>lamb,
00:12.90 <00:12.90>Its <00:13.51>fleece <00:14.12>was <00:14.73>white <00:15.34>as <00:15.95>snow.

[Verse 2]
00:16.56 <00:16.56>And <00:17.17>ev<00:17.78>ery<00:18.39>where <00:19.00>that <00:19.61>Ma<00:20.22>ry <00:20.83>went,
00:21.44 <00:21.44>Ma<00:22.05>ry <00:22.66>went, <00:23.27>Ma<00:23.88>ry <00:24.49>went,
00:25.10 <00:25.10>And <00:25.71>ev<00:26.32>ery<00:26.93>where <00:27.54>that <00:28.15>Ma<00:28.76>ry <00:29.37>went,
00:29.98 <00:29.98>The <00:30.59>lamb <00:31.20>was <00:31.81>sure <00:32.42>to <00:33.03>go.

[Outro]
00:40.60 (Thank you for singing with Karaoke Composer!)
`

export const maryHadALittleLamb: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
