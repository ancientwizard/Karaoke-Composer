/**
 * Turkey in the Straw
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Turkey in the Straw
@artist: Traditional American
@duration: 02:35.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>As <00:01.31>I <00:01.92>was <00:02.53>a<00:03.14>go<00:03.75>ing <00:04.36>down <00:04.97>the <00:05.58>road,
00:06.19 <00:06.19>With <00:06.80>a <00:07.41>heav<00:08.02>y <00:08.63>load,
00:09.24 <00:09.24>I <00:09.85>came <00:10.46>to <00:11.07>a <00:11.68>man <00:12.29>and <00:12.90>his <00:13.51>wife,
00:14.12 <00:14.12>With <00:14.73>the <00:15.34>sim<00:15.95>plest <00:16.56>life.

[Verse 2]
00:17.17 <00:17.17>The <00:17.78>man <00:18.39>be<00:19.00>gan <00:19.61>to <00:20.22>laugh,
00:20.83 <00:20.83>His <00:21.44>wife <00:22.05>be<00:22.66>gan <00:23.27>to <00:23.88>scream,
00:24.49 <00:24.49>And <00:25.10>he <00:25.71>threw <00:26.32>the <00:26.93>tur<00:27.54>key <00:28.15>in <00:28.76>the <00:29.37>straw,
00:29.98 <00:29.98>Out <00:30.59>came <00:31.20>the <00:31.81>tur<00:32.42>key <00:33.03>in <00:33.64>the <00:34.25>straw.

[Chorus]
00:34.86 <00:34.86>Tur<00:35.47>key <00:36.08>in <00:36.69>the <00:37.30>straw, <00:37.91>tur<00:38.52>key <00:39.13>in <00:39.74>the <00:40.35>straw,
00:40.96 <00:40.96>Roll <00:41.57>them <00:42.18>in <00:42.79>the <00:43.40>dust <00:44.01>and <00:44.62>draw,
00:45.23 <00:45.23>Tur<00:45.84>key <00:46.45>in <00:47.06>the <00:47.67>straw, <00:48.28>tur<00:48.89>key <00:49.50>in <00:50.11>the <00:50.72>straw.

[Outro]
00:55.40 (Thank you for singing with Karaoke Composer!)
`

export const turkeyInTheStraw: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
