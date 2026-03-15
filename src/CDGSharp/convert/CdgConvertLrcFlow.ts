/*
 * CdgConvertLrcFlow module features.
 * Contains implementation for cdg convert lrc flow.
 */

import { FlowExecutionError     } from "@/CDGSharp/shared/FlowExecutionError";
import { FlowOptionsValidator   } from "@/CDGSharp/shared/FlowOptionsValidator";
import { LrcFileParser          } from "@/CDGSharp/convert/lrc/LrcFileParser";
import { KaraokeCommandPlanner  } from "@/CDGSharp/convert/planning/KaraokeCommandPlanner";
import { KaraokePacketGenerator } from "@/CDGSharp/convert/generation/KaraokePacketGenerator";
import { CdgPacketSerializer    } from "@/CDGSharp/convert/serialization/CdgPacketSerializer";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { LrcFile           } from "@/CDGSharp/convert/lrc/LrcModels";
import { dirname                } from "node:path";

export interface CdgConvertLrcOptions {
  filePath: string;
  bgColor?: string;
  textColor?: string;
  sungTextColor?: string;
  font?: string;
  fontSize?: number;
  fontStyle?: "regular" | "bold";
  uppercaseText?: boolean;
  modifyTimestamps?: number;
  allBreaks?: boolean;
  wrapGracePx?: number;
  maxLines?: number;
  debugTimingJsonPath?: string;
  debugSchedulingLogPath?: string;
  transitionMode?: "clear" | "trailing-wipe";
  trailingWipeDelayMs?: number;
  trailingWipeRegionReadyThreshold?: number;
}

export class CdgConvertLrcFlow {
  private static readonly defaultFontName = "Arial";

  private readonly planner = new KaraokeCommandPlanner();

  private readonly generator = new KaraokePacketGenerator();

  private readonly serializer = new CdgPacketSerializer();

  public execute(options: CdgConvertLrcOptions): Uint8Array {
    const filePath = FlowOptionsValidator.requireFilePath(options.filePath);

    if (options.bgColor !== undefined) {
      FlowOptionsValidator.requireHexColorNibble(options.bgColor, "bgColor");
    }

    if (options.textColor !== undefined) {
      FlowOptionsValidator.requireHexColorNibble(options.textColor, "textColor");
    }

    if (options.sungTextColor !== undefined) {
      FlowOptionsValidator.requireHexColorNibble(options.sungTextColor, "sungTextColor");
    }

    if (options.modifyTimestamps !== undefined && !Number.isFinite(options.modifyTimestamps)) {
      throw new FlowExecutionError("modifyTimestamps must be a finite number of seconds.");
    }

    if (options.maxLines !== undefined) {
      FlowOptionsValidator.requirePositiveInteger(options.maxLines, "maxLines");
    }

    if (
      options.transitionMode !== undefined &&
      options.transitionMode !== "clear" &&
      options.transitionMode !== "trailing-wipe"
    ) {
      throw new FlowExecutionError("transitionMode must be either 'clear' or 'trailing-wipe'.");
    }

    if (options.trailingWipeDelayMs !== undefined) {
      FlowOptionsValidator.requirePositiveInteger(options.trailingWipeDelayMs, "trailingWipeDelayMs");
    }

    if (
      options.trailingWipeRegionReadyThreshold !== undefined &&
      (
        !Number.isFinite(options.trailingWipeRegionReadyThreshold) ||
        options.trailingWipeRegionReadyThreshold < 0 ||
        options.trailingWipeRegionReadyThreshold > 1
      )
    ) {
      throw new FlowExecutionError("trailingWipeRegionReadyThreshold must be a number between 0 and 1.");
    }

    if (options.debugTimingJsonPath !== undefined) {
      FlowOptionsValidator.requireFilePath(options.debugTimingJsonPath);
    }

    if (options.debugSchedulingLogPath !== undefined) {
      FlowOptionsValidator.requireFilePath(options.debugSchedulingLogPath);
    }

    try {
      const content = readFileSync(filePath, "utf8");
      const baseLrcFile = LrcFileParser.parseFileContent(content);
      const lrcFile = this.applyLrcTransforms(baseLrcFile, options);
      const plan = this.planner.createPlan(lrcFile, {
        allBreaks: options.allBreaks ?? false,
        wrapGracePx: options.wrapGracePx ?? 0,
        maxLines: options.maxLines,
        defaultFontName: options.font ?? CdgConvertLrcFlow.defaultFontName,
        defaultFontSize: options.fontSize ?? 16,
        defaultFontStyle: options.fontStyle ?? "regular"
      });

      const generation = this.generator.generateWithDiagnostics({
        plan,
        style: {
          bgColor: options.bgColor ?? "#008",
          textColor: options.textColor ?? "#FFF",
          sungTextColor: options.sungTextColor ?? "#666",
          fontName: options.font ?? CdgConvertLrcFlow.defaultFontName,
          fontSize: options.fontSize ?? 16,
          fontStyle: options.fontStyle ?? "regular",
          wrapGracePx: options.wrapGracePx ?? 0,
          transitionMode: options.transitionMode ?? "clear",
          trailingWipeDelayMs: options.trailingWipeDelayMs ?? 2000,
          trailingWipeRegionReadyThreshold: options.trailingWipeRegionReadyThreshold ?? 0.8
        }
      });

      if (options.debugTimingJsonPath !== undefined) {
        const debugPath = FlowOptionsValidator.requireFilePath(options.debugTimingJsonPath);
        mkdirSync(dirname(debugPath), { recursive: true });
        const timingReport = this.planner.createTimingDebugReport(plan);
        writeFileSync(
          debugPath,
          `${JSON.stringify({
            ...timingReport,
            generationDiagnostics: generation.diagnostics
          }, null, 2)}\n`,
          "utf8"
        );
      }

      if (options.debugSchedulingLogPath !== undefined) {
        const debugPath = FlowOptionsValidator.requireFilePath(options.debugSchedulingLogPath);
        mkdirSync(dirname(debugPath), { recursive: true });
        writeFileSync(
          debugPath,
          `${this.formatTrailingWipeSchedulingLog(generation.diagnostics)}\n`,
          "utf8"
        );
      }

      const packets = generation.packets;
      return this.serializer.serialize(packets);

    } catch (error) {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new FlowExecutionError(`Convert-lrc flow failed: ${error.message}`);
      }

      throw new FlowExecutionError("Convert-lrc flow failed with an unknown error.");
    }
  }

  private applyLrcTransforms(lrcFile: LrcFile, options: CdgConvertLrcOptions): LrcFile {
    let transformed = lrcFile;

    if (options.uppercaseText === true) {
      transformed = {
        ...transformed,
        lyrics: {
          pages: transformed.lyrics.pages.map((page) =>
            page.map((line) =>
              line.map((word) => ({
                ...word,
                text: word.text.toUpperCase()
              }))
            )
          )
        }
      };
    }

    if (options.modifyTimestamps !== undefined && options.modifyTimestamps !== 0) {
      const deltaMs = Math.round(options.modifyTimestamps * 1000);
      transformed = {
        ...transformed,
        lyrics: {
          pages: transformed.lyrics.pages.map((page) =>
            page.map((line) =>
              line.map((word) => ({
                ...word,
                startTime: word.startTime === null ? null : word.startTime + deltaMs,
                endTime: word.endTime === null ? null : word.endTime + deltaMs
              }))
            )
          )
        }
      };
    }

    return transformed;
  }

  private formatTrailingWipeSchedulingLog(diagnostics: {
    trailingWipe: {
      pageDiagnostics: Array<{
        lyricsPageIndex: number;
        pendingTaskCountIn: number;
        currentTaskCount: number;
        blockedRegionTaskCount: number;
        blockedRegionPacketCount: number;
        cleanerPacketAppliedCount: number;
        overflowTaskCountOut: number;
        lineTimingDiagnostics: Array<{
          lineIndex: number;
          text: string;
          isFirstLyricsPage: boolean;
          lineDurationMs: number;
          activeLineDurationMs: number;
          baseDelayMs: number;
          assignedDelayMs: number;
          wipeStartAbsoluteMs: number;
          nextLyricsPageStartTimeMs?: number;
          leadBeforeNextPageMs?: number;
        }>;
      }>;
    };
  }): string {
    const lines: string[] = ["# Scheduling Audit (trailing-wipe)", ""];

    for (const page of diagnostics.trailingWipe.pageDiagnostics) {
      lines.push(`Page ${page.lyricsPageIndex}`);
      lines.push(
        `  cleaner summary: pendingIn=${page.pendingTaskCountIn} current=${page.currentTaskCount} applied=${page.cleanerPacketAppliedCount} blockedTasks=${page.blockedRegionTaskCount} blockedPackets=${page.blockedRegionPacketCount} overflowOut=${page.overflowTaskCountOut}`
      );
      lines.push("  line wipe timing:");

      for (const line of page.lineTimingDiagnostics) {
        const nextPageText =
          line.nextLyricsPageStartTimeMs === undefined ? "n/a" : `${line.nextLyricsPageStartTimeMs}ms`;
        const leadText =
          line.leadBeforeNextPageMs === undefined
            ? "n/a"
            : `${Math.round(line.leadBeforeNextPageMs)}ms`;

        lines.push(
          `    L${line.lineIndex + 1} firstLyrics=${line.isFirstLyricsPage} active=${line.activeLineDurationMs}ms total=${line.lineDurationMs}ms base=${line.baseDelayMs}ms assigned=${line.assignedDelayMs}ms start=${Math.round(line.wipeStartAbsoluteMs)}ms next=${nextPageText} lead=${leadText} text=\"${line.text}\"`
        );
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}
