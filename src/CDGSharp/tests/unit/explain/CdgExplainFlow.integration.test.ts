import { describe, expect, it } from "@jest/globals";
import { CdgExplainFlow } from "@/CDGSharp/explain/CdgExplainFlow";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("CdgExplainFlow integration", () => {
  it("reads a cdg file and returns explained lines", () => {
    const dir = mkdtempSync(join(tmpdir(), "cdgsharp-ts-"));
    const path = join(dir, "sample.cdg");

    const packet = new Uint8Array(24);
    packet[0] = 9;
    packet[1] = 1;
    packet[4] = 0x04;
    packet[5] = 0x01;
    writeFileSync(path, packet);

    try {
      const flow = new CdgExplainFlow();
      const lines = flow.execute({ filePath: path });
      expect(lines).toEqual(["0: CD+G: Memory Preset: Color index: 4, Repeat: 1"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
