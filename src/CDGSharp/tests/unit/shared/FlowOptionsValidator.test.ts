import { describe, expect, it } from "@jest/globals";
import { FlowOptionsValidator } from "@/CDGSharp/shared/FlowOptionsValidator";

describe("FlowOptionsValidator", () => {
  it("accepts a valid required file path", () => {
    expect(FlowOptionsValidator.requireFilePath(" ./song.lrc ")).toBe("./song.lrc");
  });

  it("rejects blank required file path", () => {
    expect(() => FlowOptionsValidator.requireFilePath("   ")).toThrow(
      "filePath is required."
    );
  });

  it("accepts #RGB nibble color and normalizes to upper case", () => {
    expect(
      FlowOptionsValidator.requireHexColorNibble("#f0a", "sungTextColor")
    ).toBe("#F0A");
  });

  it("rejects non-#RGB color values", () => {
    expect(() =>
      FlowOptionsValidator.requireHexColorNibble("#FF00AA", "sungTextColor")
    ).toThrow("sungTextColor must match #RGB using one hex nibble per channel.");
  });
});
