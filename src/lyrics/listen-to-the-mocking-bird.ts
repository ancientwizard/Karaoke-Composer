/**
 * Listen to the Mocking Bird
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~110 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Listen to the Mocking Bird
@artist: Traditional American
@duration: 03:05.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 110 BPM)

[Verse 1]
00:00.65 <00:00.65>I <00:01.27>hear <00:01.92>the <00:02.54>mock<00:03.19>ing <00:03.81>bird,
00:04.46 <00:04.46>I <00:05.08>hear <00:05.73>the <00:06.35>mock<00:07.00>ing <00:07.62>bird,
00:08.27 <00:08.27>The <00:08.89>mock<00:09.54>ing <00:10.16>bird <00:10.81>sing<00:11.43>ing <00:12.08>o'er <00:12.70>me,
00:13.35 <00:13.35>I <00:13.97>hear <00:14.62>the <00:15.24>mock<00:15.89>ing <00:16.51>bird,
00:17.16 <00:17.16>I <00:17.78>hear <00:18.43>the <00:19.05>mock<00:19.70>ing <00:20.32>bird,
00:20.97 <00:20.97>The <00:21.59>mock<00:22.24>ing <00:22.86>bird <00:23.51>sing<00:24.13>ing <00:24.78>o'er <00:25.40>me.

[Verse 2]
00:26.05 <00:26.05>How <00:26.67>I <00:27.32>love <00:27.94>to <00:28.59>hear <00:29.21>him <00:29.86>sing,
00:30.48 <00:30.48>How <00:31.13>I <00:31.75>love <00:32.40>to <00:33.02>hear <00:33.67>him <00:34.29>sing,
00:34.94 <00:34.94>On <00:35.56>a <00:36.21>sum<00:36.83>mer <00:37.48>day <00:38.10>so <00:38.75>fine,
00:39.37 <00:39.37>How <00:40.02>I <00:40.64>love <00:41.29>to <00:41.91>hear <00:42.56>him <00:43.18>sing,
00:43.83 <00:43.83>How <00:44.45>I <00:45.10>love <00:45.72>to <00:46.37>hear <00:46.99>him <00:47.64>sing,
00:48.26 <00:48.26>He <00:48.91>sings <00:49.53>my <00:50.18>cares <00:50.80>all <00:51.45>a<00:52.07>way.

[Outro]
00:58.40 (Thank you for singing with Karaoke Composer!)
`

export const listenToTheMockingBird: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
