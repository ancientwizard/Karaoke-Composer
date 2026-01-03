/**
 * Were You There
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Were You There
@artist: Traditional Spiritual
@duration: 03:35.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.80 <00:01.80>Were <00:02.70>you <00:03.60>there <00:04.50>when <00:05.40>they <00:06.30>cru<00:07.20>ci<00:08.10>fied <00:09.00>my <00:09.90>Lord?
00:10.80 <00:10.80>Were <00:11.70>you <00:12.60>there <00:13.50>when <00:14.40>they <00:15.30>cru<00:16.20>ci<00:17.10>fied <00:18.00>my <00:18.90>Lord?
00:19.80 <00:19.80>Oh, <00:20.70>some<00:21.60>times <00:22.50>it <00:23.40>caus<00:24.30>es <00:25.20>me <00:26.10>to <00:27.00>trem<00:27.90>ble,
00:28.80 <00:28.80>trem<00:29.70>ble,
00:30.60 <00:30.60>Were <00:31.50>you <00:32.40>there <00:33.30>when <00:34.20>they <00:35.10>cru<00:36.00>ci<00:36.90>fied <00:37.80>my <00:38.70>Lord?

[Verse 2]
00:39.60 <00:39.60>Were <00:40.50>you <00:41.40>there <00:42.30>when <00:43.20>they <00:44.10>nailed <00:45.00>him <00:45.90>to <00:46.80>the <00:47.70>tree?
00:48.60 <00:48.60>Were <00:49.50>you <00:50.40>there <00:51.30>when <00:52.20>they <00:53.10>nailed <00:54.00>him <00:54.90>to <00:55.80>the <00:56.70>tree?
00:57.60 <00:57.60>Oh, <00:58.50>some<00:59.40>times <01:00.30>it <01:01.20>caus<01:02.10>es <01:03.00>me <01:03.90>to <01:04.80>trem<01:05.70>ble,
01:06.60 <01:06.60>trem<01:07.50>ble,
01:08.40 <01:08.40>Were <01:09.30>you <01:10.20>there <01:11.10>when <01:12.00>they <01:12.90>nailed <01:13.80>him <01:14.70>to <01:15.60>the <01:16.50>tree?

[Verse 3]
01:17.40 <01:17.40>Were <01:18.30>you <01:19.20>there <01:20.10>when <01:21.00>they <01:21.90>laid <01:22.80>him <01:23.70>in <01:24.60>the <01:25.50>tomb?
01:26.40 <01:26.40>Were <01:27.30>you <01:28.20>there <01:29.10>when <01:30.00>they <01:30.90>laid <01:31.80>him <01:32.70>in <01:33.60>the <01:34.50>tomb?
01:35.40 <01:35.40>Oh, <01:36.30>some<01:37.20>times <01:38.10>it <01:39.00>caus<01:39.90>es <01:40.80>me <01:41.70>to <01:42.60>trem<01:43.50>ble,
01:44.40 <01:44.40>trem<01:45.30>ble,
01:46.20 <01:46.20>Were <01:47.10>you <01:48.00>there <01:48.90>when <01:49.80>they <01:50.70>laid <01:51.60>him <01:52.50>in <01:53.40>the <01:54.30>tomb?

[Outro]
01:58.60 (Thank you for singing with Karaoke Composer!)
`

export const wereYouThere: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
