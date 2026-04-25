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

  it("explains other packets as raw byte values", () => {
    const lines = CdgPacketExplainer.explainPackets([
      { kind: "other", data: Uint8Array.from([1, 23, 255]) }
    ]);

    expect(lines).toEqual(["0: Other:  1 23 255"]);
  });

  it("explains tile block replace packets with bit rows", () => {
    const lines = CdgPacketExplainer.explainPackets([
      {
        kind: "cdg",
        instruction: {
          kind: "tile-block",
          operation: "replace",
          data: {
            color1: 1,
            color2: 2,
            row: 3,
            column: 4,
            pixelRows: [0b101010, 0b000001]
          }
        }
      }
    ]);

    expect(lines[0]).toContain("Tile Block: Replace");
    expect(lines[0]).toContain("Color1: 1, Color2: 2, Row: 3, Column: 4");
    expect(lines[0]).toContain("1 0 1 0 1 0");
    expect(lines[0]).toContain("0 0 0 0 0 1");
  });

  it("explains scroll and transparency instructions", () => {
    const lines = CdgPacketExplainer.explainPackets([
      {
        kind: "cdg",
        instruction: {
          kind: "scroll-preset",
          colorIndex: 5,
          hScroll: { command: "left", offset: 3 },
          vScroll: { command: "up", offset: 7 }
        }
      },
      {
        kind: "cdg",
        instruction: {
          kind: "scroll-copy",
          hScroll: { command: "right", offset: 2 },
          vScroll: { command: "down", offset: 1 }
        }
      },
      {
        kind: "cdg",
        instruction: {
          kind: "define-transparent-color",
          colorIndex: 6
        }
      }
    ]);

    expect(lines[0]).toContain("Scroll preset: Color index: 5");
    expect(lines[0]).toContain("H-Scroll: Scroll left - 3 pixels");
    expect(lines[0]).toContain("V-Scroll: Scroll up - 7 pixels");

    expect(lines[1]).toContain("Scroll copy");
    expect(lines[1]).toContain("H-Scroll: Scroll right - 2 pixels");
    expect(lines[1]).toContain("V-Scroll: Scroll down - 1 pixels");

    expect(lines[2]).toContain("Define transparent color: Color index: 6");
  });

  it("explains load color table instructions", () => {
    const lines = CdgPacketExplainer.explainPackets([
      {
        kind: "cdg",
        instruction: {
          kind: "load-color-table-low",
          colors: [{ red: 1, green: 2, blue: 3 }]
        }
      },
      {
        kind: "cdg",
        instruction: {
          kind: "load-color-table-high",
          colors: [{ red: 4, green: 5, blue: 6 }]
        }
      }
    ]);

    expect(lines[0]).toContain("Load color table low");
    expect(lines[0]).toContain("Red: 1, Green: 2, Blue: 3");
    expect(lines[1]).toContain("Load color table high");
    expect(lines[1]).toContain("Red: 4, Green: 5, Blue: 6");
  });
});
