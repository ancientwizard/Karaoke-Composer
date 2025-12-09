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

/**
 * CD+G Instruction Codes (byte 1 of packet) for TV Graphics mode (0x09)
 * Command byte (byte 0) is always 0x09 for TV Graphics mode
 */
enum CDGInstruction {
  MEMORY_PRESET     = 0x01,  // Screen clear/preset
  BORDER_PRESET     = 0x02,  // Border color
  TILE_BLOCK        = 0x06,  // Tile data update (COPY_FONT)
  XOR_FONT          = 0x26,  // XOR font block
  SCROLL_PRESET     = 0x14,  // Scroll setup
  SCROLL_COPY       = 0x18,  // Scroll execute
  TRANSPARENT_COLOR = 0x1C, // Set transparent color index
  LOAD_LOW          = 0x1E,  // Load palette entries 0-7 (LOAD_CLUT_LO)
  LOAD_HIGH         = 0x1F,  // Load palette entries 8-15 (LOAD_CLUT_HI)
}

/**
 * CD+G Command Code (always 0x09 for TV Graphics)
 */
const CDG_COMMAND = 0x09;

/**
 * CD+G Packet Structure (24 bytes)
 */
interface CDGPacket {
  command: number;           // Byte      0: Command code
  instruction: number;       // Byte      1: Instruction/subtype
  payload: Uint8Array;       // Bytes  4-19: 16-byte payload
  parity1: number;           // Bytes   2-3: Parity
  parity2: number;           // Bytes 20-23: Parity
}

/**
 * CDGExporter: Main export orchestrator
 *
 * Responsibilities:
 * - Generate CD+G packets from clip timeline
 * - Manage color palette scheduling
 * - Coordinate text and bitmap rendering
 * - Produce binary CDG file format
 * - Handle screen resets and transitions
 *
 * CD+G Specification:
 * - 24-byte packets at 300 packets/second
 * - 4,320 packets per minute
 * - Packet format: [cmd, instr, parity, payload(16), parity]
 * - Display: 320×192 pixels, 16-color palette
 */
export
class CDGMagic_CDGExporter {
  // Output console.debug() only when true
  public static DEBUG: boolean = false;

  // Packet schedule: packet_index → array of packets at that index
  private internal_packet_schedule: Map<number, CDGPacket[]>;

  // Color palette: 16 RGB colors (0-15)
  private internal_palette: Array<[number, number, number]>;

  // Clip registry
  private internal_clips: CDGMagic_MediaClip[];

  // Global packet counter
  private internal_total_packets: number;

  // Export configuration
  private internal_duration_packets: number;
  private internal_use_reference_prelude: boolean;

  // Multi-layer compositor buffer (Phase 1.3: Compositor Integration)
  private internal_compositor: CompositorBuffer | null;

  // VRAM buffer for change detection (Phase 2: Rendering Pipeline)
  private internal_vram: VRAMBuffer | null;

  // FontBlock queue for time-based writing (ensures progressive transitions)
  // Sorted by start_pack value; blocks written only when their time arrives
  private internal_fontblock_queue: Array<{
    fontblock: any;
    start_pack: number;
    written: boolean;
  }> = [];

  /**
   * Constructor: Create exporter
   *
   * @param duration_packets Target duration in packets (0 = auto-detect)
   */
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

  /**
   * Initialize default 16-color palette (CD+G standard)
   *
   * @returns Array of [R, G, B] tuples for colors 0-15
   */
  private init_default_palette(): Array<[number, number, number]> {
    // CD+G standard palette: 16 colors, 8-bit RGB per channel (0-255)
    // Divided by 17 to get 4-bit values during packet encoding
    const palette: Array<[number, number, number]> = [
      [0, 0, 0],           // 0: Black
      [0, 0, 255],         // 1: Blue
      [255, 0, 0],         // 2: Red
      [255, 0, 255],       // 3: Magenta
      [0, 255, 0],         // 4: Green
      [0, 255, 255],       // 5: Cyan
      [255, 255, 0],       // 6: Yellow
      [255, 255, 255],     // 7: White
      [0, 0, 0],           // 8-15: Repeat or custom
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

  /**
   * Register a clip for export
   *
   * @param clip MediaClip to register
   * @returns True if registered successfully
   */
  register_clip(clip: CDGMagic_MediaClip): boolean {
    if (!clip || clip.duration() <= 0) {
      return false;
    }

    this.internal_clips.push(clip);

    // Update total duration to include this clip
    const clip_end = clip.start_pack() + clip.duration();
    if (clip_end > this.internal_total_packets) {
      this.internal_total_packets = clip_end;
    }

    return true;
  }

  /**
   * Get registered clip count
   *
   * @returns Number of clips
   */
  clip_count(): number {
    return this.internal_clips.length;
  }

  /**
   * Set palette colors (0-15)
   *
   * @param palette Array of [R, G, B] tuples (6-bit values 0-63)
   */
  set_palette(palette: Array<[number, number, number]>): void {
    if (palette.length !== 16) {
      throw new Error('Palette must have exactly 16 colors');
    }
    this.internal_palette = palette;
  }

  /**
   * Generate initial packets (prelude)
   *
   * Creates standard CD+G initialization sequence:
   * - LOAD_LOW palette entries 0-7
   * - LOAD_HIGH palette entries 8-15
   * - MEMORY_PRESET clear screen
   * - BORDER_PRESET set border
   *
   * @returns Array of initialization packets
   */
  private generate_prelude(): CDGPacket[] {
    const prelude: CDGPacket[] = [];

    // Load low palette (colors 0-7)
    prelude.push(this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));

    // Load high palette (colors 8-15)
    prelude.push(this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));

    // Clear screen to black
    prelude.push(this.create_memory_preset_packet(0)); // Color 0 = black

    // Set border to black
    prelude.push(this.create_border_preset_packet(0));

    return prelude;
  }

  /**
   * Schedule packets for all registered clips
   *
   * @returns Total packets generated
   */
  schedule_packets(): number {
    // Clear existing schedule
    this.internal_packet_schedule.clear();
    this.internal_fontblock_queue = [];  // Reset FontBlock queue

    // Initialize multi-layer compositor (Phase 1.3)
    // This will receive all clip data and composite layers before generating packets
    this.internal_compositor = new CompositorBuffer(300, 216);
    this.internal_compositor.set_preset_index(0);

    // Initialize VRAM buffer (Phase 2: Rendering Pipeline Optimization)
    // This tracks on-screen state to detect which blocks changed
    this.internal_vram = new VRAMBuffer(300, 216);

    // Note: Do NOT add prelude at packet 0. Each clip (BMPClip, etc.) handles its own
    // palette setup at its start time. This matches the reference C++ implementation
    // and ensures proper synchronization of graphics data.

    // Inject synthetic PALGlobalClip events to reset scroll offsets
    // C++ creates these automatically; TypeScript must add them explicitly
    // Reference: CDGMagic_PALGlobalClip::CDGMagic_PALGlobalClip() with start_offset=250
    this.inject_scroll_reset_packets();

    // Process each clip - queues FontBlocks instead of writing immediately
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

    // CRITICAL: Process FontBlocks incrementally, respecting their start_pack() values
    // This implements progressive transition reveals matching C++ reference behavior
    this.process_fontblocks_incrementally();

    // Pad to target duration
    this.pad_to_duration();

    return this.internal_total_packets;
  }

  /**
   * Process queued FontBlocks incrementally across the timeline
   *
   * Implements C++ encoder's packet-by-packet processing where blocks are written
   * only when their scheduled time arrives. This ensures proper transition effects.
   *
   * Algorithm:
   * 1. Sort FontBlocks by start_pack() (already done in queue_fontblocks_for_progressive_writing)
   * 2. For each packet in timeline, write blocks due at that time
   * 3. Encode only newly-written blocks (via VRAM change detection)
   *
   * This matches the C++ reference implementation's:
   *   while (current_pack < current_length) {
   *     if (playout_queue.front()->start_pack() <= current_pack) {
   *       write_fontblock(current_pack, block);
   *       current_pack = write_fontblock(...);
   *     }
   *     current_pack++;
   *   }
   */
  private process_fontblocks_incrementally(): void {
    if (!this.internal_compositor || !this.internal_vram || this.internal_fontblock_queue.length === 0) {
      return;
    }

    // Get max packet number from scheduled packets
    const max_packet = Math.max(
      ...Array.from(this.internal_packet_schedule.keys()),
      this.internal_total_packets
    );

    // Step through each packet and process due FontBlocks
    for (let current_pack = 0; current_pack < max_packet + 300; current_pack++) {
      // Check if any FontBlocks are due at this packet
      this.process_due_fontblocks(current_pack);

      // Encode any blocks that changed at this packet
      this.encode_changed_blocks_to_packets(current_pack);
    }

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[process_fontblocks_incrementally] Processed ${this.internal_fontblock_queue.length} FontBlocks incrementally`);
  }

  /**
   * Encode blocks that changed at current_pack to CD+G packets
   *
   * Uses change detection via VRAM to only write blocks that were modified.
   * Packets are scheduled at the current_pack position.
   *
   * @param current_pack Current packet position
   */
  private encode_changed_blocks_to_packets(current_pack: number): void {
    if (!this.internal_compositor || !this.internal_vram) return;

    const SCREEN_TILES_WIDE = 50;
    const SCREEN_TILES_HIGH = 18;
    let packets_added = 0;

    for (let block_y = 0; block_y < SCREEN_TILES_HIGH; block_y++) {
      for (let block_x = 0; block_x < SCREEN_TILES_WIDE; block_x++) {
        // Read composited block from compositor
        const composited_block = this.internal_compositor.read_composited_block(block_x, block_y);

        // Convert Uint16Array from compositor to Uint8Array for VRAM (values 0-255 only)
        const composited_block_8bit = new Uint8Array(72);
        for (let i = 0; i < 72; i++) {
          // Transparency (256) becomes 0 for VRAM comparison
          composited_block_8bit[i] = composited_block[i] < 256 ? composited_block[i] : 0;
        }

        // Phase 2: Check if block differs from current VRAM state
        if (this.internal_vram.block_matches(block_x, block_y, composited_block_8bit)) {
          // Block is identical to on-screen, skip writing
          continue;
        }

        // Block differs from VRAM, need to write packet(s)
        // Use MultiColorEncoder for sophisticated encoding
        const encoding = encode_block(composited_block);

        // Generate packets from encoding instructions
        for (const instr of encoding.instructions) {
          // Create packet based on instruction type
          const packet = this.create_cdg_packet_from_encoding_instruction(
            instr,
            block_x,
            block_y
          );
          this.add_scheduled_packet(current_pack, packet);
          packets_added++;
        }

        // Update VRAM with newly written block
        this.internal_vram.write_block(block_x, block_y, composited_block_8bit);
      }
    }

    if (packets_added > 0 && CDGMagic_CDGExporter.DEBUG)
      console.debug(`[encode_changed_blocks] Pack ${current_pack}: added ${packets_added} packets`);
  }

  /**
   * Inject synthetic SCROLL_COPY packets to reset offsets
   *
   * The C++ application creates PALGlobalClip events automatically with:
   * - start_offset = 250 (absolute packet position on track 0)
   * - x_scroll = 0, y_scroll = 0
   * 
   * This generates SCROLL_COPY (0x18) packets to reset scroll state.
   * The packet is placed at absolute packet 250 (not relative to clip start).
   */
  private inject_scroll_reset_packets(): void {
    // The C++ reference implementation places the scroll reset at packet 250 (absolute)
    // This is about 833ms from the beginning of the track (300 packets/second)
    // See CDGMagic_PALGlobalClip constructor: start_offset = 250
    const scroll_reset_packet = 250;

    // Create SCROLL_COPY packet: sets x_scroll=0, y_scroll=0
    // Packet format: [0x09, 0x18, data[0], data[1], ...]
    // data[1] = x_offset, data[2] = y_offset
    const packet: CDGPacket = {
      command: CDG_COMMAND,
      instruction: CDGInstruction.SCROLL_COPY,
      payload: new Uint8Array(16),  // All zeros
      parity1: 0,
      parity2: 0,
    };

    // Set scroll offsets to 0 in data[1] and data[2]
    packet.payload[1] = 0;  // x_offset = 0
    packet.payload[2] = 0;  // y_offset = 0

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[inject_scroll_reset_packets] Injecting SCROLL_COPY at packet ${scroll_reset_packet}`);
    this.add_scheduled_packet(scroll_reset_packet, packet);
  }

  /**
   * Schedule packets for TextClip
   *
   * Follows C++ reference implementation (CDGMagic_TextClip.cpp):
   * - Renders text using configured font properties
   * - For TITLES mode: each line rendered separately at vertical offset
   * - Calculates line_height based on font_size + border_size
   * - Creates one BMPObject per line (stored as separate event)
   * - Properly centers text (both horizontal and vertical)
   *
   * @param clip TextClip to schedule
   */
  private schedule_text_clip(clip: CDGMagic_TextClip): void {
    if (CDGMagic_CDGExporter.DEBUG)
      console.debug('[schedule_text_clip] Starting TextClip at packet', clip.start_pack(), 'duration:', clip.duration());

    // Get text properties
    const textContent = clip.text_content();
    let foregroundColor = clip.foreground_color();
    let backgroundColor = clip.background_color();
    const fontIndex = clip.font_index();
    const fontSize = clip.font_size();
    const outlineColor = (clip as any).outline_color?.() || 0;
    const antialiasMode = clip.antialias_mode();
    const karaokeMode = (clip as any).karaoke_mode?.() || 0;  // 0 = TITLES

    // Clamp colors to palette range
    foregroundColor = Math.min(15, Math.max(0, foregroundColor));
    backgroundColor = Math.min(15, Math.max(0, backgroundColor));

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(
        `[schedule_text_clip] Font: index=${fontIndex}, size=${fontSize}, ` +
        `FG=${foregroundColor}, BG=${backgroundColor}, ` +
        `outline=${outlineColor}, aa=${antialiasMode}, karaoke=${karaokeMode}`
      );

    // Load palette
    this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));

    // Schedule border preset (only if enabled)
    const textBorderIndex = clip.border_index();
    if (textBorderIndex < 16) {
      const textBorderColor = clip.frame_index();
      this.add_scheduled_packet(clip.start_pack() + 2, this.create_border_preset_packet(textBorderColor));
    }

    // Schedule memory preset (only if enabled)
    const textMemoryIndex = clip.memory_preset_index();
    if (textMemoryIndex < 16) {
      const textClearColor = clip.box_index();
      this.add_scheduled_packet(clip.start_pack() + 3, this.create_memory_preset_packet(textClearColor));
    }

    // Split text into lines
    const lines = textContent.split('\n');

    // Get actual font dimensions (in pixels, not points)
    const fontPixelHeight = getFontHeight(fontSize);
    
    // For CD+G layout, still use tile grid for alignment
    // but text height is based on actual font metrics
    const blkHeight = Math.ceil(fontPixelHeight / 12.0);
    const lineHeight = blkHeight * 12;
    const linesPerPage = Math.floor(192 / lineHeight);

    // Extract positioning based on karaoke mode
    // MODE_0 (TITLES): computed layout using lines_per_page formula
    // Other modes: explicit xOffset/yOffset from CMP events
    const events = (clip as any)._events || [];
    const firstEvent = events.length > 0 ? events[0] : null;
    let textXOffset: number;
    let textYOffset: number;
    let useComputedLayout = false;

    // KaraokeModes.MODE_0 = TITLES (default, uses computed layout)
    if (karaokeMode === 0) {
      // Computed layout: x=6 (left margin), y uses formula per line
      textXOffset = 6;  // Left margin per C++ line 341
      useComputedLayout = true;
      textYOffset = 12; // Base offset (will be computed per line in loop)

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(`[schedule_text_clip] Using TITLES mode (karaoke_mode=0) computed layout`);
    } else {
      // Other karaoke modes: use explicit xOffset/yOffset from CMP events
      textXOffset = 6;  // Default if not specified
      textYOffset = 12; // Default if not specified

      if (firstEvent) {
        if (firstEvent.xOffset !== undefined && firstEvent.xOffset !== null) {
          textXOffset = Number(firstEvent.xOffset) || 6;
        }
        if (firstEvent.yOffset !== undefined && firstEvent.yOffset !== null) {
          textYOffset = Number(firstEvent.yOffset) || 12;
        }
      }

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(
          `[schedule_text_clip] Using karaoke_mode=${karaokeMode} with explicit offsets: x=${textXOffset}, y=${textYOffset}`
        );
    }

    if (CDGMagic_CDGExporter.DEBUG) {
      if (useComputedLayout) {
        console.debug(
          `[schedule_text_clip] TITLES mode: fontPixelHeight=${fontPixelHeight}, lineHeight=${lineHeight}, linesPerPage=${linesPerPage}`
        );
      } else {
        console.debug(
          `[schedule_text_clip] Mode ${karaokeMode}: textXOffset=${textXOffset}, textYOffset=${textYOffset}`
        );
      }
    }

    // C++ PATTERN: Create one full-screen BMP for all lines, positioned at correct Y offsets
    const screenWidth = 288;
    const screenHeight = 216;  // Full CD+G height
    const screenBmpPixels = new Uint8Array(screenWidth * screenHeight);
    screenBmpPixels.fill(backgroundColor);

    // Render each line at its vertical offset
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx] || '';
      if (lineText.length === 0) continue;

      // Calculate Y position based on layout mode
      let lineYPixels: number;
      if (useComputedLayout) {
        // TITLES mode: y_offset = (line_index % lines_per_page) * line_height + 12
        lineYPixels = (lineIdx % linesPerPage) * lineHeight + 12;
      } else {
        // Other modes: y_offset = textYOffset + (line_index * line_height)
        lineYPixels = textYOffset + (lineIdx * lineHeight);
      }

      if (lineYPixels + lineHeight > screenHeight) continue;  // Skip if off-screen

      // X position is explicit from CMP xOffset
      const leftStart = textXOffset;
      // Center vertically within line: top_start = (line_height - font_height) / 2 + font_height
      const topStart = Math.floor((lineHeight - fontPixelHeight) / 2) + fontPixelHeight + lineYPixels;

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(
          `[schedule_text_clip] Line ${lineIdx}: y=${lineYPixels}, topStart=${topStart}, text="${lineText.substring(0, 30)}"`
        );

      // Render each character of the line using pre-rendered fonts
      let charPixelX = leftStart;
      for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
        const char = lineText[charIdx]!;
        
        // Get native pre-rendered character data
        const charData = getRawCharacterFromFont(char, fontSize);
        
        if (charData) {
          // Use pre-rendered font at native size
          const charWidth = charData.width;
          const charHeight = charData.height;
          const srcData = charData.data;

          // Calculate top position for this character (baseline alignment)
          const charTopPixel = topStart - charHeight;  // Align to baseline

          // Draw character bitmap into screen BMP
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
          // Fallback to old tile-based rendering if font not found
          const tileData = renderTextToTile(char, foregroundColor, backgroundColor);
          const color1 = tileData[0] as number;
          const color2 = tileData[1] as number;
          const bitmap = tileData[2] as Uint8Array;

          // Draw character bitmap into screen BMP (6×12 pixels)
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

          charPixelX += 6;  // Fallback uses 6-pixel width
        }
      }
    }

    // Create BMP data for the full screen
    const screenBmpData = {
      width: screenWidth,
      height: screenHeight,
      bitsPerPixel: 8,
      palette: this.internal_palette.slice(0, 16),
      pixels: screenBmpPixels
    };

    // Convert full-screen BMP to FontBlocks
    const fontblocks = bmp_to_fontblocks(
      screenBmpData,
      clip.start_pack() + 3,
      undefined,  // Use default transition
      (clip as any).track_options?.(),
      CDGMagic_CDGExporter.DEBUG
    );

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(
        `[schedule_text_clip] Converted ${lines.length} lines to ${fontblocks.length} FontBlocks`
      );

    // Queue FontBlocks
    this.queue_fontblocks_for_progressive_writing(fontblocks);
  }

  /**
   * Schedule packets for ScrollClip
   *
   * @param clip ScrollClip to schedule
   */
  private schedule_scroll_clip(clip: CDGMagic_ScrollClip): void {
    // Schedule scroll preset packet
    const scroll_pkt = this.create_scroll_preset_packet(
      clip.scroll_direction(),
      clip.scroll_speed(),
      clip.x_offset(),
      clip.y_offset()
    );

    this.add_scheduled_packet(clip.start_pack(), scroll_pkt);

    // Schedule scroll execute packet
    const copy_pkt = this.create_scroll_copy_packet();
    this.add_scheduled_packet(clip.start_pack() + 1, copy_pkt);
  }

  /**
   * Schedule packets for PALGlobalClip
   *
   * @param clip PALGlobalClip to schedule
   */
  private schedule_palette_clip(clip: CDGMagic_PALGlobalClip): void {
    // Schedule palette load packets at clip start
    this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
  }

  /**
   * Schedule packets for BMPClip
   *
   * @param clip BMPClip to schedule
   */
  private schedule_bmp_clip(clip: CDGMagic_BMPClip): void {
    if (CDGMagic_CDGExporter.DEBUG)
      console.debug('[schedule_bmp_clip] Starting BMPClip at packet', clip.start_pack(), 'duration:', clip.duration());
    
    // Load BMP to extract spatial layout (pixel indices) AND palette colors
    // The BMP file contains the actual RGB colors for each palette entry
    // CD+G palette packets (LOAD_LOW/LOAD_HIGH) load these into display slots
    if ((clip as any)._bmp_events && (clip as any)._bmp_events.length > 0) {
      const bmpEvent = (clip as any)._bmp_events[0];
      const bmpPath = bmpEvent.bmp_path || bmpEvent.bmpPath || bmpEvent.path;
      const transitionPath = bmpEvent.transition_file || bmpEvent.transitionFile || '';
      
      if (bmpPath && fs.existsSync(bmpPath)) {
        try {
          // Load BMP file for pixel data AND palette colors
          const bmpBuffer = fs.readFileSync(bmpPath);
          const bmpData = readBMP(new Uint8Array(bmpBuffer));

          // Use the BMP's actual palette colors (not standard palette!)
          // The BMP palette contains the real colors to display
          this.internal_palette = bmpData.palette.slice(0, 16);
          if (CDGMagic_CDGExporter.DEBUG)
            console.debug(`[schedule_bmp_clip] Loaded BMP: ${bmpPath} (${bmpData.width}x${bmpData.height}), palette entries 0-15: [${this.internal_palette.map(([r,g,b]) => `(${r},${g},${b})`).join(', ')}]`);

          // Schedule palette packets with the BMP's actual colors
          // This maps BMP pixel indices to the display colors defined in the BMP file
          this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
          this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));

          // Schedule screen initialization packets (following C++ reference order)
          // First: set border color (only if enabled)
          let nextOffset = 2;
          const bmpBorderIndex = bmpEvent.border_index ?? 16;
          if (bmpBorderIndex < 16) {
            const bmpBorderColor = bmpEvent.border_index;
            this.add_scheduled_packet(clip.start_pack() + nextOffset, this.create_border_preset_packet(bmpBorderColor));
            nextOffset++;
          }

          // Then: schedule MEMORY_PRESET packets to clear screen (only if enabled)
          const bmpMemoryIndex = bmpEvent.memory_preset_index ?? 16;
          if (bmpMemoryIndex < 16) {
            const bmpClearColor = bmpMemoryIndex;
            // Schedule 16 MEMORY_PRESET packets as per C++ standard practice
            for (let i = 0; i < 16; i++) {
              const pkt = this.create_memory_preset_packet(bmpClearColor, i);
              this.add_scheduled_packet(clip.start_pack() + nextOffset + i, pkt);
            }
            nextOffset += 16;
          }

          // Load transition file if available, otherwise use default (sequential) ordering
          let transitionData: TransitionData | undefined;
          if (transitionPath && fs.existsSync(transitionPath)) {
            try {
              const loaded = loadTransitionFile(transitionPath);
              if (loaded) {
                transitionData = loaded;
                if (CDGMagic_CDGExporter.DEBUG)
                  console.debug(`[schedule_bmp_clip] Loaded transition: ${transitionPath} (${transitionData.length} blocks)`);
              }
            }

            catch (transError) {
              console.warn(`[schedule_bmp_clip] Failed to load transition ${transitionPath}: ${transError}`);
              transitionData = undefined; // Fall back to default
            }
          }

          // Convert BMP to FontBlocks with transition ordering (if available)
          const fontblocks = bmp_to_fontblocks(
            bmpData,
            clip.start_pack() + 19,
            transitionData,
            (clip as any).track_options?.(),  // Pass track options for z_location and channel assignment
            CDGMagic_CDGExporter.DEBUG
          );
          if (CDGMagic_CDGExporter.DEBUG)
            console.debug(`[schedule_bmp_clip] Converted BMP to ${fontblocks.length} FontBlocks`);

          // CRITICAL: Queue FontBlocks for time-based progressive writing instead of writing immediately
          // This ensures transitions work by spreading blocks across packets based on their start_pack() values
          // Matches C++ reference implementation: blocks written only when their scheduled time arrives
          this.queue_fontblocks_for_progressive_writing(fontblocks);

        }

        catch (error) {
          console.warn(`[schedule_bmp_clip] Failed to load BMP ${bmpPath}: ${error}`);
          
          // Fall back to default palette and empty screen
          this.add_scheduled_packet(clip.start_pack(), this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
          this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));
          this.add_scheduled_packet(clip.start_pack() + 2, this.create_border_preset_packet(0));
          for (let i = 0; i < 16; i++) {
            const pkt = this.create_memory_preset_packet(0, i);
            this.add_scheduled_packet(clip.start_pack() + 3 + i, pkt);
          }
        }
      }
    }
  }

  /**
   * Encode FontBlocks to CD+G packets using intelligent color compression
   *
   * Implements the packet encoding strategies from CD+G Magic:
   * - 1 color: 1 COPY_FONT packet with all bits set (0x3F)
   * - 2 colors: 1 COPY_FONT packet with bits indicating color selection
   * - 3 colors: 1 COPY_FONT + 1 XOR_FONT packet pair
   * - 4+ colors: bitplane decomposition (multiple packets)
   *
   * @param fontblocks Array of FontBlock instances to encode
   * @param start_packet Starting packet number
   * @param max_packets Maximum packets available
   */
  private encode_fontblocks_to_packets( fontblocks: any[], start_packet: number, max_packets: number )
    : void
  {
    let packets_scheduled = 0;
    let blocks_skipped = 0;

    for (let idx = 0; idx < fontblocks.length; idx++) {
      if (packets_scheduled >= max_packets) break;

      const fontblock = fontblocks[idx];
      const num_colors = fontblock.num_colors();
      const block_x = fontblock.x_location();
      const block_y = fontblock.y_location();

      if (num_colors === 0) {
        // Empty block, skip
        blocks_skipped++;
        continue;
      }

      if (num_colors === 1) {
        // Single color: 1 packet, all pixels the same
        const color = fontblock.prominent_color(0);
        const packet = this.create_copy_font_packet(color, color, block_x, block_y, true);
        this.add_scheduled_packet(start_packet + packets_scheduled, packet);
        packets_scheduled++;
      } else if (num_colors === 2) {
        // Two colors: 1 packet with bit encoding
        const color0 = fontblock.prominent_color(0);
        const color1 = fontblock.prominent_color(1);
        const packet = this.create_two_color_packet(fontblock, color0, color1, block_x, block_y);
        this.add_scheduled_packet(start_packet + packets_scheduled, packet);
        packets_scheduled++;
      } else {
        // 3+ colors: use bitplane decomposition
        // For now, just encode as 2-color using top 2 colors
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

  /**
   * Create a 1-color COPY_FONT packet (all pixels the same)
   * @param color Color index (0-15)
   * @param tile_x Tile X coordinate (0-49)
   * @param tile_y Tile Y coordinate (0-17)
   * @param is_filled Whether all bits should be set (0x3F)
   */
  private create_copy_font_packet( color: number, color2: number, tile_x: number, tile_y: number, is_filled: boolean )
    : CDGPacket
  {
    const payload = new Uint8Array(16);

    // Colors
    payload[0] = color & 0x0f;
    payload[1] = color2 & 0x0f;

    // Coordinates
    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    // Pixel data - for single color, all bits set means "use this color"
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

  /**
   * Create a 2-color COPY_FONT packet
   * Each bit indicates which of 2 colors to use for that pixel
   */
  private create_two_color_packet(
    fontblock: any,
    color0: number,
    color1: number,
    tile_x: number,
    tile_y: number
  ): CDGPacket {
    const payload = new Uint8Array(16);

    // Colors
    payload[0] = color0 & 0x0f;
    payload[1] = color1 & 0x0f;

    // Coordinates
    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    // Pixel data - bit encoding
    // Following C++ reference: bits are arranged as (5-col), with leftmost pixel at bit 5
    for (let row = 0; row < 12; row++) {
      let byte = 0;
      for (let col = 0; col < 6; col++) {
        const pixel_color = fontblock.pixel_value(col, row);
        // Bit is 1 if pixel is color1, 0 if color0
        const bit = pixel_color === color1 ? 1 : 0;
        // Shift bit to correct position: leftmost pixel (col=0) goes to bit 5
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

  /**
   * Render BMP image to CD+G tile blocks
   * 
   * CD+G display is 300×216 pixels = 50 tiles wide × 18 tiles high
   * Each tile is 6×12 pixels
   *
   * @param start_packet Starting packet number
   * @param bmpData BMP pixel data and palette
   * @param max_packets Maximum packets available for tiles
   */
  private render_bmp_to_tiles(start_packet: number, bmpData: any, max_packets: number): void {
    const SCREEN_TILES_WIDE = 50;
    const SCREEN_TILES_HIGH = 18;
    const TILE_WIDTH = 6;
    const TILE_HEIGHT = 12;

    // Scale BMP to fit CD+G display
    const bmpScaleX = bmpData.width / (SCREEN_TILES_WIDE * TILE_WIDTH);
    const bmpScaleY = bmpData.height / (SCREEN_TILES_HIGH * TILE_HEIGHT);

    console.debug(`[render_bmp_to_tiles] BMP: ${bmpData.width}x${bmpData.height}, ScaleX: ${bmpScaleX}, ScaleY: ${bmpScaleY}`);
    console.debug(`[render_bmp_to_tiles] Pixel data length: ${bmpData.pixels?.length || 'null'}`);

    let packets_scheduled = 0;

    // Render each tile on screen
    for (let tile_y = 0; tile_y < SCREEN_TILES_HIGH && packets_scheduled < max_packets; tile_y++) {
      for (let tile_x = 0; tile_x < SCREEN_TILES_WIDE && packets_scheduled < max_packets; tile_x++) {
        // Sample BMP pixels for this tile
        const tile_data = this.sample_bmp_tile(bmpData, tile_x, tile_y, bmpScaleX, bmpScaleY);
        
        if (tile_data) {
          // Create tile block packet
          const packet = this.create_tile_block_packet(tile_data, tile_x, tile_y);
          this.add_scheduled_packet(start_packet + packets_scheduled, packet);
          packets_scheduled++;
        }
      }
    }

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[render_bmp_to_tiles] Rendered ${packets_scheduled} tile packets`);
  }

  /**
   * Sample BMP pixels for a single tile and determine colors
   * Returns [color1, color2, pixel_data] or null if tile is empty
   */
  private sample_bmp_tile(
    bmpData: any,
    tile_x: number,
    tile_y: number,
    scaleX: number,
    scaleY: number
  ): [number, number, Uint8Array] | null {
    const TILE_WIDTH = 6;
    const TILE_HEIGHT = 12;

    // Map tile position to BMP pixel position
    const bmp_x = Math.floor(tile_x * TILE_WIDTH * scaleX);
    const bmp_y = Math.floor(tile_y * TILE_HEIGHT * scaleY);

    // Find the two most common colors in this tile region
    const colorCounts: Map<number, number> = new Map();

    for (let py = 0; py < TILE_HEIGHT; py++) {
      for (let px = 0; px < TILE_WIDTH; px++) {
        const src_x = Math.floor(bmp_x + px * scaleX);
        const src_y = Math.floor(bmp_y + py * scaleY);

        if (src_x < bmpData.width && src_y < bmpData.height) {
          const pixel_idx = src_y * bmpData.width + src_x;
          if (pixel_idx < bmpData.pixels.length) {
            const color = bmpData.pixels[pixel_idx]!;
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
        }
      }
    }

    // Find two most common colors
    const colors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([color]) => color % 16); // Clamp to 16 colors

    const color1 = colors[0] || 0;
    const color2 = colors[1] || color1;

    // Debug first few tiles
    if (tile_x === 0 && tile_y === 0 && CDGMagic_CDGExporter.DEBUG)
      console.debug(`[sample_bmp_tile] Tile(0,0): bmp_pos=(${bmp_x},${bmp_y}), colors=${color1},${color2}, colorCounts=${colorCounts.size}`);

    // Generate pixel data using the two colors
    // Following C++ reference: bits are arranged as (5-x_pos), with leftmost pixel at bit 5
    const pixelData = new Uint8Array(12);
    for (let py = 0; py < TILE_HEIGHT; py++) {
      let byte = 0;
      for (let px = 0; px < TILE_WIDTH; px++) {
        const src_x = Math.floor(bmp_x + px * scaleX);
        const src_y = Math.floor(bmp_y + py * scaleY);

        let bit = 0;
        if (src_x < bmpData.width && src_y < bmpData.height) {
          const pixel_idx = src_y * bmpData.width + src_x;
          if (pixel_idx < bmpData.pixels.length) {
            const pixel_color = bmpData.pixels[pixel_idx]! % 16;
            // Use simple nearest-color matching
            bit = Math.abs(pixel_color - color1) <= Math.abs(pixel_color - color2) ? 0 : 1;
          }
        }

        // Shift bit to correct position: leftmost pixel (px=0) goes to bit 5
        byte |= (bit << (5 - px));
      }
      pixelData[py] = byte;
    }

    return [color1, color2, pixelData];
  }

  /**
   * Create tile block packet from color and pixel data
   */
  private create_tile_block_packet(
    tile_data: [number, number, Uint8Array],
    tile_x: number,
    tile_y: number
  ): CDGPacket {
    const [color1, color2, pixelData] = tile_data;
    const payload = new Uint8Array(16);

    // Tile block format: [color1, color2, y_block, x_block, ...pixel_data]
    payload[0] = color1 & 0x0f;
    payload[1] = color2 & 0x0f;
    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    // Copy pixel data
    for (let i = 0; i < Math.min(12, pixelData.length); i++) {
      payload[4 + i] = pixelData[i]!;
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.TILE_BLOCK,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  /**
   * Add test pattern tiles to prove the rendering pipeline works
   *
   * Creates a colorful test pattern filling as much of the screen as possible
   * given the number of available packets.
   *
   * Screen layout:
   * - 50 tiles wide (X: 0-49)
   * - 18 tiles high (Y: 0-17)
   * - Each packet is one tile (6×12 pixels)
   *
   * @param start_packet Starting packet number for test pattern
   * @param max_tiles Maximum number of tiles to create (limited by clip duration)
   */
  private add_test_pattern_tiles(start_packet: number, max_tiles: number): void {
    let packet_offset = 0;
    let tiles_created = 0;
    const tile_positions: Array<{x: number; y: number; color: number}> = [];

    // Fill screen with colored tiles, creating a visible grid pattern
    for (let tile_y = 0; tile_y < 18 && tiles_created < max_tiles; tile_y++) {
      for (let tile_x = 0; tile_x < 50 && tiles_created < max_tiles; tile_x++) {
        // Generate test pattern colors
        const color1 = ((tile_x + tile_y) % 7) + 1;  // Cycle through colors 1-7
        const color2 = ((tile_x + tile_y + 3) % 7) + 1;

        // Track first few tile positions for debugging
        if (tile_positions.length < 10) {
          tile_positions.push({x: tile_x, y: tile_y, color: color1});
        }

        // Create tile packet
        const tilePacket = this.create_test_pattern_tile(tile_x, tile_y, color1, color2);
        this.add_scheduled_packet(start_packet + packet_offset, tilePacket);

        packet_offset++;
        tiles_created++;
      }
    }

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug('[add_test_pattern_tiles] Created', tiles_created, 'tile packets. Sample positions:', tile_positions);
  }

  /**
   * Create a single test pattern tile packet
   *
   * @param tile_x X coordinate (0-49)
   * @param tile_y Y coordinate (0-17)
   * @param color1 Primary color index (0-15)
   * @param color2 Secondary color index (0-15)
   * @returns TILE_BLOCK packet
   */
  private create_test_pattern_tile(
    tile_x: number,
    tile_y: number,
    color1: number,
    color2: number
  ): CDGPacket {
    const payload = new Uint8Array(16);

    // Tile block packet structure:
    // Bytes 0-1: color indices
    // Bytes 2-3: Y and X tile coordinates
    // Bytes 4-15: pixel bitmap data
    payload[0] = color1 & 0x0f;
    payload[1] = color2 & 0x0f;
    payload[2] = tile_y & 0x1f;  // Y: 5 bits (0-17)
    payload[3] = tile_x & 0x3f;  // X: 6 bits (0-49)

    // Generate pixel data: all bits set to 0 means all pixels use color1
    // (bit 0 = color1, bit 1 = color2)
    for (let row = 0; row < 12; row++) {
      payload[4 + row] = 0x00;  // All pixels -> color1
    }

    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.TILE_BLOCK,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  /**
   * Schedule packets for generic MediaClip
   *
   * @param clip MediaClip to schedule
   */
  private schedule_generic_clip(clip: CDGMagic_MediaClip): void {
    // Add empty packets to maintain timing
    const pkt = this.create_empty_packet();
    this.add_scheduled_packet(clip.start_pack(), pkt);
  }

  /**
   * Pad output to target duration with empty packets
   */
  private pad_to_duration(): void {
    const target = this.internal_duration_packets > 0
      ? this.internal_duration_packets
      : this.internal_total_packets;

    for (let i = this.internal_total_packets; i < target; i++) {
      this.add_scheduled_packet(i, this.create_empty_packet());
    }

    this.internal_total_packets = target;
  }

  /**
   * Add packet to schedule at specific index
   *
   * @param packet_index Index to schedule
   * @param packet Packet to add
   */
  private add_scheduled_packet(packet_index: number, packet: CDGPacket): void {
    if (!this.internal_packet_schedule.has(packet_index)) {
      this.internal_packet_schedule.set(packet_index, []);
    }
    this.internal_packet_schedule.get(packet_index)!.push(packet);
  }

  /**
   * Create LOAD_LOW packet (palette entries 0-7)
   *
   * Following C++ reference exactly (CDGMagic_GraphicsEncoder.cpp line 408-411):
   * - Internal palette stores 6-bit RGB values (0-63 per channel)
   * - Encoding reduces to 4-bit Red, 6-bit Green, 4-bit Blue
   * - Red/Blue: 6-bit >> 2 = 4-bit (values 0-15, which scale back to 0-255 by *17)
   * - Green: stays 6-bit across split bytes
   *
   * @returns CDGPacket
   */
  private create_load_low_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const color_index = colors[i] || 0;
      const [r_8bit, g_8bit, b_8bit] = this.internal_palette[color_index];

      // Convert 8-bit RGB to 4-bit using division by 17 (matching C++ reference)
      const r_4bit = Math.floor(r_8bit / 17) & 0x0f;
      const g_4bit = Math.floor(g_8bit / 17) & 0x0f;
      const b_4bit = Math.floor(b_8bit / 17) & 0x0f;

      // Encode byte 0: Red (bits 5-2) + Green upper 2 bits (bits 1-0)
      payload[i * 2] = (r_4bit << 2) | ((g_4bit >> 2) & 0x03);

      // Encode byte 1: Blue (bits 3-0) + Green lower 2 bits (bits 5-4)
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

  /**
   * Create LOAD_HIGH packet (palette entries 8-15)
   *
   * Following C++ reference exactly: same format as LOAD_LOW
   * - 6-bit palette values converted to 4-bit Red/Blue, 6-bit Green
   *
   * @returns CDGPacket
   */
  private create_load_high_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const color_index = (colors[i] || 0) % 8; // Clamp to 0-7 offset
      const palette_index = 8 + color_index;
      const [r_8bit, g_8bit, b_8bit] = this.internal_palette[palette_index];

      // Convert 8-bit RGB to 4-bit using division by 17 (matching C++ reference)
      const r_4bit = Math.floor(r_8bit / 17) & 0x0f;
      const g_4bit = Math.floor(g_8bit / 17) & 0x0f;
      const b_4bit = Math.floor(b_8bit / 17) & 0x0f;

      // Encode byte 0: Red (bits 5-2) + Green upper 2 bits (bits 1-0)
      payload[i * 2] = (r_4bit << 2) | ((g_4bit >> 2) & 0x03);

      // Encode byte 1: Blue (bits 3-0) + Green lower 2 bits (bits 5-4)
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

  /**
   * Create MEMORY_PRESET packet (clear screen)
   *
   * @param color_index Color to fill with (0-15)
   * @returns CDGPacket
   */
  private create_memory_preset_packet(color_index: number, repeat_value: number = 0): CDGPacket {
    const payload = new Uint8Array(16);
    payload[0] = color_index; // Fill color
    payload[1] = repeat_value; // Repeat value (0-15)

    // For repeat values 8-15, embed "CD+GMAGIC 001B" message (C++ reference does this)
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

  /**
   * Create BORDER_PRESET packet (set border color)
   *
   * @param color_index Border color (0-15)
   * @returns CDGPacket
   */
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

  /**
   * Create SCROLL_PRESET packet
   *
   * @param direction Scroll direction
   * @param speed Scroll speed (pixels/frame)
   * @param x_offset X offset
   * @param y_offset Y offset
   * @returns CDGPacket
   */
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

  /**
   * Create SCROLL_COPY packet (execute scroll)
   *
   * @returns CDGPacket
   */
  private create_scroll_copy_packet(): CDGPacket {
    return {
      command: CDG_COMMAND,
      instruction: CDGInstruction.SCROLL_COPY,
      payload: new Uint8Array(16),
      parity1: 0,
      parity2: 0,
    };
  }

  /**
   * Create empty packet (no-op)
   *
   * @returns CDGPacket
   */
  private create_empty_packet(): CDGPacket {
    return {
      command: 0,
      instruction: 0,
      payload: new Uint8Array(16),
      parity1: 0,
      parity2: 0,
    };
  }

  /**
   * Export to binary CDG file format
   *
   * @returns Uint8Array containing binary CDG data
   */
  export_to_binary(): Uint8Array {
    // Allocate buffer for all packets
    const buffer = new Uint8Array(this.internal_total_packets * 24);
    let offset = 0;

    // Write packets in order
    for (let packet_idx = 0; packet_idx < this.internal_total_packets; packet_idx++) {
      const packets = this.internal_packet_schedule.get(packet_idx) || [this.create_empty_packet()];

      for (const pkt of packets) {
        if (offset + 24 > buffer.length) {
          break; // Prevent overflow
        }

        // Write packet structure
        buffer[offset + 0] = pkt.command;
        buffer[offset + 1] = pkt.instruction;
        buffer[offset + 2] = (pkt.parity1 >> 8) & 0xFF;
        buffer[offset + 3] = pkt.parity1 & 0xFF;
        buffer.set(pkt.payload, offset + 4);
        buffer[offset + 20] = (pkt.parity2 >> 24) & 0xFF;
        buffer[offset + 21] = (pkt.parity2 >> 16) & 0xFF;
        buffer[offset + 22] = (pkt.parity2 >> 8) & 0xFF;
        buffer[offset + 23] = pkt.parity2 & 0xFF;

        offset += 24;
      }
    }

    return buffer.slice(0, offset);
  }

  /**
   * Export configuration
   *
   * @returns Configuration object
   */
  validate(): boolean {
    return (
      this.internal_clips.length > 0 &&
      this.internal_total_packets > 0 &&
      this.internal_palette.length === 16 &&
      this.internal_packet_schedule.size > 0
    );
  }

  /**
   * Write FontBlocks to compositor buffer (Phase 1.3)
   *
   * Writes each FontBlock to its corresponding layer in the compositor.
   * This enables proper compositing of overlapping clips before encoding to packets.
   *
   * @param fontblocks Array of FontBlocks to composite
   */
  /**
   * Queue FontBlocks for progressive time-based writing
   *
   * Instead of writing all blocks to compositor immediately, queue them based on their
   * start_pack() value. This enables proper transition effects where blocks are revealed
   * progressively over time (matching C++ reference implementation behavior).
   *
   * @param fontblocks Array of FontBlock instances to queue
   */
  private queue_fontblocks_for_progressive_writing(fontblocks: any[]): void {
    for (const fontblock of fontblocks) {
      const start_pack = fontblock.start_pack();
      this.internal_fontblock_queue.push({
        fontblock,
        start_pack,
        written: false,
      });
    }

    // Sort queue by start_pack for orderly processing
    this.internal_fontblock_queue.sort((a, b) => a.start_pack - b.start_pack);

    if (CDGMagic_CDGExporter.DEBUG)
      console.debug(`[queue_fontblocks] Queued ${fontblocks.length} FontBlocks for progressive writing`);
  }

  /**
   * Process queued FontBlocks that should be written at current_pack
   *
   * Called during packet generation to check which blocks should be rendered.
   * This implements the C++ encoder's "write blocks whose time has arrived" pattern.
   *
   * @param current_pack Current packet position
   */
  private process_due_fontblocks(current_pack: number): void {
    if (!this.internal_compositor || this.internal_fontblock_queue.length === 0) return;

    // Find and write all blocks that should be written by current_pack
    for (let i = 0; i < this.internal_fontblock_queue.length; i++) {
      const entry = this.internal_fontblock_queue[i];
      if (entry.written) continue;  // Already processed
      if (entry.start_pack > current_pack) break;  // Future blocks (queue is sorted)

      const fontblock = entry.fontblock;
      const block_x = fontblock.x_location();
      const block_y = fontblock.y_location();
      const z_layer = fontblock.z_location();

      // Extract 72 pixels from FontBlock (6×12 tile)
      const pixel_data = new Uint16Array(72);
      let idx = 0;

      for (let py = 0; py < 12; py++) {
        for (let px = 0; px < 6; px++) {
          const pixel_color = fontblock.pixel_value(px, py);
          pixel_data[idx++] = pixel_color;
        }
      }

      // Write block to compositor at its z-layer
      this.internal_compositor.write_block(block_x, block_y, z_layer, pixel_data);
      entry.written = true;

      if (CDGMagic_CDGExporter.DEBUG)
        console.debug(`[process_due_fontblocks] Wrote block(${block_x},${block_y}) at pack ${current_pack}`);
    }
  }

  private write_fontblocks_to_compositor(fontblocks: any[]): void {
    if (!this.internal_compositor) return;

    for (const fontblock of fontblocks) {
      const block_x = fontblock.x_location();
      const block_y = fontblock.y_location();
      const z_layer = fontblock.z_location();

      // Extract 72 pixels from FontBlock (6×12 tile)
      const pixel_data = new Uint16Array(72);
      let idx = 0;

      for (let py = 0; py < 12; py++) {
        for (let px = 0; px < 6; px++) {
          const pixel_color = fontblock.pixel_value(px, py);
          pixel_data[idx++] = pixel_color;
        }
      }

      // Write block to compositor at its z-layer
      this.internal_compositor.write_block(block_x, block_y, z_layer, pixel_data);
    }
  }

  /**
   * Create a 2-color packet from composited block data
   *
   * @param composited_block Uint16Array of 72 pixels from compositor
   * @param color0 First color index
   * @param color1 Second color index
   * @param tile_x Tile X coordinate
   * @param tile_y Tile Y coordinate
   * @returns CDG packet
   */
  private create_two_color_composited_packet(
    composited_block: Uint16Array,
    color0: number,
    color1: number,
    tile_x: number,
    tile_y: number
  ): CDGPacket {
    const payload = new Uint8Array(16);

    // Colors
    payload[0] = color0 & 0x0f;
    payload[1] = color1 & 0x0f;

    // Coordinates
    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    // Pixel data - bit encoding from composited block
    for (let row = 0; row < 12; row++) {
      let byte = 0;
      for (let col = 0; col < 6; col++) {
        const idx = row * 6 + col;
        const pixel_color = composited_block[idx];
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

  /**
   * Create CDG packet from MultiColorEncoder instruction
   *
   * @param instr Encoding instruction with colors and pixel bits
   * @param tile_x Tile X coordinate
   * @param tile_y Tile Y coordinate
   * @returns CDG packet
   */
  private create_cdg_packet_from_encoding_instruction(
    instr: { instruction: 'COPY_FONT' | 'XOR_FONT'; color_0: number; color_1: number; pixel_bits: Uint8Array },
    tile_x: number,
    tile_y: number
  ): CDGPacket
  {
    const payload = new Uint8Array(16);

    // Colors
    payload[0] = instr.color_0 & 0x0f;
    payload[1] = instr.color_1 & 0x0f;

    // Coordinates
    payload[2] = tile_y & 0x1f;
    payload[3] = tile_x & 0x3f;

    // Pixel bits (12 bytes, one per row)
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