<template>
  <div class="timing-view" tabindex="0" ref="timingViewRef" @click="ensureAudioReady">
    <!-- Slide-in Timing Assignment Panel -->
    <div class="timing-panel-container">
      <div class="timing-panel visible">
        <div class="timing-content">
          <h5><i class="bi bi-stopwatch"></i> Timing Assignment</h5>

          <div class="timing-controls mb-3">
            <button
              class="btn btn-sm w-100 mb-2"
              :class="isTimingMode ? 'btn-warning' : 'btn-outline-light'"
              @click="toggleTimingMode"
            >
              <i class="bi bi-crosshair"></i>
              {{ isTimingMode ? 'Exit Timing Mode' : 'Enter Timing Mode' }}
            </button>
            <button class="btn btn-success btn-sm w-100" @click="assignTiming" :disabled="!isTimingMode">
              <i class="bi bi-check-circle"></i> Assign Timing
            </button>
          </div>

          <!-- Progress Stats -->
          <div class="timing-stats">
            <h6 class="text-light mb-2">Progress</h6>
            <div class="stat-row">
              <span class="stat-label">Lines:</span>
              <span class="stat-value">{{ timingStats.timedLines }}/{{ timingStats.totalLines }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Words:</span>
              <span class="stat-value">{{ timingStats.timedWords }}/{{ timingStats.totalWords }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Syllables:</span>
              <span class="stat-value">{{ timingStats.timedSyllables }}/{{ timingStats.totalSyllables }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Header with project info and navigation -->
    <div class="timing-header bg-light p-3 mb-4">
      <div class="row align-items-center">
        <div class="col-md-8">
          <nav aria-label="breadcrumb" class="mb-2">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <router-link to="/compose" class="text-decoration-none"> <i class="bi bi-arrow-left"></i> Projects </router-link>
              </li>
              <li class="breadcrumb-item active" aria-current="page">Timing Editor</li>
            </ol>
          </nav>
          <h3 class="mb-1">{{ project?.name }}</h3>
          <p class="mb-0 text-muted">by {{ project?.artist }} • {{ project?.genre }}</p>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-success btn-sm me-2" @click="saveProject"><i class="bi bi-save"></i> Save</button>
          <button class="btn btn-primary btn-sm me-2" type="button" :title="hotkeyHelpText" @click="showHotkeyHelp">
            <i class="bi bi-question-circle"></i> Help
          </button>
          <router-link to="/compose" class="btn btn-outline-secondary btn-sm"> <i class="bi bi-x-circle"></i> Close </router-link>
        </div>
      </div>
    </div>

    <!-- Main Timing Editor Layout -->
    <div v-if="project" class="timing-editor">
      <!-- Top Section: Lyrics Editor and Preview -->
      <div class="row mb-4">
        <!-- Lyrics Editor Column -->
        <div class="col-lg-6">
          <LyricsEditor
            :lyrics="project.lyrics"
            :currentLine="currentLine"
            :currentWord="currentWordIndex"
            :isTimingMode="isTimingMode"
            @line-select="selectLine"
            @lyrics-update="updateLyrics"
          />
        </div>

        <!-- Lyrics Preview and Controls Column -->
        <div class="col-lg-6">
          <div class="row">
            <!-- Lyrics Preview -->
            <div class="col-12 mb-3">
              <LyricsPreview
                :lyrics="project.lyrics"
                :currentTime="playbackState.currentTime"
                :currentLine="currentLine"
                :currentWord="currentWordIndex"
                :currentSyllable="playbackState.currentSyllable?.syllableIndex"
              />
            </div>

            <!-- Timing Assignment Controls moved to slide-in panel -->
          </div>
        </div>
      </div>

      <!-- Waveform View - Full Width -->
      <div class="row">
        <div class="col-12">
          <WaveformViewer
            :audioFile="project.audioFile"
            :lyrics="project.lyrics"
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

      <!-- Word Timing Editor -->
      <div class="row mt-3">
        <div class="col-12">
          <WordTimingEditor :words="timingEditorWords" :duration="audioDuration" :view-start="0" :view-end="10" />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="loading-screen text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">Loading project...</p>
    </div>

    <!-- Project Not Found -->
    <div v-else class="error-screen text-center py-5">
      <div class="card mx-auto" style="max-width: 500px">
        <div class="card-body p-5">
          <h3>Project Not Found</h3>
          <p class="lead">The requested project could not be found.</p>
          <router-link to="/compose" class="btn btn-primary"> <i class="bi bi-arrow-left"></i> Back to Projects </router-link>
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
                  <li class="mb-2"><kbd>Home</kbd> - Jump to start (0:00)</li>
                  <li class="mb-2"><kbd>End</kbd> - Jump to end of song</li>
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
                <li>Use <kbd>Home</kbd>/<kbd>End</kbd> for instant navigation to start/end</li>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { KaraokeProject, LyricLine, PlaybackState, WaveformData } from '@/types/karaoke'
import { audioService } from '@/services/audioService'
import { audioStorageService } from '@/services/audioStorageService'
import { assignWordTiming, getCurrentPosition, getTimingStats } from '@/utils/lyricsParser'
import LyricsEditor from '@/components/LyricsEditor.vue'
import LyricsPreview from '@/components/LyricsPreview.vue'
import WaveformViewer from '@/components/WaveformViewer.vue'
import WordTimingEditor from '@/components/WordTimingEditor.vue'

// Router
const route = useRoute()
const router = useRouter()

// Reactive state
const timingViewRef = ref<HTMLElement>()
const project = ref<KaraokeProject | null>(null)
const loading = ref(true)
const showHotkeyModal = ref(false)
const showTimingPanel = ref(false)
const currentLine = ref(0)
const currentWordIndex = ref(0)
const isTimingMode = ref(false)
const waveformData = ref<WaveformData | null>(null)

// Global hotkeys cleanup
let cleanupGlobalHotkeys: (() => void) | null = null

// Playback state
const playbackState = ref<PlaybackState>({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isLoaded: false,
})

// Computed properties
const timingStats = computed(() => {
  if (!project.value) {
    return {
      totalLines: 0,
      timedLines: 0,
      totalWords: 0,
      timedWords: 0,
      totalSyllables: 0,
      timedSyllables: 0,
      completionPercent: 0,
    }
  }
  return getTimingStats(project.value.lyrics)
})

const hotkeyHelpText = computed(() => {
  return 'Click for complete hotkey reference guide'
})

// Computed properties for WordTimingEditor
const timingEditorWords = computed(() => {
  if (!project.value?.lyrics) return []

  const words: { id: string; text: string; startTime: number; endTime: number; syllables?: any[] }[] = []

  project.value.lyrics.forEach((line, lineIndex) => {
    line.words.forEach((word, wordIndex) => {
      words.push({
        id: `line-${lineIndex}-word-${wordIndex}`,
        text: word.word,
        startTime: word.startTime || 0,
        endTime: word.endTime || word.startTime || 0,
        syllables: word.syllables?.map((syllable, syllableIndex) => ({
          text: syllable.syllable,
          startTime: syllable.startTime || 0,
          endTime: syllable.endTime || syllable.startTime || 0,
        })),
      })
    })
  })

  return words
})

const audioDuration = computed(() => {
  return playbackState.value.duration || 60 // Default to 60 seconds if not loaded
})

// Methods
const closeHotkeyModal = () => {
  showHotkeyModal.value = false
}

const showHotkeyHelp = () => {
  showHotkeyModal.value = true
}

const selectLine = (lineIndex: number) => {
  currentLine.value = lineIndex
}

const updateLyrics = (lyrics: LyricLine[]) => {
  if (project.value) {
    project.value.lyrics = lyrics
  }
}

const togglePlayPause = async () => {
  try {
    if (playbackState.value.isPlaying) {
      audioService.pause()
      console.log('Audio paused')
    } else {
      console.log('Attempting to play audio...')
      await audioService.play()
      console.log('Audio play initiated')
    }
  } catch (error) {
    console.error('Failed to toggle play/pause:', error)
    alert('Failed to play audio. The audio context may need to be restarted. Try clicking the play button again.')
  }
}

const seekAudio = (time: number) => {
  audioService.seek(time)
}

const skipBackward = () => {
  const newTime = Math.max(0, playbackState.value.currentTime - 10000) // 10 seconds in ms
  audioService.seek(newTime)
}

const skipForward = () => {
  const duration = project.value?.audioFile?.duration || 0
  if (duration > 0) {
    const newTime = Math.min(duration - 100, playbackState.value.currentTime + 10000) // 10 seconds in ms, stay 100ms from end
    audioService.seek(newTime)
  }
}

const skipBackwardShort = () => {
  const newTime = Math.max(0, playbackState.value.currentTime - 1000) // 1 second in ms
  audioService.seek(newTime)
}

const skipForwardShort = () => {
  const duration = project.value?.audioFile?.duration || 0
  if (duration > 0) {
    const newTime = Math.min(duration - 100, playbackState.value.currentTime + 1000) // 1 second in ms, stay 100ms from end
    audioService.seek(newTime)
  }
}

const seekToStart = () => {
  audioService.seek(0)
}

const seekToEnd = () => {
  const duration = project.value?.audioFile?.duration || 0
  if (duration > 0) {
    const newTime = Math.max(0, duration - 1000)
    audioService.seek(newTime)
  }
}

const toggleTimingMode = () => {
  isTimingMode.value = !isTimingMode.value
}

// Helper function to ensure audio context is ready
const ensureAudioReady = async () => {
  try {
    // This requires a user interaction to work properly
    await audioService.play()
    audioService.pause()
    console.log('Audio context verified as ready')
  } catch (error) {
    console.warn('Audio context may need user interaction:', error)
  }
}

// Smart duration calculation helper
const calculateSmartDuration = (currentLineIndex: number, currentWordIndex: number): number => {
  if (!project.value) return 500

  const lyrics = project.value.lyrics
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
    const timeToNext = nextTiming / 1000 - currentTime // Convert to seconds

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
  if (!project.value || !isTimingMode.value) return

  const lineIndex = currentLine.value
  const wordIndex = currentWordIndex.value
  const currentTime = playbackState.value.currentTime

  if (lineIndex < project.value.lyrics.length) {
    // Calculate smart duration
    const smartDuration = calculateSmartDuration(lineIndex, wordIndex)

    // Assign timing to current word using spacebar with smart duration
    project.value.lyrics = assignWordTiming(project.value.lyrics, lineIndex, wordIndex, currentTime, smartDuration)

    console.log('⏱️ Smart timing assigned:', {
      word: project.value.lyrics[lineIndex].words[wordIndex].word,
      startTime: currentTime,
      duration: smartDuration,
      calculation: smartDuration > 400 ? 'phrase-break' : 'normal-spacing',
    })

    // Move to next word/line
    moveToNextWord()
  }
}

const moveToNextWord = () => {
  if (!project.value) return

  const currentLyricLine = project.value.lyrics[currentLine.value]
  if (!currentLyricLine) return

  if (currentWordIndex.value < currentLyricLine.words.length - 1) {
    // Move to next word in same line
    currentWordIndex.value++
  } else if (currentLine.value < project.value.lyrics.length - 1) {
    // Move to first word of next line
    currentLine.value++
    currentWordIndex.value = 0
  }
}

const updateLyricsPosition = (lineIndex: number, time: number) => {
  if (!project.value) return

  const lyric = project.value.lyrics[lineIndex]
  if (lyric) {
    lyric.startTime = time
  }
}

const saveProject = () => {
  if (!project.value) return

  project.value.updatedAt = new Date()
  saveProjectsToStorage()

  // Show save confirmation
  // TODO: Could add a toast notification here
  console.log('Project saved:', project.value.name)
}

const loadProject = async (projectId: string) => {
  // Load projects from storage
  const stored = localStorage.getItem('karaokeProjects')
  if (!stored) {
    console.warn('No projects found in storage, redirecting to compose page')
    alert('⚠️ No projects found. Redirecting to the compose page.')
    router.push('/compose')
    return
  }

  try {
    const projects = JSON.parse(stored)
    const foundProject = projects.find((p: any) => p.id === projectId)

    if (!foundProject) {
      console.warn(`Project ${projectId} not found, redirecting to compose page`)
      alert('⚠️ Project not found. It may have been deleted. Redirecting to the compose page.')
      router.push('/compose')
      return
    }

    // Restore project structure
    const restoredProject: KaraokeProject = {
      ...foundProject,
      createdAt: new Date(foundProject.createdAt),
      updatedAt: new Date(foundProject.updatedAt),
      audioFile: {
        ...foundProject.audioFile,
        file: null, // Will be restored from storage if needed
      },
    }

    project.value = restoredProject

    // Try to load project audio, redirect if it fails
    const audioLoadSuccess = await loadProjectAudio(restoredProject)
    if (!audioLoadSuccess) {
      console.warn(`Failed to load audio for project ${projectId}, redirecting to compose page`)
      alert(
        '⚠️ Could not load the audio file for this project. Please check if the file still exists or try re-importing it. Redirecting to the compose page.'
      )
      router.push('/compose')
      return
    }

    loading.value = false
  } catch (error) {
    console.error('Error loading project:', error)
    alert(`⚠️ Error loading project: ${error}. Redirecting to the compose page.`)
    router.push('/compose')
  }
}

const loadProjectAudio = async (proj: KaraokeProject): Promise<boolean> => {
  if (!proj.audioFile) {
    console.error('No audio file in project')
    return false
  }

  console.log('🔄 Loading project audio:', {
    projectName: proj.name,
    audioFileName: proj.audioFile.name,
    hasFile: !!proj.audioFile.file,
    hasStoredData: !!proj.audioFile.storedData,
    storageType: proj.audioFile.storedData?.storageType,
    duration: proj.audioFile.duration,
  })

  try {
    let audioFile = proj.audioFile

    // If we have stored data but no file object, try to retrieve it
    if (!audioFile.file && audioFile.storedData) {
      console.log('Retrieving stored audio file...')
      const retrievedFile = await audioStorageService.retrieveAudioFile(audioFile.storedData)

      if (retrievedFile) {
        audioFile = {
          ...audioFile,
          ...retrievedFile,
        }
        proj.audioFile = audioFile
        console.log('✅ Audio file retrieved successfully')
      } else {
        console.error('Failed to retrieve audio file')
        return false
      }
    }

    let success = false
    let retries = 3

    // Retry logic for audio loading
    while (!success && retries > 0) {
      try {
        console.log(`Attempting to load audio (${4 - retries}/3)...`)
        success = await audioService.loadAudioFile(audioFile)

        if (success) {
          const state = audioService.getPlaybackState()
          playbackState.value = { ...state }

          // Store the detected duration in the project for future use
          if (!proj.audioFile.duration || proj.audioFile.duration !== state.duration) {
            console.log('💾 Storing detected audio duration:', state.duration / 1000, 'seconds')
            proj.audioFile.duration = state.duration
            proj.updatedAt = new Date()
            saveProjectsToStorage()
          }

          // Generate waveform data if needed
          if (!waveformData.value) {
            const peaks = await audioService.generateWaveformData(1000)
            if (peaks) {
              waveformData.value = {
                peaks,
                sampleRate: 44100,
                duration: state.duration,
                channels: 1,
              }
            }
          }
          console.log('✅ Audio loaded successfully')
          break
        } else {
          retries--
          if (retries > 0) {
            console.warn(`Audio loading failed, retrying... (${retries} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          }
        }
      } catch (loadError) {
        console.error('Audio loading attempt failed:', loadError)
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (!success) {
      console.error('Failed to load audio after multiple attempts')
      return false
    }

    return true
  } catch (error) {
    console.error('Error loading project audio:', error)
    return false
  }
}

const saveProjectsToStorage = () => {
  if (!project.value) return

  try {
    const stored = localStorage.getItem('karaokeProjects')
    const projects = stored ? JSON.parse(stored) : []

    // Find and update the project
    const projectIndex = projects.findIndex((p: any) => p.id === project.value!.id)
    if (projectIndex !== -1) {
      // Create serializable version
      const serializableProject = {
        ...project.value,
        audioFile: {
          ...project.value.audioFile,
          file: null, // Remove File object
          url: undefined, // Remove blob URL
        },
      }

      projects[projectIndex] = serializableProject
      localStorage.setItem('karaokeProjects', JSON.stringify(projects))
      console.log('💾 Project saved to storage')
    }
  } catch (error) {
    console.error('Error saving project:', error)
  }
}

// Setup audio service listeners
const setupAudioListeners = () => {
  audioService.onTimeUpdate(time => {
    playbackState.value.currentTime = time

    // Update current position based on timing
    if (project.value) {
      const position = getCurrentPosition(project.value.lyrics, time)
      currentLine.value = position.lineIndex
      currentWordIndex.value = position.wordIndex

      playbackState.value.currentWord = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex,
      }

      playbackState.value.currentSyllable = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex,
        syllableIndex: position.syllableIndex,
      }
    }
  })

  audioService.onPlaybackStateChange(state => {
    playbackState.value = { ...state }
  })
}

// Global hotkey system
const setupGlobalHotkeys = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        if (isTimingMode.value) {
          assignTiming()
        } else {
          togglePlayPause()
        }
        break

      case 'NumpadEnter':
      case 'Enter':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          togglePlayPause()
        }
        break

      case 'Numpad0':
      case 'NumpadDecimal':
        event.preventDefault()
        if (isTimingMode.value) {
          assignTiming()
        }
        break

      case 'NumpadAdd':
        event.preventDefault()
        skipForwardShort()
        break

      case 'NumpadSubtract':
        event.preventDefault()
        skipBackwardShort()
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
          skipBackward()
        }
        break

      case 'KeyR':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          skipForward()
        }
        break

      case 'Home':
        event.preventDefault()
        seekToStart()
        break

      case 'End':
        event.preventDefault()
        seekToEnd()
        break

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
        }
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

// Lifecycle
onMounted(async () => {
  const projectId = route.params.projectId as string
  if (projectId) {
    await loadProject(projectId)
  } else {
    loading.value = false
  }

  setupAudioListeners()

  // Setup global hotkeys
  const cleanupHotkeys = setupGlobalHotkeys()
  cleanupGlobalHotkeys = cleanupHotkeys

  // Focus the component so hotkeys work
  setTimeout(() => {
    if (timingViewRef.value) {
      timingViewRef.value.focus()
      console.log('TimingView focused for hotkey support')
    }
  }, 100)
})

onUnmounted(() => {
  // Don't dispose the audio service - it should persist across routes
  // Just pause any playing audio
  audioService.pause()

  // Cleanup global hotkeys
  if (cleanupGlobalHotkeys) {
    cleanupGlobalHotkeys()
  }
})
</script>

<style scoped>
.timing-view {
  outline: none !important;
}

.timing-view:focus,
.timing-view:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.modal.show {
  display: block;
  background-color: rgba(0, 0, 0, 0.5);
}

.timing-header {
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
}

.timing-editor {
  min-height: 80vh;
}

.loading-screen,
.error-screen {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breadcrumb-item a {
  color: #6c757d;
}

.breadcrumb-item a:hover {
  color: #0d6efd;
}

.stat-item {
  padding: 0.5rem;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: bold;
  color: #0d6efd;
}

.stat-label {
  font-size: 0.875rem;
}

/* Slide-in Timing Assignment Panel */
.timing-panel-container {
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 1000;
  transform: translateY(-50%);
}

.timing-panel {
  position: relative;
  width: 280px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border-radius: 8px;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.25);
  color: white;
}

.timing-content {
  padding: 20px;
}

.timing-content h5 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.timing-content h5 i {
  margin-right: 8px;
  color: #ffd700;
}

.timing-controls .btn {
  font-size: 12px;
  font-weight: 600;
}

.timing-stats {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.timing-stats h6 {
  color: #ffd700;
  font-size: 13px;
  font-weight: 600;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  font-size: 12px;
}

.stat-row .stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.stat-value {
  color: #ffd700;
  font-weight: 600;
}
</style>
