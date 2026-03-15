/*
 * CdgPacketSerializer module features.
 * Contains implementation for cdg packet serializer.
 */

import type { GeneratedCdgPacket    } from "@/CDGSharp/convert/generation/CdgPacketModels";
import { CdgSubCodePacketSerializer } from "@/CDGSharp/cdg/CdgSubCodePacketSerializer";

export class CdgPacketSerializer {
  public serialize(packets: GeneratedCdgPacket[]): Uint8Array {
    return CdgSubCodePacketSerializer.serializePackets(packets);
  }
}
