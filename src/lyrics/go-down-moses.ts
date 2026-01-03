/**
 * Go Down Moses
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~95 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Go Down Moses
@artist: Traditional Spiritual
@duration: 03:10.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 95 BPM)

[Verse 1]
00:01.50 <00:01.50>When <00:02.37>Is<00:03.24>rael <00:04.11>was <00:04.98>in <00:05.85>E<00:06.72>gypt's <00:07.59>land,
00:08.46 <00:08.46>Let <00:09.33>my <00:10.20>peo<00:11.07>ple <00:11.94>go,
00:12.81 <00:12.81>Op<00:13.68>pressed <00:14.55>so <00:15.42>hard <00:16.29>they <00:17.16>could <00:18.03>not <00:18.90>stand,
00:19.77 <00:19.77>Let <00:20.64>my <00:21.51>peo<00:22.38>ple <00:23.25>go.

[Chorus]
00:24.12 <00:24.12>Go <00:24.99>down, <00:25.86>Mo<00:26.73>ses,
00:27.60 <00:27.60>Way <00:28.47>down <00:29.34>in <00:30.21>E<00:31.08>gypt's <00:31.95>land,
00:32.82 <00:32.82>Tell <00:33.69>old <00:34.56>Phar<00:35.43>aoh <00:36.30>to
00:37.17 <00:37.17>Let <00:38.04>my <00:38.91>peo<00:39.78>ple <00:40.65>go.

[Verse 2]
00:41.52 <00:41.52>'Twas <00:42.39>not <00:43.26>with <00:44.13>swords <00:45.00>and <00:45.87>spears <00:46.74>we <00:47.61>fought,
00:48.48 <00:48.48>Let <00:49.35>my <00:50.22>peo<00:51.09>ple <00:51.96>go,
00:52.83 <00:52.83>But <00:53.70>with <00:54.57>his <00:55.44>pow<00:56.31>er <00:57.18>and <00:58.05>might <00:58.92>we <00:59.79>sought,
01:00.66 <01:00.66>Let <01:01.53>my <01:02.40>peo<01:03.27>ple <01:04.14>go.

[Verse 3]
01:05.01 <01:05.01>And <01:05.88>now <01:06.75>that <01:07.62>Is<01:08.49>rael's <01:09.36>free,
01:10.23 <01:10.23>Let <01:11.10>my <01:11.97>peo<01:12.84>ple <01:13.71>go,
01:14.58 <01:14.58>We <01:15.45>all <01:16.32>must <01:17.19>be <01:18.06>in <01:18.93>lib<01:19.80>er<01:20.67>ty,
01:21.54 <01:21.54>Let <01:22.41>my <01:23.28>peo<01:24.15>ple <01:25.02>go.

[Outro]
01:30.20 (Thank you for singing with Karaoke Composer!)
`

export const goDownMoses: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
