/**
 * Yankee Doodle Dandy
 *
 * Traditional American folk song (extended version)
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Yankee Doodle Dandy
@artist: Traditional American (Extended)
@duration: 02:50.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 120 BPM)

[Verse 1]
00:00.90 <00:00.90>Yan<00:01.35>kee <00:01.80>Doo<00:02.25>dle <00:02.70>came <00:03.15>to <00:03.60>town
00:04.05 <00:04.05>A<00:04.50>rid<00:04.95>ing <00:05.40>on <00:05.85>a <00:06.30>po<00:06.75>ny,
00:07.20 <00:07.20>Stuck <00:07.65>a <00:08.10>feath<00:08.55>er <00:09.00>in <00:09.45>his <00:09.90>cap
00:10.35 <00:10.35>And <00:10.80>called <00:11.25>it <00:11.70>mac<00:12.15>a<00:12.60>ro<00:13.05>ni.

[Verse 2]
00:13.50 <00:13.50>Yan<00:13.95>kee <00:14.40>Doo<00:14.85>dle, <00:15.30>fath <00:15.75>so <00:16.20>fine,
00:16.65 <00:16.65>Yan<00:17.10>kee <00:17.55>Doo<00:18.00>dle <00:18.45>dan<00:18.90>dy,
00:19.35 <00:19.35>Mind <00:19.80>the <00:20.25>mu<00:20.70>sic <00:21.15>and <00:21.60>the <00:22.05>step,
00:22.50 <00:22.50>And <00:22.95>with <00:23.40>the <00:23.85>girls <00:24.30>be <00:24.75>hand<00:25.20>y.

[Verse 3]
00:25.65 <00:25.65>I <00:26.10>went <00:26.55>down <00:27.00>to <00:27.45>camp
00:27.90 <00:27.90>A<00:28.35>long <00:28.80>with <00:29.25>Cap<00:29.70>tain <00:30.15>Good<00:30.60>win,
00:31.05 <00:31.05>And <00:31.50>there <00:31.95>we <00:32.40>saw <00:32.85>a <00:33.30>thou<00:33.75>sand <00:34.20>men
00:34.65 <00:34.65>As <00:35.10>rich <00:35.55>as <00:36.00>Squire <00:36.45>Da<00:36.90>vid's <00:37.35>ox<00:37.80>en.

[Verse 4]
00:38.25 <00:38.25>And <00:38.70>there <00:39.15>we <00:39.60>saw <00:40.05>a <00:40.50>swathe <00:40.95>of <00:41.40>men
00:41.85 <00:41.85>With <00:42.30>coats <00:42.75>of <00:43.20>blue <00:43.65>and <00:44.10>buff<00:44.55>ton,
00:45.00 <00:45.00>It <00:45.45>scared <00:45.90>me <00:46.35>so, <00:46.80>I <00:47.25>ran <00:47.70>a<00:48.15>way
00:48.60 <00:48.60>And <00:49.05>lost <00:49.50>my <00:49.95>fall<00:50.40>ing <00:50.85>gut<00:51.30>tons.

[Outro]
00:55.20 (Thank you for singing with Karaoke Composer!)
`

export const yankeeDoodleDandy: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
