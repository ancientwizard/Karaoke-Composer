<template>
  <div id="app" class="d-flex flex-column vh-100">
    <nav class="navbar navbar-dark bg-dark sticky-top">
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand">
          <i class="bi bi-music"></i>
          Karaoke Composer
        </router-link>
        <div class="d-flex align-items-center gap-3">
          <span class="text-light">{{ currentRouteName }}</span>
          <button
            class="btn btn-outline-light btn-sm"
            @click="toggleDarkMode"
            title="Toggle Dark Mode"
          >
            <i :class="['bi', darkMode ? 'bi-sun' : 'bi-moon']"></i>
          </button>
        </div>
      </div>
    </nav>

    <div class="flex-grow-1 overflow-hidden d-flex">
      <!-- Sidebar Navigation -->
      <nav class="navbar navbar-expand-lg navbar-light bg-light border-end" style="width: 250px">
        <div class="container-fluid flex-column align-items-start">
          <div class="d-flex flex-column gap-2 w-100 mt-3">
            <router-link
              to="/"
              class="nav-link"
              :class="{ active: $route.path === '/' }"
            >
              <i class="bi bi-house"></i>
              Home
            </router-link>
            <router-link
              to="/editor"
              class="nav-link"
              :class="{ active: $route.path === '/editor' }"
            >
              <i class="bi bi-pencil"></i>
              Editor
            </router-link>
            <router-link
              to="/playlist"
              class="nav-link"
              :class="{ active: $route.path === '/playlist' }"
            >
              <i class="bi bi-music-note-list"></i>
              Playlist
            </router-link>
            <router-link
              to="/export"
              class="nav-link"
              :class="{ active: $route.path === '/export' }"
            >
              <i class="bi bi-download"></i>
              Export
            </router-link>
            <router-link
              to="/settings"
              class="nav-link"
              :class="{ active: $route.path === '/settings' }"
            >
              <i class="bi bi-gear"></i>
              Settings
            </router-link>
          </div>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="flex-grow-1 overflow-auto" :class="{ 'bg-dark': darkMode }">
        <router-view :key="$route.fullPath" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const darkMode = ref(false);

const currentRouteName = computed(() => {
  const names: { [key: string]: string } = {
    '/': 'Home',
    '/editor': 'Editor',
    '/playlist': 'Playlist',
    '/export': 'Export',
    '/settings': 'Settings',
  };
  return names[route.path] || 'Karaoke Composer';
});

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value;
  if (darkMode.value) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-bs-theme');
  }
};
</script>

<style scoped>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.navbar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-link {
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.nav-link.active {
  background-color: #0d6efd;
  color: white !important;
}

main {
  background-color: #f8f9fa;
}

main[class~='bg-dark'] {
  background-color: #212529;
  color: #e9ecef;
}
</style>
