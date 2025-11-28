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

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="modal d-block bg-dark bg-opacity-50" style="display: block">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Import Project</h5>
            <button type="button" class="btn-close" @click="showImportDialog = false"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Select CDG or CMP File</label>
            <input type="file" class="form-control" accept=".cdg,.cmp" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showImportDialog = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="importProject">
              Import
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
                  <th>Artist</th>
                  <th>Duration</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(project, index) in projects" :key="index">
                  <td>
                    <i class="bi bi-file-earmark-music"></i>
                    {{ project.name }}
                  </td>
                  <td>{{ project.artist }}</td>
                  <td>{{ project.duration }}</td>
                  <td>{{ project.created }}</td>
                  <td>
                    <button
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="editProject(index)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary me-2"
                      @click="playProject(index)"
                    >
                      <i class="bi bi-play"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="deleteProject(index)"
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
              No projects yet. Create a new project or import an existing one.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

interface Project {
  name: string;
  artist: string;
  duration: string;
  created: string;
}

const router = useRouter();
const showImportDialog = ref(false);
const projects = ref<Project[]>([
  {
    name: 'Sample Song 1',
    artist: 'Artist Name',
    duration: '3:45',
    created: '2025-01-01',
  },
  {
    name: 'Sample Song 2',
    artist: 'Another Artist',
    duration: '4:20',
    created: '2025-01-02',
  },
]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editProject = (_index: number) => {
  // Load project and navigate to editor
  router.push('/editor');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const playProject = (_index: number) => {
  console.log('Playing project');
};

const deleteProject = (index: number) => {
  if (confirm(`Delete "${projects.value[index].name}"?`)) {
    projects.value.splice(index, 1);
  }
};

const importProject = () => {
  // Handle file import
  showImportDialog.value = false;
  alert('Project imported successfully!');
};
</script>

<style scoped>
.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

.modal.d-block {
  z-index: 1050;
}
</style>
