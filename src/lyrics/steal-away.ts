/**
 * Steal Away
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Steal Away
@artist: Traditional Spiritual
@duration: 02:45.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>Steal <00:02.28>a<00:03.06>way, <00:03.84>steal <00:04.62>a<00:05.40>way,
00:06.18 <00:06.18>Steal <00:06.96>a<00:07.74>way <00:08.52>to <00:09.30>Je<00:10.08>sus,
00:10.86 <00:10.86>Steal <00:11.64>a<00:12.42>way, <00:13.20>steal <00:13.98>a<00:14.76>way,
00:15.54 <00:15.54>I <00:16.32>ain't <00:17.10>got <00:17.88>long <00:18.66>to <00:19.44>stay <00:20.22>here.

[Chorus]
00:21.00 <00:21.00>My <00:21.78>Lord <00:22.56>calls <00:23.34>me,
00:24.12 <00:24.12>He <00:24.90>calls <00:25.68>me <00:26.46>by <00:27.24>the <00:28.02>thun<00:28.80>der,
00:29.58 <00:29.58>The <00:30.36>trum<00:31.14>pet <00:31.92>sounds <00:32.70>in <00:33.48>my <00:34.26>soul,
00:35.04 <00:35.04>I <00:35.82>ain't <00:36.60>got <00:37.38>long <00:38.16>to <00:38.94>stay <00:39.72>here.

[Verse 2]
00:40.50 <00:40.50>Green <00:41.28>trees <00:42.06>a<00:42.84>bend<00:43.62>ing,
00:44.40 <00:44.40>Poor <00:45.18>sin<00:45.96>ner <00:46.74>stand <00:47.52>and <00:48.30>tremble,
00:49.08 <00:49.08>The <00:49.86>trum<00:50.64>pet <00:51.42>sounds <00:52.20>in <00:52.98>my <00:53.76>soul,
00:54.54 <00:54.54>I <00:55.32>ain't <00:56.10>got <00:56.88>long <00:57.66>to <00:58.44>stay <00:59.22>here.

[Outro]
01:02.50 (Thank you for singing with Karaoke Composer!)
`

export const stealAway: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
