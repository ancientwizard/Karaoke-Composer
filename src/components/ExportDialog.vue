<template>
  <!-- Bootstrap Modal -->
  <div class="modal show d-block" tabindex="-1" @click.self="closeDialog">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">📤 Export Project</h5>
          <button type="button" class="btn-close" @click="closeDialog" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Project Info -->
          <div class="alert alert-info">
            <h5 class="mb-1">{{ project.name }}</h5>
            <p class="mb-2 text-muted"><em>by {{ project.artist }}</em></p>
            <div class="d-flex gap-3 small">
              <span>{{ stats.timedSyllables }} syllables</span>
              <span>•</span>
              <span>{{ formatDuration(stats.duration) }}</span>
              <span>•</span>
              <span>{{ stats.completionPercentage }}% complete</span>
            </div>
          </div>

          <!-- Format Tabs -->
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" v-for="format in formats" :key="format.id">
              <button class="nav-link" :class="{ active: selectedFormat === format.id }"
                @click="selectedFormat = format.id" type="button">
                <span class="me-2">{{ format.icon }}</span>
                {{ format.label }}
              </button>
            </li>
          </ul>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- LRC Export -->
            <div v-if="selectedFormat === 'lrc'" class="tab-pane fade show active">
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
                    <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeMetadata"
                      id="lrcMetadata" />
                    <label class="form-check-label" for="lrcMetadata">
                      Include metadata (title, artist, album)
                    </label>
                  </div>

                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeSyllables"
                      id="lrcSyllables" />
                    <label class="form-check-label" for="lrcSyllables">
                      Include syllable timing (V2.1 format)
                    </label>
                  </div>

                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" v-model="lrcSettings.includeWordTiming"
                      id="lrcWordTiming" />
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
                  <pre class="bg-dark text-light p-3 rounded small"
                    style="max-height: 200px; overflow-y: auto;">{{ lrcPreview }}</pre>
                </div>
              </div>

              <button class="btn btn-primary w-100" @click="exportLRC" :disabled="exporting">
                <span v-if="!exporting">📄 Export LRC File</span>
                <span v-else>⏳ Exporting...</span>
              </button>
            </div>

            <!-- CDG Export -->
            <div v-if="selectedFormat === 'cdg'" class="tab-pane fade show active">
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
                      <input type="color" class="form-control form-control-color"
                        v-model="cdgSettings.backgroundColor" />
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
                      <input type="color" class="form-control form-control-color"
                        v-model="cdgSettings.highlightColor" />
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
                    <input class="form-check-input" type="checkbox" v-model="cdgSettings.showCaptions"
                      id="cdgCaptions" />
                    <label class="form-check-label" for="cdgCaptions">
                      Show captions (e.g., "Verse 1", "Chorus")
                    </label>
                  </div>

                  <div v-if="cdgSettings.showCaptions" class="row align-items-center mb-2 ms-4">
                    <label class="col-sm-5 col-form-label small">Caption duration (seconds):</label>
                    <div class="col-sm-7">
                      <input type="number" class="form-control form-control-sm"
                        v-model.number="cdgSettings.captionDuration" min="1" max="10" step="0.5" />
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

            <!-- JSON Export -->
            <div v-if="selectedFormat === 'json'" class="tab-pane fade show active">
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
                    <input class="form-check-input" type="checkbox" v-model="jsonSettings.prettyPrint"
                      id="jsonPretty" />
                    <label class="form-check-label" for="jsonPretty">
                      Pretty print (formatted, readable)
                    </label>
                  </div>

                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" v-model="jsonSettings.includeMetadata"
                      id="jsonMetadata" />
                    <label class="form-check-label" for="jsonMetadata">
                      Include project metadata
                    </label>
                  </div>

                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" v-model="jsonSettings.includeStats"
                      id="jsonStats" />
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
          </div>

          <!-- Export Status -->
          <div v-if="exportStatus" class="alert mt-3"
            :class="exportStatus.type === 'success' ? 'alert-success' : 'alert-danger'">
            {{ exportStatus.message }}
          </div>
        </div>
      </div>
    </div>
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

const emit = defineEmits<{
  close: []
}>()

// Selected format tab
const selectedFormat = ref<'lrc' | 'cdg' | 'json'>('lrc')

// Export settings
const lrcSettings = ref({
  includeMetadata: true,
  includeSyllables: true,
  includeWordTiming: true,
  precision: 2
})

const cdgSettings = ref({
  backgroundColor: '#000080',  // Navy blue
  textColor: '#FFFFFF',        // White
  highlightColor: '#FFFF00',   // Yellow
  showBorder: true,
  centerText: true,
  showMetadata: true,
  metadataDuration: 3,
  showCaptions: true,          // Show captions above lyrics
  captionDuration: 2           // Show captions for 2 seconds
})

const jsonSettings = ref({
  prettyPrint: true,
  includeMetadata: true,
  includeStats: true
})

// State
const exporting = ref(false)
const exportStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// Format definitions
const formats = [
  {
    id: 'lrc' as const,
    label: 'LRC',
    icon: '📄'
  },
  {
    id: 'cdg' as const,
    label: 'CDG',
    icon: '💿'
  },
  {
    id: 'json' as const,
    label: 'JSON',
    icon: '💾'
  }
]

// Computed
const stats = computed(() => getProjectStats(props.project))

const lrcPreview = computed(() => {
  try {
    const lines = LRCWriter.toLRC(props.project).split('\n')
    return lines.slice(0, 10).join('\n') + (lines.length > 10 ? '\n...' : '')
  } catch {
    return 'Preview not available'
  }
})

const estimatedCDGSize = computed(() => {
  // CDG: 24 bytes per packet, 75 packets/second
  const duration = stats.value.duration
  const packets = Math.ceil(duration * 75)
  const bytes = packets * 24
  return Math.ceil(bytes / 1024)
})

const estimatedJSONSize = computed(() => {
  const jsonStr = JSON.stringify(props.project)
  return Math.ceil(jsonStr.length / 1024)
})

// Functions
function closeDialog() {
  emit('close')
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
    showStatus('error', `❌ Export failed: ${error.message}`)
  } finally {
    exporting.value = false
  }
}

async function exportCDG() {
  exporting.value = true
  try {
    // Dynamic import to avoid loading CDG renderer in browser build
    showStatus('error', '❌ CDG export requires Node.js environment. Use the CLI tool: npx tsx src/karaoke/demo/generateCDG.ts')
  } catch (error: any) {
    showStatus('error', `❌ Export failed: ${error.message}`)
  } finally {
    exporting.value = false
  }
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
    showStatus('error', `❌ Export failed: ${error.message}`)
  } finally {
    exporting.value = false
  }
}

function showStatus(type: 'success' | 'error', message: string) {
  exportStatus.value = {
    type,
    message
  }
  setTimeout(() => {
    exportStatus.value = null
  }, 4000)
}
</script>

<style scoped>
/* Bootstrap modal backdrop */
.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
