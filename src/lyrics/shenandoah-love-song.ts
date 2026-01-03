/**
 * Shenandoah Love Song
 *
 * Traditional variant
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Shenandoah Love Song
@artist: Traditional Variant
@duration: 03:25.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.75 <00:01.75>Oh, <00:02.58>Shen<00:03.41>an<00:04.24>doah, <00:05.07>I <00:05.90>long <00:06.73>to <00:07.56>hear <00:08.39>you,
00:09.22 <00:09.22>A<00:10.05>way, <00:10.88>you <00:11.71>roll<00:12.54>ing <00:13.37>riv<00:14.20>er,
00:15.03 <00:15.03>Oh, <00:15.86>Shen<00:16.69>an<00:17.52>doah, <00:18.35>I <00:19.18>long <00:20.01>to <00:20.84>see <00:21.67>you,
00:22.50 <00:22.50>A<00:23.33>way, <00:24.16>I'm <00:25.03>bound <00:25.82>a<00:26.65>way
00:27.48 <00:27.48>'cross <00:28.31>the <00:29.14>wide <00:29.97>Mis<00:30.80>sou<00:31.63>ri.

[Verse 2]
00:32.46 <00:32.46>For <00:33.29>this <00:34.12>fair <00:34.95>maid<00:35.78>en <00:36.61>I <00:37.44>pine <00:38.27>and <00:39.10>lan<00:39.93>guish,
00:40.76 <00:40.76>A<00:41.59>way, <00:42.42>you <00:43.25>roll<00:44.08>ing <00:44.91>riv<00:45.74>er,
00:46.57 <00:46.57>Fair <00:47.40>Shen<00:48.23>an<00:49.06>doah's <00:49.89>daugh<00:50.72>ter <00:51.55>I <00:52.38>a<00:53.21>dore,
00:54.04 <00:54.04>A<00:54.87>way, <00:55.70>I'm <00:56.57>bound <00:57.36>a<01:00.19>way
01:00.02 <01:00.02>'cross <01:00.85>the <01:01.68>wide <01:02.51>Mis<01:03.34>sou<01:04.17>ri.

[Outro]
01:08.60 (Thank you for singing with Karaoke Composer!)
`

export const shenandoahLoveSong: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
