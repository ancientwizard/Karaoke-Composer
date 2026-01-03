/**
 * Just a Closer Walk with Thee
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Just a Closer Walk with Thee
@artist: Traditional Spiritual
@duration: 02:50.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>I <00:02.28>am <00:03.06>weak <00:03.84>but <00:04.62>thou <00:05.40>art <00:06.18>strong,
00:06.96 <00:06.96>Je<00:07.74>sus <00:08.52>keep <00:09.30>me <00:10.08>from <00:10.86>all <00:11.64>wrong,
00:12.42 <00:12.42>I'll <00:13.20>be <00:13.98>sat<00:14.76>is<00:15.54>fied <00:16.32>as <00:17.10>long
00:17.88 <00:17.88>As <00:18.66>I <00:19.44>walk <00:20.22>let <00:21.00>me <00:21.78>walk <00:22.56>close <00:23.34>to <00:24.12>thee.

[Chorus]
00:24.90 <00:24.90>Just <00:25.68>a <00:26.46>clos<00:27.24>er <00:28.02>walk <00:28.80>with <00:29.58>thee,
00:30.36 <00:30.36>Grant <00:31.14>it, <00:31.92>Je<00:32.70>sus, <00:33.48>if <00:34.26>you <00:35.04>please,
00:35.82 <00:35.82>Dai<00:36.60>ly <00:37.38>walk<00:38.16>ing <00:38.94>close <00:39.72>to <00:40.50>thee,
00:41.28 <00:41.28>Let <00:42.06>it <00:42.84>be, <00:43.62>dear <00:44.40>Lord, <00:45.18>let <00:45.96>it <00:46.74>be.

[Verse 2]
00:47.52 <00:47.52>Through <00:48.30>this <00:49.08>world <00:49.86>of <00:50.64>toil <00:51.42>and <00:52.20>snares,
00:52.98 <00:52.98>If <00:53.76>I <00:54.54>fal<00:55.32>ter, <00:56.10>Lord, <00:56.88>who <00:57.66>cares,
00:58.44 <00:58.44>Who <00:59.22>with <01:00.00>me <01:00.78>my <01:01.56>bur<00:02.34>dens <01:03.12>shares?
01:03.90 <01:03.90>None <01:04.68>but <01:05.46>thee, <01:06.24>dear <01:07.02>Lord, <01:07.80>none <01:08.58>but <01:09.36>thee.

[Outro]
01:13.30 (Thank you for singing with Karaoke Composer!)
`

export const justACloserWalkWithThee: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
