import { describe, expect, it } from "@jest/globals";
import { LrcFileParser } from "@/CDGSharp/convert/lrc/LrcFileParser";

describe("LrcFileParser", () => {
  it("parses extended v2.1 syllable timed format", () => {
    const content = [
      "[version:2.1]",
      "[syllable_timing:true]",
      "[ti:Test Song]",
      "[ar:Test Artist]",
      "[duration:00:01.00]",
      "",
      "#[line:0:caption:Verse 1]",
      "[00:00.10]<00:00.10>Hello <00:00.30>world"
    ].join("\n");

    const lrc = LrcFileParser.parseFileContent(content);
    const firstWord = lrc.lyrics.pages[0]?.[0]?.[0];
    const secondWord = lrc.lyrics.pages[0]?.[0]?.[1];

    expect(lrc.metadata.title).toBe("Test Song");
    expect(lrc.metadata.artist).toBe("Test Artist");
    expect(firstWord?.text).toBe("Hello");
    expect(firstWord?.startTime).toBe(100);
    expect(firstWord?.endTime).toBe(300);
    expect(secondWord?.text).toBe("world");
    expect(secondWord?.startTime).toBe(300);
    expect(secondWord?.endTime).toBe(1000);
  });

  it("parses legacy format and artist fallback", () => {
    const content = [
      "[version:1.0]",
      "[syllable_timing:false]",
      "[ti:Legacy Song]",
      "[au:Fallback Author]",
      "",
      "[00:00:10]Hello[00:00:20] [00:00:20]world[00:00:30]"
    ].join("\n");

    const lrc = LrcFileParser.parseFileContent(content);
    const firstWord = lrc.lyrics.pages[0]?.[0]?.[0];
    const secondWord = lrc.lyrics.pages[0]?.[0]?.[1];

    expect(lrc.metadata.artist).toBe("Fallback Author");
    expect(firstWord?.startTime).toBe(100);
    expect(firstWord?.endTime).toBe(200);
    expect(secondWord?.startTime).toBe(200);
    expect(secondWord?.endTime).toBe(300);
  });
});
