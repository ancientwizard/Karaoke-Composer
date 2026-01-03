/**
 * John Brown's Body
 *
 * Music by William Steffe, lyrics by Thomas Brigham Bishop
 * Public domain
 *
 * Tempo: ~100 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: John Brown's Body
@artist: William Steffe & Thomas Brigham Bishop
@duration: 03:05.40

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.40 <00:01.40>John <00:02.10>Brown's <00:02.80>bod<00:03.50>y <00:04.20>lies <00:04.90>a<00:05.60>mold<00:06.30>ing <00:07.00>in <00:07.70>the <00:08.40>grave,
00:09.10 <00:09.10>John <00:09.80>Brown's <00:10.50>bod<00:11.20>y <00:11.90>lies <00:12.60>a<00:13.30>mold<00:14.00>ing <00:14.70>in <00:15.40>the <00:16.10>grave,
00:16.80 <00:16.80>John <00:17.50>Brown's <00:18.20>bod<00:18.90>y <00:19.60>lies <00:20.30>a<00:21.00>mold<00:21.70>ing <00:22.40>in <00:23.10>the <00:23.80>grave,
00:24.50 <00:24.50>But <00:25.20>his <00:25.90>soul <00:26.60>goes <00:27.30>march<00:28.00>ing <00:28.70>on.

[Chorus]
00:29.40 <00:29.40>Glo<00:30.10>ry, <00:31.10>glo<00:31.80>ry, <00:32.50>hal<00:33.20>le<00:33.90>lu<00:34.60>jah,
00:35.30 <00:35.30>Glo<00:36.00>ry, <00:37.00>glo<00:37.70>ry, <00:38.40>hal<00:39.10>le<00:39.80>lu<00:40.50>jah,
00:41.20 <00:41.20>Glo<00:41.90>ry, <00:42.90>glo<00:43.60>ry, <00:44.30>hal<00:45.00>le<00:45.70>lu<00:46.40>jah,
00:47.10 <00:47.10>His <00:47.80>truth <00:48.50>is <00:49.20>march<00:49.90>ing <00:50.60>on.

[Verse 2]
00:51.30 <00:51.30>He's <00:52.00>gone <00:52.70>to <00:53.40>be <00:54.10>a <00:54.80>sol<00:55.50>dier <00:56.20>in <00:56.90>the <00:57.60>ar<00:58.30>my <00:59.00>of <00:59.70>the <01:00.40>Lord,
01:01.10 <01:01.10>He's <01:01.80>gone <01:02.50>to <01:03.20>be <01:03.90>a <01:04.60>sol<01:05.30>dier <01:06.00>in <01:06.70>the <01:07.40>ar<01:08.10>my <01:08.80>of <01:09.50>the <01:10.20>Lord,
01:10.90 <01:10.90>He's <01:11.60>gone <01:12.30>to <01:13.00>be <01:13.70>a <01:14.40>sol<01:15.10>dier <01:15.80>in <01:16.50>the <01:17.20>ar<01:17.90>my <01:18.60>of <01:19.30>the <01:20.00>Lord,
01:20.70 <01:20.70>And <01:21.40>his <01:22.10>soul <01:22.80>goes <01:23.50>march<01:24.20>ing <01:24.90>on.

[Outro]
01:28.40 (Thank you for singing with Karaoke Composer!)
`

export const johnBrownsBody: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
