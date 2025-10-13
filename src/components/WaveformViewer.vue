<template>
  <div class="waveform-viewer">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">🌊 Audio Waveform</h5>
        <div class="waveform-controls">
          <button 
            class="btn btn-sm btn-outline-secondary me-2"
            @click="zoomOut"
            :disabled="zoomLevel <= 1"
            title="Zoom out"
          >
            <i class="bi bi-zoom-out"></i>
          </button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <button 
            class="btn btn-sm btn-outline-secondary ms-2"
            @click="zoomIn"
            :disabled="zoomLevel >= 5"
            title="Zoom in"
          >
            <i class="bi bi-zoom-in"></i>
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
}

const props = withDefaults(defineProps<Props>(), {
  currentLineIndex: 0
})

// Emits
const emit = defineEmits<{
  'seek': [time: number]
  'lyrics-position': [lineIndex: number, time: number]
  'selection': [startTime: number, endTime: number]
}>()

// Reactive state
const waveformContainer = ref<HTMLElement>()
const waveformCanvas = ref<HTMLCanvasElement>()
const isLoading = ref(false)
const zoomLevel = ref(1)
const canvasWidth = ref(800)
const canvasHeight = ref(150)
const selectionStart = ref<number | null>(null)
const selectionEnd = ref<number | null>(null)
const isDragging = ref(false)
const dragMarkerIndex = ref(-1)
const selectedMarkers = ref<number[]>([])

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
  return props.lyrics.filter(lyric => lyric.startTime !== undefined).length
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

const drawWaveform = async () => {
  const canvas = waveformCanvas.value
  if (!canvas || !props.waveformData) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw waveform
  const { peaks } = props.waveformData
  const width = canvas.width
  const height = canvas.height
  const barWidth = width / peaks.length
  
  ctx.fillStyle = '#007bff'
  
  for (let i = 0; i < peaks.length; i += Math.ceil(peaks.length / (width * zoomLevel.value))) {
    const barHeight = Math.abs(peaks[i]) * height * 0.8
    const x = (i / peaks.length) * width * zoomLevel.value
    const y = (height - barHeight) / 2
    
    ctx.fillRect(x, y, Math.max(1, barWidth * zoomLevel.value), barHeight)
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
    const samples = 1000 // Number of samples for visualization
    const blockSize = Math.floor(channelData.length / samples)
    const peaks = []
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = start + blockSize
      let max = 0
      
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channelData[j]))
      }
      
      peaks.push(max)
    }
    
    // Update waveform data (this would typically come from props)
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

// Lifecycle
onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
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