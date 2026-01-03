/**
 * Greensleeves
 *
 * Traditional English ballad
 * Public domain
 *
 * Tempo: ~85 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Greensleeves
@artist: Traditional English
@duration: 03:15.75

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 85 BPM)

[Verse 1]
00:01.75 <00:01.75>A<00:02.48>las, <00:03.21>my <00:03.94>love, <00:04.67>you <00:05.40>do <00:06.13>me <00:06.86>wrong
00:07.59 <00:07.59>to <00:08.32>cast <00:09.05>me <00:09.78>off <00:10.51>dis<00:11.24>cour<00:11.97>teous<00:12.70>ly,
00:13.43 <00:13.43>And <00:14.16>I <00:14.89>have <00:15.62>loved <00:16.35>you <00:17.08>so <00:17.81>long,
00:18.54 <00:18.54>De<00:19.27>light<00:20.00>ing <00:20.73>in <00:21.46>your <00:22.19>com<00:22.92>pan<00:23.65>y.

[Chorus]
00:24.38 <00:24.38>Green<00:25.11>sleeves <00:25.84>was <00:26.57>all <00:27.30>my <00:28.03>joy,
00:28.76 <00:28.76>Green<00:29.49>sleeves <00:30.22>was <00:30.95>my <00:31.68>de<00:32.41>light,
00:33.14 <00:33.14>Green<00:33.87>sleeves <00:34.60>was <00:35.33>my <00:36.06>heart <00:36.79>of <00:37.52>gold,
00:38.25 <00:38.25>And <00:38.98>who <00:39.71>but <00:40.44>my <00:41.17>la<00:41.90>dy <00:42.63>Green<00:43.36>sleeves.

[Verse 2]
00:44.09 <00:44.09>I <00:44.82>have <00:45.55>been <00:46.28>ready <00:47.01>at <00:47.74>your <00:48.47>hand
00:49.20 <00:49.20>to <00:49.93>grant <00:50.66>what<00:51.39>ev<00:52.12>er <00:52.85>you <00:53.58>would <00:54.31>crave,
00:55.04 <00:55.04>but <00:55.77>you <00:56.50>were <00:57.23>not <00:57.96>the <00:58.69>truth<00:59.42>ful <00:60.15>man
01:00.88 <01:00.88>you <00:01.61>said <01:02.34>that <01:03.07>you <01:03.80>would <01:04.53>be.

[Chorus]
01:05.26 <01:05.26>Green<01:05.99>sleeves <01:06.72>was <01:07.45>all <01:08.18>my <01:08.91>joy,
01:09.64 <01:09.64>Green<01:10.37>sleeves <01:11.10>was <01:11.83>my <01:12.56>de<01:13.29>light,
01:14.02 <01:14.02>Green<01:14.75>sleeves <01:15.48>was <01:16.21>my <01:16.94>heart <01:17.67>of <01:18.40>gold,
01:19.13 <01:19.13>And <01:19.86>who <01:20.59>but <01:21.32>my <01:22.05>la<01:22.78>dy <01:23.51>Green<01:24.24>sleeves.

[Verse 3]
01:25.00 <01:25.00>So <01:25.73>fare <01:26.46>well <01:27.19>and <01:27.92>if <01:28.65>you <01:29.38>care
01:30.11 <01:30.11>to <01:30.84>know <01:31.57>the <01:32.30>rea<01:33.03>son <01:33.76>why,
01:34.49 <01:34.49>so <01:35.22>much <01:35.95>ad<01:36.68>dress <01:37.41>I <01:38.14>bare,
01:38.87 <01:38.87>it <01:39.60>is <01:40.33>for <01:41.06>you <01:41.79>that <01:42.52>I <01:43.25>die.

[Outro]
01:47.00 (Thank you for singing with Karaoke Composer!)
`

export const greensleeves: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
