<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col">
        <h1 class="mb-0">
          <i class="bi bi-music-note-list"></i>
          Playlist Manager
        </h1>
        <small class="text-muted">Manage your karaoke projects</small>
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" @click="showImportDialog = true">
          <i class="bi bi-upload"></i>
          Import Project
        </button>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="alertMessage" :class="['alert', `alert-${alertType}`, 'alert-dismissible', 'fade', 'show']" role="alert">
      {{ alertMessage }}
      <button type="button" class="btn-close" @click="alertMessage = ''" aria-label="Close"></button>
    </div>

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="modal d-block bg-dark bg-opacity-50" style="display: block">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Import Project</h5>
            <button type="button" class="btn-close" @click="showImportDialog = false"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Select .cmp Project File</label>
            <input
              ref="fileInput"
              type="file"
              class="form-control"
              accept=".cmp"
              @change="onFileSelected"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showImportDialog = false">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="importProject"
              :disabled="!selectedFile || isLoading"
            >
              <i v-if="isLoading" class="bi bi-hourglass-split"></i>
              <i v-else class="bi bi-upload"></i>
              {{ isLoading ? 'Loading...' : 'Import' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Projects List -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Your Projects</h5>
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Audio File</th>
                  <th>Clips</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(project, index) in projects" :key="index">
                  <td>
                    <i class="bi bi-file-earmark-music"></i>
                    {{ project.name }}
                  </td>
                  <td>{{ project.audioFile }}</td>
                  <td>{{ project.clipsCount }}</td>
                  <td>{{ formatDuration(project.duration) }}</td>
                  <td>
                    <button
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="editProject(index)"
                      title="Open in editor"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary me-2"
                      @click="viewDetails(index)"
                      title="View details"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="deleteProject(index)"
                      title="Remove from list"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="projects.length === 0" class="card-body">
            <div class="alert alert-info mb-0">
              <i class="bi bi-info-circle"></i>
              No projects loaded. Import a project file (.cmp) to get started.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Details Modal -->
    <div v-if="showDetailsModal && selectedProjectIndex !== null" class="modal d-block bg-dark bg-opacity-50" style="display: block">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Project Details</h5>
            <button type="button" class="btn-close" @click="showDetailsModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="projects[selectedProjectIndex]" class="row g-3">
              <div class="col-md-6">
                <strong>Project Name:</strong>
                <p>{{ projects[selectedProjectIndex].name }}</p>
              </div>
              <div class="col-md-6">
                <strong>Audio File:</strong>
                <p>{{ projects[selectedProjectIndex].audioFile }}</p>
              </div>
              <div class="col-md-6">
                <strong>Total Clips:</strong>
                <p>{{ projects[selectedProjectIndex].clipsCount }}</p>
              </div>
              <div class="col-md-6">
                <strong>Duration:</strong>
                <p>{{ formatDuration(projects[selectedProjectIndex].duration) }}</p>
              </div>
              <div class="col-12">
                <strong>Path:</strong>
                <p class="text-muted small">{{ projects[selectedProjectIndex].projectPath }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDetailsModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ProjectLoader } from '@/ts/project/ProjectLoader';
import type { LoadedProject } from '@/ts/project/ProjectLoader';

interface Project extends LoadedProject {
  id?: string;
}

const router = useRouter();
const fileInput = ref<HTMLInputElement>();
const showImportDialog = ref(false);
const showDetailsModal = ref(false);
const selectedFile = ref<File | null>(null);
const isLoading = ref(false);
const alertMessage = ref('');
const alertType = ref<'success' | 'error' | 'info'>('info');
const selectedProjectIndex = ref<number | null>(null);
const projects = ref<Project[]>([]);

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
};

const importProject = async () => {
  if (!selectedFile.value) {
    return;
  }

  isLoading.value = true;
  try {
    const buffer = await selectedFile.value.arrayBuffer();
    const loaded = ProjectLoader.loadFromBuffer(buffer, selectedFile.value.name);

    if (loaded) {
      // Add unique ID to project
      (loaded as Project).id = `${loaded.name}-${Date.now()}`;
      projects.value.push(loaded as Project);

      alertMessage.value = `Project "${loaded.name}" imported successfully!`;
      alertType.value = 'success';

      // Close dialog and reset
      showImportDialog.value = false;
      selectedFile.value = null;
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    } else {
      alertMessage.value = 'Failed to parse project file. Ensure it is a valid .cmp file.';
      alertType.value = 'error';
    }
  } catch (error) {
    alertMessage.value = `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    alertType.value = 'error';
  } finally {
    isLoading.value = false;
  }
};

const editProject = (index: number) => {
  const project = projects.value[index];
  // Store project in session storage for editor to access
  sessionStorage.setItem('currentProject', JSON.stringify(project));
  router.push('/editor');
};

const viewDetails = (index: number) => {
  selectedProjectIndex.value = index;
  showDetailsModal.value = true;
};

const deleteProject = (index: number) => {
  const project = projects.value[index];
  if (confirm(`Delete "${project.name}" from the list?`)) {
    projects.value.splice(index, 1);
    alertMessage.value = `Project "${project.name}" removed.`;
    alertType.value = 'info';
  }
};

const formatDuration = (packets: number): string => {
  const seconds = Math.round(packets / 300);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

.modal.d-block {
  z-index: 1050;
}

.alert {
  margin-top: 1rem;
}
</style>
