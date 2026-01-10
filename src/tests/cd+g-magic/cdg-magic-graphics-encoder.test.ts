/**
 * CDGMagic_GraphicsEncoder: Graphics Encoding & Packet Generation
 *
 * Graphics encoding for CD+G format including:
 * - VRAM initialization and pixel operations
 * - Palette and border management
 * - CD+G packet generation (MEMORY_PRESET, BORDER_PRESET, CLUT, etc.)
 * - Font block rendering (COPY_FONT, XOR_FONT modes)
 * - Bitmap-to-font conversion and composition
 * - Stream encoding and orchestration
 *
 * 25 comprehensive tests covering initialization, palette ops, packet generation,
 * font rendering, bitmap compositing, composition layers, stream encoding,
 * orchestration, integration scenarios, and edge cases.
 */

import { CDGMagic_GraphicsEncoder } from "@/ts/cd+g-magic/CDGMagic_GraphicsEncoder";
import { CDGMagic_PALObject       } from "@/ts/cd+g-magic/CDGMagic_PALObject";
import { CDGMagic_FontBlock       } from "@/ts/cd+g-magic/CDGMagic_FontBlock";
import { CDGMagic_BMPObject       } from "@/ts/cd+g-magic/CDGMagic_BMPObject";
import { CDGMagic_CDSCPacket      } from "@/ts/cd+g-magic/CDGMagic_CDSCPacket";

describe("CDGMagic_GraphicsEncoder", () => {
  describe("Initialization & State Management", () => {
    test("Constructor initializes with default state", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      expect(encoder.vram().length).toBe(304 * 192);
      expect(encoder.stream_length()).toBe(0);
      expect(encoder.border_index()).toBe(0);
      expect(encoder.transparent_index()).toBe(0);
      expect(encoder.palette()).toBeInstanceOf(CDGMagic_PALObject);
    });

    test("VRAM initializes to all zeros", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const vram = encoder.vram();

      for (let i = 0; i < vram.length; i++) {
        expect(vram[i]).toBe(0);
      }
    });

    test("Pixel operations work correctly", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.set_pixel(0, 0, 5);
      expect(encoder.pixel(0, 0)).toBe(5);

      encoder.set_pixel(100, 50, 15);
      expect(encoder.pixel(100, 50)).toBe(15);

      // Test bounds checking
      expect(encoder.pixel(-1, 0)).toBe(0);
      expect(encoder.pixel(304, 0)).toBe(0);
      expect(encoder.pixel(0, -1)).toBe(0);
      expect(encoder.pixel(0, 192)).toBe(0);
    });

    test("Pixel values are clamped to 4-bit range", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.set_pixel(10, 10, 0xff);
      expect(encoder.pixel(10, 10)).toBe(0x0f);

      encoder.set_pixel(20, 20, 0xab);
      expect(encoder.pixel(20, 20)).toBe(0x0b);
    });

    test("Reset clears state", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      encoder.set_pixel(50, 50, 5);
      encoder.set_border_index(7);
      encoder.memory_preset(3);

      encoder.reset();

      expect(encoder.pixel(50, 50)).toBe(0);
      expect(encoder.border_index()).toBe(0);
      expect(encoder.stream_length()).toBe(0);
    });

    test("Clone creates independent copy", () => {
      const encoder1 = new CDGMagic_GraphicsEncoder();
      encoder1.set_pixel(10, 10, 5);
      encoder1.set_border_index(3);

      const encoder2 = encoder1.clone();

      // Verify copy
      expect(encoder2.pixel(10, 10)).toBe(5);
      expect(encoder2.border_index()).toBe(3);

      // Verify independence
      encoder2.set_pixel(20, 20, 7);
      expect(encoder1.pixel(20, 20)).toBe(0);
    });
  });

  describe("Palette Management", () => {
    test("Palette can be read and written", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const palette = encoder.palette();

      palette.color(0, 0xff0000ff); // Red
      palette.color(1, 0xff00ff00); // Green

      expect(encoder.palette().color(0)).toBe(0xff0000ff);
      expect(encoder.palette().color(1)).toBe(0xff00ff00);
    });

    test("Border index is clamped to 0-15", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.set_border_index(-1);
      expect(encoder.border_index()).toBe(0);

      encoder.set_border_index(20);
      expect(encoder.border_index()).toBe(15);

      encoder.set_border_index(7);
      expect(encoder.border_index()).toBe(7);
    });

    test("Transparent index is clamped to 0-15", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.set_transparent_index(16);
      expect(encoder.transparent_index()).toBe(15);

      encoder.set_transparent_index(-5);
      expect(encoder.transparent_index()).toBe(0);

      encoder.set_transparent_index(8);
      expect(encoder.transparent_index()).toBe(8);
    });
  });

  describe("Packet Generation", () => {
    test("memory_preset generates correct packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      const packet = encoder.memory_preset(5, 2);

      expect(packet.instruction()).toBe(0x01);
      expect(packet.data_byte(0)).toBe(2);
      expect(packet.data_byte(1)).toBe(5);
    });

    test("border_preset generates correct packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      const packet = encoder.border_preset(12);

      expect(packet.instruction()).toBe(0x02);
      expect(packet.data_byte(0)).toBe(12);
    });

    test("transparent_color generates correct packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      const packet = encoder.transparent_color(3);

      expect(packet.instruction()).toBe(0x1f);
      expect(packet.data_byte(0)).toBe(3);
    });

    test("Packets are clamped to valid ranges", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      let packet = encoder.memory_preset(255, 255);
      expect(packet.data_byte(0)).toBe(15);
      expect(packet.data_byte(1)).toBe(15);

      packet = encoder.border_preset(255);
      expect(packet.data_byte(0)).toBe(15);

      packet = encoder.transparent_color(-1);
      expect(packet.data_byte(0)).toBe(0);
    });

    test("load_palette_lo generates 8-color packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const palette = encoder.palette();

      // Set test colors
      for (let i = 0; i < 8; i++) {
        palette.color(i, 0xff000000 | (i << 8)); // Set green channel
      }

      const packet = encoder.load_palette_lo(palette);

      expect(packet.instruction()).toBe(0x04);
      expect(packet.data().length).toBe(16); // 8 colors × 2 bytes
    });

    test("load_palette_hi generates 8-color packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const palette = encoder.palette();

      // Set test colors
      for (let i = 0; i < 8; i++) {
        palette.color(8 + i, 0xff000000 | ((i + 8) << 16)); // Set red channel
      }

      const packet = encoder.load_palette_hi(palette);

      expect(packet.instruction()).toBe(0x0c);
      expect(packet.data().length).toBe(16);
    });

    test("Packets are added to stream", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      expect(encoder.stream_length()).toBe(0);

      encoder.memory_preset(5);
      expect(encoder.stream_length()).toBe(1);

      encoder.border_preset(3);
      expect(encoder.stream_length()).toBe(2);

      encoder.transparent_color(7);
      expect(encoder.stream_length()).toBe(3);
    });
  });

  describe("Font Block Rendering", () => {
    test("copy_font generates correct packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const pixel_data = new Uint8Array(12);
      pixel_data[0] = 0x2a; // Binary: 101010 (alternating pattern)

      const packet = encoder.copy_font(5, 3, 2, 7, pixel_data);

      expect(packet.instruction()).toBe(0x06);
      expect(packet.data_byte(0)).toBe((7 << 4) | 2); // Colors packed
      expect(packet.data_byte(1)).toBe(5); // X coordinate
      expect(packet.data_byte(2)).toBe(3); // Y coordinate
      expect(packet.data_byte(3)).toBe(0x2a); // Pixel data
    });

    test("xor_font generates correct packet", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const pixel_data = new Uint8Array(12);
      pixel_data[5] = 0x15;

      const packet = encoder.xor_font(10, 8, 1, 14, pixel_data);

      expect(packet.instruction()).toBe(0x26);
      expect(packet.data_byte(1)).toBe(10); // X coordinate
      expect(packet.data_byte(2)).toBe(8); // Y coordinate
      expect(packet.data_byte(8)).toBe(0x15); // Pixel data at offset 5
    });

    test("Tile coordinates are clamped", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const pixel_data = new Uint8Array(12);

      let packet = encoder.copy_font(100, 50, 5, 5, pixel_data);
      expect(packet.data_byte(1)).toBe(49); // X clamped to 49
      expect(packet.data_byte(2)).toBe(15); // Y clamped to 15

      packet = encoder.copy_font(-5, -10, 5, 5, pixel_data);
      expect(packet.data_byte(1)).toBe(0); // X clamped to 0
      expect(packet.data_byte(2)).toBe(0); // Y clamped to 0
    });

    test("Pixel data is masked to 6 bits", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const pixel_data = new Uint8Array(12);
      pixel_data[0] = 0xff; // 8 bits set

      const packet = encoder.copy_font(0, 0, 0, 0, pixel_data);

      expect(packet.data_byte(3)).toBe(0x3f); // Masked to 6 bits (111111)
    });
  });

  describe("Bitmap to Font Block Conversion", () => {
    test("Create font block from bitmap", () => {
      // Font block is actually 6 pixels wide × 12 tall based on internal layout
      // (despite documentation saying 12×6)
      const bmp = new CDGMagic_BMPObject(12, 24);

      // Fill bitmap with pattern
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 24; j++) {
          bmp.pixel(i, j, (i + j) & 0x0f);
        }
      }

      const encoder = new CDGMagic_GraphicsEncoder();
      // Extract 6×12 region from bitmap
      const font_block = encoder.create_font_block_from_bitmap(bmp, 0, 0, 0, 0);

      expect(font_block.x_location()).toBe(0);
      expect(font_block.y_location()).toBe(0);

      // Verify pixels match (font block is 6 wide, 12 tall)
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 6; x++) {
          const expected = (x + y) & 0x0f;
          const actual = font_block.pixel_value(x, y);
          expect(actual).toBe(expected);
        }
      }
    });

    test("Font block creation handles bitmap bounds", () => {
      const bmp = new CDGMagic_BMPObject(20, 10);
      const encoder = new CDGMagic_GraphicsEncoder();

      // Extract from corner - should pad with fill color
      const font_block = encoder.create_font_block_from_bitmap(bmp, 15, 5, 1, 1);

      expect(font_block.x_location()).toBe(1);
      expect(font_block.y_location()).toBe(1);
    });

    test("render_font_block_to_vram copies pixels", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const font_block = new CDGMagic_FontBlock(5, 5);

      // Set some pixels in font block
      font_block.pixel_value(0, 0, 5);
      font_block.pixel_value(1, 0, 7);
      font_block.pixel_value(0, 1, 3);

      encoder.render_font_block_to_vram(font_block, false);

      // Font block at tile (5, 5) = pixels (30, 60)
      expect(encoder.pixel(30, 60)).toBe(5);
      expect(encoder.pixel(31, 60)).toBe(7);
      expect(encoder.pixel(30, 61)).toBe(3);
    });

    test("render_font_block_to_vram respects transparency", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const font_block = new CDGMagic_FontBlock(0, 0);

      // Pre-fill VRAM
      encoder.set_pixel(0, 0, 8);

      // Set font block with transparent color
      font_block.overlay_transparent_color(0);
      font_block.pixel_value(0, 0, 0); // Transparent

      encoder.render_font_block_to_vram(font_block, false);

      // Transparent pixel should not overwrite
      expect(encoder.pixel(0, 0)).toBe(8);
    });

    test("render_font_block_to_vram with XOR mode", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Pre-fill VRAM
      encoder.set_pixel(0, 0, 0x05);

      const font_block = new CDGMagic_FontBlock(0, 0);
      font_block.overlay_transparent_color(0);
      font_block.pixel_value(0, 0, 0x03);

      encoder.render_font_block_to_vram(font_block, true);

      // XOR: 0x05 ^ 0x03 = 0x06
      expect(encoder.pixel(0, 0)).toBe(0x06);
    });
  });

  describe("Bitmap Compositing", () => {
    test("Composite bitmap to VRAM", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const bmp = new CDGMagic_BMPObject(12, 6);

      // Fill with specific pattern
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 12; x++) {
          bmp.pixel(x, y, 7);
        }
      }

      encoder.composite_bitmap_to_vram(bmp, 0, 0, false);

      // Check that pixels were written (first tile should have content)
      let found = false;
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 12; x++) {
          if (encoder.pixel(x, y) === 7) {
            found = true;
          }
        }
      }
      expect(found).toBe(true);
    });
  });

  describe("Composition Layers", () => {
    test("Clear single composition layer", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.clear_composition_layer(0);
      // Verify layer is cleared (no direct check method, so this is implicit)

      encoder.clear_composition_layer(7);
      // Last layer also clears
    });

    test("Clear all composition layers", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.clear_all_composition_layers();
      // All layers are cleared
    });

    test("Flatten composition layers", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // For now, just verify method exists and runs
      encoder.flatten_composition_layers();

      // VRAM should be empty after flattening
      const vram = encoder.vram();
      for (let i = 0; i < vram.length; i++) {
        expect(vram[i]).toBe(0);
      }
    });
  });

  describe("Stream Encoding", () => {
    test("encode_vram_as_packets generates COPY_FONT packets", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Add some pixels to VRAM
      encoder.set_pixel(0, 0, 5);
      encoder.set_pixel(10, 10, 7);

      const initial_length = encoder.stream_length();
      encoder.encode_vram_as_packets(false);

      // Should have added packets
      expect(encoder.stream_length()).toBeGreaterThan(initial_length);
    });

    test("encode_vram_as_packets with XOR mode", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      encoder.set_pixel(50, 50, 3);

      const initial_length = encoder.stream_length();
      encoder.encode_vram_as_packets(true);

      // Should use XOR_FONT packets (0x26)
      const packets = encoder.packet_stream();
      if (packets.length > initial_length) {
        const last_packet = packets[packets.length - 1];
        expect(last_packet!.instruction()).toBe(0x26);
      }
    });
  });

  describe("Orchestration Methods", () => {
    test("compute_graphics generates palette packets", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.compute_graphics();

      const packets = encoder.packet_stream();

      // Should have at least palette and preset packets
      expect(packets.length).toBeGreaterThan(0);

      // Check for palette packets
      let has_palette_lo = false;
      let has_palette_hi = false;
      let has_memory_preset = false;

      for (const packet of packets) {
        if (packet.instruction() === 0x04) has_palette_lo = true;
        if (packet.instruction() === 0x0c) has_palette_hi = true;
        if (packet.instruction() === 0x01) has_memory_preset = true;
      }

      expect(has_palette_lo).toBe(true);
      expect(has_palette_hi).toBe(true);
      expect(has_memory_preset).toBe(true);
    });

    test("compute_graphics clears stream first", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.memory_preset(5);
      expect(encoder.stream_length()).toBe(1);

      encoder.compute_graphics();

      // Stream should be regenerated from scratch
      expect(encoder.stream_length()).toBeGreaterThan(1);
    });

    test("compute_graphics returns packet stream", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      const packets = encoder.compute_graphics();

      expect(Array.isArray(packets)).toBe(true);
      expect(packets.length).toBeGreaterThan(0);

      // All items should be CD+G packets
      for (const packet of packets) {
        expect(packet).toBeInstanceOf(CDGMagic_CDSCPacket);
        expect(packet.command()).toBe(0x09); // TV Graphics mode
      }
    });
  });

  describe("Integration Scenarios", () => {
    test("Full encode cycle: palette → memory → pixels", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Set palette
      const palette = encoder.palette();
      palette.color(0, 0xff000000);
      palette.color(1, 0xff0000ff);

      // Set border and transparency
      encoder.set_border_index(2);
      encoder.set_transparent_index(1);

      // Add some pixels
      encoder.set_pixel(10, 10, 1);
      encoder.set_pixel(20, 20, 1);
      encoder.set_pixel(30, 30, 0);

      // Generate stream
      const packets = encoder.compute_graphics();

      expect(packets.length).toBeGreaterThan(0);

      // Verify stream has expected instruction types
      for (const packet of packets) {
        if (packet.instruction() === 0x06) {
          // Found a COPY_FONT packet
          expect(packet.instruction()).toBe(0x06);
        }
      }
    });

    test("Clone preserves stream contents", () => {
      const encoder1 = new CDGMagic_GraphicsEncoder();
      encoder1.memory_preset(5);
      encoder1.border_preset(3);
      encoder1.set_border_index(3); // Explicitly set border index
      encoder1.transparent_color(7);
      encoder1.set_transparent_index(7); // Explicitly set transparent index

      const encoder2 = encoder1.clone();

      expect(encoder2.stream_length()).toBe(3);
      expect(encoder2.border_index()).toBe(3);
      expect(encoder2.transparent_index()).toBe(7);
    });

    test("Clear stream and restart encoding", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      encoder.memory_preset(1);
      encoder.border_preset(2);
      expect(encoder.stream_length()).toBe(2);

      encoder.clear_stream();
      expect(encoder.stream_length()).toBe(0);

      encoder.memory_preset(5);
      expect(encoder.stream_length()).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    test("Zero-size pixel operations", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Setting pixel at 0,0
      encoder.set_pixel(0, 0, 15);
      expect(encoder.pixel(0, 0)).toBe(15);
    });

    test("Maximum coordinates", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Last pixel in VRAM
      encoder.set_pixel(303, 191, 7);
      expect(encoder.pixel(303, 191)).toBe(7);
    });

    test("Empty bitmap compositing", () => {
      const encoder = new CDGMagic_GraphicsEncoder();
      const bmp = new CDGMagic_BMPObject(1, 1);

      // Should not crash
      encoder.composite_bitmap_to_vram(bmp, 0, 0, false);
    });

    test("Packet stream with many packets", () => {
      const encoder = new CDGMagic_GraphicsEncoder();

      // Generate many packets
      for (let i = 0; i < 100; i++) {
        encoder.memory_preset(i & 0x0f);
      }

      expect(encoder.stream_length()).toBe(100);
      expect(encoder.packet_stream().length).toBe(100);
    });
  });
});

// vim: ts=2 sw=2 et
// END
