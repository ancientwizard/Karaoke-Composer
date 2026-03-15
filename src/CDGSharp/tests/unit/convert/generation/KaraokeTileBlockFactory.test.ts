import { describe, expect, it } from "@jest/globals";
import { KaraokeTileBlockFactory } from "@/CDGSharp/convert/generation/KaraokeTileBlockFactory";

describe("KaraokeTileBlockFactory", () => {
  it("creates tile-block packets when pixels are present", () => {
    const pixels = [
      [true, true, true, false, false, false],
      [true, true, true, false, false, false],
      [false, false, false, false, false, false]
    ];

    const packets = KaraokeTileBlockFactory.createDrawPackets(
      [
        {
          x: 0,
          y: 0,
          text: {
            width: 6,
            height: 3,
            pixels
          }
        }
      ],
      1
    );

    expect(packets.length).toBeGreaterThan(0);
    const first = packets[0];
    expect(first?.kind).toBe("cdg");
    if (first?.kind === "cdg" && first.instruction.kind === "tile-block") {
      expect(first.instruction.data.row).toBe(1);
      expect(first.instruction.data.column).toBe(1);
    }
  });

  it("does not create tile-block packets for empty pixels", () => {
    const packets = KaraokeTileBlockFactory.createDrawPackets(
      [
        {
          x: 0,
          y: 0,
          text: {
            width: 6,
            height: 3,
            pixels: [
              [false, false, false, false, false, false],
              [false, false, false, false, false, false],
              [false, false, false, false, false, false]
            ]
          }
        }
      ],
      1
    );

    expect(packets).toEqual([]);
  });
});
