/**
 * The Old Hundred
 *
 * Lyrics by William Kethe, music by Louis Bourgeois
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: The Old Hundred
@artist: William Kethe & Louis Bourgeois
@duration: 02:10.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.40 <00:01.40>All <00:02.16>peo<00:02.92>ple <00:03.68>that <00:04.44>on <00:05.20>earth <00:05.96>do <00:06.72>dwell,
00:07.48 <00:07.48>Sing <00:08.24>to <00:09.00>the <00:09.76>Lord <00:10.52>with <00:11.28>cheer<00:12.04>ful <00:12.80>voice.
00:13.56 <00:13.56>Him <00:14.32>serve <00:15.08>with <00:15.84>fear, <00:16.60>his <00:17.36>praise <00:18.12>forth <00:18.88>tell,
00:19.64 <00:19.64>Come <00:20.40>ye <00:21.16>be<00:21.92>fore <00:22.68>him <00:23.44>and <00:24.20>re<00:24.96>joice.

[Verse 2]
00:25.72 <00:25.72>Know <00:26.48>that <00:27.24>the <00:28.00>Lord <00:28.76>is <00:29.52>God <00:30.28>in<00:31.04>deed,
00:31.80 <00:31.80>With<00:32.56>out <00:33.32>our <00:34.08>aid <00:34.84>he <00:35.60>all <00:36.36>things <00:37.12>made,
00:37.88 <00:37.88>We <00:38.64>are <00:39.40>his <00:40.16>flock, <00:40.92>he <00:41.68>doth <00:42.44>us <00:43.20>feed,
00:43.96 <00:43.96>And <00:44.72>for <00:45.48>his <00:46.24>sheep <00:47.00>he <00:47.76>doth <00:48.52>us <00:49.28>shade.

[Outro]
00:52.40 (Thank you for singing with Karaoke Composer!)
`

export const theOldHundred: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
