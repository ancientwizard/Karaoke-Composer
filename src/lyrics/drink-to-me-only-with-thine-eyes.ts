/**
 * Drink to Me Only with Thine Eyes
 *
 * Lyrics by Ben Jonson, music by John Martin Smith
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Drink to Me Only with Thine Eyes
@artist: Ben Jonson & John Martin Smith
@duration: 03:15.20

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.50 <00:01.50>Drink <00:02.25>to <00:03.00>me <00:03.75>on<00:04.50>ly <00:05.25>with <00:06.00>thine <00:06.75>eyes,
00:07.50 <00:07.50>And <00:08.25>I <00:09.00>will <00:09.75>pledge <00:10.50>with <00:11.25>mine;
00:12.00 <00:12.00>Or <00:12.75>leave <00:13.50>a <00:14.25>kiss <00:15.00>but <00:15.75>in <00:16.50>the <00:17.25>cup
00:18.00 <00:18.00>And <00:18.75>I'll <00:19.50>not <00:20.25>ask <00:21.00>for <00:21.75>wine.

[Verse 2]
00:22.50 <00:22.50>The <00:23.25>thirst <00:24.00>that <00:24.75>from <00:25.50>the <00:26.25>soul <00:27.00>doth <00:27.75>rise
00:28.50 <00:28.50>Doth <00:29.25>ask <00:30.00>a <00:30.75>drink <00:31.50>di<00:32.25>vine;
00:33.00 <00:33.00>But <00:33.75>might <00:34.50>I <00:35.25>of <00:36.00>Jove's <00:36.75>nec<00:37.50>tar <00:38.25>sup,
00:39.00 <00:39.00>I <00:39.75>would <00:40.50>not <00:41.25>change <00:42.00>for <00:42.75>thine.

[Verse 3]
00:43.50 <00:43.50>Sent <00:44.25>thee <00:45.00>late <00:45.75>a <00:46.50>ro<00:47.25>sy <00:48.00>wreath,
00:48.75 <00:48.75>Not <00:49.50>so <00:50.25>much <00:51.00>hon<00:51.75>or<00:52.50>ing <00:53.25>thee
00:54.00 <00:54.00>As <00:54.75>giv<00:55.50>ing <00:56.25>it <00:57.00>a <00:57.75>hope <00:58.50>that <00:59.25>there
01:00.00 <01:00.00>It <01:00.75>could <01:01.50>not <01:02.25>with<01:03.00>ered <01:03.75>be.

[Verse 4]
01:04.50 <01:04.50>But <01:05.25>thou <01:06.00>there<00:06.75>on <01:07.50>didst <01:08.25>on<01:09.00>ly <01:09.75>breathe
01:10.50 <01:10.50>And <01:11.25>sent'st <01:12.00>it <01:12.75>back <01:13.50>to <01:14.25>me,
01:15.00 <01:15.00>Since <01:15.75>when <01:16.50>it <01:17.25>grows <01:18.00>and <01:18.75>smells <01:19.50>of <01:20.25>thee,
01:21.00 <01:21.00>Not <01:21.75>of <01:22.50>it<01:23.25>self <01:24.00>to <01:24.75>me <01:25.50>it <01:26.25>flows.

[Outro]
01:30.20 (Thank you for singing with Karaoke Composer!)
`

export const drinkToMeOnlyWithThineEyes: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
