/**
 * Wayfaring Stranger
 *
 * Traditional American spiritual
 * Public domain
 *
 * Tempo: ~75 BPM
 */

import type { Song  } from './types'
import { SongParser } from './parser'

const RAW_SONG = `
@title: Wayfaring Stranger
@artist: Traditional American Spiritual
@duration: 03:15.50

[Lead-In]
00:00.00 (Instrumental intro - 2 measures at 75 BPM)

[Verse 1]
00:02.00 <00:02.00>I'm <00:02.85>just <00:03.70>a <00:04.55>poor <00:05.40>way<00:06.25>far<00:07.10>ing <00:07.95>strang<00:08.80>er,
00:09.65 <00:09.65>Trav<00:10.50>'ling <00:11.35>through <00:12.20>this <00:13.05>world <00:13.90>of <00:14.75>woe,
00:15.60 <00:15.60>Yet <00:16.45>there's <00:17.30>no <00:18.15>sick<00:19.00>ness, <00:19.85>toil <00:20.70>nor <00:21.55>dan<00:22.40>ger
00:23.25 <00:23.25>In <00:24.10>that <00:24.95>bright <00:25.80>land <00:26.65>to <00:27.50>which <00:28.35>I <00:29.20>go.

[Verse 2]
00:30.05 <00:30.05>I'm <00:30.90>go<00:31.75>ing <00:32.60>there <00:33.45>to <00:34.30>meet <00:35.15>my <00:36.00>moth<00:36.85>er,
00:37.70 <00:37.70>She <00:38.55>said <00:39.40>she'd <00:40.25>meet <00:41.10>me <00:41.95>when <00:42.80>I <00:43.65>come,
00:44.50 <00:44.50>I'm <00:45.35>on<00:46.20>ly <00:47.05>go<00:47.90>ing <00:48.75>o'er <00:49.60>Jor<00:50.45>dan,
00:51.30 <00:51.30>I'm <00:52.15>on<00:53.00>ly <00:53.85>go<00:54.70>ing <00:55.55>o'er <00:56.40>home.

[Verse 3]
00:57.25 <00:57.25>I'll <00:58.10>soon <00:58.95>be <00:59.80>free <01:00.65>from <01:01.50>ev<01:02.35>'ry <01:03.20>trou<01:04.05>ble,
01:04.90 <01:04.90>My <01:05.75>bod<01:06.60>y <01:07.45>sleep <01:08.30>in <01:09.15>the <01:10.00>cold <01:10.85>ground,
01:11.70 <01:11.70>But <01:12.55>my <01:13.40>weak <01:14.25>spir<01:15.10>it <01:15.95>soon <01:16.80>will <01:17.65>leave <01:18.50>this <01:19.35>dou<01:20.20>ble,
01:21.05 <01:21.05>And <01:21.90>leave <01:22.75>this <01:23.60>drea<01:24.45>ry <01:25.30>place <01:26.15>and <01:27.00>go.

[Outro]
01:30.50 (Thank you for singing with Karaoke Composer!)
`

export const wayfaringStranger: Song = SongParser.parse(RAW_SONG)

// VIM: set ts=2 sw=2 et:
// END
