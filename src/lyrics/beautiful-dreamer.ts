/**
 * Beautiful Dreamer
 *
 * Written by Stephen Foster
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Beautiful Dreamer
@artist: Stephen Foster
@duration: 03:40.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.80 <00:01.80>Beau<00:02.70>ti<00:03.60>ful <00:04.50>dream<00:05.40>er, <00:06.30>wake <00:07.20>un<00:08.10>to <00:09.00>me,
00:09.90 <00:09.90>Star <00:10.80>light <00:11.70>and <00:12.60>dew <00:13.50>drops <00:14.40>are <00:15.30>wait<00:16.20>ing <00:17.10>for <00:18.00>thee,
00:18.90 <00:18.90>Sounds <00:19.80>of <00:20.70>the <00:21.60>rude <00:22.50>world <00:23.40>heard <00:24.30>in <00:25.20>the <00:26.10>day,
00:27.00 <00:27.00>Lulled <00:27.90>by <00:28.80>the <00:29.70>moon<00:30.60>light <00:31.50>have <00:32.40>all <00:33.30>passed <00:34.20>a<00:35.10>way.

[Verse 2]
00:36.00 <00:36.00>Beau<00:36.90>ti<00:37.80>ful <00:38.70>dream<00:39.60>er, <00:40.50>queen <00:41.40>of <00:42.30>my <00:43.20>heart,
00:44.10 <00:44.10>Come <00:45.00>with <00:45.90>me <00:46.80>and <00:47.70>we <00:48.60>will <00:49.50>nev<00:50.40>er <00:51.30>part,
00:52.20 <00:52.20>I <00:53.10>have <00:54.00>for <00:54.90>long <00:55.80>ling<00:56.70>ered <00:57.60>near <00:58.50>thy <00:59.40>door,
01:00.30 <01:00.30>Do <01:01.20>not <01:02.10>hence <01:03.00>to <01:03.90>leave <01:04.80>me <01:05.70>ev<01:06.60>er <01:07.50>more.

[Outro]
01:11.50 (Thank you for singing with Karaoke Composer!)
`

export const beautifulDreamer: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
