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
import * as fs from 'fs';

export function scheduleFontEvents(events: FontEvent[], opts: ScheduleOptions, reservedStart = 0) {
  const pps = opts.pps || 75;
  const totalPacks = Math.max(1, Math.ceil((opts.durationSeconds || 1) * pps));
  const packetSlots: CDGPacket[] = new Array(totalPacks).fill(null).map(() => makeEmptyPacket());

  const vram = new VRAM();
  const comp = new Compositor();

  // Helper to place a packet at an index if empty; if not empty, find next empty within small window
  // Place a packet at or just after `index`. Returns [placedIndex, overwrittenFlag]
  function placePacketAt(index: number, pkt: CDGPacket): [number, boolean] {
    // Coerce index to integer and clamp
    let pos = Number.isFinite(index) ? Math.floor(index) : 0;
    if (pos < 0) pos = 0;
    if (pos >= packetSlots.length) return [-1, true];

    // Check the desired slot first
    const isEmpty = (i: number) => packetSlots[i] && packetSlots[i].every((b) => b === 0);
    if (isEmpty(pos)) { packetSlots[pos] = pkt; return [pos, false]; }

    // Search outward within a small radius (prefer nearby empty slots). This checks
    // positions pos+1, pos-1, pos+2, pos-2, ... up to radius.
    const radius = 6;
    for (let d = 1; d <= radius; d++) {
      const forward = pos + d;
      if (forward < packetSlots.length && isEmpty(forward)) { packetSlots[forward] = pkt; return [forward, false]; }
      const back = pos - d;
      if (back >= 0 && isEmpty(back)) { packetSlots[back] = pkt; return [back, false]; }
    }

    // No empty nearby slots: overwrite the original position
    const wasEmpty = packetSlots[pos] ? packetSlots[pos].every((b) => b === 0) : true;
    packetSlots[pos] = pkt;
    return [pos, !wasEmpty];
  }

  // Sort events by startPack
  events.sort((a, b) => a.startPack - b.startPack);

  let _debugLogCount = 0
  let _debugEventTrace = 0
  // Track per-startPack offsets so events with identical startPack are serialized
  const startPackOffsets = new Map<number, number>();

  for (const ev of events) {
    if (_debugEventTrace < 20) {
      console.log('schedule event debug:', ev.blockX, ev.blockY, 'startPack=', ev.startPack, 'durationPacks=', ev.durationPacks, 'reservedStart=', reservedStart)
      _debugEventTrace++
    }
    // Write the fontblock using existing encoder logic; encoder updates VRAM directly.
  const packets = writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
    if (packets.length === 0) continue;
    if (_debugLogCount < 10) {
      console.log('scheduler: event', ev.blockX, ev.blockY, 'startPack', ev.startPack, 'produced', packets.length)
      _debugLogCount++
    }


    // Spread packets proportionally across the available allocated window for the event.
    // Compute positions as: placedIdxBase + floor(i * allocated / packets.length)
  const allocated = Math.max(1, ev.durationPacks || 1);
  // If many events share the same startPack, serialize them by adding an offset
  const priorOffset = startPackOffsets.get(ev.startPack) || 0;
  const placedIdxBase = reservedStart + ev.startPack + priorOffset;
    const placedIndices: number[] = [];
    for (let i = 0; i < packets.length; i++) {
      const pkt = packets[i];
      // distribute evenly across [placedIdxBase .. placedIdxBase + allocated - 1]
  const rel = Math.floor((i * allocated) / packets.length);
  let pos = placedIdxBase + rel;
      if (pos < 0) pos = 0;
      if (pos >= packetSlots.length) pos = packetSlots.length - 1;
      if (_debugLogCount <= 10) {
        console.log(`scheduler debug: placedIdxBase=${placedIdxBase}, allocated=${allocated}, i=${i}, rel=${rel}, pos=${pos}`)
      }
  const [placedIdx, overwritten] = placePacketAt(pos, pkt);
      placedIndices.push(placedIdx);
      if (_debugLogCount <= 10) {
        console.log(`scheduler: placed packet for block (${ev.blockX},${ev.blockY}) at index ${placedIdx}${overwritten ? ' (overwritten)' : ''}`);
      }
    }
    // optional: expose placedIndices via event for further debugging
    ;(ev as any).__placedIndices = placedIndices
    // Advance the per-startPack offset so subsequent events at the same startPack don't collide
    startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + Math.max(1, packets.length));
  }

  // Build scheduling stats/histogram for debugging
  try {
    const nonEmptyIndices: number[] = [];
    for (let i = 0; i < packetSlots.length; i++) {
      const pkt = packetSlots[i];
      if (!pkt.every((b) => b === 0)) nonEmptyIndices.push(i);
    }
    const firstNonEmpty = nonEmptyIndices.length ? nonEmptyIndices[0] : -1;
    const lastNonEmpty = nonEmptyIndices.length ? nonEmptyIndices[nonEmptyIndices.length - 1] : -1;
    const totalNonEmpty = nonEmptyIndices.length;
    const occupancy = Math.round((totalNonEmpty / packetSlots.length) * 10000) / 100; // percent with 2 decimals

    const binSize = 75; // 1-second bins at 75 pps
    const binCount = Math.max(1, Math.ceil(packetSlots.length / binSize));
    const bins: number[] = new Array(binCount).fill(0);
    for (const idx of nonEmptyIndices) {
      const b = Math.floor(idx / binSize);
      bins[b]++;
    }

    const stats = {
      totalPacks,
      totalNonEmpty,
      firstNonEmpty,
      lastNonEmpty,
      occupancyPercent: occupancy,
      binSize,
      bins,
    };
    const outPath = './tmp/scheduler_stats.json';
    try { fs.mkdirSync('./tmp', { recursive: true }); } catch (e) { /* ignore */ }
    fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
    console.log(`scheduler: wrote stats to ${outPath} — non-empty ${totalNonEmpty}/${totalPacks} (${occupancy}%) first=${firstNonEmpty} last=${lastNonEmpty}`);
  } catch (e) {
    console.warn('scheduler: failed to write stats', e);
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
