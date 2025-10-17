<template>
  <div class="mb-4">
    <h6><i class="bi bi-stopwatch"></i> Timing Mode</h6>
    <div class="d-grid gap-1">
      <button class="btn btn-sm" :class="isTimingMode ? 'btn-warning' : 'btn-outline-primary'"
        @click="$emit('toggle-timing-mode')">
        <i class="bi bi-crosshair"></i>
        {{ isTimingMode ? 'Exit Timing' : 'Start Timing' }}
      </button>
      <div class="timing-status small text-muted mt-1">
        <template v-if="isTimingMode">
          Press Space during playback to assign word timings
        </template>
        <template v-else>
          Word boxes can be edited manually in any Mode
        </template>
      </div>
    </div>
  </div>

  <!-- Musical Timing Section -->
  <div class="mb-4">
    <h6><i class="bi bi-music-note"></i> Musical Timing</h6>
    <div class="d-grid gap-1">
      <button class="btn btn-sm btn-outline-success" @click="$emit('apply-musical-timing')" :disabled="!hasTimedWords">
        <i class="bi bi-magic"></i>
        Apply Musical Intelligence
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="$emit('reset-syllable-timing')" :disabled="!hasTimedWords">
        <i class="bi bi-arrow-clockwise"></i>
        Reset Syllable Timing
      </button>
      <button class="btn btn-sm btn-outline-info" @click="showAnalysis = !showAnalysis" :disabled="!hasTimedWords">
        <i class="bi bi-graph-up"></i>
        {{ showAnalysis ? 'Hide' : 'Show' }} Analysis
      </button>
    </div>

    <!-- Analysis Panel -->
    <div v-if="showAnalysis && songAnalysis" class="mt-2 p-2 bg-light rounded small">
      <div class="row">
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

    <div class="timing-status small text-muted mt-1">
      Musical timing analyzes your word timings to distribute syllables using musical patterns (8th notes, quarter notes, etc.) and respects natural pauses.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  isTimingMode: boolean
  timedWords?: number
  totalWords?: number
  songAnalysis?: {
    estimatedBPM: number
    totalWords: number
    detectedRests: number
    timingQuality: string
  } | null
}

const props = defineProps<Props>()

// Local reactive state
const showAnalysis = ref(false)

// Computed properties
const hasTimedWords = computed(() => {
  return (props.timedWords || 0) > 0
})

defineEmits<{
  'toggle-timing-mode': []
  'apply-musical-timing': []
  'reset-syllable-timing': []
}>()
</script>
