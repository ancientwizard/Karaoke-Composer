/**
 * Nobody Knows the Trouble I've Seen
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Nobody Knows the Trouble I've Seen
@artist: Traditional Spiritual
@duration: 03:20.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.80 <00:01.80>No<00:02.63>bod<00:03.46>y <00:04.29>knows <00:05.12>the <00:05.95>trou<00:06.78>ble <00:07.61>I've <00:08.44>seen,
00:09.27 <00:09.27>No<00:10.10>bod<00:10.93>y <00:11.76>knows <00:12.59>my <00:13.42>sor<00:14.25>row,
00:15.08 <00:15.08>No<00:15.91>bod<00:16.74>y <00:17.57>knows <00:18.40>the <00:19.23>trou<00:20.06>ble <00:20.89>I've <00:21.72>seen,
00:22.55 <00:22.55>Glo<00:23.38>ry <00:24.21>hal<00:25.04>le<00:25.87>lu<00:26.70>jah!

[Verse 2]
00:27.53 <00:27.53>Some<00:28.36>times <00:29.19>I'm <00:30.02>up, <00:30.85>some<00:31.68>times <00:32.51>I'm <00:33.34>down,
00:34.17 <00:34.17>Oh, <00:35.00>yes, <00:35.83>Lord!
00:36.66 <00:36.66>Some<00:37.49>times <00:38.32>I'm <00:39.15>up, <00:39.98>some<00:40.81>times <00:41.64>I'm <00:42.47>down,
00:43.30 <00:43.30>Oh, <00:44.13>yes, <00:44.96>Lord!
00:45.79 <00:45.79>Some<00:46.62>times <00:47.45>I'm <00:48.28>al<00:49.11>most <00:49.94>to <00:50.77>the <00:51.60>ground,
00:52.43 <00:52.43>Oh, <00:53.26>yes, <00:54.09>Lord!

[Verse 3]
00:54.92 <00:54.92>I <00:55.75>have <00:56.58>a <00:57.41>Moth<00:58.24>er <00:59.07>in <00:59.90>the <01:00.73>King<01:01.56>dom,
01:02.39 <01:02.39>Oh, <01:03.22>yes, <01:04.05>Lord!
01:04.88 <01:04.88>I <01:05.71>have <01:06.54>a <01:07.37>Moth<01:08.20>er <01:09.03>in <01:09.86>the <01:10.69>King<01:11.52>dom,
01:12.35 <01:12.35>Oh, <01:13.18>yes, <01:14.01>Lord!

[Outro]
01:18.80 (Thank you for singing with Karaoke Composer!)
`

export const nobodyKnowsTheTroubleIveSeen: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
