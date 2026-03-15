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
      const baseLrcFile = LrcFileParser.parseFileContent(lrcContent);
      const lrcFile     = this.applyLrcTransforms(baseLrcFile, options);

      const plan = this.planner.createPlan(lrcFile, {
        allBreaks:        options.allBreaks   ?? false,
        wrapGracePx:      options.wrapGracePx ?? 0,
        maxLines:         options.maxLines,
        defaultFontName:  options.font      ?? CdgConvertLrcBrowserFlow.defaultFontName,
        defaultFontSize:  options.fontSize  ?? CdgConvertLrcBrowserFlow.defaultFontSize,
        defaultFontStyle: options.fontStyle ?? CdgConvertLrcBrowserFlow.defaultFontStyle
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
      });

      return this.serializer.serialize(generation.packets);
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
}

// vim: set ft=typescript:
// END
