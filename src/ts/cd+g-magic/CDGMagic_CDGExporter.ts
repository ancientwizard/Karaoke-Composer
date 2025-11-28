/**
 * CD+Graphics Magic - CDG Exporter
 *
 * Generates CD+G (.cdg) files from composition data.
 * Handles packet scheduling, color palette management, and bitmap/text rendering.
 */

import { CDGMagic_MediaClip     } from "@/ts/cd+g-magic/CDGMagic_MediaClip";
import { CDGMagic_TextClip      } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CDGMagic_ScrollClip    } from "@/ts/cd+g-magic/CDGMagic_ScrollClip";
import { CDGMagic_PALGlobalClip } from "@/ts/cd+g-magic/CDGMagic_PALGlobalClip";
import { CDGMagic_BMPClip       } from "@/ts/cd+g-magic/CDGMagic_BMPClip";

/**
 * CD+G Packet Command Codes (byte 0)
 */
enum CDGCommand {
  MEMORY_PRESET    = 0x01,  // Screen clear/preset
  BORDER_PRESET    = 0x02,  // Border color
  LOAD_LOW         = 0x0E,  // Load palette entries 0-7
  LOAD_HIGH        = 0x1E,  // Load palette entries 8-15
  TILE_BLOCK       = 0x06,  // Tile data update
  SCROLL_PRESET    = 0x04,  // Scroll setup
  SCROLL_COPY      = 0x18,  // Scroll execute
  PAINT_ON         = 0x08,  // Enable drawing
  PAINT_OFF        = 0x09,  // Disable drawing
  DEFINE_FONT      = 0x0A,  // Font definition
}

/**
 * CD+G Packet Structure (24 bytes)
 */
interface CDGPacket {
  command: number;           // Byte 0: Command code
  instruction: number;       // Byte 1: Instruction/subtype
  payload: Uint8Array;       // Bytes 4-19: 16-byte payload
  parity1: number;           // Bytes 2-3: Parity
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
  }

  /**
   * Initialize default 16-color palette (CD+G standard)
   *
   * @returns Array of [R, G, B] tuples for colors 0-15
   */
  private init_default_palette(): Array<[number, number, number]> {
    // CD+G standard palette: 16 colors, 6-bit per channel (0-63)
    const palette: Array<[number, number, number]> = [
      [0, 0, 0],       // 0: Black
      [0, 0, 63],      // 1: Blue
      [63, 0, 0],      // 2: Red
      [63, 0, 63],     // 3: Magenta
      [0, 63, 0],      // 4: Green
      [0, 63, 63],     // 5: Cyan
      [63, 63, 0],     // 6: Yellow
      [63, 63, 63],    // 7: White
      [0, 0, 0],       // 8-15: Repeat or custom
      [0, 0, 63],
      [63, 0, 0],
      [63, 0, 63],
      [0, 63, 0],
      [0, 63, 63],
      [63, 63, 0],
      [63, 63, 63],
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

    // Add prelude at packet 0
    const prelude = this.generate_prelude();
    for (const pkt of prelude) {
      this.add_scheduled_packet(0, pkt);
    }

    // Process each clip
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

    // Pad to target duration
    this.pad_to_duration();

    return this.internal_total_packets;
  }

  /**
   * Schedule packets for TextClip
   *
   * @param clip TextClip to schedule
   */
  private schedule_text_clip(clip: CDGMagic_TextClip): void {
    // For each event in the clip
    for (let i = 0; i < clip.event_count(); i++) {
      // Calculate global packet position
      const global_packet = clip.start_pack() + i * 100; // Simplified

      // Schedule palette loads
      this.add_scheduled_packet(global_packet, this.create_load_high_packet(0, 1, 2, 3, 4, 5, 6, 7));

      // Schedule text rendering packets (would use font encoding in real implementation)
      // This is simplified; real implementation would encode text as tile blocks
    }
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
    // Schedule memory preset to clear before bitmap
    this.add_scheduled_packet(clip.start_pack(), this.create_memory_preset_packet(0));

    // Schedule palette loads
    this.add_scheduled_packet(clip.start_pack() + 1, this.create_load_low_packet(0, 1, 2, 3, 4, 5, 6, 7));
    this.add_scheduled_packet(clip.start_pack() + 2, this.create_load_high_packet(8, 9, 10, 11, 12, 13, 14, 15));

    // Schedule tile blocks would go here (in real implementation)
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
   * @returns CDGPacket
   */
  private create_load_low_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      // Each color: 2 bits padding + 2-bit R + 2-bit G + 2-bit B
      const color_index = colors[i] || 0;
      const color = this.internal_palette[color_index];
      payload[i * 2] = (color[0] >> 4) | ((color[1] >> 4) << 2) | ((color[2] >> 4) << 4);
      payload[i * 2 + 1] = 0;
    }

    return {
      command: CDGCommand.LOAD_LOW,
      instruction: 0,
      payload,
      parity1: 0,
      parity2: 0,
    };
  }

  /**
   * Create LOAD_HIGH packet (palette entries 8-15)
   *
   * @returns CDGPacket
   */
  private create_load_high_packet(...colors: number[]): CDGPacket {
    const payload = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      // Same encoding as LOAD_LOW but for colors 8-15
      const color_index = (colors[i] || 0) % 8; // Clamp to 0-7 offset
      const palette_index = 8 + color_index;
      const color = this.internal_palette[palette_index];
      if (color) {
        payload[i * 2] = (color[0] >> 4) | ((color[1] >> 4) << 2) | ((color[2] >> 4) << 4);
        payload[i * 2 + 1] = 0;
      }
    }

    return {
      command: CDGCommand.LOAD_HIGH,
      instruction: 0,
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
  private create_memory_preset_packet(color_index: number): CDGPacket {
    const payload = new Uint8Array(16);
    payload[0] = color_index; // Fill color
    payload[1] = 0;           // Reserved

    return {
      command: CDGCommand.MEMORY_PRESET,
      instruction: 0,
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
      command: CDGCommand.BORDER_PRESET,
      instruction: 0,
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
      command: CDGCommand.SCROLL_PRESET,
      instruction: 0,
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
      command: CDGCommand.SCROLL_COPY,
      instruction: 0,
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
}

// VIM: set ft=typescript :
// END