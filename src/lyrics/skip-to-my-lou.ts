/**
 * Skip to My Lou
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Skip to My Lou
@artist: Traditional American
@duration: 02:05.30

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>Skip, <00:01.31>skip, <00:01.92>skip <00:02.53>to <00:03.14>my <00:03.75>lou,
00:04.36 <00:04.36>Skip, <00:04.97>skip, <00:05.58>skip <00:06.19>to <00:06.80>my <00:07.41>lou,
00:08.02 <00:08.02>Skip, <00:08.63>skip, <00:09.24>skip <00:09.85>to <00:10.46>my <00:11.07>lou,
00:11.68 <00:11.68>My <00:12.29>dar<00:12.90>ling.

[Verse 2]
00:13.51 <00:13.51>Fly's <00:14.12>in <00:14.73>the <00:15.34>but<00:15.95>ter<00:16.56>milk,
00:17.17 <00:17.17>Shoo, <00:17.78>shoo, <00:18.39>shoo,
00:19.00 <00:19.00>Fly's <00:19.61>in <00:20.22>the <00:20.83>but<00:21.44>ter<00:22.05>milk,
00:22.66 <00:22.66>Shoo, <00:23.27>shoo, <00:23.88>shoo,
00:24.49 <00:24.49>Fly's <00:25.10>in <00:25.71>the <00:26.32>but<00:26.93>ter<00:27.54>milk,
00:28.15 <00:28.15>Skip <00:28.76>to <00:29.37>my <00:29.98>lou, <00:30.59>my <00:31.20>dar<00:31.81>ling.

[Verse 3]
00:32.42 <00:32.42>Lost <00:33.03>my <00:33.64>part<00:34.25>ner <00:34.86>what <00:35.47>shall <00:36.08>I <00:36.69>do,
00:37.30 <00:37.30>Lost <00:37.91>my <00:38.52>part<00:39.13>ner <00:39.74>what <00:40.35>shall <00:41.03>I <00:41.64>do,
00:42.25 <00:42.25>Lost <00:42.86>my <00:43.47>part<00:44.08>ner <00:44.69>what <00:45.30>shall <00:45.91>I <00:46.52>do,
00:47.13 <00:47.13>Skip <00:47.74>to <00:48.35>my <00:48.96>lou, <00:49.57>my <00:50.18>dar<00:50.79>ling.

[Outro]
00:55.30 (Thank you for singing with Karaoke Composer!)
`

export const skipToMyLou: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
