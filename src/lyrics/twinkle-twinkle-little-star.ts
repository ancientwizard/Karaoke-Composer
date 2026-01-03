/**
 * Twinkle Twinkle Little Star
 *
 * Traditional lullaby (lyrics by Jane Taylor, 1806)
 * Public domain
 *
 * Tempo: ~80 BPM (quarter note = 750ms)
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Twinkle Twinkle Little Star
@artist: Jane Taylor
@duration: 00:41.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 80 BPM)

[Verse 1]
00:01.50 <00:01.50>Twin<00:02.25>kle <00:03.00>twin<00:03.75>kle <00:04.50>lit<00:05.25>tle <00:06.00>star,
00:06.75 <00:06.75>How <00:07.50>I <00:08.25>won<00:09.00>der <00:09.75>what <00:10.50>you <00:11.25>are.
00:12.00 <00:12.00>Up <00:12.75>a<00:13.50>bove <00:14.25>the <00:15.00>world <00:15.75>so <00:16.50>high,
00:17.25 <00:17.25>Like <00:18.00>a <00:18.75>dia<00:19.50>mond <00:20.25>in <00:21.00>the <00:21.75>sky.

[Verse 2]
00:22.50 <00:22.50>Twin<00:23.25>kle <00:24.00>twin<00:24.75>kle <00:25.50>lit<00:26.25>tle <00:27.00>star,
00:27.75 <00:27.75>How <00:28.50>I <00:29.25>won<00:30.00>der <00:30.75>what <00:31.50>you <00:32.25>are.

[Outro]
00:36.00 (Thank you for singing with Karaoke Composer!)
`

export const twinkleTwinkleLittleStar: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
