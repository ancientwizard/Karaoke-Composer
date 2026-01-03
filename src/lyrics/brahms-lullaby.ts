/**
 * Brahms Lullaby
 *
 * Composed by Johannes Brahms
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Brahms Lullaby
@artist: Johannes Brahms
@duration: 02:35.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:02.00 <00:02.00>Lul<00:02.88>la<00:03.75>by <00:04.63>and <00:05.50>good<00:06.38>night,
00:07.25 <00:07.25>With <00:08.13>ros<00:09.00>es <00:09.88>be<00:10.75>dight,
00:11.63 <00:11.63>With <00:12.50>lil<00:13.38>ies <00:14.25>o'<00:15.13>spread,
00:16.00 <00:16.00>Is <00:16.88>my <00:17.75>ba<00:18.63>by's <00:19.50>bed.

[Verse 2]
00:20.38 <00:20.38>Lay <00:21.25>thee <00:22.13>down <00:23.00>now <00:23.88>and <00:24.75>rest,
00:25.63 <00:25.63>May <00:26.50>thy <00:27.38>slum<00:28.25>ber <00:29.13>be <00:30.00>blessed,
00:30.88 <00:30.88>Lay <00:31.75>thee <00:32.63>down <00:33.50>now <00:34.38>and <00:35.25>rest,
00:36.13 <00:36.13>May <00:37.00>thy <00:37.88>slum<00:38.75>ber <00:39.63>be <00:40.50>blessed.

[Verse 3]
00:41.38 <00:41.38>Gar<00:42.25>den <00:43.13>roses <00:44.00>pale,
00:44.88 <00:44.88>Gen<00:45.75>tle <00:46.63>lil<00:47.50>ies <00:48.38>in <00:49.25>gale,
00:50.13 <00:50.13>Whisp<00:51.00>er <00:51.88>soft <00:52.75>and <00:53.63>sweet,
00:54.50 <00:54.50>Sleep <00:55.38>now <00:56.25>safe <00:57.13>and <00:58.00>sweet.

[Outro]
01:02.40 (Thank you for singing with Karaoke Composer!)
`

export const brahmsLullaby: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
