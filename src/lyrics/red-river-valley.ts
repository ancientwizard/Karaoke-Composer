/**
 * Red River Valley
 *
 * Traditional Canadian folk song
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Red River Valley
@artist: Traditional Canadian
@duration: 03:30.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>From <00:02.28>this <00:03.06>val<00:03.84>ley <00:04.62>they <00:05.40>say <00:06.18>you <00:06.96>are <00:07.74>go<00:08.52>ing,
00:09.30 <00:09.30>We <00:10.08>will <00:10.86>miss <00:11.64>your <00:12.42>bright <00:13.20>eyes <00:13.98>and <00:14.76>sweet <00:15.54>smile,
00:16.32 <00:16.32>For <00:17.10>they <00:17.88>say <00:18.66>you <00:19.44>are <00:20.22>tak<00:21.00>ing <00:21.78>the <00:22.56>sun<00:23.34>shine,
00:24.12 <00:24.12>That <00:24.90>has <00:25.68>bright<00:26.46>ened <00:27.24>our <00:28.02>path<00:28.80>way <00:29.58>a<00:30.36>while.

[Verse 2]
00:31.14 <00:31.14>From <00:31.92>this <00:32.70>val<00:33.48>ley <00:34.26>they <00:35.04>say <00:35.82>you <00:36.60>are <00:37.38>go<00:38.16>ing,
00:38.94 <00:38.94>When <00:39.72>you <00:40.50>go <00:41.28>may <00:42.06>your <00:42.84>days <00:43.62>be <00:44.40>so <00:45.18>gay,
00:45.96 <00:45.96>And <00:46.74>I <00:47.52>pray <00:48.30>when <00:49.08>in <00:49.86>that <00:50.64>far <00:51.42>a<00:52.20>way <00:52.98>val<00:53.76>ley,
00:54.54 <00:54.54>You <00:55.32>will <00:56.10>think <00:56.88>of <00:57.66>me <00:58.44>while <00:59.22>you're <01:00.00>far <01:00.78>a<01:01.56>way.

[Outro]
01:07.60 (Thank you for singing with Karaoke Composer!)
`

export const redRiverValley: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
