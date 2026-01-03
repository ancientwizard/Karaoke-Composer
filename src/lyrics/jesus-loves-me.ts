/**
 * Jesus Loves Me
 *
 * Lyrics by Anna Bartlett Warner, music by William B. Bradbury
 * Public domain
 *
 * Tempo: ~120 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Jesus Loves Me
@artist: Anna Bartlett Warner & William B. Bradbury
@duration: 01:50.20

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 120 BPM)

[Verse 1]
00:00.60 <00:00.60>Je<00:01.20>sus <00:01.80>loves <00:02.40>me, <00:03.00>this <00:03.60>I <00:04.20>know,
00:04.80 <00:04.80>For <00:05.40>the <00:06.00>Bi<00:06.60>ble <00:07.20>tells <00:07.80>me <00:08.40>so,
00:09.00 <00:09.00>Lit<00:09.60>tle <00:10.20>ones <00:10.80>to <00:11.40>him <00:12.00>be<00:12.60>long,
00:13.20 <00:13.20>They <00:13.80>are <00:14.40>weak <00:15.00>but <00:15.60>he <00:16.20>is <00:16.80>strong.

[Chorus]
00:17.40 <00:17.40>Yes, <00:18.00>Je<00:18.60>sus <00:19.20>loves <00:19.80>me,
00:20.40 <00:20.40>Yes, <00:21.00>Je<00:21.60>sus <00:22.20>loves <00:22.80>me,
00:23.40 <00:23.40>Yes, <00:24.00>Je<00:24.60>sus <00:25.20>loves <00:25.80>me,
00:26.40 <00:26.40>The <00:27.00>Bi<00:27.60>ble <00:28.20>tells <00:28.80>me <00:29.40>so.

[Verse 2]
00:30.00 <00:30.00>Je<00:30.60>sus <00:31.20>loves <00:31.80>me, <00:32.40>loves <00:33.00>e<00:33.60>ven <00:34.20>me,
00:34.80 <00:34.80>Though <00:35.40>I'm <00:36.00>ver<00:36.60>y <00:37.20>small <00:37.80>and <00:38.40>weak,
00:39.00 <00:39.00>When <00:39.60>I <00:40.20>am <00:40.80>sad <00:41.40>he <00:42.00>makes <00:42.60>me <00:43.20>glad,
00:43.80 <00:43.80>Je<00:44.40>sus <00:45.00>loves <00:45.60>me, <00:46.20>yes <00:46.80>he <00:47.40>does.

[Outro]
00:51.20 (Thank you for singing with Karaoke Composer!)
`

export const jesusLovesMe: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
