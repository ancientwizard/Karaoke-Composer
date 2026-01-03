/**
 * Golden Slippers
 *
 * Written by James A. Bland
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Golden Slippers
@artist: James A. Bland
@duration: 02:50.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>Oh <00:01.20>my <00:01.80>dar<00:02.40>ling <00:03.00>oh <00:03.60>my <00:04.20>dar<00:04.80>ling,
00:05.40 <00:05.40>Oh <00:06.00>my <00:06.60>dar<00:07.20>ling <00:07.80>Clem<00:08.40>en<00:09.00>tine,
00:09.60 <00:09.60>You <00:10.20>are <00:10.80>lost <00:11.40>and <00:12.00>gone <00:12.60>for<00:13.20>ev<00:13.80>er,
00:14.40 <00:14.40>Dread<00:15.00>ful <00:15.60>sor<00:16.20>ry <00:16.80>Clem<00:17.40>en<00:18.00>tine.

[Verse 2]
00:18.60 <00:18.60>Oh <00:19.20>those <00:19.80>gold<00:20.40>en <00:21.00>slip<00:21.60>pers <00:22.20>all <00:22.80>so <00:23.40>bright,
00:24.00 <00:24.00>All <00:24.60>so <00:25.20>bright <00:25.80>and <00:26.40>shin<00:27.00>ing <00:27.60>new,
00:28.20 <00:28.20>Oh <00:28.80>those <00:29.40>gold<00:30.00>en <00:30.60>slip<00:31.20>pers <00:31.80>all <00:32.40>so <00:33.00>bright,
00:33.60 <00:33.60>Oh <00:34.20>them <00:34.80>gold<00:35.40>en <00:36.00>slip<00:36.60>pers <00:37.20>for <00:37.80>me <00:38.40>and <00:39.00>you.

[Outro]
00:45.30 (Thank you for singing with Karaoke Composer!)
`

export const goldenSlippers: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
