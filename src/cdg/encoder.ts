// Minimal CDG encoder helpers: writeFontBlock logic, VRAM compare, and packet builders.
// Purpose: provide a deterministic translation of 6x12 font blocks into 24-byte CDG packets
// following CDGMagic's high-level algorithm (COPY/XOR, bitplane fallback).

import { writeFileSync } from 'fs';
import type Compositor from './compositor';
import { CDGPacket as CDGPacketClass, CDGPalette, CDGCommand } from '../karaoke/renderers/cdg/CDGPacket';
import { CDG_PACKET_SIZE, CDG_PPS } from './constants'

export const PACKET_SIZE = CDG_PACKET_SIZE;
export const PPS = CDG_PPS; // packets per second

export type CDGPacket = Uint8Array; // length 24

export function makeEmptyPacket(): CDGPacket {
  return new Uint8Array(PACKET_SIZE);
}

// Basic header constants (subset)
export const TV_GRAPHICS = 0x09;
export const COPY_FONT = 0x06;
// CDG tile-block XOR command is 38 (0x26) in the CDG spec / reference encoder
export const XOR_FONT = 0x26;

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
// - if xorOnly: generates XOR-mode packet for highlighting (karaoke)
export function writeFontBlock(
  vram: VRAM,
  blockX: number,
  blockY: number,
  blockPixels: number[][],
  channelOrCompositor?: number | Compositor,
  maybeCompositor?: Compositor,
  xorOnly: boolean = false,
): CDGPacket[] {
  // Port of CDGMagic::write_fontblock / write_fontblock_single
  // Support two calling forms used in the codebase:
  //  - writeFontBlock(vram, bx, by, pixels, compositor?)
  //  - writeFontBlock(vram, bx, by, pixels, channel, compositor)
  let channel = 0;
  let compositorObj: Compositor | undefined = undefined;
  if (typeof channelOrCompositor === 'number') {
    channel = channelOrCompositor;
    compositorObj = maybeCompositor;
  } else if (channelOrCompositor) {
    compositorObj = channelOrCompositor as Compositor;
  }
  // If a compositor is provided, compare against its composited block first.
  if (compositorObj) {
    if (blockEqualsComposited(compositorObj, blockX, blockY, blockPixels)) return [];
  } else {
    // Skip if block is identical to VRAM
    if (blockEqualsVRAM(vram, blockX, blockY, blockPixels)) return [];
  }
  // Build a prominence-ordered color list (most common first)
  const counts = new Map<number, number>();
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 6; x++) {
      const v = blockPixels[y][x] & 0xFF;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  const colorsByFreq = Array.from(counts.entries()).filter(e => e[1] > 0).sort((a,b) => b[1]-a[1]).map(e => e[0]);
  const num_colors = colorsByFreq.length;

  const packets: CDGPacket[] = [];

  // helper to create a packet that matches the reference packing (command=TV_GRAPHICS, instruction)
  function write_fontblock_single(instruction: number, channel: number,
                                  x_block: number, y_block: number,
                                  color_one: number, color_two: number,
                                  lines: number[] | null): CDGPacket {
    const packetObj = new CDGPacketClass();
    // Set the CDG sub-command (COPY/XOR) in buffer[1] and leave instruction (buffer[2]) = 0
    // instruction parameter here is the sub-command (COPY_FONT/XOR_FONT) per reference
    packetObj.setCommand(instruction as any, 0);
    // Build 16 data bytes
    const data: number[] = new Array(16).fill(0);
    data[0] = (color_one & 0x3F) | ((channel << 2) & 0x30);
    data[1] = (color_two & 0x3F) | ((channel << 4) & 0x30);
    data[2] = y_block & 0x3F;
    data[3] = x_block & 0x3F;
    if (lines && lines.length >= 12) {
      for (let i = 0; i < 12; i++) data[4 + i] = lines[i] & 0x3F;
    }
    packetObj.setData(data);
    return new Uint8Array(packetObj.toBuffer());
  }

  // Helper to compute a 12-line mask array from a predicate
  function buildLines(predicate: (pix: number) => boolean) {
    const lines: number[] = new Array(12).fill(0);
    for (let y = 0; y < 12; y++) {
      let the_line = 0;
      for (let x = 0; x < 6; x++) {
        const pix_val = predicate(blockPixels[y][x]) ? 1 : 0;
        the_line |= (pix_val << (5 - x));
      }
      lines[y] = the_line;
    }
    return lines;
  }

  // XOR-only case: used for karaoke highlighting
  // This generates an XOR packet that highlights pixels without changing background
  if (xorOnly) {
    // For XOR-only highlighting, treat as if highlighting color index 1
    // Only include block if it has meaningful pixels (avoid writing empty highlights)
    const hasPixels = blockPixels.some(row => row.some(pix => pix > 0));
    if (!hasPixels) return [];
    
    const lines = buildLines((pix) => pix > 0);
    packets.push(write_fontblock_single(XOR_FONT, channel, blockX, blockY, 0, 1, lines));
    return packets;
  }

  if (num_colors === 0 || num_colors === 1) {
    const c = colorsByFreq[0] || 0;
    const lines = new Array(12).fill(0x3F);
  packets.push(write_fontblock_single(COPY_FONT, channel, blockX, blockY, c, c, lines));
  } else if (num_colors === 2) {
    const colors_to_write = [colorsByFreq[0], colorsByFreq[1]];
    const lines = buildLines((pix) => pix === colors_to_write[1]);
  packets.push(write_fontblock_single(COPY_FONT, channel, blockX, blockY, colors_to_write[0], colors_to_write[1], lines));
  } else if (num_colors === 3) {
    // follow reference ordering: [1], [0], [2]
    const colors_to_write = [colorsByFreq[1], colorsByFreq[0], colorsByFreq[2]];
    // First COPY packet
    const lines0 = buildLines((pix) => (pix === colors_to_write[1]) || (pix === colors_to_write[2]));
  packets.push(write_fontblock_single(COPY_FONT, channel, blockX, blockY, colors_to_write[0], colors_to_write[1], lines0));
    // Second XOR packet
    const lines1 = buildLines((pix) => pix === colors_to_write[2]);
  packets.push(write_fontblock_single(XOR_FONT, channel, blockX, blockY, 0x00, (colors_to_write[1] ^ colors_to_write[2]) & 0x3F, lines1));
  } else {
    // Compute colors_OR, colors_XOR, colors_AND across prominent colors
    let colors_OR = 0;
    let colors_XOR = 0;
    let colors_AND = 0xFF;
    for (let i = 0; i < num_colors; i++) {
      const c = colorsByFreq[i];
      colors_OR |= c;
      colors_XOR ^= c;
      colors_AND &= c;
    }
    let AND_bits = 0, OR_bits = 0;
    for (let bit = 0; bit < 4; bit++) {
      AND_bits += (colors_AND >> bit) & 0x01;
      OR_bits  += (colors_OR >> bit) & 0x01;
    }
    const used_bits = OR_bits - AND_bits;

    // Special 4-color XORable case
    if ((num_colors === 4) && (used_bits > 2) && (colors_XOR !== 0x00)) {
      const colors_to_write = [colorsByFreq[1], colorsByFreq[0], colorsByFreq[2], colorsByFreq[3]];
      // First COPY packet: pack colors 1/0 and mask for others
      const lines0 = buildLines((pix) => (pix === colors_to_write[1]) || (pix === colors_to_write[2]) || (pix === colors_to_write[3]));
  packets.push(write_fontblock_single(COPY_FONT, channel, blockX, blockY, colors_to_write[0], colors_to_write[1], lines0));
      // Next two XOR packets
      const lines1 = buildLines((pix) => pix === colors_to_write[2]);
  packets.push(write_fontblock_single(XOR_FONT, channel, blockX, blockY, 0x00, (colors_to_write[1] ^ colors_to_write[2]) & 0x3F, lines1));
      const lines2 = buildLines((pix) => pix === colors_to_write[3]);
  packets.push(write_fontblock_single(XOR_FONT, channel, blockX, blockY, 0x00, (colors_to_write[1] ^ colors_to_write[3]) & 0x3F, lines2));
    }
    // Bitplane method for >4 colors or XORable
    else if ((num_colors > 4) || (colors_XOR !== 0x00)) {
      let copy_type = COPY_FONT;
      for (let pal_bit = 3; pal_bit >= 0; pal_bit--) {
        if (((colors_OR >> pal_bit) & 0x01) === 0x00) continue;
        if (((colors_AND >> pal_bit) & 0x01) === 0x01) continue;
        let this_color_0 = 0x00;
        let this_color_1 = 0x01 << pal_bit;
        if ((copy_type === COPY_FONT) && (colors_AND > 0x00)) { this_color_0 |= colors_AND; this_color_1 |= colors_AND; }
        const lines = buildLines((pix) => ((pix >> pal_bit) & 0x01) === 1);
  packets.push(write_fontblock_single(copy_type, channel, blockX, blockY, this_color_0, this_color_1, lines));
        copy_type = XOR_FONT;
      }
    }
    // Four XORable colors fallback
    else {
      // colors 0..3 mapping per reference
      const colors_to_write = [colorsByFreq[0], colorsByFreq[1], colorsByFreq[2] ^ colorsByFreq[0], colorsByFreq[3] ^ colorsByFreq[1]];
      // First COPY packet
      const lines0 = buildLines((pix) => (pix === colors_to_write[0]) || (pix === colorsByFreq[2]));
  packets.push(write_fontblock_single(COPY_FONT, channel, blockX, blockY, colors_to_write[1], colors_to_write[0], lines0));
      // XOR packet 1
      const lines1 = buildLines((pix) => (pix === colorsByFreq[2]) || (pix === colorsByFreq[3]));
  packets.push(write_fontblock_single(XOR_FONT, channel, blockX, blockY, 0x00, colors_to_write[2] & 0x3F, lines1));
    }
  }

  // Update VRAM and compositor view
  vram.writeBlock(blockX, blockY, blockPixels);
  try {
    if (compositorObj && typeof (compositorObj as any).copyBlockToVram === 'function') {
      (compositorObj as any).copyBlockToVram(vram, blockX, blockY, blockPixels);
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
  // first 8 simple repeats (use reference layout: command=TV_GRAPHICS, instruction=MEMORY_PRESET)
  for (let r = 0; r < 8; r++) {
    const packet = new CDGPacketClass();
    packet.setCommand(CDGCommand.CDG_MEMORY_PRESET, 0);
    const data: number[] = new Array(16).fill(0);
    data[0] = presetIndex & 0x3F;
    data[1] = r & 0x3F;
    packet.setData(data);
    pkts.push(new Uint8Array(packet.toBuffer()));
  }
  // last 8 with message in data[2..15]
  // Use the same signature/message as the reference encoder so the memory preset packets match.
  const msg = 'CD+G MAGIC 001B';
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
  const packet = new CDGPacketClass();
  packet.setCommand(CDGCommand.CDG_BORDER_PRESET, 0);
  const data = new Array(16).fill(0);
  data[0] = colorIndex & 0x3F;
  packet.setData(data);
  return [new Uint8Array(packet.toBuffer())];
}

/**
 * Generate a scroll packet. By default this produces a CDG_SCROLL_COPY
 * packet with zero offsets and copy flag set (matches the example packet
 * that appears as a no-op scroll). Caller can specify small offsets and
 * directions per CDG spec (hOffset 0..5, vOffset 0..11, hDir/ vDir 0..3).
 */
export function generateScrollPacket(
  colorIndex: number = 0,
  hField: number = 0,
  vField: number = 0,
  useCopyVariant: boolean = true
): CDGPacket[] {
  const packet = new CDGPacketClass();
  // Choose command: SCROLL_COPY (24) or SCROLL_PRESET (20)
  const cmd = useCopyVariant ? CDGCommand.CDG_SCROLL_COPY : CDGCommand.CDG_SCROLL_PRESET;
  packet.setCommand(cmd, 0);
  const data = new Array(16).fill(0);
  data[0] = colorIndex & 0x3F;
  // hField and vField should already encode offset and direction bits per spec
  data[1] = hField & 0x3F;
  data[2] = vField & 0x3F;
  packet.setData(data);
  return [new Uint8Array(packet.toBuffer())];
}

export function generatePaletteLoadPackets(palette?: CDGPalette): CDGPacket[] {
  const pal = palette || new CDGPalette();
  const pkts: CDGPacket[] = [];
  // Build low (0..7) and high (8..15) the way reference does (pack 4-bit channels into two bytes)
  const colors = pal.getColors();
  for (let hi = 0; hi < 2; hi++) {
  const packet = new CDGPacketClass();
  const instr = hi ? CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH : CDGCommand.CDG_LOAD_COLOR_TABLE_LOW;
  packet.setCommand(instr, 0);
    const data: number[] = new Array(16).fill(0);
    const pal_offset = hi * 8;
    for (let pal_inc = 0; pal_inc < 8; pal_inc++) {
      const actual_idx = pal_inc + pal_offset;
      const temp = colors[actual_idx] || 0; // stored as 12-bit r4/g4/b4
      const r4 = (temp >> 8) & 0x1F;
      const g4 = (temp >> 4) & 0x0F;
      const b4 = temp & 0x0F;

      const byte1 = ((r4 & 0x1f) << 2) | ((g4 & 0x1f) >> 2)
      const byte2 = ((g4 & 0x03) << 4) | (b4 & 0x0f)

      // POORLY SHIFTED!
      // const byte1 = ((r4 & 0x1f) << 2) | ((g4 & 0x1f) >> 2)
      // const byte2 = ((g4 & 0x03) << 4) | (b4 & 0x0f)

      // SWAPPED GREEN bits
      // const byte1 = (r4 << 2) | (g4 & 0x03) // (g4 >> 2)
      // const byte2 = ((g4 & 0x0A) << 4) | (b4 << 2)

      // SWAPPED GREEN && BLUE bits
      // const byte1 = (r4 << 2) | (b4 >> 2)
      // const byte2 = ((b4 & 0x03) << 6) | ((g4 & 0x0C) << 2)

      if (hi === 1 && pal_inc === 3)
        console.log(`encoder: ${hi?"HI":"LO"}`, pal_inc, ' B1:', byte1.toString(2).padStart(8, '0'), ' B2:', byte2.toString(2).padStart(8, '0'))

      data[pal_inc * 2 + 0] = byte1; (( r4 & 0x0F) << 2) | ((g4 & 0x0F) >> 2);
      data[pal_inc * 2 + 1] = byte2; (((g4 & 0x03) << 4) | ( b4 & 0x0F)) & 0x3F;
    }
    packet.setData(data);
    pkts.push(new Uint8Array(packet.toBuffer()));
  }
  return pkts;
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
