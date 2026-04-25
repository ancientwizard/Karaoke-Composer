/*
 * KaraokePacketGenerator module features.
 * Contains implementation for karaoke packet generator.
 */

import { FlowExecutionError                   } from "@/CDGSharp/shared/FlowExecutionError";
import type { GeneratedCdgPacket, GenerationInput } from "@/CDGSharp/convert/generation/CdgPacketModels";
import { KaraokePacketScheduling              } from "@/CDGSharp/convert/generation/KaraokePacketScheduling";
import { KaraokePacketTiming                  } from "@/CDGSharp/convert/generation/KaraokePacketTiming";
import { KaraokeTileBlockFactory              } from "@/CDGSharp/convert/generation/KaraokeTileBlockFactory";
import type { TextRasterizerAdapter           } from "@/CDGSharp/convert/rendering/TextRasterizerAdapter";
import type { RasterizedText                  } from "@/CDGSharp/convert/rendering/RasterizedText";

interface TrailingCleanerTask {
  regionId: string;
  startOffsetPackets: number;
  totalPacketCount: number;
  packets: GeneratedCdgPacket[];
}

export interface TrailingCleanerLineTimingDiagnostics {
  lineIndex: number;
  text: string;
  isFirstLyricsPage: boolean;
  lineDurationMs: number;
  activeLineDurationMs: number;
  lineEndMs: number;
  activeLineEndMs: number;
  baseDelayMs: number;
  assignedDelayMs: number;
  wipeDurationMs: number;
  wipeStartOffsetPackets: number;
  wipeStartAbsoluteMs: number;
  nextLyricsPageStartTimeMs?: number;
  leadBeforeNextPageMs?: number;
}

export interface TrailingCleanerPageDiagnostics {
  lyricsPageIndex: number;
  basePacketCount: number;
  pendingTaskCountIn: number;
  currentTaskCount: number;
  blockedRegionTaskCount: number;
  blockedRegionPacketCount: number;
  droppedByThresholdTaskCount: number;
  droppedByThresholdPacketCount: number;
  cleanerPacketAppliedCount: number;
  overflowTaskCountOut: number;
  overflowPacketCountOut: number;
  lineTimingDiagnostics: TrailingCleanerLineTimingDiagnostics[];
}

export interface KaraokeGenerationDiagnostics {
  trailingWipe: {
    pageDiagnostics: TrailingCleanerPageDiagnostics[];
  };
}

export interface KaraokeGenerationProgress {
  phase: "generating-pages" | "finalizing" | "done";
  processedPages: number;
  totalPages: number;
  packetsSoFar: number;
}

export interface KaraokeGenerationOptions {
  onProgress?: (progress: KaraokeGenerationProgress) => void;
  yieldToMainThread?: () => Promise<void>;
}

export class KaraokePacketGenerator {
  private static readonly displayWidth = 288;

  private static readonly displayHeight = 192;

  private readonly rasterizer: TextRasterizerAdapter;

  public constructor(rasterizer: TextRasterizerAdapter)
  {
    this.rasterizer = rasterizer;
  }

  private static readonly minLineHeightPadding = 0;

  private static readonly lyricsDrawLeadInMs = 2000;

  private static readonly firstLyricsDrawLeadInMs = 1300;

  private static readonly firstLyricsTransitionAdvanceMs = 500;

  private static readonly sungSliceWidthPx = 3;

  private static readonly defaultTrailingWipeDelayMs = 2000;

  public getFillingPackets(durationMs: number): GeneratedCdgPacket[] | null {
    return KaraokePacketScheduling.tryGetFillingPackets(durationMs);
  }

  public generate(input: GenerationInput, options: KaraokeGenerationOptions = {}): GeneratedCdgPacket[] {
    return this.generateWithDiagnostics(input, options).packets;
  }

  public generateWithDiagnostics(input: GenerationInput, options: KaraokeGenerationOptions = {}): {
    packets: GeneratedCdgPacket[];
    diagnostics: KaraokeGenerationDiagnostics;
  } {
    const packets: GeneratedCdgPacket[] = [];
    let renderedDurationMs = 0;
    let pendingTrailingCleanerTasks: TrailingCleanerTask[] = [];
    const trailingWipePageDiagnostics: TrailingCleanerPageDiagnostics[] = [];

    const pages = [
      {
        startTimeMs: 0,
        lines: [
          [{ text: input.plan.title, durationMs: 0 }],
          [{ text: input.plan.artist, durationMs: 0 }]
        ],
        includeSung: false,
        mode: "title" as const
      },
      ...input.plan.pages.map((page) => ({
        ...page,
        includeSung: true,
        mode: "lyrics" as const
      }))
    ];

    const sortedPages = [...pages].sort((a, b) => a.startTimeMs - b.startTimeMs);
    const firstLyricsPageIndex = sortedPages.findIndex((page) => page.mode === "lyrics");
    const totalPages = sortedPages.length;

    this.reportProgress(options, {
      phase: "generating-pages",
      processedPages: 0,
      totalPages,
      packetsSoFar: 0
    });

    for (let pageIndex = 0; pageIndex < sortedPages.length; pageIndex += 1) {
      const page = sortedPages[pageIndex];
      if (page === undefined) {
        continue;
      }

      const currentRenderDurationMs = renderedDurationMs;

      if (page.mode === "lyrics") {
        const nextLyricsPageStartTimeMs = sortedPages
          .slice(pageIndex + 1)
          .find((candidate) => candidate.mode === "lyrics")?.startTimeMs;

        const lyricsPage = this.createLyricsPagePackets(
          input,
          page,
          currentRenderDurationMs,
          pageIndex === firstLyricsPageIndex,
          pendingTrailingCleanerTasks,
          nextLyricsPageStartTimeMs
        );
        let lyricsPagePackets = lyricsPage.packets;

        if ((input.style.transitionMode ?? "clear") === "trailing-wipe") {
          const pendingTaskCountIn = pendingTrailingCleanerTasks.length;
          const merged = this.mergeTrailingCleanerTasksIntoPage(
            input,
            lyricsPagePackets,
            pendingTrailingCleanerTasks,
            lyricsPage.trailingCleanerTasks,
            new Set(lyricsPage.occupiedRegionIds)
          );
          lyricsPagePackets = merged.packets;
          pendingTrailingCleanerTasks = merged.overflowTasks;

          trailingWipePageDiagnostics.push({
            lyricsPageIndex: pageIndex,
            basePacketCount: lyricsPage.packets.length,
            pendingTaskCountIn,
            currentTaskCount: lyricsPage.trailingCleanerTasks.length,
            blockedRegionTaskCount: merged.blockedRegionTaskCount,
            blockedRegionPacketCount: merged.blockedRegionPacketCount,
            droppedByThresholdTaskCount: merged.droppedByThresholdTaskCount,
            droppedByThresholdPacketCount: merged.droppedByThresholdPacketCount,
            cleanerPacketAppliedCount: merged.appliedCleanerPacketCount,
            overflowTaskCountOut: merged.overflowTasks.length,
            overflowPacketCountOut: merged.overflowTasks.reduce((sum, task) => sum + task.packets.length, 0),
            lineTimingDiagnostics: lyricsPage.trailingCleanerLineDiagnostics
          });
        } else {
          pendingTrailingCleanerTasks = [];
        }

        packets.push(...lyricsPagePackets);
        renderedDurationMs = KaraokePacketTiming.getRenderDurationMs(packets.length);

        this.reportProgress(options, {
          phase: "generating-pages",
          processedPages: pageIndex + 1,
          totalPages,
          packetsSoFar: packets.length
        });
        continue;
      }

      const timeToFillMs = page.startTimeMs - renderedDurationMs;
      const shouldApplyInitialFill = packets.length > 0;
      if (shouldApplyInitialFill) {
        const filling = this.getFillingPackets(timeToFillMs);
        if (filling !== null) {
          packets.push(...filling);
        }
      }

      const pageInitPackets: GeneratedCdgPacket[] = [
        this.createMemoryPresetPacket(0, 0),
        ...this.createColorTablePackets(input.style.bgColor, input.style.textColor, input.style.sungTextColor, page.includeSung)
      ];

      const drawTextPackets = this.createTitleDrawTextPackets(input, page.lines);
      const singPackets = page.includeSung ? this.createSungPackets(input, page.lines, 3) : [];
      const interleavedOrAppendedPackets = this.combineDrawAndSingPackets(drawTextPackets, singPackets);

      packets.push(...pageInitPackets);
      packets.push(...interleavedOrAppendedPackets);

      const intrinsicDurationMs = page.lines
        .flatMap((line) => line)
        .reduce((sum, linePart) => sum + linePart.durationMs, 0);
      const pageDurationMs = intrinsicDurationMs;
      const renderMs = KaraokePacketTiming.getRenderDurationMs(
        pageInitPackets.length + interleavedOrAppendedPackets.length
      );
      const remainingMs = pageDurationMs - renderMs;
      const pageFillPackets = this.getFillingPackets(remainingMs) ?? [];
      packets.push(...pageFillPackets);

      renderedDurationMs = KaraokePacketTiming.getRenderDurationMs(packets.length);

      this.reportProgress(options, {
        phase: "generating-pages",
        processedPages: pageIndex + 1,
        totalPages,
        packetsSoFar: packets.length
      });
    }

    if (packets.length === 0) {
      this.reportProgress(options, {
        phase: "done",
        processedPages: totalPages,
        totalPages,
        packetsSoFar: 0
      });

      return {
        packets: [],
        diagnostics: {
          trailingWipe: {
            pageDiagnostics: trailingWipePageDiagnostics
          }
        }
      };
    }

    this.reportProgress(options, {
      phase: "finalizing",
      processedPages: totalPages,
      totalPages,
      packetsSoFar: packets.length
    });

    this.reportProgress(options, {
      phase: "done",
      processedPages: totalPages,
      totalPages,
      packetsSoFar: packets.length
    });

    return {
      packets,
      diagnostics: {
        trailingWipe: {
          pageDiagnostics: trailingWipePageDiagnostics
        }
      }
    };
  }

  public async generateWithDiagnosticsAsync(input: GenerationInput, options: KaraokeGenerationOptions = {}): Promise<{
    packets: GeneratedCdgPacket[];
    diagnostics: KaraokeGenerationDiagnostics;
  }> {
    const packets: GeneratedCdgPacket[] = [];
    let renderedDurationMs = 0;
    let pendingTrailingCleanerTasks: TrailingCleanerTask[] = [];
    const trailingWipePageDiagnostics: TrailingCleanerPageDiagnostics[] = [];

    const pages = [
      {
        startTimeMs: 0,
        lines: [
          [{ text: input.plan.title, durationMs: 0 }],
          [{ text: input.plan.artist, durationMs: 0 }]
        ],
        includeSung: false,
        mode: "title" as const
      },
      ...input.plan.pages.map((page) => ({
        ...page,
        includeSung: true,
        mode: "lyrics" as const
      }))
    ];

    const sortedPages = [...pages].sort((a, b) => a.startTimeMs - b.startTimeMs);
    const firstLyricsPageIndex = sortedPages.findIndex((page) => page.mode === "lyrics");
    const totalPages = sortedPages.length;

    this.reportProgress(options, {
      phase: "generating-pages",
      processedPages: 0,
      totalPages,
      packetsSoFar: 0
    });

    await this.yieldControl(options);

    for (let pageIndex = 0; pageIndex < sortedPages.length; pageIndex += 1) {
      const page = sortedPages[pageIndex];
      if (page === undefined) {
        continue;
      }

      const currentRenderDurationMs = renderedDurationMs;

      if (page.mode === "lyrics") {
        const nextLyricsPageStartTimeMs = sortedPages
          .slice(pageIndex + 1)
          .find((candidate) => candidate.mode === "lyrics")?.startTimeMs;

        const lyricsPage = this.createLyricsPagePackets(
          input,
          page,
          currentRenderDurationMs,
          pageIndex === firstLyricsPageIndex,
          pendingTrailingCleanerTasks,
          nextLyricsPageStartTimeMs
        );
        let lyricsPagePackets = lyricsPage.packets;

        if ((input.style.transitionMode ?? "clear") === "trailing-wipe") {
          const pendingTaskCountIn = pendingTrailingCleanerTasks.length;
          const merged = this.mergeTrailingCleanerTasksIntoPage(
            input,
            lyricsPagePackets,
            pendingTrailingCleanerTasks,
            lyricsPage.trailingCleanerTasks,
            new Set(lyricsPage.occupiedRegionIds)
          );
          lyricsPagePackets = merged.packets;
          pendingTrailingCleanerTasks = merged.overflowTasks;

          trailingWipePageDiagnostics.push({
            lyricsPageIndex: pageIndex,
            basePacketCount: lyricsPage.packets.length,
            pendingTaskCountIn,
            currentTaskCount: lyricsPage.trailingCleanerTasks.length,
            blockedRegionTaskCount: merged.blockedRegionTaskCount,
            blockedRegionPacketCount: merged.blockedRegionPacketCount,
            droppedByThresholdTaskCount: merged.droppedByThresholdTaskCount,
            droppedByThresholdPacketCount: merged.droppedByThresholdPacketCount,
            cleanerPacketAppliedCount: merged.appliedCleanerPacketCount,
            overflowTaskCountOut: merged.overflowTasks.length,
            overflowPacketCountOut: merged.overflowTasks.reduce((sum, task) => sum + task.packets.length, 0),
            lineTimingDiagnostics: lyricsPage.trailingCleanerLineDiagnostics
          });
        } else {
          pendingTrailingCleanerTasks = [];
        }

        packets.push(...lyricsPagePackets);
        renderedDurationMs = KaraokePacketTiming.getRenderDurationMs(packets.length);

        this.reportProgress(options, {
          phase: "generating-pages",
          processedPages: pageIndex + 1,
          totalPages,
          packetsSoFar: packets.length
        });

        await this.yieldControl(options);
        continue;
      }

      const timeToFillMs = page.startTimeMs - renderedDurationMs;
      const shouldApplyInitialFill = packets.length > 0;
      if (shouldApplyInitialFill) {
        const filling = this.getFillingPackets(timeToFillMs);
        if (filling !== null) {
          packets.push(...filling);
        }
      }

      const pageInitPackets: GeneratedCdgPacket[] = [
        this.createMemoryPresetPacket(0, 0),
        ...this.createColorTablePackets(input.style.bgColor, input.style.textColor, input.style.sungTextColor, page.includeSung)
      ];

      const drawTextPackets = this.createTitleDrawTextPackets(input, page.lines);
      const singPackets = page.includeSung ? this.createSungPackets(input, page.lines, 3) : [];
      const interleavedOrAppendedPackets = this.combineDrawAndSingPackets(drawTextPackets, singPackets);

      packets.push(...pageInitPackets);
      packets.push(...interleavedOrAppendedPackets);

      const intrinsicDurationMs = page.lines
        .flatMap((line) => line)
        .reduce((sum, linePart) => sum + linePart.durationMs, 0);
      const pageDurationMs = intrinsicDurationMs;
      const renderMs = KaraokePacketTiming.getRenderDurationMs(
        pageInitPackets.length + interleavedOrAppendedPackets.length
      );
      const remainingMs = pageDurationMs - renderMs;
      const pageFillPackets = this.getFillingPackets(remainingMs) ?? [];
      packets.push(...pageFillPackets);

      renderedDurationMs = KaraokePacketTiming.getRenderDurationMs(packets.length);

      this.reportProgress(options, {
        phase: "generating-pages",
        processedPages: pageIndex + 1,
        totalPages,
        packetsSoFar: packets.length
      });

      await this.yieldControl(options);
    }

    if (packets.length === 0) {
      this.reportProgress(options, {
        phase: "done",
        processedPages: totalPages,
        totalPages,
        packetsSoFar: 0
      });

      return {
        packets: [],
        diagnostics: {
          trailingWipe: {
            pageDiagnostics: trailingWipePageDiagnostics
          }
        }
      };
    }

    this.reportProgress(options, {
      phase: "finalizing",
      processedPages: totalPages,
      totalPages,
      packetsSoFar: packets.length
    });

    await this.yieldControl(options);

    this.reportProgress(options, {
      phase: "done",
      processedPages: totalPages,
      totalPages,
      packetsSoFar: packets.length
    });

    return {
      packets,
      diagnostics: {
        trailingWipe: {
          pageDiagnostics: trailingWipePageDiagnostics
        }
      }
    };
  }

  private reportProgress(options: KaraokeGenerationOptions, progress: KaraokeGenerationProgress): void {
    try {
      options.onProgress?.(progress);
    } catch {
      // Progress callback must never break generation.
    }
  }

  private async yieldControl(options: KaraokeGenerationOptions): Promise<void> {
    if (options.yieldToMainThread === undefined) {
      return;
    }

    try {
      await options.yieldToMainThread();
    } catch {
      // Yield helper must never break generation.
    }
  }

  private createLyricsPagePackets(
    input: GenerationInput,
    page: {
      startTimeMs: number;
      lines: Array<Array<{ text: string; durationMs: number }>>;
      includeSung: boolean;
      mode: "lyrics";
    },
    currentRenderDurationMs: number,
    isFirstLyricsPage: boolean,
    pendingTrailingCleanerTasks: TrailingCleanerTask[],
    nextLyricsPageStartTimeMs?: number
  ): {
    packets: GeneratedCdgPacket[];
    trailingCleanerTasks: TrailingCleanerTask[];
    trailingCleanerLineDiagnostics: TrailingCleanerLineTimingDiagnostics[];
    occupiedRegionIds: string[];
  } {
    const transitionMode = input.style.transitionMode ?? "clear";
    const shouldHardClearAtPageStart = transitionMode === "clear" || isFirstLyricsPage;

    const pageInitPackets: GeneratedCdgPacket[] = [
      ...(shouldHardClearAtPageStart ? [this.createMemoryPresetPacket(0, 0)] : []),
      ...this.createColorTablePackets(input.style.bgColor, input.style.textColor, input.style.sungTextColor, true)
    ];

    const drawTextPackets =
      transitionMode === "trailing-wipe"
        ? this.createDrawTextPacketsWithRegionGating(input, page.lines, 1, pendingTrailingCleanerTasks)
        : this.createDrawTextPackets(input, page.lines, 1);
    const singPackets = this.createSungPackets(input, page.lines, 3);

    const drawTextDurationMs = KaraokePacketTiming.getRenderDurationMs(
      pageInitPackets.length + drawTextPackets.length
    );

    const leadInMs =
      transitionMode === "trailing-wipe"
        ? 0
        : isFirstLyricsPage
          ? KaraokePacketGenerator.firstLyricsDrawLeadInMs
          : KaraokePacketGenerator.lyricsDrawLeadInMs;
    const firstTransitionAdvanceMs =
      transitionMode === "trailing-wipe"
        ? 0
        : isFirstLyricsPage
          ? KaraokePacketGenerator.firstLyricsTransitionAdvanceMs
          : 0;

    const drawTextStartTimeMs = Math.max(
      page.startTimeMs - drawTextDurationMs - leadInMs - firstTransitionAdvanceMs,
      currentRenderDurationMs
    );

    const splitIndexRaw = Math.max(
      0,
      KaraokePacketTiming.getPacketCount(page.startTimeMs - drawTextStartTimeMs)
    );
    const splitIndex =
      isFirstLyricsPage && drawTextPackets.length > 0
        ? Math.max(1, splitIndexRaw)
        : splitIndexRaw;

    const drawTextPacketsBeforeSingStart =
      splitIndex < drawTextPackets.length ? drawTextPackets.slice(0, splitIndex) : drawTextPackets;
    const drawTextPacketsInBetween =
      splitIndex < drawTextPackets.length ? drawTextPackets.slice(splitIndex) : [];

    const fillingPacketsBeforeDraw =
      this.getFillingPackets(drawTextStartTimeMs - currentRenderDurationMs) ?? [];

    const singStartDeltaMs =
      page.startTimeMs -
      (currentRenderDurationMs +
        KaraokePacketTiming.getRenderDurationMs(
          fillingPacketsBeforeDraw.length +
            pageInitPackets.length +
            drawTextPacketsBeforeSingStart.length
        ));

    const fillingPacketsBeforeSing = this.getFillingPackets(singStartDeltaMs) ?? [];

    const trailingCleanerOffsetPackets =
      fillingPacketsBeforeDraw.length +
      pageInitPackets.length +
      drawTextPacketsBeforeSingStart.length +
      fillingPacketsBeforeSing.length;

    const trailingCleaner =
      transitionMode === "trailing-wipe"
        ? this.createTrailingWipeTasksFromLines(
            input,
            page.lines,
            trailingCleanerOffsetPackets,
            page.startTimeMs,
            nextLyricsPageStartTimeMs,
            isFirstLyricsPage
          )
        : {
            tasks: [],
            lineDiagnostics: []
          };

    const interleavedOrAppendedPackets = this.combineDrawAndSingPackets(
      drawTextPacketsInBetween,
      singPackets
    );

    const occupiedRegionIds =
      transitionMode === "trailing-wipe"
        ? this.getLineRegionIds(input, page.lines)
        : [];

    return {
      packets: [
        ...fillingPacketsBeforeDraw,
        ...pageInitPackets,
        ...drawTextPacketsBeforeSingStart,
        ...fillingPacketsBeforeSing,
        ...interleavedOrAppendedPackets,
        ...(transitionMode === "clear" ? [this.createMemoryPresetPacket(0, 0)] : [])
      ],
      trailingCleanerTasks: trailingCleaner.tasks,
      trailingCleanerLineDiagnostics: trailingCleaner.lineDiagnostics,
      occupiedRegionIds
    };
  }

  private mergeTrailingCleanerTasksIntoPage(
    input: GenerationInput,
    basePackets: GeneratedCdgPacket[],
    pendingTasks: TrailingCleanerTask[],
    currentPageTasks: TrailingCleanerTask[],
    occupiedRegions: Set<string>
  ): {
    packets: GeneratedCdgPacket[];
    overflowTasks: TrailingCleanerTask[];
    appliedCleanerPacketCount: number;
    blockedRegionTaskCount: number;
    blockedRegionPacketCount: number;
    droppedByThresholdTaskCount: number;
    droppedByThresholdPacketCount: number;
  } {
    const merged = [...basePackets];
    let appliedCleanerPacketCount = 0;

    const occupiedPendingTasks = pendingTasks.filter((task) => occupiedRegions.has(task.regionId));
    const blockedRegionTaskCount = occupiedPendingTasks.length;
    const blockedRegionPacketCount = occupiedPendingTasks.reduce(
      (sum, task) => sum + task.packets.length,
      0
    );

    const activeTasks: TrailingCleanerTask[] = [...pendingTasks, ...currentPageTasks].sort(
      (a, b) => a.startOffsetPackets - b.startOffsetPackets
    );

    const overflowTasks: TrailingCleanerTask[] = [];

    for (const task of activeTasks) {
      let timelineIndex = Math.max(0, task.startOffsetPackets);
      let packetIndex = 0;

      while (packetIndex < task.packets.length) {
        const packet = task.packets[packetIndex];
        if (packet === undefined) {
          packetIndex += 1;
          continue;
        }

        if (timelineIndex >= merged.length) {
          overflowTasks.push({
            regionId: task.regionId,
            startOffsetPackets: Math.max(0, timelineIndex - merged.length),
            totalPacketCount: task.totalPacketCount,
            packets: task.packets.slice(packetIndex)
          });
          break;
        }

        if (packet.kind === "empty") {
          timelineIndex += 1;
          packetIndex += 1;
          continue;
        }

        const slotPacket = merged[timelineIndex];
        if (slotPacket !== undefined && slotPacket.kind === "empty") {
          merged[timelineIndex] = packet;
          appliedCleanerPacketCount += 1;
          timelineIndex += 1;
          packetIndex += 1;
          continue;
        }

        timelineIndex += 1;
      }
    }

    return {
      packets: merged,
      overflowTasks,
      appliedCleanerPacketCount,
      blockedRegionTaskCount,
      blockedRegionPacketCount,
      droppedByThresholdTaskCount: 0,
      droppedByThresholdPacketCount: 0
    };
  }

  private combineDrawAndSingPackets(
    drawTextPackets: GeneratedCdgPacket[],
    singPackets: GeneratedCdgPacket[]
  ): GeneratedCdgPacket[] {
    const interleaved = KaraokePacketScheduling.replaceEmptyPackets(singPackets, drawTextPackets);
    const interleavedDrawCount = this.countTileBlocksByColor(interleaved, 1);

    if (interleavedDrawCount >= drawTextPackets.length) {
      return interleaved;
    }

    return [...drawTextPackets, ...singPackets];
  }

  private countTileBlocksByColor(packets: GeneratedCdgPacket[], colorIndex: number): number {
    return packets.filter(
      (packet) =>
        packet.kind === "cdg" &&
        packet.instruction.kind === "tile-block" &&
        packet.instruction.data.color2 === colorIndex
    ).length;
  }

  private createDrawTextPackets(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>,
    colorIndex: number
  ): GeneratedCdgPacket[] {
    const layouts = this.getLineLayouts(input, lines);

    const positioned = layouts.map((layout) => {
      const bitmap = this.rasterizer.rasterizeText(
        layout.fullText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      );

      return {
        x: layout.x,
        y: layout.y,
        text: bitmap
      };
    });

    return KaraokeTileBlockFactory.createDrawPackets(positioned, colorIndex);
  }

  private createDrawTextPacketsWithRegionGating(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>,
    colorIndex: number,
    pendingTrailingCleanerTasks: TrailingCleanerTask[]
  ): GeneratedCdgPacket[] {
    const layouts = this.getLineLayouts(input, lines);
    const lineBitmaps = layouts.map((layout) =>
      this.rasterizer.rasterizeText(
        layout.fullText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      )
    );

    const readyThreshold = Math.max(0, Math.min(1, input.style.trailingWipeRegionReadyThreshold ?? 0.8));
    const requiredCleanerPacketsByRegion = this.getRequiredCleanerPacketsByRegion(
      pendingTrailingCleanerTasks,
      readyThreshold
    );

    const packets: GeneratedCdgPacket[] = [];
    const deferredLines: Array<{ gatePackets: number; drawPackets: GeneratedCdgPacket[] }> = [];

    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index];
      const bitmap = lineBitmaps[index];
      if (layout === undefined || bitmap === undefined) {
        continue;
      }

      const regionId = this.getLineRegionId(layout, bitmap);
      const rawGatePackets = requiredCleanerPacketsByRegion.get(regionId) ?? 0;
      const gateScale = index <= 0 ? 1 : index === 1 ? 0.5 : 0;
      const gatePackets = Math.floor(rawGatePackets * gateScale);

      const lineDrawPackets = KaraokeTileBlockFactory.createDrawPackets(
        [{ x: layout.x, y: layout.y, text: bitmap }],
        colorIndex
      );

      if (gatePackets > 0) {
        deferredLines.push({
          gatePackets,
          drawPackets: lineDrawPackets
        });
        continue;
      }

      packets.push(...lineDrawPackets);
    }

    for (const deferredLine of deferredLines) {
      if (deferredLine.gatePackets > 0) {
        packets.push(...this.createEmptyPackets(deferredLine.gatePackets));
      }

      packets.push(...deferredLine.drawPackets);
    }

    return packets;
  }

  private getRequiredCleanerPacketsByRegion(
    pendingTrailingCleanerTasks: TrailingCleanerTask[],
    readyThreshold: number
  ): Map<string, number> {
    const requiredByRegion = new Map<string, number>();

    for (const task of pendingTrailingCleanerTasks) {
      const remaining = task.packets.length;
      const readinessScale = Math.max(0, Math.min(1, 1 - readyThreshold));
      const required = Math.max(0, Math.ceil(remaining * readinessScale));

      const current = requiredByRegion.get(task.regionId) ?? 0;
      requiredByRegion.set(task.regionId, current + required);
    }

    return requiredByRegion;
  }

  private createEmptyPackets(count: number): GeneratedCdgPacket[] {
    if (count <= 0) {
      return [];
    }

    return Array.from({ length: count }, () => ({ kind: "empty" as const }));
  }

  private createTitleDrawTextPackets(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>
  ): GeneratedCdgPacket[] {
    const titleText = lines[0]?.map((part) => part.text).join("") ?? "";
    const artistText = lines[1]?.map((part) => part.text).join("") ?? "";

    const titleFontSize = Math.floor((input.style.fontSize * 7) / 6);
    const artistFontSize = input.style.fontSize;

    const titleBitmap = this.rasterizer.rasterizeText(
      titleText,
      input.style.fontName,
      titleFontSize,
      input.style.fontStyle
    );
    const artistBitmap = this.rasterizer.rasterizeText(
      artistText,
      input.style.fontName,
      artistFontSize,
      input.style.fontStyle
    );

    const titleX = Math.floor((KaraokePacketGenerator.displayWidth - titleBitmap.width) / 2);
    const artistX = Math.floor((KaraokePacketGenerator.displayWidth - artistBitmap.width) / 2);

    const titleY = 4 * 12;
    const artistY = 12 * 12;

    return KaraokeTileBlockFactory.createDrawPackets(
      [
        { x: titleX, y: titleY, text: titleBitmap },
        { x: artistX, y: artistY, text: artistBitmap }
      ],
      1
    );
  }

  private createSungPackets(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>,
    colorIndex: number
  ): GeneratedCdgPacket[] {
    const layouts = this.getLineLayouts(input, lines);
    const lineBitmaps = layouts.map((layout) =>
      this.rasterizer.rasterizeText(
        layout.fullText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      )
    );
    const sungPrefixWidths = lines.map(() => 0);

    const packets: GeneratedCdgPacket[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const layout = layouts[lineIndex];
      if (line === undefined || layout === undefined) {
        continue;
      }

      for (let partIndex = 0; partIndex < line.length; partIndex += 1) {
        const linePart = line[partIndex];
        if (linePart === undefined) {
          continue;
        }

        const lineBitmap = lineBitmaps[lineIndex];
        if (lineBitmap === undefined) {
          continue;
        }

        const xOffset = sungPrefixWidths[lineIndex] ?? 0;
        const partWidth = this.rasterizer.measureText(
          linePart.text,
          input.style.fontName,
          input.style.fontSize,
          input.style.fontStyle
        );
        const nextOffset = Math.max(xOffset, Math.min(lineBitmap.width, xOffset + partWidth));

        const isLastPart = partIndex === line.length - 1;
        const sliceEnd = isLastPart ? lineBitmap.width : nextOffset;
        const sliceWidth = Math.max(0, sliceEnd - xOffset);

        const bitmap = this.sliceTextBitmap(lineBitmap, xOffset, sliceWidth);

        if (bitmap.width <= 0) {
          const fill = this.getFillingPackets(linePart.durationMs);
          if (fill !== null) {
            packets.push(...fill);
          }
          sungPrefixWidths[lineIndex] = sliceEnd;
          continue;
        }

        let consumedDurationMs = 0;

        for (let localX = 0; localX < bitmap.width; localX += KaraokePacketGenerator.sungSliceWidthPx) {
          const chunkWidth = Math.min(KaraokePacketGenerator.sungSliceWidthPx, bitmap.width - localX);
          const chunk = this.sliceTextBitmap(bitmap, localX, chunkWidth);

          const drawn = KaraokeTileBlockFactory.createDrawPackets(
            [{ x: layout.x + xOffset + localX, y: layout.y, text: chunk }],
            colorIndex
          );

          packets.push(...drawn);

          const targetDurationMs =
            localX + chunkWidth >= bitmap.width
              ? linePart.durationMs - consumedDurationMs
              : (linePart.durationMs * chunkWidth) / bitmap.width;

          consumedDurationMs += targetDurationMs;

          const drawDurationMs = KaraokePacketTiming.getRenderDurationMs(drawn.length);
          const remainingDurationMs = targetDurationMs - drawDurationMs;
          const fill = this.getFillingPackets(remainingDurationMs);
          if (fill !== null) {
            packets.push(...fill);
          }
        }

        sungPrefixWidths[lineIndex] = sliceEnd;
      }
    }

    return packets;
  }

  private createTrailingWipeTasksFromLines(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>,
    pagePacketOffset: number,
    pageStartTimeMs: number,
    nextLyricsPageStartTimeMs?: number,
    isFirstLyricsPage?: boolean
  ): {
    tasks: TrailingCleanerTask[];
    lineDiagnostics: TrailingCleanerLineTimingDiagnostics[];
  } {
    const layouts = this.getLineLayouts(input, lines);
    const lineBitmaps = layouts.map((layout) =>
      this.rasterizer.rasterizeText(
        layout.fullText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      )
    );
    const lineDurationsMs = lines.map((line) => line.reduce((sum, part) => sum + part.durationMs, 0));
    const lineActiveDurationsMs = lines.map((line) => this.getActiveLineDurationMs(line));

    return this.createTrailingWipeTasks(
      input,
      layouts,
      lineBitmaps,
      lineDurationsMs,
      lineActiveDurationsMs,
      pagePacketOffset,
      pageStartTimeMs,
      nextLyricsPageStartTimeMs,
      isFirstLyricsPage
    );
  }

  private createTrailingWipeTasks(
    input: GenerationInput,
    layouts: Array<{ fullText: string; x: number; y: number }>,
    lineBitmaps: RasterizedText[],
    lineDurationsMs: number[],
    lineActiveDurationsMs: number[],
    pagePacketOffset: number,
    pageStartTimeMs: number,
    nextLyricsPageStartTimeMs?: number,
    isFirstLyricsPage?: boolean
  ): {
    tasks: TrailingCleanerTask[];
    lineDiagnostics: TrailingCleanerLineTimingDiagnostics[];
  } {
    const tasks: TrailingCleanerTask[] = [];
    const lineDiagnostics: TrailingCleanerLineTimingDiagnostics[] = [];
    const baseDelayMs = Math.max(
      1,
      input.style.trailingWipeDelayMs ?? KaraokePacketGenerator.defaultTrailingWipeDelayMs
    );

    let lineStartMs = 0;

    for (let lineIndex = 0; lineIndex < layouts.length; lineIndex += 1) {
      const layout = layouts[lineIndex];
      const lineBitmap = lineBitmaps[lineIndex];
      const lineDurationMs = lineDurationsMs[lineIndex] ?? 0;
      const activeLineDurationMs = Math.max(
        0,
        Math.min(lineDurationMs, lineActiveDurationsMs[lineIndex] ?? lineDurationMs)
      );
      if (layout === undefined || lineBitmap === undefined) {
        lineStartMs += lineDurationMs;
        continue;
      }

      const lineEndMs = lineStartMs + lineDurationMs;
      const activeLineEndMs = lineStartMs + activeLineDurationMs;
      const wipeDurationMs = Math.max(220, Math.floor(lineDurationMs * 0.65));
      const lineEndAbsoluteMs = pageStartTimeMs + activeLineEndMs;
      const baseDelayForLineMs = this.getTrailingWipeDelayForLine(
        baseDelayMs,
        lineIndex,
        isFirstLyricsPage ?? false
      );
      const delayMs = this.getAdaptiveTrailingWipeDelayForLine(
        baseDelayForLineMs,
        lineEndAbsoluteMs,
        wipeDurationMs,
        nextLyricsPageStartTimeMs
      );
      const wipeStartOffsetPackets =
        pagePacketOffset + KaraokePacketTiming.getPacketCount(activeLineEndMs + delayMs);
      const wipeStartAbsoluteMs = lineEndAbsoluteMs + delayMs;
      const leadBeforeNextPageMs =
        nextLyricsPageStartTimeMs === undefined
          ? undefined
          : nextLyricsPageStartTimeMs - wipeStartAbsoluteMs;

      const wipePackets = this.createProgressiveWipePackets(
        layout,
        lineBitmap,
        2,
        wipeDurationMs
      );

      tasks.push({
        regionId: this.getLineRegionId(layout, lineBitmap),
        startOffsetPackets: wipeStartOffsetPackets,
        totalPacketCount: wipePackets.length,
        packets: wipePackets
      });

      lineDiagnostics.push({
        lineIndex,
        text: layout.fullText,
        isFirstLyricsPage: isFirstLyricsPage ?? false,
        lineDurationMs,
        activeLineDurationMs,
        lineEndMs,
        activeLineEndMs,
        baseDelayMs: baseDelayForLineMs,
        assignedDelayMs: delayMs,
        wipeDurationMs,
        wipeStartOffsetPackets,
        wipeStartAbsoluteMs,
        nextLyricsPageStartTimeMs,
        leadBeforeNextPageMs
      });

      lineStartMs = lineEndMs;
    }

    return {
      tasks,
      lineDiagnostics
    };
  }

  private getActiveLineDurationMs(line: Array<{ text: string; durationMs: number }>): number {
    let elapsedMs = 0;
    let activeDurationMs = 0;

    for (const part of line) {
      elapsedMs += part.durationMs;
      if (part.text.trim().length > 0) {
        activeDurationMs = elapsedMs;
      }
    }

    return activeDurationMs > 0 ? activeDurationMs : elapsedMs;
  }

  private getTrailingWipeDelayForLine(
    baseDelayMs: number,
    lineIndex: number,
    isFirstLyricsPage: boolean
  ): number {
    const lineStep = Math.max(0, Math.min(2, lineIndex));
    const offsetByLine = [0, 500, 1000];
    const delayOffsetMs = offsetByLine[lineStep] ?? offsetByLine[2] ?? 1000;
    const firstPageExtraEarlyMs = isFirstLyricsPage
      ? lineStep === 1
        ? 150
        : lineStep >= 2
          ? 250
          : 0
      : 0;
    const reducedDelayMs = baseDelayMs - delayOffsetMs - firstPageExtraEarlyMs;
    return Math.max(100, reducedDelayMs);
  }

  private getAdaptiveTrailingWipeDelayForLine(
    baseDelayMs: number,
    lineEndAbsoluteMs: number,
    wipeDurationMs: number,
    nextLyricsPageStartTimeMs?: number
  ): number {
    if (nextLyricsPageStartTimeMs === undefined) {
      return baseDelayMs;
    }

    const minStartLeadBeforeNextPageMs = 180;
    const latestStartMs = nextLyricsPageStartTimeMs - minStartLeadBeforeNextPageMs;
    const latestAllowedDelayMs = latestStartMs - lineEndAbsoluteMs;

    if (latestAllowedDelayMs <= 0) {
      return 0;
    }

    const minAdaptiveDelayMs = Math.min(baseDelayMs, 150);
    return Math.max(minAdaptiveDelayMs, Math.min(baseDelayMs, latestAllowedDelayMs));
  }

  private getLineRegionIds(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>
  ): string[] {
    const layouts = this.getLineLayouts(input, lines);
    const lineBitmaps = layouts.map((layout) =>
      this.rasterizer.rasterizeText(
        layout.fullText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      )
    );

    const regionIds: string[] = [];
    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index];
      const bitmap = lineBitmaps[index];
      if (layout === undefined || bitmap === undefined) {
        continue;
      }

      regionIds.push(this.getLineRegionId(layout, bitmap));
    }

    return regionIds;
  }

  private getLineRegionId(
    layout: { fullText: string; x: number; y: number },
    lineBitmap: RasterizedText
  ): string {
    const startRow = Math.floor(layout.y / 12);
    const endRow = Math.floor((layout.y + Math.max(0, lineBitmap.height - 1)) / 12);
    return `${startRow}:${endRow}`;
  }

  private createProgressiveWipePackets(
    layout: { fullText: string; x: number; y: number },
    lineBitmap: RasterizedText,
    colorIndex: number,
    totalDurationMs: number
  ): GeneratedCdgPacket[] {
    if (lineBitmap.width <= 0 || lineBitmap.height <= 0 || totalDurationMs <= 0) {
      return [];
    }

    const packets: GeneratedCdgPacket[] = [];
    let consumedDurationMs = 0;

    for (let localX = 0; localX < lineBitmap.width; localX += KaraokePacketGenerator.sungSliceWidthPx) {
      const chunkWidth = Math.min(KaraokePacketGenerator.sungSliceWidthPx, lineBitmap.width - localX);
      const chunk = this.sliceTextBitmap(lineBitmap, localX, chunkWidth);

      const toggled = KaraokeTileBlockFactory.createDrawPackets(
        [{ x: layout.x + localX, y: layout.y, text: chunk }],
        colorIndex
      );

      packets.push(...toggled);

      const targetDurationMs =
        localX + chunkWidth >= lineBitmap.width
          ? totalDurationMs - consumedDurationMs
          : (totalDurationMs * chunkWidth) / lineBitmap.width;

      consumedDurationMs += targetDurationMs;

      const drawDurationMs = KaraokePacketTiming.getRenderDurationMs(toggled.length);
      const remainingDurationMs = targetDurationMs - drawDurationMs;
      const fill = this.getFillingPackets(remainingDurationMs);
      if (fill !== null) {
        packets.push(...fill);
      }
    }

    return packets;
  }

  private sliceTextBitmap(source: RasterizedText, startX: number, width: number): RasterizedText {
    const clampedStart = Math.max(0, Math.min(source.width, startX));
    const clampedEnd = Math.max(clampedStart, Math.min(source.width, clampedStart + Math.max(0, width)));
    const sliceWidth = clampedEnd - clampedStart;

    const pixels = Array.from({ length: source.height }, () =>
      Array.from({ length: sliceWidth }, () => false)
    );

    for (let y = 0; y < source.height; y += 1) {
      const sourceRow = source.pixels[y];
      const targetRow = pixels[y];
      if (sourceRow === undefined || targetRow === undefined) {
        continue;
      }

      for (let x = 0; x < sliceWidth; x += 1) {
        targetRow[x] = sourceRow[clampedStart + x] ?? false;
      }
    }

    return {
      width: sliceWidth,
      height: source.height,
      pixels
    };
  }

  private getLineLayouts(
    input: GenerationInput,
    lines: Array<Array<{ text: string; durationMs: number }>>
  ): Array<{ fullText: string; x: number; y: number }> {
    const lineTexts = lines.map((line) => line.map((part) => part.text).join(""));
    const lineHeight = Math.floor((input.style.fontSize * 7 + 2) / 4);
    const totalHeight =
      lineTexts.length === 0 ? 0 : (lineTexts.length - 1) * lineHeight + input.style.fontSize;
    const yStart = Math.floor((KaraokePacketGenerator.displayHeight - totalHeight) / 2) + KaraokePacketGenerator.minLineHeightPadding;

    return lineTexts.map((lineText, index) => {
      const lineWidth = this.rasterizer.measureText(
        lineText,
        input.style.fontName,
        input.style.fontSize,
        input.style.fontStyle
      );

      const x = Math.floor((KaraokePacketGenerator.displayWidth - lineWidth) / 2);
      const y = yStart + index * lineHeight;

      return { fullText: lineText, x, y };
    });
  }

  private createMemoryPresetPacket(colorIndex: number, repeat: number): GeneratedCdgPacket {
    if (colorIndex < 0 || repeat < 0) {
      throw new FlowExecutionError("Memory preset packet values must be non-negative.");
    }

    return {
      kind: "cdg",
      instruction: {
        kind: "memory-preset",
        colorIndex,
        repeat
      }
    };
  }

  private createColorTablePackets(
    bgColor: string,
    textColor: string,
    sungTextColor: string,
    includeSung: boolean
  ): GeneratedCdgPacket[] {
    const background = this.parseNibbleHexColor(bgColor);
    const text = this.parseNibbleHexColor(textColor);
    const sung = includeSung
      ? this.parseNibbleHexColor(sungTextColor)
      : this.parseNibbleHexColor("#000");
    const black = this.parseNibbleHexColor("#000");

    const colorTable = [
      background,
      text,
      sung,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black,
      black
    ];

    return [
      {
        kind: "cdg",
        instruction: {
          kind: "load-color-table-low",
          colors: colorTable.slice(0, 8)
        }
      },
      {
        kind: "cdg",
        instruction: {
          kind: "load-color-table-high",
          colors: colorTable.slice(8)
        }
      }
    ];
  }

  private parseNibbleHexColor(color: string): { red: number; green: number; blue: number } {
    const normalized = color.trim();
    const match = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(normalized);
    if (match === null) {
      throw new FlowExecutionError(`Invalid CDG nibble color: ${color}`);
    }

    const redHex = match[1];
    const greenHex = match[2];
    const blueHex = match[3];

    if (redHex === undefined || greenHex === undefined || blueHex === undefined) {
      throw new FlowExecutionError(`Invalid CDG nibble color: ${color}`);
    }

    return {
      red: Number.parseInt(redHex, 16),
      green: Number.parseInt(greenHex, 16),
      blue: Number.parseInt(blueHex, 16)
    };
  }
}
