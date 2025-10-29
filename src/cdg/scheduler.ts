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

export function scheduleFontEvents(events: FontEvent[], opts: ScheduleOptions, reservedStart = 0, initialPacketSlots?: CDGPacket[]) {
  const pps = opts.pps || 75;
  const totalPacks = Math.max(1, Math.ceil((opts.durationSeconds || 1) * pps));
  // If caller provided an initial packetSlots array (e.g. copied from a reference prelude),
  // use it as the working slots (clone safety: assume caller won't reuse the same array afterwards).
  const packetSlots: CDGPacket[] = initialPacketSlots && initialPacketSlots.length === totalPacks
    ? initialPacketSlots
    : new Array(totalPacks).fill(null).map(() => makeEmptyPacket());

  const vram = new VRAM();
  const comp = new Compositor();

  // Small helper to set a packet with a safety-assertion that we don't write
  // into the reserved prelude. Declared at outer scope so all placement
  // branches use the same protection.
  function setPacketSafely(i: number, p: CDGPacket) {
    if (i <= reservedStart) {
      console.error(`ASSERT: attempted to write into reserved prelude at index=${i} (reservedStart=${reservedStart})`)
      console.error(new Error().stack)
      throw new Error(`Attempted write into reserved prelude at index=${i}`)
    }
    packetSlots[i] = p
  }

  // Helper to place a packet at an index if empty; if not empty, find next empty within small window
  // Place a packet at or just after `index`. Returns [placedIndex, overwrittenFlag]
  function placePacketAt(index: number, pkt: CDGPacket, minIndex?: number, maxIndex?: number, allowOverwrite = false): [number, boolean] {
    // Coerce index to integer and clamp
    let pos = Number.isFinite(index) ? Math.floor(index) : 0;
    if (pos < 0) pos = 0;
    if (pos >= packetSlots.length) return [-1, true];

  // Check the desired slot first
  const isEmpty = (i: number) => packetSlots[i] && packetSlots[i].every((b) => b === 0);
  
  // If a targeted debug event is set, log probes
  const dbg = currentDebugEvent;
    // Determine search bounds and enforce reservedStart as a hard lower bound
    const startBound = (typeof minIndex === 'number') ? Math.max(0, Math.floor(minIndex)) : 0;
    const endBound = (typeof maxIndex === 'number') ? Math.min(packetSlots.length - 1, Math.floor(maxIndex)) : packetSlots.length - 1;
  // Treat the reserved prelude as strictly off-limits: require placements
  // to be strictly after `reservedStart` (i.e. > reservedStart). This
  // prevents the scheduler from allocating at the exact reserved boundary
  // which the reference intentionally left empty.
  const effectiveStartBound = Math.max(startBound, reservedStart + 1);

  // Never place before the effective start bound
  if (pos < effectiveStartBound) pos = effectiveStartBound;
    if (pos >= packetSlots.length) return [-1, true];
  if (isEmpty(pos)) { if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placing at desired pos=${pos} (empty)`); setPacketSafely(pos, pkt); return [pos, false]; }

    // Greedy alternating probe around `pos` within bounds: pos, pos+1, pos-1, pos+2, pos-2, ...
    // This tends to keep placements clustered near the desired index while reducing
    // destructive overwrites that occur when multiple events target the same slot.
    const probeStart = effectiveStartBound;
    const probeEnd = endBound;
    for (let step = 1; ; step++) {
      const forwardIdx = pos + step - 1;
      const backwardIdx = pos - step;
      let foundAny = false;
      if (forwardIdx <= probeEnd) {
        foundAny = true;
        if (dbg) console.log(`[TRACE] placePacketAt: probing forward idx=${forwardIdx} (empty=${isEmpty(forwardIdx)})`);
  if (isEmpty(forwardIdx)) { setPacketSafely(forwardIdx, pkt); if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placed at forwardIdx=${forwardIdx}`); return [forwardIdx, false]; }
      }
      if (backwardIdx >= probeStart) {
        foundAny = true;
        if (dbg) console.log(`[TRACE] placePacketAt: probing backward idx=${backwardIdx} (empty=${isEmpty(backwardIdx)})`);
  if (isEmpty(backwardIdx)) { setPacketSafely(backwardIdx, pkt); if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placed at backwardIdx=${backwardIdx}`); return [backwardIdx, false]; }
      }
      // If neither direction is still within bounds, stop probing
      if (!foundAny) break;
      // safety: if we've stepped beyond both bounds, break
      if (pos + step - 1 > probeEnd && pos - step < probeStart) break;
    }

    // Last resort: either fail (no placement) or overwrite if explicitly allowed.
    if (!allowOverwrite) {
      return [-1, false];
    }
    let writePos = pos;
    if (writePos < effectiveStartBound) writePos = effectiveStartBound;
    if (writePos >= packetSlots.length) return [-1, true];
    const wasEmpty = packetSlots[writePos] ? packetSlots[writePos].every((b) => b === 0) : true;
    if (dbg) console.log(`[TRACE] placePacketAt: overwriting at writePos=${writePos} (wasEmpty=${wasEmpty}) for target=${dbg.blockX},${dbg.blockY}@${dbg.startPack}`);
    setPacketSafely(writePos, pkt);
    return [writePos, !wasEmpty];
  }

  // Helper: search for an empty contiguous run of length `neededLen` starting
  // at or after `startSearch` up to `endSearch` (inclusive start, exclusive end).
  // Declared at function root level (not nested) to satisfy linters.
  function findEmptyRun(startSearch: number, endSearch: number, neededLen: number): number {
    const maxStart = Math.max(startSearch, Math.min(packetSlots.length - neededLen, endSearch - 1));
    const dbg = currentDebugEvent;
    if (dbg) console.log(`[TRACE] findEmptyRun: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} searching start=${startSearch}..maxStart=${maxStart} neededLen=${neededLen}`);
    for (let s = startSearch; s <= maxStart; s++) {
      let ok = true;
      for (let k = 0; k < neededLen; k++) {
        const idx = s + k;
        if (idx < 0 || idx >= packetSlots.length) { ok = false; break }
        const pkt = packetSlots[idx];
        if (!pkt.every((b) => b === 0)) { ok = false; break }
      }
      if (ok) { if (dbg) console.log(`[TRACE] findEmptyRun: found run at ${s} for target=${dbg.blockX},${dbg.blockY}@${dbg.startPack}`); return s; }
    }
    return -1;
  }

  // Sort events to reduce collisions:
  // - Prefer events that cover more pixels (higher placement weight) so
  //   contiguous/multi-packet writes get allocated early.
  // - Tie-break by earlier startPack so timeline locality is still respected.
  // Prefer chronological ordering (by startPack) to better match CDGMagic
  // output ordering. Heavier-first ordering was experimented with but
  // tended to move blocks earlier than the reference; use timeline order
  // as the default scheduling policy.
  events.sort((a, b) => a.startPack - b.startPack);

  let _debugLogCount = 0
  let _debugEventTrace = 0
  // Track per-startPack offsets so events with identical startPack are serialized
  const startPackOffsets = new Map<number, number>();

  // A small mechanism to enable targeted tracing for a specific problematic event.
  // Change these constants to match the event you want to trace. Keep default
  // values aligned with the current investigation (blockX=94, blockY=2, startPack=792).
  const TRACE_BLOCK_X = 94;
  const TRACE_BLOCK_Y = 2;
  const TRACE_START_PACK = 792;
  let currentDebugEvent: { blockX: number; blockY: number; startPack: number } | null = null;

  for (const ev of events) {
    if (_debugEventTrace < 20) {
      console.log('schedule event debug:', ev.blockX, ev.blockY, 'startPack=', ev.startPack, 'durationPacks=', ev.durationPacks, 'reservedStart=', reservedStart)
      _debugEventTrace++
    }
    // set debug flag when this is the interesting event
    if (ev.blockX === TRACE_BLOCK_X && ev.blockY === TRACE_BLOCK_Y && ev.startPack === TRACE_START_PACK) {
      currentDebugEvent = {
        blockX: ev.blockX,
        blockY: ev.blockY,
        startPack: ev.startPack,
      };
      console.log(`[TRACE] Starting detailed trace for event (${ev.blockX},${ev.blockY}) startPack=${ev.startPack}`);
    } else {
      currentDebugEvent = null;
    }
    // Write the fontblock using existing encoder logic; encoder updates VRAM directly.
    const packets = writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
    if (packets.length === 0) continue;
    if (_debugLogCount < 10) {
      console.log('scheduler: event', ev.blockX, ev.blockY, 'startPack', ev.startPack, 'produced', packets.length)
      _debugLogCount++
    }


    // Try to place the event's packets in a contiguous window to reduce
    // interleaving and overwrites. This makes multi-packet font blocks occupy
    // adjacent packet indices, which tends to better match CDGMagic-generated
    // neighborhoods.
    const allocatedRaw = Math.max(1, ev.durationPacks || 1);
    const priorOffset = startPackOffsets.get(ev.startPack) || 0;
    const placedIdxBase = reservedStart + ev.startPack + priorOffset;
    const remainingAfterBase = Math.max(0, packetSlots.length - placedIdxBase);
    const needed = packets.length;
    const placedIndices: number[] = [];


    // Bound the primary search window to a reasonable forward region so we don't
    // scan the entire timeline for large files. Use remainingAfterBase as the
    // natural upper bound, but cap search width to e.g. 4096 slots for speed.
  // Increase search cap: allow scanning the full remaining timeline rather
  // than truncating to a small window. This is slower but reduces forced
  // overwrites by finding farther empty contiguous runs. For offline
  // generation this is acceptable; we can tune later if performance suffers.
  const searchCap = packetSlots.length;
    const searchEnd = Math.min(packetSlots.length, placedIdxBase + Math.min(remainingAfterBase, searchCap));

  const contiguousStart = findEmptyRun(placedIdxBase, searchEnd, needed);
    // If not found forward, do NOT search backward into the reserved prelude.
    // Backward searching was causing late events to occupy the early
    // neighborhood (immediately after reservedStart). Prefer forward
    // placement or other fallbacks to avoid touching the reserved region.
    if (contiguousStart === -1) {
      // intentionally left blank (no backward search)
    }

    if (contiguousStart !== -1) {
      // Place contiguously
      if (_debugLogCount <= 10) console.log(`scheduler: placing ${needed} packets contiguously for block (${ev.blockX},${ev.blockY}) at start ${contiguousStart}`)
      for (let i = 0; i < packets.length; i++) {
        const pos = contiguousStart + i;
        const pkt = packets[i];
        // Guard: never write into reserved prelude (treat reservedStart as exclusive)
        if (pos <= reservedStart) {
          // Defensive: skip writing into reserved region. This should not occur
          // because findEmptyRun never returns starts < reservedStart, but keep
          // the guard to be safe.
          continue;
        }
  setPacketSafely(pos, pkt);
        placedIndices.push(pos);
      }
    } else {
      // Fallback: distribute (non-contiguous) across a window sized to the
      // max of allocatedRaw and needed (but capped by remaining slots). This is
      // similar to the prior behavior but with a stronger attempt at contiguous
      // placement above.
      const allocated = Math.max(allocatedRaw, Math.min(remainingAfterBase, needed));
      // We'll attempt per-packet placement without overwriting. If any packet
      // fails to place locally, escalate to searching for a farther contiguous
      // run for the whole block. Only if that fails do we allow overwrites.
      let failedPlacement = false;
      for (let i = 0; i < packets.length; i++) {
        const pkt = packets[i];
        const rel = Math.floor((i * allocated) / packets.length);
        let pos = placedIdxBase + rel;
        if (pos < 0) pos = 0;
        if (pos >= packetSlots.length) pos = packetSlots.length - 1;
        if (_debugLogCount <= 10) {
          console.log(`scheduler debug: placedIdxBase=${placedIdxBase}, allocated=${allocated}, i=${i}, rel=${rel}, pos=${pos}`)
        }
        const [placedIdx, overwritten] = placePacketAt(pos, pkt, placedIdxBase, placedIdxBase + allocated - 1, /*allowOverwrite*/ false);
        if (placedIdx < 0) { failedPlacement = true; break; }
        placedIndices.push(placedIdx);
        if (_debugLogCount <= 10) {
          console.log(`scheduler: placed packet for block (${ev.blockX},${ev.blockY}) at index ${placedIdx}${overwritten ? ' (overwritten)' : ''}`);
        }
      }

      if (failedPlacement) {
        // Try to find any contiguous run in the timeline (>= reservedStart) that fits the whole block
        // Ensure any global search starts strictly after the reserved prelude.
        const globalStart = Math.max(reservedStart + 1, placedIdxBase + allocated);
        // First try to find a contiguous run after the event's natural base.
        // Do NOT fall back to searching from `reservedStart` because that can
        // allow allocation into the reserved prelude. Only allow forward
        // global placement (>= globalStart).
        const globalFind = findEmptyRun(globalStart, packetSlots.length, needed);
        if (globalFind !== -1) {
          if (_debugLogCount <= 10) console.log(`scheduler: failed local placement; placing ${needed} packets contiguously for block (${ev.blockX},${ev.blockY}) at global start ${globalFind}`)
          for (let i = 0; i < packets.length; i++) {
            const pos = globalFind + i;
            const pkt = packets[i];
            setPacketSafely(pos, pkt);
            placedIndices.push(pos);
          }
        } else {
          // As a last resort, allow overwrites but only beyond reservedStart; log this as destructive
          if (_debugLogCount <= 10) console.log(`scheduler: WARNING: no empty local or global contiguous window found for block (${ev.blockX},${ev.blockY}); allowing overwrites`)
            for (let i = 0; i < packets.length; i++) {
            const pkt = packets[i];
            const rel = Math.floor((i * allocated) / packets.length);
            let pos = placedIdxBase + rel;
            // Never allow placement at or before reservedStart
            if (pos <= reservedStart) pos = reservedStart + 1;
            if (pos >= packetSlots.length) pos = packetSlots.length - 1;
            const [placedIdx, overwritten] = placePacketAt(pos, pkt, reservedStart, packetSlots.length - 1, /*allowOverwrite*/ true);
            placedIndices.push(placedIdx);
            if (_debugLogCount <= 10) console.log(`scheduler: forced-overwrite placement for block (${ev.blockX},${ev.blockY}) at index ${placedIdx}${overwritten ? ' (overwritten)' : ''}`);
          }
        }
      }
    }
    // optional: expose placedIndices via event for further debugging
    ;(ev as any).__placedIndices = placedIndices
  // Advance the per-startPack offset so subsequent events at the same startPack don't collide.
  // Use a small increment proportional to the event's packet count so events that emit
  // many packets get extra serialization space. Cap the increment to avoid runaway pushes.
  // Use the allocated window size (if available) to advance the offset so that
  // subsequent events at the same startPack land in a different window. allocated
  // was computed above; fall back to packets.length if not present.
  // Advance the per-startPack offset by (at least) the number of packets we
  // emitted so subsequent events with the same startPack are less likely to
  // collide. Cap to a reasonable value to avoid runaway offsets.
  const offsetInc = Math.max(1, Math.min(1024, packets.length));
  startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + offsetInc);
  }

  // Build scheduling stats/histogram for debugging
  try {
    // Dump per-event placement info for deeper diagnostics (event -> placed indices)
    try {
      const perEvent: any[] = [];
      for (const ev of events) {
        perEvent.push({
          blockX: ev.blockX,
          blockY: ev.blockY,
          startPack: ev.startPack,
          durationPacks: ev.durationPacks,
          placed: (ev as any).__placedIndices || [],
        });
      }
      try { fs.mkdirSync('./tmp', { recursive: true }); } catch (e) { /* ignore */ }
      fs.writeFileSync('./tmp/scheduler_event_placements.json', JSON.stringify({ events: perEvent }, null, 2));
      console.log('scheduler: wrote per-event placements to ./tmp/scheduler_event_placements.json');
    } catch (e) {
      console.warn('scheduler: failed to write per-event placements', e);
    }
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
