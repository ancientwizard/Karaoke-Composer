import { describe, expect, it } from "@jest/globals";
import { KaraokePacketScheduling } from "@/CDGSharp/convert/generation/KaraokePacketScheduling";

describe("KaraokePacketScheduling", () => {
  it("returns null for negative fill duration", () => {
    expect(KaraokePacketScheduling.tryGetFillingPackets(-1)).toBeNull();
  });

  it("creates empty filling packets for positive duration", () => {
    const packets = KaraokePacketScheduling.tryGetFillingPackets(1000);
    expect(packets?.length).toBe(300);
    expect(packets?.[0]).toEqual({ kind: "empty" });
  });

  it("replaces empty packets with new packets while preserving non-empty packets", () => {
    const existing = [
      { kind: "empty" } as const,
      { kind: "cdg", instruction: { kind: "memory-preset", colorIndex: 0, repeat: 0 } } as const,
      { kind: "empty" } as const
    ];

    const replacement = [
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } } as const
    ];

    const result = KaraokePacketScheduling.replaceEmptyPackets(existing, replacement);

    expect(result[0]).toEqual(replacement[0]);
    expect(result[1]).toEqual(existing[1]);
    expect(result[2]).toEqual({ kind: "empty" });
  });

  it("merges timed streams without collapsing overlay delay", () => {
    const base = [
      { kind: "cdg", instruction: { kind: "memory-preset", colorIndex: 0, repeat: 0 } } as const,
      { kind: "empty" } as const,
      { kind: "empty" } as const,
      { kind: "empty" } as const
    ];

    const overlay = [
      { kind: "empty" } as const,
      { kind: "empty" } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } } as const
    ];

    const result = KaraokePacketScheduling.mergeTimedStreams(base, overlay);

    expect(result[0]).toEqual(base[0]);
    expect(result[1]).toEqual({ kind: "empty" });
    expect(result[2]).toEqual(overlay[2]);
    expect(result[3]).toEqual({ kind: "empty" });
  });

  it("defers overlay packets only within available timeline slots", () => {
    const base = [
      { kind: "cdg", instruction: { kind: "memory-preset", colorIndex: 0, repeat: 0 } } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 1 } } as const,
      { kind: "empty" } as const,
      { kind: "empty" } as const
    ];

    const overlay = [
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 4 } } as const,
      { kind: "empty" } as const,
      { kind: "empty" } as const
    ];

    const result = KaraokePacketScheduling.mergeTimedStreams(base, overlay);

    expect(result).toHaveLength(base.length);
    expect(result[0]).toEqual(base[0]);
    expect(result[1]).toEqual(base[1]);
    expect(result[2]).toEqual(overlay[0]);
    expect(result[3]).toEqual(overlay[1]);
  });

  it("does not extend timeline when deferred overlay packets exceed empty slots", () => {
    const base = [
      { kind: "cdg", instruction: { kind: "memory-preset", colorIndex: 0, repeat: 0 } } as const,
      { kind: "empty" } as const
    ];

    const overlay = [
      { kind: "empty" } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 4 } } as const
    ];

    const result = KaraokePacketScheduling.mergeTimedStreams(base, overlay);

    expect(result).toHaveLength(base.length);
    expect(result[0]).toEqual(base[0]);
    expect(result[1]).toEqual(overlay[1]);
  });

  it("preserves timed overlay tail in overflow so delay survives carry-over", () => {
    const base = [
      { kind: "empty" } as const
    ];

    const overlay = [
      { kind: "empty" } as const,
      { kind: "empty" } as const,
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } } as const
    ];

    const merged = KaraokePacketScheduling.mergeTimedStreamsWithOverflow(base, overlay);

    expect(merged.mergedPackets).toHaveLength(1);
    expect(merged.mergedPackets[0]).toEqual({ kind: "empty" });
    expect(merged.overflowPackets).toEqual([
      { kind: "empty" },
      { kind: "cdg", instruction: { kind: "border-preset", colorIndex: 3 } }
    ]);
  });
});
