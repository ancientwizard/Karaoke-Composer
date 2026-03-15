/*
 * CdgSubCodePacketSerializer module features.
 * Contains implementation for cdg sub code packet serializer.
 */

import { CdgBinaryFormat } from "@/CDGSharp/cdg/CdgBinaryFormat";
import type { CdgPacketInstruction, CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";

export class CdgSubCodePacketSerializer {
  public static serializePackets(packets: CdgSubCodePacket[]): Uint8Array {
    const serialized = packets.map((packet) => this.serializePacket(packet));
    const totalLength = serialized.reduce((sum, packet) => sum + packet.length, 0);
    const output = new Uint8Array(totalLength);

    let offset = 0;
    for (const packet of serialized) {
      output.set(packet, offset);
      offset += packet.length;
    }

    return output;
  }

  public static serializePacket(packet: CdgSubCodePacket): Uint8Array {
    if (packet.kind === "empty") {
      return new Uint8Array(CdgBinaryFormat.subCodePacketDataLength);
    }

    if (packet.kind === "other") {
      return packet.data;
    }

    const encodedInstruction = this.serializeInstruction(packet.instruction);
    if (encodedInstruction.data.length !== CdgBinaryFormat.cdgPacketDataLength) {
      throw new Error(`Packet data size is expected to be ${CdgBinaryFormat.cdgPacketDataLength}`);
    }

    const output = new Uint8Array(CdgBinaryFormat.subCodePacketDataLength);
    output[0] = 9;
    output[1] = encodedInstruction.opCode;
    output.set(encodedInstruction.data, 4);
    return output;
  }

  private static serializeInstruction(instruction: CdgPacketInstruction): {
    opCode: number;
    data: Uint8Array;
  } {
    switch (instruction.kind) {
      case "memory-preset":
        return {
          opCode: 1,
          data: this.fillTo16([instruction.colorIndex, instruction.repeat])
        };
      case "border-preset":
        return {
          opCode: 2,
          data: this.fillTo16([instruction.colorIndex])
        };
      case "tile-block":
        return {
          opCode: instruction.operation === "replace" ? 6 : 38,
          data: new Uint8Array([
            instruction.data.color1,
            instruction.data.color2,
            instruction.data.row,
            instruction.data.column,
            ...instruction.data.pixelRows
          ])
        };
      case "scroll-preset":
        return {
          opCode: 20,
          data: this.fillTo16([
            instruction.colorIndex,
            this.serializeHScroll(instruction.hScroll.command, instruction.hScroll.offset),
            this.serializeVScroll(instruction.vScroll.command, instruction.vScroll.offset)
          ])
        };
      case "scroll-copy":
        return {
          opCode: 24,
          data: this.fillTo16([
            0,
            this.serializeHScroll(instruction.hScroll.command, instruction.hScroll.offset),
            this.serializeVScroll(instruction.vScroll.command, instruction.vScroll.offset)
          ])
        };
      case "define-transparent-color":
        return {
          opCode: 28,
          data: this.fillTo16([instruction.colorIndex])
        };
      case "load-color-table-low":
        return {
          opCode: 30,
          data: this.serializeColors(instruction.colors)
        };
      case "load-color-table-high":
        return {
          opCode: 31,
          data: this.serializeColors(instruction.colors)
        };
      default:
        throw new Error("Unknown instruction type.");
    }
  }

  private static serializeColors(colors: Array<{ red: number; green: number; blue: number }>): Uint8Array {
    const data: number[] = [];
    for (const color of colors) {
      const highByte = ((color.red & 0b1111) << 2) | ((color.green & 0b1111) >>> 2);
      const lowByte = (((color.green & 0b0011) << 4) | (color.blue & 0b1111)) & 0xff;
      data.push(highByte, lowByte);
    }

    return new Uint8Array(data);
  }

  private static serializeHScroll(command: "none" | "right" | "left", offset: number): number {
    const commandPart =
      command === "none" ? 0 : command === "right" ? (1 << 4) : (2 << 4);
    return commandPart | offset;
  }

  private static serializeVScroll(command: "none" | "down" | "up", offset: number): number {
    const commandPart = command === "none" ? 0 : command === "down" ? (1 << 4) : (2 << 4);
    return commandPart | offset;
  }

  private static fillTo16(values: number[]): Uint8Array {
    const output = new Uint8Array(CdgBinaryFormat.cdgPacketDataLength);
    output.set(values.slice(0, CdgBinaryFormat.cdgPacketDataLength));
    return output;
  }
}
