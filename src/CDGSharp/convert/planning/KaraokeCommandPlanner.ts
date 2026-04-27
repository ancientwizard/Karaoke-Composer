/*
 * KaraokeCommandPlanner module features.
 * Contains implementation for karaoke command planner.
 */

import type { LrcFile, LyricsWord   } from "@/CDGSharp/convert/lrc/LrcModels";
import type { TextRasterizerAdapter } from "@/CDGSharp/convert/rendering/TextRasterizerAdapter";
import type {
  KaraokeLinePart,
  KaraokePageCommand,
  KaraokePlan,
  KaraokePlannerSettings
} from "@/CDGSharp/convert/planning/KaraokeCommandModels";

interface LyricsIndex {
  pageIndex: number;
  lineIndex: number;
  wordIndex: number;
}

interface TimedWord {
  pageIndex: number;
  sourceLineIndex: number;
  text: string;
  startTimeMs: number;
  durationMs: number;
  gapAfterMs: number;
}

export interface KaraokeTimingDebugPart {
  partIndex: number;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
}

export interface KaraokeTimingDebugLine {
  lineIndex: number;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  parts: KaraokeTimingDebugPart[];
}

export interface KaraokeTimingDebugPage {
  pageIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  nextPageStartTimeMs: number | null;
  gapAfterPageMs: number | null;
  lines: KaraokeTimingDebugLine[];
}

export interface KaraokeTimingDebugReport {
  title: string;
  artist: string;
  generatedAtIsoUtc: string;
  pageCount: number;
  pages: KaraokeTimingDebugPage[];
}

export class KaraokeCommandPlanner {
  private static readonly tileRows = 16;

  private static readonly tileColumns = 48;

  private static readonly tileHeight = 12;

  private static readonly tileWidth = 6;

  private static readonly displayContentHeight =
    KaraokeCommandPlanner.tileRows * KaraokeCommandPlanner.tileHeight;

  private static readonly displayContentWidth =
    KaraokeCommandPlanner.tileColumns * KaraokeCommandPlanner.tileWidth;

  private readonly textRasterizer: TextRasterizerAdapter;

  public constructor(textRasterizer: TextRasterizerAdapter) {
    this.textRasterizer = textRasterizer;
  }

  public createPlan(
    lrcFile: LrcFile,
    settings: KaraokePlannerSettings = {
      allBreaks: false,
      wrapGracePx: 0,
      maxLines: undefined,
      defaultFontName: "Arial",
      defaultFontSize: 16,
      defaultFontStyle: "regular"
    }
  ): KaraokePlan {
    const pages = this.getShowLyricsPageCommandsDynamic(lrcFile, settings);

    return {
      title: lrcFile.metadata.title,
      artist: lrcFile.metadata.artist,
      pages
    };
  }

  public createTimingDebugReport(plan: KaraokePlan): KaraokeTimingDebugReport {
    const pages: KaraokeTimingDebugPage[] = plan.pages.map((page, pageIndex) => {
      let lineCursorMs = page.startTimeMs;

      const lines: KaraokeTimingDebugLine[] = page.lines.map((line, lineIndex) => {
        let partCursorMs = lineCursorMs;

        const parts: KaraokeTimingDebugPart[] = line.map((part, partIndex) => {
          const partStartTimeMs = partCursorMs;
          const partEndTimeMs = partStartTimeMs + part.durationMs;
          partCursorMs = partEndTimeMs;

          return {
            partIndex,
            text: part.text,
            startTimeMs: partStartTimeMs,
            endTimeMs: partEndTimeMs,
            durationMs: part.durationMs
          };
        });

        const lineStartTimeMs = lineCursorMs;
        const lineEndTimeMs = partCursorMs;
        lineCursorMs = lineEndTimeMs;

        return {
          lineIndex,
          text: line.map((part) => part.text).join(""),
          startTimeMs: lineStartTimeMs,
          endTimeMs: lineEndTimeMs,
          durationMs: lineEndTimeMs - lineStartTimeMs,
          parts
        };
      });

      const pageStartTimeMs = page.startTimeMs;
      const pageEndTimeMs = lineCursorMs;
      const nextPageStartTimeMs = plan.pages[pageIndex + 1]?.startTimeMs ?? null;

      return {
        pageIndex,
        startTimeMs: pageStartTimeMs,
        endTimeMs: pageEndTimeMs,
        durationMs: pageEndTimeMs - pageStartTimeMs,
        nextPageStartTimeMs,
        gapAfterPageMs: nextPageStartTimeMs === null ? null : nextPageStartTimeMs - pageEndTimeMs,
        lines
      };
    });

    return {
      title: plan.title,
      artist: plan.artist,
      generatedAtIsoUtc: new Date().toISOString(),
      pageCount: pages.length,
      pages
    };
  }

  private getShowLyricsPageCommandsDynamic(
    lrcFile: LrcFile,
    settings: KaraokePlannerSettings
  ): KaraokePageCommand[] {
    const lineCapacity = this.getLineCapacity(settings.defaultFontSize, settings.maxLines);

    return this.getTimedWordsByPage(lrcFile)
      .flatMap((timedWordsInPage) => {
        const wrappedLines = this.getWrappedLines(settings, timedWordsInPage);
        return this.chunkByBalancedSize(wrappedLines, lineCapacity)
          .map((pageLines) => {
            const firstLine = pageLines[0];
            const firstWord = firstLine?.[0];
            if (firstWord === undefined) {
              return null;
            }

            return {
              startTimeMs: firstWord.startTimeMs,
              lines: pageLines.map((line) => this.toLineParts(line))
            } satisfies KaraokePageCommand;
          })
          .filter((value): value is KaraokePageCommand => value !== null);
      });
  }

  private getTimedWordsByPage(lrcFile: LrcFile): TimedWord[][] {
    const allIndices = this.getAllIndices(lrcFile);
    let currentStartTimeMs = 0;

    const timedWords: TimedWord[] = allIndices.map((index) => {
      const word = this.getWord(lrcFile, index);
      const startTimeMs = word.startTime ?? currentStartTimeMs;
      const durationWithGap = this.getWordDurationForDynamicLayout(lrcFile, index, startTimeMs);
      const nextIndex = this.nextWord(lrcFile, index);
      const hasNextWordOnPage = nextIndex !== null && nextIndex.pageIndex === index.pageIndex;

      const timedWord: TimedWord = {
        pageIndex: index.pageIndex,
        sourceLineIndex: index.lineIndex,
        text: word.text,
        startTimeMs,
        durationMs: durationWithGap.durationMs,
        gapAfterMs: hasNextWordOnPage ? durationWithGap.gapAfterMs : 0
      };

      currentStartTimeMs = startTimeMs + durationWithGap.durationMs;
      return timedWord;
    });

    const grouped = new Map<number, TimedWord[]>();
    for (const word of timedWords) {
      const existing = grouped.get(word.pageIndex) ?? [];
      grouped.set(word.pageIndex, [...existing, word]);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, words]) => words);
  }

  private getWordDurationForDynamicLayout(
    lrcFile: LrcFile,
    index: LyricsIndex,
    startTimeMs: number
  ): { durationMs: number; gapAfterMs: number } {
    const word = this.getWord(lrcFile, index);
    const nextIndex = this.nextWord(lrcFile, index);
    const nextStartTimeMs = nextIndex !== null ? this.getWord(lrcFile, nextIndex).startTime : null;

    const raw = this.getWordDurationRaw(lrcFile, index, startTimeMs);

    const isPhraseEndByBoundary =
      nextIndex !== null &&
      (nextIndex.pageIndex !== index.pageIndex || nextIndex.lineIndex !== index.lineIndex);
    const isPhraseEndByPunctuation = /[.,;:!?]$/.test(word.text);

    const shortenDuration = (availableDurationMs: number): number => {
      const minDurationMs = 180;
      const maxDurationMs = 900;
      const proposedMs = availableDurationMs * 0.6;
      const clampedMs = Math.max(minDurationMs, Math.min(maxDurationMs, proposedMs));
      return Math.min(clampedMs, availableDurationMs);
    };

    if (nextStartTimeMs !== null && (isPhraseEndByBoundary || isPhraseEndByPunctuation)) {
      const availableDurationMs = nextStartTimeMs - startTimeMs;
      if (availableDurationMs > 350) {
        const adjustedDurationMs = shortenDuration(availableDurationMs);
        return {
          durationMs: adjustedDurationMs,
          gapAfterMs: availableDurationMs - adjustedDurationMs
        };
      }

      return raw;
    }

    if (nextStartTimeMs === null && isPhraseEndByPunctuation && raw.durationMs > 1200) {
      return {
        durationMs: Math.min(raw.durationMs, 900),
        gapAfterMs: raw.gapAfterMs
      };
    }

    return raw;
  }

  private getWordDurationRaw(
    lrcFile: LrcFile,
    index: LyricsIndex,
    startTimeMs: number
  ): { durationMs: number; gapAfterMs: number } {
    const currentWord = this.getWord(lrcFile, index);
    const nextIndex = this.nextWord(lrcFile, index);
    const nextWord = nextIndex !== null ? this.getWord(lrcFile, nextIndex) : null;

    if (currentWord.endTime !== null && nextWord?.startTime !== null && nextWord?.startTime !== undefined) {
      return {
        durationMs: currentWord.endTime - startTimeMs,
        gapAfterMs: nextWord.startTime - currentWord.endTime
      };
    }

    if (currentWord.endTime !== null) {
      return {
        durationMs: currentWord.endTime - startTimeMs,
        gapAfterMs: 0
      };
    }

    const nextStartTimeLookup = this.tryPickNextWordStartTime(lrcFile, index);
    if (nextStartTimeLookup !== null) {
      return {
        durationMs: (nextStartTimeLookup.startTimeMs - startTimeMs) / nextStartTimeLookup.offset,
        gapAfterMs: 0
      };
    }

    throw new Error(
      `Can't determine duration of ${index.pageIndex}/${index.lineIndex}/${index.wordIndex}`
    );
  }

  private getWrappedLines(settings: KaraokePlannerSettings, timedWords: TimedWord[]): TimedWord[][] {
    const measuredTextWidths = new Map<string, number>();

    const measureTextWidth = (text: string): number => {
      const existing = measuredTextWidths.get(text);
      if (existing !== undefined) {
        return existing;
      }

      const width = this.textRasterizer.measureText(
        text,
        settings.defaultFontName,
        settings.defaultFontSize,
        settings.defaultFontStyle
      );

      measuredTextWidths.set(text, width);
      return width;
    };

    const lineFits = (words: TimedWord[]): boolean => {
      const availableWidth = Math.max(0, KaraokeCommandPlanner.displayContentWidth - settings.wrapGracePx);
      const width = measureTextWidth(words.map((word) => word.text).join(" "));
      return width <= availableWidth;
    };

    const takeLine = (
      consumed: TimedWord[],
      remaining: TimedWord[],
      punctuationBreakPos: number | null
    ): { line: TimedWord[]; leftover: TimedWord[] } => {
      if (remaining.length === 0) {
        return { line: consumed, leftover: [] };
      }

      const [nextWord, ...tail] = remaining;
      if (nextWord === undefined) {
        return { line: consumed, leftover: [] };
      }

      const consumedWithNext = [...consumed, nextWord];
      if (lineFits(consumedWithNext)) {
        const nextBreakPos = /[.,;:!?]$/.test(nextWord.text)
          ? consumedWithNext.length
          : punctuationBreakPos;

        if (settings.allBreaks && /[.,;:!?]$/.test(nextWord.text)) {
          return { line: consumedWithNext, leftover: tail };
        }

        return takeLine(consumedWithNext, tail, nextBreakPos);
      }

      if (consumed.length === 0) {
        return { line: [nextWord], leftover: tail };
      }

      if (punctuationBreakPos !== null && punctuationBreakPos < consumed.length) {
        return {
          line: consumed.slice(0, punctuationBreakPos),
          leftover: [...consumed.slice(punctuationBreakPos), nextWord, ...tail]
        };
      }

      return {
        line: consumed,
        leftover: [nextWord, ...tail]
      };
    };

    const lines: TimedWord[][] = [];
    let remaining = timedWords;
    while (remaining.length > 0) {
      const taken = takeLine([], remaining, null);
      lines.push(taken.line);
      remaining = taken.leftover;
    }

    return lines;
  }

  private toLineParts(line: TimedWord[]): KaraokeLinePart[] {
    return line.flatMap((word, index) => {
      const wordPart: KaraokeLinePart = {
        text: word.text,
        durationMs: word.durationMs
      };

      const separatorPart =
        index < line.length - 1
          ? { text: " ", durationMs: word.gapAfterMs }
          : word.gapAfterMs > 0
            ? { text: "", durationMs: word.gapAfterMs }
            : null;

      return separatorPart === null ? [wordPart] : [wordPart, separatorPart];
    });
  }

  private getLineCapacity(fontSize: number, maxLines?: number): number {
    const lineHeight = this.getLineHeight(fontSize);
    const computedMaxLines = Math.floor((KaraokeCommandPlanner.displayContentHeight - fontSize) / lineHeight) + 1;
    const normalizedConfiguredMax =
      maxLines === undefined
        ? undefined
        : Math.max(1, Math.floor(maxLines));
    const effectiveMaxLines =
      normalizedConfiguredMax === undefined
        ? computedMaxLines
        : Math.min(computedMaxLines, normalizedConfiguredMax);

    return Math.max(1, effectiveMaxLines);
  }

  private getLineHeight(fontSize: number): number {
    return Math.floor((fontSize * 7 + 2) / 4);
  }

  private getAllIndices(lrcFile: LrcFile): LyricsIndex[] {
    const indices: LyricsIndex[] = [];

    for (let pageIndex = 0; pageIndex < lrcFile.lyrics.pages.length; pageIndex += 1) {
      const page = lrcFile.lyrics.pages[pageIndex];
      if (page === undefined) {
        continue;
      }

      for (let lineIndex = 0; lineIndex < page.length; lineIndex += 1) {
        const line = page[lineIndex];
        if (line === undefined) {
          continue;
        }

        for (let wordIndex = 0; wordIndex < line.length; wordIndex += 1) {
          indices.push({ pageIndex, lineIndex, wordIndex });
        }
      }
    }

    return indices;
  }

  private getWord(lrcFile: LrcFile, index: LyricsIndex): LyricsWord {
    const word = lrcFile.lyrics.pages[index.pageIndex]?.[index.lineIndex]?.[index.wordIndex];
    if (word === undefined) {
      throw new Error(
        `Word not found at ${index.pageIndex}/${index.lineIndex}/${index.wordIndex}`
      );
    }

    return word;
  }

  private nextWord(lrcFile: LrcFile, index: LyricsIndex): LyricsIndex | null {
    const page = lrcFile.lyrics.pages[index.pageIndex];
    if (page === undefined) {
      return null;
    }

    const line = page[index.lineIndex];
    if (line !== undefined && index.wordIndex + 1 < line.length) {
      return { ...index, wordIndex: index.wordIndex + 1 };
    }

    if (index.lineIndex + 1 < page.length) {
      return { pageIndex: index.pageIndex, lineIndex: index.lineIndex + 1, wordIndex: 0 };
    }

    if (index.pageIndex + 1 < lrcFile.lyrics.pages.length) {
      return { pageIndex: index.pageIndex + 1, lineIndex: 0, wordIndex: 0 };
    }

    return null;
  }

  private tryPickNextWordStartTime(
    lrcFile: LrcFile,
    index: LyricsIndex
  ): { startTimeMs: number; offset: number } | null {
    let offset = 0;
    let next = this.nextWord(lrcFile, index);

    while (next !== null) {
      offset += 1;
      const word = this.getWord(lrcFile, next);
      if (word.startTime !== null) {
        return {
          startTimeMs: word.startTime,
          offset
        };
      }
      next = this.nextWord(lrcFile, next);
    }

    return null;
  }

  private chunkBySize<T>(values: T[], chunkSize: number): T[][] {
    if (values.length === 0) {
      return [];
    }

    const chunks: T[][] = [];

    for (let index = 0; index < values.length; index += chunkSize) {
      chunks.push(values.slice(index, index + chunkSize));
    }

    return chunks;
  }

  private chunkByBalancedSize(values: TimedWord[][], maxChunkSize: number): TimedWord[][][] {
    if (values.length === 0) {
      return [];
    }

    const pageCount = Math.max(1, Math.ceil(values.length / maxChunkSize));
    const baseSize = Math.floor(values.length / pageCount);
    const remainder = values.length % pageCount;

    const targetSizes = Array.from({ length: pageCount }, (_, pageIndex) =>
      pageIndex < remainder ? baseSize + 1 : baseSize
    );

    const polishedTargetSizes = this.polishBoundarySizesForPhraseContinuity(
      values,
      targetSizes,
      maxChunkSize
    );

    const chunks: TimedWord[][][] = [];
    let offset = 0;

    for (const size of polishedTargetSizes) {
      chunks.push(values.slice(offset, offset + size));
      offset += size;
    }

    return chunks;
  }

  private polishBoundarySizesForPhraseContinuity(
    values: TimedWord[][],
    targetSizes: number[],
    maxChunkSize: number
  ): number[] {
    const sizes = [...targetSizes];
    let runningOffset = 0;

    for (let pageIndex = 0; pageIndex < sizes.length - 1; pageIndex += 1) {
      const leftSize = sizes[pageIndex] ?? 0;
      const rightSize = sizes[pageIndex + 1] ?? 0;
      if (leftSize <= 0 || rightSize <= 0) {
        runningOffset += leftSize;
        continue;
      }

      const boundary = runningOffset + leftSize;
      if (!this.isPhraseContinuationBoundary(values, boundary)) {
        runningOffset += leftSize;
        continue;
      }

      const candidateShifts = [0, -1, 1];
      let bestShift = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const shift of candidateShifts) {
        const candidateLeftSize = leftSize + shift;
        const candidateRightSize = rightSize - shift;

        if (
          candidateLeftSize < 1 ||
          candidateRightSize < 1 ||
          candidateLeftSize > maxChunkSize ||
          candidateRightSize > maxChunkSize
        ) {
          continue;
        }

        const candidateBoundary = runningOffset + candidateLeftSize;
        const splitPenalty = this.isPhraseContinuationBoundary(values, candidateBoundary) ? 100 : 0;
        const balancePenalty = Math.abs(candidateLeftSize - candidateRightSize);
        const movementPenalty = Math.abs(shift);
        const score = splitPenalty + balancePenalty + movementPenalty;

        if (score < bestScore) {
          bestScore = score;
          bestShift = shift;
        }
      }

      sizes[pageIndex] = leftSize + bestShift;
      sizes[pageIndex + 1] = rightSize - bestShift;
      runningOffset += sizes[pageIndex] ?? 0;
    }

    return sizes;
  }

  private isPhraseContinuationBoundary(values: TimedWord[][], boundary: number): boolean {
    if (boundary <= 0 || boundary >= values.length) {
      return false;
    }

    const leftLine = values[boundary - 1];
    const rightLine = values[boundary];
    const left = leftLine?.[leftLine.length - 1];
    const right = rightLine?.[0];

    if (left === undefined || right === undefined) {
      return false;
    }

    return left.sourceLineIndex === right.sourceLineIndex;
  }
}
