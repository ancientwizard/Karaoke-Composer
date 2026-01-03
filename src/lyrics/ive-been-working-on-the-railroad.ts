/**
 * I've Been Working on the Railroad
 *
 * Traditional American railroad song
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: I've Been Working on the Railroad
@artist: Traditional American
@duration: 02:50.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.80 <00:00.80>I've <00:01.45>been <00:02.10>work<00:02.75>ing <00:03.40>on <00:04.05>the <00:04.70>rail<00:05.35>road,
00:06.00 <00:06.00>All <00:06.65>the <00:07.30>live<00:07.95>long <00:08.60>day,
00:09.25 <00:09.25>I've <00:09.90>been <00:10.55>work<00:11.20>ing <00:11.85>on <00:12.50>the <00:13.15>rail<00:13.80>road,
00:14.45 <00:14.45>Just <00:15.10>to <00:15.75>pass <00:16.40>the <00:17.05>time <00:17.70>a<00:18.35>way.

[Chorus]
00:19.00 <00:19.00>Can't <00:19.65>you <00:20.30>hear <00:20.95>the <00:21.60>whis<00:22.25>tle <00:22.90>blow<00:23.55>ing,
00:24.20 <00:24.20>Rise <00:24.85>up <00:25.50>so <00:26.15>ear<00:26.80>ly <00:27.45>in <00:28.10>the <00:28.75>morn,
00:29.40 <00:29.40>Can't <00:30.05>you <00:30.70>hear <00:31.35>the <00:32.00>cap<00:32.65>tain <00:33.30>shout<00:33.95>ing,
00:34.60 <00:34.60>Dinah <00:35.25>blow <00:35.90>your <00:36.55>horn.

[Verse 2]
00:37.20 <00:37.20>Dinah <00:37.85>won't <00:38.50>you <00:39.15>blow <00:39.80>your <00:40.45>horn,
00:41.10 <00:41.10>Dinah <00:41.75>won't <00:42.40>you <00:43.05>blow <00:43.70>your <00:44.35>horn,
00:45.00 <00:45.00>Some<00:45.65>one's <00:46.30>in <00:46.95>the <00:47.60>kitch<00:48.25>en <00:48.90>with <00:49.55>Di<00:50.20>nah,
00:50.85 <00:50.85>Some<00:51.50>one's <00:52.15>in <00:52.80>there <00:53.45>with <00:54.10>Di<00:54.75>nah,
00:55.40 <00:55.40>Strum<00:56.05>ming <00:56.70>on <00:57.35>the <00:58.00>old <00:58.65>ban<00:59.30>jo.

[Outro]
01:03.40 (Thank you for singing with Karaoke Composer!)
`

export const iveBeenWorkingOnTheRailroad: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
