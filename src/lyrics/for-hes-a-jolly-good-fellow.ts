/**
 * For He's a Jolly Good Fellow
 *
 * Traditional song
 * Public domain
 *
 * Tempo: ~110 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: For He's a Jolly Good Fellow
@artist: Traditional
@duration: 02:10.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 110 BPM)

[Verse 1]
00:01.00 <00:01.00>For <00:01.82>he's <00:02.64>a <00:03.46>jol<00:04.28>ly <00:05.10>good <00:05.92>fel<00:06.74>low,
00:07.56 <00:07.56>For <00:08.38>he's <00:09.20>a <00:10.02>jol<00:10.84>ly <00:11.66>good <00:12.48>fel<00:13.30>low,
00:14.12 <00:14.12>For <00:14.94>he's <00:15.76>a <00:16.58>jol<00:17.40>ly <00:18.22>good <00:19.04>fel<00:19.86>low,
00:20.68 <00:20.68>Which <00:21.50>no<00:22.32>bod<00:23.14>y <00:23.96>can <00:24.78>de<00:25.60>ny.

[Chorus]
00:26.42 <00:26.42>Which <00:27.24>no<00:28.06>bod<00:28.88>y <00:29.70>can <00:30.52>de<00:31.34>ny,
00:32.16 <00:32.16>Which <00:32.98>no<00:33.80>bod<00:34.62>y <00:35.44>can <00:36.26>de<00:37.08>ny,
00:37.90 <00:37.90>For <00:38.72>he's <00:39.54>a <00:40.36>jol<00:41.18>ly <00:42.00>good <00:42.82>fel<00:43.64>low,
00:44.46 <00:44.46>Which <00:45.28>no<00:46.10>bod<00:46.92>y <00:47.74>can <00:48.56>de<00:49.38>ny.

[Verse 2]
00:50.20 <00:50.20>For <00:51.02>she's <00:51.84>a <00:52.66>jol<00:53.48>ly <00:54.30>good <00:55.12>fel<00:55.94>low,
00:56.76 <00:56.76>For <00:57.58>she's <00:58.40>a <00:59.22>jol<01:00.04>ly <01:00.86>good <01:01.68>fel<01:02.50>low,
01:03.32 <01:03.32>For <01:04.14>she's <01:04.96>a <01:05.78>jol<01:06.60>ly <01:07.42>good <01:08.24>fel<01:09.06>low,
01:09.88 <01:09.88>Which <01:10.70>no<01:11.52>bod<01:12.34>y <01:13.16>can <01:13.98>de<01:14.80>ny.

[Outro]
01:17.50 (Thank you for singing with Karaoke Composer!)
`

export const forHesAJollyGoodFellow: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
