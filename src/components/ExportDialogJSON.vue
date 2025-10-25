<template>
  <div>
    <h5>JSON Export</h5>
    <p class="text-muted">
      Export complete project data as JSON for backup, sharing, or programmatic use.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Settings</strong>
      </div>
      <div class="card-body">
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="jsonSettings.prettyPrint" id="jsonPretty" />
          <label class="form-check-label" for="jsonPretty">
            Pretty print (formatted, readable)
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="jsonSettings.includeMetadata" id="jsonMetadata" />
          <label class="form-check-label" for="jsonMetadata">
            Include project metadata
          </label>
        </div>

        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" v-model="jsonSettings.includeStats" id="jsonStats" />
          <label class="form-check-label" for="jsonStats">
            Include statistics
          </label>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>📊 Export Info</strong>
      </div>
      <div class="card-body">
        <p class="mb-1"><strong>Lines:</strong> {{ stats.totalLines }}</p>
        <p class="mb-1"><strong>Words:</strong> {{ stats.totalWords }}</p>
        <p class="mb-1"><strong>Syllables:</strong> {{ stats.totalSyllables }}</p>
        <p class="mb-0"><strong>Estimated size:</strong> ~{{ estimatedJSONSize }} KB</p>
      </div>
    </div>

    <button class="btn btn-primary w-100" @click="exportJSON" :disabled="exporting">
      <span v-if="!exporting">💾 Export JSON File</span>
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

const jsonSettings = ref({
  prettyPrint: true,
  includeMetadata: true,
  includeStats: true
})

const stats = computed(() => getProjectStats(props.project))

const estimatedJSONSize = computed(() => {
  const jsonStr = JSON.stringify(props.project)
  return Math.ceil(jsonStr.length / 1024)
})

function showStatus(type: 'success' | 'error', message: string) {
  console[type === 'success' ? 'log' : 'error'](message)
}

async function exportJSON() {
  exporting.value = true
  try {
    const jsonContent = jsonSettings.value.prettyPrint
      ? JSON.stringify(props.project, null, 2)
      : JSON.stringify(props.project)

    // Download as .json file
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.project.name.toLowerCase().replace(/\s+/g, '_')}.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    showStatus('success', '✅ JSON file exported successfully!')
  } catch (error: any) {
    showStatus('error', `❌ Export failed: ${error?.message || error}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
</style>
