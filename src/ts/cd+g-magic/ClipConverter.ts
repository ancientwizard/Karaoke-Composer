/**
 * Clip Converter - Convert parsed CMP clips to proper MediaClip instances
 *
 * Transforms generic clip objects from CMPParser into strongly-typed MediaClip
 * subclass instances (TextClip, BMPClip, ScrollClip, PALGlobalClip) for use
 * with the CDGExporter graphics rendering pipeline.
 */

import type { CMPClip           } from '@/ts/cd+g-magic/CMPParser';
import { CDGMagic_TextClip      } from '@/ts/cd+g-magic/CDGMagic_TextClip';
import { CDGMagic_BMPClip       } from '@/ts/cd+g-magic/CDGMagic_BMPClip';
import { CDGMagic_ScrollClip    } from '@/ts/cd+g-magic/CDGMagic_ScrollClip';
import { CDGMagic_PALGlobalClip } from '@/ts/cd+g-magic/CDGMagic_PALGlobalClip';
import { CDGMagic_TrackOptions  } from '@/ts/cd+g-magic/CDGMagic_TrackOptions_Core';

/**
 * Union type of all possible clip classes
 * Each has the required interface methods (start_pack(), duration())
 */
export type MediaClipInstance = 
  | CDGMagic_TextClip 
  | CDGMagic_BMPClip 
  | CDGMagic_ScrollClip 
  | CDGMagic_PALGlobalClip;

/**
 * Convert a parsed CMP clip to a proper clip instance
 *
 * @param cmpClip Parsed clip from CMPParser
 * @returns Clip instance (TextClip, BMPClip, etc.) or null on error
 */
export function convertToMediaClip(cmpClip: CMPClip): MediaClipInstance | null {
  try {
    switch (cmpClip.type) {
      case 'TextClip':
        return convertTextClip(cmpClip);
      case 'BMPClip':
        return convertBMPClip(cmpClip);
      case 'ScrollClip':
        return convertScrollClip(cmpClip);
      case 'PALGlobalClip':
        return convertPALGlobalClip(cmpClip);
      default:
        console.warn(`Unknown clip type: ${cmpClip.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to convert clip: ${error}`);
    return null;
  }
}

/**
 * Convert TextClip data to CDGMagic_TextClip instance
 */
function convertTextClip(cmpClip: CMPClip): CDGMagic_TextClip | null {
  const data = cmpClip.data as any;

  // Create base clip with timing
  const textClip = new CDGMagic_TextClip(cmpClip.start, cmpClip.duration);

  // Set text content and rendering properties using public methods
  if (data.textContent) {
    textClip.set_text_content(data.textContent);
  }
  if (data.fontSize) {
    textClip.font_size(data.fontSize);
  }
  if (data.fontFace) {
    textClip.font_face(data.fontFace);
  }
  if (data.karaokeMode !== undefined) {
    textClip.karaoke_mode(data.karaokeMode);
  }
  if (data.foregroundColor !== undefined) {
    textClip.foreground_color(data.foregroundColor);
  }
  if (data.backgroundColor !== undefined) {
    textClip.background_color(data.backgroundColor);
  }
  if (data.outlineColor !== undefined) {
    textClip.outline_color(data.outlineColor);
  }

  // Set screen clear settings (from boxColor field)
  // In TILES mode (karaokeMode = 0), boxColor is just a rendering color
  // It does NOT enable a MEMORY_PRESET packet automatically
  // Default: memory_preset_index stays at 16 (disabled)
  // The boxColor is used for rendering the text background/box
  if (data.boxColor !== undefined) {
    textClip.box_index(data.boxColor);
    // DO NOT set memory_preset_index here - it defaults to 16 (disabled)
    // Memory presets are only for BMP clips, not text clips
  }

  // Set border settings (from frameColor field)
  // In TILES mode (karaokeMode = 0), frameColor is just a rendering color
  // It does NOT enable a BORDER_PRESET packet automatically
  // Default: border_index stays at 16 (disabled)
  // The frameColor is used for rendering the text frame/outline
  if (data.frameColor !== undefined) {
    textClip.frame_index(data.frameColor);
    // DO NOT set border_index here - it defaults to 16 (disabled)
    // Border presets are only for BMP clips, not text clips
  }

  // Set composite color and mode for transparency
  // compositeColor is the transparent color index (can be any 0-15+)
  // shouldComposite controls compositing mode: 0=none, 1=replacement, 2=overlay
  if (data.compositeColor !== undefined) {
    (textClip as any)._composite_color = data.compositeColor;
  }
  if (data.shouldComposite !== undefined) {
    (textClip as any)._should_composite = data.shouldComposite;
  }

  // Set fill color (for areas outside text rectangle)
  if (data.fillColor !== undefined) {
    (textClip as any)._fill_color = data.fillColor;
  }

  // Store events for the exporter to process
  if (Array.isArray(data.events)) {
    (textClip as any)._events = data.events;
  }

  // CRITICAL: Store the palette index so the exporter uses the correct palette
  // defaultPaletteNumber comes from the CMP file and tells which preset palette to use (0-8)
  if (data.defaultPaletteNumber !== undefined) {
    (textClip as any)._data = data;
  }

  // Set z-layer from CMP track data
  // Each text clip has its own z-layer defined in the CMP file
  // Lower z values render first (background), higher z values render last (foreground)
  const zLayer = cmpClip.track ?? 0;
  const textTrackOptions = new CDGMagic_TrackOptions(zLayer);
  textClip.set_track_options(textTrackOptions);

  return textClip;
}

/**
 * Convert BMPClip data to CDGMagic_BMPClip instance
 */
function convertBMPClip(cmpClip: CMPClip): CDGMagic_BMPClip | null {
  const data = cmpClip.data as any;

  // Create base clip with timing
  const bmpClip = new CDGMagic_BMPClip(cmpClip.start, cmpClip.duration);

  // Store bitmap events for the exporter to process
  if (Array.isArray(data.events)) {
    (bmpClip as any)._bmp_events = data.events.map((event: any) => ({
      start_pack: event.eventStart || 0,
      duration_packs: event.eventDuration || 300,
      bmp_path: event.bmpPath || '',
      width: event.width || 304,
      height: event.height || 192,
      x_offset: event.xOffset || 0,
      y_offset: event.yOffset || 0,
      fill_index: event.fillIndex || 0,
      composite_index: event.compositeIndex || 0,
      should_composite: event.shouldComposite || 0,
      border_index: event.borderIndex || 16,          // Default to disabled (16)
      screen_index: event.screenIndex ?? 16,         // Default to disabled (16)
      memory_preset_index: event.screenIndex ?? 16,  // Map screenIndex to memory_preset_index
      should_palette: event.shouldPalette || 0,
      transition_file: event.transitionFile || '',
      transition_length: event.transitionLength || 0,
    }));

    // Set clip-level offsets from first BMP event
    // These are accessed by the exporter via clip.x_offset() and clip.y_offset()
    if (data.events.length > 0 && data.events[0]) {
      bmpClip.x_offset(data.events[0].xOffset || 0);
      bmpClip.y_offset(data.events[0].yOffset || 0);
    }
  }

  // NOTE: BMPClip does not extend MediaClip, so it cannot set track_options directly
  // Z-layer for BMP clips is controlled via the cmpClip.track value if BMPClip is upgraded
  // For now, BMP clips use default rendering order while text clips use CMP track values

  return bmpClip;
}

/**
 * Convert ScrollClip data to CDGMagic_ScrollClip instance
 */
function convertScrollClip(cmpClip: CMPClip): CDGMagic_ScrollClip | null {
  // Create base clip with timing
  const scrollClip = new CDGMagic_ScrollClip(cmpClip.start, cmpClip.duration);

  const data = cmpClip.data as any;

  // Set scroll properties if they exist
  (scrollClip as any)._direction = data.direction || 0;
  (scrollClip as any)._speed = data.speed || 1;
  (scrollClip as any)._text_content = data.textContent || '';

  return scrollClip;
}

/**
 * Convert PALGlobalClip data to CDGMagic_PALGlobalClip instance
 */
function convertPALGlobalClip(cmpClip: CMPClip): CDGMagic_PALGlobalClip | null {
  // Create base clip with timing
  const palClip = new CDGMagic_PALGlobalClip(cmpClip.start, cmpClip.duration);

  const data = cmpClip.data as any;

  // Set palette if provided
  if (Array.isArray(data.palette)) {
    (palClip as any)._palette = data.palette;
  }

  return palClip;
}

// VIM: set ft=typescript :
// END