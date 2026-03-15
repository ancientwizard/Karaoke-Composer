import { describe, expect, it } from "@jest/globals";
import { CdgSubCodePacketSerializer } from "@/CDGSharp/cdg/CdgSubCodePacketSerializer";
import { CdgPacketParser } from "@/CDGSharp/cdg/CdgPacketParser";

describe("CdgSubCodePacketSerializer", () => {
  it("serializes memory preset packet header and payload", () => {
    const bytes = CdgSubCodePacketSerializer.serializePacket({
      kind: "cdg",
      instruction: {
        kind: "memory-preset",
        colorIndex: 4,
        repeat: 2
      }
    });

    expect(bytes).toHaveLength(24);
    expect(bytes[0]).toBe(9);
    expect(bytes[1]).toBe(1);
    expect(bytes[4]).toBe(4);
    expect(bytes[5]).toBe(2);
  });

  it("round-trips packet data with parser", () => {
    const original = {
      kind: "cdg" as const,
      instruction: {
        kind: "tile-block" as const,
        operation: "xor" as const,
        data: {
          color1: 0,
          color2: 7,
          row: 4,
          column: 12,
          pixelRows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        }
      }
    };

    const bytes = CdgSubCodePacketSerializer.serializePacket(original);
    const reparsed = CdgPacketParser.parse(bytes);

    expect(reparsed).toEqual([original]);
  });
});
