/**
 * Shall We Gather at the River
 *
 * Written by Robert Lowry
 * Public domain
 *
 * Tempo: ~95 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Shall We Gather at the River
@artist: Robert Lowry
@duration: 03:20.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 95 BPM)

[Verse 1]
00:01.50 <00:01.50>Soon <00:02.37>we'll <00:03.24>reach <00:04.11>the <00:04.98>shin<00:05.85>ing <00:06.72>riv<00:07.59>er,
00:08.46 <00:08.46>Soon <00:09.33>we'll <00:10.20>reach <00:11.07>the <00:11.94>shin<00:12.81>ing <00:13.68>riv<00:14.55>er,
00:15.42 <00:15.42>Soon <00:16.29>we'll <00:17.16>reach <00:18.03>the <00:18.90>shin<00:19.77>ing <00:20.64>riv<00:21.51>er,
00:22.38 <00:22.38>Soon <00:23.25>we'll <00:24.12>reach <00:24.99>the <00:25.86>shin<00:26.73>ing <00:27.60>riv<00:28.47>er.

[Chorus]
00:29.34 <00:29.34>Shall <00:30.21>we <00:31.08>gath<00:31.95>er <00:32.82>at <00:33.69>the <00:34.56>riv<00:35.43>er,
00:36.30 <00:36.30>Shall <00:37.17>we <00:38.04>gath<00:38.91>er <00:39.78>at <00:40.65>the <00:41.52>riv<00:42.39>er,
00:43.26 <00:43.26>Shall <00:44.13>we <00:45.00>gath<00:45.87>er <00:46.74>at <00:47.61>the <00:48.48>riv<00:49.35>er,
00:50.22 <00:50.22>That <00:51.09>flows <00:51.96>by <00:52.83>the <00:53.70>throne <00:54.57>of <00:55.44>God?

[Verse 2]
00:56.31 <00:56.31>Er <00:57.18>long <00:58.05>we'll <00:58.92>reach <00:59.79>the <01:00.66>gold<01:01.53>en <01:02.40>cit<01:03.27>ies,
01:04.14 <01:04.14>Er <01:05.01>long <01:05.88>we'll <01:06.75>reach <01:07.62>the <01:08.49>gold<01:09.36>en <01:10.23>cit<01:11.10>ies,
01:11.97 <01:11.97>Er <01:12.84>long <01:13.71>we'll <01:14.58>reach <01:15.45>the <01:16.32>gold<01:17.19>en <01:18.06>cit<01:18.93>ies,
01:19.80 <01:19.80>Er <01:20.67>long <01:21.54>we'll <01:22.41>reach <01:23.28>the <01:24.15>gold<01:25.02>en <01:25.89>cit<01:26.76>ies.

[Outro]
01:30.40 (Thank you for singing with Karaoke Composer!)
`

export const shallWeGatherAtTheRiver: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
