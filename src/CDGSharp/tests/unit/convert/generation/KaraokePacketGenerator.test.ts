import { describe, expect, it } from "@jest/globals";
import { KaraokePacketGenerator } from "@/CDGSharp/convert/generation/KaraokePacketGenerator";

describe("KaraokePacketGenerator", () => {
  it("generates a timing-based packet scaffold for pages", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 0,
            lines: [[{ text: "Hello", durationMs: 1000 }]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#666",
        fontName: "Arial",
        fontSize: 16,
        fontStyle: "regular",
        wrapGracePx: 0
      }
    });

    expect(packets.length).toBeGreaterThan(0);
    expect(packets[0]).toEqual({
      kind: "cdg",
      instruction: {
        kind: "memory-preset",
        colorIndex: 0,
        repeat: 0
      }
    });

    expect(packets[1]).toEqual({
      kind: "cdg",
      instruction: {
        kind: "load-color-table-low",
        colors: [
          { red: 0, green: 0, blue: 8 },
          { red: 15, green: 15, blue: 15 },
          { red: 0, green: 0, blue: 0 },
          { red: 0, green: 0, blue: 0 },
          { red: 0, green: 0, blue: 0 },
          { red: 0, green: 0, blue: 0 },
          { red: 0, green: 0, blue: 0 },
          { red: 0, green: 0, blue: 0 }
        ]
      }
    });
  });

  it("exposes filling-packet helper", () => {
    const generator = new KaraokePacketGenerator();
    const filling = generator.getFillingPackets(1000);

    expect(filling?.length).toBe(300);
  });

  it("uses sung-text-color for color table generation", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 0,
            lines: [[{ text: "Hello", durationMs: 300 }]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#ff0",
        fontName: "Arial",
        fontSize: 16,
        fontStyle: "regular",
        wrapGracePx: 0
      }
    });

    const sungLow = packets.find(
      (packet) =>
        packet.kind === "cdg" &&
        packet.instruction.kind === "load-color-table-low" &&
        packet.instruction.colors[2]?.red === 15
    );

    if (sungLow === undefined || sungLow.kind !== "cdg" || sungLow.instruction.kind !== "load-color-table-low") {
      throw new Error("Expected lyrics-page low color table packet");
    }

    expect(sungLow.instruction.colors[2]).toEqual({ red: 15, green: 15, blue: 0 });
  });

  it("emits sung progression tile packets", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 0,
            lines: [[
              { text: "Hello", durationMs: 300 },
              { text: " ", durationMs: 100 },
              { text: "World", durationMs: 300 }
            ]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#ff0",
        fontName: "Arial",
        fontSize: 16,
        fontStyle: "regular",
        wrapGracePx: 0
      }
    });

    const hasSungTile = packets.some(
      (packet) =>
        packet.kind === "cdg" &&
        packet.instruction.kind === "tile-block" &&
        packet.instruction.data.color2 === 3
    );

    expect(hasSungTile).toBe(true);
  });

  it("keeps title page visible until first lyric page starts", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 5000,
            lines: [[{ text: "Hello", durationMs: 1000 }]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#ff0",
        fontName: "Liberation Sans",
        fontSize: 17,
        fontStyle: "bold",
        wrapGracePx: 5
      }
    });

    const firstLyricsInitIndex = packets.findIndex(
      (packet, index) =>
        index > 0 &&
        packet.kind === "cdg" &&
        packet.instruction.kind === "load-color-table-low" &&
        packet.instruction.colors[2]?.red === 15
    );

    expect(firstLyricsInitIndex).toBeGreaterThan(0);

    const firstLyricsPageStartIndex = firstLyricsInitIndex - 1;
    expect(firstLyricsPageStartIndex).toBeGreaterThanOrEqual(0);

    const titleToLyricsWindow = packets.slice(0, firstLyricsPageStartIndex);
    const hasPrematureClear = titleToLyricsWindow.some(
      (packet, index) =>
        index > 0 &&
        packet.kind === "cdg" &&
        packet.instruction.kind === "memory-preset"
    );

    expect(hasPrematureClear).toBe(false);
  });

  it("spreads sung highlighting over time as a wipe", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 0,
            lines: [[{ text: "HelloWorld", durationMs: 3000 }]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#ff0",
        fontName: "DejaVu Sans",
        fontSize: 17,
        fontStyle: "bold",
        wrapGracePx: 0
      }
    });

    const sungIndices = packets
      .map((packet, index) => ({ packet, index }))
      .filter(
        ({ packet }) =>
          packet.kind === "cdg" &&
          packet.instruction.kind === "tile-block" &&
          packet.instruction.data.color2 === 3
      )
      .map(({ index }) => index);

    expect(sungIndices.length).toBeGreaterThan(1);

    const firstSungIndex = sungIndices[0];
    const lastSungIndex = sungIndices[sungIndices.length - 1];
    if (firstSungIndex === undefined || lastSungIndex === undefined) {
      throw new Error("Expected at least two sung packets.");
    }

    const hasEmptyBetweenSungPackets = packets
      .slice(firstSungIndex, lastSungIndex + 1)
      .some((packet) => packet.kind === "empty");

    expect(hasEmptyBetweenSungPackets).toBe(true);
  });

  it("draws first lyrics before filler after title clear", () => {
    const generator = new KaraokePacketGenerator();

    const packets = generator.generate({
      plan: {
        title: "Song",
        artist: "Artist",
        pages: [
          {
            startTimeMs: 5000,
            lines: [[{ text: "Hello world", durationMs: 2000 }]]
          }
        ]
      },
      style: {
        bgColor: "#008",
        textColor: "#FFF",
        sungTextColor: "#ff0",
        fontName: "DejaVu Sans",
        fontSize: 17,
        fontStyle: "bold",
        wrapGracePx: 5
      }
    });

    const firstLyricsInitIndex = packets.findIndex(
      (packet, index) =>
        index > 0 &&
        packet.kind === "cdg" &&
        packet.instruction.kind === "load-color-table-low" &&
        packet.instruction.colors[2]?.red === 15
    );

    expect(firstLyricsInitIndex).toBeGreaterThan(0);

    const firstLyricsStartIndex = firstLyricsInitIndex - 1;
    const afterInit = packets.slice(firstLyricsStartIndex + 3);

    const firstRenderableIndex = afterInit.findIndex((packet) => packet.kind === "cdg" || packet.kind === "empty");
    expect(firstRenderableIndex).toBeGreaterThanOrEqual(0);

    const firstRenderable = afterInit[firstRenderableIndex];
    expect(firstRenderable?.kind).toBe("cdg");
    if (firstRenderable?.kind === "cdg") {
      expect(firstRenderable.instruction.kind).toBe("tile-block");
    }
  });
});
