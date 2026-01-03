/**
 * Doxology
 *
 * Lyrics by Thomas Ken, music by Louis Bourgeois
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Doxology
@artist: Thomas Ken & Louis Bourgeois
@duration: 01:45.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.30 <00:01.30>Praise <00:02.05>God <00:02.80>from <00:03.55>whom <00:04.30>all <00:05.05>bless<00:05.80>ings <00:06.55>flow,
00:07.30 <00:07.30>Praise <00:08.05>Him <00:08.80>all <00:09.55>crea<00:10.30>tures <00:11.05>here <00:11.80>be<00:12.55>low,
00:13.30 <00:13.30>Praise <00:14.05>Him <00:14.80>a<00:15.55>bove <00:16.30>ye <00:17.05>heav<00:17.80>en<00:18.55>ly <00:19.30>host,
00:20.05 <00:20.05>Praise <00:20.80>Fa<00:21.55>ther, <00:22.30>Son, <00:23.05>and <00:23.80>Ho<00:24.55>ly <00:25.30>Ghost.

[Outro]
00:28.30 (Thank you for singing with Karaoke Composer!)
`

export const doxology: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
