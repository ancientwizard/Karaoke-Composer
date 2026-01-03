/**
 * Scotland the Brave
 *
 * Music by Cliff Hanley
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Scotland the Brave
@artist: Cliff Hanley
@duration: 02:45.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.60 <00:01.60>Hark <00:02.32>when <00:03.04>the <00:03.76>night <00:04.48>winds <00:05.20>call <00:05.92>the <00:06.64>glen,
00:07.36 <00:07.36>It <00:08.08>stirs <00:08.80>the <00:09.52>blood <00:10.24>of <00:10.96>men,
00:11.68 <00:11.68>Hi<00:12.40>land<00:13.12>ers <00:13.84>lad <00:14.56>and <00:15.28>low<00:16.00>land <00:16.72>born,
00:17.44 <00:17.44>We'll <00:18.16>stand <00:18.88>or <00:19.60>fall <00:20.32>for <00:21.04>Scot<00:21.76>land <00:22.48>born.

[Chorus]
00:23.20 <00:23.20>Scot<00:23.92>land <00:24.64>the <00:25.36>brave, <00:26.32>Scot<00:27.04>land <00:27.76>the <00:28.48>free,
00:29.20 <00:29.20>Scot<00:29.92>land <00:30.64>the <00:31.36>brave <00:32.08>for <00:32.80>me,
00:33.52 <00:33.52>I'll <00:34.24>prove <00:34.96>to <00:35.68>thee <00:36.40>my <00:37.12>love <00:37.84>is <00:38.56>true,
00:39.28 <00:39.28>Scot<00:40.00>land <00:40.72>the <00:41.44>brave, <00:42.40>my <00:43.12>Scot<00:43.84>land <00:44.56>true.

[Verse 2]
00:45.28 <00:45.28>From <00:46.00>the <00:46.72>my<00:47.44>stic <00:48.16>isles <00:48.88>to <00:49.60>ben <00:50.32>and <00:51.04>glen,
00:51.76 <00:51.76>Come <00:52.48>the <00:53.20>proud <00:53.92>and <00:54.64>bra<00:55.36>vest <00:56.08>men,
00:56.80 <00:56.80>Ev<00:57.52>ery <00:58.24>hill <00:58.96>and <00:59.68>ev<01:00.40>ery <00:01.12>glen,
01:01.84 <01:01.84>sends <01:02.56>its <01:03.28>he<01:04.00>roes <01:04.72>to <01:05.44>Scot<01:06.16>land <01:06.88>the <01:07.60>brave.

[Chorus]
01:08.32 <01:08.32>Scot<01:09.04>land <01:09.76>the <01:10.48>brave, <01:11.44>Scot<01:12.16>land <01:12.88>the <01:13.60>free,
01:14.32 <01:14.32>Scot<01:15.04>land <01:15.76>the <01:16.48>brave <01:17.20>for <01:17.92>me,
01:18.64 <01:18.64>I'll <01:19.36>prove <01:20.08>to <01:20.80>thee <01:21.52>my <01:22.24>love <01:22.96>is <01:23.68>true,
01:24.40 <01:24.40>Scot<01:25.12>land <01:25.84>the <01:26.56>brave, <01:27.52>my <01:28.24>Scot<01:28.96>land <01:29.68>true.

[Outro]
01:33.00 (Thank you for singing with Karaoke Composer!)
`

export const scotlandTheBrave: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
