/**
 * Rock of Ages
 *
 * Lyrics by Augustus Montague Toplady, music by Thomas Hastings
 * Public domain
 *
 * Tempo: ~95 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Rock of Ages
@artist: Augustus Montague Toplady & Thomas Hastings
@duration: 03:15.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 95 BPM)

[Verse 1]
00:01.50 <00:01.50>Rock <00:02.37>of <00:03.24>a<00:04.11>ges, <00:04.98>cleft <00:05.85>for <00:06.72>me,
00:07.59 <00:07.59>Let <00:08.46>me <00:09.33>hide <00:10.20>my<00:11.07>self <00:11.94>in <00:12.81>thee,
00:13.68 <00:13.68>Let <00:14.55>the <00:15.42>wa<00:16.29>ter <00:17.16>and <00:18.03>the <00:18.90>blood,
00:19.77 <00:19.77>From <00:20.64>thy <00:21.51>wound<00:22.38>ed <00:23.25>side <00:24.12>which <00:24.99>flowed,
00:25.86 <00:25.86>Be <00:26.73>of <00:27.60>sin <00:28.47>the <00:29.34>dou<00:30.21>ble <00:31.08>cure,
00:31.95 <00:31.95>Cleanse <00:32.82>me <00:33.69>from <00:34.56>its <00:35.43>guilt <00:36.30>and <00:37.17>pow<00:38.04>er.

[Verse 2]
00:38.91 <00:38.91>Not <00:39.78>the <00:40.65>la<00:41.52>bors <00:42.39>of <00:43.26>my <00:44.13>hands
00:45.00 <00:45.00>Can <00:45.87>ful<00:46.74>fill <00:47.61>thy <00:48.48>law's <00:49.35>de<00:50.22>mands,
00:51.09 <00:51.09>Could <00:51.96>my <00:52.83>zeal <00:53.70>no <00:54.57>res<00:55.44>pite <00:56.31>know,
00:57.18 <00:57.18>Could <00:58.05>my <00:58.92>tears <00:59.79>for<01:00.66>ev<01:01.53>er <01:02.40>flow,
01:03.27 <01:03.27>All <01:04.14>for <01:05.01>sin <01:05.88>could <01:06.75>not <01:07.62>a<01:08.49>tone,
01:09.36 <01:09.36>Thou <01:10.23>must <01:11.10>save <01:11.97>and <01:12.84>thou <01:13.71>a<01:14.58>lone.

[Outro]
01:18.50 (Thank you for singing with Karaoke Composer!)
`

export const rockOfAges: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
