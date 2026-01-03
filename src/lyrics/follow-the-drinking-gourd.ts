/**
 * Follow the Drinking Gourd
 *
 * Traditional spiritual / folk song
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Follow the Drinking Gourd
@artist: Traditional Spiritual
@duration: 03:00.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>Fol<00:02.28>low <00:03.06>the <00:03.84>drink<00:04.62>ing <00:05.40>gourd,
00:06.18 <00:06.18>Fol<00:06.96>low <00:07.74>the <00:08.52>drink<00:09.30>ing <00:10.08>gourd,
00:10.86 <00:10.86>For <00:11.64>the <00:12.42>old <00:13.20>man <00:13.98>is <00:14.76>a<00:15.54>wait<00:16.32>ing,
00:17.10 <00:17.10>For <00:17.88>to <00:18.66>car<00:19.44>ry <00:20.22>you <00:21.00>to <00:21.78>free<00:22.56>dom.

[Verse 2]
00:23.34 <00:23.34>When <00:24.12>the <00:24.90>sun <00:25.68>comes <00:26.46>back,
00:27.24 <00:27.24>And <00:28.02>the <00:28.80>first <00:29.58>bright <00:30.36>star <00:31.14>is <00:31.92>night,
00:32.70 <00:32.70>Fol<00:33.48>low <00:34.26>the <00:35.04>drink<00:35.82>ing <00:36.60>gourd,
00:37.38 <00:37.38>The <00:38.16>old <00:38.94>man <00:39.72>is <00:40.50>a<00:41.28>wait<00:42.06>ing.

[Verse 3]
00:42.84 <00:42.84>Fol<00:43.62>low <00:44.40>the <00:45.18>drink<00:45.96>ing <00:46.74>gourd,
00:47.52 <00:47.52>Fol<00:48.30>low <00:49.08>the <00:49.86>drink<00:50.64>ing <00:51.42>gourd,
00:52.20 <00:52.20>For <00:53.98>it <00:54.76>leads <00:55.54>to <00:56.32>free<00:57.10>dom,
00:57.88 <00:57.88>And <00:58.66>you'll <00:59.44>be <01:00.22>free <01:01.00>at <01:01.78>last.

[Outro]
01:05.40 (Thank you for singing with Karaoke Composer!)
`

export const followTheDrinkingGourd: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
