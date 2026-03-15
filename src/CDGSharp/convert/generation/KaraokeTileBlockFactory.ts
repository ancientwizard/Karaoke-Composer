/*
 * KaraokeTileBlockFactory module features.
 * Contains implementation for karaoke tile block factory.
 */

import type { CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";
import type { RasterizedText   } from "@/CDGSharp/convert/rendering/RasterizedText";

interface PositionedRasterizedText {
  x: number;
  y: number;
  text: RasterizedText;
}

export class KaraokeTileBlockFactory {
  private static readonly tileWidth = 6;

  private static readonly tileHeight = 12;

  private static readonly tileRows = 16;

  private static readonly tileColumns = 48;

  private static readonly displayWidth = KaraokeTileBlockFactory.tileColumns * KaraokeTileBlockFactory.tileWidth;

  private static readonly displayHeight = KaraokeTileBlockFactory.tileRows * KaraokeTileBlockFactory.tileHeight;

  public static createDrawPackets(lines: PositionedRasterizedText[], colorIndex: number): CdgSubCodePacket[] {
    return this.createPackets(lines, colorIndex, "xor");
  }

  public static createReplacePackets(lines: PositionedRasterizedText[], colorIndex: number): CdgSubCodePacket[] {
    return this.createPackets(lines, colorIndex, "replace");
  }

  private static createPackets(
    lines: PositionedRasterizedText[],
    colorIndex: number,
    operation: "xor" | "replace"
  ): CdgSubCodePacket[] {
    const pixels = Array.from({ length: this.displayHeight }, () =>
      Array.from({ length: this.displayWidth }, () => false)
    );

    for (const line of lines) {
      this.blit(pixels, line);
    }

    const packets: CdgSubCodePacket[] = [];

    for (let tileRow = 0; tileRow < this.tileRows; tileRow += 1) {
      for (let tileColumn = 0; tileColumn < this.tileColumns; tileColumn += 1) {
        const pixelRows = this.extractTilePixelRows(pixels, tileRow, tileColumn);
        const hasPixels = pixelRows.some((value) => value > 0);
        if (!hasPixels) {
          continue;
        }

        packets.push({
          kind: "cdg",
          instruction: {
            kind: "tile-block",
            operation,
            data: {
              color1: 0,
              color2: colorIndex,
              row: tileRow + 1,
              column: tileColumn + 1,
              pixelRows
            }
          }
        });
      }
    }

    return packets;
  }

  private static blit(target: boolean[][], source: PositionedRasterizedText): void {
    for (let y = 0; y < source.text.height; y += 1) {
      const sourceRow = source.text.pixels[y];
      const targetY = source.y + y;
      const targetRow = target[targetY];
      if (sourceRow === undefined || targetRow === undefined) {
        continue;
      }

      for (let x = 0; x < source.text.width; x += 1) {
        if (sourceRow[x] !== true) {
          continue;
        }

        const targetX = source.x + x;
        if (targetX >= 0 && targetX < targetRow.length) {
          targetRow[targetX] = true;
        }
      }
    }
  }

  private static extractTilePixelRows(
    pixels: boolean[][],
    tileRow: number,
    tileColumn: number
  ): number[] {
    const xBase = tileColumn * this.tileWidth;
    const yBase = tileRow * this.tileHeight;

    const rows: number[] = [];

    for (let y = 0; y < this.tileHeight; y += 1) {
      const row = pixels[yBase + y];
      let value = 0;
      for (let x = 0; x < this.tileWidth; x += 1) {
        value = (value << 1) | ((row?.[xBase + x] ?? false) ? 1 : 0);
      }
      rows.push(value);
    }

    return rows;
  }
}
