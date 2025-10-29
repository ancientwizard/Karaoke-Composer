#!/usr/bin/env -S npx tsx

import { argv } from 'process';
import path from 'path';
import { VRAM, demoBlockPixels, writeFontBlock, writePacketsToFile } from '../cdg/encoder';

function usage() {
  console.log('Usage: ts-node src/debug/debug-cdg-translation.ts [--emit-demo-packets] [--block x,y] [--out PATH]');
  console.log('  --emit-demo-packets   : emit a small demo CDG containing one font block');
  console.log('  --block x,y           : block coordinates (0..49,0..17) to place demo');
  console.log('  --out PATH            : output file path (default diag/demo-generated.cdg)');
}

async function main() {
  const args = argv.slice(2);
  if (args.length === 0) { usage(); return; }

  const emitDemo = args.includes('--emit-demo-packets');
  const outIndex = args.indexOf('--out');
  const outPath = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : path.join(process.cwd(), 'diag', 'demo-generated.cdg');
  let blockX = 4, blockY = 4;
  const blockIndex = args.indexOf('--block');
  if (blockIndex >= 0 && args[blockIndex + 1]) {
    const parts = (args[blockIndex + 1] || '').split(',');
    if (parts.length === 2) { blockX = parseInt(parts[0], 10) || blockX; blockY = parseInt(parts[1], 10) || blockY; }
  }

  const scheduleDemo = args.includes('--schedule-demo');

  if (emitDemo) {
    const v = new VRAM();
    const block = demoBlockPixels();
    console.log(`Placing demo block at ${blockX},${blockY}`);
    const packets = writeFontBlock(v, blockX, blockY, block);
    if (packets.length === 0) {
      console.log('No packets (block identical to VRAM) — writing a single memory preset fallback packet.');
      // create a single empty packet to ensure file not empty
      const p = new Uint8Array(24);
      p[0] = 0x09;
      packets.push(p);
    }
    writePacketsToFile(outPath, packets as any);
    console.log(`Wrote ${packets.length} packets to ${outPath}`);
  } else if (scheduleDemo) {
    // schedule demo across duration
    const durationArgIndex = args.indexOf('--duration');
    const duration = durationArgIndex >= 0 && args[durationArgIndex + 1] ? parseFloat(args[durationArgIndex + 1]) : 4;
    const { scheduleAndWriteDemo } = await import('../cdg/scheduler');
    const res = scheduleAndWriteDemo(outPath, duration);
    console.log(`Scheduled demo wrote ${res.count} packets to ${res.outPath}`);
  } else {
    usage();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
