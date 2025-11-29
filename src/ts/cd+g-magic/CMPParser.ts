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

    // Read each clip
    for (let i = 0; i < numClips; i++) {
      const clipMarker = this.readStringUntilNull();

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
   * Format from CDGMagic_BMPClip::serialize:
   *   "CDGMagic_BMPClip::" + null (already read by caller)
   *   <track: char>
   *   <start: int>
   *   <duration: int>
   *   <num_events: int>
   *   [for each event]
   *     - <event_start_offset: int>
   *     - <event_duration: int>
   *     - <bmp_file_path> + null
   *     - <width: int>
   *     - <height: int>
   *     - <x_offset: int>
   *     - <y_offset: int>
   *     - <fill_index: char>
   *     - <composite_index: char>
   *     - <should_composite: int>
   *     - <border_index: char>
   *     - <memory_preset_index: char>
   *     - <update_pal: int>
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
        const width = this.readInt32();
        const height = this.readInt32();
        const xOffset = this.readInt32();
        const yOffset = this.readInt32();
        const fillIndex = this.readInt8();
        const compositeIndex = this.readInt8();
        const shouldComposite = this.readInt32();
        const borderIndex = this.readInt8();
        const memoryPresetIndex = this.readInt8();
        const updatePal = this.readInt32();
        const transitionFile = this.readStringUntilNull();
        const transitionLength = this.readInt16();

        events.push({
          eventStart,
          eventDuration,
          bmpPath,
          width,
          height,
          xOffset,
          yOffset,
          fillIndex,
          compositeIndex,
          shouldComposite,
          borderIndex,
          memoryPresetIndex,
          updatePal,
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
   */
  private readTextClip(): CMPClip | null {
    try {
      const track = this.readInt8();
      const start = this.readInt32();
      const duration = this.readInt32();
      const numEvents = this.readInt32();

      // Skip event data for now (similar structure to BMPClip)
      for (let i = 0; i < numEvents; i++) {
        this.readInt32(); // event start
        this.readInt32(); // event duration
        this.readStringUntilNull(); // skip string
        // Would need full TextClip format to parse completely
      }

      return {
        type: 'TextClip',
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
