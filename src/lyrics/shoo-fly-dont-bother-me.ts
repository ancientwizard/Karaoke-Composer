/**
 * Shoo Fly Don't Bother Me
 *
 * Traditional American folk song
 * Public domain
 *
 * Tempo: ~125 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Shoo Fly Don't Bother Me
@artist: Traditional American
@duration: 02:10.50

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 125 BPM)

[Verse 1]
00:00.65 <00:00.65>Shoo, <00:01.30>fly, <00:01.95>don't <00:02.60>both<00:03.25>er <00:03.90>me,
00:04.55 <00:04.55>Shoo, <00:05.20>fly, <00:05.85>don't <00:06.50>both<00:07.15>er <00:07.80>me,
00:08.45 <00:08.45>Shoo, <00:09.10>fly, <00:09.75>don't <00:10.40>both<00:11.05>er <00:11.70>me,
00:12.35 <00:12.35>'Cause <00:13.00>I <00:13.65>be<00:14.30>long <00:14.95>to <00:15.60>some<00:16.25>bod<00:16.90>y.

[Chorus]
00:17.55 <00:17.55>I <00:18.20>feel, <00:18.85>I <00:19.50>feel, <00:20.15>I <00:20.80>feel <00:21.45>like <00:22.10>a <00:22.75>mor<00:23.40>ning <00:24.05>star,
00:24.70 <00:24.70>I <00:25.35>feel, <00:26.00>I <00:26.65>feel, <00:27.30>I <00:27.95>feel <00:28.60>like <00:29.25>a <00:29.90>mor<00:30.55>ning <00:31.20>star.

[Verse 2]
00:31.85 <00:31.85>Shoo, <00:32.50>fly, <00:33.15>don't <00:33.80>both<00:34.45>er <00:35.10>me,
00:35.75 <00:35.75>Shoo, <00:36.40>fly, <00:37.05>don't <00:37.70>both<00:38.35>er <00:39.00>me,
00:39.65 <00:39.65>Shoo, <00:40.30>fly, <00:40.95>don't <00:41.60>both<00:42.25>er <00:42.90>me,
00:43.55 <00:43.55>'Cause <00:44.20>I <00:44.85>be<00:45.50>long <00:46.15>to <00:46.80>some<00:47.45>bod<00:48.10>y.

[Outro]
00:51.50 (Thank you for singing with Karaoke Composer!)
`

export const shooFlyDontBotherMe: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
