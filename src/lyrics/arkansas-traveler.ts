/**
 * Arkansas Traveler
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Arkansas Traveler
@artist: Traditional American
@duration: 02:40.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>Oh, <00:01.20>once <00:01.80>there <00:02.40>was <00:03.00>a <00:03.60>trav<00:04.20>el<00:04.80>er,
00:05.40 <00:05.40>From <00:06.00>Ar<00:06.60>kan<00:07.20>sas <00:07.80>I <00:08.40>did <00:09.00>come,
00:09.60 <00:09.60>I <00:10.20>rode <00:10.80>up<00:11.40>on <00:12.00>a <00:12.60>cab<00:13.20>in <00:13.80>door<00:14.40>way,
00:15.00 <00:15.00>On <00:15.60>a <00:16.20>rainy <00:16.80>sum<00:17.40>mer <00:18.00>day.

[Verse 2]
00:18.60 <00:18.60>Oh, <00:19.20>sad<00:19.80>dle <00:20.40>up <00:21.00>and <00:21.60>let's <00:22.20>go, <00:22.80>come <00:23.40>a <00:24.00>rid<00:24.60>ing,
00:25.20 <00:25.20>While <00:25.80>the <00:26.40>wind <00:27.00>blows <00:27.60>free <00:28.20>and <00:28.80>the <00:29.40>stars <00:30.00>do <00:30.60>shine,
00:31.20 <00:31.20>We'll <00:31.80>ride <00:32.40>all <00:33.00>a<00:33.60>long <00:34.20>the <00:34.80>Ar<00:35.40>kan<00:36.00>sas <00:36.60>trail<00:37.20>er,
00:37.80 <00:37.80>Where <00:38.40>the <00:39.00>riv<00:39.60>ers <00:40.20>twist <00:40.80>and <00:41.40>wind.

[Outro]
00:47.20 (Thank you for singing with Karaoke Composer!)
`

export const arkansasTraveler: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
