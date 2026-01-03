/**
 * My Bonnie Lies Over the Ocean
 *
 * Scottish song (traditional, popularized in 1880s)
 * Public domain
 *
 * Tempo: ~100 BPM (quarter note = 600ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: My Bonnie Lies Over the Ocean
@artist: Traditional Scottish
@duration: 02:05.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 100 BPM)

[Verse 1]
00:01.20 <00:01.20>My <00:01.95>bon<00:02.70>nie <00:03.45>lies <00:04.20>o<00:04.95>ver <00:05.70>the <00:06.45>o<00:07.20>cean,
00:07.95 <00:07.95>My <00:08.70>bon<00:09.45>nie <00:10.20>lies <00:10.95>o<00:11.70>ver <00:12.45>the <00:13.20>sea,
00:13.95 <00:13.95>My <00:14.70>bon<00:15.45>nie <00:16.20>lies <00:16.95>o<00:17.70>ver <00:18.45>the <00:19.20>o<00:19.95>cean,
00:20.70 <00:20.70>O <00:21.45>bring <00:22.20>back <00:22.95>my <00:23.70>bon<00:24.45>nie <00:25.20>to <00:25.95>me.

[Chorus]
00:26.70 <00:26.70>Bring <00:27.45>back, <00:28.20>bring <00:28.95>back,
00:29.70 <00:29.70>O <00:30.45>bring <00:31.20>back <00:31.95>my <00:32.70>bon<00:33.45>nie <00:34.20>to <00:34.95>me, <00:35.70>to <00:36.45>me.
00:37.20 <00:37.20>Bring <00:37.95>back, <00:38.70>bring <00:39.45>back,
00:40.20 <00:40.20>O <00:40.95>bring <00:41.70>back <00:42.45>my <00:43.20>bon<00:43.95>nie <00:44.70>to <00:45.45>me.

[Outro]
00:49.00 (Thank you for singing with Karaoke Composer!)
`

export const myBonnieLiesOverTheOcean: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
