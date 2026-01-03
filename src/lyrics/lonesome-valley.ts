/**
 * Lonesome Valley
 *
 * Traditional American spiritual
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Lonesome Valley
@artist: Traditional American Spiritual
@duration: 02:55.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.75 <00:01.75>You <00:02.63>got <00:03.51>to <00:04.39>walk <00:05.27>this <00:06.15>lone<00:07.03>some <00:07.91>val<00:08.79>ley,
00:09.67 <00:09.67>You <00:10.55>got <00:11.43>to <00:12.31>walk <00:13.19>it <00:14.07>by <00:14.95>your<00:15.83>self;
00:16.71 <00:16.71>No<00:17.59>bod<00:18.47>y <00:19.35>else <00:20.23>can <00:21.11>walk <00:21.99>it <00:22.87>for <00:23.75>you,
00:24.63 <00:24.63>You <00:25.51>got <00:26.39>to <00:27.27>walk <00:28.15>it <00:29.03>by <00:29.91>your<00:30.79>self.

[Verse 2]
00:31.67 <00:31.67>I <00:32.55>went <00:33.43>down <00:34.31>in <00:35.19>the <00:36.07>val<00:36.95>ley <00:37.83>to <00:38.71>pray,
00:39.59 <00:39.59>My <00:40.47>soul <00:41.35>got <00:42.23>hap<00:43.11>py <00:43.99>and <00:44.87>I <00:45.75>stayed,
00:46.63 <00:46.63>Oh <00:47.51>hal<00:48.39>le<00:49.27>lu<00:50.15>jah, <00:51.03>hal<00:51.91>le<00:52.79>lu<00:53.67>jah,
00:54.55 <00:54.55>I <00:55.43>stayed <00:56.31>to <00:57.19>pray <00:58.07>in <00:58.95>that <01:00.03>val<00:00.91>ley.

[Outro]
01:04.30 (Thank you for singing with Karaoke Composer!)
`

export const lonesomeValley: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
