/**
 * Auld Lang Syne
 *
 * Scottish poem by Robert Burns (1788)
 * Public domain
 *
 * Tempo: ~100 BPM (quarter note = 600ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Auld Lang Syne
@artist: Robert Burns
@duration: 02:20.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.20 <00:01.20>Should <00:01.95>auld <00:02.70>ac<00:03.45>quain<00:04.20>tance <00:04.95>be <00:05.70>for<00:06.45>got,
00:07.20 <00:07.20>and <00:07.95>nev<00:08.70>er <00:09.45>brought <00:10.20>to <00:10.95>mind?
00:11.70 <00:11.70>Should <00:12.45>auld <00:13.20>ac<00:13.95>quain<00:14.70>tance <00:15.45>be <00:16.20>for<00:16.95>got,
00:17.70 <00:17.70>and <00:18.45>au<00:19.20>ld <00:19.95>lang <00:20.70>syne?

[Refrain]
00:21.45 <00:21.45>For <00:22.20>auld <00:22.95>lang <00:23.70>syne, <00:24.70>my <00:25.45>jo,
00:26.20 <00:26.20>For <00:26.95>auld <00:27.70>lang <00:28.45>syne.
00:29.20 <00:29.20>We'll <00:29.95>take <00:30.70>a <00:31.45>cup <00:32.20>o' <00:32.95>kind<00:33.70>ness <00:34.45>yet,
00:35.20 <00:35.20>For <00:35.95>auld <00:36.70>lang <00:37.45>syne.

[Outro]
00:40.00 (Thank you for singing with Karaoke Composer!)
`

export const auldLangSyne: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
