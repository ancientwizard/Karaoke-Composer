// Minimal CDG encoder helpers: writeFontBlock logic, VRAM compare, and packet builders.
// Purpose: provide a deterministic translation of 6x12 font blocks into 24-byte CDG packets
// following CDGMagic's high-level algorithm (COPY/XOR, bitplane fallback).

import { writeFileSync } from 'fs';
import type Compositor from './compositor';
import { CDGPacket as CDGPacketClass, CDGPalette, CDGCommand } from '../karaoke/renderers/cdg/CDGPacket';

export const PACKET_SIZE = 24;
export const PPS = 75; // packets per second

export type CDGPacket = Uint8Array; // length 24

export function makeEmptyPacket(): CDGPacket {
  return new Uint8Array(PACKET_SIZE);
}

// Basic header constants (subset)
export const TV_GRAPHICS = 0x09;
export const COPY_FONT = 0x06;
export const XOR_FONT = 0x07;

// VRAM: 300 x 216 indices (0..15)
export class VRAM {
  width = 300;
  height = 216;
  data: Uint8Array;
  constructor() {
    this.data = new Uint8Array(this.width * this.height);
    this.clear(0);
  }
  clear(idx: number) {
    this.data.fill(idx & 0xFF);
  }
  // set a pixel if within bounds
  setPixel(x: number, y: number, v: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.data[y * this.width + x] = v & 0xFF;
  }
  getPixel(x: number, y: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }
  // Copy a 6x12 block into VRAM at block coordinates (blockX 0..49, blockY 0..17)
  writeBlock(blockX: number, blockY: number, blockPixels: number[][]) {
    const px = blockX * 6;
    const py = blockY * 12;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 6; x++) {
        this.setPixel(px + x, py + y, blockPixels[y][x]);
      }
    }
  }
}

// Helper: build a CDG packet with TV_GRAPHICS, instruction, and header data[0..3]
export function buildHeaderPacket(instruction: number, colorOn: number, colorOff: number, yBlock: number, xBlock: number): CDGPacket {
  const p = makeEmptyPacket();
  p[0] = TV_GRAPHICS; // command
  p[1] = instruction & 0x3F;
  // data[0] = colorOn | ((channel << 2) & 0x30) -- we use channel 0
  p[4] = colorOn & 0x3F;
  p[5] = colorOff & 0x3F;
  // data[2] = y_block, data[3] = x_block stored at p[6], p[7] considering header offset
  // Our layout: p[4]..p[19] correspond to data[0..15]
  p[8] = yBlock & 0x3F; // data[2]
  p[9] = xBlock & 0x3F; // data[3]
  return p;
}

// (inline fill handled in makePacket)

// Compute prominent colors and number of distinct colors in a 6x12 block
export function analyzeBlock(blockPixels: number[][]) {
  const counts = new Map<number, number>();
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 6; x++) {
      const v = blockPixels[y][x] & 0xFF;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  const colors = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  return {
    colors,
    counts,
  };
}

// Compare a block with VRAM at block coords; return true if identical
export function blockEqualsVRAM(vram: VRAM, blockX: number, blockY: number, blockPixels: number[][]) {
  const px = blockX * 6;
  const py = blockY * 12;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 6; x++) {
      const a = blockPixels[y][x] & 0xFF;
      const b = vram.getPixel(px + x, py + y) & 0xFF;
      if (a !== b) return false;
    }
  }
  return true;
}

// Compare against compositor's composited block (if compositor provided).
export function blockEqualsComposited(compositor: Compositor, blockX: number, blockY: number, blockPixels: number[][]) {
  const compBlock = compositor.getCompositedBlock(blockX, blockY);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 6; x++) {
      if ((compBlock[y][x] & 0xFF) !== (blockPixels[y][x] & 0xFF)) return false;
    }
  }
  return true;
}

// Main function: given a 6x12 block, produce 1..N CDG packets following CDGMagic rules.
// For parity we implement these heuristics:
// - if 1 color: 1 COPY packet (all lines = 0x3F)
// - if 2 colors: 1 COPY packet with mask of second color
// - if 3 colors: 2 packets: COPY then XOR
// - if >=4 colors: bitplane method: for each used bitplane write COPY (first) then XORs
export function writeFontBlock(
  vram: VRAM,
  blockX: number,
  blockY: number,
  blockPixels: number[][],
  compositor?: Compositor,
): CDGPacket[] {
  // If a compositor is provided, compare against its composited block first.
  if (compositor) {
    if (blockEqualsComposited(compositor, blockX, blockY, blockPixels)) return [];
  } else {
    // Skip if block is identical to VRAM
    if (blockEqualsVRAM(vram, blockX, blockY, blockPixels)) return [];
  }
  const { colors } = analyzeBlock(blockPixels);
  const ncolors = colors.length;
  const packets: CDGPacket[] = [];

  // helper to produce a CDG tile packet using the project's CDGPacket utilities
  function makePacket(instruction: number, colorOn: number, colorOff: number, lines: number[]) {
    // CDGPacket.tileBlock expects: color0, color1, row, col, pixels(12 bytes), xor(bool)
    const xor = instruction === XOR_FONT;
    // tileBlock wants pixels as a flat array of 12 6-bit values
    const pixels = lines.map((l) => l & 0x3F);
    const cp = CDGPacketClass.tileBlock(colorOn & 0x0F, colorOff & 0x0F, blockY & 0x1F, blockX & 0x3F, pixels, xor);
    return new Uint8Array(cp.toBuffer());
  }

  // Build line masks for a given predicate function
  function buildLines(predicate: (pixel: number) => boolean) {
    const lines: number[] = new Array(12).fill(0);
    for (let y = 0; y < 12; y++) {
      let line = 0;
      for (let x = 0; x < 6; x++) {
        const v = blockPixels[y][x];
        const bit = predicate(v) ? 1 : 0;
        line |= (bit << (5 - x));
      }
      lines[y] = line;
    }
    return lines;
  }

  if (ncolors <= 1) {
    // all-lines 0x3F
    const lines = new Array(12).fill(0x3F);
    packets.push(makePacket(COPY_FONT, colors[0] || 0, colors[0] || 0, lines));
  } else if (ncolors === 2) {
    const c0 = colors[0];
    const c1 = colors[1];
    const lines = buildLines((pix) => pix === c1);
    packets.push(makePacket(COPY_FONT, c0, c1, lines));
  } else if (ncolors === 3) {
    // heuristic: prominent color + second color in COPY, and XOR the third
    const c0 = colors[0];
    const c1 = colors[1];
    const c2 = colors[2];
    const lines0 = buildLines((pix) => pix === c1 || pix === c2);
    packets.push(makePacket(COPY_FONT, c1, c0, lines0));
    const lines1 = buildLines((pix) => pix === c2);
    packets.push(makePacket(XOR_FONT, 0x00, (c1 ^ c2) & 0x3F, lines1));
  } else {
    // bitplane fallback: determine which bitplanes are used (4 bits: 0..3)
    let colorsOR = 0;
    for (const c of colors) colorsOR |= c;
    const usedPlanes: number[] = [];
    for (let bit = 3; bit >= 0; bit--) {
      if (((colorsOR >> bit) & 0x01) !== 0) usedPlanes.push(bit);
    }
    // first plane is COPY, rest are XOR
    let first = true;
    for (const bit of usedPlanes) {
      const lines = buildLines((pix) => ((pix >> bit) & 0x01) === 1);
      if (first) {
        packets.push(makePacket(COPY_FONT, 0x00, 0x01 << bit, lines));
        first = false;
      } else {
        packets.push(makePacket(XOR_FONT, 0x00, 0x01 << bit, lines));
      }
    }
  }

  // Update VRAM with the new block as if written to screen.
  vram.writeBlock(blockX, blockY, blockPixels);
  // If compositor provided, also copy block into compositor's virtual VRAM view (so subsequent comparisons reflect change)
  try {
    if (compositor && typeof (compositor as any).copyBlockToVram === 'function') {
      (compositor as any).copyBlockToVram(vram, blockX, blockY, blockPixels);
    }
  } catch (e) {
    // ignore if compositor doesn't support copy
  }

  return packets;
}

// Small helper used by debug script to write packets to a raw .cdg (concatenate 24-byte packets)
export function writePacketsToFile(path: string, packets: CDGPacket[]) {
  const buf = Buffer.concat(packets.map((p) => Buffer.from(p)));
  writeFileSync(path, buf);
}

// Generate memory preset packets (16 packets). Returns our CDGPacket (Uint8Array) array.
export function generateMemoryPresetPackets(presetIndex: number): CDGPacket[] {
  const pkts: CDGPacket[] = [];
  // first 8 simple repeats
  for (let r = 0; r < 8; r++) {
    const cp = CDGPacketClass.memoryPreset(presetIndex, r);
    pkts.push(new Uint8Array(cp.toBuffer()));
  }
  // last 8 with message in data[2..15]
  const msg = 'KARAOKE-COMPOSER';
  const msgChars = Array.from(msg).map((c) => (c.charCodeAt(0) - 0x20) & 0x3F);
  for (let r = 8; r < 16; r++) {
  const packet = new CDGPacketClass();
  packet.setCommand(CDGCommand.CDG_MEMORY_PRESET, 0);
    // build 16 bytes: data[0]=presetIndex, data[1]=r, rest = msg (padded)
    const data: number[] = new Array(16).fill(0);
    data[0] = presetIndex & 0x3F;
    data[1] = r & 0x3F;
    for (let i = 0; i < Math.min(msgChars.length, 14); i++) data[2 + i] = msgChars[i];
    packet.setData(data);
    pkts.push(new Uint8Array(packet.toBuffer()));
  }
  return pkts;
}

export function generateBorderPacket(colorIndex: number): CDGPacket[] {
  const p = CDGPacketClass.borderPreset(colorIndex);
  return [new Uint8Array(p.toBuffer())];
}

export function generatePaletteLoadPackets(palette?: CDGPalette): CDGPacket[] {
  const pal = palette || new CDGPalette();
  const pkts = pal.generateLoadPackets();
  return pkts.map((p) => new Uint8Array(p.toBuffer()));
}

// --- self-check demo generator used by debug script ---
export function demoBlockPixels(): number[][] {
  // produce a 6x12 block with simple pattern of 3 colors (0,1,2)
  const out: number[][] = [];
  for (let y = 0; y < 12; y++) {
    const row: number[] = [];
    for (let x = 0; x < 6; x++) {
      if (y < 4) row.push(1);
      else if (y < 8) row.push(2);
      else row.push(0);
    }
    out.push(row);
  }
  return out;
}
