/*
 * FlowOptionsValidator module features.
 * Contains implementation for flow options validator.
 */

export class FlowOptionsValidator {
  public static requireFilePath(filePath: string): string {
    const normalized = filePath.trim();
    if (normalized.length === 0) {
      throw new Error("filePath is required.");
    }
    return normalized;
  }

  public static requireHexColorNibble(color: string, optionName: string): string {
    const normalized = color.trim();
    if (!/^#([0-9a-fA-F]){3}$/.test(normalized)) {
      throw new Error(`${optionName} must match #RGB using one hex nibble per channel.`);
    }
    return normalized.toUpperCase();
  }

  public static requirePositiveInteger(value: number, optionName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${optionName} must be a positive integer.`);
    }

    return value;
  }
}
