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
              <export-dialog-lrc :project="project" />
            </div>

            <!-- CDG Export -->
            <div v-if="selectedFormat === 'cdg'" class="tab-pane fade show active">
              <export-dialog-cdg :project="project" />
            </div>

            <!-- JSON Export -->
            <div v-if="selectedFormat === 'json'" class="tab-pane fade show active">
              <export-dialog-json :project="project" />
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
import type { KaraokeProject } from '@/types/karaoke'
import { getProjectStats  } from '@/services/projectExportService'
import   ExportDialogCdg    from './ExportDialogCDG.vue'
import   ExportDialogLrc    from './ExportDialogLRC.vue'
import   ExportDialogJson   from './ExportDialogJSON.vue'

const props = defineProps<{
  project: KaraokeProject
}>()

const emit = defineEmits<{
  close: []
}>()

// Selected format tab
const selectedFormat = ref<'lrc' | 'cdg' | 'json'>('lrc')

// State
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

// Functions
function closeDialog() {
  emit('close')
}

// Format duration as mm:ss using milliseconds
function formatDuration(milliseconds: number): string {
  const secs = Math.floor(milliseconds / 1000)
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
}

</script>

<style scoped>
/* Bootstrap modal backdrop */
.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
