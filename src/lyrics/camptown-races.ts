/**
 * Camptown Races
 *
 * Music by Stephen Foster
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Camptown Races
@artist: Stephen Foster
@duration: 02:35.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.80 <00:00.80>Camp<00:01.45>town <00:02.10>la<00:02.75>dies <00:03.40>sing <00:04.05>this <00:04.70>song,
00:05.35 <00:05.35>Doo<00:06.00>dah! <00:06.65>Doo<00:07.30>dah!
00:07.95 <00:07.95>Camp<00:08.60>town <00:09.25>racetrack <00:09.90>five <00:10.55>miles <00:11.20>long,
00:11.85 <00:11.85>Oh, <00:12.50>the <00:13.15>doo<00:13.80>dah <00:14.45>day.

[Chorus]
00:15.10 <00:15.10>Goin' <00:15.75>to <00:16.40>run <00:17.05>all <00:17.70>night,
00:18.35 <00:18.35>Goin' <00:19.00>to <00:19.65>run <00:20.30>all <00:20.95>day,
00:21.60 <00:21.60>I'll <00:22.25>bet <00:22.90>my <00:23.55>mon<00:24.20>ey <00:24.85>on <00:25.50>the <00:26.15>bob<00:26.80>tail <00:27.45>nag,
00:28.10 <00:28.10>Some<00:28.75>bod<00:29.40>y <00:30.05>bet <00:30.70>on <00:31.35>the <00:32.00>bay.

[Verse 2]
00:32.65 <00:32.65>The <00:33.30>long<00:33.95>tail <00:34.60>nag <00:35.25>and <00:35.90>the <00:36.55>big<00:37.20>black <00:37.85>horse,
00:38.50 <00:38.50>Doo<00:39.15>dah! <00:39.80>Doo<00:40.45>dah!
00:41.10 <00:41.10>They <00:41.75>fly <00:42.40>the <00:43.05>track <00:43.70>and <00:44.35>they <00:45.00>both <00:45.65>cut <00:46.30>a <00:46.95>loss,
00:47.60 <00:47.60>Oh, <00:48.25>the <00:48.90>doo<00:49.55>dah <00:50.20>day.

[Outro]
00:53.80 (Thank you for singing with Karaoke Composer!)
`

export const camptownRaces: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
