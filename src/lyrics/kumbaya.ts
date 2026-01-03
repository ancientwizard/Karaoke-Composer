/**
 * Kumbaya
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Kumbaya
@artist: Traditional Spiritual
@duration: 03:00.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.50 <00:01.50>Kum<00:02.32>ba<00:03.14>ya, <00:03.96>my <00:04.78>Lord, <00:05.60>kum<00:06.42>ba<00:07.24>ya,
00:08.06 <00:08.06>Kum<00:08.88>ba<00:09.70>ya, <00:10.52>my <00:11.34>Lord, <00:12.16>kum<00:12.98>ba<00:13.80>ya,
00:14.62 <00:14.62>Kum<00:15.44>ba<00:16.26>ya, <00:17.08>my <00:17.90>Lord, <00:18.72>kum<00:19.54>ba<00:20.36>ya,
00:21.18 <00:21.18>Oh, <00:22.00>Lord, <00:22.82>kum<00:23.64>ba<00:24.46>ya.

[Verse 2]
00:25.28 <00:25.28>Some<00:26.10>'one's <00:26.92>cry<00:27.74>ing, <00:28.56>Lord, <00:29.38>kum<00:30.20>ba<00:31.02>ya,
00:31.84 <00:31.84>Some<00:32.66>'one's <00:33.48>cry<00:34.30>ing, <00:35.12>Lord, <00:35.94>kum<00:36.76>ba<00:37.58>ya,
00:38.40 <00:38.40>Some<00:39.22>'one's <00:40.04>cry<00:40.86>ing, <00:41.68>Lord, <00:42.50>kum<00:43.32>ba<00:44.14>ya,
00:44.96 <00:44.96>Oh, <00:45.78>Lord, <00:46.60>kum<00:47.42>ba<00:48.24>ya.

[Verse 3]
00:49.06 <00:49.06>Some<00:49.88>'one's <00:50.70>pray<00:51.52>ing, <00:52.34>Lord, <00:53.16>kum<00:53.98>ba<00:54.80>ya,
00:55.62 <00:55.62>Some<00:56.44>'one's <00:57.26>pray<00:58.08>ing, <00:58.90>Lord, <00:59.72>kum<01:00.54>ba<01:01.36>ya,
01:02.18 <01:02.18>Some<01:03.00>'one's <01:03.82>pray<01:04.64>ing, <01:05.46>Lord, <01:06.28>kum<01:07.10>ba<01:07.92>ya,
01:08.74 <01:08.74>Oh, <01:09.56>Lord, <01:10.38>kum<01:11.20>ba<01:12.02>ya.

[Outro]
01:15.50 (Thank you for singing with Karaoke Composer!)
`

export const kumbaya: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
