/*
 * CdgPacketParser module features.
 * Contains implementation for cdg packet parser.
 */

import { CdgBinaryFormat } from "@/CDGSharp/cdg/CdgBinaryFormat";
import type {
  CdgColor,
  CdgPacketInstruction,
  CdgSubCodePacket,
  CdgTileBlockData
} from "@/CDGSharp/cdg/CdgModels";

export class CdgPacketParser {
  public static parse(content: Uint8Array): CdgSubCodePacket[] {
    const packetSize = CdgBinaryFormat.sectorPacketCount * CdgBinaryFormat.subCodePacketDataLength;
    const packets: CdgSubCodePacket[] = [];

    for (let i = 0; i < content.length; i += packetSize) {
      const sector = content.slice(i, i + packetSize);
      for (let j = 0; j < sector.length; j += CdgBinaryFormat.subCodePacketDataLength) {
        const packet = sector.slice(j, j + CdgBinaryFormat.subCodePacketDataLength);
        if (packet.length === CdgBinaryFormat.subCodePacketDataLength) {
          packets.push(this.parseSubCodePacket(packet));
        }
      }
    }

    return packets;
  }

  private static parseSubCodePacket(content: Uint8Array): CdgSubCodePacket {
    if (content.length !== CdgBinaryFormat.subCodePacketDataLength) {
      throw new Error(
        `Sub code packet size is expected to be ${CdgBinaryFormat.subCodePacketDataLength}, but was ${content.length}`
      );
    }

    const marker = this.getByte(content, 0);
    if (this.ignorePqChannel(marker) === 9) {
      return {
        kind: "cdg",
        instruction: this.parseCdgPacketInstruction(this.getByte(content, 1), content.slice(4, 20))
      };
    }

    if (content.every((value) => value === 0)) {
      return { kind: "empty" };
    }

    return { kind: "other", data: content };
  }

  private static parseCdgPacketInstruction(instruction: number, data: Uint8Array): CdgPacketInstruction {
    if (data.length !== CdgBinaryFormat.cdgPacketDataLength) {
      throw new Error(
        `Packet data is expected to be of length ${CdgBinaryFormat.cdgPacketDataLength}, but was ${data.length}`
      );
    }

    switch (this.ignorePqChannel(instruction)) {
      case 1:
        return {
          kind: "memory-preset",
          colorIndex: this.parseColorIndex(this.getByte(data, 0)),
          repeat: this.parseRepeat(this.getByte(data, 1))
        };
      case 2:
        return { kind: "border-preset", colorIndex: this.parseColorIndex(this.getByte(data, 0)) };
      case 6:
        return { kind: "tile-block", operation: "replace", data: this.parseTileBlockData(data) };
      case 38:
        return { kind: "tile-block", operation: "xor", data: this.parseTileBlockData(data) };
      case 20:
        return {
          kind: "scroll-preset",
          colorIndex: this.parseColorIndex(this.getByte(data, 0)),
          hScroll: this.parseHScroll(this.getByte(data, 1)),
          vScroll: this.parseVScroll(this.getByte(data, 2))
        };
      case 24:
        return {
          kind: "scroll-copy",
          hScroll: this.parseHScroll(this.getByte(data, 1)),
          vScroll: this.parseVScroll(this.getByte(data, 2))
        };
      case 28:
        return { kind: "define-transparent-color", colorIndex: this.parseColorIndex(this.getByte(data, 0)) };
      case 30:
        return { kind: "load-color-table-low", colors: this.parseColors(data) };
      case 31:
        return { kind: "load-color-table-high", colors: this.parseColors(data) };
      default:
        throw new Error(`Unknown CDG packet instruction "${this.ignorePqChannel(instruction)}"`);
    }
  }

  private static parseTileBlockData(data: Uint8Array): CdgTileBlockData {
    if (data.length !== CdgBinaryFormat.cdgPacketDataLength) {
      throw new Error(
        `Tile block data is expected to be of length ${CdgBinaryFormat.cdgPacketDataLength}, but was ${data.length}`
      );
    }

    return {
      color1: this.parseColorIndex(this.getByte(data, 0)),
      color2: this.parseColorIndex(this.getByte(data, 1)),
      row: this.parseRow(this.getByte(data, 2)),
      column: this.parseColumn(this.getByte(data, 3)),
      pixelRows: Array.from(data.slice(4)).map((value) => this.parsePixelRow(value))
    };
  }

  private static parseColors(data: Uint8Array): CdgColor[] {
    const colors: CdgColor[] = [];
    for (let i = 0; i < data.length; i += 2) {
      colors.push(this.parseColor(this.getByte(data, i), this.getByte(data, i + 1)));
    }
    return colors;
  }

  private static parseColor(highByte: number, lowByte: number): CdgColor {
    return {
      red: this.ignorePqChannel(highByte) >>> 2,
      green: ((highByte & 0b0000_0011) << 2) | (this.ignorePqChannel(lowByte) >>> 4),
      blue: lowByte & 0b0000_1111
    };
  }

  private static parseHScroll(value: number): { command: "none" | "right" | "left"; offset: number } {
    const commandCode = this.ignorePqChannel(value) >>> 4;
    const offset = value & 0b0000_0111;
    if (offset > 5) {
      throw new Error(`H-scroll offset must be between 0 and 5, but was ${offset}`);
    }

    switch (commandCode) {
      case 0:
        return { command: "none", offset };
      case 1:
        return { command: "right", offset };
      case 2:
        return { command: "left", offset };
      default:
        throw new Error(`Unknown h-scroll command "${commandCode}"`);
    }
  }

  private static parseVScroll(value: number): { command: "none" | "down" | "up"; offset: number } {
    const commandCode = this.ignorePqChannel(value) >>> 4;
    const offset = value & 0b0000_1111;
    if (offset > 11) {
      throw new Error(`V-scroll offset must be between 0 and 11, but was ${offset}`);
    }

    switch (commandCode) {
      case 0:
        return { command: "none", offset };
      case 1:
        return { command: "down", offset };
      case 2:
        return { command: "up", offset };
      default:
        throw new Error(`Unknown v-scroll command "${commandCode}"`);
    }
  }

  private static parseColorIndex(value: number): number {
    return value & 0b0000_1111;
  }

  private static parseRepeat(value: number): number {
    return value & 0b0000_1111;
  }

  private static parseRow(value: number): number {
    return value & 0b0001_1111;
  }

  private static parseColumn(value: number): number {
    return this.ignorePqChannel(value);
  }

  private static parsePixelRow(value: number): number {
    return this.ignorePqChannel(value);
  }

  private static ignorePqChannel(value: number): number {
    return value & 0b0011_1111;
  }

  private static getByte(data: Uint8Array, index: number): number {
    const value = data[index];
    if (value === undefined) {
      throw new Error(`Expected byte at index ${index}, but no value was present.`);
    }

    return value;
  }
}
