/**
 * Tests for CDGMagic_BMPLoader
 *
 * This test suite covers BMP file loading, error handling, and conversion
 * of error codes to human-readable text messages.
 */

import { CDGMagic_BMPLoader, BMPLoaderError } from "@/ts/cd+g-magic/CDGMagic_BMPLoader";

describe("CDGMagic_BMPLoader", () => {
  test("should create BMPLoader and get error messages", () => {
    expect(BMPLoaderError.NO_PATH).toBe("NO_PATH");
    expect(BMPLoaderError.OPEN_FAIL).toBe("OPEN_FAIL");
  });

  test("should convert error codes to text", () => {
    const text = CDGMagic_BMPLoader.error_to_text(BMPLoaderError.NO_PATH);
    expect(text).toContain("path");
    expect(text.length).toBeGreaterThan(0);
  });

  test("should fail with missing file", () => {
    expect(() => {
      new CDGMagic_BMPLoader("/nonexistent/file.bmp");
    }).toThrow();
  });

  test("should handle unknown error codes", () => {
    const text = CDGMagic_BMPLoader.error_to_text("UNKNOWN_ERROR");
    expect(text).toContain("Unknown");
  });
});

// vim: ts=2 sw=2 et
// END
