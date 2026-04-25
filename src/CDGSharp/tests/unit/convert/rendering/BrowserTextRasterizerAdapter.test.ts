import { afterEach, describe, expect, it } from "@jest/globals";
import { BrowserTextRasterizerAdapter } from "@/CDGSharp/convert/rendering/BrowserTextRasterizerAdapter";

describe("BrowserTextRasterizerAdapter", () => {
  const originalOffscreenCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

  afterEach(() => {
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = originalOffscreenCanvas;
  });

  it("falls back when OffscreenCanvas is unavailable", () => {
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = undefined;
    const adapter = new BrowserTextRasterizerAdapter();

    const measured = adapter.measureText("abcd", "Arial", 10, "regular");
    const rasterized = adapter.rasterizeText("abcd", "Arial", 10, "regular");

    expect(measured).toBe(Math.ceil(4 * 10 * 0.6));
    expect(rasterized.width).toBe(measured);
    expect(rasterized.height).toBe(10);
    expect(rasterized.pixels.flat().every((pixel) => pixel === false)).toBe(true);
  });

  it("falls back when canvas context is null", () => {
    class NullContextCanvas {
      public constructor(public readonly width: number, public readonly height: number) {}

      public getContext(): null {
        return null;
      }
    }

    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = NullContextCanvas;
    const adapter = new BrowserTextRasterizerAdapter();

    const measured = adapter.measureText("abc", "Arial", 10, "bold");
    const rasterized = adapter.rasterizeText("abc", "Arial", 10, "bold");

    expect(measured).toBe(Math.ceil(3 * 10 * 0.6));
    expect(rasterized.width).toBe(measured);
    expect(rasterized.height).toBe(Math.ceil(10 * 1.2));
    expect(rasterized.pixels.flat().every((pixel) => pixel === false)).toBe(true);
  });

  it("rasterizes text from alpha channel values", () => {
    class FakeContext {
      public fillStyle = "";
      public font = "";
      public textBaseline = "";

      public measureText(): { width: number } {
        return { width: 2 };
      }

      public clearRect(): void {}

      public fillText(): void {}

      public getImageData(): { data: Uint8ClampedArray } {
        const data = new Uint8ClampedArray(2 * 2 * 4);
        data[3] = 255;
        data[(1 * 2 + 1) * 4 + 3] = 128;
        return { data };
      }
    }

    class FakeCanvas {
      private readonly context = new FakeContext();

      public constructor(public readonly width: number, public readonly height: number) {}

      public getContext(): FakeContext {
        return this.context;
      }
    }

    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = FakeCanvas;
    const adapter = new BrowserTextRasterizerAdapter();

    const rasterized = adapter.rasterizeText("A", "Arial", 1, "regular");

    expect(rasterized.width).toBe(2);
    expect(rasterized.height).toBe(2);
    expect(rasterized.pixels).toEqual([
      [true, false],
      [false, true]
    ]);
  });
});
