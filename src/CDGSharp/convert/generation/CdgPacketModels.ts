/*
 * CdgPacketModels module features.
 * Contains implementation for cdg packet models.
 */

import type { KaraokePlan      } from "@/CDGSharp/convert/planning/KaraokeCommandModels";
import type { CdgSubCodePacket } from "@/CDGSharp/cdg/CdgModels";

export type GeneratedCdgPacket = CdgSubCodePacket;

export interface GenerationInput {
  plan: KaraokePlan;
  style: {
    bgColor: string;
    textColor: string;
    sungTextColor: string;
    fontName: string;
    fontSize: number;
    fontStyle: "regular" | "bold";
    wrapGracePx: number;
    transitionMode?: "clear" | "trailing-wipe";
    trailingWipeDelayMs?: number;
    trailingWipeRegionReadyThreshold?: number;
  };
}
