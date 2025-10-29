#!/usr/bin/env -S npx tsx

// Parallel runner that spawns multiple child processes running the existing
// TypeScript replayer script. Splits events into N chunks (workers) and
// merges their match maps.

import fs   from 'fs'
import os   from 'os'
import path from 'path'

import spawn from 'child_process';

if (process.argv.length < 4) {
  console.error('Usage: node src/debug/find-exact-matches-replayer-parallel.cjs <parsed.json> <reference.cdg> [pktStart] [pktEnd]');
  process.exit(2);
}

const parsedPath = process.argv[2];
const referencePath = process.argv[3];
const pktStart = process.argv[4] ? Number(process.argv[4]) : null;
const pktEnd = process.argv[5] ? Number(process.argv[5]) : null;
const WORKERS = Number(process.env.WORKERS) || Math.max(1, os.cpus().length - 1);
const REPLAYER_SNAPSHOT_INTERVAL = process.env.REPLAYER_SNAPSHOT_INTERVAL || '32';

if (!fs.existsSync(parsedPath)) { console.error('Parsed JSON not found:', parsedPath); process.exit(2) }
if (!fs.existsSync(referencePath)) { console.error('Reference CDG not found:', referencePath); process.exit(2) }

const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf8'));
const PPS = 75;
// Recompute events similarly to the TS script so we can split by event index or by packet-range
function timeToPacks(val, pps = 75) {
  if (val == null) return 0;
  if (val >= 1000) return Math.floor((val / 1000) * pps);
  return Math.floor(val);
}

import { CDGTextRenderer } from '../karaoke/renderers/cdg/CDGFont';
import { CDG_SCREEN      } from '../karaoke/renderers/cdg/CDGPacket';
const textRenderer = new CDGTextRenderer();

const events = [];
for (const clip of parsed.clips || []) {
  if (clip.type === 'TextClip') {
    const clipStart = clip.start || 0;
    for (const ev of clip.events || []) {
      const evOff = ev.clip_time_offset || 0;
      const startPack = timeToPacks((clipStart || 0) + (evOff || 0), PPS);
      let evDurPacks = 0;
      if (ev.clip_time_duration != null) evDurPacks = timeToPacks(ev.clip_time_duration, PPS);
      else if (clip.duration != null) evDurPacks = timeToPacks(clip.duration, PPS);
      else evDurPacks = Math.ceil(PPS * 2);
      const durationPacks = Math.max(1, evDurPacks);
      const tileRow = Math.floor((ev.clip_y_offset || 0) / CDG_SCREEN.TILE_HEIGHT);
      const tileCol = Math.floor((ev.clip_x_offset || 0) / CDG_SCREEN.TILE_WIDTH);
      const tiles = textRenderer.renderAt(clip.text || '', tileRow, tileCol);
      for (const t of tiles) {
        const pixels = [];
        for (let r = 0; r < Math.min(12, t.tileData.length); r++) {
          const rowbits = t.tileData[r];
          const rowArr = [];
          for (let c = 0; c < 6; c++) {
            const bit = (rowbits >> (5 - c)) & 1;
            rowArr.push(bit ? 1 : 0);
          }
          pixels.push(rowArr);
        }
        events.push({ blockX: t.col, blockY: t.row, pixels: pixels, startPack: startPack, durationPacks: durationPacks });
      }
    }
  }
}

if (events.length === 0) { console.error('No text events'); process.exit(2) }

// If pktStart/pktEnd provided, compute event index slice covering them
let eventIndices = events.map((e, i) => ({ i, startPack: e.startPack }));
if (pktStart != null && pktEnd != null) {
  // include events whose startPack in [pktStart-pps, pktEnd+pps]
  const low = pktStart - PPS;
  const high = pktEnd + PPS;
  eventIndices = eventIndices.filter(e => e.startPack >= low && e.startPack <= high);
}

const indices = eventIndices.map(x => x.i);
if (indices.length === 0) { console.error('No events in requested packet range'); process.exit(2) }

// split indices into WORKERS chunks
function chunkArray(arr, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([]);
  for (let i = 0; i < arr.length; i++) out[i % n].push(arr[i]);
  return out;
}

const chunks = chunkArray(indices, WORKERS).filter(c => c.length > 0);
console.log('Workers=', WORKERS, 'chunks=', chunks.map(c => `${c[0]}..${c[c.length-1]} (${c.length})`));

// spawn child processes for each chunk
const procs = [];
const tmpFiles = [];
let completed = 0;

function runChunk(i, chunk) {
  const start = Math.min(...chunk);
  const end = Math.max(...chunk);
  const count = end - start + 1;
  const outFile = path.join('tmp', `match_by_replayer_map_worker_${i}.json`);
  tmpFiles.push(outFile);
  const args = ['src/debug/find-exact-matches-replayer.ts', parsedPath, referencePath, String(start), String(count), outFile];
  const env = Object.assign({}, process.env, { REPLAYER_SNAPSHOT_INTERVAL: REPLAYER_SNAPSHOT_INTERVAL });
  console.log('Spawning worker', i, 'start', start, 'count', count);
  const p = spawn('npx', ['tsx', ...args], { stdio: ['ignore', 'pipe', 'pipe'], env });
  p.stdout.on('data', d => process.stdout.write(`[w${i}] ${d}`));
  p.stderr.on('data', d => process.stderr.write(`[w${i}][ERR] ${d}`));
  p.on('close', (code) => {
    console.log(`worker ${i} exit ${code}`);
    completed++;
    if (completed === chunks.length) mergeResults();
  });
  procs.push(p);
}

function mergeResults() {
  console.log('Merging', tmpFiles.length, 'worker files');
  let merged = { reservedStart: null, matches: [] };
  for (const f of tmpFiles) {
    if (!fs.existsSync(f)) continue;
    const m = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (merged.reservedStart == null && m.reservedStart != null) merged.reservedStart = m.reservedStart;
    merged.matches = merged.matches.concat(m.matches || []);
  }
  // sort by eventIndex
  merged.matches.sort((a,b)=>a.eventIndex - b.eventIndex);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(path.join('tmp','match_by_replayer_map.json'), JSON.stringify(merged, null, 2));
  console.log('Wrote tmp/match_by_replayer_map.json merged from workers');
}

// Run
for (let i = 0; i < chunks.length; i++) runChunk(i, chunks[i]);
