<template>
  <div v-if="isOpen" class="modal d-block bg-dark bg-opacity-50" style="display: block">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Select {{ typeLabel }}</h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>

        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Available Files</label>
            <div class="list-group" style="max-height: 400px; overflow-y: auto">
              <button
                v-for="file in filteredFiles"
                :key="file"
                @click="selectFile(file)"
                type="button"
                class="list-group-item list-group-item-action"
                :class="{ active: selectedFile === file }"
              >
                <i :class="['bi', getFileIcon(file)]"></i>
                {{ normalizePath(file) }}
              </button>
              <div v-if="filteredFiles.length === 0" class="list-group-item text-muted">
                No files found matching "{{ fileExtension }}"
              </div>
            </div>
          </div>

          <div v-if="selectedFile" class="mb-3 p-3 bg-light rounded">
            <strong>Selected:</strong>
            <code class="d-block text-break">{{ selectedFile }}</code>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
          <button
            type="button"
            class="btn btn-primary"
            @click="confirm"
            :disabled="!selectedFile"
          >
            <i class="bi bi-check"></i>
            Select
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  isOpen: boolean;
  fileType: 'bmp' | 'cmt' | 'cdg' | 'wav';
  availableFiles: string[];
}

interface Emits {
  (e: 'select', file: string): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  fileType: 'bmp',
  availableFiles: () => [],
});

const emit = defineEmits<Emits>();

const selectedFile = ref<string | null>(null);

const typeLabel = computed(() => {
  switch (props.fileType) {
    case 'bmp':
      return 'BMP File';
    case 'cmt':
      return 'Transition File';
    case 'cdg':
      return 'CDG File';
    case 'wav':
      return 'Audio File';
    default:
      return 'File';
  }
});

const fileExtension = computed(() => {
  switch (props.fileType) {
    case 'bmp':
      return '.bmp';
    case 'cmt':
      return '.cmt';
    case 'cdg':
      return '.cdg';
    case 'wav':
      return '.wav';
    default:
      return '';
  }
});

const filteredFiles = computed(() => {
  const ext = fileExtension.value.toLowerCase();
  return props.availableFiles.filter((f) => f.toLowerCase().endsWith(ext));
});

const getFileIcon = (file: string): string => {
  if (file.toLowerCase().endsWith('.bmp')) return 'bi-image';
  if (file.toLowerCase().endsWith('.cmt')) return 'bi-film';
  if (file.toLowerCase().endsWith('.cdg')) return 'bi-disc';
  if (file.toLowerCase().endsWith('.wav')) return 'bi-volume-up';
  return 'bi-file';
};

const normalizePath = (path: string): string => {
  // Paths are already correct from load-time normalization
  // Just display them as-is
  return path;
};

const selectFile = (file: string) => {
  selectedFile.value = file;
};

const confirm = () => {
  if (selectedFile.value) {
    emit('select', selectedFile.value);
    close();
  }
};

const close = () => {
  selectedFile.value = null;
  emit('close');
};
</script>

<style scoped>
.list-group-item {
  cursor: pointer;
}

.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.list-group-item i {
  margin-right: 8px;
}
</style>

// VIM: set ft=vue :
// END
