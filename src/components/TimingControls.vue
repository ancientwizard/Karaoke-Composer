<template>
  <div class="timing-controls">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">⏯️ Timing Controls</h5>
        <div class="mode-indicator">
          <span class="badge" :class="isTimingMode ? 'bg-warning' : 'bg-secondary'">
            {{ isTimingMode ? 'Timing Mode' : 'Playback Mode' }}
          </span>
        </div>
      </div>
      <div class="card-body">
        <!-- Audio Player Controls -->
        <div class="player-section mb-4">
          <div class="player-controls d-flex justify-content-center align-items-center gap-2 mb-3">
            <button class="btn btn-outline-secondary btn-sm" @click="skipBackward" title="Skip backward 10s">
              <i class="bi bi-skip-backward"></i>
            </button>

            <button class="btn btn-primary btn-lg" @click="togglePlayPause" :disabled="!hasAudio">
              <i :class="playbackState.isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i>
            </button>

            <button class="btn btn-outline-secondary btn-sm" @click="skipForward" title="Skip forward 10s">
              <i class="bi bi-skip-forward"></i>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-container mb-3">
            <div class="progress" @click="seekToClick">
              <div class="progress-bar" :style="{ width: progressPercent + '%' }" role="progressbar"></div>
            </div>
            <div class="time-display d-flex justify-content-between mt-1">
              <small class="text-muted">{{ formatTime(playbackState.currentTime) }}</small>
              <small class="text-muted">{{ formatTime(playbackState.duration) }}</small>
            </div>
          </div>

          <!-- Playback Speed and Volume -->
          <div class="row">
            <div class="col-md-6">
              <label class="form-label">Speed</label>
              <div class="d-flex align-items-center gap-2">
                <span class="small">0.5x</span>
                <input type="range" class="form-range" min="0.5" max="2" step="0.1" :value="playbackState.playbackRate"
                  @input="(e) => emit('playback-rate', parseFloat((e.target as HTMLInputElement).value))" />
                <span class="small">2x</span>
                <span class="badge bg-light text-dark">{{ playbackState.playbackRate }}x</span>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Volume</label>
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-volume-down"></i>
                <input type="range" class="form-range" min="0" max="1" step="0.1" :value="playbackState.volume"
                  @input="(e) => emit('volume', parseFloat((e.target as HTMLInputElement).value))" />
                <i class="bi bi-volume-up"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Timing Mode Controls -->
        <div class="timing-section">
          <div class="row mb-3">
            <div class="col-md-6">
              <button class="btn w-100" :class="isTimingMode ? 'btn-warning' : 'btn-outline-warning'"
                @click="toggleTimingMode">
                <i class="bi bi-stopwatch"></i>
                {{ isTimingMode ? 'Exit Timing Mode' : 'Enter Timing Mode' }}
              </button>
            </div>
            <div class="col-md-6">
              <button class="btn btn-outline-primary w-100" @click="autoSync" :disabled="!hasAudio || isTimingMode"
                title="Attempt automatic synchronization">
                <i class="bi bi-magic"></i>
                Auto Sync
              </button>
            </div>
          </div>

          <!-- Musical Timing Controls -->
          <div class="row mb-3">
            <div class="col-md-4">
              <button class="btn btn-outline-success w-100" @click="applyMusicalTiming" :disabled="!hasTimedWords"
                title="Apply musical intelligence to syllable timing">
                <i class="bi bi-music-note"></i>
                Musical Timing
              </button>
            </div>
            <div class="col-md-4">
              <button class="btn btn-outline-secondary w-100" @click="resetSyllableTiming" :disabled="!hasTimedWords"
                title="Reset all syllable timing to start over">
                <i class="bi bi-arrow-clockwise"></i>
                Reset Syllables
              </button>
            </div>
            <div class="col-md-4">
              <button class="btn btn-outline-info w-100" @click="showTimingAnalysis = !showTimingAnalysis"
                :disabled="!hasTimedWords" title="Show song timing analysis">
                <i class="bi bi-graph-up"></i>
                Analysis
              </button>
            </div>
          </div>

          <!-- Timing Analysis Panel -->
          <div v-if="showTimingAnalysis && songAnalysis" class="alert alert-info">
            <h6><i class="bi bi-graph-up"></i> Song Analysis</h6>
            <div class="row small">
              <div class="col-6">
                <strong>BPM:</strong> {{ songAnalysis.estimatedBPM.toFixed(0) }}<br>
                <strong>Words:</strong> {{ songAnalysis.totalWords }}
              </div>
              <div class="col-6">
                <strong>Rests:</strong> {{ songAnalysis.detectedRests }}<br>
                <strong>Quality:</strong> {{ songAnalysis.timingQuality }}
              </div>
            </div>
          </div>

          <!-- Timing Mode Instructions -->
          <div v-if="isTimingMode" class="timing-instructions alert alert-warning">
            <div class="d-flex align-items-center mb-2">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Timing Mode Active</strong>
            </div>
            <ul class="mb-0 small">
              <li>Press <kbd>Space</kbd> to assign current time to selected lyric line</li>
              <li>Use <kbd>↑</kbd>/<kbd>↓</kbd> arrows to navigate between lines</li>
              <li>Click timeline or use player controls to move through audio</li>
              <li>Press <kbd>Esc</kbd> to exit timing mode</li>
            </ul>
          </div>

          <!-- Quick Timing Actions -->
          <div v-if="isTimingMode" class="quick-actions">
            <div class="row">
              <div class="col-md-4">
                <button class="btn btn-success w-100 btn-sm" @click="assignTiming" :disabled="!hasAudio">
                  <i class="bi bi-check-circle"></i>
                  Assign Time
                  <br /><small>(Space)</small>
                </button>
              </div>
              <div class="col-md-4">
                <button class="btn btn-outline-warning w-100 btn-sm" @click="clearCurrentTiming">
                  <i class="bi bi-clock-history"></i>
                  Clear Time
                </button>
              </div>
              <div class="col-md-4">
                <button class="btn btn-outline-info w-100 btn-sm" @click="playFromCurrent" :disabled="!hasAudio">
                  <i class="bi bi-play-circle"></i>
                  Play from Line
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sync Statistics -->
        <div class="sync-stats mt-4">
          <div class="row text-center">
            <div class="col-3">
              <div class="stat-item">
                <div class="stat-value">{{ timedLines }}/{{ totalLines }}</div>
                <div class="stat-label">Lines</div>
              </div>
            </div>
            <div class="col-3">
              <div class="stat-item">
                <div class="stat-value">{{ timedWords }}/{{ totalWords }}</div>
                <div class="stat-label">Words</div>
              </div>
            </div>
            <div class="col-3">
              <div class="stat-item">
                <div class="stat-value">{{ timedSyllables }}/{{ totalSyllables }}</div>
                <div class="stat-label">Syllables</div>
              </div>
            </div>
            <div class="col-3">
              <div class="stat-item">
                <div class="stat-value">{{ wordCompletionPercent }}%</div>
                <div class="stat-label">Complete</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlaybackState } from '@/types/karaoke'

// Props
interface Props {
  playbackState: PlaybackState
  isTimingMode: boolean
  currentLine?: number
  totalLines?: number
  timedLines?: number
  totalWords?: number
  timedWords?: number
  totalSyllables?: number
  timedSyllables?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentLine: 0,
  totalLines: 0,
  timedLines: 0,
  totalWords: 0,
  timedWords: 0,
  totalSyllables: 0,
  timedSyllables: 0,
})

// Emits
const emit = defineEmits<{
  'play-pause': []
  seek: [time: number]
  'timing-mode': [enabled: boolean]
  'assign-timing': []
  'clear-timing': []
  'playback-rate': [rate: number]
  volume: [volume: number]
  'apply-musical-timing': []
  'reset-syllable-timing': []
}>()

// Reactive state
const progressElement = ref<HTMLElement>()

// Computed properties
const hasAudio = computed(() => {
  return props.playbackState.duration > 0
})

const progressPercent = computed(() => {
  if (props.playbackState.duration === 0) return 0
  return (props.playbackState.currentTime / props.playbackState.duration) * 100
})

const completionPercent = computed(() => {
  if (props.totalLines === 0) return 0
  return Math.round((props.timedLines / props.totalLines) * 100)
})

const wordCompletionPercent = computed(() => {
  if (!props.totalWords || props.totalWords === 0) return 0
  return Math.round(((props.timedWords || 0) / props.totalWords) * 100)
})

const estimatedDuration = computed(() => {
  return formatTime(props.playbackState.duration)
})

// Methods
const togglePlayPause = () => {
  emit('play-pause')
}

const seekToClick = (event: MouseEvent) => {
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const seekTime = percentage * props.playbackState.duration
  emit('seek', seekTime)
}

const skipBackward = () => {
  const newTime = Math.max(0, props.playbackState.currentTime - 10000) // 10 seconds
  emit('seek', newTime)
}

const skipForward = () => {
  const newTime = Math.min(props.playbackState.duration, props.playbackState.currentTime + 10000) // 10 seconds
  emit('seek', newTime)
}

const toggleTimingMode = () => {
  emit('timing-mode', !props.isTimingMode)
}

const assignTiming = () => {
  emit('assign-timing')
}

const clearCurrentTiming = () => {
  emit('clear-timing')
}

const playFromCurrent = () => {
  // This would seek to the current line's timing and play
  // Implementation depends on the current line's start time
  emit('play-pause')
}

const autoSync = () => {
  // TODO: Implement automatic synchronization
  console.log('Auto sync not yet implemented')
}

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Musical Timing - reactive state
const showTimingAnalysis = ref(false)
const songAnalysis = ref<{
  estimatedBPM: number
  totalWords: number
  detectedRests: number
  timingQuality: string
} | null>(null)

// Musical Timing computed properties
const hasTimedWords = computed(() => {
  return (props.timedWords || 0) > 0
})

// Musical Timing methods
const applyMusicalTiming = () => {
  emit('apply-musical-timing')
}

const resetSyllableTiming = () => {
  emit('reset-syllable-timing')
}

const updateSongAnalysis = (analysis: any) => {
  songAnalysis.value = analysis
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement) return // Don't interfere with input fields

  switch (event.code) {
    case 'Space':
      if (props.isTimingMode) {
        event.preventDefault()
        assignTiming()
      } else {
        event.preventDefault()
        togglePlayPause()
      }
      break
    case 'Escape':
      if (props.isTimingMode) {
        event.preventDefault()
        toggleTimingMode()
      }
      break
    case 'ArrowLeft':
      if (event.shiftKey) {
        event.preventDefault()
        skipBackward()
      }
      break
    case 'ArrowRight':
      if (event.shiftKey) {
        event.preventDefault()
        skipForward()
      }
      break
  }
}

// Add keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<style scoped>
.player-controls .btn-lg {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-container {
  position: relative;
}

.progress {
  height: 8px;
  cursor: pointer;
  border-radius: 4px;
  background-color: #e9ecef;
}

.progress-bar {
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 4px;
  transition: width 0.1s linear;
}

.form-range {
  height: 6px;
}

.timing-instructions {
  border-left: 4px solid #ffc107;
}

.timing-instructions kbd {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
}

.quick-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.sync-stats {
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.stat-item {
  padding: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-indicator .badge {
  font-size: 0.75rem;
  animation: pulse 2s ease-in-out infinite;
}

.mode-indicator .bg-warning {
  animation: flash 1.5s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

@keyframes flash {

  0%,
  100% {
    background-color: #ffc107;
  }

  50% {
    background-color: #ffca2c;
  }
}

.btn:disabled {
  opacity: 0.5;
}

.time-display {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .quick-actions .btn {
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .player-controls {
    flex-wrap: wrap;
    gap: 1rem !important;
  }
}
</style>
