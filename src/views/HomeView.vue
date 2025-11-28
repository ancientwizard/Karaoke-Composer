<template>
  <div class="container-fluid py-5">
    <div class="row mb-5">
      <div class="col-lg-8">
        <h1 class="display-4 mb-4">
          <i class="bi bi-music"></i>
          Welcome to Karaoke Composer
        </h1>
        <p class="lead text-muted">
          Create, edit, and export professional CD+G karaoke files with ease.
        </p>
      </div>
    </div>

    <div class="row g-4">
      <!-- Create New Project Card -->
      <div class="col-md-6">
        <div class="card h-100 shadow-sm hover-effect">
          <div class="card-body">
            <h5 class="card-title mb-3">
              <i class="bi bi-file-earmark-plus text-primary"></i>
              Create New Project
            </h5>
            <p class="card-text text-muted">
              Start a new karaoke project from scratch or import an existing file.
            </p>
            <button class="btn btn-primary" @click="createNewProject">
              <i class="bi bi-plus"></i>
              New Project
            </button>
          </div>
        </div>
      </div>

      <!-- Open Recent Card -->
      <div class="col-md-6">
        <div class="card h-100 shadow-sm hover-effect">
          <div class="card-body">
            <h5 class="card-title mb-3">
              <i class="bi bi-folder-open text-success"></i>
              Open Recent
            </h5>
            <p class="card-text text-muted">
              Access your recently edited karaoke projects.
            </p>
            <button class="btn btn-success" @click="navigateToPlaylist">
              <i class="bi bi-music-note-list"></i>
              View Playlist
            </button>
          </div>
        </div>
      </div>

      <!-- Editor Card -->
      <div class="col-md-6">
        <div class="card h-100 shadow-sm hover-effect">
          <div class="card-body">
            <h5 class="card-title mb-3">
              <i class="bi bi-pencil-square text-info"></i>
              Edit Project
            </h5>
            <p class="card-text text-muted">
              Edit text, scrolling, and palette clips in real-time with audio sync.
            </p>
            <button class="btn btn-info" @click="navigateToEditor">
              <i class="bi bi-pencil"></i>
              Go to Editor
            </button>
          </div>
        </div>
      </div>

      <!-- Export Card -->
      <div class="col-md-6">
        <div class="card h-100 shadow-sm hover-effect">
          <div class="card-body">
            <h5 class="card-title mb-3">
              <i class="bi bi-download text-warning"></i>
              Export to CDG
            </h5>
            <p class="card-text text-muted">
              Export your project as a CD+G file for playback in any karaoke player.
            </p>
            <button class="btn btn-warning text-dark" @click="navigateToExport">
              <i class="bi bi-download"></i>
              Export Now
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="row mt-5 pt-5 border-top">
      <div class="col-12">
        <h2 class="mb-4">Key Features</h2>
      </div>
      <div class="col-md-4 mb-4">
        <div class="d-flex gap-3">
          <div class="flex-shrink-0">
            <i class="bi bi-music-note text-primary" style="font-size: 1.5rem"></i>
          </div>
          <div>
            <h5>Audio Synchronization</h5>
            <p class="text-muted small">
              Real-time audio playback with frame-accurate packet scheduling
            </p>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-4">
        <div class="d-flex gap-3">
          <div class="flex-shrink-0">
            <i class="bi bi-palette text-success" style="font-size: 1.5rem"></i>
          </div>
          <div>
            <h5>Palette Management</h5>
            <p class="text-muted small">
              Create stunning visual effects with 16-color CD+G palette editing
            </p>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-4">
        <div class="d-flex gap-3">
          <div class="flex-shrink-0">
            <i class="bi bi-layers text-info" style="font-size: 1.5rem"></i>
          </div>
          <div>
            <h5>Multi-Clip Composition</h5>
            <p class="text-muted small">
              Layer text, scrolling, and bitmap clips with precise timing
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const createNewProject = () => {
  // TODO: Initialize new project state
  router.push('/editor');
};

const navigateToEditor = () => {
  router.push('/editor');
};

const navigateToPlaylist = () => {
  router.push('/playlist');
};

const navigateToExport = () => {
  router.push('/export');
};
</script>

<style scoped>
.hover-effect {
  transition: all 0.3s ease;
}

.hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}

.display-4 {
  font-weight: 700;
  letter-spacing: -0.5px;
}
</style>
