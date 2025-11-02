CDG Scheduler Options

This short doc describes the scheduling knobs exposed by the CDG scheduler
(`src/cdg/scheduler.ts`) and the recommended defaults used by the debug
harness.

Purpose
- Provide tunable controls for placement heuristics without changing core
  code.
- Keep diagnostics opt-in to avoid polluting normal app runs.

Options (ScheduleOptions)

- durationSeconds: number
  - Required. Timeline length (seconds) the scheduler considers when allocating
    packet slots.

- pps?: number (default 300)
  - Packets per second (default used by this project for file generation: 300).
    Note: the CDG physical subcode spec historically defines 75 "Audio" CD packets/second
      within six subchannels as one bits each (aligned with audio CD frames)
      each which when assembled into CSG packets comes to 2.N CDG packets of 24 bytes a second.
      This however has no berring on CDG in a file!

    For offline file generation and playback mapping used by all players tested
    were useing a baseline of 300 pps to be compatable.

- overwriteLimitSeconds?: number
  - How many seconds forward the scheduler is allowed to perform destructive
    overwrites when no empty placement is available.
  - Default: 5 (the project baseline chosen after debug experiments).
  - Increasing this value makes the scheduler more willing to overwrite
    existing packets (which can reduce tail-spill), but may change output
    determinism and increase destructive writes.

- placementSlackSeconds?: number
  - Extra seconds of slack added to the maximum intended placement; helps
    avoid pushing events far into the tail by providing a larger allocation
    cap.
  - Default: 10 seconds.

- diagnostics?: { enabled?: boolean; outDir?: string; writeEventPlacements?: boolean; writeStats?: boolean; traceEvent?: { blockX:number; blockY:number; startPack:number } }
  - `enabled`: when true the scheduler writes diagnostic files and produces
    more verbose logs.
  - `outDir`: directory to write diagnostics into (default `./tmp`).
  - `writeEventPlacements`: whether to write per-event placement JSON.
  - `writeStats`: whether to write scheduler stats JSON.
  - `traceEvent`: optional targeted trace selector to enable verbose tracing
    of a single event (helps debug pathological placements).

Notes & recommendations
- For normal app usage keep `diagnostics` disabled. The debug harness
  (`src/debug/generate-cdg-from-json.ts`) enables diagnostics so it can
  generate placement and stats outputs used by post-processing scripts.
- The chosen defaults (5s overwrite limit, 10s placement slack) reflect the
  team's experiments: 5s was chosen as a good tradeoff during investigation.
  These are conservative defaults and can be tuned per-file when needed.

Examples

- Basic call from code:

```ts
import { scheduleFontEvents } from '../cdg/scheduler'

const opts = {
  // durationSeconds is expressed in seconds (avoid shorthand packet-based values)
  durationSeconds: 60,
  // default packets-per-second for file generation in this repo
  pps: 300,
  overwriteLimitSeconds: 5,
  placementSlackSeconds: 10,
}
const { packetSlots } = scheduleFontEvents(events, opts, reservedStart, initialPacketSlots)
```

- Debug harness uses diagnostics to produce `tmp/scheduler_event_placements.json`
  and `tmp/scheduler_stats.json` by passing:

```ts
schedOpts.diagnostics = { enabled: true, outDir: './tmp', writeEventPlacements: true, writeStats: true }
```

If you want this doc moved, renamed, or expanded into repository docs/README,
let me know and I will update accordingly.

Suggested CLI switches (quick)

Below are the small set of flags from `src/debug/generate-cdg-from-json.ts` that
you will most likely use during normal generation runs. The script supports
additional diagnostic flags (match-map, match-coord, synth-only, etc.) which
are useful when debugging—those are deliberately omitted here.

- --duration-seconds N
  - Force the output length in seconds (controls total packet count = ceil(N * PPS)).

- --pps N
  - Packets-per-second used to map timeline -> packet indices. Default: 300.

- --reference <path>
  - Path to a canonical/reference `.cdg` file used for prelude copying and tail
    post-filters. Use this to keep generated prelude semantics aligned with a
    known-good file.

- --use-prelude
  - Use the deterministic synthesized prelude (from `src/cdg/prelude.ts`) and
    then continue scheduling the full timeline. DO NOT pair this with
    `--synthesize-prelude-only` unless you only want the tiny prelude file for
    inspection.

- --prelude-mode <minimal|aggressive>
  - Controls how aggressive the synthesized prelude is. `minimal` is usually
    sufficient (palette/memory/border), `aggressive` writes more tiles.

- --prelude-copy-tiles
  - Selectively copy only tile/palette/memory/border packets from the
    reference prelude instead of copying the entire prelude. Handy when you
    want to preserve init state without duplicating whole prelude semantics.

- --no-prelude-copy
  - When a `--reference` is supplied, skip copying its prelude entirely and
    rely on the synthesized or generated `initPkts` instead.

- --zero-after-seconds N
  - Zero out all generated packets at/after N seconds. Useful to mimic an
    END/clear behavior from the reference and avoid spurious late writes.

Typical quick command (full-length generation matching canonical length):

```bash
npx tsx src/debug/generate-cdg-from-json.ts diag/sample_project_04.json diag/gen_full_playback.cdg \
  --duration-seconds 60 --pps 300 --reference diag/sample_project_04.canonical.cdg
```

