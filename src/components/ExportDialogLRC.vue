<template>
  <div>
    <h5>LRC Export</h5>
    <p class="text-muted">
      Export as plain lyrics, Enhanced LRC V2.1, or Enhanced LRC V2.2 timing format.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Settings</strong>
      </div>
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label" for="lrcTimingMode">Export profile</label>
          <select class="form-select" id="lrcTimingMode" v-model="lrcSettings.timingMode">
            <option value="v2.2">Enhanced V2.2 (start~end)</option>
            <option value="v2.1">Enhanced V2.1 (start only)</option>
            <option value="none">Plain lyrics (no timing)</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label" for="lrcPrecision">Timestamp precision</label>
          <select
            class="form-select"
            id="lrcPrecision"
            v-model="lrcSettings.precision"
            :disabled="lrcSettings.timingMode === 'none'"
          >
            <option value="2">Centisecond (00.00)</option>
            <option value="3">Millisecond (00.000)</option>
          </select>
          <div v-if="lrcSettings.timingMode === 'none'" class="form-text">
            Timestamp precision is only used for timed LRC exports.
          </div>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeMetadata" id="lrcMetadata" />
          <label class="form-check-label" for="lrcMetadata">
            Include metadata (title, artist, duration)
          </label>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Preview</strong>
      </div>
      <div class="card-body">
        <pre class="bg-dark text-light p-3 rounded small" style="max-height: 200px; overflow-y: auto;">{{ lrcPreview }}</pre>
      </div>
    </div>

    <button class="btn btn-primary w-100" @click="exportLRC" :disabled="exporting">
      <span v-if="!exporting">📄 Export LRC File</span>
      <span v-else>⏳ Exporting...</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { KaraokeProject } from '../types/karaoke'
import { LRCWriter, type LRCTimingMode } from '../formats/LRCFormat'

const props = defineProps<{
  project: KaraokeProject
}>()

const exporting = ref(false)

const lrcSettings = ref({
  timingMode: 'v2.2' as LRCTimingMode,
  includeMetadata: true,
  precision: 3 as 2 | 3
})

const lrcPreview = computed(() => {
  try {
    const lines = LRCWriter.toLRC(props.project, {
      timingMode: lrcSettings.value.timingMode,
      includeMetadata: lrcSettings.value.includeMetadata,
      precisionDigits: lrcSettings.value.precision
    }).split('\n')
    return lines.slice(0, 10).join('\n') + (lines.length > 10 ? '\n...' : '')
  } catch {
    return 'Preview not available'
  }
})

function showStatus(type: 'success' | 'error', message: string) {
  // local temporary status - in future this can be emitted
  // For now we'll just console.log so the UI remains self-contained
  console[type === 'success' ? 'log' : 'error'](message)
}

function toKebabFileBase(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'karaoke'
}

async function exportLRC() {
  exporting.value = true
  try {
    const lrcContent = LRCWriter.toLRC(props.project, {
      timingMode: lrcSettings.value.timingMode,
      includeMetadata: lrcSettings.value.includeMetadata,
      precisionDigits: lrcSettings.value.precision
    })

    // Download as .lrc file
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${toKebabFileBase(props.project.name)}.lrc`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    showStatus('success', '✅ LRC file exported successfully!')
  } catch (error: any) {
    showStatus('error', `❌ Export failed: ${error?.message || error}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
/* keep styles minimal; parent modal controls layout */
</style>
