/**
 * Home Sweet Home
 *
 * Lyrics by John Howard Payne, music by Henry Rowley Bishop
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Home Sweet Home
@artist: John Howard Payne & Henry Rowley Bishop
@duration: 03:20.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.50 <00:01.50>'Mid <00:02.28>pleas<00:03.06>ures <00:03.84>and <00:04.62>pal<00:05.40>ac<00:06.18>es
00:06.96 <00:06.96>Though <00:07.74>we <00:08.52>may <00:09.30>roam,
00:10.08 <00:10.08>Be <00:10.86>it <00:11.64>ev<00:12.42>er <00:13.20>so <00:13.98>hum<00:14.76>ble,
00:15.54 <00:15.54>There's <00:16.32>no <00:17.10>place <00:17.88>like <00:18.66>home.

[Chorus]
00:19.44 <00:19.44>Home, <00:20.22>home, <00:21.22>sweet <00:22.00>sweet <00:22.78>home,
00:23.56 <00:23.56>There's <00:24.34>no <00:25.12>place <00:25.90>like <00:26.68>home,
00:27.46 <00:27.46>Home, <00:28.24>home, <00:29.24>sweet <00:30.02>sweet <00:30.80>home,
00:31.58 <00:31.58>There's <00:32.36>no <00:33.14>place <00:33.92>like <00:34.70>home.

[Verse 2]
00:35.48 <00:35.48>An <00:36.26>ex<00:37.04>ile <00:37.82>from <00:38.60>home <00:39.38>pleas<00:40.16>ure
00:40.94 <00:40.94>I <00:41.72>long <00:42.50>to <00:43.28>see,
00:44.06 <00:44.06>Yet <00:44.84>well <00:45.62>I <00:46.40>know <00:47.18>no <00:47.96>earth<00:48.74>ly <00:49.52>pleas<00:50.30>ure
00:51.08 <00:51.08>Is <00:51.86>wor<00:52.64>thy <00:53.42>me.

[Verse 3]
00:54.20 <00:54.20>I <00:54.98>grant <00:55.76>it <00:56.54>can <00:57.32>af<00:58.10>ford <00:58.88>some <00:59.66>ease,
01:00.44 <01:00.44>To <01:01.22>hearts <01:02.00>which <01:02.78>ne'er <01:03.56>were <01:04.34>blest,
01:05.12 <01:05.12>But <01:05.90>sure <01:06.68>to <01:07.46>go <01:08.24>and <01:09.02>find <01:09.80>peace <01:10.58>in <01:11.36>rest,
01:12.14 <01:12.14>Yet <01:12.92>give <01:13.70>me <01:14.48>my <01:15.26>low<01:16.04>ly <01:16.82>thresh<01:17.60>old.

[Outro]
01:21.80 (Thank you for singing with Karaoke Composer!)
`

export const homeSweetHome: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
