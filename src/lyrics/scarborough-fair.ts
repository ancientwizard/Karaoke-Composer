/**
 * Scarborough Fair
 *
 * Traditional Ballad
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Scarborough Fair
@artist: Traditional Ballad
@duration: 03:30.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.50 <00:01.50>Are <00:02.25>you <00:03.00>go<00:03.75>ing <00:04.50>to <00:05.25>Scar<00:06.00>bo<00:06.75>rough <00:07.50>Fair?
00:08.25 <00:08.25>Pars<00:09.00>ley, <00:09.75>sage, <00:10.50>rose<00:11.25>ma<00:12.00>ry, <00:12.75>and <00:13.50>thyme.
00:14.25 <00:14.25>Re<00:15.00>mem<00:15.75>ber <00:16.50>me <00:17.25>to <00:18.00>one <00:18.75>who <00:19.50>lives <00:20.25>there.
00:21.00 <00:21.00>She <00:21.75>once <00:22.50>was <00:23.25>a <00:24.00>true <00:24.75>love <00:25.50>of <00:26.25>mine.

[Verse 2]
00:27.00 <00:27.00>Tell <00:27.75>her <00:28.50>to <00:29.25>make <00:30.00>me <00:30.75>a <00:31.50>cam<00:32.25>bric <00:33.00>shirt,
00:33.75 <00:33.75>Pars<00:34.50>ley, <00:35.25>sage, <00:36.00>rose<00:36.75>ma<00:37.50>ry, <00:38.25>and <00:39.00>thyme.
00:39.75 <00:39.75>With<00:40.50>out <00:41.25>no <00:42.00>seams <00:42.75>nor <00:43.50>need<00:44.25>le <00:45.00>work,
00:45.75 <00:45.75>Then <00:46.50>she'll <00:47.25>be <00:48.00>a <00:48.75>true <00:49.50>love <00:50.25>of <00:51.00>mine.

[Verse 3]
00:51.75 <00:51.75>Tell <00:52.50>her <00:53.25>to <00:54.00>find <00:54.75>me <00:55.50>an <00:56.25>a<00:57.00>cre <00:57.75>of <00:58.50>land,
00:59.25 <00:59.25>Pars<01:00.00>ley, <01:00.75>sage, <01:01.50>rose<01:02.25>ma<01:03.00>ry, <01:03.75>and <01:04.50>thyme.
01:05.25 <01:05.25>Be<01:06.00>tween <01:06.75>the <01:07.50>salt <01:08.25>wa<01:09.00>ter <01:09.75>and <01:10.50>the <01:11.25>sea <01:12.00>strand,
01:12.75 <01:12.75>Then <01:13.50>she'll <01:14.25>be <01:15.00>a <01:15.75>true <01:16.50>love <01:17.25>of <01:18.00>mine.

[Verse 4]
01:18.75 <01:18.75>Tell <01:19.50>her <01:20.25>to <01:21.00>reap <01:21.75>it <01:22.50>with <01:23.25>a <01:24.00>sick<01:24.75>le <01:25.50>of <01:26.25>leath<01:27.00>er,
01:27.75 <01:27.75>Pars<01:28.50>ley, <01:29.25>sage, <01:30.00>rose<01:30.75>ma<01:31.50>ry, <01:32.25>and <01:33.00>thyme.
01:33.75 <01:33.75>And <01:34.50>ga<01:35.25>ther <01:36.00>it <01:36.75>all <01:37.50>in <01:38.25>a <01:39.00>bunch <01:39.75>of <01:40.50>heath<01:41.25>er,
01:42.00 <01:42.00>Then <01:42.75>she'll <01:43.50>be <01:44.25>a <01:45.00>true <01:45.75>love <01:46.50>of <01:47.25>mine.

[Outro]
01:50.50 (Thank you for singing with Karaoke Composer!)
`

export const scarboroughFair: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
