/**
 * London Bridge
 *
 * Traditional nursery rhyme/song
 * Public domain
 *
 * Tempo: ~110 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: London Bridge
@artist: Traditional
@duration: 02:00.30

[Lead-In]
00:00.00 (Instrumental intro - 1 measure at 110 BPM)

[Verse 1]
00:00.65 <00:00.65>Lon<00:01.27>don <00:01.92>Bridge <00:02.54>is <00:03.19>fall<00:03.81>ing <00:04.46>down,
00:05.08 <00:05.08>Fall<00:05.73>ing <00:06.35>down, <00:07.00>fall<00:07.62>ing <00:08.27>down,
00:08.89 <00:08.89>Lon<00:09.54>don <00:10.16>Bridge <00:10.81>is <00:11.43>fall<00:12.08>ing <00:12.70>down,
00:13.35 <00:13.35>My <00:13.97>fair <00:14.62>la<00:15.24>dy.

[Verse 2]
00:15.89 <00:15.89>Build <00:16.51>it <00:17.16>up <00:17.78>with <00:18.43>wood <00:19.05>and <00:19.70>clay,
00:20.32 <00:20.32>Wood <00:20.97>and <00:21.59>clay, <00:22.24>wood <00:22.86>and <00:23.51>clay,
00:24.13 <00:24.13>Build <00:24.78>it <00:25.40>up <00:26.05>with <00:26.67>wood <00:27.32>and <00:27.94>clay,
00:28.59 <00:28.59>My <00:29.21>fair <00:29.86>la<00:30.48>dy.

[Verse 3]
00:31.13 <00:31.13>Wood <00:31.75>and <00:32.40>clay <00:33.02>will <00:33.67>wash <00:34.29>a<00:34.94>way,
00:35.56 <00:35.56>Wash <00:36.21>a<00:36.83>way, <00:37.48>wash <00:38.10>a<00:38.75>way,
00:39.37 <00:39.37>Wood <00:40.02>and <00:40.64>clay <00:41.29>will <00:41.91>wash <00:42.56>a<00:43.18>way,
00:43.83 <00:43.83>My <00:44.45>fair <00:45.10>la<00:45.72>dy.

[Outro]
00:52.30 (Thank you for singing with Karaoke Composer!)
`

export const londonBridge: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
