/**
 * Turn Back O Man
 *
 * Lyrics by Clifford Bax, music by Royce Saltzman
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Turn Back O Man
@artist: Clifford Bax & Royce Saltzman
@duration: 02:40.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.40 <00:01.40>Turn <00:02.18>back, <00:02.96>O <00:03.74>man, <00:04.52>for<00:05.30>swear <00:06.08>thy <00:06.86>fool<00:07.64>ish <00:08.42>ways;
00:09.20 <00:09.20>Old <00:09.98>now <00:10.76>is <00:11.54>earth <00:12.32>and <00:13.10>none <00:13.88>may <00:14.66>count <00:15.44>her <00:16.22>days,
00:17.00 <00:17.00>Yet <00:17.78>thou, <00:18.56>her <00:19.34>child, <00:20.12>whose <00:20.90>head <00:21.68>is <00:22.46>crowned <00:23.24>with <00:24.02>flame,
00:24.80 <00:24.80>Still <00:25.58>wilt <00:26.36>not <00:27.14>hear <00:27.92>thine <00:28.70>earth<00:29.48>ly <00:30.26>shame.

[Verse 2]
00:31.04 <00:31.04>Earth <00:31.82>might <00:32.60>be <00:33.38>fair <00:34.16>and <00:34.94>all <00:35.72>her <00:36.50>peo<00:37.28>ple <00:38.06>one;
00:38.84 <00:38.84>Nor <00:39.62>till <00:40.40>that <00:41.18>hour <00:41.96>shall <00:42.74>God's <00:43.52>whole <00:44.30>will <00:45.08>be <00:45.86>done.
00:46.64 <00:46.64>Now, <00:47.42>ev<00:48.20>en <00:48.98>now, <00:49.76>once <00:50.54>more <00:51.32>from <00:52.10>heav<00:52.88>en's <00:53.66>height,
00:54.44 <00:54.44>God's <00:55.22>youth <00:56.00>a<00:56.78>cross <00:57.56>the <00:58.34>world <00:59.12>comes <00:59.90>down <01:00.68>to<00:01.46>night.

[Outro]
01:04.20 (Thank you for singing with Karaoke Composer!)
`

export const turnBackOMan: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
