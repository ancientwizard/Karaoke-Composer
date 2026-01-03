/**
 * Hard Times Come Again No More
 *
 * Written by Stephen Foster
 * Public domain
 *
 * Tempo: ~95 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Hard Times Come Again No More
@artist: Stephen Foster
@duration: 03:40.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 95 BPM)

[Verse 1]
00:01.50 <00:01.50>Let <00:02.37>us <00:03.24>pause <00:04.11>in <00:04.98>life's <00:05.85>pleas<00:06.72>ures,
00:07.59 <00:07.59>And <00:08.46>count <00:09.33>its <00:10.20>man<00:11.07>y <00:11.94>tears,
00:12.81 <00:12.81>While <00:13.68>we <00:14.55>all <00:15.42>sup <00:16.29>sor<00:17.16>row,
00:18.03 <00:18.03>With <00:18.90>the <00:19.77>hus<00:20.64>bands <00:21.51>and <00:22.38>the <00:23.25>dears.

[Verse 2]
00:24.12 <00:24.12>Hard <00:25.99>times <00:26.86>come <00:27.73>a<00:28.60>gain <00:29.47>no <00:30.34>more,
00:31.21 <00:31.21>Man<00:32.08>y <00:32.95>days <00:33.82>have <00:34.69>passed <00:35.56>since <00:36.43>I <00:37.30>have <00:38.17>seen <00:39.04>the <00:39.91>hearth.

[Verse 3]
00:40.78 <00:40.78>While <00:41.65>we <00:42.52>seek <00:43.39>mirth <00:44.26>and <00:45.13>beau<00:46.00>ty,
00:46.87 <00:46.87>And <00:47.74>drain <00:48.61>the <00:49.48>cup <00:50.35>of <00:51.22>care,
00:52.09 <00:52.09>Let <00:52.96>us <00:53.83>re<00:54.70>mem<00:55.57>ber <00:56.44>al<00:57.31>ways <00:58.18>those <00:59.05>who <00:59.92>strug<01:00.79>gle <01:01.66>ev<01:02.53>ery<00:03.40>where.

[Outro]
01:08.30 (Thank you for singing with Karaoke Composer!)
`

export const hardTimesCoameAgainNoMore: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
