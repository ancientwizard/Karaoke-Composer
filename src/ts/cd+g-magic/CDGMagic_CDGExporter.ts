/**
 * CD+Graphics Magic - CDG Exporter
 *
 * Generates CD+G (.cdg) files from composition data.
 * Handles packet scheduling, color palette management, and bitmap/text rendering.
 */

import fs from 'fs';
import { CDGMagic_MediaClip     } from "@/ts/cd+g-magic/CDGMagic_MediaClip";
import { CDGMagic_TextClip      } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CDGMagic_ScrollClip    } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";
import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { CDGMagic_BMPClip       } from "@/ts/cd+g-magic/CDGMagic_BMPClip";
import { readBMP                } from "@/ts/cd+g-magic/BMPReader";
import { bmp_to_fontblocks      } from "@/ts/cd+g-magic/BMPToFontBlockConverter";
import { loadTransitionFile     } from "@/ts/cd+g-magic/TransitionFileReader";
import {
  renderTextToTile,
  getRawCharacterFromFont,
  renderCharacterFromFontToRegion,
  getCharacterWidth,
  getFontHeight
} from "@/ts/cd+g-magic/TextRenderer";
import { CompositorBuffer       } from "@/ts/cd+g-magic/CompositorBuffer";
import { VRAMBuffer             } from "@/ts/cd+g-magic/VRAMBuffer";
import { encode_block           } from "@/ts/cd+g-magic/MultiColorEncoder";
import type { TransitionData    } from "@/ts/cd+g-magic/TransitionFileReader";

enum CDGInstruction {
  MEMORY_PRESET     = 0x01,
  BORDER_PRESET     = 0x02,
  TILE_BLOCK        = 0x06,
  XOR_FONT          = 0x26,
  SCROLL_PRESET     = 0x14,
  SCROLL_COPY       = 0x18,
  TRANSPARENT_COLOR = 0x1C,
  LOAD_LOW          = 0x1E,
  LOAD_HIGH         = 0x1F,
}

const CDG_COMMAND = 0x09;

function getTopMarginByMode(karaokeMode: number): number {
  switch (karaokeMode) {
    case 0x03:
    case 0x04:
    case 0x05:
    case 0x06:
      return 24;
    
    case 0x07:
    case 0x08:
      return 24;
    
    case 0x09:
    case 0x0A:
      return 36;
    
    case 0x0B:
      return 108;
    
    default:
      return 12;
  }
}

interface CDGPacket {
  command: number;
  instruction: number;
  payload: Uint8Array;
  parity1: number;
  parity2: number;
}

export
class CDGMagic_CDGExporter {
  public static DEBUG: boolean = false;

  private internal_packet_schedule: Map<number, CDGPacket[]>;
  private internal_palette: Array<[number, number, number]>;
  private internal_clips: CDGMagic_MediaClip[];
  private internal_total_packets: number;
  private internal_duration_packets: number;
  private internal_use_reference_prelude: boolean;
  private internal_compositor: CompositorBuffer | null;
  private internal_vram: VRAMBuffer | null;
  private internal_fontblock_queue: Array<{
    fontblock: any;
    start_pack: number;
    written: boolean;
  }> = [];

  constructor(duration_packets: number = 0) {
    this.internal_packet_schedule = new Map();
    this.internal_palette = this.init_default_palette();
    this.internal_clips = [];
    this.internal_total_packets = 0;
    this.internal_duration_packets = duration_packets;
    this.internal_use_reference_prelude = false;
    this.internal_compositor = null;
    this.internal_vram = null;
    this.internal_fontblock_queue = [];
  }

  private init_default_palette(): Array<[number, number, number]> {
    const palette: Array<[number, number, number]> = [
      [0, 0, 0],
      [0, 0, 255],
      [255, 0, 0],
      [255, 0, 255],
      [0, 255, 0],
      [0, 255, 255],
      [255, 255, 0],
      [255, 255, 255],
      [0, 0, 0],
      [0, 0, 255],
      [255, 0, 0],
      [255, 0, 255],
      [0, 255, 0],
      [0, 255, 255],
      [255, 255, 0],
      [255, 255, 255],
    ];
    return palette;
  }

  register_clip(clip: CDGMagic_MediaClip): boolean {
    if (!clip || clip.duration() <= 0) {
      return false;
    }

    this.internal_clips.push(clip);

    const clip_end = clip.start_pack() + clip.duration();
    if (clip_end > this.internal_total_packets) {
      this.internal_total_packets = clip_end;
    }

    return true;
  }

  clip_count(): number {
    return this.internal_clips.length;
  }

  set_palette(palette: Array<[number, number, number]>): void {
    if (palette.length !== 16) {
      throw new Error('Palette must have exactly 16 colors');
    }
    this.internal_palette = palette;
  }

  private generate_prelude(): CDGPacket[] {
    const prelude: CDGPacket[] = [];

    prelude.push(this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    prelude.push(this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
    prelude.push(this.create_memory_preset_packet(0));
    prelude.push(this.create_border_preset_packet(0));

    return prelude;
  }

  schedule_packets(): number {
    this.internal_packet_schedule.clear();
    this.internal_fontblock_queue = [];

    this.internal_compositor = new CompositorBuffer(300, 216);
    this.internal_compositor.set_preset_index(0);

    this.internal_vram = new VRAMBuffer(300, 216);

    this.inject_scroll_reset_packets();

    for (const clip of this.internal_clips) {
      if (clip instanceof CDGMagic_TextClip) {
        this.schedule_text_clip(clip);
      } else if (clip instanceof CDGMagic_ScrollClip) {
        this.schedule_scroll_clip(clip);
      } else if (clip instanceof CDGMagic_PALGlobalClip) {
        this.schedule_palette_clip(clip);
      } else if (clip instanceof CDGMagic_BMPClip) {
        this.schedule_bmp_clip(clip);
      } else {
        this.schedule_generic_clip(clip);
      }
    }

    this.process_fontblocks_incrementally();
    this.pad_to_duration();

    return this.internal_total_packets;
  }

  validate(): boolean {
    if (this.internal_clips.length === 0) {
      return false;
    }

    if (this.internal_packet_schedule.size === 0) {
      return false;
    }

    if (this.internal_total_packets <= 0) {
      return false;
    }

    return true;
  }

  export_to_binary(): Uint8Array {
    const file_size = this.internal_total_packets * 24;
    const binary = new Uint8Array(file_size);

    binary.fill(0);

    for (const [packet_index, packets] of this.internal_packet_schedule) {
      const byte_offset = packet_index * 24;
      if (byte_offset + 24 <= file_size) {
        for (const pkt of packets) {
          binary[byte_offset] = pkt.command;
          binary[byte_offset + 1] = pkt.instruction;
          binary[byte_offset + 2] = pkt.parity1 & 0xFF;
          binary[byte_offset + 3] = (pkt.parity1 >> 8) & 0xFF;
          
          for (let i = 0; i < 16; i++) {
            binary[byte_offset + 4 + i] = pkt.payload[i] || 0;
          }
          
          binary[byte_offset + 20] = pkt.parity2 & 0xFF;
          binary[byte_offset + 21] = (pkt.parity2 >> 8) & 0xFF;
          binary[byte_offset + 22] = (pkt.parity2 >> 16) & 0xFF;
          binary[byte_offset + 23] = (pkt.parity2 >> 24) & 0xFF;
        }
      }
    }

    return binary;
  }

  private process_fontblocks_incrementally(): void {
    if (!this.internal_compositor || !this.internal_vram || this.internal_fontblock_queue.length === 0) {
      return;
    }

    const max_packet = Math.max(
      ...Array.from(this.internal_packet_schedule.keys()),
      this.internal_total_packets
    );

    for (let current_pack = 0; current_pack < max_packet + 300; current_pack++) {
      this.process_due_fontblocks(current_pack);
      this.encode_changed_blocks_to_packets(current_pack);
    }

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[process_fontblocks_incrementally] Processed ${this.internal_fontblock_queue.length} FontBlocks incrementally`);
  }

  private encode_changed_blocks_to_packets(current_pack: number): void {
    if (!this.internal_compositor || !this.internal_vram) return;

    const SCREEN_TILES_WIDE = 50;
    const SCREEN_TILES_HIGH = 18;
    let packets_added = 0;

    for (let block_y = 0; block_y < SCREEN_TILES_HIGH; block_y++) {
      for (let block_x = 0; block_x < SCREEN_TILES_WIDE; block_x++) {
        const composited_block = this.internal_compositor.read_composited_block(block_x, block_y);

        const composited_block_8bit = new Uint8Array(72);
        for (let i = 0; i < 72; i++) {
          composited_block_8bit[i] = composited_block[i] < 256 ? composited_block[i] : 0;
        }

        if (this.internal_vram.block_matches(block_x, block_y, composited_block_8bit)) {
          continue;
        }

        const encoding = encode_block(composited_block);

        for (const instr of encoding.instructions) {
          const packet = this.create_cdg_packet_from_encoding_instruction(
            instr,
            block_x,
            block_y
          );
          this.add_scheduled_packet(current_pack, packet);
          packets_added++;
        }

        this.internal_vram.write_block(block_x, block_y, composited_block_8bit);
      }
    }

    if (packets_added > 0 && CDGMagic_CDGExporter.DEBUG)
      console.debug(`[encode_changed_blocks] Pack ${current_pack}: added ${packets_added} packets`);
  }

  private inject_scroll_reset_packets(): void {
    const scroll_reset_packet = 250;

    const packet: CDGPacket = {
      command: CDG_COMMAND,
      instruction: CDGInstruction.SCROLL_COPY,
      payload: new Uint8Array(16),
      parity1: 0,
      parity2: 0,
    };

    packet.payload[1] = 0;
    packet.payload[2] = 0;

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[inject_scroll_reset_packets] Injecting SCROLL_COPY at packet ${scroll_reset_packet}`);
    this.add_scheduled_packet(scroll_reset_packet, packet);
  }

  private schedule_text_clip(clip: CDGMagic_TextClip): void {
    if (CDGMagic_CDGExporter.DEBUG)
      console.debug('[schedule_text_clip] Starting TextClip at packet', clip.start_pack(), 'duration:', clip.duration());

    const textContent = clip.text_content();
    let foregroundColor = clip.foreground_color();
    let backgroundColor = clip.background_color();
    const fontIndex = clip.font_index();
    const fontSize = clip.font_size();
    const outlineColor = clip.outline_color();
    const antialiasMode = clip.antialias_mode();
    const karaokeMode = clip.karaoke_mode();

    foregroundColor = Math.min(15, Math.max(0, foregroundColor));
    backgroundColor = Math.min(15, Math.max(0, backgroundColor));

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(
        `[schedule_text_clip] Font: index=${fontIndex}, size=${fontSize}, ` +
        `FG=${foregroundColor}, BG=${backgroundColor}, ` +
        `outline=${outlineColor}, aa=${antialiasMode}, karaoke=${karaokeMode}`
      );

    this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
    this.add_scheduled_packet(clip.start_pack() + 2, this.create_memory_preset_packet(0));

    const lines = textContent.split('\n');

    const fontPixelHeight = getFontHeight(fontSize);
    
    const blkHeight = Math.ceil(fontPixelHeight / 12.0);
    const lineHeight = blkHeight * 12;
    const linesPerPage = Math.floor(192 / lineHeight);

    const topMargin = getTopMarginByMode(karaokeMode);

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(
        `[schedule_text_clip] Font: index=${fontIndex}, size=${fontSize}, ` +
        `fontPixelHeight=${fontPixelHeight}, lineHeight=${lineHeight}, linesPerPage=${linesPerPage}, ` +
        `topMargin=${topMargin}`
      );

    const screenWidth = 288;
    const screenHeight = 216;
    const screenBmpPixels = new Uint8Array(screenWidth * screenHeight);
    screenBmpPixels.fill(backgroundColor);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx] || '';
      if (lineText.length === 0) continue;

      const lineYPixels = (lineIdx % linesPerPage) * lineHeight + topMargin;
      if (lineYPixels + lineHeight > screenHeight) continue;

      let textWidthPixels = 0;
      for (const char of lineText) {
        textWidthPixels += getCharacterWidth(char, fontSize);
      }
      
      const leftStart = Math.floor((screenWidth - textWidthPixels) / 2);
      const topStart = Math.floor((lineHeight - fontPixelHeight) / 2) + fontPixelHeight + lineYPixels;

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(
          `[schedule_text_clip] Line ${lineIdx}: y=${lineYPixels}, topStart=${topStart}, text="${lineText.substring(0, 30)}"`
        );

      let charPixelX = leftStart;
      for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
        const char = lineText[charIdx]!;
        
        const charData = getRawCharacterFromFont(char, fontSize);
        
        if (charData) {
          const charWidth = charData.width;
          const charHeight = charData.height;
          const srcData = charData.data;

          const charTopPixel = topStart - charHeight;

          for (let srcY = 0; srcY < charHeight; srcY++) {
            for (let srcX = 0; srcX < charWidth; srcX++) {
              const srcIdx = srcY * charWidth + srcX;
              const pixelX = charPixelX + srcX;
              const pixelY = charTopPixel + srcY;

              if (pixelX >= screenWidth || pixelY < 0 || pixelY >= screenHeight) continue;

              const gray = srcData[srcIdx];
              const pixelColor = gray > 127 ? foregroundColor : backgroundColor;
              const pixelIndex = pixelY * screenWidth + pixelX;
              screenBmpPixels[pixelIndex] = pixelColor;
            }
          }

          charPixelX += charWidth;
        } else {
          const tileData = renderTextToTile(char, foregroundColor, backgroundColor);
          const color1 = tileData[0] as number;
          const color2 = tileData[1] as number;
          const bitmap = tileData[2] as Uint8Array;

          const charTopPixel = topStart - 12;
          for (let row = 0; row < 12; row++) {
            const byte = bitmap[row] || 0;
            const pixelY = charTopPixel + row;

            if (pixelY < 0 || pixelY >= screenHeight) continue;

            for (let col = 0; col < 6; col++) {
              const pixelX = charPixelX + col;
              if (pixelX >= screenWidth) break;

              const bit = (byte >> (5 - col)) & 1;
              const pixelColor = bit ? color1 : color2;
              const pixelIndex = pixelY * screenWidth + pixelX;
              screenBmpPixels[pixelIndex] = pixelColor;
            }
          }

          charPixelX += 6;
        }
      }
    }

    const screenBmpData = {
      width: screenWidth,
      height: screenHeight,
      bitsPerPixel: 8,
      palette: this.internal_palette.slice(0, 16),
      pixels: screenBmpPixels
    };

    const fontblocks = bmp_to_fontblocks(
      screenBmpData,
      clip.start_pack() + 3,
      undefined,
      undefined,
      CDGMagic_CDGExporter.DEBUG
    );

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(
        `[schedule_text_clip] Converted ${lines.length} lines to ${fontblocks.length} FontBlocks`
      );

    this.queue_fontblocks_for_progressive_writing(fontblocks);
  }

  private schedule_scroll_clip(clip: CDGMagic_ScrollClip): void {
    const scroll_pkt = this.create_scroll_preset_packet(
      clip.scroll_direction(),
      clip.scroll_speed(),
      clip.x_offset(),
      clip.y_offset()
    );

    this.add_scheduled_packet(clip.start_pack(), scroll_pkt);

    const copy_pkt = this.create_scroll_copy_packet();
    this.add_scheduled_packet(clip.start_pack() + 1, copy_pkt);
  }

  private schedule_palette_clip(clip: CDGMagic_PALGlobalClip): void {
    this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
  }

  private schedule_bmp_clip(clip: CDGMagic_BMPClip): void {
    if (CDGMagic_CDGExporter.DEBUG)
      console.debug('[schedule_bmp_clip] Starting BMPClip at packet', clip.start_pack(), 'duration:', clip.duration());
    
    const bmpPath = clip.file_path();
    
    if (bmpPath && fs.existsSync(bmpPath)) {
      try {
        const bmpBuffer = fs.readFileSync(bmpPath);
        const bmpData = readBMP(new Uint8Array(bmpBuffer));

        this.internal_palette = bmpData.palette.slice(0, 16);
        if (CDGMagic_CDGExporter.DEBUG)
          console.debug(`[schedule_bmp_clip] Loaded BMP: ${bmpPath} (${bmpData.width}x${bmpData.height}), palette entries 0-15: [${this.internal_palette.map(([r,g,b]) => `(${r},${g},${b})`).join(', ')}]`);

        this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
        this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));

        this.add_scheduled_packet(clip.start_pack() + 2, this.create_border_preset_packet(0));
        for (let i = 0; i < 16; i++) {
          const pkt = this.create_memory_preset_packet(0, i);
          this.add_scheduled_packet(clip.start_pack() + 3 + i, pkt);
        }

        const transitionData: TransitionData | undefined = undefined;

        const fontblocks = bmp_to_fontblocks(
          bmpData,
          clip.start_pack() + 19,
          transitionData,
          undefined,
          CDGMagic_CDGExporter.DEBUG
        );
        if (CDGMagic_CDGExporter.DEBUG)
          console.debug(`[schedule_bmp_clip] Converted BMP to ${fontblocks.length} FontBlocks`);

        this.queue_fontblocks_for_progressive_writing(fontblocks);

      } catch (error) {
        console.warn(`[schedule_bmp_clip] Failed to load BMP ${bmpPath}: ${error}`);
        
        this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
        this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
        this.add_scheduled_packet(clip.start_pack() + 2, this.create_border_preset_packet(0));
        for (let i = 0; i < 16; i++) {
          const pkt = this.create_memory_preset_packet(0, i);
          this.add_scheduled_packet(clip.start_pack() + 3 + i, pkt);
        }
      }
    } else {
      this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
      this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
      this.add_scheduled_packet(clip.start_pack() + 2, this.create_border_preset_packet(0));
      for (let i = 0; i < 16; i++) {
        const pkt = this.create_memory_preset_packet(0, i);
        this.add_scheduled_packet(clip.start_pack() + 3 + i, pkt);
      }
    }
  }

  private encode_fontblocks_to_packets(fontblocks: any[], start_packet: number, max_packets: number): void {
    let packets_scheduled = 0;
    let blocks_skipped = 0;

    for (let idx = 0; idx < fontblocks.length; idx++) {
      if (packets_scheduled >= max_packets) break;

      const fontblock = fontblocks[idx];
      const num_colors = fontblock.num_colors();
      const block_x = fontblock.x_location();
      const block_y = fontblock.y_location();

      if (num_colors === 0) {
        blocks_skipped++;
        continue;
      }

      if (num_colors === 1) {
        const color = fontblock.prominent_color(0);
        const packet = this.create_copy_font_packet(color, color, block_x, block_y, true);
        this.add_scheduled_packet(start_packet + packets_scheduled, packet);
        packets_scheduled++;
      } else if (num_colors === 2) {
        const color0 = fontblock.prominent_color(0);
        const color1 = fontblock.prominent_color(1);
        const packet = this.create_two_color_packet(fontblock, color0, color1, block_x, block_y);
        this.add_scheduled_packet(start_packet + packets_scheduled, packet);
        packets_scheduled++;
      } else {
        const color0 = fontblock.prominent_color(0);
        const color1 = fontblock.prominent_color(1);
        const packet = this.create_two_color_packet(fontblock, color0, color1, block_x, block_y);
        this.add_scheduled_packet(start_packet + packets_scheduled, packet);
        packets_scheduled++;
        
        if (idx === 0 && CDGMagic_CDGExporter.DEBUG)
          console.debug(`[encode_fontblocks] Block(${block_x},${block_y}) has ${num_colors} colors, encoded as 2-color`);
      }
    }

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[encode_fontblocks] Processed ${fontblocks.length} FontBlocks (${blocks_skipped} empty), scheduled ${packets_scheduled} packets`);
  }

  private create_copy_font_packet(color: number, color2: number, tile_x: number, tile_y: number, is_filled: boolean): CDGPacket {
    const payload = new Uint8Array(16);

    payload[0] = color & 0x0f;
    payload[1] = color2 & 0x0f;

    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    for (let i = 0; i < 12; i++) {
      payload[4 + i] = is_filled ? 0x3f : 0x00;
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.TILE_BLOCK,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_two_color_packet(
    fontblock: any,
    color0: number,
    color1: number,
    tile_x: number,
    tile_y: number
  ): CDGPacket {
    const payload = new Uint8Array(16);

    payload[0] = color0 & 0x0f;
    payload[1] = color1 & 0x0f;

    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    for (let row = 0; row < 12; row++) {
      let byte = 0;
      for (let col = 0; col < 6; col++) {
        const pixel_color = fontblock.pixel_value(col, row);
        const bit = pixel_color === color1 ? 1 : 0;
        byte |= (bit << (5 - col));
      }
      payload[4 + row] = byte;
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.TILE_BLOCK,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private add_scheduled_packet(packet_index: number, packet: CDGPacket): void {
    if (!this.internal_packet_schedule.has(packet_index)) {
      this.internal_packet_schedule.set(packet_index, []);
    }
    this.internal_packet_schedule.get(packet_index)!.push(packet);
  }

  private create_load_low_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const color_index = colors[i] || 0;
      const [r_8bit, g_8bit, b_8bit] = this.internal_palette[color_index];

      const r_4bit = Math.floor(r_8bit / 17) & 0x0f;
      const g_4bit = Math.floor(g_8bit / 17) & 0x0f;
      const b_4bit = Math.floor(b_8bit / 17) & 0x0f;

      payload[i * 2] = (r_4bit << 2) | ((g_4bit >> 2) & 0x03);
      payload[i * 2 + 1] = (b_4bit & 0x0f) | ((g_4bit & 0x03) << 4);
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.LOAD_LOW,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_load_high_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const color_index = (colors[i] || 0) % 8;
      const palette_index = 8 + color_index;
      const [r_8bit, g_8bit, b_8bit] = this.internal_palette[palette_index];

      const r_4bit = Math.floor(r_8bit / 17) & 0x0f;
      const g_4bit = Math.floor(g_8bit / 17) & 0x0f;
      const b_4bit = Math.floor(b_8bit / 17) & 0x0f;

      payload[i * 2] = (r_4bit << 2) | ((g_4bit >> 2) & 0x03);
      payload[i * 2 + 1] = (b_4bit & 0x0f) | ((g_4bit & 0x03) << 4);
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.LOAD_HIGH,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_memory_preset_packet(color_index: number, repeat_value: number = 0): CDGPacket {
    const payload = new Uint8Array(16);
    payload[0] = color_index;
    payload[1] = repeat_value;

    if (repeat_value >= 8) {
      const message = 'CD+GMAGIC 001B';
      for (let i = 0; i < message.length && i < 14; i++) {
        const charCode = message.charCodeAt(i);
        payload[2 + i] = ((charCode - 0x20) & 0x3f);
      }
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.MEMORY_PRESET,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_border_preset_packet(color_index: number): CDGPacket {
    const payload = new Uint8Array(16);
    payload[0] = color_index;
    payload[1] = 0;

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.BORDER_PRESET,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_scroll_preset_packet(
    direction: number,
    speed: number,
    x_offset: number,
    y_offset: number
  ): CDGPacket {
    const payload = new Uint8Array(16);
    payload[0] = direction;
    payload[1] = speed;
    payload[2] = x_offset & 0xFF;
    payload[3] = y_offset & 0xFF;

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.SCROLL_PRESET,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  private create_scroll_copy_packet(): CDGPacket {
    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.SCROLL_COPY,
      payload: new Uint8Array(16),
      parity1: 0,
      parity2: 0,
    };
  }

  private create_empty_packet(): CDGPacket {
    return {
      command: 0,
      instruction: 0,
      payload: new Uint8Array(16),
      parity1: 0,
      parity2: 0,
    };
  }

  private schedule_generic_clip(clip: CDGMagic_MediaClip): void {
    const pkt = this.create_empty_packet();
    this.add_scheduled_packet(clip.start_pack(), pkt);
  }

  private pad_to_duration(): void {
    const target = this.internal_duration_packets > 0
      ? this.internal_duration_packets
      : this.internal_total_packets;

    for (let i = this.internal_total_packets; i < target; i++) {
      this.add_scheduled_packet(i, this.create_empty_packet());
    }

    this.internal_total_packets = target;
  }

  private queue_fontblocks_for_progressive_writing(fontblocks: any[]): void {
    for (const fontblock of fontblocks) {
      const start_pack = fontblock.start_pack();
      this.internal_fontblock_queue.push({
        fontblock,
        start_pack,
        written: false,
      });
    }

    this.internal_fontblock_queue.sort((a, b) => a.start_pack - b.start_pack);

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[queue_fontblocks] Queued ${fontblocks.length} FontBlocks for progressive writing`);
  }

  private process_due_fontblocks(current_pack: number): void {
    if (!this.internal_compositor || this.internal_fontblock_queue.length === 0) return;

    for (let i = 0; i < this.internal_fontblock_queue.length; i++) {
      const entry = this.internal_fontblock_queue[i];
      if (entry.written) continue;
      if (entry.start_pack > current_pack) break;

      const fontblock = entry.fontblock;
      const block_x = fontblock.x_location();
      const block_y = fontblock.y_location();
      const z_layer = fontblock.z_location();

      const pixel_data = new Uint16Array(72);
      let idx = 0;

      for (let py = 0; py < 12; py++) {
        for (let px = 0; px < 6; px++) {
          const pixel_color = fontblock.pixel_value(px, py);
          pixel_data[idx++] = pixel_color;
        }
      }

      this.internal_compositor.write_block(block_x, block_y, z_layer, pixel_data);
      entry.written = true;

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(`[process_due_fontblocks] Wrote block(${block_x},${block_y}) at pack ${current_pack}`);
    }
  }

  private create_cdg_packet_from_encoding_instruction(
    instr: { instruction: 'COPY_FONT' | 'XOR_FONT'; color_0: number; color_1: number; pixel_bits: Uint8Array },
    tile_x: number,
    tile_y: number
  ): CDGPacket {
    const payload = new Uint8Array(16);

    payload[0] = instr.color_0 & 0x0f;
    payload[1] = instr.color_1 & 0x0f;

    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    for (let i = 0; i < 12; i++) {
      payload[4 + i] = instr.pixel_bits[i] & 0x3f;
    }

    return {
      command: CDG_COMMAND,
      instruction: instr.instruction === 'COPY_FONT' ? CDGInstruction.TILE_BLOCK : CDGInstruction.XOR_FONT,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }
}

// VIM: set ft=typescript :
// END
