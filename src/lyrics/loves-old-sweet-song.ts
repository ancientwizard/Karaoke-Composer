/**
 * Love's Old Sweet Song
 *
 * Lyrics by G. Clifton Bingham, music by James Lyman Molloy
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Love's Old Sweet Song
@artist: G. Clifton Bingham & James Lyman Molloy
@duration: 03:35.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.70 <00:01.70>Once <00:02.56>in <00:03.42>the <00:04.28>dear <00:05.14>dead <00:06.00>days <00:06.86>be<00:07.72>yond <00:08.58>re<00:09.44>call,
00:10.30 <00:10.30>When <00:11.16>on <00:12.02>the <00:12.88>star<00:13.74>light <00:14.60>I <00:15.46>heard <00:16.32>you <00:17.18>call,
00:18.04 <00:18.04>And <00:18.90>the <00:19.76>stars <00:20.62>were <00:21.48>bright <00:22.34>a<00:23.20>bove <00:24.06>the <00:24.92>sea,
00:25.78 <00:25.78>Your <00:26.64>voice <00:27.50>to <00:28.36>me <00:29.22>was <00:30.08>pure <00:30.94>and <00:31.80>clear.

[Verse 2]
00:32.66 <00:32.66>I <00:33.52>have <00:34.38>for<00:35.24>got<00:36.10>ten <00:36.96>all <00:37.82>that <00:38.68>I <00:39.54>have <00:40.40>known,
00:41.26 <00:41.26>Oh <00:42.12>save <00:42.98>that <00:43.84>sweet <00:44.70>and <00:45.56>mu<00:46.42>sic <00:47.28>tone,
00:48.14 <00:48.14>A <00:49.00>voice <00:49.86>so <00:50.72>ten<00:51.58>der, <00:52.44>a <00:53.30>voice <00:54.16>so <00:55.02>true,
00:55.88 <00:55.88>As <00:56.74>long <00:57.60>as <00:58.46>life <00:59.32>and <01:00.18>lov<01:01.04>ing <01:01.90>you.

[Chorus]
01:02.76 <01:02.76>Pal <00:03.62>au<00:04.48>rel <01:05.34>da<01:06.20>li <01:07.06>in <01:07.92>thine <01:08.78>ears,
01:09.64 <01:09.64>Sweet <01:10.50>songs <01:11.36>of <01:12.22>love <01:13.08>to <01:13.94>light <01:14.80>the <01:15.66>years,
01:16.52 <01:16.52>Re<01:17.38>peat <01:18.24>it <01:19.10>old <01:19.96>love's <01:20.82>old <01:21.68>sweet <01:22.54>song.

[Outro]
01:28.80 (Thank you for singing with Karaoke Composer!)
`

export const lovesOldSweetSong: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
