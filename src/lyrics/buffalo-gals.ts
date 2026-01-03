/**
 * Buffalo Gals
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Buffalo Gals
@artist: Traditional American
@duration: 02:20.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>Buf<00:01.31>fa<00:01.92>lo <00:02.53>gals, <00:03.14>won't <00:03.75>you <00:04.36>come <00:04.97>out <00:05.58>to<00:06.19>night,
00:06.80 <00:06.80>Won't <00:07.41>you <00:08.02>come <00:08.63>out <00:09.24>to<00:09.85>night,
00:10.46 <00:10.46>Won't <00:11.07>you <00:11.68>come <00:12.29>out <00:12.90>to<00:13.51>night,
00:14.12 <00:14.12>Buf<00:14.73>fa<00:15.34>lo <00:15.95>gals <00:16.56>won't <00:17.17>you <00:17.78>come <00:18.39>out <00:19.00>to<00:19.61>night,
00:20.22 <00:20.22>And <00:20.83>dance <00:21.44>by <00:22.05>the <00:22.66>light <00:23.27>of <00:23.88>the <00:24.49>moon.

[Verse 2]
00:25.10 <00:25.10>I <00:25.71>would <00:26.32>dance <00:26.93>with <00:27.54>a <00:28.15>Buf<00:28.76>fa<00:29.37>lo <00:29.98>gal <00:30.59>who <00:31.20>would <00:31.81>not <00:32.42>dance <00:33.03>with <00:33.64>me,
00:34.25 <00:34.25>'Cause <00:34.86>she <00:35.47>knew <00:36.08>by <00:36.69>the <00:37.30>way <00:37.91>I <00:38.52>had <00:39.13>no <00:39.74>boots <00:40.35>or <00:40.96>pants.

[Outro]
00:45.50 (Thank you for singing with Karaoke Composer!)
`

export const buffaloGals: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
