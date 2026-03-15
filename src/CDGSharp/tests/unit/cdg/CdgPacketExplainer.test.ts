import { describe, expect, it } from "@jest/globals";
import { CdgPacketExplainer } from "@/CDGSharp/cdg/CdgPacketExplainer";

describe("CdgPacketExplainer", () => {
  it("explains memory preset packets", () => {
    const lines = CdgPacketExplainer.explainPackets([
      {
        kind: "cdg",
        instruction: {
          kind: "memory-preset",
          colorIndex: 3,
          repeat: 1
        }
      }
    ]);

    expect(lines).toEqual(["0: CD+G: Memory Preset: Color index: 3, Repeat: 1"]);
  });

  it("explains empty packets", () => {
    const lines = CdgPacketExplainer.explainPackets([{ kind: "empty" }]);

    expect(lines).toEqual(["0: Empty"]);
  });
});
