/*
 * KaraokePacketScheduling module features.
 * Contains implementation for karaoke packet scheduling.
 */

import type { CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";
import { KaraokePacketTiming  } from "@/CDGSharp/convert/generation/KaraokePacketTiming";

export class KaraokePacketScheduling {
  public static mergeTimedStreamsWithOverflow(
    basePackets: CdgSubCodePacket[],
    overlayPackets: CdgSubCodePacket[]
  ): { mergedPackets: CdgSubCodePacket[]; overflowPackets: CdgSubCodePacket[] } {
    const length = basePackets.length;
    const merged: CdgSubCodePacket[] = [];
    const deferredOverlayPackets: CdgSubCodePacket[] = [];

    for (let index = 0; index < length; index += 1) {
      const basePacket = basePackets[index];
      const overlayPacket = overlayPackets[index];

      if (overlayPacket !== undefined && overlayPacket.kind !== "empty") {
        deferredOverlayPackets.push(overlayPacket);
      }

      if (basePacket !== undefined && basePacket.kind !== "empty") {
        merged.push(basePacket);
        continue;
      }

      const nextDeferredOverlayPacket = deferredOverlayPackets.shift();
      if (nextDeferredOverlayPacket !== undefined) {
        merged.push(nextDeferredOverlayPacket);
        continue;
      }

      if (basePacket !== undefined) {
        merged.push(basePacket);
        continue;
      }

      if (overlayPacket !== undefined) {
        merged.push(overlayPacket);
        continue;
      }

      merged.push({ kind: "empty" });
    }

    const timedOverlayTail = overlayPackets.slice(length);

    return {
      mergedPackets: merged,
      overflowPackets: [...deferredOverlayPackets, ...timedOverlayTail]
    };
  }

  public static tryGetFillingPackets(timeToFillMs: number): CdgSubCodePacket[] | null {
    if (timeToFillMs < 0) {
      return null;
    }

    const count = KaraokePacketTiming.getPacketCount(timeToFillMs);
    return Array.from({ length: count }, () => ({ kind: "empty" } as const));
  }

  public static replaceEmptyPackets(
    packets: CdgSubCodePacket[],
    newPackets: CdgSubCodePacket[]
  ): CdgSubCodePacket[] {
    const result: CdgSubCodePacket[] = [];
    let remainingNewPackets = [...newPackets];

    for (let index = 0; index < packets.length; index += 1) {
      const packet = packets[index];
      if (packet === undefined) {
        continue;
      }

      const remainingPackets = packets.slice(index);
      const remainingCdgPacketCount = remainingPackets.filter((item) => item.kind === "cdg").length;

      if (packet.kind === "cdg" || packet.kind === "other") {
        result.push(packet);
        continue;
      }

      if (remainingNewPackets.length > remainingCdgPacketCount) {
        const dropCount = remainingNewPackets.length - remainingCdgPacketCount;
        remainingNewPackets = remainingNewPackets.slice(dropCount);
      }

      if (remainingNewPackets.length > 0) {
        const [nextNewPacket, ...tail] = remainingNewPackets;
        if (nextNewPacket !== undefined) {
          result.push(nextNewPacket);
        }
        remainingNewPackets = tail;
      } else {
        result.push(packet);
      }
    }

    return result;
  }

  public static mergeTimedStreams(
    basePackets: CdgSubCodePacket[],
    overlayPackets: CdgSubCodePacket[]
  ): CdgSubCodePacket[] {
    return this.mergeTimedStreamsWithOverflow(basePackets, overlayPackets).mergedPackets;
  }
}
