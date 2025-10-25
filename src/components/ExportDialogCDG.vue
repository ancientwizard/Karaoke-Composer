<template>
  <div>
    <h5>CDG Export</h5>
    <p class="text-muted">
      Export as CD+G format for professional karaoke machines. Creates binary .cdg file with graphics data.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Settings</strong>
      </div>
      <div class="card-body">
        <div class="row align-items-center mb-2">
          <label class="col-sm-4 col-form-label">Background color:</label>
          <div class="col-sm-8">
            <input type="color" class="form-control form-control-color" v-model="cdgSettings.backgroundColor" />
          </div>
        </div>

        <div class="row align-items-center mb-2">
          <label class="col-sm-4 col-form-label">Text color:</label>
          <div class="col-sm-8">
            <input type="color" class="form-control form-control-color" v-model="cdgSettings.textColor" />
          </div>
        </div>

        <div class="row align-items-center mb-2">
          <label class="col-sm-4 col-form-label">Highlight color:</label>
          <div class="col-sm-8">
            <input type="color" class="form-control form-control-color" v-model="cdgSettings.highlightColor" />
          </div>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="cdgSettings.showBorder" id="cdgBorder" />
          <label class="form-check-label" for="cdgBorder">
            Show decorative border
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="cdgSettings.centerText" id="cdgCenter" />
          <label class="form-check-label" for="cdgCenter">
            Center text on screen
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="cdgSettings.showCaptions" id="cdgCaptions" />
          <label class="form-check-label" for="cdgCaptions">
            Show captions (e.g., "Verse 1", "Chorus")
          </label>
        </div>

        <div v-if="cdgSettings.showCaptions" class="row align-items-center mb-2 ms-4">
          <label class="col-sm-5 col-form-label small">Caption duration (seconds):</label>
          <div class="col-sm-7">
            <input type="number" class="form-control form-control-sm" v-model.number="cdgSettings.captionDuration" min="1" max="10" step="0.5" />
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>File Information</strong>
      </div>
      <div class="card-body">
        <p class="mb-1"><strong>Format:</strong> CD+G Binary</p>
        <p class="mb-1"><strong>Estimated size:</strong> {{ estimatedCDGSize }} KB</p>
        <p class="mb-1"><strong>Resolution:</strong> 288×192 pixels (6-bit color)</p>
        <p class="mb-0"><strong>Packet rate:</strong> 75 packets/second</p>
      </div>
    </div>

    <button class="btn btn-primary w-100" @click="exportCDG" :disabled="exporting">
      <span v-if="!exporting">💿 Export CDG File</span>
      <span v-else>⏳ Exporting...</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { KaraokeProject } from '../types/karaoke'
import { getProjectStats } from '../services/projectExportService'

const props = defineProps<{
  project: KaraokeProject
}>()

const exporting = ref(false)

const cdgSettings = ref({
  backgroundColor: '#000080',
  textColor: '#FFFFFF',
  highlightColor: '#FFFF00',
  showBorder: true,
  centerText: true,
  showMetadata: true,
  metadataDuration: 3,
  showCaptions: true,
  captionDuration: 2
})

const stats = computed(() => getProjectStats(props.project))

const estimatedCDGSize = computed(() => {
  const duration = stats.value.duration
  const packets = Math.ceil(duration * 75)
  const bytes = packets * 24
  return Math.ceil(bytes / 1024)
})

function showStatus(type: 'success' | 'error', message: string) {
  console[type === 'success' ? 'log' : 'error'](message)
}

async function exportCDG() {
  exporting.value = true
  try {
    // For now, inform users that CDG export requires Node/CLI
    showStatus('error', '❌ CDG export requires Node.js environment. Use the CLI tool: npx tsx src/karaoke/demo/generateCDG.ts')
  } catch (error: any) {
    showStatus('error', `❌ Export failed: ${error?.message || error}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
</style>
