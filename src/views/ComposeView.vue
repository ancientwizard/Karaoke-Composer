<template>
  <div class="compose-view">
    <!-- Header with project selection and actions -->
    <div class="compose-header bg-light p-3 mb-4">
      <div class="row align-items-center">
        <div class="col-md-6">
          <h2>🎼 Compose Karaoke</h2>
          <p class="mb-0 text-muted">Create and sync your karaoke tracks</p>
        </div>
        <div class="col-md-6 text-end">
          <button class="btn btn-primary me-2" @click="showCreateProject = true">
            <i class="bi bi-plus-circle"></i> New Project
          </button>
          <button class="btn btn-secondary me-2" @click="showProjectList = true">
            <i class="bi bi-folder2-open"></i> Open Project
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
                <input 
                  type="text" 
                  class="form-control" 
                  id="projectName"
                  v-model="newProject.name" 
                  required
                  placeholder="Enter song title"
                >
              </div>
              <div class="mb-3">
                <label for="projectArtist" class="form-label">Artist *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="projectArtist"
                  v-model="newProject.artist" 
                  required
                  placeholder="Enter artist name"
                >
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
                <input 
                  type="file" 
                  class="form-control" 
                  id="audioFile"
                  accept="audio/*"
                  @change="handleAudioFile"
                  required
                >
              </div>
              <div class="mb-3">
                <label for="lyrics" class="form-label">Lyrics</label>
                <textarea 
                  class="form-control" 
                  id="lyrics"
                  rows="8"
                  v-model="newProject.lyricsText"
                  placeholder="Paste your lyrics here (one line per verse/chorus line)..."
                ></textarea>
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

    <!-- Project List Modal -->
    <div class="modal" :class="{ show: showProjectList }" v-if="showProjectList" @click="closeProjectList">
      <div class="modal-dialog modal-lg" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Open Karaoke Project</h5>
            <button type="button" class="btn-close" @click="closeProjectList"></button>
          </div>
          <div class="modal-body">
            <div v-if="projects.length === 0" class="text-center text-muted py-4">
              <p>No projects found. Create your first karaoke project!</p>
            </div>
            <div v-else class="list-group">
              <div 
                v-for="project in projects" 
                :key="project.id"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                @click="openProject(project)"
              >
                <div class="ms-2 me-auto">
                  <div class="fw-bold">{{ project.name }}</div>
                  <small class="text-muted">{{ project.artist }} • {{ project.genre }}</small>
                  <br>
                  <small class="text-muted">
                    Updated: {{ formatDate(project.updatedAt) }} • 
                    {{ project.lyrics.length }} lines • 
                    {{ project.isCompleted ? 'Completed' : 'In Progress' }}
                  </small>
                  <br>
                  <small v-if="project.audioFile?.storedData" class="badge"
                    :class="getStorageBadgeClass(project.audioFile.storedData.storageType)">
                    {{ getStorageBadgeText(project.audioFile.storedData.storageType) }}
                  </small>
                </div>
                <span class="badge bg-primary rounded-pill" v-if="project.isCompleted">
                  ✓
                </span>
              </div>
            </div>
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
                  <button class="btn btn-outline-warning btn-sm w-100" @click="clearAudioCache">
                    <i class="bi bi-trash3"></i> Clear Audio Cache
                  </button>
                </div>
              </div>
            </div>
            
            <hr>
            
            <div class="alert alert-info">
              <h6><i class="bi bi-info-circle"></i> Storage Methods Explained:</h6>
              <ul class="mb-0">
                <li><strong>IndexedDB:</strong> Best for 4-5MB+ files - up to ~1GB capacity, persistent storage</li>
                <li><strong>Base64:</strong> Small files only (≤1MB) - fastest loading but limited by browser quota</li>
                <li><strong>Reference:</strong> Fallback method - you'll need to re-select files when loading</li>
              </ul>
              <div class="mt-2 p-2 bg-light rounded">
                <small><strong>💡 IndexedDB is a built-in browser feature:</strong></small><br>
                <small>• No setup required - works automatically</small><br>
                <small>• Available in all modern browsers (Chrome, Firefox, Safari, Edge)</small><br>
                <small>• Perfect for your 4-5MB audio files - no quota issues!</small><br>
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

    <!-- Hotkey Help Modal -->
    <div class="modal" :class="{ show: showHotkeyModal }" v-if="showHotkeyModal" @click="closeHotkeyModal">
      <div class="modal-dialog modal-lg" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">🎹 Hotkey Reference Guide</h5>
            <button type="button" class="btn-close" @click="closeHotkeyModal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6 class="text-primary">⏯️ Playback Controls</h6>
                <ul class="list-unstyled mb-4">
                  <li class="mb-2"><kbd>Spacebar</kbd> - Play/Pause (or Timing in Timing Mode)</li>
                  <li class="mb-2"><kbd>Numpad Enter</kbd> - Play/Pause</li>
                  <li class="mb-2"><kbd>Ctrl+P</kbd> - Play/Pause</li>
                </ul>

                <h6 class="text-success">⏩ Navigation</h6>
                <ul class="list-unstyled mb-4">
                  <li class="mb-2"><kbd>Numpad +</kbd> - Skip forward 1 second</li>
                  <li class="mb-2"><kbd>Numpad -</kbd> - Skip backward 1 second</li>
                  <li class="mb-2"><kbd>Ctrl+R</kbd> - Skip forward 10 seconds</li>
                  <li class="mb-2"><kbd>Ctrl+L</kbd> - Skip backward 10 seconds</li>
                </ul>
              </div>
              <div class="col-md-6">
                <h6 class="text-warning">⏱️ Timing Assignment</h6>
                <ul class="list-unstyled mb-4">
                  <li class="mb-2"><kbd>Spacebar</kbd> - Assign timing (in Timing Mode)</li>
                  <li class="mb-2"><kbd>Numpad 0</kbd> or <kbd>.</kbd> - Assign timing</li>
                  <li class="mb-2"><kbd>Alt+T</kbd> - Toggle Timing Mode</li>
                </ul>

                <h6 class="text-info">📝 Editing</h6>
                <ul class="list-unstyled mb-4">
                  <li class="mb-2"><kbd>Double-click</kbd> any lyric line to edit</li>
                  <li class="mb-2"><kbd>Enter</kbd> or <kbd>Blur</kbd> to save</li>
                  <li class="mb-2"><kbd>Escape</kbd> to cancel</li>
                </ul>
              </div>
            </div>
            
            <div class="alert alert-info mt-3">
              <strong>💡 Pro Tips:</strong>
              <ul class="mb-0 mt-2">
                <li>Use the numpad for fastest timing assignment workflow</li>
                <li>Toggle Timing Mode (<kbd>Alt+T</kbd>) to focus on timing vs playback</li>
                <li>Double-click lyrics for quick inline editing</li>
                <li>Use 1-second skips for precise timing adjustments</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" @click="closeHotkeyModal">Got it!</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Sync Editor -->
    <div v-if="currentProject" class="sync-editor">
      <div class="row">
        <div class="col-12 mb-3">
          <div class="project-info card">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <h4 class="mb-1">{{ currentProject.name }}</h4>
                  <p class="mb-0 text-muted">by {{ currentProject.artist }}</p>
                </div>
                <div class="col-md-4 text-end">
                  <button class="btn btn-success btn-sm me-2" @click="saveProject">
                    <i class="bi bi-save"></i> Save
                  </button>
                  <button class="btn btn-danger btn-sm me-2" @click="closeProject">
                    <i class="bi bi-x-circle"></i> Close
                  </button>
                  <!-- Hotkey Help Button -->
                  <button 
                    class="btn btn-primary btn-sm" 
                    type="button"
                    :title="hotkeyHelpText"
                    @click="showHotkeyHelp"
                  >
                    <i class="bi bi-question-circle"></i> Help
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Editor Layout -->
      <div class="row">
        <!-- Lyrics Editor Column -->
        <div class="col-md-6">
          <LyricsEditor 
            :lyrics="currentProject.lyrics"
            :currentLine="currentLine"
            :currentWord="currentWordIndex"
            :isTimingMode="isTimingMode"
            @line-select="selectLine"
            @lyrics-update="updateLyrics"
          />
        </div>

        <!-- Preview and Controls Column -->
        <div class="col-md-6">
          <div class="row">
            <!-- Lyrics Preview -->
            <div class="col-12 mb-3">
              <LyricsPreview 
                :lyrics="currentProject.lyrics"
                :currentTime="playbackState.currentTime"
                :currentLine="currentLine"
                :currentWord="currentWordIndex"
                :currentSyllable="playbackState.currentSyllable?.syllableIndex"
              />
            </div>
            
            <!-- Timing Assignment Controls -->
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">⏱️ Timing Assignment</h5>
                </div>
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <button 
                      class="btn"
                      :class="isTimingMode ? 'btn-warning' : 'btn-outline-secondary'"
                      @click="toggleTimingMode"
                    >
                      <i class="bi bi-crosshair"></i>
                      {{ isTimingMode ? 'Exit Timing Mode' : 'Enter Timing Mode' }}
                    </button>
                    <button 
                      class="btn btn-success"
                      @click="assignTiming"
                      :disabled="!isTimingMode"
                    >
                      <i class="bi bi-check-circle"></i> Assign Timing
                    </button>
                  </div>
                  
                  <!-- Progress Stats -->
                  <div class="row text-center">
                    <div class="col-4">
                      <div class="stat-item">
                        <div class="stat-number">{{ timingStats.timedLines }}/{{ timingStats.totalLines }}</div>
                        <div class="stat-label text-muted">Lines</div>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="stat-item">
                        <div class="stat-number">{{ timingStats.timedWords }}/{{ timingStats.totalWords }}</div>
                        <div class="stat-label text-muted">Words</div>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="stat-item">
                        <div class="stat-number">{{ timingStats.timedSyllables }}/{{ timingStats.totalSyllables }}</div>
                        <div class="stat-label text-muted">Syllables</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Waveform View -->
      <div class="row mt-4">
        <div class="col-12">
          <WaveformViewer 
            :audioFile="currentProject.audioFile"
            :lyrics="currentProject.lyrics"
            :currentTime="playbackState.currentTime"
            :waveformData="waveformData"
            :playbackState="playbackState"
            :isTimingMode="isTimingMode"
            @seek="seekAudio"
            @lyrics-position="updateLyricsPosition"
            @play-pause="togglePlayPause"
            @skip-backward="skipBackward"
            @skip-forward="skipForward"
          />
        </div>
      </div>
    </div>

    <!-- Welcome Screen -->
    <div v-else class="welcome-screen text-center py-5">
      <div class="card mx-auto" style="max-width: 600px;">
        <div class="card-body p-5">
          <h3>🎼 Ready to Compose?</h3>
          <p class="lead">Create your first karaoke project or open an existing one to start syncing lyrics with audio.</p>
          <div class="d-grid gap-2 d-md-flex justify-content-md-center">
            <button class="btn btn-primary btn-lg" @click="showCreateProject = true">
              Create New Project
            </button>
            <button class="btn btn-outline-secondary btn-lg" @click="showProjectList = true">
              Open Project
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { KaraokeProject, LyricLine, PlaybackState, WaveformData } from '@/types/karaoke'
import { audioService } from '@/services/audioService'
import { audioStorageService } from '@/services/audioStorageService'
import { parseLyricsText, assignWordTiming, getCurrentPosition, getTimingStats } from '@/utils/lyricsParser'
import LyricsEditor from '@/components/LyricsEditor.vue'
import LyricsPreview from '@/components/LyricsPreview.vue'

import WaveformViewer from '@/components/WaveformViewer.vue'

// Reactive state
const showCreateProject = ref(false)
const showProjectList = ref(false)
const showStorageInfo = ref(false)
const showHotkeyModal = ref(false)
const currentProject = ref<KaraokeProject | null>(null)
const projects = ref<KaraokeProject[]>([])
const currentLine = ref(0)
const isTimingMode = ref(false)
const waveformData = ref<WaveformData | null>(null)
// Storage and IndexedDB testing
const indexedDBTestResult = ref<string>('')
const storageInfo = ref<{ method: string; sizeMB: number; count: number; quotaUsedMB: number; quotaLimitMB: number } | null>(null)

// Global hotkeys cleanup
let cleanupGlobalHotkeys: (() => void) | null = null

// New project form
const newProject = ref({
  name: '',
  artist: '',
  genre: '',
  lyricsText: '',
  audioFile: null as File | null
})

// Playback state
const playbackState = ref<PlaybackState>({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isLoaded: false
})

// Computed properties
const canCreateProject = computed(() => {
  return newProject.value.name && 
         newProject.value.artist && 
         newProject.value.audioFile
})

const timingStats = computed(() => {
  if (!currentProject.value) {
    return {
      totalLines: 0,
      timedLines: 0,
      totalWords: 0,
      timedWords: 0,
      totalSyllables: 0,
      timedSyllables: 0,
      completionPercent: 0
    }
  }
  return getTimingStats(currentProject.value.lyrics)
})

const hotkeyHelpText = computed(() => {
  return "Click for complete hotkey reference guide"
})

// Methods
const closeCreateProject = () => {
  showCreateProject.value = false
  resetNewProject()
}

const closeProjectList = () => {
  showProjectList.value = false
}

const closeStorageInfo = () => {
  showStorageInfo.value = false
}

const closeHotkeyModal = () => {
  showHotkeyModal.value = false
}

const openStorageInfo = () => {
  storageInfo.value = audioStorageService.getStorageInfo()
  showStorageInfo.value = true
}

const clearAudioCache = async () => {
  if (confirm('This will remove all cached audio files from storage. Projects will still work but may need to re-select audio files. Continue?')) {
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
  } else {
    message += '❌ IndexedDB is NOT supported by your browser\n'
  }
  
  if (result.canStore) {
    message += '✅ Can store files in IndexedDB\n'
    message += '🎵 Your 4-5MB audio files will work perfectly!'
  } else {
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
    case 'base64': return 'bg-success'
    case 'indexeddb': return 'bg-info'
    case 'reference': return 'bg-warning'
    default: return 'bg-secondary'
  }
}

const getStorageBadgeText = (storageType: string) => {
  switch (storageType) {
    case 'base64': return '📦 Base64'
    case 'indexeddb': return '🗄️ IndexedDB'
    case 'reference': return '📁 Reference'
    default: return 'Unknown'
  }
}

// Show hotkey help in a proper modal dialog
const showHotkeyHelp = () => {
  showHotkeyModal.value = true
}

const resetNewProject = () => {
  newProject.value = {
    name: '',
    artist: '',
    genre: '',
    lyricsText: '',
    audioFile: null
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
    audioFile: newProject.value.audioFile?.name
  })
  
  if (!canCreateProject.value) {
    console.log('Cannot create project - missing requirements')
    return
  }

  // Parse lyrics with syllable support
  const lyrics: LyricLine[] = parseLyricsText(newProject.value.lyricsText)
  
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
      storedData: storedAudioFile
    },
    lyrics,
    timings: [],
    isCompleted: false
  }

  projects.value.push(project)
  currentProject.value = project
  
  try {
    // Load audio file
    await loadProjectAudio(project)
    
    saveProjectsToStorage()
    closeCreateProject()
    console.log('Project created successfully:', project.name)
  } catch (error) {
    console.error('Error creating project:', error)
    alert('Error creating project: ' + error)
  }
}

const openProject = async (project: KaraokeProject) => {
  currentProject.value = project
  await loadProjectAudio(project)
  closeProjectList()
}

const loadProjectAudio = async (project: KaraokeProject) => {
  if (!project.audioFile) {
    console.error('No audio file in project')
    return
  }

  try {
    let audioFile = project.audioFile

    // If we have stored data but no file object, try to retrieve it
    if (!audioFile.file && audioFile.storedData) {
      console.log('Retrieving stored audio file...')
      const retrievedFile = await audioStorageService.retrieveAudioFile(audioFile.storedData)
      
      if (retrievedFile) {
        audioFile = retrievedFile
        // Update the project with the retrieved file
        project.audioFile = audioFile
        console.log('Audio file retrieved successfully')
      } else {
        console.error('Failed to retrieve audio file')
        alert('Could not load the audio file for this project. Please re-select the audio file.')
        return
      }
    }

    const success = await audioService.loadAudioFile(audioFile)
    if (success) {
      const state = audioService.getPlaybackState()
      playbackState.value = { ...state }
      
      // Store the detected duration in the project for future use
      if (!project.audioFile.duration || project.audioFile.duration !== state.duration) {
        console.log('💾 Storing detected audio duration:', state.duration / 1000, 'seconds')
        project.audioFile.duration = state.duration
        project.updatedAt = new Date()
        saveProjectsToStorage() // Save the updated duration
      }
      
      // Generate waveform data if needed
      if (!waveformData.value) {
        const peaks = await audioService.generateWaveformData(1000)
        if (peaks) {
          waveformData.value = {
            peaks,
            sampleRate: 44100,
            duration: state.duration,
            channels: 1
          }
        }
      }
      console.log('Audio loaded successfully')
    } else {
      console.error('Failed to load audio into player')
      alert('Failed to load audio file. Please check the file and try again.')
    }
  } catch (error) {
    console.error('Error loading project audio:', error)
    alert('Error loading audio file: ' + error)
  }
}

const closeProject = () => {
  currentProject.value = null
  currentLine.value = 0
  isTimingMode.value = false
}

const saveProject = () => {
  if (!currentProject.value) return
  
  currentProject.value.updatedAt = new Date()
  saveProjectsToStorage()
  // TODO: Show save confirmation
}

const selectLine = (lineIndex: number) => {
  currentLine.value = lineIndex
}

const updateLyrics = (lyrics: LyricLine[]) => {
  if (currentProject.value) {
    currentProject.value.lyrics = lyrics
  }
}

const togglePlayPause = async () => {
  if (playbackState.value.isPlaying) {
    audioService.pause()
  } else {
    await audioService.play()
  }
}

const seekAudio = (time: number) => {
  audioService.seek(time)
}

const skipBackward = () => {
  const newTime = Math.max(0, playbackState.value.currentTime - 10)
  audioService.seek(newTime)
}

const skipForward = () => {
  const duration = currentProject.value?.audioFile?.duration || 0
  const newTime = Math.min(duration, playbackState.value.currentTime + 10)
  audioService.seek(newTime)
}

// Short skip functions for 1-second precision
const skipBackwardShort = () => {
  const newTime = Math.max(0, playbackState.value.currentTime - 1)
  audioService.seek(newTime)
}

const skipForwardShort = () => {
  const duration = currentProject.value?.audioFile?.duration || 0
  const newTime = Math.min(duration, playbackState.value.currentTime + 1)
  audioService.seek(newTime)
}

const toggleTimingMode = () => {
  isTimingMode.value = !isTimingMode.value
}

// Smart duration calculation helper
const calculateSmartDuration = (currentLineIndex: number, currentWordIndex: number): number => {
  if (!currentProject.value) return 500
  
  const lyrics = currentProject.value.lyrics
  const currentLine = lyrics[currentLineIndex]
  if (!currentLine) return 500
  
  let nextTiming: number | undefined
  
  // Try to find next word timing
  if (currentWordIndex < currentLine.words.length - 1) {
    // Next word in same line
    const nextWord = currentLine.words[currentWordIndex + 1]
    nextTiming = nextWord.startTime
  } else if (currentLineIndex < lyrics.length - 1) {
    // First word of next line
    const nextLine = lyrics[currentLineIndex + 1]
    if (nextLine.words.length > 0) {
      nextTiming = nextLine.words[0].startTime
    }
  }
  
  if (nextTiming) {
    const currentTime = playbackState.value.currentTime
    const timeToNext = (nextTiming / 1000) - currentTime // Convert to seconds
    
    // Determine if this is a phrase/verse break (longer gap)
    const isLongBreak = timeToNext > 3 // More than 3 seconds = phrase break
    
    if (isLongBreak) {
      // 50% of time to next for phrase/verse breaks
      return Math.max(300, timeToNext * 0.5 * 1000) // Min 300ms, max 50% in milliseconds
    } else {
      // 80-85% of time to next for normal word spacing
      return Math.max(200, timeToNext * 0.825 * 1000) // Min 200ms, 82.5% average in milliseconds
    }
  }
  
  // Fallback durations based on word length
  const currentWord = currentLine.words[currentWordIndex]
  if (currentWord) {
    const wordLength = currentWord.word.length
    return Math.max(200, wordLength * 80) // ~80ms per character, min 200ms
  }
  
  return 500 // Default fallback
}

const assignTiming = () => {
  if (!currentProject.value || !isTimingMode.value) return
  
  const lineIndex = currentLine.value
  const wordIndex = currentWordIndex.value
  const currentTime = playbackState.value.currentTime
  
  if (lineIndex < currentProject.value.lyrics.length) {
    // Calculate smart duration
    const smartDuration = calculateSmartDuration(lineIndex, wordIndex)
    
    // Assign timing to current word using spacebar with smart duration
    currentProject.value.lyrics = assignWordTiming(
      currentProject.value.lyrics,
      lineIndex,
      wordIndex,
      currentTime,
      smartDuration
    )
    
    console.log('⏱️ Smart timing assigned:', {
      word: currentProject.value.lyrics[lineIndex].words[wordIndex].word,
      startTime: currentTime,
      duration: smartDuration,
      calculation: smartDuration > 400 ? 'phrase-break' : 'normal-spacing'
    })
    
    // Move to next word/line
    moveToNextWord()
  }
}

// New word navigation
const currentWordIndex = ref(0)

const moveToNextWord = () => {
  if (!currentProject.value) return
  
  const currentLyricLine = currentProject.value.lyrics[currentLine.value]
  if (!currentLyricLine) return
  
  if (currentWordIndex.value < currentLyricLine.words.length - 1) {
    // Move to next word in same line
    currentWordIndex.value++
  } else if (currentLine.value < currentProject.value.lyrics.length - 1) {
    // Move to first word of next line
    currentLine.value++
    currentWordIndex.value = 0
  }
}

const moveToPreviousWord = () => {
  if (!currentProject.value) return
  
  if (currentWordIndex.value > 0) {
    // Move to previous word in same line
    currentWordIndex.value--
  } else if (currentLine.value > 0) {
    // Move to last word of previous line
    currentLine.value--
    const prevLine = currentProject.value.lyrics[currentLine.value]
    currentWordIndex.value = Math.max(0, prevLine.words.length - 1)
  }
}

const updateLyricsPosition = (lineIndex: number, time: number) => {
  if (!currentProject.value) return
  
  const lyric = currentProject.value.lyrics[lineIndex]
  if (lyric) {
    lyric.startTime = time
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
          file: null // File objects can't be serialized, will be restored from storage
        }
      }))
      console.log(`Loaded ${projects.value.length} projects from storage`)
    } catch (error) {
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
        url: undefined // Remove blob URL (will be recreated)
      }
    }))
    
    localStorage.setItem('karaokeProjects', JSON.stringify(serializableProjects))
    console.log(`Saved ${projects.value.length} projects to storage`)
  } catch (error) {
    console.error('Error saving projects:', error)
  }
}

const clearAllProjects = () => {
  if (confirm('Are you sure you want to delete ALL saved projects? This cannot be undone.')) {
    localStorage.removeItem('karaokeProjects')
    projects.value = []
    currentProject.value = null
    currentLine.value = 0
    isTimingMode.value = false
    
    // Stop any playing audio
    audioService.pause()
    
    console.log('All projects cleared from localStorage')
    alert('All projects have been cleared. You can now start fresh!')
  }
}

// Setup audio service listeners
const setupAudioListeners = () => {
  audioService.onTimeUpdate((time) => {
    playbackState.value.currentTime = time
    
    // Update current position based on timing
    if (currentProject.value) {
      const position = getCurrentPosition(currentProject.value.lyrics, time)
      currentLine.value = position.lineIndex
      currentWordIndex.value = position.wordIndex
      
      playbackState.value.currentWord = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex
      }
      
      playbackState.value.currentSyllable = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex,
        syllableIndex: position.syllableIndex
      }
    }
  })
  
  audioService.onPlaybackStateChange((state) => {
    playbackState.value = { ...state }
  })
}

// Lifecycle
// Global hotkey system
const setupGlobalHotkeys = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }
    
    switch (event.code) {
      case 'Space':
        event.preventDefault() // Prevent page scroll
        if (isTimingMode.value) {
          // Spacebar for timing assignment (keydown based)
          assignTiming()
        } else {
          // Spacebar for play/pause
          togglePlayPause()
        }
        break
        
      // Numpad Enter for play/pause
      case 'NumpadEnter':
      case 'Enter':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          togglePlayPause()
        }
        break
        
      // Numpad 0 and . for timing
      case 'Numpad0':
      case 'NumpadDecimal':
        event.preventDefault()
        if (isTimingMode.value) {
          assignTiming()
        }
        break
        
      // Numpad +/- for 1 second forward/backward
      case 'NumpadAdd':
        event.preventDefault()
        skipForwardShort() // 1 second
        break
        
      case 'NumpadSubtract':
        event.preventDefault()
        skipBackwardShort() // 1 second
        break
        
      case 'KeyT':
        if (event.altKey) {
          event.preventDefault()
          toggleTimingMode()
        }
        break
        
      case 'KeyP':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          togglePlayPause()
        }
        break
        
      case 'KeyL':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          skipBackward() // 10 seconds
        }
        break
        
      case 'KeyR':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          skipForward() // 10 seconds
        }
        break
        
      // Keep existing arrow keys as backup
      case 'ArrowLeft':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          skipBackward()
        }
        break
        
      case 'ArrowRight':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          skipForward()
        }
        break
        
      case 'Escape':
        if (showHotkeyModal.value) {
          event.preventDefault()
          closeHotkeyModal()
        } else if (showProjectList.value) {
          event.preventDefault()
          closeProjectList()
        } else if (showCreateProject.value) {
          event.preventDefault()
          closeCreateProject()
        } else if (showStorageInfo.value) {
          event.preventDefault()
          closeStorageInfo()
        }
        break
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

onMounted(async () => {
  loadProjectsFromStorage()
  setupAudioListeners()
  
  // Setup global hotkeys
  const cleanupHotkeys = setupGlobalHotkeys()
  
  // Store cleanup function for onUnmounted  
  cleanupGlobalHotkeys = cleanupHotkeys
  
  // Help button uses simple click handler - no complex tooltip initialization needed
  
  // Wait a moment for IndexedDB to initialize
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Check storage health and IndexedDB status
  const info = audioStorageService.getStorageInfo()
  console.log('🔍 Audio storage service initialized:', info)
  
  // Check IndexedDB availability
  if (window.indexedDB) {
    console.log('✅ IndexedDB is available in this browser')
  } else {
    console.warn('❌ IndexedDB is NOT available in this browser')
  }
  
  if (info.quotaUsedMB > info.quotaLimitMB * 0.9) {
    console.warn('⚠️ Storage quota nearly full:', info.quotaUsedMB, '/', info.quotaLimitMB, 'MB')
  }
  
  // Log storage method being used
  if (info.method === 'indexeddb') {
    console.log('🗄️ Using IndexedDB - perfect for 4-5MB files!')
  } else {
    console.log('📦 Using fallback storage method:', info.method)
  }
})

onUnmounted(() => {
  audioService.dispose()
  
  // Cleanup global hotkeys
  if (cleanupGlobalHotkeys) {
    cleanupGlobalHotkeys()
  }
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

.welcome-screen {
  min-height: 60vh;
  display: flex;
  align-items: center;
}

.sync-editor {
  min-height: 70vh;
}

.list-group-item:hover {
  cursor: pointer;
}
</style>