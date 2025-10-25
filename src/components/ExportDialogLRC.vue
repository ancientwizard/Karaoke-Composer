<template>
  <div>
    <h5>LRC V2.1 Export</h5>
    <p class="text-muted">
      Export as Enhanced LRC format with syllable-level timing. Compatible with modern karaoke players.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Settings</strong>
      </div>
      <div class="card-body">
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeMetadata" id="lrcMetadata" />
          <label class="form-check-label" for="lrcMetadata">
            Include metadata (title, artist, album)
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeSyllables" id="lrcSyllables" />
          <label class="form-check-label" for="lrcSyllables">
            Include syllable timing (V2.1 format)
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeWordTiming" id="lrcWordTiming" />
          <label class="form-check-label" for="lrcWordTiming">
            Include word timing markers
          </label>
        </div>

        <div class="row align-items-center mb-2">
          <label class="col-sm-4 col-form-label">Timestamp precision:</label>
          <div class="col-sm-8">
            <select class="form-select" v-model="lrcSettings.precision">
              <option value="2">Centisecond (00.00)</option>
              <option value="3">Millisecond (00.000)</option>
            </select>
          </div>
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
import { LRCWriter } from '../formats/LRCFormat'
import { getProjectStats } from '../services/projectExportService'

const props = defineProps<{
  project: KaraokeProject
}>()

const exporting = ref(false)

const lrcSettings = ref({
  includeMetadata: true,
  includeSyllables: true,
  includeWordTiming: true,
  precision: 2
})

const lrcPreview = computed(() => {
  try {
    const lines = LRCWriter.toLRC(props.project).split('\n')
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

async function exportLRC() {
  exporting.value = true
  try {
    const lrcContent = LRCWriter.toLRC(props.project)

    // Download as .lrc file
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.project.name.toLowerCase().replace(/\s+/g, '_')}.lrc`

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
