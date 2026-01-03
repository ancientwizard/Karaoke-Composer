/**
 * Oh Shenandoah
 *
 * Traditional river boat song
 * Public domain
 *
 * Tempo: ~75 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Oh Shenandoah
@artist: Traditional River Boat Song
@duration: 03:40.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 75 BPM)

[Verse 1]
00:02.00 <00:02.00>Oh <00:02.90>Shen<00:03.80>an<00:04.70>doah, <00:05.60>I <00:06.50>long <00:07.40>to <00:08.30>hear <00:09.20>you,
00:10.10 <00:10.10>A<00:11.00>way, <00:11.90>you <00:12.80>roll<00:13.70>ing <00:14.60>riv<00:15.50>er,
00:16.40 <00:16.40>Oh <00:17.30>Shen<00:18.20>an<00:19.10>doah, <00:20.00>I <00:20.90>long <00:21.80>to <00:22.70>hear <00:23.60>you,
00:24.50 <00:24.50>A<00:25.40>way, <00:26.30>I'm <00:27.20>bound <00:28.10>a<00:29.00>way
00:29.90 <00:29.90>'cross <00:30.80>the <00:31.70>wide <00:32.60>Mis<00:33.50>sou<00:34.40>ri.

[Verse 2]
00:35.30 <00:35.30>The <00:36.20>stream<00:37.10>ing <00:38.00>branch<00:38.90>es <00:39.80>and <00:40.70>the <00:41.60>roll<00:42.50>ing <00:43.40>wa<00:44.30>ters,
00:45.20 <00:45.20>A<00:46.10>way, <00:47.00>you <00:47.90>roll<00:48.80>ing <00:49.70>riv<00:50.60>er,
00:51.50 <00:51.50>The <00:52.40>stream<00:53.30>ing <00:54.20>branch<00:55.10>es <00:56.00>and <00:56.90>the <00:57.80>roll<00:58.70>ing <00:59.60>wa<01:00.50>ters,
01:01.40 <01:01.40>A<01:02.30>way, <01:03.20>I'm <01:04.10>bound <01:05.00>a<01:05.90>way
01:06.80 <01:06.80>'cross <01:07.70>the <01:08.60>wide <01:09.50>Mis<01:10.40>sou<01:11.30>ri.

[Verse 3]
01:12.20 <01:12.20>The <00:13.10>chief<01:14.00>tain's <01:14.90>daugh<01:15.80>ters <01:16.70>as <01:17.60>they <01:18.50>gath<01:19.40>er <01:20.30>by <01:21.20>the <01:22.10>shore<00:23.00>line,
01:23.90 <01:23.90>A<01:24.80>way, <01:25.70>you <01:26.60>roll<01:27.50>ing <01:28.40>riv<01:29.30>er,
01:30.20 <01:30.20>The <01:31.10>chief<01:32.00>tain's <01:32.90>daugh<01:33.80>ters <01:34.70>as <01:35.60>they <01:36.50>gath<01:37.40>er <01:38.30>by <01:39.20>the <01:40.10>shore<01:41.00>line,
01:41.90 <01:41.90>A<01:42.80>way, <01:43.70>I'm <01:44.60>bound <01:45.50>a<01:46.40>way
01:47.30 <01:47.30>'cross <01:48.20>the <01:49.10>wide <01:50.00>Mis<01:50.90>sou<01:51.80>ri.

[Outro]
01:55.80 (Thank you for singing with Karaoke Composer!)
`

export const ohShenandoah: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
