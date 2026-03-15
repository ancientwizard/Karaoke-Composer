/*
 * LrcModels module features.
 * Contains implementation for lrc models.
 */

export interface LyricsWord {
  text: string;
  startTime: number | null;
  endTime: number | null;
}

export type LyricsLine = LyricsWord[];

export type LyricsPage = LyricsLine[];

export interface Lyrics {
  pages: LyricsPage[];
}

export interface LrcMetadata {
  artist: string;
  title: string;
}

export interface LrcFile {
  metadata: LrcMetadata;
  lyrics: Lyrics;
}

export class LyricsTime {
  public static fromCentiseconds(minutes: number, seconds: number, centiseconds: number): number {
    return ((minutes * 60 + seconds) * 1000) + centiseconds * 10;
  }
}
