import { VRAM, makeEmptyPacket, writePacketsToFile } from './encoder';
import type { CDGPacket } from './encoder';
import Compositor from './compositor';

export interface FontEvent {
  blockX: number;
  blockY: number;
  pixels: number[][]; // 12 rows x 6 cols
  startPack: number; // pack index to start
  durationPacks: number; // how many packs available to spread writes across
  xorOnly?: boolean; // if true, treat as XOR-only highlight
}

export interface ScheduleOptions {
  durationSeconds: number;
  pps?: number;
}

// Minimal scheduler: allocate packetSlots = duration * pps and place packets
// For each FontEvent, call an encoder-like writer and place returned packets spread across duration.
import { writeFontBlock, generateMemoryPresetPackets, generatePaletteLoadPackets, generateBorderPacket } from './encoder';

export function scheduleFontEvents(events: FontEvent[], opts: ScheduleOptions, reservedStart = 0) {
  const pps = opts.pps || 75;
  const totalPacks = Math.max(1, Math.ceil((opts.durationSeconds || 1) * pps));
  const packetSlots: CDGPacket[] = new Array(totalPacks).fill(null).map(() => makeEmptyPacket());

  const vram = new VRAM();
  const comp = new Compositor();

  // Helper to place a packet at an index if empty; if not empty, find next empty within small window
  function placePacketAt(index: number, pkt: CDGPacket) {
    for (let i = index; i < Math.min(index + 8, packetSlots.length); i++) {
      const slot = packetSlots[i];
      const empty = slot.every((b) => b === 0);
      if (empty) { packetSlots[i] = pkt; return i; }
    }
    // fallback: place at index (overwrite)
    packetSlots[index] = pkt;
    return index;
  }

  // Sort events by startPack
  events.sort((a, b) => a.startPack - b.startPack);

  for (const ev of events) {
    // Write the fontblock using existing encoder logic; encoder updates VRAM directly.
  const packets = writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
    if (packets.length === 0) continue;

    // spread packets across event.durationPacks; if zero, write sequentially starting at startPack
    const allocated = Math.max(1, ev.durationPacks || 1);
    const step = Math.max(1, Math.floor(allocated / packets.length));
    const placedIdxBase = reservedStart + ev.startPack;
    for (let i = 0; i < packets.length; i++) {
      const pkt = packets[i];
      const pos = Math.min(packetSlots.length - 1, placedIdxBase + i * step);
      placePacketAt(pos, pkt);
    }
  }

  return {
    packetSlots,
    totalPacks,
  };
}

export function scheduleAndWriteDemo(outPath: string, durationSeconds = 4) {
  const demoPixels = (() => {
    const out: number[][] = [];
    for (let y = 0; y < 12; y++) {
      const row: number[] = [];
      for (let x = 0; x < 6; x++) {
        row.push((y < 4) ? 1 : (y < 8) ? 2 : 0);
      }
      out.push(row);
    }
    return out;
  })();

  const events = [
    {
      blockX: 4,
      blockY: 4,
      pixels: demoPixels,
      startPack: 0,
      durationPacks: Math.ceil(durationSeconds * 75),
    },
  ];

  // Build initial packets in the order CDGMagic uses: palette (LO,HI) -> border -> memory presets
  const palettePkts = generatePaletteLoadPackets();
  const borderPkts = generateBorderPacket(0);
  // Use memory preset index 1 (non-zero) so background isn't the default blue in some players
  const memoryPkts = generateMemoryPresetPackets(1);
  const initPkts = [...palettePkts, ...borderPkts, ...memoryPkts];

  const { packetSlots } = scheduleFontEvents(events, {
    durationSeconds,
    pps: 75,
  }, initPkts.length);

  // Place initial packets into the reserved start slots
  for (let i = 0; i < initPkts.length && i < packetSlots.length; i++) {
    packetSlots[i] = initPkts[i];
  }

  // Ensure last slot is non-empty: copy last non-empty packet into final slot if needed
  const lastIndex = packetSlots.length - 1;
  const lastNonEmpty = (() => {
    for (let i = packetSlots.length - 1; i >= 0; i--) {
      if (!packetSlots[i].every((b) => b === 0)) return i;
    }
    return -1;
  })();
  // Also ensure a palette packet exists near the end (helps players that re-evaluate palette late)
  const preferredPaletteSlot = Math.max(0, lastIndex - 2);
  if (palettePkts.length > 0) {
    // find an empty slot near preferredPaletteSlot to place the palette
    let placed = false;
    for (let i = preferredPaletteSlot; i >= Math.max(0, preferredPaletteSlot - 4); i--) {
      if (packetSlots[i].every((b) => b === 0)) { packetSlots[i] = palettePkts[palettePkts.length - 1]; placed = true; break; }
    }
    if (!placed) {
      // try forward from preferred slot
      for (let i = preferredPaletteSlot; i <= Math.min(lastIndex, preferredPaletteSlot + 4); i++) {
        if (packetSlots[i].every((b) => b === 0)) { packetSlots[i] = palettePkts[palettePkts.length - 1]; placed = true; break; }
      }
    }
  }

  if (lastNonEmpty === -1) {
    // No non-empty found, place a palette packet at the end
    packetSlots[lastIndex] = palettePkts[palettePkts.length - 1] || makeEmptyPacket();
  } else if (lastNonEmpty !== lastIndex) {
    packetSlots[lastIndex] = packetSlots[lastNonEmpty];
  }

  // write to file
  writePacketsToFile(outPath, packetSlots);
  return {
    outPath,
    count: packetSlots.length,
  };
}
