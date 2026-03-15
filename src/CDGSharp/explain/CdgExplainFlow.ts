/*
 * CdgExplainFlow module features.
 * Contains implementation for cdg explain flow.
 */

import { FlowExecutionError   } from "@/CDGSharp/shared/FlowExecutionError";
import { FlowOptionsValidator } from "@/CDGSharp/shared/FlowOptionsValidator";
import { CdgPacketExplainer   } from "@/CDGSharp/cdg/CdgPacketExplainer";
import { CdgPacketParser      } from "@/CDGSharp/cdg/CdgPacketParser";
import { readFileSync         } from "node:fs";

export interface CdgExplainOptions {
  filePath: string;
}

export class CdgExplainFlow {
  public execute(options: CdgExplainOptions): string[] {
    const filePath = FlowOptionsValidator.requireFilePath(options.filePath);

    try {
      const content = readFileSync(filePath);
      const packets = CdgPacketParser.parse(content);
      return CdgPacketExplainer.explainPackets(packets);
    } catch (error) {
      const message = error instanceof Error ? error.message
        : typeof error === "string" ? error
        : String(error);
      throw new FlowExecutionError(`Explain flow failed: ${message}`);
    }
  }
}
