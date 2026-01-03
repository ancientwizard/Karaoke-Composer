/**
 * What a Friend We Have in Jesus
 *
 * Lyrics by Joseph Scriven, music by Charles Converse
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: What a Friend We Have in Jesus
@artist: Joseph Scriven & Charles Converse
@duration: 03:40.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.70 <00:01.70>What <00:02.56>a <00:03.42>friend <00:04.28>we <00:05.14>have <00:06.00>in <00:06.86>Je<00:07.72>sus,
00:08.58 <00:08.58>All <00:09.44>our <00:10.30>sins <00:11.16>and <00:12.02>griefs <00:12.88>to <00:13.74>bear,
00:14.60 <00:14.60>What <00:15.46>a <00:16.32>priv<00:17.18>i<00:18.04>lege <00:18.90>to <00:19.76>car<00:20.62>ry,
00:21.48 <00:21.48>Ev<00:22.34>ry<00:23.20>thing <00:24.06>to <00:24.92>God <00:25.78>in <00:26.64>prayer.

[Verse 2]
00:27.50 <00:27.50>Have <00:28.36>we <00:29.22>tri<00:30.08>als <00:30.94>and <00:31.80>temp<00:32.66>ta<00:33.52>tions,
00:34.38 <00:34.38>Is <00:35.24>there <00:36.10>trou<00:36.96>ble <00:37.82>an<00:38.68>y<00:39.54>where,
00:40.40 <00:40.40>We <00:41.26>should <00:42.12>nev<00:42.98>er <00:43.84>be <00:44.70>dis<00:45.56>cour<00:46.42>aged,
00:47.28 <00:47.28>Take <00:48.14>it <00:48.99>to <00:49.86>the <00:50.72>Lord <00:51.58>in <00:52.44>prayer.

[Verse 3]
00:53.30 <00:53.30>Are <00:54.16>we <00:55.02>weak <00:55.88>and <00:56.74>heav<00:57.60>y <00:58.46>la<00:59.32>den,
01:00.18 <01:00.18>Cum<01:01.04>bered <01:01.90>with <01:02.76>a <01:03.62>load <01:04.48>of <01:05.34>care,
01:06.20 <01:06.20>Pre<01:07.06>cious <01:07.92>Sav<01:08.78>ior <01:09.64>still <01:10.50>our <01:11.36>ref<01:12.22>uge,
01:13.08 <01:13.08>Take <01:13.94>it <01:14.80>to <01:15.66>the <01:16.52>Lord <01:17.38>in <01:18.24>prayer.

[Outro]
01:22.80 (Thank you for singing with Karaoke Composer!)
`

export const whatAFriendWeHaveInJesus: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
