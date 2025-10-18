<template>
  <div class="library">
    <h1>🎵 Song Library</h1>
    <p class="lead">Browse and search through our karaoke song collection</p>

    <div class="search-section mb-4">
      <div class="row">
        <div class="col-md-8">
          <input type="text" class="form-control" placeholder="Search for songs, artists, or genres..." v-model="searchQuery" />
        </div>
        <div class="col-md-4">
          <button class="btn btn-primary w-100" @click="searchSongs">Search</button>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5>Available Songs</h5>
          </div>
          <div class="card-body">
            <div v-if="songs.length === 0" class="text-center text-muted">
              <p>No songs available yet. Coming soon!</p>
            </div>
            <div v-else>
              <div class="list-group">
                <div
                  v-for="song in filteredSongs"
                  :key="song.id"
                  class="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <h6 class="mb-1">{{ song.title }}</h6>
                    <small class="text-muted">{{ song.artist }} - {{ song.genre }}</small>
                  </div>
                  <button class="btn btn-sm btn-outline-primary">Play</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Types
interface Song {
  id: number
  title: string
  artist: string
  genre: string
  duration: string
}

// Reactive data
const searchQuery = ref('')
const songs = ref<Song[]>([
  // Sample data - replace with actual API calls
  {
 id: 1, title: "Don't Stop Believin'", artist: 'Journey', genre: 'Rock', duration: '4:11' 
},
  {
 id: 2, title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', duration: '5:55' 
},
  {
 id: 3, title: 'Sweet Caroline', artist: 'Neil Diamond', genre: 'Pop', duration: '3:21' 
},
])

// Computed properties
const filteredSongs = computed(() => {
  if (!searchQuery.value) {
    return songs.value
  }
  return songs.value.filter(
    song =>
      song.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      song.genre.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Methods
const searchSongs = () => {
  console.log('Searching for:', searchQuery.value)
  // TODO: Implement actual search logic
}
</script>

<style scoped>
.search-section {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: 0.5rem;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>
