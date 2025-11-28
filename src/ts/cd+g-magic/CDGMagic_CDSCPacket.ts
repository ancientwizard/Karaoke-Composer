/**
 * CD+Graphics Magic - CD_SCPacket
 *
 * CD+G subcode packet structure (24 bytes total).
 * This is the fundamental unit for CD+G graphics encoding.
 * Used for both CD media subchannels and .cdg file format.
 */

/**
 * CD+G Subcode Packet (CD_SCPacket)
 *
 * A 24-byte packet structure that encodes a single CD+G graphics instruction.
 * This packet format is used in both:
 * - CD media R-W subchannels (transmitted with audio data)
 * - .CDG files (raw packet concatenation for karaoke playback)
 *
 * Packet Layout (24 bytes):
 * - Byte 0: Command (TV graphics mode: always 0x09)
 * - Byte 1: Instruction (opcode: PALETTE_LO, PALETTE_HI, COPY_FONT, etc.)
 * - Bytes 2-3: Parity Q (error correction, optional for .cdg files)
 * - Bytes 4-19: Data (16 bytes of graphics command payload)
 * - Bytes 20-23: Parity P (error correction, optional for .cdg files)
 *
 * Parity Handling:
 * - For .cdg files: Parity bytes can be zeros (players typically ignore)
 * - For CD media: Parity would need calculation (not required for file format)
 * - This implementation uses zero-initialized parity (valid for playback)
 */

export class CDGMagic_CDSCPacket {
  // Byte 0: Command/Mode indicator
  // Always 0x09 for TV Graphics (3-bit MODE field + 3-bit ITEM field)
  private internal_command: number;

  // Byte 1: Instruction/Opcode
  // Examples: 0x06 (COPY), 0x26 (XOR), 0x01 (MEMORY_PRESET), 0x02 (BORDER_PRESET)
  private internal_instruction: number;

  // Bytes 2-3: Parity Q
  // Error correction bytes for subchannel transmission
  // Safe to leave as zeros for .cdg file output
  private internal_parity_q: Uint8Array;

  // Bytes 4-19: Data payload
  // 16 bytes of graphics command data (pixel data, colors, coordinates, etc.)
  private internal_data: Uint8Array;

  // Bytes 20-23: Parity P
  // Error correction bytes for subchannel transmission
  // Safe to leave as zeros for .cdg file output
  private internal_parity_p: Uint8Array;

  /**
   * Constructor: Create a CD_SCPacket with default TV Graphics mode
   *
   * Initializes a packet with:
   * - Command byte set to 0x09 (TV Graphics mode)
   * - Instruction set to 0x00 (can be overridden)
   * - All data bytes zeroed
   * - All parity bytes zeroed
   */
  constructor() {
    this.internal_command = 0x09; // TV Graphics mode (fixed for CDG)
    this.internal_instruction = 0x00; // Default (should be set by caller)
    this.internal_parity_q = new Uint8Array(2); // Bytes 2-3 (zeroed)
    this.internal_data = new Uint8Array(16); // Bytes 4-19 (zeroed)
    this.internal_parity_p = new Uint8Array(4); // Bytes 20-23 (zeroed)
  }

  /**
   * Get command byte (TV Graphics mode indicator)
   *
   * For CD+G, this should always be 0x09 (TV_GRAPHICS).
   * This field combines:
   * - 3-bit MODE field (set to 2 for TV Graphics)
   * - 3-bit ITEM field (set to 1 for generic subcode)
   *
   * @returns Command byte value (always 0x09 for CDG)
   */
  command(): number;
  /**
   * Set command byte
   *
   * While normally fixed at 0x09 for CDG, exposed as settable for flexibility.
   *
   * @param requested_command Command byte value
   */
  command(requested_command: number): void;
  command(requested_command?: number): number | void {
    if (requested_command === undefined) {
      return this.internal_command;
    } else {
      this.internal_command = requested_command & 0xff; // Clamp to byte
    }
  }

  /**
   * Get instruction byte (opcode)
   *
   * This field specifies which graphics operation this packet encodes:
   * - 0x01: Memory Preset (clear VRAM with fill color)
   * - 0x02: Border Preset (set border color)
   * - 0x06: Copy/Draw Font Block (render text)
   * - 0x26: XOR/Highlight Font Block (XOR rendering for complex colors)
   * - 0x04: Load Color Table LO (palette colors 0-7)
   * - 0x0C: Load Color Table HI (palette colors 8-15)
   * - 0x08: Scroll Preset (pan/scroll display)
   * - 0x1F: Transparent Color (define transparent palette index)
   *
   * @returns Instruction byte value
   */
  instruction(): number;
  /**
   * Set instruction byte (opcode)
   *
   * @param requested_instruction Instruction byte value
   */
  instruction(requested_instruction: number): void;
  instruction(requested_instruction?: number): number | void {
    if (requested_instruction === undefined) {
      return this.internal_instruction;
    } else {
      this.internal_instruction = requested_instruction & 0xff; // Clamp to byte
    }
  }

  /**
   * Get parity Q bytes (bytes 2-3)
   *
   * Parity Q is used for error correction on CD media subchannels.
   * For .cdg files, these bytes are typically zero (players ignore).
   *
   * @returns Parity Q bytes as Uint8Array (length 2)
   */
  parity_q(): Uint8Array {
    return new Uint8Array(this.internal_parity_q); // Return copy
  }

  /**
   * Set parity Q bytes (bytes 2-3)
   *
   * Typically left as zero for .cdg file format.
   * Would need proper calculation for CD media encoding.
   *
   * @param requested_parity New parity Q bytes (first 2 bytes used)
   */
  set_parity_q(requested_parity: Uint8Array | ArrayLike<number>): void {
    const src = new Uint8Array(requested_parity);
    this.internal_parity_q.set(src.slice(0, 2));
  }

  /**
   * Get data payload bytes (bytes 4-19)
   *
   * This 16-byte payload contains the graphics command data:
   * - Font block: colors, coordinates, and pixel data
   * - Color table: 8 RGB color values (3 bytes each = 24 bytes, spans packets)
   * - Memory preset: fill color and mode flags
   * - Scroll commands: scroll direction and speed
   *
   * @returns Data payload as Uint8Array (length 16)
   */
  data(): Uint8Array {
    return new Uint8Array(this.internal_data); // Return copy
  }

  /**
   * Get data byte at specific offset (0-15)
   *
   * @param offset Byte offset within data payload (0-15)
   * @returns Data byte value, or 0 if offset out of range
   */
  data_byte(offset: number): number {
    if (offset >= 0 && offset < 16) {
      return this.internal_data[offset]!;
    }
    return 0;
  }

  /**
   * Set data payload bytes (bytes 4-19)
   *
   * @param requested_data New data payload (first 16 bytes used)
   */
  set_data(requested_data: Uint8Array | ArrayLike<number>): void {
    const src = new Uint8Array(requested_data);
    this.internal_data.set(src.slice(0, 16));
  }

  /**
   * Set data byte at specific offset (0-15)
   *
   * @param offset Byte offset within data payload (0-15)
   * @param value Byte value to set
   */
  set_data_byte(offset: number, value: number): void {
    if (offset >= 0 && offset < 16) {
      this.internal_data[offset] = value & 0xff; // Clamp to byte
    }
  }

  /**
   * Get parity P bytes (bytes 20-23)
   *
   * Parity P is used for error correction on CD media subchannels.
   * For .cdg files, these bytes are typically zero (players ignore).
   *
   * @returns Parity P bytes as Uint8Array (length 4)
   */
  parity_p(): Uint8Array {
    return new Uint8Array(this.internal_parity_p); // Return copy
  }

  /**
   * Set parity P bytes (bytes 20-23)
   *
   * Typically left as zero for .cdg file format.
   * Would need proper calculation for CD media encoding.
   *
   * @param requested_parity New parity P bytes (first 4 bytes used)
   */
  set_parity_p(requested_parity: Uint8Array | ArrayLike<number>): void {
    const src = new Uint8Array(requested_parity);
    this.internal_parity_p.set(src.slice(0, 4));
  }

  /**
   * Serialize packet to 24-byte binary format
   *
   * Returns the packet as a Uint8Array in the CD+G packet format:
   * - Byte 0: Command
   * - Byte 1: Instruction
   * - Bytes 2-3: Parity Q
   * - Bytes 4-19: Data
   * - Bytes 20-23: Parity P
   *
   * This is the format written directly to .cdg files.
   *
   * @returns 24-byte Uint8Array ready for file output
   */
  serialize(): Uint8Array {
    const packet = new Uint8Array(24);
    packet[0] = this.internal_command;
    packet[1] = this.internal_instruction;
    packet.set(this.internal_parity_q, 2);
    packet.set(this.internal_data, 4);
    packet.set(this.internal_parity_p, 20);
    return packet;
  }

  /**
   * Deserialize packet from 24-byte binary format
   *
   * Loads packet data from a 24-byte array (e.g., from .cdg file).
   *
   * @param buffer 24-byte array to deserialize
   */
  deserialize(buffer: Uint8Array): void {
    if (buffer.length < 24) {
      throw new Error(
        `Buffer too small for CDG packet (got ${buffer.length}, need 24)`
      );
    }
    this.internal_command = buffer[0]!;
    this.internal_instruction = buffer[1]!;
    this.internal_parity_q.set(buffer.slice(2, 4));
    this.internal_data.set(buffer.slice(4, 20));
    this.internal_parity_p.set(buffer.slice(20, 24));
  }

  /**
   * Clone packet with independent data
   *
   * @returns New packet with copied values
   */
  clone(): CDGMagic_CDSCPacket {
    const cloned = new CDGMagic_CDSCPacket();
    cloned.internal_command = this.internal_command;
    cloned.internal_instruction = this.internal_instruction;
    cloned.internal_parity_q.set(this.internal_parity_q);
    cloned.internal_data.set(this.internal_data);
    cloned.internal_parity_p.set(this.internal_parity_p);
    return cloned;
  }

  /**
   * Compare two packets for equality
   *
   * @param other Packet to compare
   * @returns True if all 24 bytes match
   */
  equals(other: CDGMagic_CDSCPacket): boolean {
    if (this.internal_command !== other.internal_command) return false;
    if (this.internal_instruction !== other.internal_instruction) return false;

    // Compare parity Q
    for (let i = 0; i < 2; i++) {
      if (this.internal_parity_q[i] !== other.internal_parity_q[i]) return false;
    }

    // Compare data
    for (let i = 0; i < 16; i++) {
      if (this.internal_data[i] !== other.internal_data[i]) return false;
    }

    // Compare parity P
    for (let i = 0; i < 4; i++) {
      if (this.internal_parity_p[i] !== other.internal_parity_p[i]) return false;
    }

    return true;
  }
}

// VIM: set ft=typescript :
// END