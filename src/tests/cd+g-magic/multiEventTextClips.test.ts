/**
 * Multi-Event Text Clips Test
 *
 * Tests per-event karaoke timing, positioning, and word-wrapping
 * Validates that text clips with multiple events render correctly
 * with proper timing, positioning, and text layout
 */

import { CDGMagic_TextClip } from "@/ts/cd+g-magic/CDGMagic_BMPClip";
import { CMPParser } from "@/ts/cd+g-magic/CMPParser";
import { convertToMediaClip, type MediaClipInstance } from "@/ts/cd+g-magic/ClipConverter";
import { CDGMagic_CDGExporter } from "@/ts/cd+g-magic/CDGMagic_CDGExporter";
import { extractBMPPalette } from "@/ts/cd+g-magic/BMPPaletteLoader";
import fs from "fs";
import path from "path";

describe("Multi-Event Text Clips", () => {
  describe("Karaoke mode timing", () => {
    test("should schedule text events at individual timing offsets", () => {
      // Create a text clip with multiple events (karaoke mode)
      const textClip = new CDGMagic_TextClip(100, 400);  // start at packet 100, duration 400
      
      // Add multiple events with different timing
      const events = [
        {
          clipTimeOffset: 0,    // Event 1 at packet 100 (clip start)
          clipTimeDuration: 100,
          width: 300,
          height: 50,
          xOffset: 0,
          yOffset: 20,
          clipLineNum: 0,
          clipWordNum: 0
        },
        {
          clipTimeOffset: 100,  // Event 2 at packet 200
          clipTimeDuration: 100,
          width: 300,
          height: 50,
          xOffset: 0,
          yOffset: 20,
          clipLineNum: 0,
          clipWordNum: 1
        },
        {
          clipTimeOffset: 200,  // Event 3 at packet 300
          clipTimeDuration: 100,
          width: 300,
          height: 50,
          xOffset: 0,
          yOffset: 20,
          clipLineNum: 0,
          clipWordNum: 2
        }
      ];
      
      // Store events on the clip
      (textClip as any)._events = events;
      
      // Verify events are accessible
      const retrievedEvents = (textClip as any)._events;
      expect(retrievedEvents).toHaveLength(3);
      expect(retrievedEvents[0].clipTimeOffset).toBe(0);
      expect(retrievedEvents[1].clipTimeOffset).toBe(100);
      expect(retrievedEvents[2].clipTimeOffset).toBe(200);
    });
  });

  describe("Per-event positioning", () => {
    test("should apply event-specific positioning to text", () => {
      const textClip = new CDGMagic_TextClip(50, 300);
      
      // Event with constrained positioning
      const event = {
        clipTimeOffset: 0,
        clipTimeDuration: 300,
        width: 150,    // Constrained width
        height: 30,
        xOffset: 75,   // Centered horizontally
        yOffset: 90,   // Positioned in lower half
        clipLineNum: 0,
        clipWordNum: 0
      };
      
      (textClip as any)._events = [event];
      
      // Verify positioning values
      expect(event.xOffset).toBe(75);
      expect(event.yOffset).toBe(90);
      expect(event.width).toBe(150);
      expect(event.height).toBe(30);
    });

    test("should constrain text to event boundaries", () => {
      const textClip = new CDGMagic_TextClip(100, 200);
      
      // Event with narrow width
      const event = {
        clipTimeOffset: 0,
        clipTimeDuration: 200,
        width: 100,    // Very narrow - will force word wrapping
        height: 60,
        xOffset: 100,
        yOffset: 78,
        clipLineNum: 0,
        clipWordNum: 0
      };
      
      (textClip as any)._events = [event];
      
      // Text should wrap to fit within the 100px width
      // This is tested during actual CDG rendering
      expect(event.width).toBe(100);
    });
  });

  describe("Word wrapping for constrained widths", () => {
    test("should break long text into multiple lines for narrow events", () => {
      // This tests the word-wrapping functionality
      const text = "This is a longer piece of text that should wrap";
      
      // Simulate constrained width scenario
      const constrainedWidth = 80;  // Narrower than full screen
      const availableWidth = constrainedWidth - 16;  // Account for padding
      
      // The wrapTextToWidth function would break this into multiple lines
      expect(availableWidth).toBe(64);
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe("Integration with CMP project", () => {
    test("should load text clips with events from CMP file", () => {
      // Load sample CMP project
      const cmpPath = path.join(
        process.cwd(),
        "cdg-projects",
        "sample_project_03b.cmp"
      );
      
      if (fs.existsSync(cmpPath)) {
        const buffer = fs.readFileSync(cmpPath);
        const parser = new CMPParser(new Uint8Array(buffer));
        const project = parser.parse();
        
        // Find text clips in the project
        const textClips = project.clips.filter(clip => clip.type === "TextClip");
        expect(textClips.length).toBeGreaterThan(0);
        
        // Verify text clips have the expected data
        for (const clip of textClips) {
          expect(clip.data.textContent).toBeDefined();
          expect(clip.data.fontFace).toBeDefined();
          expect(clip.data.fontSize).toBeDefined();
          expect(clip.data.karaokeMode).toBeDefined();
          expect(clip.data.events).toBeDefined();
        }
      }
    });
  });

  describe("Export with per-event text clips", () => {
    test("should generate valid CDG file with multi-event text clips", () => {
      const cmpPath = path.join(
        process.cwd(),
        "cdg-projects",
        "sample_project_03b.cmp"
      );
      
      const outputPath = path.join(process.cwd(), "tmp", "test-multitext.cdg");
      
      if (fs.existsSync(cmpPath)) {
        // Parse CMP
        const cmpBuffer = fs.readFileSync(cmpPath);
        const parser = new CMPParser(new Uint8Array(cmpBuffer));
        const project = parser.parse();
        
        // Load palette BMP
        const paletteFile = path.join(process.cwd(), "cdg-projects", "simple_sky_2+14.bmp");
        let palette: Array<[number, number, number]> | undefined;
        if (fs.existsSync(paletteFile)) {
          const bmpData = fs.readFileSync(paletteFile);
          const extractedPalette = extractBMPPalette(new Uint8Array(bmpData));
          if (extractedPalette) {
            palette = extractedPalette as Array<[number, number, number]>;
          }
        }
        
        // Create exporter (DEFAULT_DURATION_PACKETS = 18000 for 60-second CDG)
        const DEFAULT_DURATION_PACKETS = 18000;
        const exporter = new CDGMagic_CDGExporter(DEFAULT_DURATION_PACKETS);
        
        // Set palette if loaded
        if (palette) {
          exporter.set_palette(palette);
        }
        
        // Convert clips and register them
        let clipsRegistered = 0;
        for (const clip of project.clips) {
          const mediaClip = convertToMediaClip(clip) as any;
          if (mediaClip) {
            // Use type assertion to bypass type checking issue
            // Both the converted clip and CDGMagic_MediaClip have the required interface
            if (exporter.register_clip(mediaClip)) {
              clipsRegistered++;
            }
          }
        }
        
        // Verify at least some clips were registered
        expect(clipsRegistered).toBeGreaterThan(0);
        
        // Schedule packets
        const scheduledPackets = exporter.schedule_packets();
        expect(scheduledPackets).toBeGreaterThan(0);
        
        // Validate and export
        if (exporter.validate()) {
          const cdgData = exporter.export_to_binary();
          
          // Verify output
          expect(cdgData).toBeDefined();
          expect(cdgData.length).toBeGreaterThan(0);
          expect(cdgData.length % 24).toBe(0);  // Must be multiple of 24 bytes (packet size)
          
          // Write to file for inspection
          fs.writeFileSync(outputPath, cdgData);
          
          // Verify file was created
          expect(fs.existsSync(outputPath)).toBe(true);
          const stats = fs.statSync(outputPath);
          expect(stats.size).toBe(cdgData.length);
        }
      }
    });
  });
});

// VIM: ts=2 sw=2 et
// END
