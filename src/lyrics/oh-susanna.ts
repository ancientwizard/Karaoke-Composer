/**
 * Oh! Susanna
 *
 * Written by Stephen Foster
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Oh! Susanna
@artist: Stephen Foster
@duration: 02:15.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>I <00:01.31>come <00:01.92>from <00:02.53>Al<00:03.14>a<00:03.75>bam<00:04.36>a
00:04.97 <00:04.97>with <00:05.58>my <00:06.19>ban<00:06.80>jo <00:07.41>on <00:08.02>my <00:08.63>knee,
00:09.24 <00:09.24>I'm <00:09.85>go<00:10.46>ing <00:11.07>to <00:11.68>Lou<00:12.29>i<00:12.90>si<00:13.51>an<00:14.12>a,
00:14.73 <00:14.73>My <00:15.34>true <00:15.95>love <00:16.56>for <00:17.17>to <00:17.78>see.

[Chorus]
00:18.39 <00:18.39>Oh! <00:19.00>Su<00:19.61>san<00:20.22>na,
00:20.83 <00:20.83>Now <00:21.44>don't <00:22.05>you <00:22.66>cry <00:23.27>for <00:23.88>me,
00:24.49 <00:24.49>I <00:25.10>come <00:25.71>from <00:26.32>Al<00:26.93>a<00:27.54>bam<00:28.15>a
00:28.76 <00:28.76>with <00:29.37>my <00:29.98>ban<00:30.59>jo <00:31.20>on <00:31.81>my <00:32.42>knee.

[Verse 2]
00:33.03 <00:33.03>I <00:33.64>had <00:34.25>a <00:34.86>dream <00:35.47>the <00:36.08>oth<00:36.69>er <00:37.30>night,
00:37.91 <00:37.91>I <00:38.52>dreamed <00:39.13>Su<00:39.74>san<00:40.35>na <00:41.03>was <00:41.64>in <00:42.25>sight,
00:42.86 <00:42.86>I <00:43.47>woke <00:44.08>up <00:44.69>and <00:45.30>I <00:45.91>was <00:46.52>blue,
00:47.13 <00:47.13>When <00:47.74>I <00:48.35>found <00:48.96>my <00:49.57>dream <00:50.18>was <00:50.79>not <00:51.40>true.

[Outro]
00:55.60 (Thank you for singing with Karaoke Composer!)
`

export const ohSusanna: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
