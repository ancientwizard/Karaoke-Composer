<template>
  <div class="home">
    <div class="hero-section bg-light p-5 rounded mb-4">
      <div class="container-fluid text-center">
        <h1 class="display-4">🎤 Welcome to Karaoke Composer</h1>
        <p class="lead">Your ultimate karaoke companion for creating and managing amazing sing-along experiences!</p>
        <button class="btn btn-primary btn-lg" @click="startKaraoke">Start Singing!</button>
      </div>
    </div>

    <div class="row">
      <div class="col-md-4 mb-4">
        <div class="card h-100">
          <div class="card-body text-center">
            <h5 class="card-title">🎵 Song Library</h5>
            <p class="card-text">Browse through our extensive collection of karaoke songs and find your favorites.</p>
            <router-link to="/library" class="btn btn-outline-primary">Browse Songs</router-link>
          </div>
          <attention-label coming-soon offset-x="-20px" offset-y="90px" bg-color-class="bg-primary" text-color-class="text-light"/>
        </div>
      </div>

      <div class="col-md-4 mb-4">
        <div class="card h-100">
          <div class="card-body text-center">
            <h5 class="card-title">🎼 Compose Karaoke</h5>
            <p class="card-text">Create your own karaoke tracks by syncing lyrics with audio files.</p>
            <router-link to="/compose" class="btn btn-outline-success">Start Composing</router-link>
          </div>
          <attention-label new-and-improved offset-x="-20px" offset-y="90px" bg-color-class="bg-warning" text-color-class="text-danger"/>
        </div>
      </div>

      <div class="col-md-4 mb-4">
        <div class="card h-100">
          <div class="card-body text-center">
            <h5 class="card-title">⭐ Favorites</h5>
            <p class="card-text">Keep track of your favorite songs for quick access during your sessions.</p>
            <button class="btn btn-outline-warning" @click="viewFavorites">My Favorites</button>
          </div>
          <attention-label coming-soon offset-x="-20px" offset-y="90px" bg-color-class="bg-primary" text-color-class="text-light"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore: no declaration file for .vue modules
import AttentionLabel from '@/components/AttentionLabel.vue'


// Methods
const startKaraoke = () => {
  console.log('Starting karaoke session...')
  // TODO: Implement karaoke start logic
}

// const startPerformance = () => {
//   console.log('Starting live performance...')
//   // TODO: Implement performance logic
// }

const viewFavorites = () => {
  console.log('Viewing favorites...')
  // TODO: Implement favorites view
}
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card {
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-5px);
}

.btn {
  transition: all 0.2s;
}
</style>
