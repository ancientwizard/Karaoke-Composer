/*
 * LrcFileParser module features.
 * Contains implementation for lrc file parser.
 */

import { LyricsTime } from "@/CDGSharp/convert/lrc/LrcModels";
import type { LrcFile, Lyrics, LyricsLine, LyricsPage, LyricsWord } from "@/CDGSharp/convert/lrc/LrcModels";

export class LrcFileParser {
  public static parseFileContent(content: string): LrcFile {
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const lines = normalizedContent.split("\n");

    const firstBlankLineIndex = lines.findIndex((line) => line.trim().length === 0);
    if (firstBlankLineIndex < 0) {
      throw new Error("Invalid file: Metadata must be separated from lyrics by empty line");
    }

    const metadataLines = lines.slice(0, firstBlankLineIndex);
    const pageLines = lines.slice(firstBlankLineIndex + 1);

    const metadata = this.parseMetadata(metadataLines);
    const lyrics = this.shouldUseExtendedParser(metadataLines)
      ? this.parseExtendedLyrics(pageLines, metadataLines)
      : this.parseLegacyLyrics(pageLines);

    return { metadata, lyrics };
  }

  private static parseMetadata(metadataLines: string[]): { artist: string; title: string } {
    const artist = this.tryGetMetadata("ar", metadataLines) ?? this.tryGetMetadata("au", metadataLines);
    const title = this.tryGetMetadata("ti", metadataLines);

    if (artist === undefined) {
      throw new Error("Can't find artist");
    }

    if (title === undefined) {
      throw new Error("Can't find title");
    }

    return { artist, title };
  }

  private static tryGetMetadata(key: string, metadataLines: string[]): string | undefined {
    const pattern = new RegExp(`^\\[${this.escapeRegExp(key)}:(?<value>[^\\]]+)\\]$`);
    for (const line of metadataLines) {
      const match = pattern.exec(line);
      if (match?.groups?.value !== undefined) {
        return match.groups.value;
      }
    }

    return undefined;
  }

  private static shouldUseExtendedParser(metadataLines: string[]): boolean {
    const version = this.tryGetMetadata("version", metadataLines)?.toLowerCase();
    const syllableTiming = this.tryGetMetadata("syllable_timing", metadataLines)?.toLowerCase();

    return (version?.startsWith("2.") ?? false) && syllableTiming === "true";
  }

  private static parseLegacyLyrics(pageLines: string[]): Lyrics {
    const groups = this.splitByBlankLines(pageLines);
    const pages = groups.map((page) =>
      page
        .filter((line) => line.trim().length > 0)
        .map((line) => this.parseLegacyLine(line))
        .filter((line) => line.length > 0)
    );

    return { pages };
  }

  private static parseLegacyLine(line: string): LyricsLine {
    const words = line
      .split(" ")
      .filter((value) => value.trim().length > 0)
      .map((value) => this.parseLegacyWord(value));

    return words;
  }

  private static parseLegacyWord(text: string): LyricsWord {
    const pattern = /^(?<startTime>\[(?<startMinutes>\d{2}):(?<startSeconds>\d{2}):(?<startHundredthSeconds>\d{2})\])?(?<text>[^\]]+)(?<endTime>\[(?<endMinutes>\d{2}):(?<endSeconds>\d{2}):(?<endHundredthSeconds>\d{2})\])?$/;
    const match = pattern.exec(text);

    if (match === null || match.groups === undefined) {
      throw new Error(`Can't parse word "${text}"`);
    }

    return {
      text: match.groups.text ?? "",
      startTime: match.groups.startTime
        ? LyricsTime.fromCentiseconds(
            Number(match.groups.startMinutes),
            Number(match.groups.startSeconds),
            Number(match.groups.startHundredthSeconds)
          )
        : null,
      endTime: match.groups.endTime
        ? LyricsTime.fromCentiseconds(
            Number(match.groups.endMinutes),
            Number(match.groups.endSeconds),
            Number(match.groups.endHundredthSeconds)
          )
        : null
    };
  }

  private static parseExtendedLyrics(pageLines: string[], metadataLines: string[]): Lyrics {
    const duration = this.parseCentisecondsTimestamp(this.tryGetMetadata("duration", metadataLines));
    const pages = this.parseExtendedPages(pageLines);
    return this.setWordEndTimes({ pages }, duration);
  }

  private static parseExtendedPages(lines: string[]): LyricsPage[] {
    const pages: LyricsPage[] = [];
    let currentPage: LyricsPage = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith("#[")) {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
        }
        continue;
      }

      if (line.length === 0) {
        continue;
      }

      const parsed = this.parseExtendedLine(line);
      if (parsed.length > 0) {
        currentPage.push(parsed);
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  private static parseExtendedLine(line: string): LyricsLine {
    const withoutLineTimestamp = line.replace(/^\[\d{2}:\d{2}\.\d{2,3}\]/, "");
    const matches = Array.from(
      withoutLineTimestamp.matchAll(
        /<(?<time>\d{2}:\d{2}\.\d{2,3}(?:~\d{2}:\d{2}\.\d{2,3})?)>(?<text>[^<]*)/g
      )
    );

    const words: LyricsWord[] = [];
    let currentWord = "";
    let currentStartTime: number | null = null;
    let currentEndTime: number | null = null;

    for (const match of matches) {
      const timeText = match.groups?.time;
      const text = match.groups?.text ?? "";
      if (timeText === undefined) {
        continue;
      }

      const parsedMarker = this.parseExtendedTimeMarker(timeText);
      if (parsedMarker === null) {
        throw new Error(`Can't parse timestamp "${timeText}"`);
      }

      const { startTime, endTime } = parsedMarker;

      for (const ch of text) {
        if (/\s/.test(ch)) {
          if (currentWord.length > 0) {
            words.push({ text: currentWord, startTime: currentStartTime, endTime: currentEndTime });
            currentWord = "";
            currentStartTime = null;
            currentEndTime = null;
          }
        } else {
          if (currentStartTime === null) {
            currentStartTime = startTime;
          }
          currentWord += ch;
          if (endTime !== null) {
            currentEndTime = endTime;
          }
        }
      }
    }

    if (currentWord.length > 0) {
      words.push({ text: currentWord, startTime: currentStartTime, endTime: currentEndTime });
    }

    return words;
  }

  private static setWordEndTimes(lyrics: Lyrics, duration: number | null): Lyrics {
    const flattened = this.getWordPointers(lyrics);

    for (let index = 0; index < flattened.length; index += 1) {
      const current = flattened[index];
      const next = flattened[index + 1];
      if (current === undefined) {
        continue;
      }

      if (
        current.word.endTime === null &&
        next?.word.startTime !== null &&
        next?.word.startTime !== undefined
      ) {
        current.word.endTime = next.word.startTime;
      }
    }

    const last = flattened.at(-1);
    if (
      duration !== null &&
      last !== undefined &&
      last.word.endTime === null &&
      last.word.startTime !== null &&
      duration > last.word.startTime
    ) {
      last.word.endTime = duration;
    }

    return lyrics;
  }

  private static getWordPointers(lyrics: Lyrics): Array<{ word: LyricsWord }> {
    const pointers: Array<{ word: LyricsWord }> = [];

    for (const page of lyrics.pages) {
      for (const line of page) {
        for (const word of line) {
          pointers.push({ word });
        }
      }
    }

    return pointers;
  }

  private static parseCentisecondsTimestamp(text: string | undefined): number | null {
    if (text === undefined) {
      return null;
    }

    const match = /^(?<minutes>\d{2}):(?<seconds>\d{2})\.(?<fraction>\d{2,3})$/.exec(text);
    if (match?.groups === undefined) {
      return null;
    }

    const fraction = match.groups.fraction;
    const milliseconds =
      fraction.length === 2
        ? Number(fraction) * 10
        : Number(fraction.slice(0, 3));

    if (!Number.isFinite(milliseconds)) {
      return null;
    }

    return ((Number(match.groups.minutes) * 60) + Number(match.groups.seconds)) * 1000 + milliseconds;
  }

  private static parseExtendedTimeMarker(text: string): { startTime: number; endTime: number | null } | null {
    const [startText, endText] = text.split("~");
    const startTime = this.parseCentisecondsTimestamp(startText);

    if (startTime === null) {
      return null;
    }

    if (endText === undefined) {
      return { startTime, endTime: null };
    }

    const endTime = this.parseCentisecondsTimestamp(endText);
    if (endTime === null || endTime < startTime) {
      return { startTime, endTime: null };
    }

    return { startTime, endTime };
  }

  private static splitByBlankLines(lines: string[]): string[][] {
    const groups: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
      if (line.trim().length === 0) {
        if (current.length > 0) {
          groups.push(current);
          current = [];
        }
      } else {
        current.push(line);
      }
    }

    if (current.length > 0) {
      groups.push(current);
    }

    return groups;
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
