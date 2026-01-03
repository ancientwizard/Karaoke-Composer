/**
 * Meet Me In November
 *
 * Simple song format file. This defines all lyrics and timing in an easy-to-read,
 * easy-to-edit format. The SongParser converts this to the Song data structure.
 *
 * Format:
 * - @metadata lines at top
 * - [CAPTIONS] for section labels
 * - mm:ss.xx lyric text with syllable markers
 *
 * Syllable markers: <mm:ss.xx>syllable marks the start time of each syllable
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Meet Me In November
@artist: Ancient Wizard
@duration: 05:08.11

[Verse 1]
00:08.14 <00:08.14>Meet <00:08.48>me <00:08.80>in <00:09.17>No<00:09.49>vem<00:09.82>ber, <00:13.22>like <00:13.59>a <00:13.96>song <00:14.33>of <00:14.70>sto<00:15.03>ries <00:15.49>told.
00:19.64 <00:19.64>So <00:20.02>per<00:20.34>fect <00:20.85>it <00:21.23>can't <00:21.61>be <00:22.03>real, <00:24.64>yet <00:24.98>hope <00:25.30>will <00:25.65>make <00:25.99>it <00:26.36>so.
00:30.75 <00:30.75>Speak <00:31.67>my <00:32.01>name <00:32.34>with <00:32.69>love, <00:36.06>and <00:36.41>I <00:36.78>will <00:37.16>know <00:37.53>your <00:37.91>soul.
00:42.12 <00:42.12>Where <00:42.48>love <00:42.80>can <00:43.17>find <00:43.58>a <00:44.03>voice, <00:47.14>two <00:47.56>hearts <00:47.92>will <00:48.26>live <00:48.62>as <00:48.95>one.

[Verse 2]
00:56.74 <00:56.74>We <00:57.17>meet <00:57.58>in <00:57.95>No<00:58.27>vem<00:58.59>ber, <01:01.88>like <01:02.25>a <01:02.63>song <01:03.01>of <01:03.38>sto<01:03.70>ries <01:04.04>told.
01:08.34 <01:08.34>So <01:08.71>per<01:09.03>fect <01:09.29>it <01:09.66>be<01:09.98>came <01:10.38>real, <01:12.96>where <01:13.37>hope <01:13.77>has <01:14.16>made <01:14.52>it <01:14.99>so.
01:19.65 <01:19.65>You <01:20.17>spoke <01:20.55>my <01:20.89>name <01:21.28>with <01:21.67>love; <01:24.68>you'd <01:25.05>al<01:25.37>ways <01:25.66>felt <01:26.03>it <01:26.41>so.
01:31.03 <01:31.03>I <01:31.48>al<01:31.80>rea<01:32.12>dy <01:32.50>fall<01:32.82>ing, <01:35.73>my <01:36.10>heart <01:36.48>knew <01:36.85>it <01:37.22>was <01:37.63>home.

[Pre Chorus]
01:43.93 <01:43.93>Come <01:45.34>meet <01:45.69>me <01:46.03>this <01:46.47>No<01:46.84>vem<01:47.28>ber, <01:50.53>to <01:50.86>live <01:51.16>our <01:51.52>life <01:51.90>fore<01:52.22>told.
02:00.22 <02:00.22>Our <02:01.48>Mo<02:01.90>ments <02:02.49>yet <02:02.86>to <02:03.17>hap<02:03.56>pen, <02:06.59>al<02:06.91>rea<02:07.23>dy <02:07.60>feel <02:07.97>like <02:08.43>old.

[Chorus]
02:16.34 <02:16.34>I <02:16.78>Choose <02:17.16>You! <02:19.72>Wal<02:20.04>king <02:20.31>hand <02:20.69>in <02:20.96>hand.
02:22.79 <02:22.79>I <02:23.20>Choose <02:23.59>You! <02:26.22>Danc<02:26.54>ing <02:26.90>through <02:27.27>the <02:27.53>night.
02:29.43 <02:29.43>I <02:29.86>Choose <02:30.25>You.

[Verse 3]
02:35.83 <02:35.83>Our <02:37.52>time <02:38.07>a <02:38.44>con<02:38.74>ver<02:39.07>sa<02:39.40>tion, <02:42.41>our <02:42.85>words <02:43.23>a <02:43.61>love <02:44.37>song.
02:47.29 <02:47.29>We <02:47.56>sang <02:47.86>in<02:48.18>to <02:48.86>each <02:49.21>o<02:49.63>ther, <02:51.98>where <02:52.31>love <02:52.83>we <02:53.20>grew <02:53.63>made <02:54.21>strong.
02:57.01 <02:57.01>In <02:57.38>that <02:57.69>per<02:58.04>fect <02:58.52>mel<02:58.91>o<02:59.28>dy, <03:01.62>our <03:02.12>souls <03:02.57>had <03:02.99>found <03:03.47>their <03:03.90>home.

[Verse 4]
03:08.23 <03:08.23>You're <03:09.81>my <03:10.19>Tex<03:10.51>as <03:11.15>in <03:11.54>No<03:11.93>vem<03:12.34>ber; <03:14.81>our <03:15.20>life <03:15.61>made <03:16.03>a <03:16.80>new.
03:19.47 <03:19.47>So <03:19.89>per<03:20.21>fect <03:20.69>it <03:21.00>be<03:21.32>came <03:21.71>truth, <03:24.49>where <03:24.83>hope <03:25.15>has <03:25.53>made <03:26.02>it <03:26.42>so.
03:29.13 <03:29.13>I <03:29.48>al<03:29.80>rea<03:30.12>dy <03:30.65>fall<03:30.97>ing, <03:34.36>my <03:34.69>heart <03:34.99>has <03:35.32>come <03:35.64>home.

[Chorus]
03:40.78 <03:40.78>I <03:41.14>Choose <03:41.58>You! <03:43.95>Now <03:44.33>and <03:44.60>in <03:45.01>Nov<03:45.33>em<03:45.65>ber.
03:47.22 <03:47.22>I <03:47.53>Choose <03:47.91>You! <03:50.56>Now <03:50.88>and <03:51.09>in <03:51.32>for<03:51.64>e<03:51.96>ver.
03:53.81 <03:53.81>I <03:54.20>Choose <03:54.63>You!

[Bridge]
03:58.31 <03:58.31>We <03:58.90>star<03:59.25>ted <03:59.71>in, <04:01.73>A <04:02.00>Tex<04:02.38>as <04:02.87>No<04:03.22>vem<04:03.61>ber,
04:06.65 <04:06.65>and <04:07.13>in <04:07.49>that <04:07.93>mo<04:08.44>ment, <04:09.71>you <04:10.33>found <04:10.84>your <04:11.30>heart <04:11.93>a <04:12.42>home.

[Pre Chorus (reprise)]
04:16.43 <04:16.43>Come <04:17.86>meet <04:18.32>me <04:18.72>in <04:19.14>No<04:19.50>vem<04:19.92>ber, <04:22.93>to <04:23.25>live <04:23.65>our <04:23.99>life <04:24.37>fore<04:24.77>told.
04:32.59 <04:32.59>Our <04:34.30>mo<04:34.62>ments <04:34.99>yet <04:35.47>to <04:35.87>hap<04:36.28>pen, <04:39.12>al<04:39.40>rea<04:39.69>dy <04:40.17>feel <04:40.64>like <04:41.15>old.

[Final Chorus]
04:48.76 <04:48.76>You <04:49.20>Choose <04:49.58>Me! <04:52.12>In <04:52.45>all <04:52.88>No<04:53.11>vem<04:53.38>ber.
04:55.44 <04:55.44>You <04:55.78>Choose <04:56.08>Me! <04:58.59>Make <04:58.94>it <04:59.28>for<04:59.45>e<04:59.73>ver.

[(whisper)]
05:07.06 <05:07.06>I <05:07.61>do.
`

export const MeetMeInNovember: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
