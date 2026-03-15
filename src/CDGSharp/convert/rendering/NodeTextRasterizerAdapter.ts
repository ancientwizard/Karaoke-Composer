/*
 * NodeTextRasterizerAdapter module features.
 * Contains implementation for node text rasterizer adapter.
 */

import type { TextRasterizerAdapter             } from "@/CDGSharp/convert/rendering/TextRasterizerAdapter";
import { RasterizedTextFactory                  } from "@/CDGSharp/convert/rendering/RasterizedText";
import type { RasterizedText                    } from "@/CDGSharp/convert/rendering/RasterizedText";
import { createCanvas, GlobalFonts              } from "@napi-rs/canvas";
import { existsSync                             } from "node:fs";
import { basename, extname                      } from "node:path";

export class NodeTextRasterizerAdapter implements TextRasterizerAdapter {
  private static readonly alphaThreshold = 245;

  private static readonly regularFontWeight = "700";

  private static readonly boldFontWeight = "800";

  private static readonly registeredFontAliases = new Map<string, string>();

  public measureText(text: string, _fontName: string, fontSize: number, _fontStyle: "regular" | "bold"): number {
    const fallback = Math.ceil(text.length * fontSize * 0.6);
    const resolvedFont = this.resolveFontName(_fontName);

    try {
      const canvas = createCanvas(1, 1);
      const context = canvas.getContext("2d");
      context.font = `${this.resolveFontWeight(_fontStyle)} ${fontSize}px ${resolvedFont}`;
      return Math.max(1, Math.ceil(context.measureText(text).width));
    } catch {
      return fallback;
    }
  }

  public rasterizeText(
    text: string,
    fontName: string,
    fontSize: number,
    fontStyle: "regular" | "bold"
  ): RasterizedText {
    const resolvedFont = this.resolveFontName(fontName);
    const width = Math.max(1, this.measureText(text, resolvedFont, fontSize, fontStyle));
    const height = Math.max(1, Math.ceil(fontSize * 1.2));

    try {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      (context as unknown as { antialias?: string }).antialias = "none";

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fff";
      context.font = `${this.resolveFontWeight(fontStyle)} ${fontSize}px ${resolvedFont}`;
      context.textBaseline = "top";
      context.fillText(text, 0, 0);

      const imageData = context.getImageData(0, 0, width, height);
      const pixels = Array.from({ length: height }, () => Array.from({ length: width }, () => false));

      for (let y = 0; y < height; y += 1) {
        const row = pixels[y];
        if (row === undefined) {
          continue;
        }

        for (let x = 0; x < width; x += 1) {
          const alphaIndex = (y * width + x) * 4 + 3;
          row[x] = (imageData.data[alphaIndex] ?? 0) >= NodeTextRasterizerAdapter.alphaThreshold;
        }
      }

      return this.trimTransparentBounds(pixels, width, height);
    } catch {
      return RasterizedTextFactory.createEmpty(width, height);
    }
  }

  private trimTransparentBounds(pixels: boolean[][], width: number, height: number): RasterizedText {
    let minX = width;
    let maxX = -1;

    for (let y = 0; y < height; y += 1) {
      const row = pixels[y];
      if (row === undefined) {
        continue;
      }

      for (let x = 0; x < width; x += 1) {
        if (row[x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    if (maxX < minX) {
      return RasterizedTextFactory.createEmpty(1, 1);
    }

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = height;
    const croppedPixels = Array.from({ length: croppedHeight }, () =>
      Array.from({ length: croppedWidth }, () => false)
    );

    for (let y = 0; y < croppedHeight; y += 1) {
      const sourceRow = pixels[y];
      const targetRow = croppedPixels[y];
      if (sourceRow === undefined || targetRow === undefined) {
        continue;
      }

      for (let x = 0; x < croppedWidth; x += 1) {
        targetRow[x] = sourceRow[minX + x] ?? false;
      }
    }

    return { width: croppedWidth, height: croppedHeight, pixels: croppedPixels };
  }

  private resolveFontName(fontName: string): string {
    const normalized = fontName.trim();
    if (normalized.length === 0) {
      return fontName;
    }

    const isFilePath = existsSync(normalized) && /\.(ttf|otf|ttc|woff|woff2)$/i.test(extname(normalized));
    if (!isFilePath) {
      return fontName;
    }

    const existingAlias = NodeTextRasterizerAdapter.registeredFontAliases.get(normalized);
    if (existingAlias !== undefined) {
      return existingAlias;
    }

    const alias = basename(normalized, extname(normalized));
    const result = GlobalFonts.registerFromPath(normalized, alias);
    if (result !== null) {
      NodeTextRasterizerAdapter.registeredFontAliases.set(normalized, alias);
      return alias;
    }

    return fontName;
  }

  private resolveFontWeight(fontStyle: "regular" | "bold"): string {
    if (fontStyle === "bold") {
      return NodeTextRasterizerAdapter.boldFontWeight;
    }

    return NodeTextRasterizerAdapter.regularFontWeight;
  }
}
