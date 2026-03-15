/*
 * CdgPacketFormatter module features.
 * Contains implementation for cdg packet formatter.
 */

import { CdgBinaryFormat } from "@/CDGSharp/cdg/CdgBinaryFormat";

export class CdgPacketFormatter {
  public static formatFileContent(content: Uint8Array): string {
    const sectorSize = CdgBinaryFormat.sectorPacketCount * CdgBinaryFormat.subCodePacketDataLength;
    const sectors: string[] = [];

    for (let i = 0; i < content.length; i += sectorSize) {
      const sector = content.slice(i, i + sectorSize);
      const packets: string[] = [];
      for (let j = 0; j < sector.length; j += CdgBinaryFormat.subCodePacketDataLength) {
        const packet = sector.slice(j, j + CdgBinaryFormat.subCodePacketDataLength);
        if (packet.length === CdgBinaryFormat.subCodePacketDataLength) {
          packets.push(Array.from(packet).map((value) => value.toString().padStart(2, " ")).join(" "));
        }
      }
      sectors.push(packets.join("\n"));
    }

    return sectors.join("\n\n");
  }
}
