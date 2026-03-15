/*
 * CdgPacketExplainer module features.
 * Contains implementation for cdg packet explainer.
 */

import type { CdgPacketInstruction, CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";

export class CdgPacketExplainer {
  public static explainPackets(packets: CdgSubCodePacket[]): string[] {
    return packets.map((packet, index) => `${index}: ${this.explainSubCodePacket(packet)}`);
  }

  private static explainSubCodePacket(packet: CdgSubCodePacket): string {
    if (packet.kind === "empty") {
      return "Empty";
    }

    if (packet.kind === "other") {
      return `Other: ${Array.from(packet.data)
        .map((value) => value.toString().padStart(2, " "))
        .join(" ")}`;
    }

    return `CD+G: ${this.explainInstruction(packet.instruction)}`;
  }

  private static explainInstruction(instruction: CdgPacketInstruction): string {
    switch (instruction.kind) {
      case "memory-preset":
        return `Memory Preset: Color index: ${instruction.colorIndex}, Repeat: ${instruction.repeat}`;
      case "border-preset":
        return `Border Preset: Color index: ${instruction.colorIndex}`;
      case "tile-block":
        return `Tile Block: ${instruction.operation === "replace" ? "Replace" : "XOR"}: ${this.explainTileBlockData(
          instruction.data
        )}`;
      case "scroll-preset":
        return `Scroll preset: Color index: ${instruction.colorIndex}, H-Scroll: ${this.explainHScroll(
          instruction.hScroll.command,
          instruction.hScroll.offset
        )}, V-Scroll: ${this.explainVScroll(instruction.vScroll.command, instruction.vScroll.offset)}`;
      case "scroll-copy":
        return `Scroll copy: H-Scroll: ${this.explainHScroll(
          instruction.hScroll.command,
          instruction.hScroll.offset
        )}, V-Scroll: ${this.explainVScroll(instruction.vScroll.command, instruction.vScroll.offset)}`;
      case "define-transparent-color":
        return `Define transparent color: Color index: ${instruction.colorIndex}`;
      case "load-color-table-low":
        return `Load color table low: \n${instruction.colors.map((color) => `    Red: ${color.red}, Green: ${color.green}, Blue: ${color.blue}`).join("\n")}`;
      case "load-color-table-high":
        return `Load color table high: \n${instruction.colors.map((color) => `    Red: ${color.red}, Green: ${color.green}, Blue: ${color.blue}`).join("\n")}`;
      default:
        return "Unknown";
    }
  }

  private static explainTileBlockData(data: {
    color1: number;
    color2: number;
    row: number;
    column: number;
    pixelRows: number[];
  }): string {
    const pixels = data.pixelRows
      .map((pixelRow) => `    ${this.explainPixelRow(pixelRow)}`)
      .join("\n");

    return `Color1: ${data.color1}, Color2: ${data.color2}, Row: ${data.row}, Column: ${data.column}, Pixels:\n${pixels}`;
  }

  private static explainPixelRow(pixelRow: number): string {
    const bits: string[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      bits.push((pixelRow >>> offset) & 1 ? "1" : "0");
    }
    return bits.join(" ");
  }

  private static explainHScroll(command: "none" | "right" | "left", offset: number): string {
    if (command === "none") {
      return `Don't scroll - ${offset} pixels`;
    }

    if (command === "left") {
      return `Scroll left - ${offset} pixels`;
    }

    return `Scroll right - ${offset} pixels`;
  }

  private static explainVScroll(command: "none" | "down" | "up", offset: number): string {
    if (command === "none") {
      return `Don't scroll - ${offset} pixels`;
    }

    if (command === "up") {
      return `Scroll up - ${offset} pixels`;
    }

    return `Scroll down - ${offset} pixels`;
  }
}
