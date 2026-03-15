import { describe, expect, it } from "@jest/globals";
import { CdgPacketParser } from "@/CDGSharp/cdg/CdgPacketParser";

describe("CdgPacketParser", () => {
  it("parses a memory preset CD+G packet", () => {
    const packet = new Uint8Array(24);
    packet[0] = 9;
    packet[1] = 1;
    packet[4] = 0x0f;
    packet[5] = 0x02;

    const parsed = CdgPacketParser.parse(packet);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      kind: "cdg",
      instruction: {
        kind: "memory-preset",
        colorIndex: 15,
        repeat: 2
      }
    });
  });

  it("parses an empty packet", () => {
    const parsed = CdgPacketParser.parse(new Uint8Array(24));

    expect(parsed).toEqual([{ kind: "empty" }]);
  });

  it("parses a non-empty non-cdg packet as other", () => {
    const packet = new Uint8Array(24);
    packet[0] = 8;

    const parsed = CdgPacketParser.parse(packet);

    expect(parsed[0]?.kind).toBe("other");
  });
});
