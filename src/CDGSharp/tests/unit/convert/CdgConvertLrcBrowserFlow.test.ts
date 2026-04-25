import { describe, expect, it } from "@jest/globals";
import { CdgConvertLrcBrowserFlow } from "@/CDGSharp/convert/CdgConvertLrcBrowserFlow";

const SAMPLE_LRC = [
  "[version:1.0]",
  "[ti:Song]",
  "[ar:Artist]",
  "",
  "[00:00:10]HeLLo[00:00:60] world[00:00:90]",
  ""
].join("\n");

describe("CdgConvertLrcBrowserFlow", () => {
  it("validates #RGB sung text color", () => {
    const flow = new CdgConvertLrcBrowserFlow();

    expect(() =>
      flow.execute(SAMPLE_LRC, { sungTextColor: "#00FF00" })
    ).toThrow("sungTextColor must match #RGB using one hex nibble per channel.");
  });

  it("returns generated cdg bytes from parsed lrc content", () => {
    const flow = new CdgConvertLrcBrowserFlow();

    const bytes = flow.execute(SAMPLE_LRC, {
      sungTextColor: "#ff0",
      allBreaks: true,
      font: "Arial"
    });

    expect(bytes.length).toBeGreaterThan(0);
  });

  it("applies uppercase + timestamp shift options", () => {
    const flow = new CdgConvertLrcBrowserFlow();

    const baseBytes = flow.execute(SAMPLE_LRC, {
      sungTextColor: "#ff0",
      bgColor: "#008",
      textColor: "#fff",
      font: "DejaVu Sans"
    });

    const transformedBytes = flow.execute(SAMPLE_LRC, {
      sungTextColor: "#ff0",
      bgColor: "#008",
      textColor: "#fff",
      font: "DejaVu Sans",
      uppercaseText: true,
      modifyTimestamps: 0.5
    });

    expect(transformedBytes.length).toBeGreaterThan(0);
    expect(Array.from(transformedBytes)).not.toEqual(Array.from(baseBytes));
  });

  it("supports trailing-wipe transition mode", () => {
    const flow = new CdgConvertLrcBrowserFlow();

    const bytes = flow.execute(SAMPLE_LRC, {
      sungTextColor: "#ff0",
      transitionMode: "trailing-wipe",
      trailingWipeDelayMs: 2000
    });

    expect(bytes.length).toBeGreaterThan(0);
  });

  it("executeAsync reports progress and completes", async () => {
    const flow = new CdgConvertLrcBrowserFlow();
    const phases: string[] = [];

    const bytes = await flow.executeAsync(SAMPLE_LRC, {
      onProgress: (progress) => {
        phases.push(progress.phase);
      }
    });

    expect(bytes.length).toBeGreaterThan(0);
    expect(phases).toContain("parsing");
    expect(phases).toContain("planning");
    expect(phases).toContain("generating");
    expect(phases).toContain("serializing");
    expect(phases).toContain("done");
  });

  it("ignores progress callback errors", async () => {
    const flow = new CdgConvertLrcBrowserFlow();

    await expect(
      flow.executeAsync(SAMPLE_LRC, {
        onProgress: () => {
          throw new Error("ui callback exploded");
        }
      })
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it("wraps unexpected execution errors as FlowExecutionError", () => {
    const flow = new CdgConvertLrcBrowserFlow();
    const serializer = (flow as any).serializer as { serialize: () => Uint8Array };
    const originalSerialize = serializer.serialize;
    serializer.serialize = () => {
      throw new Error("boom");
    };

    try {
      expect(() => flow.execute(SAMPLE_LRC)).toThrow("CDGSharp browser flow failed: boom");
    } finally {
      serializer.serialize = originalSerialize;
    }
  });
});
