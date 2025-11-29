/**
 * CD+Graphics Magic - CMP Project File Parser
 *
 * Parses the binary CD+Graphics Magic project format (.cmp)
 * and converts to project data structure
 */

/**
 * Project file format marker
 */
const PROJECT_FILE_MARKER = 'CDGMagic_ProjectFile::';
const AUDIOPLAYBACK_MARKER = 'CDGMagic_AudioPlayback::';
const TRACKOPTIONS_MARKER = 'CDGMagic_TrackOptions::';
const BMPCLIP_MARKER = 'CDGMagic_BMPClip::';
const TEXTCLIP_MARKER = 'CDGMagic_TextClip::';
const SCROLLCLIP_MARKER = 'CDGMagic_ScrollClip::';
const PALGLOBALCLIP_MARKER = 'CDGMagic_PALGlobalClip::';

export interface CMPProject {
  audioFile: string;
  tracks: CMPTrack[];
  clips: CMPClip[];
}

export interface CMPTrack {
  index: number;
  channel: number;
  maskActive: boolean;
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
 * Reads binary .cmp files and extracts project structure
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
   */
  parse(): CMPProject {
    const project: CMPProject = {
      audioFile: '',
      tracks: [],
      clips: [],
    };

    // Read project header
    this.readProjectHeader(project);

    // Read audio playback settings
    this.readAudioPlayback(project);

    // Read track options
    this.readTracks(project);

    // Read clips
    this.readClips(project);

    return project;
  }

  /**
   * Read string from buffer at current offset
   */
  private readString(): string {
    if (this.offset >= this.buffer.length) {
      return '';
    }

    const lengthBytes = this.readBytes(2);
    const length = (lengthBytes[1] << 8) | lengthBytes[0]; // Little-endian

    if (length === 0 || this.offset + length > this.buffer.length) {
      return '';
    }

    const strBytes = this.readBytes(length);
    const decoder = new TextDecoder();
    return decoder.decode(strBytes);
  }

  /**
   * Read uint32 (big-endian, matching C++ CDGMagic_MediaClip::get_int)
   */
  private readUint32(): number {
    const bytes = this.readBytes(4);
    return (
      ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
    );
  }

  /**
   * Read uint16 (big-endian, matching C++ CDGMagic_MediaClip::get_short)
   */
  private readUint16(): number {
    const bytes = this.readBytes(2);
    return ((bytes[0] << 8) | bytes[1]) & 0xffff;
  }

  /**
   * Read uint8
   */
  private readUint8(): number {
    if (this.offset >= this.buffer.length) {
      return 0;
    }
    return this.buffer[this.offset++];
  }

  /**
   * Read N bytes
   */
  private readBytes(n: number): Uint8Array {
    if (this.offset + n > this.buffer.length) {
      n = this.buffer.length - this.offset;
    }
    const bytes = this.buffer.slice(this.offset, this.offset + n);
    this.offset += n;
    return bytes;
  }

  /**
   * Skip to next marker or n bytes
   */
  private skipTo(marker?: string): boolean {
    if (!marker) {
      return true;
    }

    const markerBytes = new TextEncoder().encode(marker);
    while (this.offset < this.buffer.length) {
      let match = true;
      for (let i = 0; i < markerBytes.length; i++) {
        if (
          this.offset + i >= this.buffer.length ||
          this.buffer[this.offset + i] !== markerBytes[i]
        ) {
          match = false;
          break;
        }
      }
      if (match) {
        this.offset += markerBytes.length;
        return true;
      }
      this.offset++;
    }
    return false;
  }

  /**
   * Read project header
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readProjectHeader(_project: CMPProject): void {
    if (!this.skipTo(PROJECT_FILE_MARKER)) {
      return;
    }
  }

  /**
   * Read audio playback settings
   */
  private readAudioPlayback(project: CMPProject): void {
    if (!this.skipTo(AUDIOPLAYBACK_MARKER)) {
      return;
    }

    project.audioFile = this.readString();
  }

  /**
   * Read track options
   */
  private readTracks(project: CMPProject): void {
    let trackIndex = 0;
    while (this.skipTo(TRACKOPTIONS_MARKER)) {
      const track: CMPTrack = {
        index: trackIndex,
        channel: this.readUint8(),
        maskActive: this.readUint8() !== 0,
      };
      project.tracks.push(track);
      trackIndex++;

      // Check if we've hit the end of tracks (next marker is a clip)
      if (this.peekMarker() !== TRACKOPTIONS_MARKER) {
        break;
      }
    }
  }

  /**
   * Peek at next marker without consuming it
   */
  private peekMarker(): string | null {
    const savedOffset = this.offset;
    const markers = [
      BMPCLIP_MARKER,
      TEXTCLIP_MARKER,
      SCROLLCLIP_MARKER,
      PALGLOBALCLIP_MARKER,
      TRACKOPTIONS_MARKER,
    ];

    for (const marker of markers) {
      this.offset = savedOffset;
      if (this.skipTo(marker)) {
        this.offset = savedOffset;
        return marker;
      }
    }
    this.offset = savedOffset;
    return null;
  }

  /**
   * Read all clips
   */
  private readClips(project: CMPProject): void {
    while (this.offset < this.buffer.length) {
      if (this.skipTo(BMPCLIP_MARKER)) {
        const clip = this.readBMPClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (this.skipTo(TEXTCLIP_MARKER)) {
        const clip = this.readTextClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (this.skipTo(SCROLLCLIP_MARKER)) {
        const clip = this.readScrollClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else if (this.skipTo(PALGLOBALCLIP_MARKER)) {
        const clip = this.readPALGlobalClip();
        if (clip) {
          project.clips.push(clip);
        }
      } else {
        break;
      }
    }
  }

  /**
   * Read BMP clip data
   */
  private readBMPClip(): CMPClip | null {
    try {
      const track = this.readUint32();
      const start = this.readUint32(); // Already in packets from C++
      const duration = this.readUint32(); // Already in packets from C++

      const clip: CMPClip = {
        type: 'BMPClip',
        track,
        start,
        duration,
        data: {
          bmpFile: this.readString(),
          // Additional BMP-specific fields would go here
        },
      };

      return clip;
    } catch {
      return null;
    }
  }

  /**
   * Read text clip data
   */
  private readTextClip(): CMPClip | null {
    try {
      const track = this.readUint32();
      const start = this.readUint32(); // Already in packets from C++
      const duration = this.readUint32(); // Already in packets from C++

      const clip: CMPClip = {
        type: 'TextClip',
        track,
        start,
        duration,
        data: {
          fontName: this.readString(),
          text: this.readString(),
          // Additional text-specific fields would go here
        },
      };

      return clip;
    } catch {
      return null;
    }
  }

  /**
   * Read scroll clip data
   */
  private readScrollClip(): CMPClip | null {
    try {
      const track = this.readUint32();
      const start = this.readUint32(); // Already in packets from C++
      const duration = this.readUint32(); // Already in packets from C++

      const clip: CMPClip = {
        type: 'ScrollClip',
        track,
        start,
        duration,
        data: {},
      };

      return clip;
    } catch {
      return null;
    }
  }

  /**
   * Read PAL Global clip data
   */
  private readPALGlobalClip(): CMPClip | null {
    try {
      const track = this.readUint32();
      const start = this.readUint32(); // Already in packets from C++
      const duration = this.readUint32(); // Already in packets from C++

      const clip: CMPClip = {
        type: 'PALGlobalClip',
        track,
        start,
        duration,
        data: {},
      };

      return clip;
    } catch {
      return null;
    }
  }
}

// VIM: set ft=typescript :
// END
