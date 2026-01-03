/**
 * The Battle Hymn of the Republic
 *
 * Music by William Steffe, lyrics by Julia Ward Howe
 * Public domain
 *
 * Tempo: ~90 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: The Battle Hymn of the Republic
@artist: William Steffe & Julia Ward Howe
@duration: 03:20.70

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 90 BPM)

[Verse 1]
00:01.70 <00:01.70>Mine <00:02.45>eyes <00:03.20>have <00:03.95>seen <00:04.70>the <00:05.45>glo<00:06.20>ry <00:06.95>of <00:07.70>the <00:08.45>com<00:09.20>ing <00:09.95>of <00:10.70>the <00:11.45>Lord;
00:12.20 <00:12.20>He <00:12.95>is <00:13.70>tram<00:14.45>pling <00:15.20>out <00:15.95>the <00:16.70>vin<00:17.45>tage <00:18.20>where <00:18.95>the <00:19.70>grapes <00:20.45>of <00:21.20>wrath <00:21.95>are <00:22.70>stored;
00:23.45 <00:23.45>He <00:24.20>hath <00:24.95>loosed <00:25.70>the <00:26.45>fate<00:27.20>ful <00:27.95>light<00:28.70>ning <00:29.45>of <00:30.20>his <00:30.95>ter<00:31.70>ri<00:32.45>ble <00:33.20>swift <00:33.95>sword;
00:34.70 <00:34.70>His <00:35.45>truth <00:36.20>is <00:36.95>march<00:37.70>ing <00:38.45>on.

[Chorus]
00:39.20 <00:39.20>Glo<00:39.95>ry, <00:40.95>glo<00:41.70>ry, <00:42.45>hal<00:43.20>le<00:43.95>lu<00:44.70>jah!
00:45.45 <00:45.45>Glo<00:46.20>ry, <00:47.20>glo<00:47.95>ry, <00:48.70>hal<00:49.45>le<00:50.20>lu<00:50.95>jah!
00:51.70 <00:51.70>Glo<00:52.45>ry, <00:53.45>glo<00:54.20>ry, <00:54.95>hal<00:55.70>le<00:56.45>lu<00:57.20>jah!
00:57.95 <00:57.95>His <00:58.70>truth <00:59.45>is <01:00.20>march<01:00.95>ing <01:01.70>on.

[Verse 2]
01:02.45 <01:02.45>I <01:03.20>have <01:03.95>seen <01:04.70>Him <01:05.45>in <01:06.20>the <01:06.95>watch<01:07.70>fires <01:08.45>of <01:09.20>a <01:09.95>hun<01:10.70>dred <01:11.45>cir<01:12.20>cling <01:12.95>camps,
01:13.70 <01:13.70>They <01:14.45>have <01:15.20>build<01:15.95>ed <01:16.70>Him <01:17.45>an <01:18.20>al<01:18.95>tar <01:19.70>in <01:20.45>the <01:21.20>eve<01:21.95>ning <01:22.70>dews <01:23.45>and <01:24.20>damps;
01:24.95 <01:24.95>I <01:25.70>can <01:26.45>read <01:27.20>His <01:27.95>right<01:28.70>eous <01:29.45>sen<01:30.20>tence <01:30.95>by <01:31.70>the <01:32.45>dim <01:33.20>and <01:33.95>flar<01:34.70>ing <01:35.45>lamps;
01:36.20 <01:36.20>His <01:36.95>day <01:37.70>is <01:38.45>march<01:39.20>ing <01:39.95>on.

[Outro]
01:43.70 (Thank you for singing with Karaoke Composer!)
`

export const theBattleHymnOfTheRepublic: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
