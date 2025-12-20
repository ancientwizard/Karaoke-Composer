<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <router-link class="navbar-brand" to="/">🎤 Karaoke Composer</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item btn btn-primary">
              <router-link class="nav-link text-white" to="/">🏠 Home</router-link>
            </li>
            <li class="nav-item btn btn-primary">
              <router-link class="nav-link text-white" to="/compose">🎼 Compose</router-link>
            </li>
            <li class="nav-item btn btn-primary">
              <router-link class="nav-link text-white" to="/library">🎵 Library</router-link>
            </li>
            <li class="nav-item btn btn-primary">
              <router-link class="nav-link text-white" to="/about">🌐 About</router-link>
            </li>
            <li v-if="developerMode" class="nav-item btn btn-primary">
              <router-link class="nav-link text-white" to="/developer">🔧 Developer</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="container mt-4">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * App component
 * Root application shell with navigation and router view
 */
import { ref } from 'vue'

/**
 * Enable developer mode to show developer tools in navigation
 */
const developerMode = ref(true)
</script>

<style scoped>
.navbar-brand {
  font-weight: bold;
  font-size: 1.5rem;
}

.router-link-active {
  font-weight: bold;
}
</style>
