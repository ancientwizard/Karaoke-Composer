/**
 * What Child Is This
 *
 * Lyrics by William Chatterton Dix, music is traditional
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: What Child Is This
@artist: Traditional / William Chatterton Dix
@duration: 02:50.60

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.60 <00:01.60>What <00:02.38>child <00:03.16>is <00:03.94>this <00:04.72>who <00:05.50>laid <00:06.28>to <00:07.06>rest
00:07.84 <00:07.84>on <00:08.62>Mar<00:09.40>y's <00:10.18>lap <00:10.96>is <00:11.74>sleep<00:12.52>ing?
00:13.30 <00:13.30>Whom <00:14.08>an<00:14.86>gels <00:15.64>greet <00:16.42>with <00:17.20>an<00:17.98>thems <00:18.76>sweet,
00:19.54 <00:19.54>While <00:20.32>shep<00:21.10>herds <00:21.88>watch <00:22.66>are <00:23.44>keep<00:24.22>ing?

[Chorus]
00:25.00 <00:25.00>This, <00:25.78>this <00:26.56>is <00:27.34>Christ <00:28.12>the <00:28.90>King,
00:29.68 <00:29.68>Whom <00:30.46>shep<00:31.24>herds <00:32.02>guard <00:32.80>and <00:33.58>an<00:34.36>gels <00:35.14>sing.
00:35.92 <00:35.92>Haste, <00:36.70>haste <00:37.48>to <00:38.26>bring <00:39.04>him <00:39.82>laud,
00:40.60 <00:40.60>The <00:41.38>babe, <00:42.16>the <00:42.94>son <00:43.72>of <00:44.50>Mar<00:45.28>y.

[Verse 2]
00:46.06 <00:46.06>Why <00:46.84>lies <00:47.62>he <00:48.40>in <00:49.18>such <00:49.96>mean <00:50.74>es<00:51.52>tate,
00:52.30 <00:52.30>where <00:53.08>ox <00:53.86>and <00:54.64>ass <00:55.42>are <00:56.20>feed<00:56.98>ing?
00:57.76 <00:57.76>Good <00:58.54>Chris<00:59.32>tian, <01:00.10>fear; <01:00.88>for <01:01.66>sin<00:02.44>ners <01:03.22>here
01:04.00 <01:04.00>the <01:04.78>si<01:05.56>lent <01:06.34>Word <01:07.12>is <01:07.90>plead<01:08.68>ing.

[Chorus]
01:09.46 <01:09.46>Nails, <01:10.24>spear <01:11.02>shall <01:11.80>pierce <01:12.58>him <01:13.36>through,
01:14.14 <01:14.14>The <01:14.92>cross <01:15.70>be <01:16.48>borne <01:17.26>for <01:18.04>me, <01:18.82>for <01:19.60>you.
01:20.38 <01:20.38>Hail, <01:21.16>hail <01:21.94>the <01:22.72>Word <01:23.50>made <01:24.28>flesh,
01:25.06 <01:25.06>The <01:25.84>babe, <01:26.62>the <01:27.40>son <01:28.18>of <01:28.96>Mar<01:29.74>y.

[Outro]
01:33.00 (Thank you for singing with Karaoke Composer!)
`

export const whatChildIsThis: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
