/**
 * Swing Low, Sweet Chariot
 *
 * African-American spiritual (19th century)
 * Public domain
 *
 * Tempo: ~90 BPM (quarter note = 667ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Swing Low, Sweet Chariot
@artist: Traditional / African-American Spiritual
@duration: 02:05.33

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Refrain]
00:01.33 <00:01.33>Swing <00:02.08>low, <00:02.83>sweet <00:03.58>char<00:04.33>i<00:05.08>ot,
00:05.83 <00:05.83>Com<00:06.58>in' <00:07.33>for <00:08.08>to <00:08.83>car<00:09.58>ry <00:10.33>me <00:11.08>home.
00:11.83 <00:11.83>Swing <00:12.58>low, <00:13.33>sweet <00:14.08>char<00:14.83>i<00:15.58>ot,
00:16.33 <00:16.33>Com<00:17.08>in' <00:17.83>for <00:18.58>to <00:19.33>car<00:20.08>ry <00:20.83>me <00:21.58>home.

[Verse 1]
00:22.33 <00:22.33>I <00:23.08>looked <00:23.83>o<00:24.58>ver <00:25.33>Jor<00:26.08>dan <00:26.83>and <00:27.58>what <00:28.33>did <00:29.08>I <00:29.83>see,
00:30.58 <00:30.58>Com<00:31.33>in' <00:32.08>for <00:32.83>to <00:33.58>car<00:34.33>ry <00:35.08>me <00:35.83>home.
00:36.58 <00:36.58>A <00:37.33>band <00:38.08>of <00:38.83>an<00:39.58>gels <00:40.33>com<00:41.08>in' <00:41.83>af<00:42.58>ter <00:43.33>me,
00:44.08 <00:44.08>Com<00:44.83>in' <00:45.58>for <00:46.33>to <00:47.08>car<00:47.83>ry <00:48.58>me <00:49.33>home.

[Outro]
00:52.33 (Thank you for singing with Karaoke Composer!)
`

export const swingLowSweetChariot: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
