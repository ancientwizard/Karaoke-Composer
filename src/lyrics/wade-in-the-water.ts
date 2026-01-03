/**
 * Wade in the Water
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~105 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Wade in the Water
@artist: Traditional Spiritual
@duration: 02:35.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 105 BPM)

[Chorus]
00:01.40 <00:01.40>Wade <00:02.18>in <00:02.96>the <00:03.74>wa<00:04.52>ter,
00:05.30 <00:05.30>Wade <00:06.08>in <00:06.86>the <00:07.64>wa<00:08.42>ter,
00:09.20 <00:09.20>Wade <00:09.98>in <00:10.76>the <00:11.54>wa<00:12.32>ter,
00:13.10 <00:13.10>God's <00:13.88>gon<00:14.66>na <00:15.44>trou<00:16.22>ble <00:17.00>the <00:17.78>wa<00:18.56>ter.

[Verse 1]
00:19.34 <00:19.34>I <00:20.12>see <00:20.90>all <00:21.68>the <00:22.46>He<00:23.24>brew <00:24.02>chil<00:24.80>dren,
00:25.58 <00:25.58>Dressed <00:26.36>in <00:27.14>white <00:27.92>robes <00:28.70>and <00:29.48>such,
00:30.26 <00:30.26>And <00:31.04>the <00:31.82>wa<00:32.60>ter <00:33.38>turned <00:34.16>to <00:34.94>fire <00:35.72>and <00:36.50>flame.

[Verse 2]
00:37.28 <00:37.28>Now <00:38.06>the <00:38.84>chil<00:39.62>dren <00:40.40>came <00:41.18>walk<00:41.96>ing <00:42.74>down,
00:43.52 <00:43.52>And <00:44.30>the <00:45.08>Lord <00:45.86>spoke <00:46.64>from <00:47.42>a <00:48.20>cloud,
00:48.98 <00:48.98>Said <00:49.76>don't <00:50.54>be <00:51.32>a<00:52.10>fraid <00:52.88>if <00:53.66>I'm <00:54.44>gon<00:55.22>na <00:56.00>trou<00:56.78>ble <00:57.56>the <00:58.34>wa<00:59.12>ter.

[Outro]
01:03.40 (Thank you for singing with Karaoke Composer!)
`

export const wadeInTheWater: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
