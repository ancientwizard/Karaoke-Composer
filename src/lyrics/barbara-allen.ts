/**
 * Barbara Allen
 *
 * Traditional Ballad
 * Public domain
 *
 * Tempo: ~80 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Barbara Allen
@artist: Traditional Ballad
@duration: 03:20.80

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.80 <00:01.80>In <00:02.55>Scar<00:03.30>let <00:04.05>town <00:04.80>where <00:05.55>I <00:06.30>was <00:07.05>born,
00:07.80 <00:07.80>There <00:08.55>was <00:09.30>a <00:10.05>fair <00:10.80>maid <00:11.55>dwell<00:12.30>ing,
00:13.05 <00:13.05>Made <00:13.80>ev<00:14.55>ry <00:15.30>youth <00:16.05>cry <00:16.80>well <00:17.55>a<00:18.30>way,
00:19.05 <00:19.05>Her <00:19.80>name <00:20.55>was <00:21.30>Bar<00:22.05>ba<00:22.80>ra <00:23.55>Al<00:24.30>len.

[Verse 2]
00:25.05 <00:25.05>All <00:25.80>in <00:26.55>the <00:27.30>month <00:28.05>of <00:28.80>May,
00:29.55 <00:29.55>When <00:30.30>green <00:31.05>buds <00:31.80>were <00:32.55>swell<00:33.30>ing,
00:34.05 <00:34.05>Young <00:34.80>Wil<00:35.55>liam <00:36.30>Grove <00:37.05>lay <00:37.80>on <00:38.55>his <00:39.30>death<00:40.05>bed,
00:40.80 <00:40.80>For <00:41.55>love <00:42.30>of <00:43.05>Bar<00:43.80>ba<00:44.55>ra <00:45.30>Al<00:46.05>len.

[Verse 3]
00:46.80 <00:46.80>He <00:47.55>sent <00:48.30>his <00:49.05>ser<00:49.80>vant <00:50.55>to <00:51.30>the <00:52.05>town,
00:52.80 <00:52.80>To <00:53.55>the <00:54.30>place <00:55.05>where <00:55.80>she <00:56.55>was <00:57.30>dwell<00:58.05>ing,
00:58.80 <00:58.80>You <00:59.55>must <01:00.30>come <01:01.05>to <01:01.80>my <01:02.55>mas<01:03.30>ter <01:04.05>dear,
01:04.80 <01:04.80>If <01:05.55>your <01:06.30>name <01:07.05>be <01:07.80>Bar<01:08.55>ba<01:09.30>ra <01:10.05>Al<01:10.80>len.

[Verse 4]
01:11.55 <01:11.55>Oh <01:12.30>aye, <01:13.05>I <01:13.80>know, <01:14.55>I <01:15.30>know,
01:16.05 <01:16.05>That <01:16.80>man <01:17.55>you <01:18.30>speak <01:19.05>of,
01:19.80 <01:19.80>If <01:20.55>he's <01:21.30>sick <01:22.05>and <01:22.80>like <01:23.55>to <01:24.30>die,<01:25.05>
01:25.80 <01:25.80>He <01:26.55>may <01:27.30>die <01:28.05>and <01:28.80>go <01:29.55>to <01:30.30>hea<01:31.05>ven <01:31.80>for <01:32.55>all <01:33.30>I <01:34.05>care.

[Outro]
01:37.80 (Thank you for singing with Karaoke Composer!)
`

export const barbaraAllen: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
