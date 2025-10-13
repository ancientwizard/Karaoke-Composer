// Core interfaces for Karaoke Composition System

export interface SyllableTiming {
  syllable: string
  startTime?: number // in milliseconds
  endTime?: number   // in milliseconds
  duration?: number  // calculated duration
}

export interface WordTiming {
  word: string
  syllables: SyllableTiming[]
  startTime?: number // word start time
  endTime?: number   // word end time
  duration?: number  // calculated duration
}

export interface LyricLine {
  id: string
  lineNumber: number
  text: string // original text with "/" syllable markers
  words: WordTiming[] // parsed words and syllables
  startTime?: number // line start time
  endTime?: number   // line end time
  duration?: number  // calculated duration
}

export interface TimingData {
  lineId: string
  wordIndex?: number
  syllableIndex?: number
  startTime: number
  endTime: number
  confidence: number // 0-1, how accurate the timing is
  type: 'line' | 'word' | 'syllable'
}

export interface AudioFile {
  name: string
  file: File | null
  url?: string
  duration?: number
  sampleRate?: number
}

export interface KaraokeProject {
  id: string
  name: string
  artist: string
  genre: string
  createdAt: Date
  updatedAt: Date
  audioFile: AudioFile
  lyrics: LyricLine[]
  timings: TimingData[]
  isCompleted: boolean
  metadata?: {
    bpm?: number
    key?: string
    notes?: string
  }
}

export interface WaveformData {
  peaks: number[]
  sampleRate: number
  duration: number
  channels: number
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isLoaded: boolean
  currentWord?: { lineIndex: number, wordIndex: number }
  currentSyllable?: { lineIndex: number, wordIndex: number, syllableIndex: number }
}

export interface SyncEditorState {
  currentProject: KaraokeProject | null
  currentLine: number
  isTimingMode: boolean
  playbackState: PlaybackState
  waveformData: WaveformData | null
  selectedLineIds: string[]
}

// Project storage and management
export interface ProjectStore {
  projects: KaraokeProject[]
  currentProjectId: string | null
  lastOpened: Date
}

// Editor modes
export type EditorMode = 'edit' | 'timing' | 'preview' | 'playback'

// Audio context types
export interface AudioContextData {
  context: AudioContext | null
  source: AudioBufferSourceNode | null
  buffer: AudioBuffer | null
  analyser: AnalyserNode | null
}