/**
 * Danny Boy
 *
 * Lyrics by Frederick Weatherly, music by Danny Osmond
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Danny Boy
@artist: Frederick Weatherly & Danny Osmond
@duration: 03:40.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.50 <00:01.50>Oh <00:02.28>Dan<00:03.06>ny <00:03.84>boy, <00:04.62>the <00:05.40>pipes, <00:06.18>the <00:06.96>pipes <00:07.74>are <00:08.52>call<00:09.30>ing,
00:10.08 <00:10.08>From <00:10.86>glen <00:11.64>to <00:12.42>glen <00:13.20>and <00:13.98>down <00:14.76>the <00:15.54>moun<00:16.32>tain <00:17.10>side,
00:17.88 <00:17.88>The <00:18.66>sum<00:19.44>mer's <00:20.22>gone <00:21.00>and <00:21.78>all <00:22.56>the <00:23.34>ros<00:24.12>es <00:24.90>fall<00:25.68>ing,
00:26.46 <00:26.46>It's <00:27.24>you, <00:28.02>it's <00:28.80>you <00:29.58>must <00:30.36>go <00:31.14>and <00:31.92>I <00:32.70>must <00:33.48>bide.

[Verse 2]
00:34.26 <00:34.26>But <00:35.04>come <00:35.82>ye <00:36.60>back <00:37.38>when <00:38.16>sum<00:38.94>mer's <00:39.72>in <00:40.50>the <00:41.28>mead<00:42.06>ow,
00:42.84 <00:42.84>Or <00:43.62>when <00:44.40>the <00:45.18>val<00:45.96>ley's <00:46.74>hushed <00:47.52>and <00:48.30>white <00:49.08>with <00:49.86>snow,
00:50.64 <00:50.64>And <00:51.42>I'll <00:52.20>be <00:52.98>here <00:53.76>in <00:54.54>sun<00:55.32>shine <00:56.10>or <00:56.88>in <00:57.66>shad<00:58.44>ow,
00:59.22 <00:59.22>Oh <01:00.00>Dan<01:00.78>ny <01:01.56>boy, <01:02.34>oh <01:03.12>Dan<01:03.90>ny, <01:04.68>I <01:05.46>love <01:06.24>you <01:07.02>so.

[Verse 3]
01:07.80 <01:07.80>And <01:08.58>if <01:09.36>you <01:10.14>come, <01:10.92>when <01:11.70>all <01:12.48>the <01:13.26>flow<01:14.04>ers <01:14.82>are <01:15.60>dy<01:16.38>ing,
01:17.16 <01:17.16>and <01:17.94>I <01:18.72>am <01:19.50>dead <01:20.28>as <01:21.06>dead <01:21.84>I <01:22.62>well <01:23.40>may <01:24.18>be,
01:24.96 <01:24.96>You'll <01:25.74>come <01:26.52>and <01:27.30>find <01:28.08>the <01:28.86>place <01:29.64>where <01:30.42>I <01:31.20>am <01:31.98>ly<01:32.76>ing,
01:33.54 <01:33.54>And <01:34.32>kneel <01:35.10>and <01:35.88>say <01:36.66>an <01:37.44>Ave <01:38.22>there <01:39.00>for <01:39.78>me.

[Outro]
01:43.50 (Thank you for singing with Karaoke Composer!)
`

export const dannyBoy: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
