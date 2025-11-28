<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col">
        <h1 class="mb-0">
          <i class="bi bi-download"></i>
          Export Project
        </h1>
        <small class="text-muted">Export your project to CD+G format</small>
      </div>
    </div>

    <div class="row g-4">
      <!-- Export Options Panel -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Export Settings</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Project Name</label>
              <input v-model="exportSettings.projectName" type="text" class="form-control" />
            </div>

            <div class="mb-3">
              <label class="form-label">Artist Name</label>
              <input v-model="exportSettings.artistName" type="text" class="form-control" />
            </div>

            <div class="mb-3">
              <label class="form-label">Export Format</label>
              <select v-model="exportSettings.format" class="form-select">
                <option value="cdg">CD+G (.cdg)</option>
                <option value="cdg-cmp">CD+G with Accompaniment (.cdg + .cmp)</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Audio File (optional)</label>
              <input type="file" class="form-control" accept=".mp3,.wav,.flac" />
            </div>

            <div class="form-check mb-3">
              <input
                v-model="exportSettings.validatePackets"
                type="checkbox"
                class="form-check-input"
                id="validate-packets"
              />
              <label class="form-check-label" for="validate-packets">
                Validate packet structure before export
              </label>
            </div>

            <div class="form-check mb-3">
              <input
                v-model="exportSettings.preserveAudio"
                type="checkbox"
                class="form-check-input"
                id="preserve-audio"
              />
              <label class="form-check-label" for="preserve-audio">
                Preserve original audio timing
              </label>
            </div>

            <button class="btn btn-primary btn-lg" @click="startExport" :disabled="isExporting">
              <i :class="['bi', isExporting ? 'bi-hourglass' : 'bi-download']"></i>
              {{ isExporting ? 'Exporting...' : 'Start Export' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Export Progress Panel -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Export Progress</h5>
          </div>
          <div class="card-body">
            <div v-if="!isExporting && !exportComplete" class="alert alert-secondary">
              <i class="bi bi-info-circle"></i>
              Configure export settings and click "Start Export"
            </div>

            <div v-if="isExporting">
              <div class="mb-3">
                <div class="d-flex justify-content-between mb-2">
                  <span>Overall Progress</span>
                  <span>{{ exportProgress }}%</span>
                </div>
                <div class="progress">
                  <div
                    class="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    :style="{ width: exportProgress + '%' }"
                  ></div>
                </div>
              </div>

              <div class="mb-3">
                <small class="text-muted d-block mb-2">Current Step:</small>
                <p class="mb-0">{{ exportStatus }}</p>
              </div>

              <div class="mb-3">
                <small class="text-muted">Time Elapsed: {{ timeElapsed }}s</small>
              </div>
            </div>

            <div v-if="exportComplete" class="alert alert-success">
              <i class="bi bi-check-circle"></i>
              <div>
                <strong>Export Complete!</strong>
                <p class="mb-2">File saved successfully</p>
                <button class="btn btn-sm btn-success" @click="downloadFile">
                  <i class="bi bi-download"></i>
                  Download Now
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Statistics -->
        <div class="card mt-3" v-if="exportComplete">
          <div class="card-header">
            <h5 class="mb-0">Export Statistics</h5>
          </div>
          <div class="card-body small">
            <div class="mb-2">
              <span class="text-muted">Total Packets:</span>
              <strong>{{ stats.totalPackets }}</strong>
            </div>
            <div class="mb-2">
              <span class="text-muted">File Size:</span>
              <strong>{{ stats.fileSize }}</strong>
            </div>
            <div class="mb-2">
              <span class="text-muted">Duration:</span>
              <strong>{{ stats.duration }}</strong>
            </div>
            <div>
              <span class="text-muted">Palette Colors:</span>
              <strong>{{ stats.paletteColors }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ExportSettings {
  projectName: string;
  artistName: string;
  format: string;
  validatePackets: boolean;
  preserveAudio: boolean;
}

interface ExportStats {
  totalPackets: number;
  fileSize: string;
  duration: string;
  paletteColors: number;
}

const exportSettings = ref<ExportSettings>({
  projectName: 'My Song',
  artistName: 'Artist Name',
  format: 'cdg',
  validatePackets: true,
  preserveAudio: true,
});

const isExporting = ref(false);
const exportProgress = ref(0);
const exportStatus = ref('');
const exportComplete = ref(false);
const timeElapsed = ref(0);
const stats = ref<ExportStats>({
  totalPackets: 0,
  fileSize: '0 KB',
  duration: '0:00',
  paletteColors: 16,
});

const startExport = () => {
  isExporting.value = true;
  exportComplete.value = false;
  exportProgress.value = 0;
  timeElapsed.value = 0;

  const steps = [
    'Validating project...',
    'Preparing packets...',
    'Encoding graphics...',
    'Scheduling clips...',
    'Encoding palette...',
    'Building CD+G file...',
    'Finalizing export...',
  ];

  let stepIndex = 0;
  const stepInterval = setInterval(() => {
    if (stepIndex < steps.length) {
      exportStatus.value = steps[stepIndex];
      exportProgress.value = Math.min(((stepIndex + 1) / steps.length) * 100, 95);
      stepIndex++;
    }
  }, 400);

  const timeInterval = setInterval(() => {
    timeElapsed.value += 0.1;
  }, 100);

  // Simulate completion after 3 seconds
  setTimeout(() => {
    clearInterval(stepInterval);
    clearInterval(timeInterval);

    isExporting.value = false;
    exportComplete.value = true;
    exportProgress.value = 100;
    exportStatus.value = 'Export Complete';
    timeElapsed.value = Math.round(timeElapsed.value * 10) / 10;

    // Set realistic stats
    stats.value = {
      totalPackets: 18000,
      fileSize: '432 KB',
      duration: '1:00',
      paletteColors: 16,
    };
  }, 3000);
};

const downloadFile = () => {
  const filename = `${exportSettings.value.projectName}.cdg`;
  console.log(`Downloading ${filename}`);
  alert(`File "${filename}" ready for download`);
};
</script>

<style scoped>
.progress-bar-animated {
  animation: progress-bar-stripes 1s linear infinite;
}

button:disabled {
  opacity: 0.6;
}
</style>
