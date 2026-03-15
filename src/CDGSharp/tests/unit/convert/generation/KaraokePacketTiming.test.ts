import { describe, expect, it } from "@jest/globals";
import { KaraokePacketTiming } from "@/CDGSharp/convert/generation/KaraokePacketTiming";

describe("KaraokePacketTiming", () => {
  it("computes packet count from duration", () => {
    expect(KaraokePacketTiming.getPacketCount(1000)).toBe(300);
  });

  it("computes render duration from packet count", () => {
    expect(KaraokePacketTiming.getRenderDurationMs(300)).toBe(1000);
  });
});
