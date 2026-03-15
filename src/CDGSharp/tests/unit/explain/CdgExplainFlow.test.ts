import { describe, expect, it } from "@jest/globals";
import { CdgExplainFlow } from "@/CDGSharp/explain/CdgExplainFlow";

describe("CdgExplainFlow", () => {
  it("validates input path before execution", () => {
    const flow = new CdgExplainFlow();

    expect(() => flow.execute({ filePath: "   " })).toThrow("filePath is required.");
  });

  it("wraps file errors with flow execution context", () => {
    const flow = new CdgExplainFlow();

    expect(() => flow.execute({ filePath: "./sample.cdg" })).toThrow(
      "Explain flow failed:"
    );
  });
});
