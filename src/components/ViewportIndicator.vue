<template>
  <div class="mb-3">
    <h6><i class="bi bi-display"></i> Viewport</h6>
    <div class="small">
      <div class="d-flex justify-content-between">
        <span>Width:</span>
        <span class="text-primary font-monospace">{{ viewportWidth }}px</span>
      </div>
      <div class="d-flex justify-content-between">
        <span>Breakpoint:</span>
        <span class="text-success font-monospace">{{ currentBreakpoint }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  viewportWidth: number
  currentBreakpoint: string
}

defineProps<Props>()
</script>
