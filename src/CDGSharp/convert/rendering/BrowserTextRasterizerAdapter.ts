/*
 * BrowserTextRasterizerAdapter module features.
 * Contains implementation for browser text rasterizer adapter.
 */

import type { TextRasterizerAdapter             } from "@/CDGSharp/convert/rendering/TextRasterizerAdapter";
import { RasterizedTextFactory                  } from "@/CDGSharp/convert/rendering/RasterizedText";
import type { RasterizedText                    } from "@/CDGSharp/convert/rendering/RasterizedText";

export class BrowserTextRasterizerAdapter implements TextRasterizerAdapter {
  public measureText(text: string, fontName: string, fontSize: number, fontStyle: "regular" | "bold"): number {
    if (typeof OffscreenCanvas === "undefined") {
      return Math.ceil(text.length * fontSize * 0.6);
    }

    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d");
    if (context === null) {
      return Math.ceil(text.length * fontSize * 0.6);
    }

    context.font = `${fontStyle === "bold" ? "bold" : "normal"} ${fontSize}px ${fontName}`;
    return Math.ceil(context.measureText(text).width);
  }

  public rasterizeText(
    text: string,
    fontName: string,
    fontSize: number,
    fontStyle: "regular" | "bold"
  ): RasterizedText {
    if (typeof OffscreenCanvas === "undefined") {
      const width = Math.max(1, this.measureText(text, fontName, fontSize, fontStyle));
      const height = Math.max(1, fontSize);
      return RasterizedTextFactory.createEmpty(width, height);
    }

    const width = Math.max(1, this.measureText(text, fontName, fontSize, fontStyle));
    const height = Math.max(1, Math.ceil(fontSize * 1.2));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context === null) {
      return RasterizedTextFactory.createEmpty(width, height);
    }

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.font = `${fontStyle === "bold" ? "bold" : "normal"} ${fontSize}px ${fontName}`;
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
        row[x] = (imageData.data[alphaIndex] ?? 0) > 0;
      }
    }

    return { width, height, pixels };
  }
}
