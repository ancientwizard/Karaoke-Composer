/*
 * CdgConvertLrcBrowserFlow module.
 * Browser-compatible variant of CdgConvertLrcFlow.
 * Accepts LRC content as a string (no file I/O) and uses OffscreenCanvas-backed
 * BrowserTextRasterizerAdapter instead of the Node/canvas native adapter.
 */

import { FlowExecutionError               } from "@/CDGSharp/shared/FlowExecutionError";
import { FlowOptionsValidator             } from "@/CDGSharp/shared/FlowOptionsValidator";
import { LrcFileParser                    } from "@/CDGSharp/convert/lrc/LrcFileParser";
import { KaraokeCommandPlanner            } from "@/CDGSharp/convert/planning/KaraokeCommandPlanner";
import { KaraokePacketGenerator           } from "@/CDGSharp/convert/generation/KaraokePacketGenerator";
import { CdgPacketSerializer              } from "@/CDGSharp/convert/serialization/CdgPacketSerializer";
import { BrowserTextRasterizerAdapter     } from "@/CDGSharp/convert/rendering/BrowserTextRasterizerAdapter";
import type { LrcFile                     } from "@/CDGSharp/convert/lrc/LrcModels";
import type { KaraokeGenerationProgress   } from "@/CDGSharp/convert/generation/KaraokePacketGenerator";

/**
 * Options mirror the CLI flags from convert-lrc.ts, minus file-system paths.
 * All fields are optional; defaults match the CLI defaults.
 */
export interface CdgConvertLrcBrowserOptions {
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
  transitionMode?: "clear" | "trailing-wipe";
  trailingWipeDelayMs?: number;
  trailingWipeRegionReadyThreshold?: number;
  onProgress?: (progress: CdgConvertLrcBrowserProgress) => void;
}

export interface CdgConvertLrcBrowserProgress {
  phase: "parsing" | "planning" | "generating" | "serializing" | "done";
  percent: number;
  message: string;
  packetCount?: number;
}

export class CdgConvertLrcBrowserFlow
{
  private static readonly defaultFontName = "DejaVu Sans";

  private static readonly defaultBgColor      = "#008";
  private static readonly defaultTextColor     = "#fff";
  private static readonly defaultSungColor     = "#ff0";
  private static readonly defaultFontSize      = 17;
  private static readonly defaultFontStyle     = "regular" as const;
  private static readonly defaultTransitionMode = "trailing-wipe" as const;

  private readonly rasterizer = new BrowserTextRasterizerAdapter();

  private readonly planner    = new KaraokeCommandPlanner(this.rasterizer);

  private readonly generator  = new KaraokePacketGenerator(this.rasterizer);

  private readonly serializer = new CdgPacketSerializer();

  /**
   * Convert LRC text content to a CD+G binary blob.
   *
   * @param lrcContent - Raw LRC file text (as produced by LRCWriter.toLRC)
   * @param options    - CDGSharp generation options
   * @returns          - Packed CD+G bytes ready for download / file save
   */
  public execute(lrcContent: string, options: CdgConvertLrcBrowserOptions = {}): Uint8Array
  {
    this.validateOptions(options);

    try
    {
      this.reportProgress(options, {
        phase: "parsing",
        percent: 10,
        message: "Parsing LRC"
      });

      const baseLrcFile = LrcFileParser.parseFileContent(lrcContent);
      const lrcFile     = this.applyLrcTransforms(baseLrcFile, options);

      this.reportProgress(options, {
        phase: "planning",
        percent: 30,
        message: "Planning render commands"
      });

      const plan = this.planner.createPlan(lrcFile, {
        allBreaks:        options.allBreaks   ?? false,
        wrapGracePx:      options.wrapGracePx ?? 0,
        maxLines:         options.maxLines,
        defaultFontName:  options.font      ?? CdgConvertLrcBrowserFlow.defaultFontName,
        defaultFontSize:  options.fontSize  ?? CdgConvertLrcBrowserFlow.defaultFontSize,
        defaultFontStyle: options.fontStyle ?? CdgConvertLrcBrowserFlow.defaultFontStyle
      });

      this.reportProgress(options, {
        phase: "generating",
        percent: 55,
        message: "Generating CD+G packets"
      });

      const generation = this.generator.generateWithDiagnostics({
        plan,
        style: {
          bgColor:      options.bgColor      ?? CdgConvertLrcBrowserFlow.defaultBgColor,
          textColor:    options.textColor    ?? CdgConvertLrcBrowserFlow.defaultTextColor,
          sungTextColor: options.sungTextColor ?? CdgConvertLrcBrowserFlow.defaultSungColor,
          fontName:     options.font      ?? CdgConvertLrcBrowserFlow.defaultFontName,
          fontSize:     options.fontSize  ?? CdgConvertLrcBrowserFlow.defaultFontSize,
          fontStyle:    options.fontStyle ?? CdgConvertLrcBrowserFlow.defaultFontStyle,
          wrapGracePx:  options.wrapGracePx ?? 0,
          transitionMode:                    options.transitionMode ?? CdgConvertLrcBrowserFlow.defaultTransitionMode,
          trailingWipeDelayMs:               options.trailingWipeDelayMs ?? 2000,
          trailingWipeRegionReadyThreshold:  options.trailingWipeRegionReadyThreshold ?? 0.8
        }
      }, {
        onProgress: (progress: KaraokeGenerationProgress) => {
          if (progress.phase === "generating-pages") {
            const total = Math.max(1, progress.totalPages);
            const ratio = Math.max(0, Math.min(1, progress.processedPages / total));
            const percent = 55 + Math.round(ratio * 25);

            this.reportProgress(options, {
              phase: "generating",
              percent,
              message: `Generating packets (${progress.processedPages}/${total} pages)`,
              packetCount: progress.packetsSoFar
            });
            return;
          }

          if (progress.phase === "finalizing") {
            this.reportProgress(options, {
              phase: "serializing",
              percent: 83,
              message: "Finalizing packet timeline",
              packetCount: progress.packetsSoFar
            });
          }
        }
      });

      this.reportProgress(options, {
        phase: "serializing",
        percent: 85,
        message: "Serializing binary output",
        packetCount: generation.packets.length
      });

      const bytes = this.serializer.serialize(generation.packets);

      this.reportProgress(options, {
        phase: "done",
        percent: 100,
        message: "Encoding complete",
        packetCount: generation.packets.length
      });

      return bytes;
    }
    catch (error)
    {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new FlowExecutionError(`CDGSharp browser flow failed: ${error.message}`);
      }

      throw new FlowExecutionError("CDGSharp browser flow failed with an unknown error.");
    }
  }

  public async executeAsync(lrcContent: string, options: CdgConvertLrcBrowserOptions = {}): Promise<Uint8Array>
  {
    this.validateOptions(options);

    try
    {
      this.reportProgress(options, {
        phase: "parsing",
        percent: 10,
        message: "Parsing LRC"
      });

      const baseLrcFile = LrcFileParser.parseFileContent(lrcContent);
      const lrcFile     = this.applyLrcTransforms(baseLrcFile, options);

      this.reportProgress(options, {
        phase: "planning",
        percent: 30,
        message: "Planning render commands"
      });

      const plan = this.planner.createPlan(lrcFile, {
        allBreaks:        options.allBreaks   ?? false,
        wrapGracePx:      options.wrapGracePx ?? 0,
        maxLines:         options.maxLines,
        defaultFontName:  options.font      ?? CdgConvertLrcBrowserFlow.defaultFontName,
        defaultFontSize:  options.fontSize  ?? CdgConvertLrcBrowserFlow.defaultFontSize,
        defaultFontStyle: options.fontStyle ?? CdgConvertLrcBrowserFlow.defaultFontStyle
      });

      this.reportProgress(options, {
        phase: "generating",
        percent: 55,
        message: "Generating CD+G packets"
      });

      const generation = await this.generator.generateWithDiagnosticsAsync({
        plan,
        style: {
          bgColor:      options.bgColor      ?? CdgConvertLrcBrowserFlow.defaultBgColor,
          textColor:    options.textColor    ?? CdgConvertLrcBrowserFlow.defaultTextColor,
          sungTextColor: options.sungTextColor ?? CdgConvertLrcBrowserFlow.defaultSungColor,
          fontName:     options.font      ?? CdgConvertLrcBrowserFlow.defaultFontName,
          fontSize:     options.fontSize  ?? CdgConvertLrcBrowserFlow.defaultFontSize,
          fontStyle:    options.fontStyle ?? CdgConvertLrcBrowserFlow.defaultFontStyle,
          wrapGracePx:  options.wrapGracePx ?? 0,
          transitionMode:                    options.transitionMode ?? CdgConvertLrcBrowserFlow.defaultTransitionMode,
          trailingWipeDelayMs:               options.trailingWipeDelayMs ?? 2000,
          trailingWipeRegionReadyThreshold:  options.trailingWipeRegionReadyThreshold ?? 0.8
        }
      }, {
        onProgress: (progress: KaraokeGenerationProgress) => {
          if (progress.phase === "generating-pages") {
            const total = Math.max(1, progress.totalPages);
            const ratio = Math.max(0, Math.min(1, progress.processedPages / total));
            const percent = 55 + Math.round(ratio * 25);

            this.reportProgress(options, {
              phase: "generating",
              percent,
              message: `Generating packets (${progress.processedPages}/${total} pages)`,
              packetCount: progress.packetsSoFar
            });
            return;
          }

          if (progress.phase === "finalizing") {
            this.reportProgress(options, {
              phase: "serializing",
              percent: 83,
              message: "Finalizing packet timeline",
              packetCount: progress.packetsSoFar
            });
          }
        },
        yieldToMainThread: async () => {
          await this.yieldToMainThread();
        }
      });

      this.reportProgress(options, {
        phase: "serializing",
        percent: 85,
        message: "Serializing binary output",
        packetCount: generation.packets.length
      });

      const bytes = this.serializer.serialize(generation.packets);

      this.reportProgress(options, {
        phase: "done",
        percent: 100,
        message: "Encoding complete",
        packetCount: generation.packets.length
      });

      return bytes;
    }
    catch (error)
    {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new FlowExecutionError(`CDGSharp browser flow failed: ${error.message}`);
      }

      throw new FlowExecutionError("CDGSharp browser flow failed with an unknown error.");
    }
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  private validateOptions(options: CdgConvertLrcBrowserOptions): void
  {
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
  }

  private applyLrcTransforms(lrcFile: LrcFile, options: CdgConvertLrcBrowserOptions): LrcFile
  {
    let transformed = lrcFile;

    if (options.uppercaseText === true)
    {
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

    if (options.modifyTimestamps !== undefined && options.modifyTimestamps !== 0)
    {
      const deltaMs = Math.round(options.modifyTimestamps * 1000);
      transformed = {
        ...transformed,
        lyrics: {
          pages: transformed.lyrics.pages.map((page) =>
            page.map((line) =>
              line.map((word) => ({
                ...word,
                startTime: word.startTime === null ? null : word.startTime + deltaMs,
                endTime:   word.endTime   === null ? null : word.endTime   + deltaMs
              }))
            )
          )
        }
      };
    }

    return transformed;
  }

  private reportProgress(
    options: CdgConvertLrcBrowserOptions,
    progress: CdgConvertLrcBrowserProgress
  ): void
  {
    try
    {
      options.onProgress?.(progress);
    }
    catch
    {
      // Never let UI callback issues affect encoding.
    }
  }

  private async yieldToMainThread(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(() => resolve(), 0);
    });
  }
}

// vim: set ft=typescript:
// END
