/**
 * CD+Graphics Magic - CMP Project File Parser
 *
 * Parses the binary CD+Graphics Magic project format (.cmp)
 * Follows exact serialization format from C++ implementation:
 * - CDGMagic_EditingGroup::DoProjectSave_callback (save format)
 * - CDGMagic_EditingGroup::DoProjectOpen_callback (load format)
 * - CDGMagic_BMPClip::serialize/deserialize (clip format)
 */

export interface CMPProject {
  audioFile: string;
  playPosition: number;
  tracks: CMPTrack[];
  clips: CMPClip[];
}

export interface CMPTrack {
  index: number;
  channel: number;
}

export interface CMPClip {
  type: 'BMPClip' | 'TextClip' | 'ScrollClip' | 'PALGlobalClip';
  track: number;
  start: number; // packets
  duration: number; // packets
  data: Record<string, unknown>;
}

/**
 * CMP Project File Parser
 *
 * Reads binary .cmp files following the exact format from C++ implementation
 */
export class CMPParser {
  private buffer: Uint8Array;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.offset = 0;
  }

  /**
   * Parse the entire project file
   * Format from CDGMagic_EditingGroup::DoProjectSave_callback:
   *   "CDGMagic_ProjectFile::" + null
   *   "CDGMagic_AudioPlayback::" + null
   *   <audio_file_path> + null
   *   <play_position: int>
   *   "CDGMagic_TrackOptions::" + null
   *   <8 x track_channel: char>
   *   <num_clips: int>
   *   [for each clip]
   *     - "CDGMagic_BMPClip::" + null
   *     - <track: char>
   *     - <start: int>
   *     - <duration: int>
   *     - <num_events: int>
   *     - [event data...]
   */
  parse(): CMPProject {
    const project: CMPProject = {
      audioFile: '',
      playPosition: 0,
      tracks: [],
      clips: [],
    };

    // Read and skip project file marker
    if (this.readStringUntilNull() !== 'CDGMagic_ProjectFile::') {
      throw new Error('Invalid project file format: missing project marker');
    }

    // Read audio playback section
    if (this.readStringUntilNull() !== 'CDGMagic_AudioPlayback::') {
      throw new Error('Invalid project file format: missing audio playback marker');
    }
    project.audioFile = this.readStringUntilNull();
    project.playPosition = this.readInt32();

    // Read track options section
    if (this.readStringUntilNull() !== 'CDGMagic_TrackOptions::') {
      throw new Error('Invalid project file format: missing track options marker');
    }
    for (let i = 0; i < 8; i++) {
      const channel = this.readInt8();
      project.tracks.push({
        index: i,
        channel,
      });
    }

    // Read number of clips
    const numClips = this.readInt32();
    console.log(`[CMPParser] Num clips: ${numClips}`);

    // Read each clip
    for (let i = 0; i < numClips; i++) {
      const clipMarker = this.readStringUntilNull();
      console.log(`[CMPParser] Clip ${i}: marker="${clipMarker}" offset=${this.offset}`);

      if (clipMarker === 'CDGMagic_BMPClip::') {
        const clip = this.readBMPClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (clipMarker === 'CDGMagic_TextClip::') {
        const clip = this.readTextClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (clipMarker === 'CDGMagic_ScrollClip::') {
        const clip = this.readScrollClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (clipMarker === 'CDGMagic_PALGlobalClip::') {
        const clip = this.readPALGlobalClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else {
        console.warn(`Unknown clip type: ${clipMarker}`);
      }
    }

    return project;
  }

  /**
   * Read string until null terminator
   */
  private readStringUntilNull(): string {
    let result = '';
    while (this.offset < this.buffer.length) {
      const byte = this.buffer[this.offset++];
      if (byte === 0) {
        break;
      }
      result += String.fromCharCode(byte);
    }
    return result;
  }

  /**
   * Read int32 (big-endian, matching C++ CDGMagic_MediaClip::get_int)
   */
  private readInt32(): number {
    if (this.offset + 4 > this.buffer.length) {
      return 0;
    }
    const value =
      ((this.buffer[this.offset] << 24) |
        (this.buffer[this.offset + 1] << 16) |
        (this.buffer[this.offset + 2] << 8) |
        this.buffer[this.offset + 3]) >>>
      0;
    this.offset += 4;
    return value;
  }

  /**
   * Read int16 (big-endian, matching C++ CDGMagic_MediaClip::get_short)
   */
  private readInt16(): number {
    if (this.offset + 2 > this.buffer.length) {
      return 0;
    }
    const value =
      ((this.buffer[this.offset] << 8) | this.buffer[this.offset + 1]) & 0xffff;
    this.offset += 2;
    return value;
  }

  /**
   * Read int8 (single byte, signed)
   */
  private readInt8(): number {
    if (this.offset >= this.buffer.length) {
      return 0;
    }
    const byte = this.buffer[this.offset++];
    // Convert to signed if needed
    return byte > 127 ? byte - 256 : byte;
  }

  /**
   * Read BMP clip data
   * Format from CDGMagic_BMPClip::serialize/deserialize:
   *   "CDGMagic_BMPClip::" + null (already read by caller)
   *   <track: char>
   *   <start: int>
   *   <duration: int>
   *   <num_events: int>
   *   [for each event]
   *     - <event_start_offset: int>
   *     - <event_duration: int>
   *     - <bmp_file_path> + null
   *     - <height: int> (note: height first!)
   *     - <width: int>
   *     - <x_offset: int>
   *     - <y_offset: int>
   *     - <fill_index: char>
   *     - <composite_index: char>
   *     - <should_composite: int>
   *     - <border_index: char>
   *     - <screen_index: char>
   *     - <should_palette: int>
   *     - <transition_file> + null
   *     - <transition_length: short>
   */
  private readBMPClip(): CMPClip | null {
    try {
      const track = this.readInt8();
      const start = this.readInt32();
      const duration = this.readInt32();
      const numEvents = this.readInt32();

      const events = [];
      for (let i = 0; i < numEvents; i++) {
        const eventStart = this.readInt32();
        const eventDuration = this.readInt32();
        const bmpPath = this.readStringUntilNull();
        const height = this.readInt32(); // Height comes first!
        const width = this.readInt32();
        const xOffset = this.readInt32();
        const yOffset = this.readInt32();
        const fillIndex = this.readInt8();
        const compositeIndex = this.readInt8();
        const shouldComposite = this.readInt32();
        const borderIndex = this.readInt8();
        const screenIndex = this.readInt8();
        const shouldPalette = this.readInt32();
        const transitionFile = this.readStringUntilNull();
        const transitionLength = this.readInt16();

        events.push({
          eventStart,
          eventDuration,
          bmpPath,
          height,
          width,
          xOffset,
          yOffset,
          fillIndex,
          compositeIndex,
          shouldComposite,
          borderIndex,
          screenIndex,
          shouldPalette,
          transitionFile,
          transitionLength,
        });
      }

      return {
        type: 'BMPClip',
        track,
        start,
        duration,
        data: { events },
      };
    } catch {
      return null;
    }
  }

  /**
   * Read text clip data
   * Format from CDGMagic_TextClip::serialize/deserialize
   */
  private readTextClip(): CMPClip | null {
    try {
      const track = this.readInt8();
      const start = this.readInt32();
      const duration = this.readInt32();

      // Text rendering properties
      const fontFace = this.readStringUntilNull();
      const fontSize = this.readInt32();
      const karaokeMode = this.readInt8();
      const highlightMode = this.readInt8();
      const foregroundColor = this.readInt8();
      const backgroundColor = this.readInt8();
      const outlineColor = this.readInt8();
      const squareSize = this.readInt8();
      const roundSize = this.readInt8();
      const frameColor = this.readInt8();
      const boxColor = this.readInt8();
      const fillColor = this.readInt8();
      const compositeColor = this.readInt8();
      const shouldComposite = this.readInt32();
      const xorBandwidth = this.readInt32();
      const antialiasMode = this.readInt32();
      const defaultPaletteNumber = this.readInt32();

      // Text content
      this.readInt32(); // textLength - usually just for info, we'll use the string length
      const textContent = this.readStringUntilNull();

      // Events
      const totalEvents = this.readInt32();
      const events = [];
      for (let i = 0; i < totalEvents; i++) {
        const clipTimeOffset = this.readInt32();
        const clipTimeDuration = this.readInt32();
        const width = this.readInt32();
        const height = this.readInt32();
        const xOffset = this.readInt32();
        const yOffset = this.readInt32();
        const transitionFile = this.readStringUntilNull();
        const transitionLength = this.readInt16();
        const clipKarType = this.readInt32();
        const clipLineNum = this.readInt32();
        const clipWordNum = this.readInt32();

        events.push({
          clipTimeOffset,
          clipTimeDuration,
          width,
          height,
          xOffset,
          yOffset,
          transitionFile,
          transitionLength,
          clipKarType,
          clipLineNum,
          clipWordNum,
        });
      }

      return {
        type: 'TextClip',
        track,
        start,
        duration,
        data: {
          fontFace,
          fontSize,
          karaokeMode,
          highlightMode,
          foregroundColor,
          backgroundColor,
          outlineColor,
          squareSize,
          roundSize,
          frameColor,
          boxColor,
          fillColor,
          compositeColor,
          shouldComposite,
          xorBandwidth,
          antialiasMode,
          defaultPaletteNumber,
          textContent,
          events,
        },
      };
    } catch (error) {
      console.error('[CMPParser] Error reading TextClip:', error);
      return null;
    }
  }

  /**
   * Read scroll clip data
   */
  private readScrollClip(): CMPClip | null {
    try {
      const track = this.readInt8();
      const start = this.readInt32();
      const duration = this.readInt32();
      const numEvents = this.readInt32();

      // Skip event data for now
      for (let i = 0; i < numEvents; i++) {
        this.readInt32(); // event start
        this.readInt32(); // event duration
        this.readStringUntilNull(); // skip string
      }

      return {
        type: 'ScrollClip',
        track,
        start,
        duration,
        data: {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Read PAL global clip data
   */
  private readPALGlobalClip(): CMPClip | null {
    try {
      const track = this.readInt8();
      const start = this.readInt32();
      const duration = this.readInt32();
      const numEvents = this.readInt32();

      // Skip event data for now
      for (let i = 0; i < numEvents; i++) {
        this.readInt32(); // event start
        this.readInt32(); // event duration
        this.readStringUntilNull(); // skip string
      }

      return {
        type: 'PALGlobalClip',
        track,
        start,
        duration,
        data: {},
      };
    } catch {
      return null;
    }
  }
}

// VIM: set ft=typescript :
// END
