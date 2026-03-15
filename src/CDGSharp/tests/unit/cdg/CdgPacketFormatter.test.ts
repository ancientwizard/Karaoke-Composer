import { describe, expect, it } from "@jest/globals";
import { CdgPacketFormatter } from "@/CDGSharp/cdg/CdgPacketFormatter";

describe("CdgPacketFormatter", () => {
  it("formats packet bytes with aligned columns", () => {
    const packet = new Uint8Array(24);
    packet[0] = 9;
    packet[1] = 1;

    const formatted = CdgPacketFormatter.formatFileContent(packet);

    expect(formatted.startsWith(" 9  1")).toBe(true);
  });
});
