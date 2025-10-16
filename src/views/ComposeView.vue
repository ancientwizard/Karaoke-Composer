<template>
  <div class="compose-view">
    <!-- Project Creation Modal -->
    <div class="modal" :class="{ show: showCreateProject }" v-if="showCreateProject" @click="closeCreateProject">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create New Karaoke Project</h5>
            <button type="button" class="btn-close" @click="closeCreateProject"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createProject">
              <div class="mb-3">
                <label for="projectName" class="form-label">Song Title *</label>
                <input type="text" class="form-control" id="projectName" v-model="newProject.name" required
                  placeholder="Enter song title" />
              </div>
              <div class="mb-3">
                <label for="projectArtist" class="form-label">Artist *</label>
                <input type="text" class="form-control" id="projectArtist" v-model="newProject.artist" required
                  placeholder="Enter artist name" />
              </div>
              <div class="mb-3">
                <label for="projectGenre" class="form-label">Genre</label>
                <select class="form-control" id="projectGenre" v-model="newProject.genre">
                  <option value="">Select Genre</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Country">Country</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="R&B">R&B</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="audioFile" class="form-label">Audio File (MP3, WAV) *</label>
                <input type="file" class="form-control" id="audioFile" accept="audio/*" @change="handleAudioFile"
                  required />
              </div>
              <div class="mb-3">
                <label for="lyrics" class="form-label">Lyrics</label>
                <textarea class="form-control" id="lyrics" rows="8" v-model="newProject.lyricsText"
                  placeholder="Paste your lyrics here (one line per verse/chorus line)..."></textarea>
                <div class="form-text">Each line will become a timing point for synchronization</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeCreateProject">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createProject" :disabled="!canCreateProject">
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Storage Info Modal -->
    <div class="modal" :class="{ show: showStorageInfo }" v-if="showStorageInfo" @click="closeStorageInfo">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">🗂️ Audio Storage Information</h5>
            <button type="button" class="btn-close" @click="closeStorageInfo"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Storage Methods</h6>
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>📦 Base64 (localStorage)</span>
                    <span class="badge bg-warning rounded-pill">≤1MB</span>
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>🗄️ IndexedDB</span>
                    <span class="badge bg-success rounded-pill">4-5MB+ Files</span>
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>📁 Reference</span>
                    <span class="badge bg-warning rounded-pill">Re-select</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <h6>Current Usage</h6>
                <div v-if="storageInfo" class="card">
                  <div class="card-body">
                    <div class="d-flex justify-content-between">
                      <span>Preferred:</span>
                      <strong>{{ storageInfo.method }}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Audio Files:</span>
                      <strong>{{ storageInfo.count }}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Audio Size:</span>
                      <strong>{{ storageInfo.sizeMB }} MB</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Storage Used:</span>
                      <strong>{{ storageInfo.quotaUsedMB }}/{{ storageInfo.quotaLimitMB }} MB</strong>
                    </div>

                    <!-- Quota warning -->
                    <div v-if="storageInfo.quotaUsedMB > storageInfo.quotaLimitMB * 0.8"
                      class="alert alert-warning mt-2 mb-0 p-2">
                      <small><i class="bi bi-exclamation-triangle"></i> Storage nearly full!</small>
                    </div>
                  </div>
                </div>

                <!-- Storage actions -->
                <div class="mt-2">
                  <button class="btn btn-outline-info btn-sm w-100 mb-2" @click="testIndexedDB">
                    <i class="bi bi-gear"></i> Test IndexedDB
                  </button>
                  <button class="btn btn-outline-success btn-sm w-100 mb-2" @click="fixStorageBadges">
                    <i class="bi bi-wrench"></i> Fix Storage Badges
                  </button>
                  <button class="btn btn-outline-warning btn-sm w-100" @click="clearAudioCache">
                    <i class="bi bi-trash3"></i> Clear Audio Cache
                  </button>
                </div>
              </div>
            </div>

            <hr />

            <div class="alert alert-info">
              <h6><i class="bi bi-info-circle"></i> Storage Methods Explained:</h6>
              <ul class="mb-0">
                <li><strong>IndexedDB:</strong> Best for 4-5MB+ files - up to ~1GB capacity, persistent storage</li>
                <li><strong>Base64:</strong> Small files only (≤1MB) - fastest loading but limited by browser quota</li>
                <li><strong>Reference:</strong> Fallback method - you'll need to re-select files when loading</li>
              </ul>
              <div class="mt-2 p-2 bg-light rounded">
                <small><strong>💡 IndexedDB is a built-in browser feature:</strong></small><br />
                <small>• No setup required - works automatically</small><br />
                <small>• Available in all modern browsers (Chrome, Firefox, Safari, Edge)</small><br />
                <small>• Perfect for your 4-5MB audio files - no quota issues!</small><br />
                <small>• Use "Test IndexedDB" button to verify it's working</small>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeStorageInfo">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Projects Management Screen -->
    <div class="projects-screen py-4">
      <div class="card">
        <div class="card-header compose-header">
          <div class="row align-items-center">
            <div class="col-md-6">
              <h2 class="mb-1">🎼 Karaoke Composer</h2>
              <p class="mb-0 text-muted">Create and sync your karaoke tracks</p>
            </div>
            <div class="col-md-6 text-end">
              <button class="btn btn-primary me-2" @click="showCreateProject = true">
                <i class="bi bi-plus-circle"></i> New Project
              </button>
              <button class="btn btn-info btn-sm me-2" @click="openStorageInfo" title="Audio storage information">
                <i class="bi bi-info-circle"></i> Storage
              </button>
              <button class="btn btn-danger btn-sm" @click="clearAllProjects" title="Clear all saved projects">
                <i class="bi bi-trash3"></i> Clear All
              </button>
            </div>
          </div>
        </div>

        <div class="card-body">
          <!-- Projects List -->
          <div v-if="projects.length > 0">
            <h5 class="mb-3">Your Projects</h5>
            <div class="list-group">
              <div v-for="project in projects" :key="project.id" class="list-group-item p-0 project-item">
                <div class="btn-group w-100" role="group">
                  <button class="btn btn-outline-secondary text-start flex-grow-1 project-content-btn"
                    @click="openProject(project)">
                    <div class="fw-bold d-flex align-items-center">
                      <i class="bi bi-music-note-beamed me-2 text-primary"></i>
                      {{ project.name }}
                    </div>
                    <div class="text-muted small">by {{ project.artist }} • {{ project.genre }}</div>
                    <div class="text-muted small">
                      <i class="bi bi-clock me-1"></i>
                      Last updated {{ formatDate(project.updatedAt) }}
                    </div>
                    <div class="text-muted small" v-if="project.audioFile">
                      <i class="bi bi-file-music me-1"></i>
                      {{ project.audioFile.name }}
                      <span class="badge ms-2"
                        :class="getStorageBadgeClass(project.audioFile.storedData?.storageType || 'unknown')">
                        {{ getStorageBadgeText(project.audioFile.storedData?.storageType || 'unknown') }}
                      </span>
                    </div>
                  </button>
                  <button class="btn btn-warning delete-btn" @click.stop="deleteProject(project)"
                    title="Delete project">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-5">
            <i class="bi bi-music-note-list display-1 text-muted mb-3"></i>
            <h5 class="text-muted">No projects yet</h5>
            <p class="text-muted">Create your first karaoke project to get started</p>
            <button class="btn btn-primary btn-lg" @click="showCreateProject = true">
              <i class="bi bi-plus-circle me-2"></i>Create Your First Project
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Developer Toolbar -->
  <div class="developer-toolbar">
    <div class="container">
      <!-- Toolbar Header (always visible) -->
      <div class="toolbar-header" @click="toggleDevToolbar">
        <div class="toolbar-label">
          <i class="bi bi-code-slash me-1"></i>
          <small class="text-muted">Developer Tools</small>
        </div>
        <div class="toolbar-toggle">
          <i class="bi bi-chevron-down" :class="{ 'rotate-180': !showDevToolbar }"></i>
        </div>
      </div>

      <!-- Toolbar Content (collapsible) -->
      <div v-if="showDevToolbar" class="toolbar-content">
        <div class="toolbar-buttons">
          <router-link to="/test-timing" class="btn btn-outline-primary btn-sm me-2">
            <i class="bi bi-play-circle me-1"></i>
            Test Word Timing Editor
          </router-link>
          <button class="btn btn-outline-secondary btn-sm me-2" @click="showStorageInfo = true">
            <i class="bi bi-database me-1"></i>
            Storage Info
          </button>
          <button class="btn btn-outline-info btn-sm" @click="fixStorageBadges">
            <i class="bi bi-wrench me-1"></i>
            Fix Badges
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { KaraokeProject } from '@/types/karaoke'
import { audioStorageService } from '@/services/audioStorageService'
import { parseLyricsWithMetadata } from '@/utils/lyricsParser'

// Reactive state
const router = useRouter()
const showCreateProject = ref(false)
const showStorageInfo = ref(false)
const projects = ref<KaraokeProject[]>([])

// Developer toolbar
const showDevToolbar = ref(true)

// Storage and IndexedDB testing
const indexedDBTestResult = ref<string>('')
const storageInfo = ref<{ method: string; sizeMB: number; count: number; quotaUsedMB: number; quotaLimitMB: number } | null>(null)

// New project form
const newProject = ref({
  name: '',
  artist: '',
  genre: '',
  lyricsText: '',
  audioFile: null as File | null,
})

// Computed properties
const canCreateProject = computed(() => {
  return newProject.value.name && newProject.value.artist && newProject.value.audioFile
})

const hotkeyHelpText = computed(() => {
  return 'Click for complete hotkey reference guide'
})

// Watch for lyrics changes to auto-populate title and artist from metadata
watch(() => newProject.value.lyricsText, (newLyrics) => {
  if (!newLyrics) return

  const { metadata } = parseLyricsWithMetadata(newLyrics)

  // Auto-populate title if found in metadata and user hasn't entered one yet
  if (metadata.title && !newProject.value.name.trim()) {
    newProject.value.name = metadata.title
  }

  // Auto-populate artist if found in metadata and user hasn't entered one yet
  if (metadata.author && !newProject.value.artist.trim()) {
    newProject.value.artist = metadata.author
  }
})

// Methods
const closeCreateProject = () => {
  showCreateProject.value = false
  resetNewProject()
}

const closeStorageInfo = () => {
  showStorageInfo.value = false
}

const openStorageInfo = () => {
  storageInfo.value = audioStorageService.getStorageInfo()
  showStorageInfo.value = true
}

const clearAudioCache = async () => {
  if (
    confirm(
      'This will remove all cached audio files from storage. Projects will still work but may need to re-select audio files. Continue?'
    )
  ) {
    const cleared = await audioStorageService.clearOldAudioFiles()
    alert(`Cleared ${cleared} audio files from cache.`)
    // Refresh storage info
    storageInfo.value = audioStorageService.getStorageInfo()
  }
}

const testIndexedDB = async () => {
  const result = await audioStorageService.testIndexedDBConnection()

  let message = '🔍 IndexedDB Test Results:\n\n'

  if (result.available) {
    message += '✅ IndexedDB is supported by your browser\n'
  }
  else {
    message += '❌ IndexedDB is NOT supported by your browser\n'
  }

  if (result.canStore) {
    message += '✅ Can store files in IndexedDB\n'
    message += '🎵 Your 4-5MB audio files will work perfectly!'
  }
  else {
    message += '❌ Cannot store files in IndexedDB\n'
    if (result.error) {
      message += `Error: ${result.error}\n`
    }
    message += '⚠️ Will fallback to other storage methods'
  }

  alert(message)
}

const getStorageBadgeClass = (storageType: string) => {
  switch (storageType) {
    case 'base64':
      return 'bg-success'
    case 'indexeddb':
      return 'bg-info'
    case 'reference':
      return 'bg-warning'
    default:
      return 'bg-secondary'
  }
}

const getStorageBadgeText = (storageType: string) => {
  switch (storageType) {
    case 'base64':
      return '📦 Base64'
    case 'indexeddb':
      return '🗄️ IndexedDB'
    case 'reference':
      return '📁 Reference'
    default:
      return 'Unknown'
  }
}

const resetNewProject = () => {
  newProject.value = {
    name: '',
    artist: '',
    genre: '',
    lyricsText: '',
    audioFile: null,
  }
}

const handleAudioFile = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    newProject.value.audioFile = target.files[0]
  }
}

const createProject = async () => {
  console.log('createProject called', {
    canCreate: canCreateProject.value,
    name: newProject.value.name,
    artist: newProject.value.artist,
    audioFile: newProject.value.audioFile?.name,
  })

  if (!canCreateProject.value) {
    console.log('Cannot create project - missing requirements')
    return
  }

  // Parse lyrics with metadata and syllable support
  const { lyrics } = parseLyricsWithMetadata(newProject.value.lyricsText)

  const projectId = `project-${Date.now()}`

  // Store the audio file using the storage service
  console.log('Storing audio file...')
  const storedAudioFile = await audioStorageService.storeAudioFile(newProject.value.audioFile!, projectId)

  const project: KaraokeProject = {
    id: projectId,
    name: newProject.value.name,
    artist: newProject.value.artist,
    genre: newProject.value.genre || 'Unknown',
    createdAt: new Date(),
    updatedAt: new Date(),
    audioFile: {
      name: newProject.value.audioFile!.name,
      file: newProject.value.audioFile,
      url: URL.createObjectURL(newProject.value.audioFile!),
      storedData: storedAudioFile,
    },
    lyrics,
    timings: [],
    isCompleted: false,
  }

  projects.value.push(project)

  try {
    saveProjectsToStorage()
    closeCreateProject()
    console.log('Project created successfully:', project.name)

    // Navigate to the timing editor
    router.push(`/timing/${projectId}`)
  }
  catch (error) {
    console.error('Error creating project:', error)
    alert('Error creating project: ' + error)
  }
}

const openProject = async (project: KaraokeProject) => {
  // Navigate to the timing editor
  router.push(`/timing/${project.id}`)
}

const deleteProject = async (project: KaraokeProject) => {
  if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
    // Remove from projects array
    const index = projects.value.findIndex(p => p.id === project.id)
    if (index > -1) {
      projects.value.splice(index, 1)

      // Save updated projects to storage
      saveProjectsToStorage()

      console.log(`Project "${project.name}" deleted successfully`)
    }
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const loadProjectsFromStorage = () => {
  const stored = localStorage.getItem('karaokeProjects')
  if (stored) {
    try {
      const data = JSON.parse(stored)
      projects.value = data.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        // Ensure audioFile has the right structure
        audioFile: {
          ...p.audioFile,
          file: null, // File objects can't be serialized, will be restored from storage
        },
      }))
      console.log(`Loaded ${projects.value.length} projects from storage`)

      // Debug storage badge issue
      projects.value.forEach((project, index) => {
        console.log(`🔍 Project ${index + 1}: "${project.name}"`)
        console.log('   audioFile:', project.audioFile)
        console.log('   storedData:', project.audioFile?.storedData)
        console.log('   storageType:', project.audioFile?.storedData?.storageType)
        console.log('   Badge will show:', getStorageBadgeText(project.audioFile?.storedData?.storageType || 'unknown'))
        console.log('---')
      })
    }
    catch (error) {
      console.error('Error loading projects:', error)
    }
  }
}

const saveProjectsToStorage = () => {
  try {
    // Create a serializable version of projects (without File objects)
    const serializableProjects = projects.value.map(project => ({
      ...project,
      audioFile: {
        ...project.audioFile,
        file: null, // Remove File object for serialization
        url: undefined, // Remove blob URL (will be recreated)
      },
    }))

    localStorage.setItem('karaokeProjects', JSON.stringify(serializableProjects))
    console.log(`💾 Saved ${projects.value.length} projects to storage`)

    // Debug: Check if storedData is preserved
    serializableProjects.forEach((project, index) => {
      console.log(`Project ${index}: ${project.name} - StoredData preserved:`, {
        hasStoredData: !!project.audioFile.storedData,
        storageType: project.audioFile.storedData?.storageType,
        duration: project.audioFile.duration,
      })
    })
  }
  catch (error) {
    console.error('Error saving projects:', error)
  }
}

const fixStorageBadges = () => {
  let fixedCount = 0

  projects.value.forEach(project => {
    if (project.audioFile && !project.audioFile.storedData) {
      // Try to infer storage type from available data
      let inferredStorageType = 'reference' // Default fallback

      // Check if there's base64 data in localStorage
      const lastModified = project.audioFile.file?.lastModified || 0
      const audioKey = `audio_${project.id}_${project.audioFile.name}_${lastModified}`
      if (localStorage.getItem(`audio_${audioKey}`)) {
        inferredStorageType = 'base64'
      }

      // Create minimal storedData
      project.audioFile.storedData = {
        name: project.audioFile.name,
        size: 0,
        type: 'audio/mpeg',
        lastModified: Date.now(),
        storageType: inferredStorageType as 'base64' | 'indexeddb' | 'reference',
      }

      fixedCount++
      console.log(`🔧 Fixed storage badge for project: ${project.name} -> ${inferredStorageType}`)
    }
  })

  if (fixedCount > 0) {
    saveProjectsToStorage()
    alert(`Fixed storage badges for ${fixedCount} project(s). Refresh the page to see the changes.`)
  }
  else {
    alert('All projects already have proper storage data.')
  }
}

const clearAllProjects = () => {
  if (confirm('Are you sure you want to delete ALL saved projects? This cannot be undone.')) {
    localStorage.removeItem('karaokeProjects')
    projects.value = []

    console.log('All projects cleared from localStorage')
    alert('All projects have been cleared. You can now start fresh!')
  }
}

const toggleDevToolbar = () => {
  showDevToolbar.value = !showDevToolbar.value
}

// Global hotkey handler for ESC key
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Escape') {
    if (showCreateProject.value) {
      event.preventDefault()
      closeCreateProject()
    }
    else if (showStorageInfo.value) {
      event.preventDefault()
      closeStorageInfo()
    }
  }
}

onMounted(async () => {
  loadProjectsFromStorage()

  // Wait a moment for IndexedDB to initialize
  await new Promise(resolve => setTimeout(resolve, 100))

  // Check storage health and IndexedDB status
  const info = audioStorageService.getStorageInfo()
  console.log('🔍 Audio storage service initialized:', info)

  // Check IndexedDB availability
  if (window.indexedDB) {
    console.log('✅ IndexedDB is available in this browser')
  }
  else {
    console.warn('❌ IndexedDB is NOT available in this browser')
  }

  if (info.quotaUsedMB > info.quotaLimitMB * 0.9) {
    console.warn('⚠️ Storage quota nearly full:', info.quotaUsedMB, '/', info.quotaLimitMB, 'MB')
  }

  // Log storage method being used
  if (info.method === 'indexeddb') {
    console.log('🗄️ Using IndexedDB - perfect for 4-5MB files!')
  }
  else {
    console.log('📦 Using fallback storage method:', info.method)
  }

  // Setup ESC key handler for closing modals
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  // Cleanup ESC key handler
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.modal.show {
  display: block;
  background-color: rgba(0, 0, 0, 0.5);
}

.compose-header {
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
}

.project-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.project-info .card-body {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 0.5rem;
}

.projects-screen {
  min-height: 60vh;
}

.project-item {
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.project-item:hover {
  border-left-color: #0d6efd;
  transform: translateX(2px);
}

.project-content-btn {
  padding: 1rem;
  height: auto;
  white-space: normal;
  text-align: left !important;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}

.project-content-btn:hover {
  background-color: #f8f9fa;
  border-color: #0d6efd;
  color: #212529 !important;
}

.project-content-btn:hover .text-muted {
  color: #6c757d !important;
}

.project-content-btn:hover .text-primary {
  color: #0d6efd !important;
}

.delete-btn {
  width: 60px;
  max-width: 60px;
  flex: 0 0 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.project-item .btn-group {
  transition: all 0.2s ease;
}

/* Ensure button group buttons connect properly */
.btn-group>.btn:not(:last-child) {
  border-right: none;
}

.btn-group>.btn:not(:first-child) {
  border-left: none;
}

/* Developer Toolbar */
.developer-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f8f9fa;
  border-top: 2px solid #007bff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.toolbar-header:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.toolbar-label {
  display: flex;
  align-items: center;
}

.toolbar-toggle {
  color: #6c757d;
  transition: transform 0.3s ease;
}

.toolbar-toggle .rotate-180 {
  transform: rotate(180deg);
}

.toolbar-content {
  padding-bottom: 10px;
  border-top: 1px solid #dee2e6;
  padding-top: 10px;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Add some padding to the main content so it doesn't get hidden behind the toolbar */
.compose-view {
  padding-bottom: 60px;
}
</style>
