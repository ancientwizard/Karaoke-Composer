/**
 * Simple Gifts
 *
 * Shaker hymn written by Elder Joseph D. Brackett Jr. (1848)
 * Public domain
 *
 * Tempo: ~90 BPM (quarter note = 667ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Simple Gifts
@artist: Joseph D. Brackett Jr.
@duration: 01:50.33

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.33 <00:01.33>'Tis <00:02.08>the <00:02.83>gift <00:03.58>to <00:04.33>be <00:05.08>sim<00:05.83>ple,
00:06.58 <00:06.58>'tis <00:07.33>the <00:08.08>gift <00:08.83>to <00:09.58>be <00:10.33>free,
00:11.08 <00:11.08>'tis <00:11.83>the <00:12.58>gift <00:13.33>to <00:14.08>come <00:14.83>down <00:15.58>where <00:16.33>we <00:17.08>ought <00:17.83>to <00:18.58>be,
00:19.33 <00:19.33>And <00:20.08>when <00:20.83>we <00:21.58>find <00:22.33>our<00:23.08>selves <00:23.83>in <00:24.58>the <00:25.33>place <00:26.08>just <00:26.83>right,
00:27.58 <00:27.58>'Twill <00:28.33>be <00:29.08>in <00:29.83>the <00:30.58>val<00:31.33>ley <00:32.08>of <00:32.83>love <00:33.58>and <00:34.33>de<00:35.08>light.

[Outro]
00:39.00 (Thank you for singing with Karaoke Composer!)
`

export const simpleGifts: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
