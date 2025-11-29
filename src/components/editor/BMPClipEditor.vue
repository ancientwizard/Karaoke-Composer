<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">
        <i class="bi bi-image"></i>
        BMP Clip Properties
      </h5>
      <div class="form-check form-switch">
        <input
          v-model="showDebug"
          class="form-check-input"
          type="checkbox"
          id="bmpDebugToggle"
        />
        <label class="form-check-label" for="bmpDebugToggle">
          <small>Debug JSON</small>
        </label>
      </div>
    </div>

    <div class="card-body">
      <div v-if="!localClip" class="alert alert-secondary">
        <i class="bi bi-info-circle"></i>
        Select a BMP clip to edit its properties
      </div>

      <template v-else>
        <!-- Basic Properties -->
        <div class="row mb-4">
          <div class="col-md-6">
            <label class="form-label">Track</label>
            <input v-model.number="localClip.track" type="number" class="form-control" min="0" max="15" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Start (ms)</label>
            <input v-model.number="localClip.start_ms" type="number" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Duration (ms)</label>
            <input v-model.number="localClip.duration_ms" type="number" class="form-control" />
          </div>
        </div>

        <!-- Events List -->
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0">
              <strong>BMP Events ({{ events.length }})</strong>
            </label>
            <button class="btn btn-sm btn-success" @click="addEvent">
              <i class="bi bi-plus"></i>
              Add Event
            </button>
          </div>

          <div v-if="events.length === 0" class="alert alert-info">
            <small>No events yet. Click "Add Event" to create one.</small>
          </div>

          <div v-else class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px">#</th>
                  <th>BMP File</th>
                  <th>Fill</th>
                  <th>Composite</th>
                  <th>Transition</th>
                  <th style="width: 100px">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(evt, idx) in events" :key="idx">
                  <td>{{ idx }}</td>
                  <td>
                    <div class="text-truncate" :title="evt.bmpPath">
                      {{ normalizePath(evt.bmpPath) || '(none)' }}
                    </div>
                  </td>
                  <td class="text-center">
                    <input
                      v-model.number="evt.fillIndex"
                      type="number"
                      class="form-control form-control-sm"
                      min="0"
                      max="255"
                      style="width: 60px"
                    />
                  </td>
                  <td class="text-center">
                    <input
                      v-model.number="evt.compositeIndex"
                      type="number"
                      class="form-control form-control-sm"
                      min="0"
                      max="255"
                      style="width: 60px"
                    />
                  </td>
                  <td>
                    <div class="text-truncate" :title="evt.transitionFile">
                      {{ evt.transitionFile ? normalizePath(evt.transitionFile) : '(none)' }}
                    </div>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        class="btn btn-outline-primary"
                        @click="editEventBMP(idx)"
                        title="Pick BMP"
                      >
                        <i class="bi bi-image"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-warning"
                        @click="editEventTransition(idx)"
                        title="Pick Transition"
                      >
                        <i class="bi bi-film"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-danger"
                        @click="removeEvent(idx)"
                        title="Delete"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Palette Update Checkbox -->
        <div class="mb-3">
          <div class="form-check">
            <input
              v-model="updatePalette"
              class="form-check-input"
              type="checkbox"
              id="bmpUpdatePalette"
            />
            <label class="form-check-label" for="bmpUpdatePalette">
              Update Palette on Draw
            </label>
          </div>
        </div>

        <!-- Debug Panel -->
        <div v-if="showDebug" class="mt-4 pt-3 border-top">
          <div class="mb-2">
            <small class="text-muted">
              <strong>Debug: Full Clip Definition (JSON)</strong>
            </small>
          </div>
          <pre
            class="bg-dark text-light p-3 rounded"
            style="max-height: 300px; overflow-y: auto; font-size: 11px"
          ><code>{{ JSON.stringify(getDebugData(), null, 2) }}</code></pre>
        </div>

        <button class="btn btn-primary btn-sm" @click="saveChanges">
          <i class="bi bi-check"></i>
          Save Changes
        </button>
      </template>
    </div>
  </div>

  <!-- File Picker Dialogs -->
  <FilePickerDialog
    v-if="showBMPPicker"
    :is-open="showBMPPicker"
    file-type="bmp"
    :available-files="availableFiles"
    @select="selectBMPFile"
    @close="showBMPPicker = false"
  />

  <FilePickerDialog
    v-if="showTransitionPicker"
    :is-open="showTransitionPicker"
    file-type="cmt"
    :available-files="availableFiles"
    @select="selectTransitionFile"
    @close="showTransitionPicker = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import FilePickerDialog from './shared/FilePickerDialog.vue';

interface BMPEvent {
  bmpPath: string;
  fillIndex: number;
  compositeIndex: number;
  transitionFile?: string;
}

interface BMPClip {
  type: 'BMPClip';
  track: number;
  start_ms: number;
  duration_ms: number;
  start_packets: number;
  duration_packets: number;
  data: {
    events?: BMPEvent[];
    updatePalette?: boolean;
  };
}

interface Props {
  clip: BMPClip | null;
  availableFiles: string[];
}

interface Emits {
  (e: 'update:clip', clip: BMPClip): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDebug = ref(false);
const showBMPPicker = ref(false);
const showTransitionPicker = ref(false);
const editingEventIndex = ref<number | null>(null);
const updatePalette = ref(false);
const localClip = ref<BMPClip | null>(null);

watch(
  () => props.clip,
  (newClip) => {
    if (newClip) {
      localClip.value = JSON.parse(JSON.stringify(newClip));
      updatePalette.value = (newClip.data.updatePalette as boolean) || false;
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

const events = computed({
  get: () => localClip.value?.data.events || [],
  set: (val) => {
    if (localClip.value) {
      localClip.value.data.events = val;
    }
  },
});

const normalizePath = (path: string): string => {
  if (!path) return '';
  // Paths are already correct from load-time normalization
  // Just display them as-is
  return path;
};

const addEvent = () => {
  const newEvent: BMPEvent = {
    bmpPath: '',
    fillIndex: 0,
    compositeIndex: 0,
    transitionFile: '',
  };
  events.value = [...events.value, newEvent];
};

const removeEvent = (idx: number) => {
  events.value = events.value.filter((_, i) => i !== idx);
};

const editEventBMP = (idx: number) => {
  editingEventIndex.value = idx;
  showBMPPicker.value = true;
};

const editEventTransition = (idx: number) => {
  editingEventIndex.value = idx;
  showTransitionPicker.value = true;
};

const selectBMPFile = (file: string) => {
  if (editingEventIndex.value !== null && editingEventIndex.value < events.value.length) {
    const updatedEvents = [...events.value];
    updatedEvents[editingEventIndex.value].bmpPath = file;
    events.value = updatedEvents;
  }
  editingEventIndex.value = null;
  showBMPPicker.value = false;
};

const selectTransitionFile = (file: string) => {
  if (editingEventIndex.value !== null && editingEventIndex.value < events.value.length) {
    const updatedEvents = [...events.value];
    updatedEvents[editingEventIndex.value].transitionFile = file;
    events.value = updatedEvents;
  }
  editingEventIndex.value = null;
  showTransitionPicker.value = false;
};

const getDebugData = () => {
  return {
    type: 'BMPClip',
    track: localClip.value?.track,
    start_ms: localClip.value?.start_ms,
    start_packets: localClip.value?.start_packets,
    duration_ms: localClip.value?.duration_ms,
    duration_packets: localClip.value?.duration_packets,
    updatePalette: updatePalette.value,
    events: events.value.map((evt, idx) => ({
      index: idx,
      bmpPath: evt.bmpPath,
      fillIndex: evt.fillIndex,
      compositeIndex: evt.compositeIndex,
      transitionFile: evt.transitionFile || null,
    })),
  };
};

const saveChanges = () => {
  if (localClip.value) {
    emit('update:clip', {
      ...localClip.value,
      data: {
        ...localClip.value.data,
        updatePalette: updatePalette.value,
      },
    });
  }
};
</script>

<style scoped>
.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

table {
  margin-bottom: 0;
}

pre {
  margin-bottom: 0;
}
</style>

// VIM: set ft=vue :
// END
