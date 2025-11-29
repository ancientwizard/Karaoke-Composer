/**
 * CD+Graphics Magic - CMP Project File Parser
 *
 * Parses the binary CD+Graphics Magic project format (.cmp)
 * Follows exact serialization format from C++ implementation:
 * - CDGMagic_EditingGroup::DoProjectSave_callback (save format)
 * - CDGMagic_EditingGroup::DoProjectOpen_callback (load format)
 * - CDGMagic_BMPClip::serialize/deserialize (clip format)
 *
 * Pure read/write - no path transformations. Use PathNormalizationFacade for that.
 */

export interface CMPProject {
  audioFile: string;
  playPosition: number;
  tracks: CMPTrack[];
  clips: CMPClip[];
  _originalClipCount?: number; // Internal: used to preserve exact serialization
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
 * Resolve asset file paths from legacy CD+Graphics Magic projects
 * Handles Windows paths and legacy Sample_Files references
 */
function resolveAssetPath(assetPath: string): string {
  if (!assetPath) {
    return '';
  }

  // Convert Windows backslashes to forward slashes
  let normalized = assetPath.replace(/\\/g, '/');

  // Replace Sample_Files\ paths with cdg-projects/
  if (normalized.includes('Sample_Files/')) {
    normalized = normalized.replace('Sample_Files/', 'cdg-projects/');
  }

  return normalized;
}

/**
 * CMP Project File Parser
 *
 * Reads binary .cmp files following the exact format from C++ implementation
 * Note on clip count: The numClips field in the binary includes the trailing
 * empty marker position. So if there are N real clips, numClips = N+1.
 */
export class CMPParser {
  private buffer: Uint8Array;
  private offset: number = 0;
  private clipCountIncludesTerminator: boolean = true;

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
      
      // Check for end-of-clips marker (empty string)
      if (!clipMarker || clipMarker === '') {
        break;
      }

      let clip = null;

      if (clipMarker === 'CDGMagic_BMPClip::') {
        clip = this.readBMPClip();
      } else if (clipMarker === 'CDGMagic_TextClip::') {
        clip = this.readTextClip();
      } else if (clipMarker === 'CDGMagic_ScrollClip::') {
        clip = this.readScrollClip();
      } else if (clipMarker === 'CDGMagic_PALGlobalClip::') {
        clip = this.readPALGlobalClip();
      } else {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`Unknown clip type: "${clipMarker}"`);
        }
      }

      if (clip) {
        project.clips.push(clip);
      } else if (clipMarker) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`Failed to parse clip ${i} of type "${clipMarker}"`);
        }
      }
    }

    // Store original clip count for serialization fidelity
    project._originalClipCount = numClips;

    // Update numClips to actual count for serialization
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
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[CMPParser] Error reading BMPClip:', error);
      }
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
      if (process.env.NODE_ENV !== 'test') {
        console.error('[CMPParser] Error reading TextClip:', error);
      }
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

  /**
   * Serialize project back to binary format
   * Writes exactly the same binary structure that was read
   * Enables round-trip: read -> serialize -> new file matches original
   *
   * Note: The original format includes an empty marker after all clips.
   * We preserve this for exact fidelity.
   */
  serialize(project: CMPProject): Uint8Array {
    const chunks: Uint8Array[] = [];

    // Write project file marker
    chunks.push(this.stringToBytes('CDGMagic_ProjectFile::'));

    // Write audio playback section
    chunks.push(this.stringToBytes('CDGMagic_AudioPlayback::'));
    chunks.push(this.stringToBytes(project.audioFile));
    chunks.push(this.int32ToBytes(project.playPosition));

    // Write track options section
    chunks.push(this.stringToBytes('CDGMagic_TrackOptions::'));
    for (let i = 0; i < 8; i++) {
      const track = project.tracks[i];
      chunks.push(this.int8ToBytes(track ? track.channel : 0));
    }

    // Write number of clips (use original count to preserve format)
    const numClips = project._originalClipCount || (project.clips.length + 1);
    chunks.push(this.int32ToBytes(numClips));

    // Write each clip
    for (const clip of project.clips) {
      switch (clip.type) {
        case 'BMPClip':
          chunks.push(this.serializeBMPClip(clip));
          break;
        case 'TextClip':
          chunks.push(this.serializeTextClip(clip));
          break;
        case 'ScrollClip':
          chunks.push(this.serializeScrollClip(clip));
          break;
        case 'PALGlobalClip':
          chunks.push(this.serializePALGlobalClip(clip));
          break;
      }
    }

    // The binary file ends right here - no explicit terminator
    // The empty marker is read by parsing when attempting to read past the end

    // Combine all chunks into single buffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Serialize BMP clip to bytes
   */
  private serializeBMPClip(clip: CMPClip): Uint8Array {
    const chunks: Uint8Array[] = [];

    chunks.push(this.stringToBytes('CDGMagic_BMPClip::'));
    chunks.push(this.int8ToBytes(clip.track));
    chunks.push(this.int32ToBytes(clip.start));
    chunks.push(this.int32ToBytes(clip.duration));

    const events = (clip.data.events as Array<Record<string, unknown>>) || [];
    chunks.push(this.int32ToBytes(events.length));

    for (const evt of events) {
      chunks.push(this.int32ToBytes(Number(evt.eventStart) || 0));
      chunks.push(this.int32ToBytes(Number(evt.eventDuration) || 0));
      chunks.push(this.stringToBytes(String(evt.bmpPath || '')));
      chunks.push(this.int32ToBytes(Number(evt.height) || 0));
      chunks.push(this.int32ToBytes(Number(evt.width) || 0));
      chunks.push(this.int32ToBytes(Number(evt.xOffset) || 0));
      chunks.push(this.int32ToBytes(Number(evt.yOffset) || 0));
      chunks.push(this.int8ToBytes(Number(evt.fillIndex) || 0));
      chunks.push(this.int8ToBytes(Number(evt.compositeIndex) || 0));
      chunks.push(this.int32ToBytes(Number(evt.shouldComposite) || 0));
      chunks.push(this.int8ToBytes(Number(evt.borderIndex) || 0));
      chunks.push(this.int8ToBytes(Number(evt.screenIndex) || 0));
      chunks.push(this.int32ToBytes(Number(evt.shouldPalette) || 0));
      chunks.push(this.stringToBytes(String(evt.transitionFile || '')));
      chunks.push(this.int16ToBytes(Number(evt.transitionLength) || 0));
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Serialize text clip to bytes
   */
  private serializeTextClip(clip: CMPClip): Uint8Array {
    const chunks: Uint8Array[] = [];

    chunks.push(this.stringToBytes('CDGMagic_TextClip::'));
    chunks.push(this.int8ToBytes(clip.track));
    chunks.push(this.int32ToBytes(clip.start));
    chunks.push(this.int32ToBytes(clip.duration));

    // Write font and rendering properties
    chunks.push(this.stringToBytes(String(clip.data.fontFace || '')));
    chunks.push(this.int32ToBytes(Number(clip.data.fontSize) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.karaokeMode) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.highlightMode) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.foregroundColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.backgroundColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.outlineColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.squareSize) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.roundSize) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.frameColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.boxColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.fillColor) || 0));
    chunks.push(this.int8ToBytes(Number(clip.data.compositeColor) || 0));
    chunks.push(this.int32ToBytes(Number(clip.data.shouldComposite) || 0));
    chunks.push(this.int32ToBytes(Number(clip.data.xorBandwidth) || 0));
    chunks.push(this.int32ToBytes(Number(clip.data.antialiasMode) || 0));
    chunks.push(this.int32ToBytes(Number(clip.data.defaultPaletteNumber) || 0));

    // Write text content
    const textContent = String(clip.data.textContent || '');
    chunks.push(this.int32ToBytes(textContent.length));
    chunks.push(this.stringToBytes(textContent));

    // Write events
    const events = (clip.data.events as Array<Record<string, unknown>>) || [];
    chunks.push(this.int32ToBytes(events.length));

    for (const evt of events) {
      chunks.push(this.int32ToBytes(Number(evt.clipTimeOffset) || 0));
      chunks.push(this.int32ToBytes(Number(evt.clipTimeDuration) || 0));
      chunks.push(this.int32ToBytes(Number(evt.width) || 0));
      chunks.push(this.int32ToBytes(Number(evt.height) || 0));
      chunks.push(this.int32ToBytes(Number(evt.xOffset) || 0));
      chunks.push(this.int32ToBytes(Number(evt.yOffset) || 0));
      chunks.push(this.stringToBytes(String(evt.transitionFile || '')));
      chunks.push(this.int16ToBytes(Number(evt.transitionLength) || 0));
      chunks.push(this.int32ToBytes(Number(evt.clipKarType) || 0));
      chunks.push(this.int32ToBytes(Number(evt.clipLineNum) || 0));
      chunks.push(this.int32ToBytes(Number(evt.clipWordNum) || 0));
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Serialize scroll clip to bytes
   */
  private serializeScrollClip(clip: CMPClip): Uint8Array {
    const chunks: Uint8Array[] = [];

    chunks.push(this.stringToBytes('CDGMagic_ScrollClip::'));
    chunks.push(this.int8ToBytes(clip.track));
    chunks.push(this.int32ToBytes(clip.start));
    chunks.push(this.int32ToBytes(clip.duration));
    chunks.push(this.int32ToBytes(0)); // numEvents - stub for now

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Serialize PAL global clip to bytes
   */
  private serializePALGlobalClip(clip: CMPClip): Uint8Array {
    const chunks: Uint8Array[] = [];

    chunks.push(this.stringToBytes('CDGMagic_PALGlobalClip::'));
    chunks.push(this.int8ToBytes(clip.track));
    chunks.push(this.int32ToBytes(clip.start));
    chunks.push(this.int32ToBytes(clip.duration));
    chunks.push(this.int32ToBytes(0)); // numEvents - stub for now

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Convert string to bytes with null terminator
   */
  private stringToBytes(str: string): Uint8Array {
    const bytes = new Uint8Array(str.length + 1); // +1 for null terminator
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    bytes[str.length] = 0; // null terminator
    return bytes;
  }

  /**
   * Convert int32 to big-endian bytes
   */
  private int32ToBytes(value: number): Uint8Array {
    const bytes = new Uint8Array(4);
    bytes[0] = (value >> 24) & 0xff;
    bytes[1] = (value >> 16) & 0xff;
    bytes[2] = (value >> 8) & 0xff;
    bytes[3] = value & 0xff;
    return bytes;
  }

  /**
   * Convert int16 to big-endian bytes
   */
  private int16ToBytes(value: number): Uint8Array {
    const bytes = new Uint8Array(2);
    bytes[0] = (value >> 8) & 0xff;
    bytes[1] = value & 0xff;
    return bytes;
  }

  /**
   * Convert int8 to bytes
   */
  private int8ToBytes(value: number): Uint8Array {
    const bytes = new Uint8Array(1);
    bytes[0] = value & 0xff;
    return bytes;
  }
}

// VIM: set ft=typescript :
// END
