import { describe, expect, it } from "@jest/globals";
import { renderSimple } from "@/cdg/renderer";
import { CDG_PACKET_SIZE } from "@/cdg/constants";

function packetAt(buffer: Uint8Array, index: number): Uint8Array {
  const start = index * CDG_PACKET_SIZE;
  return buffer.slice(start, start + CDG_PACKET_SIZE);
}

function isEmptyPacket(packet: Uint8Array): boolean {
  return packet.every((byte) => byte === 0);
}

describe("cdg/renderSimple", () => {
  it("returns a packet stream matching requested duration and pps", async () => {
    const result = await renderSimple([], { durationSeconds: 2, packetsPerSecond: 10 });

    expect(result.packets).toBe(20);
    expect(result.buffer.length).toBe(20 * CDG_PACKET_SIZE);
    expect(result.durationSeconds).toBe(2);
  });

  it("schedules tile packets no earlier than header packets", async () => {
    const result = await renderSimple(
      [
        {
          at: 0.2,
          coord: { row: 2, col: 3 },
          color0: 0,
          color1: 1,
          pixels: [0x3f, 0x21, 0x21, 0x21, 0x3f, 0x00, 0x3f, 0x21, 0x21, 0x21, 0x3f, 0x00]
        }
      ],
      { durationSeconds: 1, packetsPerSecond: 10 }
    );

    // Headers occupy the first slots; the first tile lands at/after index 4.
    const tilePacket = packetAt(result.buffer, 4);
    expect(isEmptyPacket(tilePacket)).toBe(false);
  });

  it("ensures final slot is non-empty to preserve perceived duration", async () => {
    const result = await renderSimple([], { durationSeconds: 1, packetsPerSecond: 10 });

    const tail = packetAt(result.buffer, result.packets - 1);
    expect(isEmptyPacket(tail)).toBe(false);
  });
});
