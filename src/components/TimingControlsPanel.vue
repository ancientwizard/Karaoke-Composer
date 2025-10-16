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
          Word boxes can be edited manually when timing mode is off
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isTimingMode: boolean
}

defineProps<Props>()

defineEmits<{
  'toggle-timing-mode': []
}>()
</script>
