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
      <button class="btn btn-sm btn-outline-secondary" @click="$emit('reset-syllable-timing')"
        :disabled="!hasTimedWords">
        <i class="bi bi-arrow-clockwise"></i>
        Reset Syllable Timing
      </button>
      <button class="btn btn-sm btn-outline-danger" @click="$emit('clear-timing')" :disabled="!hasTimedWords">
        <i class="bi bi-trash"></i>
        Clear from Current Line
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
      Musical timing analyzes your word timings to distribute syllables using musical patterns (8th notes, quarter
      notes,
      etc.) and respects natural pauses.
    </div>
  </div>

  <!-- Timing Diagnostics Section -->
  <div class="mb-4">
    <h6><i class="bi bi-search"></i> Timing Diagnostics</h6>
    <div class="d-grid gap-1">
      <button class="btn btn-sm btn-outline-info" @click="$emit('analyze-timing')" :disabled="!hasTimedWords">
        <i class="bi bi-bug"></i>
        Check for Overlaps
      </button>
      <button class="btn btn-sm btn-outline-warning" @click="$emit('fix-overlaps')" :disabled="!hasTimedWords">
        <i class="bi bi-wrench"></i>
        Fix Overlaps
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="showDiagnostics = !showDiagnostics"
        :disabled="!hasTimedWords">
        <i class="bi bi-info-circle"></i>
        {{ showDiagnostics ? 'Hide' : 'Show' }} Details
      </button>
    </div>

    <!-- Diagnostics Panel -->
    <div v-if="showDiagnostics && timingAnalysis" class="mt-2 p-2 rounded small"
      :class="timingAnalysis.hasIssues ? 'bg-warning bg-opacity-10 border border-warning' : 'bg-success bg-opacity-10 border border-success'">
      <div class="mb-2">
        <strong>Status:</strong> {{ timingAnalysis.summary }}
      </div>

      <div v-if="timingAnalysis.sequenceViolations && timingAnalysis.sequenceViolations.length > 0" class="mb-2">
        <strong class="text-danger">🚨 Sequence Violations:</strong>
        <ul class="mb-0 ps-3">
          <li v-for="violation in timingAnalysis.sequenceViolations.slice(0, 3)"
            :key="`${violation.word1}-${violation.word2}`" class="small text-danger">
            {{ violation.issue }}
          </li>
          <li v-if="timingAnalysis.sequenceViolations.length > 3" class="small text-muted">
            ...and {{ timingAnalysis.sequenceViolations.length - 3 }} more
          </li>
        </ul>
      </div>

      <div v-if="timingAnalysis.overlaps.length > 0" class="mb-2">
        <strong class="text-warning">Overlaps Found:</strong>
        <ul class="mb-0 ps-3">
          <li v-for="overlap in timingAnalysis.overlaps.slice(0, 5)"
            :key="`${overlap.word1.lineIndex}-${overlap.word1.wordIndex}`" class="small">
            "{{ overlap.word1.word }}" → "{{ overlap.word2.word }}" ({{ overlap.overlapDuration }}ms overlap)
          </li>
          <li v-if="timingAnalysis.overlaps.length > 5" class="small text-muted">
            ...and {{ timingAnalysis.overlaps.length - 5 }} more
          </li>
        </ul>
      </div>

      <div v-if="timingAnalysis.smallGaps.length > 0" class="mb-2">
        <strong class="text-info">Small Gaps:</strong>
        <span class="small">{{ timingAnalysis.smallGaps.length }} gaps &lt; 50ms</span>
      </div>

      <div class="small text-muted">
        {{ timingAnalysis.timedWords }} of {{ timingAnalysis.totalWords }} words have timing data
      </div>
    </div>

    <div class="timing-status small text-muted mt-1">
      Overlapping word timings can cause editing issues. Use diagnostics to detect and fix timing problems.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TimingAnalysisResult } from '../composables/useTimingAnalysis'

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
  timingAnalysis?: TimingAnalysisResult | null
}

const props = defineProps<Props>()

// Local reactive state
const showAnalysis = ref(false)
const showDiagnostics = ref(false)

// Computed properties
const hasTimedWords = computed(() => {
  return (props.timedWords || 0) > 0
})

defineEmits<{
  'toggle-timing-mode': []
  'apply-musical-timing': []
  'reset-syllable-timing': []
  'clear-timing': []
  'analyze-timing': []
  'fix-overlaps': []
}>()
</script>
