/*
 * CdgRenderer module features.
 * Contains implementation for cdg renderer.
 */

import type { CdgPacketInstruction, CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";

const TILE_HEIGHT = 12;
const TILE_WIDTH = 6;
const TILE_ROWS = 16;
const TILE_COLUMNS = 48;

type TileColorIndices = number[][];
type ImageColorIndices = TileColorIndices[][];

export interface CdgRenderState {
  colorTableLow: Array<{ red: number; green: number; blue: number }>;
  colorTableHigh: Array<{ red: number; green: number; blue: number }>;
  colorIndices: ImageColorIndices;
  borderColorIndex: number;
}

export class CdgRenderer {
  public static createEmptyState(): CdgRenderState {
    return {
      colorTableLow: Array.from({ length: 8 }, () => ({ red: 0, green: 0, blue: 0 })),
      colorTableHigh: Array.from({ length: 8 }, () => ({ red: 0, green: 0, blue: 0 })),
      colorIndices: this.createImageColorIndices(0),
      borderColorIndex: 0
    };
  }

  public static applyPacket(state: CdgRenderState, packet: CdgSubCodePacket): CdgRenderState {
    if (packet.kind !== "cdg") {
      return state;
    }

    return this.applyInstruction(state, packet.instruction);
  }

  public static render(packets: CdgSubCodePacket[]): CdgRenderState {
    return packets.reduce((state, packet) => this.applyPacket(state, packet), this.createEmptyState());
  }

  public static getBorderColor(state: CdgRenderState): { red: number; green: number; blue: number } {
    return this.getColorFromTable(state, state.borderColorIndex);
  }

  public static applyInstruction(state: CdgRenderState, instruction: CdgPacketInstruction): CdgRenderState {
    switch (instruction.kind) {
      case "memory-preset":
        return {
          ...state,
          colorIndices: this.createImageColorIndices(instruction.colorIndex),
          borderColorIndex: instruction.colorIndex
        };
      case "border-preset":
        return {
          ...state,
          borderColorIndex: instruction.colorIndex
        };
      case "tile-block": {
        const newTileColorIndices = this.tileColorIndicesFromTileBlock(instruction.data);
        const row = instruction.data.row - 1;
        const column = instruction.data.column - 1;

        const colorIndicesClone = this.cloneImageColorIndices(state.colorIndices);
        if (instruction.operation === "replace") {
          this.setTile(colorIndicesClone, row, column, newTileColorIndices);
        } else {
          const current = this.getTile(colorIndicesClone, row, column);
          this.setTile(colorIndicesClone, row, column, this.xorTileColorIndices(current, newTileColorIndices));
        }

        return {
          ...state,
          colorIndices: colorIndicesClone
        };
      }
      case "scroll-preset":
        throw new Error("ScrollPreset: Not implemented");
      case "scroll-copy":
        throw new Error("ScrollCopy: Not implemented");
      case "define-transparent-color":
        return state;
      case "load-color-table-low":
        return {
          ...state,
          colorTableLow: [...instruction.colors]
        };
      case "load-color-table-high":
        return {
          ...state,
          colorTableHigh: [...instruction.colors]
        };
      default:
        return state;
    }
  }

  private static createImageColorIndices(colorIndex: number): ImageColorIndices {
    return Array.from({ length: TILE_ROWS }, () =>
      Array.from({ length: TILE_COLUMNS }, () =>
        Array.from({ length: TILE_HEIGHT }, () =>
          Array.from({ length: TILE_WIDTH }, () => colorIndex)
        )
      )
    );
  }

  private static tileColorIndicesFromTileBlock(data: {
    color1: number;
    color2: number;
    pixelRows: number[];
  }): TileColorIndices {
    return data.pixelRows.map((pixelRow) =>
      this.pixelRowToBits(pixelRow).map((bit) => (bit === 0 ? data.color1 : data.color2))
    );
  }

  private static pixelRowToBits(pixelRow: number): number[] {
    const bits: number[] = [];
    for (let i = TILE_WIDTH - 1; i >= 0; i -= 1) {
      bits.push((pixelRow >>> i) & 1);
    }
    return bits;
  }

  private static xorTileColorIndices(a: TileColorIndices, b: TileColorIndices): TileColorIndices {
    return a.map((row, rowIndex) =>
      row.map((value, columnIndex) => {
        const otherRow = b[rowIndex];
        const otherValue = otherRow?.[columnIndex];
        if (otherValue === undefined) {
          throw new Error("Tile XOR failed because target tile dimensions do not match.");
        }

        return value ^ otherValue;
      })
    );
  }

  private static cloneImageColorIndices(colorIndices: ImageColorIndices): ImageColorIndices {
    return colorIndices.map((row) =>
      row.map((tile) => tile.map((pixelRow) => [...pixelRow]))
    );
  }

  private static getColorFromTable(state: CdgRenderState, colorIndex: number): { red: number; green: number; blue: number } {
    if (colorIndex < state.colorTableLow.length) {
      return this.getColorAt(state.colorTableLow, colorIndex);
    }

    return this.getColorAt(state.colorTableHigh, colorIndex - 8);
  }

  private static getTile(colorIndices: ImageColorIndices, row: number, column: number): TileColorIndices {
    const tile = colorIndices[row]?.[column];
    if (tile === undefined) {
      throw new Error(`Tile access out of bounds: row=${row}, column=${column}`);
    }

    return tile;
  }

  private static setTile(colorIndices: ImageColorIndices, row: number, column: number, tile: TileColorIndices): void {
    const tileRow = colorIndices[row];
    if (tileRow === undefined) {
      throw new Error(`Tile row out of bounds: row=${row}`);
    }

    tileRow[column] = tile;
  }

  private static getColorAt(
    colors: Array<{ red: number; green: number; blue: number }>,
    index: number
  ): { red: number; green: number; blue: number } {
    const color = colors[index];
    if (color === undefined) {
      throw new Error(`Color table access out of bounds: index=${index}`);
    }

    return color;
  }
}
