/**
 * TextClip Compositor Integration Tests
 *
 * Validates that TextClip rendering works through the full compositor
 * and MultiColorEncoder pipeline.
 */

import { CDGMagic_CDGExporter } from "@/ts/cd+g-magic/CDGMagic_CDGExporter";
import { CDGMagic_TextClip    } from "@/ts/cd+g-magic/CDGMagic_TextClip";
import { CompositorBuffer     } from "@/ts/cd+g-magic/CompositorBuffer";
import { VRAMBuffer           } from "@/ts/cd+g-magic/VRAMBuffer";
import { encode_block         } from "@/ts/cd+g-magic/MultiColorEncoder";
import { renderTextToTile     } from "@/ts/cd+g-magic/TextRenderer";

describe("TextClip + Compositor + MultiColorEncoder Integration", () => {
  describe("TextClip Compositor Pipeline", () => {
    test("should render single character to compositor", () => {
      const compositor = new CompositorBuffer();

      // Render character 'A' to tile
      const tileData = renderTextToTile('A', 15, 0); // White on black
      const color1 = tileData[0] as number;
      const color2 = tileData[1] as number;
      const bitmapData = tileData[2] as Uint8Array;

      // Convert tile to compositor block (72 pixels)
      const compositorBlock = new Uint16Array(72);
      for (let row = 0; row < 12; row++) {
        const byte = bitmapData[row] || 0;
        for (let col = 0; col < 6; col++) {
          const bit = (byte >> (5 - col)) & 1;
          const pixelColor = bit ? color1 : color2;
          compositorBlock[row * 6 + col] = pixelColor;
        }
      }

      // Write to compositor at tile (5, 5), layer 1
      compositor.write_block(5, 5, 1, compositorBlock);

      // Read back and verify
      const readBlock = compositor.read_composited_block(5, 5);
      expect(readBlock).toBeDefined();
      expect(readBlock.length).toBe(72);

      // Should have both colors present in block
      const colors = new Set<number>();
      for (let i = 0; i < 72; i++) {
        if (readBlock[i] !== CompositorBuffer.get_transparency()) {
          colors.add(readBlock[i]);
        }
      }
      expect(colors.size).toBeGreaterThan(0);
    });

    test("should compose multiple text characters with proper layering", () => {
      const compositor = new CompositorBuffer();

      // Render two characters at different positions
      const charA = renderTextToTile('A', 15, 0);
      const charB = renderTextToTile('B', 14, 0);

      // Helper function to convert tile to compositor block
      const tileToBlock = (tileData: any) => {
        const block = new Uint16Array(72);
        const color1 = tileData[0] as number;
        const color2 = tileData[1] as number;
        const bitmap = tileData[2] as Uint8Array;

        for (let row = 0; row < 12; row++) {
          const byte = bitmap[row] || 0;
          for (let col = 0; col < 6; col++) {
            const bit = (byte >> (5 - col)) & 1;
            block[row * 6 + col] = bit ? color1 : color2;
          }
        }
        return block;
      };

      // Write characters
      compositor.write_block(5, 5, 1, tileToBlock(charA));
      compositor.write_block(6, 5, 1, tileToBlock(charB));

      // Verify both blocks are readable
      const blockA = compositor.read_composited_block(5, 5);
      const blockB = compositor.read_composited_block(6, 5);

      expect(blockA.length).toBe(72);
      expect(blockB.length).toBe(72);

      // Blocks should not be identical (different characters)
      let different = false;
      for (let i = 0; i < 72; i++) {
        if (blockA[i] !== blockB[i]) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    test("should encode composited text block with MultiColorEncoder", () => {
      const compositor = new CompositorBuffer();

      // Render character and add to compositor
      const tileData = renderTextToTile('X', 15, 0);
      const color1 = tileData[0] as number;
      const color2 = tileData[1] as number;
      const bitmap = tileData[2] as Uint8Array;

      const block = new Uint16Array(72);
      for (let row = 0; row < 12; row++) {
        const byte = bitmap[row] || 0;
        for (let col = 0; col < 6; col++) {
          const bit = (byte >> (5 - col)) & 1;
          block[row * 6 + col] = bit ? color1 : color2;
        }
      }

      compositor.write_block(10, 10, 1, block);

      // Read and encode
      const composited = compositor.read_composited_block(10, 10);
      const encoding = encode_block(composited);

      expect(encoding.packet_count).toBeGreaterThan(0);
      expect(encoding.instructions.length).toBe(encoding.packet_count);

      // Each instruction should have required fields
      for (const instr of encoding.instructions) {
        expect(instr.instruction).toMatch(/COPY_FONT|XOR_FONT/);
        expect(instr.color_0).toBeGreaterThanOrEqual(0);
        expect(instr.color_1).toBeGreaterThanOrEqual(0);
        expect(instr.pixel_bits).toBeDefined();
        expect(instr.pixel_bits.length).toBe(12);
      }
    });

    test("should detect unchanged blocks via VRAM tracking", () => {
      const compositor = new CompositorBuffer();
      const vram = new VRAMBuffer();

      // Create and write a block
      const block = new Uint16Array(72);
      block.fill(5); // Single color

      compositor.write_block(15, 15, 1, block);

      // Convert to VRAM format
      const composited = compositor.read_composited_block(15, 15);
      const vramBlock = new Uint8Array(72);
      for (let i = 0; i < 72; i++) {
        vramBlock[i] = composited[i] < 256 ? composited[i] : 0;
      }

      // Write to VRAM
      vram.write_block(15, 15, vramBlock);

      // Create identical block and check match
      const identicalBlock = new Uint8Array(72);
      for (let i = 0; i < 72; i++) {
        identicalBlock[i] = 5;
      }

      const matches = vram.block_matches(15, 15, identicalBlock);
      expect(matches).toBe(true);

      // Create different block and check mismatch
      const differentBlock = new Uint8Array(72);
      for (let i = 0; i < 72; i++) {
        differentBlock[i] = 6;
      }

      const different = vram.block_matches(15, 15, differentBlock);
      expect(different).toBe(false);
    });
  });

  describe("TextClip Exporter Integration", () => {
    test("should schedule text clip with compositor pipeline", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(100, 300);
      clip.set_text_content("Hi");
      clip.foreground_color(15);
      clip.background_color(0);

      // Add minimal event for scheduling
      (clip as any)._events = [
        { xOffset: 0, yOffset: 0, width: 288, height: 24 }
      ];

      expect(exporter.register_clip(clip)).toBe(true);

      const totalPackets = exporter.schedule_packets();
      expect(totalPackets).toBeGreaterThan(0);
      expect(totalPackets).toBeGreaterThanOrEqual(clip.duration());
    });

    test("should handle multiline text rendering", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(50, 500);
      clip.set_text_content("Line1\nLine2\nLine3");
      clip.foreground_color(14);
      clip.background_color(1);

      // Add event
      (clip as any)._events = [
        { xOffset: 0, yOffset: 0, width: 288, height: 72 } // 6 lines tall
      ];

      expect(exporter.register_clip(clip)).toBe(true);

      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);
    });

    test("should handle text with different colors", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip1 = new CDGMagic_TextClip(0, 200);
      clip1.set_text_content("Red");
      clip1.foreground_color(1);
      (clip1 as any)._events = [{ xOffset: 0, yOffset: 0, width: 288, height: 24 }];

      const clip2 = new CDGMagic_TextClip(200, 200);
      clip2.set_text_content("Green");
      clip2.foreground_color(2);
      (clip2 as any)._events = [{ xOffset: 0, yOffset: 36, width: 288, height: 24 }];

      expect(exporter.register_clip(clip1)).toBe(true);
      expect(exporter.register_clip(clip2)).toBe(true);

      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);
    });

    test("should bound text rendering to screen coordinates", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(0, 300);
      clip.set_text_content("Beyond");
      clip.foreground_color(15);

      // Position far off-screen (should be clipped)
      (clip as any)._events = [
        { xOffset: 294, yOffset: 0, width: 288, height: 24 } // Right edge
      ];

      expect(exporter.register_clip(clip)).toBe(true);

      // Should still generate packets without errors
      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThanOrEqual(0);
    });

    test("should respect clip duration for packet allocation", () => {
      const exporter = new CDGMagic_CDGExporter();

      const clip = new CDGMagic_TextClip(0, 50); // Very short clip
      clip.set_text_content("Short");
      (clip as any)._events = [{ xOffset: 0, yOffset: 0, width: 288, height: 24 }];

      expect(exporter.register_clip(clip)).toBe(true);

      const packets = exporter.schedule_packets();
      // Should fit within duration (with buffer for palette/preset)
      expect(packets).toBeLessThanOrEqual(clip.duration() + 10);
    });
  });

  describe("MultiColorEncoder Output Validation", () => {
    test("single color text block encodes to one packet", () => {
      // Create a block with all same color
      const block = new Uint16Array(72);
      block.fill(5); // Single color

      const encoding = encode_block(block);

      expect(encoding.packet_count).toBe(1);
      expect(encoding.instructions.length).toBe(1);

      const instr = encoding.instructions[0]!;
      expect(instr.instruction).toBe('COPY_FONT');
      expect(instr.color_0).toBe(5);
      // All pixels should be set
      for (let i = 0; i < 12; i++) {
        expect(instr.pixel_bits[i]).toBe(0x3F);
      }
    });

    test("two color text block encodes efficiently", () => {
      // Typical text: foreground on background
      const block = new Uint16Array(72);
      for (let i = 0; i < 72; i++) {
        // Simulate text pattern: some pixels are color 15 (text), rest are color 0 (background)
        block[i] = (i % 2 === 0) ? 15 : 0;
      }

      const encoding = encode_block(block);

      // Two-color should use one packet
      expect(encoding.packet_count).toBe(1);
      expect(encoding.instructions[0]!.instruction).toBe('COPY_FONT');
    });

    test("multi-color text uses bitplane decomposition", () => {
      // Create a block with 4+ colors
      const block = new Uint16Array(72);
      for (let i = 0; i < 72; i++) {
        block[i] = (i % 4) + 12; // Colors 12, 13, 14, 15
      }

      const encoding = encode_block(block);

      // Multi-color should use multiple packets
      expect(encoding.packet_count).toBeGreaterThan(1);

      // Should have mix of COPY_FONT and XOR_FONT
      let hasCopyFont = false;
      let hasXorFont = false;
      for (const instr of encoding.instructions) {
        if (instr.instruction === 'COPY_FONT') hasCopyFont = true;
        if (instr.instruction === 'XOR_FONT') hasXorFont = true;
      }
      expect(hasCopyFont).toBe(true);
      expect(hasXorFont).toBe(true);
    });
  });

  describe("End-to-End TextClip Rendering", () => {
    test("complete workflow: render text through full pipeline", () => {
      // 1. Create text clip
      const clip = new CDGMagic_TextClip(0, 500);
      clip.set_text_content("Hello");
      clip.foreground_color(15);
      clip.background_color(0);
      (clip as any)._events = [{ xOffset: 0, yOffset: 0, width: 288, height: 24 }];

      // 2. Create exporter and register
      const exporter = new CDGMagic_CDGExporter();
      expect(exporter.register_clip(clip)).toBe(true);

      // 3. Schedule packets
      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);

      // 4. Export to CDG
      const cdgBuffer = exporter.export_to_binary();
      expect(cdgBuffer).toBeDefined();
      expect(cdgBuffer.byteLength).toBeGreaterThan(0);

      // CDG files are 24 bytes per packet
      // Should have reasonable size
      const expectedMinSize = packets * 24;
      expect(cdgBuffer.byteLength).toBeGreaterThanOrEqual(expectedMinSize);
    });

    test("multiple clips render without interference", () => {
      const exporter = new CDGMagic_CDGExporter();

      // Create multiple text clips
      const clips = [
        { text: "First", color: 15, pos: 0 },
        { text: "Second", color: 14, pos: 100 },
        { text: "Third", color: 13, pos: 200 }
      ];

      for (const clipDef of clips) {
        const clip = new CDGMagic_TextClip(clipDef.pos, 200);
        clip.set_text_content(clipDef.text);
        clip.foreground_color(clipDef.color);
        (clip as any)._events = [{ xOffset: 0, yOffset: 0, width: 288, height: 24 }];
        expect(exporter.register_clip(clip)).toBe(true);
      }

      const packets = exporter.schedule_packets();
      expect(packets).toBeGreaterThan(0);

      const cdgBuffer = exporter.export_to_binary();
      expect(cdgBuffer.byteLength).toBeGreaterThan(0);
    });
  });
});

// VIM: set ft=typescript :
// END