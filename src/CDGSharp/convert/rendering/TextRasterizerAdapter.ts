/*
 * TextRasterizerAdapter module features.
 * Contains implementation for text rasterizer adapter.
 */

import type { RasterizedText } from "@/CDGSharp/convert/rendering/RasterizedText";

export interface TextRasterizerAdapter {
  measureText(text: string, fontName: string, fontSize: number, fontStyle: "regular" | "bold"): number;

  rasterizeText(
    text: string,
    fontName: string,
    fontSize: number,
    fontStyle: "regular" | "bold"
  ): RasterizedText;
}
