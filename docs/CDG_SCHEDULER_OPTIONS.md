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
