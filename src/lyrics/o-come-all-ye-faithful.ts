/**
 * O Come All Ye Faithful
 *
 * Latin hymn (1743), English words by Frederick Oakeley (1841)
 * Public domain
 *
 * Tempo: ~100 BPM (quarter note = 600ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: O Come All Ye Faithful
@artist: Frederick Oakeley & John Reading
@duration: 02:05.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.20 <00:01.20>O <00:01.95>come, <00:02.70>all <00:03.45>ye <00:04.20>faith<00:04.95>ful,
00:05.70 <00:05.70>Joy<00:06.45>ful <00:07.20>and <00:07.95>tri<00:08.70>um<00:09.45>phant,
00:10.20 <00:10.20>O <00:10.95>come <00:11.70>ye, <00:12.45>O <00:13.20>come <00:13.95>ye <00:14.70>to <00:15.45>Beth<00:16.20>le<00:16.95>hem.

[Verse 2]
00:17.70 <00:17.70>Come <00:18.45>and <00:19.20>be<00:19.95>hold <00:20.70>him,
00:21.45 <00:21.45>Born <00:22.20>the <00:22.95>King <00:23.70>of <00:24.45>an<00:25.20>gels.
00:25.95 <00:25.95>O <00:26.70>come, <00:27.45>let <00:28.20>us <00:28.95>a<00:29.70>dore <00:30.45>him,
00:31.20 <00:31.20>O <00:31.95>come, <00:32.70>let <00:33.45>us <00:34.20>a<00:34.95>dore <00:35.70>him,
00:36.45 <00:36.45>O <00:37.20>come, <00:37.95>let <00:38.70>us <00:39.45>a<00:40.20>dore <00:40.95>him,
00:41.70 <00:41.70>Christ <00:42.45>the <00:43.20>Lord.

[Outro]
00:46.00 (Thank you for singing with Karaoke Composer!)
`

export const oComeAllYeFaithful: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
