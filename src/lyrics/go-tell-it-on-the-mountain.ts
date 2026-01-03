/**
 * Go Tell It on the Mountain
 *
 * Music by Mark Lowrey
 * Public domain
 *
 * Tempo: ~110 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Go Tell It on the Mountain
@artist: Mark Lowrey
@duration: 02:45.30

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 110 BPM)

[Chorus]
00:01.30 <00:01.30>Go <00:02.00>tell <00:02.70>it <00:03.40>on <00:04.10>the <00:04.80>moun<00:05.50>tain,
00:06.20 <00:06.20>O<00:06.90>ver <00:07.60>the <00:08.30>hills <00:09.00>and <00:09.70>ev<00:10.40>ery<00:11.10>where.
00:11.80 <00:11.80>Go <00:12.50>tell <00:13.20>it <00:13.90>on <00:14.60>the <00:15.30>moun<00:16.00>tain,
00:16.70 <00:16.70>That <00:17.40>Je<00:18.10>sus <00:18.80>Christ <00:19.50>is <00:20.20>born.

[Verse 1]
00:20.90 <00:20.90>While <00:21.60>shep<00:22.30>herds <00:23.00>kept <00:23.70>their <00:24.40>watch<00:25.10>ing <00:25.80>o'er <00:26.50>their <00:27.20>flocks <00:27.90>by <00:28.60>night,
00:29.30 <00:29.30>Be<00:30.00>hold <00:30.70>through<00:31.40>out <00:32.10>the <00:32.80>heav<00:33.50>ens <00:34.20>there <00:34.90>shone <00:35.60>a <00:36.30>ho<00:37.00>ly <00:37.70>light.

[Verse 2]
00:38.40 <00:38.40>The <00:39.10>hum<00:39.80>ble <00:40.50>Shep<00:41.20>herds <00:41.90>feared <00:42.60>and <00:43.30>trem<00:44.00>bled <00:44.70>when <00:45.40>they <00:46.10>saw <00:46.80>the <00:47.50>light.
00:48.20 <00:48.20>But <00:48.90>an <00:49.60>an<00:50.30>gel <00:51.00>came <00:51.70>and <00:52.40>hailed <00:53.10>them <00:53.80>in <00:54.50>the <00:55.20>night,

[Chorus]
00:55.90 <00:55.90>Go <00:56.60>tell <00:57.30>it <00:58.00>on <00:58.70>the <00:59.40>moun<01:00.10>tain,
01:00.80 <01:00.80>O<01:01.50>ver <01:02.20>the <01:02.90>hills <01:03.60>and <01:04.30>ev<01:05.00>ery<01:05.70>where.
01:06.40 <01:06.40>Go <01:07.10>tell <01:07.80>it <01:08.50>on <01:09.20>the <01:09.90>moun<01:10.60>tain,
01:11.30 <01:11.30>That <01:12.00>Je<01:12.70>sus <01:13.40>Christ <01:14.10>is <01:14.80>born.

[Verse 3]
01:15.50 <01:15.50>And <01:16.20>lo, <01:16.90>when <01:17.60>they <01:18.30>had <01:19.00>heard <01:19.70>the <01:20.40>joy<01:21.10>ful <01:21.80>sound,
01:22.50 <01:22.50>They <01:23.20>all <01:23.90>bowed <01:24.60>down <01:25.30>up<01:26.00>on <01:26.70>the <01:27.40>ground.

[Outro]
01:30.30 (Thank you for singing with Karaoke Composer!)
`

export const goTellItOnTheMountain: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
