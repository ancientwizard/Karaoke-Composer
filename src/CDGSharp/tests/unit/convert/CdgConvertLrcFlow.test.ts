import { describe, expect, it } from "@jest/globals";
import { CdgConvertLrcFlow } from "@/CDGSharp/convert/CdgConvertLrcFlow";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("CdgConvertLrcFlow", () => {
  it("validates input path before execution", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() => flow.execute({ filePath: " " })).toThrow("filePath is required.");
  });

  it("validates #RGB sung text color", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", sungTextColor: "#00FF00" })
    ).toThrow("sungTextColor must match #RGB using one hex nibble per channel.");
  });

  it("validates #RGB background and text colors", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", bgColor: "#0000FF" })
    ).toThrow("bgColor must match #RGB using one hex nibble per channel.");

    expect(() =>
      flow.execute({ filePath: "./song.lrc", textColor: "#0000FF" })
    ).toThrow("textColor must match #RGB using one hex nibble per channel.");
  });

  it("validates modify-timestamps as finite numeric seconds", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", modifyTimestamps: Number.NaN })
    ).toThrow("modifyTimestamps must be a finite number of seconds.");
  });

  it("validates maxLines as a positive integer", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", maxLines: 0 })
    ).toThrow("maxLines must be a positive integer.");

    expect(() =>
      flow.execute({ filePath: "./song.lrc", maxLines: 2.5 })
    ).toThrow("maxLines must be a positive integer.");
  });

  it("validates trailing wipe delay as a positive integer", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", transitionMode: "trailing-wipe", trailingWipeDelayMs: 0 })
    ).toThrow("trailingWipeDelayMs must be a positive integer.");
  });

  it("validates trailing wipe region ready threshold in [0, 1]", () => {
    const flow = new CdgConvertLrcFlow();

    expect(() =>
      flow.execute({ filePath: "./song.lrc", trailingWipeRegionReadyThreshold: -0.1 })
    ).toThrow("trailingWipeRegionReadyThreshold must be a number between 0 and 1.");

    expect(() =>
      flow.execute({ filePath: "./song.lrc", trailingWipeRegionReadyThreshold: 1.1 })
    ).toThrow("trailingWipeRegionReadyThreshold must be a number between 0 and 1.");
  });

  it("returns generated cdg bytes from parsed lrc", () => {
    const flow = new CdgConvertLrcFlow();
    const dir = mkdtempSync(join(tmpdir(), "cdgsharp-ts-"));
    const filePath = join(dir, "song.lrc");
    writeFileSync(filePath, "[version:1.0]\n[ti:Song]\n[ar:Artist]\n\n[00:00:10]Hello[00:00:20]\n");

    try {
      const bytes = flow.execute({ filePath, sungTextColor: "#ff0", allBreaks: true, font: "Arial" });
      expect(bytes.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("applies uppercase + timestamp shift options", () => {
    const flow = new CdgConvertLrcFlow();
    const dir = mkdtempSync(join(tmpdir(), "cdgsharp-ts-"));
    const filePath = join(dir, "song.lrc");
    writeFileSync(filePath, "[version:1.0]\n[ti:Song]\n[ar:Artist]\n\n[00:00:10]HeLLo[00:00:60] world[00:00:90]\n");

    try {
      const baseBytes = flow.execute({
        filePath,
        sungTextColor: "#ff0",
        bgColor: "#008",
        textColor: "#fff",
        font: "DejaVu Sans"
      });

      const transformedBytes = flow.execute({
        filePath,
        sungTextColor: "#ff0",
        bgColor: "#008",
        textColor: "#fff",
        font: "DejaVu Sans",
        uppercaseText: true,
        modifyTimestamps: 0.5
      });

      expect(transformedBytes.length).toBeGreaterThan(0);
      expect(Array.from(transformedBytes)).not.toEqual(Array.from(baseBytes));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes planner timing debug report when debugTimingJsonPath is provided", () => {
    const flow = new CdgConvertLrcFlow();
    const dir = mkdtempSync(join(tmpdir(), "cdgsharp-ts-"));
    const filePath = join(dir, "song.lrc");
    const debugJsonPath = join(dir, "timing.json");
    writeFileSync(filePath, "[version:1.0]\n[ti:Song]\n[ar:Artist]\n\n[00:00:10]Hello[00:00:20]\n");

    try {
      flow.execute({
        filePath,
        sungTextColor: "#ff0",
        debugTimingJsonPath: debugJsonPath
      });

      const timingDebug = JSON.parse(readFileSync(debugJsonPath, "utf8")) as {
        title: string;
        artist: string;
        pageCount: number;
        pages: Array<{ lines: unknown[] }>;
      };

      expect(timingDebug.title).toBe("Song");
      expect(timingDebug.artist).toBe("Artist");
      expect(timingDebug.pageCount).toBeGreaterThan(0);
      expect(timingDebug.pages[0]?.lines.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("supports trailing-wipe transition mode", () => {
    const flow = new CdgConvertLrcFlow();
    const dir = mkdtempSync(join(tmpdir(), "cdgsharp-ts-"));
    const filePath = join(dir, "song.lrc");
    writeFileSync(filePath, "[version:1.0]\n[ti:Song]\n[ar:Artist]\n\n[00:00:10]Hello[00:00:20]\n");

    try {
      const bytes = flow.execute({
        filePath,
        sungTextColor: "#ff0",
        transitionMode: "trailing-wipe",
        trailingWipeDelayMs: 2000
      });

      expect(bytes.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
