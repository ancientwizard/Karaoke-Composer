<template>
  <div class="mb-4">
    <h6>Progress</h6>
    <div class="small">
      <div class="d-flex justify-content-between">
        <span>Lines:</span>
        <span>{{ timingStats.timedLines }}/{{ timingStats.totalLines }}</span>
      </div>
      <div class="d-flex justify-content-between">
        <span>Words:</span>
        <span>{{ timingStats.timedWords }}/{{ timingStats.totalWords }}</span>
      </div>
      <div class="d-flex justify-content-between">
        <span>Syllables:</span>
        <span>{{ timingStats.timedSyllables }}/{{ timingStats.totalSyllables }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TimingStats {
  totalLines: number
  timedLines: number
  totalWords: number
  timedWords: number
  totalSyllables: number
  timedSyllables: number
  completionPercent: number
}

interface Props {
  timingStats: TimingStats
}

defineProps<Props>()
</script>
