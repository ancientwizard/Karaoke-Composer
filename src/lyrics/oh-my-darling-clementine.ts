/**
 * Oh My Darling Clementine
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~110 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Oh My Darling Clementine
@artist: Traditional American
@duration: 02:50.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 110 BPM)

[Verse 1]
00:00.65 <00:00.65>Oh <00:01.27>my <00:01.92>dar<00:02.54>ling, <00:03.19>oh <00:03.81>my <00:04.46>dar<00:05.08>ling,
00:05.73 <00:05.73>Oh <00:06.35>my <00:07.00>dar<00:07.62>ling <00:08.27>Clem<00:08.89>en<00:09.54>tine,
00:10.16 <00:10.16>You <00:10.81>are <00:11.43>lost <00:12.08>and <00:12.70>gone <00:13.35>for<00:13.97>ev<00:14.62>er,
00:15.24 <00:15.24>Dread<00:15.89>ful <00:16.51>sor<00:17.16>ry, <00:17.78>Clem<00:18.43>en<00:19.05>tine.

[Verse 2]
00:19.70 <00:19.70>Light <00:20.32>she <00:20.97>was <00:21.59>and <00:22.24>like <00:22.86>a <00:23.51>fair<00:24.13>y,
00:24.78 <00:24.78>And <00:25.40>her <00:26.05>shoes <00:26.67>were <00:27.32>num<00:27.94>ber <00:28.59>nine,
00:29.21 <00:29.21>Her<00:29.86>ring <00:30.48>box <00:31.13>with<00:31.75>out <00:32.40>a <00:33.02>cov<00:33.67>er,
00:34.29 <00:34.29>Sar<00:34.94>dines <00:35.56>were <00:36.21>can<00:36.83>died <00:37.48>in <00:38.10>the <00:38.75>brine.

[Verse 3]
00:39.37 <00:39.37>So <00:40.02>I <00:40.64>kissed <00:41.29>her <00:41.91>cheek <00:42.56>and <00:43.18>then <00:43.83>her <00:44.45>fore<00:45.10>head,
00:45.72 <00:45.72>Then <00:46.37>I <00:46.99>kissed <00:47.64>her <00:48.26>lips <00:48.91>so <00:49.53>warm <00:50.18>and <00:50.80>pink,
00:51.45 <00:51.45>But <00:52.07>a<00:52.72>las <00:53.34>my <00:53.99>Clem<00:54.61>en<00:55.26>tine <00:55.88>did <00:56.53>fade <00:57.15>a<00:57.80>way,
00:58.42 <00:58.42>And <00:59.07>I <00:59.69>lost <01:00.34>my <01:00.96>Clem<01:01.61>en<01:02.23>tine <01:02.88>be<01:03.50>neath <01:04.15>the <01:04.77>foam.

[Outro]
01:09.40 (Thank you for singing with Karaoke Composer!)
`

export const ohMyDarlingClementine: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
