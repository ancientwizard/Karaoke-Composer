/**
 * Deep River
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Deep River
@artist: Traditional Spiritual
@duration: 03:35.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.75 <00:01.75>Deep <00:02.63>riv<00:03.51>er, <00:04.39>my <00:05.27>home <00:06.15>is <00:07.03>o<00:07.91>ver <00:08.79>Jor<00:09.67>dan,
00:10.55 <00:10.55>Deep <00:11.43>riv<00:12.31>er, <00:13.19>Lord, <00:14.07>I <00:14.95>want <00:15.83>to <00:16.71>cross <00:17.59>o<00:18.47>ver <00:19.35>in<00:20.23>to <00:21.11>peace<00:21.99>ful <00:22.87>rest.

[Verse 2]
00:23.75 <00:23.75>I <00:24.63>want <00:25.51>to <00:26.39>cross <00:27.27>o<00:28.15>ver <00:29.03>in<00:29.91>to <00:30.79>peace<00:31.67>ful <00:32.55>rest,
00:33.43 <00:33.43>I <00:34.31>want <00:35.19>to <00:36.07>cross <00:36.95>o<00:37.83>ver <00:38.71>in<00:39.59>to <00:40.47>peace<00:41.35>ful <00:42.23>rest.

[Verse 3]
00:43.11 <00:43.11>Oh, <00:43.99>when <00:44.87>shall <00:45.75>I <00:46.63>reach <00:47.51>that <00:48.39>shore <00:49.27>and <00:50.15>when <00:51.03>shall <00:51.91>that <00:52.79>day <00:53.67>ar<00:54.55>rive,
00:55.43 <00:55.43>When <00:56.31>I <00:57.19>shall <00:58.07>reach <00:58.95>that <00:59.83>shore <01:00.71>and <01:01.59>when <01:02.47>shall <01:03.35>that <01:04.23>day <01:05.11>ar<01:05.99>rive,
01:06.87 <01:06.87>That <01:07.75>I <01:08.63>shall <01:09.51>lose <01:10.39>all <01:11.27>sor<01:12.15>row <01:13.03>and <01:13.91>tri<01:14.79>al <01:15.67>and <01:16.55>strife.

[Outro]
01:20.40 (Thank you for singing with Karaoke Composer!)
`

export const deepRiver: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
