/**
 * We Gather Together
 *
 * Traditional hymn
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: We Gather Together
@artist: Kremser & Alwin
@duration: 02:55.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.50 <00:01.50>We <00:02.35>gath<00:03.20>er <00:04.05>to<00:04.90>geth<00:05.75>er <00:06.60>to <00:07.45>ask <00:08.30>the <00:09.15>Lord's <00:10.00>bless<00:10.85>ing,
00:11.70 <00:11.70>He <00:12.55>chas<00:13.40>tens <00:14.25>and <00:15.10>hast<00:15.95>ens <00:16.80>his <00:17.65>will <00:18.50>to <00:19.35>make <00:20.20>known,
00:21.05 <00:21.05>The <00:21.90>wick<00:22.75>ed <00:23.60>op<00:24.45>press<00:25.30>ing <00:26.15>now <00:27.00>cease <00:27.85>from <00:28.70>dis<00:29.55>tress<00:30.40>ing,
00:31.25 <00:31.25>Sing <00:32.10>prais<00:32.95>es <00:33.80>to <00:34.65>His <00:35.50>name, <00:36.35>He <00:37.20>for<00:38.05>gets <00:38.90>not <00:39.75>His <00:40.60>own.

[Verse 2]
00:41.45 <00:41.45>Be<00:42.30>side <00:43.15>us <00:44.00>to <00:44.85>guide <00:45.70>us, <00:46.55>our <00:47.40>God <00:48.25>with <00:49.10>us <00:49.95>join<00:50.80>ing,
00:51.65 <00:51.65>Or<00:52.50>dain<00:53.35>ing, <00:54.20>main<00:55.05>tain<00:55.90>ing <00:56.75>His <00:57.60>king<00:58.45>dom <00:59.30>di<01:00.15>vine,
01:01.00 <01:01.00>So <01:01.85>from <01:02.70>the <01:03.55>be<01:04.40>gin<01:05.25>ning <01:06.10>the <01:06.95>fight <01:07.80>we <01:08.65>were <01:09.50>win<01:10.35>ning,
01:11.20 <01:11.20>Thou, <01:12.05>Lord, <01:12.90>wast <01:13.75>at <01:14.60>our <01:15.45>side, <01:16.30>all <01:17.15>glo<01:18.00>ry <01:18.85>be <01:19.70>Thine!

[Outro]
01:23.20 (Thank you for singing with Karaoke Composer!)
`

export const weGatherTogether: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
