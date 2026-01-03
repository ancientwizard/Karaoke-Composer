/**
 * Ring Around the Rosie
 *
 * Traditional nursery rhyme/song
 * Public domain
 *
 * Tempo: ~130 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Ring Around the Rosie
@artist: Traditional
@duration: 01:25.40

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 130 BPM)

[Verse 1]
00:00.70 <00:00.70>Ring <00:01.31>a<00:01.92>round <00:02.53>the <00:03.14>ros<00:03.75>ie,
00:04.36 <00:04.36>A <00:04.97>pock<00:05.58>et <00:06.19>full <00:06.80>of <00:07.41>pos<00:08.02>ies,
00:08.63 <00:08.63>Ash<00:09.24>es, <00:09.85>ash<00:10.46>es, <00:11.07>we <00:11.68>all <00:12.29>fall <00:12.90>down.

[Verse 2]
00:13.51 <00:13.51>The <00:14.12>mul<00:14.73>ber<00:15.34>ry <00:15.95>bush,
00:16.56 <00:16.56>The <00:17.17>mul<00:17.78>ber<00:18.39>ry <00:19.00>bush,
00:19.61 <00:19.61>Here <00:20.22>we <00:20.83>go <00:21.44>round <00:22.05>the <00:22.66>mul<00:23.27>ber<00:23.88>ry <00:24.49>bush,
00:25.10 <00:25.10>On <00:25.71>a <00:26.32>cold <00:26.93>and <00:27.54>frost<00:28.15>y <00:28.76>morn<00:29.37>ing.

[Outro]
00:35.40 (Thank you for singing with Karaoke Composer!)
`

export const ringAroundTheRosie: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
