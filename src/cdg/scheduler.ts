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
  // When true the scheduler is allowed to overwrite slots that were
  // prefilled by the caller (e.g. a synthesized prelude). This is
  // intentionally opt-in because overwriting a caller-provided prelude
  // can be destructive; only enable when you explicitly want the
  // scheduler to take ownership of prelude indices.
  allowOverwritePrefilled?: boolean;
  // How many seconds forward we allow destructive overwrites when forced.
  overwriteLimitSeconds?: number;
  // How many seconds of slack to allow beyond the max intended placement
  // before refusing placements into the tail.
  placementSlackSeconds?: number;
  // Diagnostics and tracing options. When present and enabled the scheduler
  // will write per-event placement and stats files to the provided outDir.
  diagnostics?: {
    enabled?: boolean;
    outDir?: string; // default: './tmp'
    writeEventPlacements?: boolean;
    writeStats?: boolean;
    // Optional targeted trace event to enable verbose tracing for a specific event
    traceEvent?: { blockX: number; blockY: number; startPack: number } | null;
  };
}

// Minimal scheduler: allocate packetSlots = duration * pps and place packets
// For each FontEvent, call an encoder-like writer and place returned packets spread across duration.
import { writeFontBlock, generateMemoryPresetPackets, generatePaletteLoadPackets, generateBorderPacket } from './encoder';
import { CDG_PPS } from './constants';
import * as fs from 'fs';

export function scheduleFontEvents(events: FontEvent[], opts: ScheduleOptions, reservedStart = 0, initialPacketSlots?: CDGPacket[]) {
  const pps = (opts && typeof opts.pps === 'number') ? opts.pps : CDG_PPS;
  const totalPacks = Math.max(1, Math.ceil((opts.durationSeconds || 1) * pps));
  // If caller provided an initial packetSlots array (e.g. copied from a reference prelude),
  // use it as the working slots (clone safety: assume caller won't reuse the same array afterwards).
  const packetSlots: CDGPacket[] = initialPacketSlots && initialPacketSlots.length === totalPacks
    ? initialPacketSlots
    : new Array(totalPacks).fill(null).map(() => makeEmptyPacket());

  // Record which slots were prefilled by the caller (e.g. a synthesized or
  // copied prelude). Prefilled slots should be treated as immutable: the
  // scheduler will not overwrite them. If the caller did not provide an
  // initialPacketSlots array, this mask will be all-false and behavior is
  // unchanged.
  const initialPrefilledMask: boolean[] = packetSlots.map((pkt) => !(pkt.every((b) => b === 0)));

  const vram = new VRAM();
  const comp = new Compositor();

  // Compute a conservative placement cap: do not allow scheduler to place
  // events arbitrarily far past the last intended event. This prevents
  // long-running clips or collision-driven spill from writing into the
  // far tail of an oversized output (e.g. when durationSeconds was set
  // large for debugging). We allow a generous slack to accommodate
  // natural placement spreads; increase if many forced-overwrites occur.
  const maxIntendedPlacement = events.reduce((m, ev) => Math.max(m, (reservedStart || 0) + (ev.startPack || 0) + (ev.durationPacks || 0)), 0);
  // Increase slack to a configurable default (10 seconds) to give the scheduler
  // more headroom before it must start doing destructive overwrites in the file tail.
  const placementSlackSeconds = (opts as any).placementSlackSeconds ?? 10;
  const placementSlack = pps * (placementSlackSeconds || 0);
  const placementCap = Math.min(packetSlots.length - 1, Math.max(0, maxIntendedPlacement + placementSlack));

  // Overwrite safety: don't allow destructive overwrites arbitrarily far
  // forward. When we fall back to forced-overwrite we will cap how far
  // forward we may push events. This is configurable via ScheduleOptions.
  const overwriteLimitSeconds = (opts as any).overwriteLimitSeconds ?? 5; // default 5s (chosen baseline)
  const overwriteLimit = Math.max(1, Math.floor(overwriteLimitSeconds * pps));

  const diagnostics = (opts as any).diagnostics || {};
  const diagEnabled = !!diagnostics.enabled;
  const diagOutDir = diagnostics.outDir || './tmp';
  const diagWriteEventPlacements = diagnostics.writeEventPlacements !== false; // default true
  const diagWriteStats = diagnostics.writeStats !== false; // default true
  const diagTraceEvent = diagnostics.traceEvent || null;

  // Small helper to set a packet with a safety-assertion that we don't write
  // into the reserved prelude. Declared at outer scope so all placement
  // branches use the same protection.
  function setPacketSafely(i: number, p: CDGPacket): boolean {
    // Returns true if the write was performed, false if it was dropped.
    if (i <= reservedStart) {
      console.error(`ASSERT: attempted to write into reserved prelude at index=${i} (reservedStart=${reservedStart})`)
      console.error(new Error().stack)
      // Treat prelude writes as fatal because they indicate a serious logic bug
      throw new Error(`Attempted write into reserved prelude at index=${i}`)
    }
    if (i > placementCap) {
      // Defensive: never write beyond the conservative placement cap.
      if (diagEnabled) console.warn(`Dropping write at index=${i} beyond placementCap=${placementCap}`)
      return false
    }
    // Respect caller-provided prefilled slots. By default we refuse to
    // overwrite them; when opts.allowOverwritePrefilled is true we permit
    // the write (still subject to placementCap). This lets callers opt
    // into hybrid behavior where an aggressive synthesized prelude can be
    // updated by the scheduler.
    if (initialPrefilledMask[i] && !(opts as any).allowOverwritePrefilled) {
      if (diagEnabled) console.warn(`Dropping write at index=${i} because slot was prefilled by caller and is immutable`)
      return false
    }
    packetSlots[i] = p
    return true
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
  if (isEmpty(pos)) {
    if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placing at desired pos=${pos} (empty)`);
    const ok = setPacketSafely(pos, pkt);
    if (!ok) return [-1, false];
    return [pos, false];
  }

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
      if (isEmpty(forwardIdx)) {
        const ok = setPacketSafely(forwardIdx, pkt);
        if (!ok) { /* dropped due to cap */ } else { if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placed at forwardIdx=${forwardIdx}`); return [forwardIdx, false]; }
      }
      }
      if (backwardIdx >= probeStart) {
        foundAny = true;
        if (dbg) console.log(`[TRACE] placePacketAt: probing backward idx=${backwardIdx} (empty=${isEmpty(backwardIdx)})`);
      if (isEmpty(backwardIdx)) {
        const ok = setPacketSafely(backwardIdx, pkt);
        if (!ok) { /* dropped due to cap */ } else { if (dbg) console.log(`[TRACE] placePacketAt: target=${dbg.blockX},${dbg.blockY}@${dbg.startPack} placed at backwardIdx=${backwardIdx}`); return [backwardIdx, false]; }
      }
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

    // When overwriting is permitted, prefer to find a writable slot that
    // was NOT prefilled by the caller. We will probe forward from the
    // desired position up to the endBound (and backward within bounds) to
    // locate a candidate. If none exists, we must fail rather than
    // overwriting caller-provided prefilled slots.
    let writePos = pos;
    if (writePos < effectiveStartBound) writePos = effectiveStartBound;
    if (writePos >= packetSlots.length) return [-1, true];

    // Try a bounded probe for a non-prefilled slot to overwrite.
    const candidateEnd = endBound;
    const candidateStart = effectiveStartBound;
    let chosen = -1;
    // Check the initial writePos first
    for (let step = 0; step <= Math.max(candidateEnd - writePos, writePos - candidateStart); step++) {
      const f = writePos + step;
      const b = writePos - step;
      if (f <= candidateEnd) {
        if (!initialPrefilledMask[f]) { chosen = f; break }
      }
      if (b >= candidateStart) {
        if (!initialPrefilledMask[b]) { chosen = b; break }
      }
    }
    if (chosen === -1) {
      // No non-prefilled slot found within bounds. If the caller explicitly
      // allowed overwriting prefilled slots, pick the nearest candidate even
      // if it was prefilled (we'll still respect placementCap / effective
      // bounds). Otherwise refuse to overwrite.
      if ((opts as any).allowOverwritePrefilled) {
        // Find nearest candidate position (forward/backward) within bounds
        for (let step = 0; step <= Math.max(candidateEnd - writePos, writePos - candidateStart); step++) {
          const f = writePos + step;
          const b = writePos - step;
          if (f <= candidateEnd) { chosen = f; break }
          if (b >= candidateStart) { chosen = b; break }
        }
      }
      if (chosen === -1) {
        if (dbg) console.log(`[TRACE] placePacketAt: no non-prefilled overwrite candidate found for target=${dbg.blockX},${dbg.blockY}@${dbg.startPack}`);
        return [-1, false];
      }
    }

    const wasEmpty = packetSlots[chosen] ? packetSlots[chosen].every((b) => b === 0) : true;
    if (dbg) console.log(`[TRACE] placePacketAt: overwriting at writePos=${chosen} (wasEmpty=${wasEmpty}) for target=${dbg.blockX},${dbg.blockY}@${dbg.startPack}`);
    const ok2 = setPacketSafely(chosen, pkt);
    if (!ok2) return [-1, true];
    return [chosen, !wasEmpty];
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
  // output ordering. However, when multiple events share the same startPack
  // prefer the longer (multi-packet) events first so they acquire contiguous
  // windows before many small events serialize the neighborhood. This is a
  // conservative tie-breaker (only affects events with identical startPack)
  // intended to reduce spills/overwrites for long text clips.
  events.sort((a, b) => {
    const byStart = (a.startPack || 0) - (b.startPack || 0);
    if (byStart !== 0) return byStart;
    return (b.durationPacks || 0) - (a.durationPacks || 0);
  });

  // Group events by startPack and precompute packet arrays so we can
  // attempt to reserve a contiguous region for all events that share the
  // same startPack. This reduces fragmentation when many small tiles are
  // emitted for the same clip/time and increases the chance they are
  // placed near their intended neighborhood.
  const eventsByStart = new Map<number, FontEvent[]>();
  for (const ev of events) {
    const sp = ev.startPack || 0;
    if (!eventsByStart.has(sp)) eventsByStart.set(sp, []);
    eventsByStart.get(sp)!.push(ev);
  }
  // Precompute per-event packet arrays into a private slot so we don't need
  // to regenerate packets during placement. Use fresh VRAM instances to
  // avoid mutating the scheduler's main VRAM when probing.
  for (const ev of events) {
    try {
      const tmpV = new VRAM();
      // writeFontBlock may update VRAM; here we only need the packet bytes
      // for placement sizing and copying later.
      (ev as any).__probePackets = writeFontBlock(tmpV, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
    } catch (e) {
      (ev as any).__probePackets = [];
    }
  }

  let _debugLogCount = 0
  let _debugEventTrace = 0
  let _expiredDroppedCount = 0
  // Track per-startPack offsets so events with identical startPack are serialized
  const startPackOffsets = new Map<number, number>();
  const _handledEvents = new Set<FontEvent>();

  // Tracing: optionally enable a targeted event trace via ScheduleOptions.diagnostics.traceEvent
  let currentDebugEvent: { blockX: number; blockY: number; startPack: number } | null = null;
  if (diagTraceEvent && typeof diagTraceEvent === 'object') {
    currentDebugEvent = {
      blockX: diagTraceEvent.blockX,
      blockY: diagTraceEvent.blockY,
      startPack: diagTraceEvent.startPack,
    };
  }

  for (const ev of events) {
    if (_handledEvents.has(ev)) continue;
    if (_debugEventTrace < 20 && diagEnabled) {
      console.log('schedule event debug:', ev.blockX, ev.blockY, 'startPack=', ev.startPack, 'durationPacks=', ev.durationPacks, 'reservedStart=', reservedStart)
      _debugEventTrace++
    }
    // set debug flag when this is the interesting event
    // If diagnostics.traceEvent wasn't set globally, allow per-event enabling
    // by checking an optional __trace flag on the event (debug harness may set this).
    if (!currentDebugEvent && (ev as any).__trace) {
      const t = (ev as any).__trace;
      currentDebugEvent = {
        blockX: t.blockX,
        blockY: t.blockY,
        startPack: t.startPack,
      };
      if (diagEnabled) console.log(`[TRACE] Starting detailed trace for event (${currentDebugEvent.blockX},${currentDebugEvent.blockY}) startPack=${currentDebugEvent.startPack}`);
    }
    // Write the fontblock using existing encoder logic; encoder updates VRAM directly.
  // If a probe packet array was computed earlier, reuse it. Otherwise
  // generate packets now (this will update VRAM as before).
  const probe = (ev as any).__probePackets as Uint8Array[] | undefined;
  const packets: Uint8Array[] = probe && probe.length ? probe : writeFontBlock(vram, ev.blockX, ev.blockY, ev.pixels, 0, comp as any);
    if (packets.length === 0) continue;
    // CRITICAL: Update VRAM after successful write so subsequent blocks
    // can use tile comparison optimization. This is what fixes the file size
    // from 11,126 packets to ~5,500.
    vram.writeBlock(ev.blockX, ev.blockY, ev.pixels);
    if (_debugLogCount < 10 && diagEnabled) {
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

    // Group-placement optimization: if multiple events share the same startPack
    // and we are the first of that group, attempt to reserve a single contiguous
    // region large enough for the entire group's packets and place them there
    // sequentially. This reduces fragmentation and avoids pushing tiles into
    // the far tail.
    const group = eventsByStart.get(ev.startPack || 0) || [];
    if (group.length > 1 && group[0] === ev) {
      // compute total needed
      let totalNeeded = 0;
      const groupPackets: Uint8Array[][] = [];
      for (const gev of group) {
        const gpk = (gev as any).__probePackets as Uint8Array[] | undefined;
        // CRITICAL FIX: Use persistent vram instead of new VRAM()
        // This ensures group packets see the real VRAM state
        const use = gpk && gpk.length ? gpk : writeFontBlock(vram, gev.blockX, gev.blockY, gev.pixels, 0, comp as any);
        groupPackets.push(use);
        totalNeeded += use.length || 1;
      }
      // Attempt to find a contiguous run for the whole group starting near placedIdxBase
      const groupPlacedIdxBase = reservedStart + ev.startPack + (startPackOffsets.get(ev.startPack) || 0);
        const groupSearchEnd = Math.min(packetSlots.length, groupPlacedIdxBase + Math.min(Math.max(4096, Math.floor(pps * 8)), placementCap - groupPlacedIdxBase + 1));
      const groupFind = findEmptyRun(groupPlacedIdxBase, groupSearchEnd, totalNeeded);
      if (groupFind !== -1) {
        // Place each event sequentially within the found region
        let offset = 0;
        for (let gi = 0; gi < group.length; gi++) {
          const gev = group[gi];
          const gpkts = groupPackets[gi];
          const placedForThis: number[] = [];
          for (let k = 0; k < gpkts.length; k++) {
            const pos = groupFind + offset + k;
            const pkt = gpkts[k];
            if (pos <= reservedStart) continue;
            setPacketSafely(pos, pkt);
            placedForThis.push(pos);
          }
          ;(gev as any).__placedIndices = placedForThis;
          _handledEvents.add(gev);
          // Update VRAM after placing this group event
          vram.writeBlock(gev.blockX, gev.blockY, gev.pixels);
          offset += Math.max(1, gpkts.length);
        }
        // Advance the startPack offset by totalNeeded so subsequent groups don't collide
        startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + Math.max(1, totalNeeded));
        continue;
      }
      // if group reservation failed, fall through to per-event placement below
    }

    // If the event's natural placement base is already beyond the conservative
    // placement cap, skip scheduling this event entirely rather than forcing
    // destructive writes into the file tail. This avoids producing visible
    // noise after the last intended event (e.g. after an END banner).
    // Additionally, if the event's allowed window has already expired
    // (i.e. its start+duration window ends before our placement base), treat
    // it as expired and drop it early to avoid pointless tail writes.
    const eventExpiryIdx = (reservedStart || 0) + (ev.startPack || 0) + (ev.durationPacks || 0) - 1;
    if (placedIdxBase > eventExpiryIdx) {
      if (_debugLogCount <= 10 && diagEnabled) console.log(`scheduler: EXPIRE event (${ev.blockX},${ev.blockY}) startPack=${ev.startPack} placedIdxBase=${placedIdxBase} > expiryIdx=${eventExpiryIdx}`)
      ;(ev as any).__placedIndices = []
      _expiredDroppedCount++
      // Advance the per-startPack offset to avoid repeatedly attempting the same event
      startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + Math.max(1, packets.length));
      continue;
    }

    if (placedIdxBase > placementCap) {
      if (_debugLogCount <= 10 && diagEnabled) console.log(`scheduler: SKIP event (${ev.blockX},${ev.blockY}) startPack=${ev.startPack} placedIdxBase=${placedIdxBase} > placementCap=${placementCap}`)
      ;(ev as any).__placedIndices = []
      // Advance the per-startPack offset to avoid repeatedly attempting the same event
      startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + Math.max(1, packets.length));
      continue;
    }


    // Bound the primary search window to a reasonable forward region so we don't
    // scan the entire timeline for large files. Use remainingAfterBase as the
    // natural upper bound, but cap search width to e.g. 4096 slots for speed.
  // Limit scanning for contiguous runs to a reasonable forward window so
  // we don't place events arbitrarily far into the tail of the file. Use
  // placementCap as an absolute upper bound and also cap by a moderate
  // search window to preserve locality.
  const maxForwardScan = Math.min(packetSlots.length, Math.max(4096, Math.floor(pps * 8))); // at least ~8s or 4096 slots
  const searchEnd = Math.min(packetSlots.length, placedIdxBase + Math.min(remainingAfterBase, maxForwardScan, placementCap - placedIdxBase + 1));

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
  // Only try global forward placement up to the placement cap.
  const globalStart = Math.max(reservedStart + 1, placedIdxBase + allocated);
  const globalEnd = placementCap;
        // First try to find a contiguous run after the event's natural base.
        // Do NOT fall back to searching from `reservedStart` because that can
        // allow allocation into the reserved prelude. Only allow forward
  // global placement (>= globalStart) but constrained to placementCap.
  const globalFind = findEmptyRun(globalStart, Math.min(packetSlots.length, globalEnd + 1), needed);
          if (globalFind !== -1) {
          if (_debugLogCount <= 10) console.log(`scheduler: failed local placement; placing ${needed} packets contiguously for block (${ev.blockX},${ev.blockY}) at global start ${globalFind}`)
          for (let i = 0; i < packets.length; i++) {
            const pos = globalFind + i;
            const pkt = packets[i];
            setPacketSafely(pos, pkt);
            placedIndices.push(pos);
          }
          } else {
          // As a last resort, try one more non-destructive strategy: search
          // backward from the event base for an earlier empty contiguous run
          // (but strictly after reservedStart). This prefers shifting earlier
          // into unused slots instead of overwriting the far tail, which
          // often produces visible noise after the END banner. Only if this
          // earlier search fails do we allow destructive overwrites within
          // the placementCap.
          const earlySearchStart = Math.max(reservedStart + 1, Math.floor(reservedStart + 1));
          const earlySearchEnd = Math.max(earlySearchStart, placedIdxBase - 1);
          const earlyFind = (earlySearchEnd > earlySearchStart) ? findEmptyRun(earlySearchStart, Math.min(packetSlots.length, earlySearchEnd + 1), needed) : -1;
          if (earlyFind !== -1) {
            if (_debugLogCount <= 10) console.log(`scheduler: failed local/global placement; using earlier contiguous window for block (${ev.blockX},${ev.blockY}) at start ${earlyFind}`)
            for (let i = 0; i < packets.length; i++) {
              const pos = earlyFind + i;
              const pkt = packets[i];
              setPacketSafely(pos, pkt);
              placedIndices.push(pos);
            }
          } else {
            // As a last resort, allow overwrites but only within a bounded
            // forward distance from the event's base. This prevents pushing
            // packets arbitrarily far into the tail; if even bounded
            // overwrite fails, mark the event expired and drop it.
            const overwriteCap = Math.min(placementCap, placedIdxBase + overwriteLimit);
            if (_debugLogCount <= 10) console.log(`scheduler: WARNING: no empty local/global contiguous window found for block (${ev.blockX},${ev.blockY}); attempting bounded overwrites up to ${overwriteCap}`)
            let anyOverwriteSuccess = false;
            for (let i = 0; i < packets.length; i++) {
              const pkt = packets[i];
              const rel = Math.floor((i * allocated) / packets.length);
              let pos = placedIdxBase + rel;
              // Never allow placement at or before reservedStart
              if (pos <= reservedStart) pos = reservedStart + 1;
              // Cap position to overwriteCap
              if (pos > overwriteCap) pos = overwriteCap;
              if (pos >= packetSlots.length) pos = packetSlots.length - 1;
              const [placedIdx, overwritten] = placePacketAt(pos, pkt, reservedStart + 1, overwriteCap, /*allowOverwrite*/ true);
              if (placedIdx >= 0) anyOverwriteSuccess = true;
              placedIndices.push(placedIdx);
              if (_debugLogCount <= 10) console.log(`scheduler: forced-overwrite placement for block (${ev.blockX},${ev.blockY}) at index ${placedIdx}${overwritten ? ' (overwritten)' : ''}`);
            }
            if (!anyOverwriteSuccess) {
              // No bounded overwrite succeeded — treat as expired and drop
              if (_debugLogCount <= 10) console.log(`scheduler: DROP event (${ev.blockX},${ev.blockY}) — bounded overwrite failed up to ${overwriteCap}`)
              ;(ev as any).__placedIndices = []
              _expiredDroppedCount++
              startPackOffsets.set(ev.startPack, (startPackOffsets.get(ev.startPack) || 0) + Math.max(1, packets.length));
              continue;
            }
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
      if (diagEnabled && diagWriteEventPlacements) {
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
        try { fs.mkdirSync(diagOutDir, { recursive: true }); } catch (e) { /* ignore */ }
        const outPath = `${diagOutDir.replace(/\/+$/, '')}/scheduler_event_placements.json`;
        fs.writeFileSync(outPath, JSON.stringify({ events: perEvent }, null, 2));
        console.log(`scheduler: wrote per-event placements to ${outPath}`);
      }
    } catch (e) {
      if (diagEnabled) console.warn('scheduler: failed to write per-event placements', e);
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

  const binSize = pps; // 1-second bins at pps
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
      expiredDroppedCount: _expiredDroppedCount,
    };
    if (diagEnabled && diagWriteStats) {
      const outPath = `${diagOutDir.replace(/\/+$/, '')}/scheduler_stats.json`;
      try { fs.mkdirSync(diagOutDir, { recursive: true }); } catch (e) { /* ignore */ }
      fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
      console.log(`scheduler: wrote stats to ${outPath} — non-empty ${totalNonEmpty}/${totalPacks} (${occupancy}%) first=${firstNonEmpty} last=${lastNonEmpty}`);
    }
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
      durationPacks: Math.ceil(durationSeconds * CDG_PPS),
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
    pps: CDG_PPS,
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
