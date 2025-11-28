<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col">
        <h1 class="mb-0">
          <i class="bi bi-gear"></i>
          Settings
        </h1>
        <small class="text-muted">Configure application preferences</small>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-8">
        <!-- Audio Settings -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Audio Settings</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Audio Device</label>
              <select v-model="settings.audioDevice" class="form-select">
                <option value="default">Default Device</option>
                <option value="device1">Speaker</option>
                <option value="device2">Headphones</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Sample Rate</label>
              <select v-model.number="settings.sampleRate" class="form-select">
                <option value="44100">44.1 kHz (CD Standard)</option>
                <option value="48000">48 kHz</option>
                <option value="96000">96 kHz</option>
              </select>
              <small class="text-muted">
                CD+Graphics standard is 44.1 kHz (147 samples/packet)
              </small>
            </div>

            <div class="mb-3">
              <label class="form-label">Master Volume</label>
              <div class="d-flex gap-3 align-items-center">
                <input
                  v-model.number="settings.masterVolume"
                  type="range"
                  class="form-range flex-grow-1"
                  min="0"
                  max="100"
                />
                <span class="badge bg-primary">{{ settings.masterVolume }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Graphics Settings -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Graphics Settings</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Display Resolution</label>
              <select v-model="settings.resolution" class="form-select">
                <option value="320x192">320×192 (CD+G Standard)</option>
                <option value="640x384">640×384 (2x Scale)</option>
                <option value="1280x768">1280×768 (4x Scale)</option>
              </select>
            </div>

            <div class="form-check mb-3">
              <input
                v-model="settings.enableDithering"
                type="checkbox"
                class="form-check-input"
                id="enable-dithering"
              />
              <label class="form-check-label" for="enable-dithering">
                Enable color dithering for smooth gradients
              </label>
            </div>

            <div class="form-check mb-3">
              <input
                v-model="settings.enableVsync"
                type="checkbox"
                class="form-check-input"
                id="enable-vsync"
              />
              <label class="form-check-label" for="enable-vsync">
                Enable VSync (reduce tearing)
              </label>
            </div>
          </div>
        </div>

        <!-- Editing Settings -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Editing Settings</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Default Clip Duration (ms)</label>
              <input
                v-model.number="settings.defaultClipDuration"
                type="number"
                class="form-control"
              />
            </div>

            <div class="form-check mb-3">
              <input
                v-model="settings.autoSave"
                type="checkbox"
                class="form-check-input"
                id="auto-save"
              />
              <label class="form-check-label" for="auto-save">
                Auto-save every
              </label>
              <input
                v-model.number="settings.autoSaveInterval"
                type="number"
                class="form-control form-control-sm d-inline-block ms-2"
                style="width: 80px"
              />
              <span class="ms-2">seconds</span>
            </div>

            <div class="form-check">
              <input
                v-model="settings.confirmDelete"
                type="checkbox"
                class="form-check-input"
                id="confirm-delete"
              />
              <label class="form-check-label" for="confirm-delete">
                Confirm before deleting clips
              </label>
            </div>
          </div>
        </div>

        <!-- Export Settings -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Export Settings</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Default Export Format</label>
              <select v-model="settings.defaultExportFormat" class="form-select">
                <option value="cdg">CD+G (.cdg)</option>
                <option value="cdg-cmp">CD+G with Accompaniment (.cdg + .cmp)</option>
              </select>
            </div>

            <div class="form-check mb-3">
              <input
                v-model="settings.validateOnExport"
                type="checkbox"
                class="form-check-input"
                id="validate-export"
              />
              <label class="form-check-label" for="validate-export">
                Always validate packets before export
              </label>
            </div>

            <div class="mb-3">
              <label class="form-label">Export Directory</label>
              <div class="input-group">
                <input
                  v-model="settings.exportDirectory"
                  type="text"
                  class="form-control"
                  disabled
                />
                <button class="btn btn-outline-secondary" type="button">
                  <i class="bi bi-folder"></i>
                  Browse
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="card">
          <div class="card-body d-flex gap-2">
            <button class="btn btn-primary" @click="saveSettings">
              <i class="bi bi-check"></i>
              Save Settings
            </button>
            <button class="btn btn-outline-secondary" @click="resetSettings">
              <i class="bi bi-arrow-clockwise"></i>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <!-- Information Panel -->
      <div class="col-lg-4">
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">CD+Graphics Specifications</h5>
          </div>
          <div class="card-body small">
            <div class="mb-3">
              <strong>Display Size:</strong>
              <div>320 × 192 pixels</div>
            </div>
            <div class="mb-3">
              <strong>Packet Format:</strong>
              <div>24 bytes per packet</div>
            </div>
            <div class="mb-3">
              <strong>Playback Speed:</strong>
              <div>300 packets/second</div>
            </div>
            <div class="mb-3">
              <strong>Audio Sample Rate:</strong>
              <div>44.1 kHz (147 samples/packet)</div>
            </div>
            <div class="mb-3">
              <strong>Color Palette:</strong>
              <div>16 colors (6-bit RGB)</div>
            </div>
            <div>
              <strong>File Extension:</strong>
              <div>.cdg (graphics) + optional .cmp (accompaniment)</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">About Karaoke Composer</h5>
          </div>
          <div class="card-body small">
            <div class="mb-2">
              <strong>Version:</strong> 0.0.2
            </div>
            <div class="mb-2">
              <strong>Built with:</strong> Vue 3 + TypeScript
            </div>
            <div>
              <a href="https://github.com/ancientwizard/Karaoke-Composer" target="_blank" class="text-decoration-none">
                <i class="bi bi-github"></i>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Settings {
  audioDevice: string;
  sampleRate: number;
  masterVolume: number;
  resolution: string;
  enableDithering: boolean;
  enableVsync: boolean;
  defaultClipDuration: number;
  autoSave: boolean;
  autoSaveInterval: number;
  confirmDelete: boolean;
  defaultExportFormat: string;
  validateOnExport: boolean;
  exportDirectory: string;
}

const settings = ref<Settings>({
  audioDevice: 'default',
  sampleRate: 44100,
  masterVolume: 80,
  resolution: '320x192',
  enableDithering: true,
  enableVsync: true,
  defaultClipDuration: 3000,
  autoSave: true,
  autoSaveInterval: 30,
  confirmDelete: true,
  defaultExportFormat: 'cdg',
  validateOnExport: true,
  exportDirectory: '~/Music/KaraokeComposer',
});

const saveSettings = () => {
  // Save to localStorage or backend
  localStorage.setItem('composer-settings', JSON.stringify(settings.value));
  alert('Settings saved successfully!');
};

const resetSettings = () => {
  if (confirm('Reset all settings to defaults?')) {
    settings.value = {
      audioDevice: 'default',
      sampleRate: 44100,
      masterVolume: 80,
      resolution: '320x192',
      enableDithering: true,
      enableVsync: true,
      defaultClipDuration: 3000,
      autoSave: true,
      autoSaveInterval: 30,
      confirmDelete: true,
      defaultExportFormat: 'cdg',
      validateOnExport: true,
      exportDirectory: '~/Music/KaraokeComposer',
    };
  }
};
</script>

<style scoped>
input[type='number'].form-control-sm {
  height: 31px;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
</style>
