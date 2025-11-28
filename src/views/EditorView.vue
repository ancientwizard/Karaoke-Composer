<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col">
        <h1 class="mb-0">
          <i class="bi bi-pencil"></i>
          Editor
        </h1>
        <small class="text-muted">Edit clips with audio synchronization</small>
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" @click="addClip">
          <i class="bi bi-plus"></i>
          Add Clip
        </button>
      </div>
    </div>

    <div class="row g-3">
      <!-- Timeline/Editing Lanes Panel -->
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Timeline</h5>
          </div>
          <div class="card-body" style="min-height: 400px">
            <div v-if="clips.length === 0" class="alert alert-info">
              <i class="bi bi-info-circle"></i>
              No clips added yet. Create a new clip to get started.
            </div>

            <!-- Clips Container (for EditingLanes integration) -->
            <div id="editing-lanes" style="display: flex; flex-direction: column; gap: 10px">
              <div
                v-for="(clip, index) in clips"
                :key="index"
                class="clip-lane d-flex align-items-center p-3 border rounded bg-light"
              >
                <div class="flex-grow-1">
                  <h6 class="mb-1">{{ clip.type }}</h6>
                  <small class="text-muted">
                    Start: {{ clip.start_ms }}ms | Duration: {{ clip.duration_ms }}ms
                  </small>
                </div>
                <button class="btn btn-sm btn-outline-primary me-2" @click="editClip(index)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="removeClip(index)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Window -->
      <div class="col-lg-6">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Preview</h5>
          </div>
          <div class="card-body" style="min-height: 300px">
            <div id="graphics-canvas" style="border: 2px solid #ddd; background: black; aspect-ratio: 320/192">
              <!-- CD+G Graphics rendering area -->
            </div>
          </div>
        </div>
      </div>

      <!-- Clip Editor Panel -->
      <div class="col-lg-6">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Clip Properties</h5>
          </div>
          <div class="card-body">
            <div v-if="selectedClipIndex !== null" :key="selectedClipIndex">
              <div class="mb-3">
                <label class="form-label">Clip Type</label>
                <input
                  type="text"
                  class="form-control"
                  :value="clips[selectedClipIndex].type"
                  disabled
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Start Time (ms)</label>
                <input
                  v-model.number="clips[selectedClipIndex].start_ms"
                  type="number"
                  class="form-control"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Duration (ms)</label>
                <input
                  v-model.number="clips[selectedClipIndex].duration_ms"
                  type="number"
                  class="form-control"
                />
              </div>
              <button class="btn btn-primary btn-sm" @click="saveClipChanges">
                <i class="bi bi-check"></i>
                Save Changes
              </button>
            </div>
            <div v-else class="alert alert-secondary">
              Select a clip to edit its properties
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="row mt-4">
      <div class="col">
        <div class="card">
          <div class="card-body d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm"
              :class="isPlaying ? 'btn-warning' : 'btn-success'"
              @click="togglePlayback"
            >
              <i :class="['bi', isPlaying ? 'bi-pause' : 'bi-play']"></i>
              {{ isPlaying ? 'Pause' : 'Play' }}
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="stopPlayback">
              <i class="bi bi-stop"></i>
              Stop
            </button>
            <div class="flex-grow-1">
              <div class="progress">
                <div class="progress-bar" role="progressbar" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            <small class="text-muted">{{ currentTime }}ms / {{ totalTime }}ms</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Clip {
  type: string;
  start_ms: number;
  duration_ms: number;
}

const clips = ref<Clip[]>([
  {
    type: 'TextClip',
    start_ms: 0,
    duration_ms: 3000,
  },
  {
    type: 'ScrollClip',
    start_ms: 3000,
    duration_ms: 2000,
  },
]);

const selectedClipIndex = ref<number | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const totalTime = ref(10000);

const progressPercent = ref(0);

const addClip = () => {
  const newClip: Clip = {
    type: 'TextClip',
    start_ms: currentTime.value,
    duration_ms: 1000,
  };
  clips.value.push(newClip);
};

const editClip = (index: number) => {
  selectedClipIndex.value = index;
};

const removeClip = (index: number) => {
  clips.value.splice(index, 1);
  if (selectedClipIndex.value === index) {
    selectedClipIndex.value = null;
  }
};

const saveClipChanges = () => {
  // Changes are already saved via v-model binding
  console.log('Clip changes saved');
};

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    simulatePlayback();
  }
};

const stopPlayback = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  progressPercent.value = 0;
};

const simulatePlayback = () => {
  const interval = setInterval(() => {
    if (!isPlaying.value) {
      clearInterval(interval);
      return;
    }

    currentTime.value += 100;
    progressPercent.value = (currentTime.value / totalTime.value) * 100;

    if (currentTime.value >= totalTime.value) {
      isPlaying.value = false;
      currentTime.value = totalTime.value;
      progressPercent.value = 100;
      clearInterval(interval);
    }
  }, 100);
};
</script>

<style scoped>
.clip-lane {
  transition: all 0.2s;
}

.clip-lane:hover {
  background-color: #e9ecef;
  border-color: #0d6efd !important;
}

#graphics-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}
</style>
