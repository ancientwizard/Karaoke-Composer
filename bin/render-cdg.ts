#!/usr/bin/env node

/**
 * render-cdg - CD+G File Generation from CMP Project
 *
 * Reads a CD+Graphics Magic project file (.cmp) and generates a binary CD+G file (.cdg)
 * using the CDGMagic_CDGExporter. Validates output matches reference file.
 *
 * Usage:
 *   npx tsx bin/render-cdg.ts <input.cmp> <output.cdg> [reference.cdg] [--no-text-clips]
 *
 * Options:
 *   --no-text-clips    Exclude text clips from rendering (for transition testing)
 *
 * Example:
 *   npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp /tmp/output.cdg cdg-projects/sample_project_04.cdg
 *   npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp /tmp/output.cdg --no-text-clips
 */

import fs   from 'fs';
import path from 'path';
import { CMPParser                } from '../src/ts/cd+g-magic/CMPParser';
import { PathNormalizationFacade  } from '../src/ts/cd+g-magic/PathNormalizationFacade';
import { convertToMediaClip       } from '../src/ts/cd+g-magic/ClipConverter';
import { CDGMagic_CDGExporter     } from '../src/ts/cd+g-magic/CDGMagic_CDGExporter';
import { CDGMagic_BMPLoader       } from '../src/ts/cd+g-magic/CDGMagic_BMPLoader';

// ALLOW Exporter to announce debug info
// CDGMagic_CDGExporter.DEBUG = true;

interface RenderOptions {
  inputCMP: string;
  outputCDG: string;
  referenceCDG?: string;
  verbose: boolean;
  noTextClips: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): RenderOptions {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      'Usage: npx ts-node bin/render-cdg.ts <input.cmp> <output.cdg> [reference.cdg] [--no-text-clips]'
    );
    process.exit(1);
  }

  // Separate positional and flag arguments
  const positional: string[] = [];
  let noTextClips = false;

  for (const arg of args) {
    if (arg === '--no-text-clips') {
      noTextClips = true;
    } else {
      positional.push(arg);
    }
  }

  return {
    inputCMP: positional[0]!,
    outputCDG: positional[1]!,
    referenceCDG: positional[2],
    verbose: process.env.VERBOSE === '1' || process.env.VERBOSE === 'true',
    noTextClips,
  };
}

/**
 * Load CMP project file
 */
function loadCMPProject(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CMP file not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const parser = new CMPParser(new Uint8Array(buffer));
  let project = parser.parse();

  // Normalize paths: convert Windows backslashes and Sample_Files references
  const normalizer = new PathNormalizationFacade({
    normalizeSlashes: true,
    replaceSampleFiles: true,
  });
  project = normalizer.normalize(project);

  // Resolve relative paths in BMP clips to be relative to CMP file directory
  // But skip if path already appears to be normalized (contains cdg-projects/)
  const cmpDir = path.dirname(filePath);
  for (const clip of project.clips) {
    if (clip.type === 'BMPClip' && clip.data.events) {
      for (const event of clip.data.events) {
        if (event.bmpPath && !path.isAbsolute(event.bmpPath)) {
          // If path starts with cdg-projects/, it's already been normalized
          // Don't prepend cmpDir again
          if (!event.bmpPath.startsWith('cdg-projects/')) {
            event.bmpPath = path.resolve(cmpDir, event.bmpPath);
          }
        }
      }
    }
  }

  return project;
}

/**
 * Generate CDG binary from CMP project
 */
function generateCDG(cmpProject: any, options: RenderOptions): Uint8Array {
  // Create exporter with 60-second (18000 packets) default duration
  // Standard CD+G files are 1 minute long at 300 packets/second
  const DEFAULT_DURATION_PACKETS = 18000;
  const exporter = new CDGMagic_CDGExporter(DEFAULT_DURATION_PACKETS);

  // Extract palette from first BMP clip if available
  let paletteLoaded = false;
  for (const clip of cmpProject.clips) {
    if (clip.type === 'BMPClip' && clip.data.events && clip.data.events.length > 0) {
      const bmpPath = clip.data.events[0].bmpPath;
      if (bmpPath && fs.existsSync(bmpPath)) {
        try {
          const bmpLoader = new CDGMagic_BMPLoader(bmpPath);
          const palette = bmpLoader.get_palette_6bit();
          exporter.set_palette(palette);
          console.log(`[render-cdg] Loaded palette from BMP: ${bmpPath}`);
          paletteLoaded = true;
          break;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(`[render-cdg] Failed to load palette from ${bmpPath}: ${errorMsg}`);
        }
      }
    }
  }

  if (!paletteLoaded) {
    console.log('[render-cdg] Using default palette (no BMP files found)');
  }

  // Convert and register all clips
  let clipsProcessed = 0;
  let clipsSkipped = 0;

  for (const cmpClip of cmpProject.clips) {
    // Skip text clips if --no-text-clips flag set
    if (options.noTextClips && cmpClip.type === 'TextClip') {
      if (options.verbose) {
        console.log(`  Skipped TextClip at packet ${cmpClip.start} (--no-text-clips)`);
      }
      clipsSkipped++;
      continue;
    }

    const mediaClip = convertToMediaClip(cmpClip);

    if (!mediaClip) {
      if (process.env.VERBOSE === '1') {
        console.log(`  Skipped clip: ${cmpClip.type} at packet ${cmpClip.start}`);
      }
      clipsSkipped++;
      continue;
    }

    const registered = exporter.register_clip(mediaClip);
    if (registered) {
      clipsProcessed++;
    } else {
      clipsSkipped++;
    }
  }

  console.log(`[render-cdg] Registered ${clipsProcessed} clips, skipped ${clipsSkipped}`);

  // Schedule packets
  const totalPackets = exporter.schedule_packets();
  console.log(`[render-cdg] Scheduled ${totalPackets} total packets`);

  // Validate export
  if (!exporter.validate()) {
    throw new Error('Export validation failed');
  }

  // Generate binary
  const binary = exporter.export_to_binary();
  console.log(
    `[render-cdg] Generated ${binary.length} bytes of CDG data (${(binary.length / 24).toFixed(0)} packets)`
  );

  return binary;
}

/**
 * Compare with reference file if provided
 */
function compareWithReference(generated: Uint8Array, referencePath: string): boolean {
  if (!fs.existsSync(referencePath)) {
    console.warn(`Reference file not found: ${referencePath}`);
    return false;
  }

  const reference = fs.readFileSync(referencePath);
  const refArray = new Uint8Array(reference);

  console.log(`[compare] Reference size: ${refArray.length} bytes`);
  console.log(`[compare] Generated size: ${generated.length} bytes`);

  if (refArray.length !== generated.length) {
    console.error(
      `[compare] SIZE MISMATCH: Reference has ${refArray.length} bytes, generated has ${generated.length} bytes`
    );
    const diff = generated.length - refArray.length;
    console.error(`[compare] Difference: ${diff > 0 ? '+' : ''}${diff} bytes`);
    return false;
  }

  // Check byte-by-byte
  let mismatches = 0;
  const maxMismatches = 20;

  for (let i = 0; i < refArray.length; i++) {
    if (refArray[i] !== generated[i]) {
      if (mismatches < maxMismatches) {
        console.error(
          `[compare] Mismatch at byte ${i}: expected 0x${refArray[i]!.toString(16).padStart(2, '0')} got 0x${generated[i]!.toString(16).padStart(2, '0')}`
        );
      }
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log('[compare] ✓ Generated CDG matches reference file EXACTLY');
    return true;
  } else {
    console.error(`[compare] Found ${mismatches} byte mismatches`);
    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Initialize font system first (before generating CDG)
    const { initializeTextRenderer } = await import('../src/ts/cd+g-magic/TextRenderer');
    await initializeTextRenderer();

    const opts = parseArgs();

    console.log('[render-cdg] Starting CDG generation');
    console.log(`[render-cdg] Input:  ${opts.inputCMP}`);
    console.log(`[render-cdg] Output: ${opts.outputCDG}`);
    if (opts.referenceCDG) {
      console.log(`[render-cdg] Reference: ${opts.referenceCDG}`);
    }
    if (opts.noTextClips) {
      console.log('[render-cdg] Mode: Text clips DISABLED (--no-text-clips)');
    }

    // Load project
    console.log('[render-cdg] Loading CMP project...');
    const cmpProject = loadCMPProject(opts.inputCMP);
    console.log(
      `[render-cdg] Loaded project with ${cmpProject.clips.length} clips, audio: ${cmpProject.audioFile}`
    );

    // Generate CDG
    console.log('[render-cdg] Generating CDG...');
    const cdgBinary = generateCDG(cmpProject, opts);

    // Write output
    console.log(`[render-cdg] Writing output to ${opts.outputCDG}...`);
    const outputDir = path.dirname(opts.outputCDG);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(opts.outputCDG, cdgBinary);
    console.log(`[render-cdg] ✓ Wrote ${cdgBinary.length} bytes to ${opts.outputCDG}`);

    // Compare if reference provided
    if (opts.referenceCDG) {
      console.log('[render-cdg] Comparing with reference file...');
      const matches = compareWithReference(cdgBinary, opts.referenceCDG);
      process.exit(matches ? 0 : 1);
    } else {
      console.log('[render-cdg] ✓ Complete');
      process.exit(0);
    }
  } catch (error) {
    console.error('[render-cdg] ERROR:', error);
    process.exit(1);
  }
}

main();

// VIM: set ft=typescript :
// END
