/**
 * Amazing Grace
 *
 * Lyrics by John Newton (1779), music by William Walker (1835)
 * Public domain
 *
 * Tempo: ~70 BPM (quarter note = 857ms, but we'll use ~840ms for easier timing)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Amazing Grace
@artist: John Newton & William Walker
@duration: 02:20.70

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 70 BPM)

[Verse 1]
00:01.70 <00:01.70>A<00:02.30>maz<00:02.90>ing <00:03.80>grace, <00:04.40>how <00:05.00>sweet <00:05.90>the <00:06.50>sound
00:07.10 <00:07.10>That <00:08.00>saved <00:08.90>a <00:09.50>wretch <00:10.40>like <00:11.00>me;
00:11.90 <00:11.90>I <00:12.80>once <00:13.70>was <00:14.30>lost, <00:15.20>but <00:15.80>now <00:16.70>am <00:17.30>found,
00:18.20 <00:18.20>Was <00:19.10>blind <00:20.00>but <00:20.60>now <00:21.50>I <00:22.10>see.

[Verse 2]
00:23.00 <00:23.00>T'was <00:23.90>grace <00:24.80>that <00:25.40>taught <00:26.30>my <00:26.90>heart <00:27.80>to <00:28.40>fear,
00:29.30 <00:29.30>And <00:30.20>grace <00:31.10>my <00:31.70>fears <00:32.60>re<00:33.20>lieved;
00:34.10 <00:34.10>How <00:35.00>pre<00:35.90>cious <00:36.50>did <00:37.40>that <00:38.00>grace <00:38.90>ap<00:39.50>pear
00:40.40 <00:40.40>The <00:41.30>hour <00:42.20>I <00:42.80>first <00:43.70>be<00:44.30>lieved.

[Outro]
00:46.00 (Thank you for singing with Karaoke Composer!)
`

export const amazingGrace: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
