// Audio playback service using Web Audio API and HTML5 Audio
import type { PlaybackState, AudioFile } from '@/types/karaoke'

export class AudioService {
  private audio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private source: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private isInitialized = false

  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isLoaded: false,
  }

  private timeUpdateCallback?: (time: number) => void
  private playbackStateCallback?: (state: PlaybackState) => void

  constructor() {
    this.initializeAudioContext()
  }

  private async initializeAudioContext() {
    try {
      // Check if we need to recreate context
      if (this.audioContext && this.audioContext.state === 'closed') {
        this.audioContext = null
        this.analyser = null
        this.gainNode = null
        this.source = null
        this.isInitialized = false
      }

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext()
        this.analyser = this.audioContext.createAnalyser()
        this.gainNode = this.audioContext.createGain()

        this.analyser.fftSize = 2048
        this.analyser.connect(this.audioContext.destination)
        this.gainNode.connect(this.analyser)

        this.isInitialized = true
        console.log('Audio context initialized successfully')
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
        console.log('Audio context resumed')
      }
    }
    catch (error) {
      console.error('Failed to initialize audio context:', error)
    }
  }

  async loadAudioFile(audioFile: AudioFile): Promise<boolean> {
    try {
      // Ensure audio context is properly initialized
      await this.initializeAudioContext()

      // Create or update HTML5 audio element
      if (this.audio) {
        this.audio.pause()
        this.audio.src = ''
      }

      this.audio = new Audio()

      // Set up event listeners
      this.setupAudioEventListeners()

      // Load the audio file
      if (audioFile.file) {
        const url = URL.createObjectURL(audioFile.file)
        this.audio.src = url
      }
      else if (audioFile.url) {
        this.audio.src = audioFile.url
      }
      else {
        throw new Error('No audio file or URL provided')
      }

      // Connect to Web Audio API if initialized
      if (this.isInitialized && this.audioContext && this.gainNode) {
        try {
          if (this.source) {
            this.source.disconnect()
          }
          this.source = this.audioContext.createMediaElementSource(this.audio)
          this.source.connect(this.gainNode)
          console.log('Audio source connected to Web Audio API')
        }
        catch (contextError) {
          console.warn('Web Audio API connection failed, falling back to basic audio:', contextError)
          // Continue without Web Audio API features
        }
      }

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          this.audio!.removeEventListener('canplaythrough', handleCanPlay)
          this.audio!.removeEventListener('error', handleError)
          resolve()
        }

        const handleError = (error: Event) => {
          this.audio!.removeEventListener('canplaythrough', handleCanPlay)
          this.audio!.removeEventListener('error', handleError)
          reject(error)
        }

        this.audio!.addEventListener('canplaythrough', handleCanPlay)
        this.audio!.addEventListener('error', handleError)
        this.audio!.load()
      })

      this.playbackState.isLoaded = true

      // Robust duration detection
      const duration = await this.detectAudioDuration(audioFile)
      this.playbackState.duration = duration
      this.updatePlaybackState()

      return true
    }
    catch (error) {
      console.error('Failed to load audio file:', error)
      this.playbackState.isLoaded = false
      this.updatePlaybackState()
      return false
    }
  }

  private setupAudioEventListeners() {
    if (!this.audio) return

    this.audio.addEventListener('timeupdate', () => {
      this.playbackState.currentTime = this.audio!.currentTime * 1000 // Convert to ms
      this.updatePlaybackState()

      if (this.timeUpdateCallback) {
        this.timeUpdateCallback(this.playbackState.currentTime)
      }
    })

    this.audio.addEventListener('play', () => {
      this.playbackState.isPlaying = true
      this.updatePlaybackState()
    })

    this.audio.addEventListener('pause', () => {
      this.playbackState.isPlaying = false
      this.updatePlaybackState()
    })

    this.audio.addEventListener('ended', () => {
      this.playbackState.isPlaying = false
      this.playbackState.currentTime = 0
      this.updatePlaybackState()
    })

    this.audio.addEventListener('loadedmetadata', () => {
      this.playbackState.duration = this.audio!.duration * 1000
      this.updatePlaybackState()
    })
  }

  async play(): Promise<void> {
    if (!this.audio || !this.playbackState.isLoaded) return

    try {
      // Ensure audio context is properly initialized
      await this.initializeAudioContext()

      // Resume AudioContext if suspended (required by some browsers)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
        console.log('Audio context resumed for playback')
      }

      await this.audio.play()
      this.playbackState.isPlaying = true
      this.updatePlaybackState()
      console.log('Audio playback started successfully')
    }
    catch (error) {
      console.error('Failed to play audio:', error)
      throw error
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause()
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
  }

  seek(timeMs: number): void {
    if (this.audio && this.playbackState.isLoaded) {
      this.audio.currentTime = timeMs / 1000 // Convert to seconds

      // Immediately update playback state to sync waveform red line
      this.playbackState.currentTime = timeMs
      this.updatePlaybackState()

      // Trigger time update callback for immediate UI sync
      if (this.timeUpdateCallback) {
        this.timeUpdateCallback(timeMs)
      }
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume))
      this.playbackState.volume = this.audio.volume
    }

    if (this.gainNode) {
      this.gainNode.gain.value = this.playbackState.volume
    }

    this.updatePlaybackState()
  }

  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.25, Math.min(4, rate))
      this.playbackState.playbackRate = this.audio.playbackRate
    }

    this.updatePlaybackState()
  }

  getPlaybackState(): PlaybackState {
    return {
      ...this.playbackState
    }
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallback = callback
  }

  onPlaybackStateChange(callback: (state: PlaybackState) => void): void {
    this.playbackStateCallback = callback
  }

  private updatePlaybackState(): void {
    if (this.playbackStateCallback) {
      this.playbackStateCallback({
        ...this.playbackState
      })
    }
  }

  // Get frequency data for visualization
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  // Get time domain data for waveform
  getTimeDomainData(): Uint8Array | null {
    if (!this.analyser) return null

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(dataArray)
    return dataArray
  }

  // Generate waveform data from audio buffer
  async generateWaveformData(samples: number = 1000): Promise<number[] | null> {
    if (!this.audio || !this.audioContext) return null

    try {
      // Fetch audio data
      const response = await fetch(this.audio.src)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

      const channelData = audioBuffer.getChannelData(0)
      const blockSize = Math.floor(channelData.length / samples)
      const peaks: number[] = []

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        const end = start + blockSize
        let max = 0

        for (let j = start; j < end; j++) {
          max = Math.max(max, Math.abs(channelData[j]))
        }

        peaks.push(max)
      }

      return peaks
    }
    catch (error) {
      console.error('Failed to generate waveform data:', error)
      return null
    }
  }

  private async detectAudioDuration(audioFile: AudioFile): Promise<number> {
    // First check if we have a stored duration from previous detection
    if (audioFile.duration && audioFile.duration > 0) {
      console.log('✅ Using stored duration:', audioFile.duration / 1000, 'seconds')
      return audioFile.duration
    }

    // Second try the simple approach - if HTML5 audio has valid duration
    if (this.audio && isFinite(this.audio.duration) && this.audio.duration > 0) {
      console.log('📏 Duration from HTML5 audio:', this.audio.duration, 'seconds')
      return this.audio.duration * 1000 // Convert to ms
    }

    console.log('⏳ HTML5 duration invalid, using Web Audio API to detect duration...')

    try {
      // Use Web Audio API to decode the entire file and get accurate duration
      const arrayBuffer = await this.fileToArrayBuffer(audioFile)

      if (!this.audioContext) {
        throw new Error('AudioContext not initialized')
      }

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      const durationMs = audioBuffer.duration * 1000

      console.log('🎵 Duration detected via Web Audio API:', audioBuffer.duration, 'seconds')
      return durationMs
    }
    catch (error) {
      console.error('❌ Failed to detect audio duration:', error)

      // Fallback: return a default duration and warn user
      console.warn('⚠️ Using fallback duration of 3 minutes - waveform scrolling may not work correctly')
      return 180000 // 3 minutes in ms
    }
  }

  private async fileToArrayBuffer(audioFile: AudioFile): Promise<ArrayBuffer> {
    if (audioFile.file) {
      return await audioFile.file.arrayBuffer()
    }
    else if (audioFile.url) {
      const response = await fetch(audioFile.url)
      return await response.arrayBuffer()
    }
    else {
      throw new Error('No audio file or URL available')
    }
  }

  dispose(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
    }

    if (this.source) {
      this.source.disconnect()
    }

    if (this.audioContext) {
      this.audioContext.close()
    }

    this.timeUpdateCallback = undefined
    this.playbackStateCallback = undefined
  }
}

// Export singleton instance
export const audioService = new AudioService()
