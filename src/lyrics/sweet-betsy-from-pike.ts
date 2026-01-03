/**
 * Sweet Betsy from Pike
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Sweet Betsy from Pike
@artist: Traditional American
@duration: 03:15.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>Oh <00:01.20>do <00:01.80>you <00:02.40>re<00:03.00>mem<00:03.60>ber <00:04.20>Sweet <00:04.80>Bet<00:05.40>sy <00:06.00>from <00:06.60>Pike,
00:07.20 <00:07.20>Who <00:07.80>crossed <00:08.40>the <00:09.00>wide <00:09.60>prai<00:10.20>ries <00:10.80>with <00:11.40>her <00:12.00>lov<00:12.60>er <00:13.20>Ike,
00:13.80 <00:13.80>With <00:14.40>two <00:15.00>yoke <00:15.60>of <00:16.20>ox<00:16.80>en <00:17.40>and <00:18.00>one <00:18.60>spot<00:19.20>ted <00:19.80>hog,
00:20.40 <00:20.40>A <00:21.00>tall <00:21.60>Chi<00:22.20>ne<00:22.80>se <00:23.40>mule <00:24.00>and <00:24.60>an <00:25.20>old <00:25.80>yel<00:26.40>low <00:27.00>dog.

[Verse 2]
00:27.60 <00:27.60>One <00:28.20>eve<00:28.80>ning <00:29.40>quite <00:30.00>ear<00:30.60>ly <00:31.20>they <00:31.80>camped <00:32.40>on <00:33.00>the <00:33.60>Platte,
00:34.20 <00:34.20>'Twas <00:34.80>nigh <00:35.40>to <00:36.00>the <00:36.60>road <00:37.20>on <00:37.80>a <00:38.40>green <00:39.00>bot<00:39.60>tom <00:40.20>flat,
00:40.80 <00:40.80>With <00:41.40>salt, <00:42.00>pork <00:42.60>and <00:43.20>beans <00:43.80>and <00:44.40>lots <00:45.00>of <00:45.60>frye,
00:46.20 <00:46.20>And <00:46.80>Bet<00:47.40>sy <00:48.00>said <00:48.60>good<00:49.20>bye <00:49.80>Pike <00:50.40>coun<00:51.00>try <00:51.60>good<00:52.20>bye.

[Chorus]
00:52.80 <00:52.80>Sing <00:53.40>toor<00:54.00>a <00:54.60>loor <00:55.20>a, <00:55.80>sing <00:56.40>toor<00:57.00>a <00:57.60>lay,
00:58.20 <00:58.20>Sing <00:58.80>toor<00:59.40>a <01:00.00>loor <01:00.60>a, <01:01.20>sing <01:01.80>toor<01:02.40>a <01:03.00>lay.

[Outro]
01:08.50 (Thank you for singing with Karaoke Composer!)
`

export const sweetBetsyFromPike: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
