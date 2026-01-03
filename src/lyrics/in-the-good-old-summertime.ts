/**
 * In the Good Old Summertime
 *
 * Lyrics by Ren Shields, music by George Evans
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: In the Good Old Summertime
@artist: Ren Shields & George Evans
@duration: 02:50.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>In <00:01.20>the <00:01.80>good <00:02.40>old <00:03.00>sum<00:03.60>mer<00:04.20>time,
00:04.80 <00:04.80>When <00:05.40>you <00:06.00>were <00:06.60>mine,
00:07.20 <00:07.20>In <00:07.80>the <00:08.40>good <00:09.00>old <00:09.60>sum<00:10.20>mer<00:10.80>time,
00:11.40 <00:11.40>When <00:12.00>you <00:12.60>were <00:13.20>a <00:13.80>sweet <00:14.40>Val<00:15.00>en<00:15.60>tine.

[Verse 2]
00:16.20 <00:16.20>We <00:16.80>would <00:17.40>make <00:18.00>love <00:18.60>each <00:19.20>day <00:19.80>by <00:20.40>the <00:21.00>pretty <00:21.60>flow<00:22.20>ers,
00:22.80 <00:22.80>By <00:23.40>the <00:24.00>shel<00:24.60>tered <00:25.20>hill,
00:25.80 <00:25.80>By <00:26.40>the <00:27.00>shel<00:27.60>tered <00:28.20>hill <00:28.80>by <00:29.40>the <00:30.00>flow<00:30.60>ers,
00:31.20 <00:31.20>And <00:31.80>you <00:32.40>taught <00:33.00>me <00:33.60>to <00:34.20>love <00:34.80>you <00:35.40>still.

[Chorus]
00:36.00 <00:36.00>Ev<00:36.60>ery <00:37.20>min<00:37.80>ute <00:38.40>seemed <00:39.00>like <00:39.60>hon<00:40.20>eys <00:40.80>moon <00:41.40>to <00:42.00>me,
00:42.60 <00:42.60>In <00:43.20>your <00:43.80>heart <00:44.40>I <00:45.00>found <00:45.60>heav<00:46.20>en <00:46.80>will <00:47.40>be,
00:48.00 <00:48.00>In <00:48.60>the <00:49.20>good <00:49.80>old <00:50.40>sum<00:51.00>mer<00:51.60>time <00:52.20>by <00:52.80>the <00:53.40>wa<00:54.00>ter<00:54.60>side,
00:55.20 <00:55.20>Where <00:55.80>you <00:56.40>loved <00:57.00>me <00:57.60>so <00:58.20>dear<00:58.80>ly <00:59.40>that <01:00.00>you <01:00.60>were <01:01.20>mine.

[Outro]
01:07.40 (Thank you for singing with Karaoke Composer!)
`

export const inTheGoodOldSummertime: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
