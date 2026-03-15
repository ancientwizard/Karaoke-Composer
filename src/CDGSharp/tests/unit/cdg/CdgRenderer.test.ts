import { describe, expect, it } from "@jest/globals";
import { CdgRenderer } from "@/CDGSharp/cdg/CdgRenderer";

describe("CdgRenderer", () => {
  it("applies memory preset to color indices and border", () => {
    const initial = CdgRenderer.createEmptyState();

    const updated = CdgRenderer.applyInstruction(initial, {
      kind: "memory-preset",
      colorIndex: 5,
      repeat: 0
    });

    expect(updated.borderColorIndex).toBe(5);
    expect(updated.colorIndices[0]?.[0]?.[0]?.[0]).toBe(5);
  });

  it("applies tile block replace operation", () => {
    const initial = CdgRenderer.createEmptyState();

    const updated = CdgRenderer.applyInstruction(initial, {
      kind: "tile-block",
      operation: "replace",
      data: {
        color1: 1,
        color2: 2,
        row: 1,
        column: 1,
        pixelRows: [0b000000, 0b111111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    });

    expect(updated.colorIndices[0]?.[0]?.[0]).toEqual([1, 1, 1, 1, 1, 1]);
    expect(updated.colorIndices[0]?.[0]?.[1]).toEqual([2, 2, 2, 2, 2, 2]);
  });
});
