/*
 * KaraokeCommandModels module features.
 * Contains implementation for karaoke command models.
 */

export interface KaraokeLinePart {
  text: string;
  durationMs: number;
}

export interface KaraokePageCommand {
  startTimeMs: number;
  lines: KaraokeLinePart[][];
}

export interface KaraokePlannerSettings {
  allBreaks: boolean;
  wrapGracePx: number;
  maxLines?: number;
  defaultFontName: string;
  defaultFontSize: number;
  defaultFontStyle: "regular" | "bold";
}

export interface KaraokePlan {
  title: string;
  artist: string;
  pages: KaraokePageCommand[];
}
