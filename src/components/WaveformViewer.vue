<template>
  <div class="waveform-viewer">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">🌊 Audio Waveform & Controls</h5>
        <div class="d-flex align-items-center">
          <div class="mode-indicator me-3" v-if="isTimingMode !== undefined">
            <span class="badge" :class="isTimingMode ? 'bg-warning' : 'bg-secondary'">
              {{ isTimingMode ? 'Timing Mode' : 'Playback Mode' }}
            </span>
          </div>
          <div class="loading-spinner me-2" v-if="isLoading">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loadin  // Default to sliding window mode with 15 seconds as requested
  viewMode.value = 'window'  
  windowDuration.value = 15
  autoScroll.value = true</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Integrated Timing Controls -->
      <div class="card-body border-bottom" v-if="playbackState">
        <div class="timing-controls-section">
          <!-- Audio Player Controls -->
          <div class="player-controls d-flex justify-content-center align-items-center gap-2 mb-3">
            <button 
              class="btn btn-outline-secondary btn-sm"
              @click="emit('skip-backward')"
              title="Skip backward 10s"
            >
              <i class="bi bi-skip-backward"></i>
            </button>
            
            <button 
              class="btn btn-primary"
              @click="emit('play-pause')"
              :disabled="!audioFile?.file"
            >
              <i :class="playbackState.isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i>
            </button>
            
            <button 
              class="btn btn-outline-secondary btn-sm"
              @click="emit('skip-forward')"
              title="Skip forward 10s"
            >
              <i class="bi bi-skip-forward"></i>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-container mb-2">
            <div class="progress" style="height: 8px; cursor: pointer;" @click="seekToClick">
              <div 
                class="progress-bar" 
                :style="{ width: progressPercent + '%' }"
                role="progressbar"
              ></div>
            </div>
            <div class="time-display d-flex justify-content-between mt-1">
              <small class="text-muted">{{ formatTime(currentTime * 1000) }}</small>
              <small class="text-muted">{{ formatTime((audioFile?.duration || 0) * 1000) }}</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Waveform Controls -->
      <div class="card-body border-bottom py-2">
        <div class="waveform-controls">
          <!-- View Mode Toggle -->
          <div class="btn-group me-2" role="group">
            <button 
              class="btn btn-sm"
              :class="viewMode === 'window' ? 'btn-primary' : 'btn-outline-primary'"
              @click="setViewMode('window')"
              title="Sliding window view"
            >
              <i class="bi bi-window"></i> Window
            </button>
            <button 
              class="btn btn-sm"
              :class="viewMode === 'full' ? 'btn-primary' : 'btn-outline-primary'"
              @click="setViewMode('full')"
              title="Full song view"
            >
              <i class="bi bi-arrows-fullscreen"></i> Full
            </button>
          </div>
          
          <!-- Zoom Controls (only for full view) -->
          <div v-if="viewMode === 'full'" class="zoom-controls me-2">
            <button 
              class="btn btn-sm btn-outline-secondary me-1"
              @click="zoomOut"
              :disabled="zoomLevel <= 1"
              title="Zoom out"
            >
              <i class="bi bi-zoom-out"></i>
            </button>
            <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
            <button 
              class="btn btn-sm btn-outline-secondary ms-1"
              @click="zoomIn"
              :disabled="zoomLevel >= 5"
              title="Zoom in"
            >
              <i class="bi bi-zoom-in"></i>
            </button>
          </div>
          
          <!-- Window Duration Control (only for window view) -->
          <div v-if="viewMode === 'window'" class="window-controls me-2">
            <select class="form-select form-select-sm" v-model="windowDuration" @change="onWindowDurationChange">
              <option :value="10">10s</option>
              <option :value="15">15s</option>
              <option :value="25">25s</option>
            </select>
          </div>
          
          <!-- Auto-scroll toggle -->
          <button 
            v-if="viewMode === 'window'"
            class="btn btn-sm"
            :class="autoScroll ? 'btn-success' : 'btn-outline-success'"
            @click="toggleAutoScroll"
            title="Auto-scroll with playback"
          >
            <i class="bi bi-skip-end"></i>
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="waveform-container" ref="waveformContainer">
          <!-- Loading State -->
          <div v-if="isLoading" class="loading-state d-flex align-items-center justify-content-center">
            <div class="spinner-border text-primary me-2" role="status"></div>
            <span>Analyzing audio...</span>
          </div>

          <!-- No Audio State -->
          <div v-else-if="!audioFile?.file" class="no-audio-state d-flex align-items-center justify-content-center">
            <div class="text-center text-muted">
              <i class="bi bi-music-note-beamed display-4"></i>
              <p class="mt-2">No audio file loaded</p>
            </div>
          </div>

          <!-- Waveform Canvas -->
          <div v-else class="waveform-canvas-container" @mousedown="startSelection" @mousemove="updateSelection" @mouseup="endSelection">
            <canvas 
              ref="waveformCanvas"
              class="waveform-canvas"
              :width="canvasWidth"
              :height="canvasHeight"
              @click="seekToPosition"
            ></canvas>

            <!-- Playback Position Indicator -->
            <div 
              class="playback-indicator"
              :style="{ left: playbackPosition + 'px' }"
            ></div>

            <!-- Lyrics Markers -->
            <div 
              v-for="(lyric, index) in positionedLyrics"
              :key="lyric.id"
              class="lyric-marker"
              :class="{ 
                'active': index === currentLineIndex,
                'selected': selectedMarkers.includes(index)
              }"
              :style="{ left: lyric.position + 'px' }"
              @click="selectLyricMarker(index, $event)"
              @mousedown="startDragMarker(index, $event)"
              :title="`Line ${lyric.lineNumber}: ${lyric.text}`"
            >
              <div class="marker-line"></div>
              <div class="marker-label">{{ lyric.lineNumber }}</div>
            </div>

            <!-- Selection Area -->
            <div 
              v-if="selectionStart !== null && selectionEnd !== null"
              class="selection-area"
              :style="selectionStyle"
            ></div>

            <!-- Time Scale -->
            <div class="time-scale">
              <div 
                v-for="mark in timeMarks"
                :key="mark.time"
                class="time-mark"
                :style="{ left: mark.position + 'px' }"
              >
                <div class="time-mark-line"></div>
                <div class="time-mark-label">{{ mark.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <small class="text-muted">
              <span v-if="audioFile?.duration">
                Duration: {{ formatTime(audioFile.duration) }}
              </span>
              <span v-if="selectedDuration"> • Selection: {{ formatTime(selectedDuration) }}</span>
            </small>
          </div>
          <div class="col-sm-6 text-end">
            <small class="text-muted">
              {{ lyrics.length }} lyrics • {{ timedLyricsCount }} positioned
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { AudioFile, LyricLine, WaveformData } from '@/types/karaoke'

// Props
interface Props {
  audioFile: AudioFile
  lyrics: LyricLine[]
  currentTime: number
  waveformData: WaveformData | null
  currentLineIndex?: number
  playbackState?: any
  isTimingMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentLineIndex: 0,
  isTimingMode: false
})

// Emits
const emit = defineEmits<{
  'seek': [time: number]
  'lyrics-position': [lineIndex: number, time: number]
  'selection': [startTime: number, endTime: number]
  'play-pause': []
  'skip-backward': []
  'skip-forward': []
}>()

// Reactive state
const waveformContainer = ref<HTMLElement>()
const waveformCanvas = ref<HTMLCanvasElement>()
const isLoading = ref(false)
const generatedWaveformData = ref<WaveformData | null>(null)
const zoomLevel = ref(1)
const canvasWidth = ref(800)
const canvasHeight = ref(120) // Increased height for better visibility
const selectionStart = ref<number | null>(null)
const selectionEnd = ref<number | null>(null)
const isDragging = ref(false)
const dragMarkerIndex = ref(-1)
const selectedMarkers = ref<number[]>([])

// New waveform enhancement controls
const viewMode = ref<'full' | 'window'>('window') // Default to sliding window
const windowDuration = ref(15) // 15 seconds window (in seconds for UI)
const windowStart = ref(0) // Start position of the window in seconds
const autoScroll = ref(true) // Auto-scroll with playback

// Computed properties
const positionedLyrics = computed(() => {
  return props.lyrics
    .filter(lyric => lyric.startTime !== undefined)
    .map((lyric, index) => ({
      ...lyric,
      position: timeToPixel(lyric.startTime!)
    }))
})

const playbackPosition = computed(() => {
  return timeToPixel(props.currentTime)
})

const timedLyricsCount = computed(() => {
  return props.lyrics.filter((line: LyricLine) => line.startTime !== undefined).length
})

// Progress bar computed properties
const progressPercent = computed(() => {
  if (!props.playbackState || !props.audioFile?.duration) return 0
  return Math.min((props.currentTime / props.audioFile.duration) * 100, 100)
})

const selectedDuration = computed(() => {
  if (selectionStart.value !== null && selectionEnd.value !== null) {
    const startTime = pixelToTime(Math.min(selectionStart.value, selectionEnd.value))
    const endTime = pixelToTime(Math.max(selectionStart.value, selectionEnd.value))
    return endTime - startTime
  }
  return 0
})

const selectionStyle = computed(() => {
  if (selectionStart.value !== null && selectionEnd.value !== null) {
    const left = Math.min(selectionStart.value, selectionEnd.value)
    const width = Math.abs(selectionEnd.value - selectionStart.value)
    return {
      left: left + 'px',
      width: width + 'px'
    }
  }
  return {}
})

const timeMarks = computed(() => {
  if (!props.audioFile?.duration) return []
  
  const marks = []
  const duration = props.audioFile.duration
  const interval = duration > 60000 ? 10000 : 5000 // 10s or 5s intervals
  
  for (let time = 0; time <= duration; time += interval) {
    marks.push({
      time,
      position: timeToPixel(time),
      label: formatTime(time)
    })
  }
  
  return marks
})

// Methods
const timeToPixel = (timeMs: number): number => {
  if (!props.audioFile?.duration) return 0
  const ratio = timeMs / props.audioFile.duration
  return ratio * canvasWidth.value * zoomLevel.value
}

const pixelToTime = (pixel: number): number => {
  if (!props.audioFile?.duration) return 0
  const ratio = pixel / (canvasWidth.value * zoomLevel.value)
  return ratio * props.audioFile.duration
}

const seekToPosition = (event: MouseEvent) => {
  if (isDragging.value) return
  
  const rect = waveformCanvas.value!.getBoundingClientRect()
  const x = event.clientX - rect.left
  const time = pixelToTime(x)
  emit('seek', time)
}

const selectLyricMarker = (index: number, event: MouseEvent) => {
  event.stopPropagation()
  
  if (event.ctrlKey || event.metaKey) {
    // Multi-select
    const markerIndex = selectedMarkers.value.indexOf(index)
    if (markerIndex >= 0) {
      selectedMarkers.value.splice(markerIndex, 1)
    } else {
      selectedMarkers.value.push(index)
    }
  } else {
    // Single select
    selectedMarkers.value = [index]
  }
}

const startDragMarker = (index: number, event: MouseEvent) => {
  event.stopPropagation()
  isDragging.value = true
  dragMarkerIndex.value = index
  
  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return
    
    const rect = waveformCanvas.value!.getBoundingClientRect()
    const x = moveEvent.clientX - rect.left
    const time = pixelToTime(x)
    
    // Update marker position temporarily (visual feedback)
    // The actual update happens on mouse up
  }
  
  const handleMouseUp = () => {
    if (isDragging.value) {
      const rect = waveformCanvas.value!.getBoundingClientRect()
      const x = event.clientX - rect.left
      const time = pixelToTime(x)
      
      emit('lyrics-position', dragMarkerIndex.value, Math.max(0, time))
    }
    
    isDragging.value = false
    dragMarkerIndex.value = -1
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const startSelection = (event: MouseEvent) => {
  if (event.target !== waveformCanvas.value) return
  
  const rect = waveformCanvas.value!.getBoundingClientRect()
  const x = event.clientX - rect.left
  selectionStart.value = x
  selectionEnd.value = x
}

const updateSelection = (event: MouseEvent) => {
  if (selectionStart.value === null) return
  
  const rect = waveformCanvas.value!.getBoundingClientRect()
  const x = event.clientX - rect.left
  selectionEnd.value = x
}

const endSelection = () => {
  if (selectionStart.value !== null && selectionEnd.value !== null) {
    const startTime = pixelToTime(Math.min(selectionStart.value, selectionEnd.value))
    const endTime = pixelToTime(Math.max(selectionStart.value, selectionEnd.value))
    
    if (Math.abs(selectionEnd.value - selectionStart.value) > 5) {
      emit('selection', startTime, endTime)
    }
  }
  
  // Clear selection after a delay
  setTimeout(() => {
    selectionStart.value = null
    selectionEnd.value = null
  }, 2000)
}

const zoomIn = () => {
  if (zoomLevel.value < 5) {
    zoomLevel.value += 0.5
    drawWaveform()
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 1) {
    zoomLevel.value -= 0.5
    drawWaveform()
  }
}

// View mode controls
const setViewMode = (mode: 'full' | 'window') => {
  viewMode.value = mode
  if (mode === 'window') {
    // Reset zoom when switching to window mode
    zoomLevel.value = 1
    updateWindowPosition()
  }
  drawWaveform()
}

const onWindowDurationChange = () => {
  updateWindowPosition()
  drawWaveform()
}

const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value
}

const updateWindowPosition = () => {
  if (viewMode.value === 'window') {
    if (autoScroll.value && props.currentTime > 0) {
      // Center the window around current time when playing
      windowStart.value = Math.max(0, props.currentTime - windowDuration.value / 2)
    } else {
      // When not playing or at start, show from beginning
      windowStart.value = 0
    }
    console.log('Window position updated:', { 
      windowStart: windowStart.value, 
      windowDuration: windowDuration.value, 
      currentTime: props.currentTime,
      autoScroll: autoScroll.value 
    })
  }
}

// Timing controls methods
const seekToClick = (event: MouseEvent) => {
  if (!props.audioFile?.duration) return
  
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const seekTime = percentage * props.audioFile.duration
  
  emit('seek', seekTime)
}

const drawWaveform = async () => {
  const canvas = waveformCanvas.value
  const waveformData = props.waveformData || generatedWaveformData.value
  if (!canvas || !waveformData) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw waveform
  const { peaks } = waveformData
  const width = canvas.width
  const height = canvas.height
  
  // Calculate visible range based on view mode
  let visiblePeaks = peaks
  let startIndex = 0
  
  if (viewMode.value === 'window') {
    // Show only the window duration worth of peaks
    const totalDuration = waveformData.duration || props.audioFile?.duration || 1
    const startRatio = windowStart.value / totalDuration
    const durationRatio = windowDuration.value / totalDuration
    
    startIndex = Math.floor(startRatio * peaks.length)
    const endIndex = Math.min(Math.floor((startRatio + durationRatio) * peaks.length), peaks.length)
    visiblePeaks = peaks.slice(startIndex, endIndex)
    
    // Debug logging
    console.log('Window mode debug:', { 
      totalDuration, 
      windowStart: windowStart.value, 
      windowDuration: windowDuration.value, 
      startRatio, 
      durationRatio,
      peaksLength: peaks.length,
      startIndex, 
      endIndex, 
      visiblePeaksLength: visiblePeaks.length,
      visiblePeaksPreview: visiblePeaks.slice(0, 5)
    })
    
    // Fallback: if no visible peaks (edge case), show first portion
    if (visiblePeaks.length === 0) {
      const fallbackEndIndex = Math.min(Math.floor(peaks.length * 0.2), peaks.length) // Show first 20%
      visiblePeaks = peaks.slice(0, fallbackEndIndex)
      console.log('Fallback applied, showing first 20% of peaks:', visiblePeaks.length)
    }
  }
  
  const barWidth = width / visiblePeaks.length
  
  // Enhanced visualization: top-half waves, bottom-centered, auto-height
  ctx.fillStyle = '#3b82f6'
  ctx.strokeStyle = '#1d4ed8'
  
  // Calculate step size for proper zoom level - with 8000 samples, we can afford smaller steps
  const stepSize = viewMode.value === 'window' 
    ? Math.max(1, Math.ceil(visiblePeaks.length / (width * 2))) // More detail for window mode
    : Math.max(1, Math.ceil(visiblePeaks.length / (width * zoomLevel.value * 2))) // More detail for full mode too
  
  for (let i = 0; i < visiblePeaks.length; i += stepSize) {
    // Only show top half of waveform (positive amplitudes only)
    const amplitude = Math.abs(visiblePeaks[i])
    
    // More aggressive height scaling - multiply by a scaling factor
    const scalingFactor = 3.0 // Increase this to make waveform taller
    const barHeight = Math.min(amplitude * height * scalingFactor, height * 0.95) // Use up to 95% of height
    
    const x = viewMode.value === 'window' 
      ? (i / visiblePeaks.length) * width
      : (i / visiblePeaks.length) * width * zoomLevel.value
    const y = height - barHeight // Bottom-centered: start from bottom and go up
    
    // Calculate bar width based on view mode
    const actualBarWidth = viewMode.value === 'window'
      ? Math.max(1, width / visiblePeaks.length * stepSize)
      : Math.max(1, barWidth * zoomLevel.value)
    
    // Draw the bar
    if (barHeight > 1) {
      ctx.fillRect(x, y, actualBarWidth, barHeight)
    }
  }
  
  // Draw baseline at bottom
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height - 1)
  ctx.lineTo(width, height - 1)
  ctx.stroke()
  
  // Draw current time indicator if provided
  if (props.currentTime !== undefined) {
    const totalDuration = waveformData.duration || props.audioFile?.duration
    if (totalDuration) {
      let timeX
      if (viewMode.value === 'window') {
        // In window mode, always show red bar at 50% (middle) - waveform scrolls underneath
        timeX = width / 2
      } else {
        timeX = (props.currentTime / totalDuration) * width * zoomLevel.value
      }
      
      if (timeX >= 0 && timeX <= width) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3 // Make it slightly thicker for better visibility
        ctx.beginPath()
        ctx.moveTo(timeX, 0)
        ctx.lineTo(timeX, height)
        ctx.stroke()
      }
    }
  }
}

const generateWaveformData = async () => {
  if (!props.audioFile?.file) return
  
  isLoading.value = true
  
  try {
    const audioContext = new AudioContext()
    const arrayBuffer = await props.audioFile.file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const channelData = audioBuffer.getChannelData(0)
    const samples = 8000 // Much higher sample count for smooth waveform
    const blockSize = Math.floor(channelData.length / samples)
    const peaks = []
    
    // Find the overall maximum to normalize peaks properly
    let globalMax = 0
    for (let i = 0; i < channelData.length; i++) {
      globalMax = Math.max(globalMax, Math.abs(channelData[i]))
    }
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = start + blockSize
      let max = 0
      
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channelData[j]))
      }
      
      // Normalize peaks to use full height range
      peaks.push(globalMax > 0 ? max / globalMax : 0)
    }
    
    // Store the generated waveform data
    generatedWaveformData.value = {
      peaks,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      channels: audioBuffer.numberOfChannels
    }
    
    // Initialize window position now that we have duration
    if (viewMode.value === 'window') {
      updateWindowPosition()
    }
    
    nextTick(() => {
      drawWaveform()
    })
    
  } catch (error) {
    console.error('Error generating waveform:', error)
  } finally {
    isLoading.value = false
  }
}

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const updateCanvasSize = () => {
  if (waveformContainer.value) {
    canvasWidth.value = waveformContainer.value.clientWidth - 20
  }
}

// Watchers
watch(() => props.audioFile, () => {
  if (props.audioFile?.file) {
    generateWaveformData()
  }
}, { immediate: true })

watch(() => props.waveformData, () => {
  if (props.waveformData) {
    nextTick(() => {
      drawWaveform()
    })
  }
})

watch(() => generatedWaveformData.value, () => {
  if (generatedWaveformData.value) {
    nextTick(() => {
      drawWaveform()
    })
  }
})

watch(() => props.currentTime, (newTime) => {
  // Auto-scroll in window mode - keep red bar at 50% (middle), wave scrolls left
  if (viewMode.value === 'window' && autoScroll.value && newTime !== undefined && props.audioFile?.duration) {
    const halfWindow = windowDuration.value / 2
    
    // Always keep current time centered in the window (red bar at 50%)
    // This makes the waveform scroll left while red bar stays in middle
    windowStart.value = Math.max(0, Math.min(newTime - halfWindow, props.audioFile.duration - windowDuration.value))
  }
  
  nextTick(() => {
    drawWaveform()
  })
})

// Lifecycle
onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
  
  // Values are already set in ref initialization - 15 seconds window mode with auto-scroll
})
</script>

<style scoped>
.waveform-container {
  min-height: 200px;
  position: relative;
  background: #f8f9fa;
  overflow-x: auto;
}

.loading-state,
.no-audio-state {
  height: 200px;
}

.waveform-canvas-container {
  position: relative;
  padding: 20px 10px 40px;
  min-height: 200px;
}

.waveform-canvas {
  display: block;
  cursor: crosshair;
  border: 1px solid #dee2e6;
  background: white;
}

.playback-indicator {
  position: absolute;
  top: 20px;
  bottom: 40px;
  width: 2px;
  background-color: #dc3545;
  z-index: 10;
  pointer-events: none;
}

.playback-indicator::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -6px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #dc3545;
}

.lyric-marker {
  position: absolute;
  top: 15px;
  bottom: 35px;
  cursor: pointer;
  z-index: 5;
}

.marker-line {
  width: 2px;
  height: 100%;
  background-color: #28a745;
  margin: 0 auto;
}

.marker-label {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #28a745;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
}

.lyric-marker.active .marker-line {
  background-color: #ffc107;
  width: 3px;
}

.lyric-marker.active .marker-label {
  background-color: #ffc107;
  color: #000;
}

.lyric-marker.selected .marker-line {
  background-color: #007bff;
  width: 3px;
}

.lyric-marker.selected .marker-label {
  background-color: #007bff;
}

.selection-area {
  position: absolute;
  top: 20px;
  bottom: 40px;
  background-color: rgba(0, 123, 255, 0.2);
  border: 1px solid #007bff;
  pointer-events: none;
  z-index: 3;
}

.time-scale {
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 30px;
}

.time-mark {
  position: absolute;
  bottom: 0;
}

.time-mark-line {
  width: 1px;
  height: 10px;
  background-color: #6c757d;
  margin: 0 auto;
}

.time-mark-label {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #6c757d;
  white-space: nowrap;
}

.zoom-level {
  font-size: 0.875rem;
  color: #6c757d;
  min-width: 50px;
  text-align: center;
}

.waveform-controls {
  display: flex;
  align-items: center;
}

/* Scrollbar styling */
.waveform-container::-webkit-scrollbar {
  height: 8px;
}

.waveform-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.waveform-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.waveform-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>