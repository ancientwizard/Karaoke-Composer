/**
 * Phase 4 Tests: CD_SCPacket (24-byte CD+G Subcode Packet)
 *
 * Tests for the fundamental CD+G packet structure:
 * - Packet structure (24 bytes: command, instruction, parity Q, data, parity P)
 * - Serialization/deserialization for .cdg file format
 * - Packet composition and validation
 * - Integration with graphics commands
 */

import { CDGMagic_CDSCPacket } from "../../ts/cd+g-magic/CDGMagic_CDSCPacket";

describe("Phase 4: CDGMagic_CDSCPacket", () => {
  describe("initialization", () => {
    it("should initialize with default TV Graphics mode", () => {
      const packet = new CDGMagic_CDSCPacket();

      expect(packet.command()).toBe(0x09); // TV Graphics mode
      expect(packet.instruction()).toBe(0x00); // Default instruction
      expect(packet.data()).toEqual(new Uint8Array(16)); // All zeros
      expect(packet.parity_q()).toEqual(new Uint8Array(2)); // All zeros
      expect(packet.parity_p()).toEqual(new Uint8Array(4)); // All zeros
    });

    it("should initialize all data fields to zero", () => {
      const packet = new CDGMagic_CDSCPacket();

      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(0);
      }
    });
  });

  describe("command byte management", () => {
    it("should get and set command byte", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.command(0x09);
      expect(packet.command()).toBe(0x09);
    });

    it("should clamp command to 8-bit value", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.command(0x109); // > 255
      expect(packet.command()).toBe(0x09);

      packet.command(0x309);
      expect(packet.command()).toBe(0x09);
    });

    it("should maintain command byte as 0x09 for CD+G", () => {
      const packet = new CDGMagic_CDSCPacket();
      expect(packet.command()).toBe(0x09); // TV Graphics
    });
  });

  describe("instruction byte management", () => {
    it("should get and set instruction byte", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.instruction(0x06); // COPY_FONT
      expect(packet.instruction()).toBe(0x06);

      packet.instruction(0x26); // XOR_FONT
      expect(packet.instruction()).toBe(0x26);

      packet.instruction(0x01); // MEMORY_PRESET
      expect(packet.instruction()).toBe(0x01);
    });

    it("should clamp instruction to 8-bit value", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.instruction(0x106);
      expect(packet.instruction()).toBe(0x06);

      packet.instruction(0x226);
      expect(packet.instruction()).toBe(0x26);
    });

    it("should support all common CD+G instructions", () => {
      const packet = new CDGMagic_CDSCPacket();
      const instructions = [
        0x01, // MEMORY_PRESET
        0x02, // BORDER_PRESET
        0x04, // LOAD_CLUT_LO
        0x0c, // LOAD_CLUT_HI
        0x06, // COPY_FONT
        0x26, // XOR_FONT
        0x08, // SCROLL_PRESET
        0x1f, // TRANSPARENT_COLOR
      ];

      instructions.forEach((instr) => {
        packet.instruction(instr);
        expect(packet.instruction()).toBe(instr);
      });
    });
  });

  describe("data payload management", () => {
    it("should get full 16-byte data payload", () => {
      const packet = new CDGMagic_CDSCPacket();
      const data = packet.data();
      expect(data.length).toBe(16);
      expect(data).toEqual(new Uint8Array(16));
    });

    it("should set full 16-byte data payload", () => {
      const packet = new CDGMagic_CDSCPacket();
      const newData = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        newData[i] = i;
      }
      packet.set_data(newData);

      const retrieved = packet.data();
      for (let i = 0; i < 16; i++) {
        expect(retrieved[i]).toBe(i);
      }
    });

    it("should get individual data bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const data = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
        0x0c, 0x0d, 0x0e, 0x0f, 0x10,
      ]);
      packet.set_data(data);

      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(data[i]);
      }
    });

    it("should set individual data bytes", () => {
      const packet = new CDGMagic_CDSCPacket();

      for (let i = 0; i < 16; i++) {
        packet.set_data_byte(i, i * 16);
      }

      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(i * 16);
      }
    });

    it("should return 0 for out-of-bounds data byte access", () => {
      const packet = new CDGMagic_CDSCPacket();
      expect(packet.data_byte(-1)).toBe(0);
      expect(packet.data_byte(16)).toBe(0);
      expect(packet.data_byte(100)).toBe(0);
    });

    it("should ignore out-of-bounds data byte writes", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.set_data_byte(-1, 255);
      packet.set_data_byte(16, 255);
      packet.set_data_byte(100, 255);

      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(0);
      }
    });

    it("should clamp data byte values to 8-bit", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.set_data_byte(0, 0x1ff); // > 255
      expect(packet.data_byte(0)).toBe(0xff);

      packet.set_data_byte(1, 0x301);
      expect(packet.data_byte(1)).toBe(0x01);
    });

    it("should handle set_data with partial data arrays", () => {
      const packet = new CDGMagic_CDSCPacket();
      const shortData = new Uint8Array([1, 2, 3, 4, 5]);
      packet.set_data(shortData);

      for (let i = 0; i < 5; i++) {
        expect(packet.data_byte(i)).toBe(i + 1);
      }
      // Rest should be zero
      for (let i = 5; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(0);
      }
    });
  });

  describe("parity Q management", () => {
    it("should get parity Q bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const parityQ = packet.parity_q();
      expect(parityQ.length).toBe(2);
      expect(parityQ).toEqual(new Uint8Array(2));
    });

    it("should set parity Q bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const newParity = new Uint8Array([0xaa, 0xbb]);
      packet.set_parity_q(newParity);

      const retrieved = packet.parity_q();
      expect(retrieved[0]).toBe(0xaa);
      expect(retrieved[1]).toBe(0xbb);
    });

    it("should return copy of parity Q (not reference)", () => {
      const packet = new CDGMagic_CDSCPacket();
      const parity1 = packet.parity_q();
      const parity2 = packet.parity_q();

      parity1[0] = 0xff;
      expect(parity2[0]).toBe(0);
    });
  });

  describe("parity P management", () => {
    it("should get parity P bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const parityP = packet.parity_p();
      expect(parityP.length).toBe(4);
      expect(parityP).toEqual(new Uint8Array(4));
    });

    it("should set parity P bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const newParity = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
      packet.set_parity_p(newParity);

      const retrieved = packet.parity_p();
      expect(retrieved[0]).toBe(0x11);
      expect(retrieved[1]).toBe(0x22);
      expect(retrieved[2]).toBe(0x33);
      expect(retrieved[3]).toBe(0x44);
    });

    it("should return copy of parity P (not reference)", () => {
      const packet = new CDGMagic_CDSCPacket();
      const parity1 = packet.parity_p();
      const parity2 = packet.parity_p();

      parity1[0] = 0xff;
      expect(parity2[0]).toBe(0);
    });
  });

  describe("serialization", () => {
    it("should serialize to exactly 24 bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const serialized = packet.serialize();
      expect(serialized.length).toBe(24);
    });

    it("should serialize packet structure correctly", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.command(0x09);
      packet.instruction(0x06);
      packet.set_parity_q(new Uint8Array([0xaa, 0xbb]));
      packet.set_data(
        new Uint8Array([
          0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
          0x0c, 0x0d, 0x0e, 0x0f, 0x10,
        ])
      );
      packet.set_parity_p(new Uint8Array([0x55, 0x66, 0x77, 0x88]));

      const serialized = packet.serialize();

      expect(serialized[0]).toBe(0x09); // Command
      expect(serialized[1]).toBe(0x06); // Instruction
      expect(serialized[2]).toBe(0xaa); // Parity Q[0]
      expect(serialized[3]).toBe(0xbb); // Parity Q[1]
      for (let i = 0; i < 16; i++) {
        expect(serialized[4 + i]).toBe(i + 1); // Data
      }
      expect(serialized[20]).toBe(0x55); // Parity P[0]
      expect(serialized[21]).toBe(0x66); // Parity P[1]
      expect(serialized[22]).toBe(0x77); // Parity P[2]
      expect(serialized[23]).toBe(0x88); // Parity P[3]
    });

    it("should serialize default packet with zeros", () => {
      const packet = new CDGMagic_CDSCPacket();
      const serialized = packet.serialize();

      expect(serialized[0]).toBe(0x09); // Command
      expect(serialized[1]).toBe(0x00); // Instruction
      for (let i = 2; i < 24; i++) {
        if (i === 0 || i === 1) continue; // Skip command/instruction
        expect(serialized[i]).toBe(0); // Rest zeros
      }
    });
  });

  describe("deserialization", () => {
    it("should deserialize 24-byte packet", () => {
      const original = new Uint8Array(24);
      original[0] = 0x09; // Command
      original[1] = 0x06; // Instruction
      original[2] = 0xaa; // Parity Q[0]
      original[3] = 0xbb; // Parity Q[1]
      for (let i = 0; i < 16; i++) {
        original[4 + i] = i + 1; // Data
      }
      original[20] = 0x55; // Parity P[0]
      original[21] = 0x66; // Parity P[1]
      original[22] = 0x77; // Parity P[2]
      original[23] = 0x88; // Parity P[3]

      const packet = new CDGMagic_CDSCPacket();
      packet.deserialize(original);

      expect(packet.command()).toBe(0x09);
      expect(packet.instruction()).toBe(0x06);
      expect(packet.parity_q()[0]).toBe(0xaa);
      expect(packet.parity_q()[1]).toBe(0xbb);
      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(i + 1);
      }
      expect(packet.parity_p()[0]).toBe(0x55);
      expect(packet.parity_p()[1]).toBe(0x66);
      expect(packet.parity_p()[2]).toBe(0x77);
      expect(packet.parity_p()[3]).toBe(0x88);
    });

    it("should reject buffer smaller than 24 bytes", () => {
      const packet = new CDGMagic_CDSCPacket();
      const smallBuffer = new Uint8Array(23);

      expect(() => packet.deserialize(smallBuffer)).toThrow(
        "Buffer too small for CDG packet"
      );
    });

    it("should deserialize from exactly 24-byte buffer", () => {
      const buffer = new Uint8Array(24);
      buffer[0] = 0x09;
      buffer[1] = 0x02;

      const packet = new CDGMagic_CDSCPacket();
      packet.deserialize(buffer);

      expect(packet.command()).toBe(0x09);
      expect(packet.instruction()).toBe(0x02);
    });

    it("should deserialize from buffer larger than 24 bytes (use first 24)", () => {
      const buffer = new Uint8Array(32);
      buffer[0] = 0x09;
      buffer[1] = 0x04;
      buffer[25] = 0xff; // Beyond packet boundary

      const packet = new CDGMagic_CDSCPacket();
      packet.deserialize(buffer);

      expect(packet.command()).toBe(0x09);
      expect(packet.instruction()).toBe(0x04);
    });
  });

  describe("round-trip serialization", () => {
    it("should survive serialize/deserialize cycle", () => {
      const original = new CDGMagic_CDSCPacket();
      original.instruction(0x06);
      original.set_parity_q(new Uint8Array([0x12, 0x34]));
      original.set_data(
        new Uint8Array([
          0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44,
          0x55, 0x66, 0x77, 0x88, 0x99,
        ])
      );
      original.set_parity_p(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

      const serialized = original.serialize();
      const deserialized = new CDGMagic_CDSCPacket();
      deserialized.deserialize(serialized);

      expect(deserialized.equals(original)).toBe(true);
    });

    it("should handle multiple round trips", () => {
      let packet = new CDGMagic_CDSCPacket();
      packet.instruction(0x26);
      packet.set_data(new Uint8Array(Array(16).fill(0xff)));

      for (let i = 0; i < 5; i++) {
        const serialized = packet.serialize();
        packet = new CDGMagic_CDSCPacket();
        packet.deserialize(serialized);
      }

      expect(packet.instruction()).toBe(0x26);
      for (let i = 0; i < 16; i++) {
        expect(packet.data_byte(i)).toBe(0xff);
      }
    });
  });

  describe("cloning", () => {
    it("should clone with identical values", () => {
      const original = new CDGMagic_CDSCPacket();
      original.instruction(0x06);
      original.set_parity_q(new Uint8Array([0xaa, 0xbb]));
      original.set_data(
        new Uint8Array([
          0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
          0x0c, 0x0d, 0x0e, 0x0f, 0x10,
        ])
      );
      original.set_parity_p(new Uint8Array([0x55, 0x66, 0x77, 0x88]));

      const cloned = original.clone();

      expect(cloned.command()).toBe(original.command());
      expect(cloned.instruction()).toBe(original.instruction());
      expect(cloned.parity_q()).toEqual(original.parity_q());
      expect(cloned.data()).toEqual(original.data());
      expect(cloned.parity_p()).toEqual(original.parity_p());
    });

    it("should clone with independent data", () => {
      const original = new CDGMagic_CDSCPacket();
      original.instruction(0x06);
      original.set_data(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));

      const cloned = original.clone();
      original.instruction(0x26);
      original.set_data_byte(0, 99);

      expect(cloned.instruction()).toBe(0x06);
      expect(cloned.data_byte(0)).toBe(1);
    });
  });

  describe("equality comparison", () => {
    it("should compare identical packets as equal", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();

      expect(packet1.equals(packet2)).toBe(true);
    });

    it("should detect command byte differences", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();
      packet2.command(0x08);

      expect(packet1.equals(packet2)).toBe(false);
    });

    it("should detect instruction byte differences", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();
      packet1.instruction(0x06);
      packet2.instruction(0x26);

      expect(packet1.equals(packet2)).toBe(false);
    });

    it("should detect parity Q differences", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();
      packet1.set_parity_q(new Uint8Array([0xaa, 0xbb]));

      expect(packet1.equals(packet2)).toBe(false);
    });

    it("should detect data differences", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();
      packet1.set_data_byte(0, 0xff);

      expect(packet1.equals(packet2)).toBe(false);
    });

    it("should detect parity P differences", () => {
      const packet1 = new CDGMagic_CDSCPacket();
      const packet2 = new CDGMagic_CDSCPacket();
      packet1.set_parity_p(new Uint8Array([0x55, 0x66, 0x77, 0x88]));

      expect(packet1.equals(packet2)).toBe(false);
    });
  });

  describe("packet format validation", () => {
    it("should maintain TV Graphics mode (0x09)", () => {
      const packet = new CDGMagic_CDSCPacket();
      expect(packet.command()).toBe(0x09);

      // Even if we try to change it, it should be valid for CD+G
      packet.command(0x09);
      expect(packet.command()).toBe(0x09);
    });

    it("should support font block rendering packets", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.instruction(0x06); // COPY_FONT
      packet.set_data_byte(0, 0x01); // Color 1
      packet.set_data_byte(1, 0x02); // Color 2
      packet.set_data_byte(2, 0x05); // Y block
      packet.set_data_byte(3, 0x03); // X block

      expect(packet.instruction()).toBe(0x06);
      expect(packet.data_byte(0)).toBe(0x01);
      expect(packet.data_byte(1)).toBe(0x02);
      expect(packet.data_byte(2)).toBe(0x05);
      expect(packet.data_byte(3)).toBe(0x03);
    });

    it("should support palette load packets", () => {
      const packet = new CDGMagic_CDSCPacket();
      packet.instruction(0x04); // LOAD_CLUT_LO
      packet.set_data(
        new Uint8Array([
          // 8 RGB colors (3 bytes each)
          0xff, 0x00, 0x00, // Red
          0x00, 0xff, 0x00, // Green
          0x00, 0x00, 0xff, // Blue
          0xff, 0xff, 0x00, // Yellow
          0xff, 0x00, 0xff, // Magenta
          0x00, 0xff, 0xff, // Cyan
          0x00, 0x00, 0x00, // Black
          0xff, 0xff, 0xff, // White
        ])
      );

      expect(packet.instruction()).toBe(0x04);
      expect(packet.data_byte(0)).toBe(0xff); // Red R
      expect(packet.data_byte(1)).toBe(0x00); // Red G
      expect(packet.data_byte(2)).toBe(0x00); // Red B
    });
  });

  describe("file I/O integration", () => {
    it("should produce byte stream for .cdg file output", () => {
      const packets = [
        new CDGMagic_CDSCPacket(),
        new CDGMagic_CDSCPacket(),
        new CDGMagic_CDSCPacket(),
      ];

      packets[0]!.instruction(0x01); // MEMORY_PRESET
      packets[1]!.instruction(0x04); // LOAD_CLUT_LO
      packets[2]!.instruction(0x06); // COPY_FONT

      const stream = new Uint8Array(3 * 24);
      packets.forEach((p, i) => {
        const serialized = p.serialize();
        stream.set(serialized, i * 24);
      });

      expect(stream.length).toBe(72); // 3 packets × 24 bytes
      expect(stream[1]).toBe(0x01); // First packet instruction
      expect(stream[25]).toBe(0x04); // Second packet instruction
      expect(stream[49]).toBe(0x06); // Third packet instruction
    });

    it("should read from .cdg file byte stream", () => {
      // Simulate reading 3 packets from a .cdg file
      const stream = new Uint8Array(72);
      stream[1] = 0x01; // First packet instruction
      stream[25] = 0x04; // Second packet instruction
      stream[49] = 0x06; // Third packet instruction

      const packets = [];
      for (let i = 0; i < 3; i++) {
        const packet = new CDGMagic_CDSCPacket();
        packet.deserialize(stream.slice(i * 24, (i + 1) * 24));
        packets.push(packet);
      }

      expect(packets[0]!.instruction()).toBe(0x01);
      expect(packets[1]!.instruction()).toBe(0x04);
      expect(packets[2]!.instruction()).toBe(0x06);
    });
  });
});

// VIM: set ft=typescript :
// END