<template>
  <div class="export-panel">
    <h3>📤 Export Project</h3>

    <div v-if="project" class="export-content">
      <!-- Project Stats -->
      <div class="stats-card">
        <h4>{{ project.name }}</h4>
        <p class="artist">by {{ project.artist }}</p>

        <div class="stats-grid">
          <div class="stat">
            <span class="label">Lines:</span>
            <span class="value">{{ stats.timedLines }} / {{ stats.totalLines }}</span>
          </div>
          <div class="stat">
            <span class="label">Words:</span>
            <span class="value">{{ stats.timedWords }} / {{ stats.totalWords }}</span>
          </div>
          <div class="stat">
            <span class="label">Syllables:</span>
            <span class="value">{{ stats.timedSyllables }} / {{ stats.totalSyllables }}</span>
          </div>
          <div class="stat">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(stats.duration) }}</span>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: stats.completionPercentage + '%' }"></div>
          <span class="progress-text">{{ stats.completionPercentage }}% Complete</span>
        </div>
      </div>

      <!-- Export Options -->
      <div class="export-options">
        <button @click="exportJSON" class="export-btn primary" :disabled="!canExport">
          <span class="icon">💾</span>
          Export as JSON
          <span class="hint">For backup & sharing</span>
        </button>

        <button @click="exportForTerminal" class="export-btn secondary" :disabled="!canExport">
          <span class="icon">🎤</span>
          Export for Terminal
          <span class="hint">TypeScript format for testing</span>
        </button>

        <button @click="exportLRC" class="export-btn secondary" :disabled="!canExport">
          <span class="icon">📄</span>
          Export as LRC
          <span class="hint">Standard lyrics format</span>
        </button>
      </div>

      <!-- Export Status -->
      <div v-if="exportStatus" class="export-status" :class="exportStatus.type">
        {{ exportStatus.message }}
      </div>

      <!-- Warnings -->
      <div v-if="!canExport" class="warning">
        ⚠️ Project needs timing data before export
      </div>
    </div>

    <div v-else class="no-project">
      <p>No project loaded</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KaraokeProject } from '../types/karaoke'
import {
  exportProjectAsJSON,
  exportProjectForTerminal,
  getProjectStats
} from '../services/projectExportService'
import { LRCWriter } from '../formats/LRCFormat'

const props = defineProps<{
  project: KaraokeProject | null
}>()

const exportStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const stats = computed(() => {
  if (!props.project) {
    return {
      totalLines: 0,
      totalWords: 0,
      totalSyllables: 0,
      timedLines: 0,
      timedWords: 0,
      timedSyllables: 0,
      duration: 0,
      completionPercentage: 0
    }
  }
  return getProjectStats(props.project)
})

const canExport = computed(() => {
  return props.project && stats.value.timedSyllables > 0
})

function exportJSON() {
  if (!props.project) return

  try {
    exportProjectAsJSON(props.project)
    showStatus('success', '✅ Project exported successfully!')
  } catch (error) {
    showStatus('error', `❌ Export failed: ${error}`)
  }
}

function exportForTerminal() {
  if (!props.project) return

  try {
    exportProjectForTerminal(props.project)
    showStatus('success', '✅ Terminal export created! Copy to src/karaoke/demo/')
  } catch (error) {
    showStatus('error', `❌ Export failed: ${error}`)
  }
}

function exportLRC() {
  if (!props.project) return

  try {
    const lrcContent = LRCWriter.toLRC(props.project)

    // Download as .lrc file
    const blob = new Blob([lrcContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.project.name.toLowerCase().replace(/\s+/g, '_')}.lrc`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    showStatus('success', '✅ LRC file exported!')
  } catch (error) {
    showStatus('error', `❌ LRC export failed: ${error}`)
  }
}

function showStatus(type: 'success' | 'error', message: string) {
  exportStatus.value = {
    type, message
  }
  setTimeout(() => {
    exportStatus.value = null
  }, 3000)
}

function formatDuration(milliseconds: number): string {
  const secs = Math.floor(milliseconds / 1000)
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.export-panel {
  padding: 20px;
  background: var(--color-background-soft);
  border-radius: 8px;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--color-heading);
}

.stats-card {
  background: var(--color-background);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.stats-card h4 {
  margin: 0 0 4px 0;
  font-size: 1.2em;
}

.artist {
  margin: 0 0 16px 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 4px;
}

.stat .label {
  font-weight: 600;
  color: var(--color-text-muted);
}

.stat .value {
  font-weight: bold;
  color: var(--color-text);
}

.progress-bar {
  position: relative;
  height: 30px;
  background: var(--color-background-soft);
  border-radius: 15px;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--color-text);
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  position: relative;
}

.export-btn .icon {
  font-size: 1.5em;
  margin-bottom: 8px;
}

.export-btn .hint {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.export-btn.primary {
  background: var(--color-primary);
  color: white;
}

.export-btn.primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.export-btn.secondary {
  background: var(--color-background);
  color: var(--color-text);
  border: 2px solid var(--color-border);
}

.export-btn.secondary:hover:not(:disabled) {
  background: var(--color-background-soft);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-status {
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  text-align: center;
  font-weight: 500;
}

.export-status.success {
  background: #4caf5022;
  color: #4caf50;
  border: 1px solid #4caf50;
}

.export-status.error {
  background: #f4433622;
  color: #f44336;
  border: 1px solid #f44336;
}

.warning {
  padding: 12px;
  background: #ff9800 22;
  color: #ff9800;
  border: 1px solid #ff9800;
  border-radius: 6px;
  margin-top: 16px;
  text-align: center;
}

.no-project {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}
</style>
