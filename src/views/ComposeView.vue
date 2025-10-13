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
          <button class="btn btn-outline-secondary me-2" @click="showProjectList = true">
            <i class="bi bi-folder2-open"></i> Open Project
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="clearAllProjects" title="Clear all saved projects">
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
                  <button class="btn btn-outline-primary btn-sm me-2" @click="saveProject">
                    <i class="bi bi-save"></i> Save
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" @click="closeProject">
                    <i class="bi bi-x-circle"></i> Close
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
            
            <!-- Timing Controls -->
            <div class="col-12">
              <TimingControls 
                :playbackState="playbackState"
                :isTimingMode="isTimingMode"
                :currentLine="currentLine"
                :totalLines="timingStats.totalLines"
                :timedLines="timingStats.timedLines"
                :totalWords="timingStats.totalWords"
                :timedWords="timingStats.timedWords"
                :totalSyllables="timingStats.totalSyllables"
                :timedSyllables="timingStats.timedSyllables"
                @play-pause="togglePlayPause"
                @seek="seekAudio"
                @timing-mode="toggleTimingMode"
                @assign-timing="assignTiming"
              />
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
            @seek="seekAudio"
            @lyrics-position="updateLyricsPosition"
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
import { parseLyricsText, assignWordTiming, getCurrentPosition, getTimingStats } from '@/utils/lyricsParser'
import LyricsEditor from '@/components/LyricsEditor.vue'
import LyricsPreview from '@/components/LyricsPreview.vue'
import TimingControls from '@/components/TimingControls.vue'
import WaveformViewer from '@/components/WaveformViewer.vue'

// Reactive state
const showCreateProject = ref(false)
const showProjectList = ref(false)
const currentProject = ref<KaraokeProject | null>(null)
const projects = ref<KaraokeProject[]>([])
const currentLine = ref(0)
const isTimingMode = ref(false)
const waveformData = ref<WaveformData | null>(null)

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

// Methods
const closeCreateProject = () => {
  showCreateProject.value = false
  resetNewProject()
}

const closeProjectList = () => {
  showProjectList.value = false
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

  const project: KaraokeProject = {
    id: `project-${Date.now()}`,
    name: newProject.value.name,
    artist: newProject.value.artist,
    genre: newProject.value.genre || 'Unknown',
    createdAt: new Date(),
    updatedAt: new Date(),
    audioFile: {
      name: newProject.value.audioFile!.name,
      file: newProject.value.audioFile,
      url: URL.createObjectURL(newProject.value.audioFile!)
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
  if (project.audioFile) {
    const success = await audioService.loadAudioFile(project.audioFile)
    if (success) {
      const state = audioService.getPlaybackState()
      playbackState.value = { ...state }
      
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
    }
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

const toggleTimingMode = () => {
  isTimingMode.value = !isTimingMode.value
}

const assignTiming = () => {
  if (!currentProject.value || !isTimingMode.value) return
  
  const lineIndex = currentLine.value
  const wordIndex = currentWordIndex.value
  const currentTime = playbackState.value.currentTime
  
  if (lineIndex < currentProject.value.lyrics.length) {
    // Assign timing to current word using spacebar
    currentProject.value.lyrics = assignWordTiming(
      currentProject.value.lyrics,
      lineIndex,
      wordIndex,
      currentTime,
      500 // 500ms default word duration
    )
    
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
        updatedAt: new Date(p.updatedAt)
      }))
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }
}

const saveProjectsToStorage = () => {
  localStorage.setItem('karaokeProjects', JSON.stringify(projects.value))
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
onMounted(() => {
  loadProjectsFromStorage()
  setupAudioListeners()
})

onUnmounted(() => {
  audioService.dispose()
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