import { describe, expect, it } from "@jest/globals";
import { CdgPacketSerializer } from "@/CDGSharp/convert/serialization/CdgPacketSerializer";

describe("CdgPacketSerializer", () => {
  it("serializes generated CDG packets to subcode packet bytes", () => {
    const serializer = new CdgPacketSerializer();

    const bytes = serializer.serialize([
      {
        kind: "cdg",
        instruction: {
          kind: "memory-preset",
          colorIndex: 2,
          repeat: 1
        }
      }
    ]);

    expect(bytes.length).toBe(24);
    expect(Array.from(bytes.slice(0, 6))).toEqual([9, 1, 0, 0, 2, 1]);
  });
});
