/**
 * Home on the Range
 *
 * American folk song by Brewster M. Higley (1872)
 * Public domain
 *
 * Tempo: ~80 BPM (quarter note = 750ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Home on the Range
@artist: Brewster M. Higley & Daniel E. Kelly
@duration: 02:35.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.50 <00:01.50>O <00:02.25>give <00:03.00>me <00:03.75>a <00:04.50>home,
00:05.25 <00:05.25>where <00:06.00>the <00:06.75>buf<00:07.50>fa<00:08.25>lo <00:09.00>roam,
00:09.75 <00:09.75>Where <00:10.50>the <00:11.25>deer <00:12.00>and <00:12.75>the <00:13.50>an<00:14.25>te<00:15.00>lope <00:15.75>play;
00:16.50 <00:16.50>Where <00:17.25>sel<00:18.00>dom <00:18.75>is <00:19.50>heard <00:20.25>a <00:21.00>dis<00:21.75>cour<00:22.50>ag<00:23.25>ing <00:24.00>word,
00:24.75 <00:24.75>And <00:25.50>the <00:26.25>skies <00:27.00>are <00:27.75>not <00:28.50>cloud<00:29.25>y <00:30.00>all <00:30.75>day.

[Chorus]
00:31.50 <00:31.50>Home, <00:32.50>home <00:33.25>on <00:34.00>the <00:34.75>range,
00:35.50 <00:35.50>Where <00:36.25>the <00:37.00>deer <00:37.75>and <00:38.50>the <00:39.25>an<00:40.00>te<00:40.75>lope <00:41.50>play;
00:42.25 <00:42.25>Where <00:43.00>sel<00:43.75>dom <00:44.50>is <00:45.25>heard <00:46.00>a <00:46.75>dis<00:47.50>cour<00:48.25>ag<00:49.00>ing <00:49.75>word,
00:50.50 <00:50.50>And <00:51.25>the <00:52.00>skies <00:52.75>are <00:53.50>not <00:54.25>cloud<00:55.00>y <00:55.75>all <00:56.50>day.

[Outro]
01:00.00 (Thank you for singing with Karaoke Composer!)
`

export const homeOnTheRange: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
