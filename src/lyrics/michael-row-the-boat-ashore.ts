/**
 * Michael Row the Boat Ashore
 *
 * Traditional spiritual
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Michael Row the Boat Ashore
@artist: Traditional Spiritual
@duration: 02:50.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.60 <00:01.60>Mi<00:02.38>chael <00:03.16>row <00:03.94>the <00:04.72>boat <00:05.50>a<00:06.28>shore, <00:07.06>hal<00:07.84>le<00:08.62>lu<00:09.40>jah!
00:10.18 <00:10.18>Mi<00:10.96>chael <00:11.74>row <00:12.52>the <00:13.30>boat <00:14.08>a<00:14.86>shore, <00:15.64>hal<00:16.42>le<00:17.20>lu<00:17.98>jah!

[Chorus]
00:18.76 <00:18.76>Hal<00:19.54>le<00:20.32>lu<00:21.10>jah! <00:21.88>Hal<00:22.66>le<00:23.44>lu<00:24.22>jah!
00:25.00 <00:25.00>Hal<00:25.78>le<00:26.56>lu<00:27.34>jah! <00:28.12>Hal<00:28.90>le<00:29.68>lu<00:30.46>jah!

[Verse 2]
00:31.24 <00:31.24>Mi<00:32.02>chael's <00:32.80>boat <00:33.58>is <00:34.36>a <00:35.14>gos<00:35.92>pel <00:36.70>boat, <00:37.48>hal<00:38.26>le<00:39.04>lu<00:39.82>jah!
00:40.60 <00:40.60>Mi<00:41.38>chael's <00:42.16>boat <00:42.94>is <00:43.72>a <00:44.50>gos<00:45.28>pel <00:46.06>boat, <00:46.84>hal<00:47.62>le<00:48.40>lu<00:49.18>jah!

[Verse 3]
00:49.96 <00:49.96>Sis<00:50.74>ter, <00:51.52>help <00:52.30>to <00:53.08>trim <00:53.86>the <00:54.64>sail, <00:55.42>hal<00:56.20>le<00:56.98>lu<00:57.76>jah!
00:58.54 <00:58.54>Sis<00:59.32>ter, <01:00.10>help <01:00.88>to <01:01.66>trim <01:02.44>the <01:03.22>sail, <01:04.00>hal<01:04.78>le<01:05.56>lu<01:06.34>jah!

[Outro]
01:10.60 (Thank you for singing with Karaoke Composer!)
`

export const michaelRowTheBoatAshore: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
