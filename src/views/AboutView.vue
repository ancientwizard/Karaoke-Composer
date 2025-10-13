<template>
  <div class="about">
    <div class="hero-section bg-primary text-white p-5 rounded mb-4">
      <div class="container-fluid text-center">
        <h1 class="display-4">🎤 About Karaoke Composer</h1>
        <p class="lead">Your ultimate tool for creating synchronized karaoke experiences</p>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">🎵 What is Karaoke Composer?</h5>
            <p class="card-text">
              Karaoke Composer is a modern web application that allows you to create professional 
              karaoke tracks by synchronizing lyrics with audio files. Perfect for musicians, 
              content creators, or anyone who loves karaoke!
            </p>
          </div>
        </div>
      </div>
      
      <div class="col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">⚡ Key Features</h5>
            <ul class="list-unstyled">
              <li><i class="bi bi-check-circle text-success me-2"></i>Audio waveform visualization</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Line-by-line lyric timing</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Real-time preview mode</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Project management system</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Export capabilities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">🛠️ Technology Stack</h5>
            <div class="row">
              <div class="col-md-4">
                <h6>Frontend</h6>
                <ul class="list-unstyled">
                  <li>Vue 3 (Composition API)</li>
                  <li>TypeScript</li>
                  <li>Bootstrap 5</li>
                  <li>Vite</li>
                </ul>
              </div>
              <div class="col-md-4">
                <h6>Audio Processing</h6>
                <ul class="list-unstyled">
                  <li>Web Audio API</li>
                  <li>Canvas API</li>
                  <li>File API</li>
                  <li>Local Storage</li>
                </ul>
              </div>
              <div class="col-md-4">
                <h6>Development</h6>
                <ul class="list-unstyled">
                  <li>ESLint</li>
                  <li>Jest Testing</li>
                  <li>Cypress E2E</li>
                  <li>Hot Module Reload</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card bg-light">
          <div class="card-body text-center">
            <h5 class="card-title">🚀 Ready to Get Started?</h5>
            <p class="card-text">Create your first karaoke project and start making music come alive with synchronized lyrics!</p>
            <div class="d-grid gap-2 d-md-flex justify-content-md-center">
              <router-link to="/compose" class="btn btn-primary btn-lg">
                Start Composing
              </router-link>
              <router-link to="/library" class="btn btn-outline-secondary btn-lg">
                Browse Library
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No reactive data needed for this static about page
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
}

.list-unstyled li {
  margin-bottom: 0.25rem;
}
</style>