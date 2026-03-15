/*
 * RasterizedText module features.
 * Contains implementation for rasterized text.
 */

export interface RasterizedText {
  width: number;
  height: number;
  pixels: boolean[][];
}

export class RasterizedTextFactory {
  public static createEmpty(width: number, height: number): RasterizedText {
    return {
      width,
      height,
      pixels: Array.from({ length: height }, () => Array.from({ length: width }, () => false))
    };
  }
}
