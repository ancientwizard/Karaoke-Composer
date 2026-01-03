/**
 * All Through the Night
 *
 * Lyrics by Harold Boulton & John Ceiriog Hughes
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: All Through the Night
@artist: Harold Boulton & John Ceiriog Hughes
@duration: 03:10.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.50 <00:01.50>Sleep, <00:02.35>my <00:03.20>child, <00:04.05>and <00:04.90>peace <00:05.75>at<00:06.60>tend <00:07.45>thee,
00:08.30 <00:08.30>All <00:09.15>through <00:10.00>the <00:10.85>night.
00:11.70 <00:11.70>Guard<00:12.55>ian <00:13.40>an<00:14.25>gels <00:15.10>God <00:15.95>will <00:16.80>send <00:17.65>thee,
00:18.50 <00:18.50>All <00:19.35>through <00:20.20>the <00:21.05>night.

[Verse 2]
00:21.90 <00:21.90>Soft <00:22.75>the <00:23.60>drow<00:24.45>sy <00:25.30>hours <00:26.15>are <00:27.00>creep<00:27.85>ing,
00:28.70 <00:28.70>Hill <00:29.55>and <00:30.40>vale <00:31.25>in <00:32.10>slum<00:32.95>ber <00:33.80>steep<00:34.65>ing,
00:35.50 <00:35.50>I <00:36.35>my <00:37.20>lov<00:38.05>ing <00:38.90>vig<00:39.75>il <00:40.60>keep<00:41.45>ing,
00:42.30 <00:42.30>All <00:43.15>through <00:44.00>the <00:44.85>night.

[Verse 3]
00:45.70 <00:45.70>While <00:46.55>the <00:47.40>moon <00:48.25>her <00:49.10>watch <00:49.95>is <00:50.80>keep<00:51.65>ing,
00:52.50 <00:52.50>All <00:53.35>through <00:54.20>the <00:55.05>night.
00:55.90 <00:55.90>While <00:56.75>the <00:57.60>wea<00:58.45>ry <00:59.30>world <01:00.15>is <01:01.00>sleep<01:01.85>ing,
01:02.70 <01:02.70>All <01:03.55>through <01:04.40>the <01:05.25>night.

[Outro]
01:09.40 (Thank you for singing with Karaoke Composer!)
`

export const allThroughTheNight: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
