/**
 * Tenting on the Old Camp Ground
 *
 * Written by Walter Kittredge
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Tenting on the Old Camp Ground
@artist: Walter Kittredge
@duration: 03:55.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>We're <00:02.28>tent<00:03.06>ing <00:03.84>to<00:04.62>night <00:05.40>on <00:06.18>the <00:06.96>old <00:07.74>camp <00:08.52>ground,
00:09.30 <00:09.30>Give <00:10.08>us <00:10.86>a <00:11.64>song <00:12.42>to <00:13.20>cheer <00:13.98>our <00:14.76>wea<00:15.54>ry <00:16.32>hearts,
00:17.10 <00:17.10>As <00:17.88>we <00:18.66>sit <00:19.44>here <00:20.22>a<00:21.00>round <00:21.78>the <00:22.56>camp<00:23.34>fire <00:24.12>glow,
00:24.90 <00:24.90>Talk <00:25.68>of <00:26.46>home <00:27.24>and <00:28.02>friends <00:28.80>we <00:29.58>know.

[Chorus]
00:30.36 <00:30.36>Man<00:31.14>y <00:31.92>are <00:32.70>the <00:33.48>hearts <00:34.26>that <00:35.04>are <00:35.82>wea<00:36.60>ry <00:37.38>to<00:38.16>night,
00:38.94 <00:38.94>Man<00:39.72>y <00:40.50>are <00:41.28>the <00:42.06>hearts <00:42.84>that <00:43.62>are <00:44.40>wea<00:45.18>ry <00:45.96>to<00:46.74>night,
00:47.52 <00:47.52>Wish<00:48.30>ing <00:49.08>for <00:49.86>the <00:50.64>war <00:51.42>to <00:52.20>cease,
00:52.98 <00:52.98>Man<00:53.76>y <00:54.54>are <00:55.32>the <00:56.10>hearts <00:56.88>look<00:57.66>ing <00:58.44>for <00:59.22>peace.

[Verse 2]
01:00.00 <01:00.00>We've <01:00.78>been <01:01.56>tent<01:02.34>ing <01:03.12>on <01:03.90>the <01:04.68>old <01:05.46>camp <01:06.24>ground,
01:07.02 <01:07.02>Slow<01:07.80>ly <01:08.58>we <01:09.36>pass <01:10.14>the <01:10.92>hea<01:11.70>vy <01:12.48>night,
01:13.26 <01:13.26>Wait<01:14.04>ing <01:14.82>for <01:15.60>the <01:16.38>com<01:17.16>ing <01:17.94>morn<01:18.72>ing,
01:19.50 <01:19.50>When <01:20.28>the <01:21.06>dawn <01:21.84>will <01:22.62>bring <01:23.40>its <01:24.18>light.

[Outro]
01:29.20 (Thank you for singing with Karaoke Composer!)
`

export const tentingOnTheOldCampGround: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
