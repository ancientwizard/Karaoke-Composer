import { describe, expect, it } from "@jest/globals";
import { KaraokeCommandPlanner } from "@/CDGSharp/convert/planning/KaraokeCommandPlanner";
import { TextRasterizerAdapter } from "@/CDGSharp/convert/rendering/TextRasterizerAdapter";
import { RasterizedTextFactory } from "@/CDGSharp/convert/rendering/RasterizedText";

describe("KaraokeCommandPlanner", () => {
  const defaultSettings = {
    allBreaks: false,
    wrapGracePx: 0,
    maxLines: undefined,
    defaultFontName: "Arial",
    defaultFontSize: 15,
    defaultFontStyle: "regular" as const
  };

  it("creates a basic karaoke plan from parsed lyrics", () => {
    const planner = new KaraokeCommandPlanner();
    const plan = planner.createPlan({
      metadata: { title: "Song", artist: "Artist" },
      lyrics: {
        pages: [
          [
            [
              { text: "Hello", startTime: 100, endTime: 300 },
              { text: "world", startTime: 300, endTime: 500 }
            ]
          ]
        ]
      }
    }, defaultSettings);

    expect(plan.title).toBe("Song");
    expect(plan.artist).toBe("Artist");
    expect(plan.pages[0]?.startTimeMs).toBe(100);
    expect(plan.pages[0]?.lines[0]?.[0]?.durationMs).toBe(200);
  });

  it("keeps semantic source page breaks", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [
            [[
              { text: "Hello", startTime: 0, endTime: 500 },
              { text: "world", startTime: 500, endTime: 1000 }
            ]],
            [[
              { text: "Next", startTime: 10000, endTime: 10500 },
              { text: "verse", startTime: 10500, endTime: 11000 }
            ]]
          ]
        }
      },
      defaultSettings
    );

    expect(plan.pages.length).toBe(2);
    expect(plan.pages[0]?.startTimeMs).toBe(0);
    expect(plan.pages[1]?.startTimeMs).toBe(10000);
  });

  it("allBreaks forces punctuation line breaks", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [[[
            { text: "Hello,", startTime: 0, endTime: 500 },
            { text: "world", startTime: 500, endTime: 1000 },
            { text: "again", startTime: 1000, endTime: 1500 }
          ]]]
        }
      },
      { ...defaultSettings, allBreaks: true }
    );

    expect(plan.pages[0]?.lines.length).toBe(2);
  });

  it("shortens phrase-ending word duration when long pause follows", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [[[
            { text: "Hello,", startTime: 0, endTime: 2000 },
            { text: "next", startTime: 2000, endTime: 2300 }
          ]]]
        }
      },
      defaultSettings
    );

    const firstDuration = plan.pages[0]?.lines[0]?.[0]?.durationMs ?? 0;
    expect(firstDuration).toBe(900);
  });

  it("respects maxLines override when dynamic layout would allow more lines", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [[[
            { text: "One,", startTime: 0, endTime: 300 },
            { text: "Two,", startTime: 300, endTime: 600 },
            { text: "Three,", startTime: 600, endTime: 900 },
            { text: "Four,", startTime: 900, endTime: 1200 },
            { text: "Five,", startTime: 1200, endTime: 1500 }
          ]]]
        }
      },
      { ...defaultSettings, allBreaks: true, maxLines: 2 }
    );

    expect(plan.pages.length).toBe(3);
    expect(plan.pages.map((page) => page.lines.length)).toEqual([2, 2, 1]);
  });

  it("balances 5 wrapped lines across max 4 as 3+2 instead of 4+1", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [[[
            { text: "One,", startTime: 0, endTime: 300 },
            { text: "Two,", startTime: 300, endTime: 600 },
            { text: "Three,", startTime: 600, endTime: 900 },
            { text: "Four,", startTime: 900, endTime: 1200 },
            { text: "Five,", startTime: 1200, endTime: 1500 }
          ]]]
        }
      },
      { ...defaultSettings, allBreaks: true, maxLines: 4 }
    );

    expect(plan.pages.length).toBe(2);
    expect(plan.pages.map((page) => page.lines.length)).toEqual([3, 2]);
  });

  it("balances 8 wrapped lines across max 6 as 4+4 instead of 6+2", () => {
    const planner = new KaraokeCommandPlanner();

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [[[
            { text: "One,", startTime: 0, endTime: 300 },
            { text: "Two,", startTime: 300, endTime: 600 },
            { text: "Three,", startTime: 600, endTime: 900 },
            { text: "Four,", startTime: 900, endTime: 1200 },
            { text: "Five,", startTime: 1200, endTime: 1500 },
            { text: "Six,", startTime: 1500, endTime: 1800 },
            { text: "Seven,", startTime: 1800, endTime: 2100 },
            { text: "Eight,", startTime: 2100, endTime: 2400 }
          ]]]
        }
      },
      { ...defaultSettings, allBreaks: true, maxLines: 6 }
    );

    expect(plan.pages.length).toBe(2);
    expect(plan.pages.map((page) => page.lines.length)).toEqual([4, 4]);
  });

  it("slides a boundary by one line to avoid splitting a wrapped source phrase", () => {
    class ForceSingleWordWrapRasterizer implements TextRasterizerAdapter {
      public measureText(text: string): number {
        return text.length * 200;
      }

      public rasterizeText() {
        return RasterizedTextFactory.createEmpty(1, 1);
      }
    }

    const planner = new KaraokeCommandPlanner(new ForceSingleWordWrapRasterizer());

    const plan = planner.createPlan(
      {
        metadata: { title: "Title", artist: "Artist" },
        lyrics: {
          pages: [
            [
              [{ text: "A", startTime: 0, endTime: 100 }],
              [{ text: "B", startTime: 100, endTime: 200 }],
              [{ text: "C", startTime: 200, endTime: 300 }],
              [
                { text: "D", startTime: 300, endTime: 400 },
                { text: "E", startTime: 400, endTime: 500 }
              ],
              [{ text: "F", startTime: 500, endTime: 600 }],
              [{ text: "G", startTime: 600, endTime: 700 }]
            ]
          ]
        }
      },
      {
        allBreaks: false,
        wrapGracePx: 0,
        maxLines: 4,
        defaultFontName: "Arial",
        defaultFontSize: 15,
        defaultFontStyle: "regular"
      }
    );

    expect(plan.pages.length).toBe(2);
    expect(plan.pages.map((page) => page.lines.length)).toEqual([3, 4]);

    const pageTwoTexts = plan.pages[1]?.lines.map((line) => line.map((part) => part.text).join("")) ?? [];
    expect(pageTwoTexts.slice(0, 2)).toEqual(["D", "E"]);
  });
});
