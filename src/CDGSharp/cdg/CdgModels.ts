/*
 * CdgModels module features.
 * Contains implementation for cdg models.
 */

export type CdgTileBlockOperation = "replace" | "xor";

export interface CdgColor {
  red: number;
  green: number;
  blue: number;
}

export interface CdgTileBlockData {
  color1: number;
  color2: number;
  row: number;
  column: number;
  pixelRows: number[];
}

export interface CdgMemoryPresetInstruction {
  kind: "memory-preset";
  colorIndex: number;
  repeat: number;
}

export interface CdgBorderPresetInstruction {
  kind: "border-preset";
  colorIndex: number;
}

export interface CdgTileBlockInstruction {
  kind: "tile-block";
  operation: CdgTileBlockOperation;
  data: CdgTileBlockData;
}

export interface CdgScrollPresetInstruction {
  kind: "scroll-preset";
  colorIndex: number;
  hScroll: { command: "none" | "right" | "left"; offset: number };
  vScroll: { command: "none" | "down" | "up"; offset: number };
}

export interface CdgScrollCopyInstruction {
  kind: "scroll-copy";
  hScroll: { command: "none" | "right" | "left"; offset: number };
  vScroll: { command: "none" | "down" | "up"; offset: number };
}

export interface CdgDefineTransparentColorInstruction {
  kind: "define-transparent-color";
  colorIndex: number;
}

export interface CdgLoadColorTableLowInstruction {
  kind: "load-color-table-low";
  colors: CdgColor[];
}

export interface CdgLoadColorTableHighInstruction {
  kind: "load-color-table-high";
  colors: CdgColor[];
}

export type CdgPacketInstruction =
  | CdgMemoryPresetInstruction
  | CdgBorderPresetInstruction
  | CdgTileBlockInstruction
  | CdgScrollPresetInstruction
  | CdgScrollCopyInstruction
  | CdgDefineTransparentColorInstruction
  | CdgLoadColorTableLowInstruction
  | CdgLoadColorTableHighInstruction;

export type CdgSubCodePacket =
  | { kind: "cdg"; instruction: CdgPacketInstruction }
  | { kind: "empty" }
  | { kind: "other"; data: Uint8Array };
