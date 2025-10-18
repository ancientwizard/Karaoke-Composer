<template>
  <div class="timing-view" tabindex="0" ref="timingViewRef" @click="ensureAudioReady">
    <!-- Main Layout Container - Full Width -->
    <div class="full-width-layout" v-if="project">
      <div class="flexible-layout">
        <!-- Left Sidebar Column: Help & Timing Controls -->
        <div class="sidebar-column">
          <div class="card h-100">
            <!-- Compact Header -->
            <div class="card-header py-2">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <h6 class="mb-0">{{ project?.name }}</h6>
                  <small class="text-muted">{{ project?.artist }}</small>
                </div>
                <div class="btn-group-vertical btn-group-sm">
                  <button class="btn btn-success btn-sm" @click="saveProject" title="Save project (Ctrl+S)"
                    data-bs-toggle="tooltip">
                    <i class="bi bi-save"></i>
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" @click="exitProject" title="Exit to previous page"
                    data-bs-toggle="tooltip">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Help & Controls Body -->
            <div class="card-body">
              <!-- Timing Controls -->
              <TimingControlsPanel :is-timing-mode="isTimingMode" :timed-words="timingStats.timedWords"
                :total-words="timingStats.totalWords" :song-analysis="songAnalysis" :timing-analysis="timingAnalysis"
                @toggle-timing-mode="toggleTimingMode" @clear-timing="clearCurrentLineTiming"
                @apply-musical-timing="applyMusicalTiming" @reset-syllable-timing="resetSyllableTiming"
                @analyze-timing="analyzeCurrentTiming" @fix-overlaps="fixCurrentOverlaps" />

              <!-- Progress Stats -->
              <ProgressStats :timing-stats="timingStats" />

              <!-- Viewport Info -->
              <ViewportIndicator :viewport-width="viewportWidth" :current-breakpoint="currentBreakpoint" />

              <!-- Help Section -->
              <HotkeyHelp />
            </div>
          </div>
        </div>

        <!-- Right Main Content Column -->
        <div class="main-content-column">
          <!-- Lyrics Editor and Preview Row - Side by Side -->
          <div class="row mb-3">
            <!-- Lyrics Editor - Left Half -->
            <div class="col-6">
              <LyricsEditor :lyrics="project.lyrics" :currentLine="currentLine" :currentWord="currentWordIndex"
                :isTimingMode="isTimingMode" @line-select="selectLine" @lyrics-update="updateLyrics" />
            </div>
            <!-- Lyrics Preview - Right Half -->
            <div class="col-6">
              <LyricsPreview :lyrics="project.lyrics" :currentTime="playbackState.currentTime"
                :currentLine="currentLine" :currentWord="currentWordIndex"
                :currentSyllable="isTimingMode ? 0 : playbackState.currentSyllable?.syllableIndex" />
            </div>
          </div>

          <!-- Waveform View with Word Timing Editor - Full Width -->
          <div class="row mb-3">
            <div class="col-12">
              <WaveformViewer :audioFile="project.audioFile" :lyrics="project.lyrics"
                :currentTime="playbackState.currentTime" :waveformData="waveformData" :playbackState="playbackState"
                :isTimingMode="isTimingMode" @seek="seekAudio" @lyrics-position="updateLyricsPosition"
                @play-pause="togglePlayPause" @skip-backward="skipBackward" @skip-forward="skipForward"
                @view-window-change="handleViewWindowChange">

                <!-- Word Timing Editor in slot above waveform -->
                <template #above-waveform>
                  <WordTimingEditor :key="`timing-editor-${visualRefreshKey}`" :words="timingEditorWords"
                    :duration="audioDuration" :view-start="viewWindowStart" :view-end="viewWindowEnd"
                    :show-debug="false" @update:words="handleTimingEditorWordsUpdate" @select-word="handleWordSelect" />
                </template>
              </WaveformViewer>
            </div>
          </div>

          <!-- Debug info -->
          <div class="row mb-3">
            <div class="col-12">
              <small class=" text-muted">
                🎯 {{ isTimingMode ? 'Timing' : 'Playback' }} Mode: Line {{ currentLine }}
                , Word {{ currentWordIndex + 1 }}
                <span v-if="project.lyrics[currentLine]?.words[currentWordIndex]">
                  ({{ project.lyrics[currentLine].words[currentWordIndex].word }})
                </span>
                <span class="ms-3" :class="isFastMode ? 'text-success fw-bold' : 'text-muted'">
                  🔄 {{ isFastMode ? '12Hz FAST' : '8Hz Normal' }}
                </span>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="full-width-layout">
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Loading project...</p>
      </div>
    </div>

    <!-- Project Not Found -->
    <div v-else class="full-width-layout">
      <div class="d-flex justify-content-center">
        <div class="card" style="max-width: 500px;">
          <div class="card-body p-5 text-center">
            <h3>Project Not Found</h3>
            <p class="lead">The requested project could not be found.</p>
            <router-link to="/compose" class="btn btn-primary">
              <i class="bi bi-arrow-left"></i> Back to Projects
            </router-link>
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
                  <li class="mb-2"><kbd>T</kbd> or <kbd>Insert</kbd> - Toggle Timing Mode</li>
                </ul>

                <h6 class="text-info">📝 Editing</h6>
                <ul class="list-unstyled mb-4">
                  <li class="mb-2"><kbd>Ctrl+S</kbd> - Save project</li>
                  <li class="mb-2"><kbd>Escape</kbd> - Close modal or exit timing mode</li>
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
                <li>Toggle Timing Mode (<kbd>T</kbd> or <kbd>Insert</kbd>) to focus on timing vs playback</li>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { KaraokeProject, LyricLine, PlaybackState, WaveformData } from '@/types/karaoke'
import { audioService } from '@/services/audioService'
import { audioStorageService } from '@/services/audioStorageService'
import { assignWordTiming, getCurrentPosition, getTimingStats, finalizePendingSyllableTiming, clearTimingFromLine } from '@/utils/lyricsParser'
import { applyMusicalTimingToSong, resetSongSyllableTiming, type SongAnalysis } from '@/models/MusicalTimingModel'
import { TIMING, TimingUtils } from '@/models/TimingConstants'
import { useTimingAnalysis, type TimingAnalysisResult } from '@/composables/useTimingAnalysis'
import { RelativeSyllableTiming } from '@/models/RelativeSyllableTiming'
import LyricsEditor from '@/components/LyricsEditor.vue'
import LyricsPreview from '@/components/LyricsPreview.vue'
import WaveformViewer from '@/components/WaveformViewer.vue'
import WordTimingEditor from '@/components/WordTimingEditor.vue'
import TimingControlsPanel from '@/components/TimingControlsPanel.vue'
import ProgressStats from '@/components/ProgressStats.vue'
import HotkeyHelp from '@/components/HotkeyHelp.vue'
import ViewportIndicator from '@/components/ViewportIndicator.vue'

// Router
const route = useRoute()
const router = useRouter()

// Reactive state
const timingViewRef = ref<HTMLElement>()
const project = ref<KaraokeProject | null>(null)
const loading = ref(true)
const showHotkeyModal = ref(false)
const currentLine = ref(0)
const currentWordIndex = ref(0)
const isTimingMode = ref(false)

// Visual refresh counter to force component re-renders after timing fixes
const visualRefreshKey = ref(0)
const waveformData = ref<WaveformData | null>(null)

// Musical timing state
const songAnalysis = ref<SongAnalysis | null>(null)

// Timing analysis state
const { analyzeTimingOverlaps, fixTimingOverlaps } = useTimingAnalysis()
const timingAnalysis = ref<TimingAnalysisResult | null>(null)

// View window state (synchronized with WaveformViewer)
const viewWindowStart = ref(0) // in seconds
const viewWindowEnd = ref(60) // in seconds, default to 60s
const viewWindowMode = ref<'full' | 'window'>('window')

// Viewport tracking
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

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

// Fast refresh mode state
const isFastMode = ref(false)

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

const currentBreakpoint = computed(() => {
  const width = viewportWidth.value
  if (width >= 1400) return 'xxl'
  if (width >= 1200) return 'xl'
  if (width >= 992) return 'lg'
  if (width >= 768) return 'md'
  if (width >= 576) return 'sm'
  return 'xs'
})

// Computed properties for WordTimingEditor
const timingEditorWords = computed(() => {
  if (!project.value?.lyrics) {
    console.log('🔍 timingEditorWords: No project or lyrics')
    return []
  }

  const words: { id: string; text: string; startTime: number; endTime: number; syllables?: any[] }[] = []
  let lyricsLineIndex = 0 // Track lyrics-only line index

  project.value.lyrics.forEach((line) => {

    // console.log(`🔍 Processing line ${originalLineIndex}:`, {
    //   text: line.text,
    //   type: line.type,
    //   isMetadata: isMetadataLine(line),
    //   hasWords: !!line.words,
    //   wordCount: line.words?.length || 0
    // })

    // Skip metadata lines - only process lyrics lines
    if (isMetadataLine(line)) {
      return
    }

    // Only process lines that have words array
    if (!line.words || !Array.isArray(line.words)) {
      return
    }

    line.words.forEach((word, wordIndex) => {
      words.push({
        id: `lyrics-${lyricsLineIndex}-word-${wordIndex}`, // Use lyrics-only line index
        text: word.word,
        startTime: (word.startTime || 0) / 1000, // Convert milliseconds to seconds
        endTime: (word.endTime || word.startTime || 0) / 1000, // Convert milliseconds to seconds
        syllables: word.syllables?.map((syllable) => ({
          text: syllable.syllable,
          startTime: (syllable.startTime || 0) / 1000, // Convert milliseconds to seconds
          endTime: (syllable.endTime || syllable.startTime || 0) / 1000, // Convert milliseconds to seconds
        })),
      })
    })

    lyricsLineIndex++ // Increment only for actual lyrics lines
  })

  // Debug logging disabled - this computed runs frequently during drag operations
  // console.log('🔍 timingEditorWords result:', {
  //   totalLyricsLines: project.value.lyrics.length,
  //   wordsGenerated: words.length,
  //   firstFewWords: words.slice(0, 5).map(w => ({
  //     id: w.id, text: w.text, startTime: w.startTime, endTime: w.endTime
  //   }))
  // })

  return words
})

const audioDuration = computed(() => {
  return playbackState.value.duration || 60 // Default to 60 seconds if not loaded
})

// Methods
const closeHotkeyModal = () => {
  showHotkeyModal.value = false
}

const exitProject = () => {
  // Use browser back navigation to maintain proper history
  // If there's no history (user came directly to this URL), fall back to compose page
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/compose')
  }
}

// Handler for view window changes from WaveformViewer
const handleViewWindowChange = (viewStart: number, viewEnd: number, mode: 'full' | 'window') => {
  viewWindowStart.value = viewStart
  viewWindowEnd.value = viewEnd
  viewWindowMode.value = mode
  // console.log('🔄 View window synchronized:', {
  //   viewStart, viewEnd, mode
  // })
}

// Helper function to check if a line is a metadata line
const isMetadataLine = (line: LyricLine): boolean => {
  return line.type !== undefined && line.type !== 'lyrics'
}

// Helper function to find the next lyric line (skip metadata)
const findNextLyricLine = (startIndex: number): number => {
  if (!project.value) return startIndex

  for (let i = startIndex; i < project.value.lyrics.length; i++) {
    const line = project.value.lyrics[i]
    if (!isMetadataLine(line) && line.words && line.words.length > 0) {
      return i
    }
  }
  return startIndex // Return original if no lyric line found
}

// Helper function to find the previous lyric line (skip metadata)
const findPrevLyricLine = (startIndex: number): number => {
  if (!project.value) return startIndex

  for (let i = startIndex; i >= 0; i--) {
    const line = project.value.lyrics[i]
    if (!isMetadataLine(line) && line.words && line.words.length > 0) {
      return i
    }
  }
  return startIndex // Return original if no lyric line found
}

// Helper function to finalize syllables when we reach the end of a line or song
const finalizeCurrentWordSyllables = () => {
  if (!project.value) return

  const lineIndex = currentLine.value
  const wordIndex = currentWordIndex.value

  if (lineIndex >= 0 && lineIndex < project.value.lyrics.length) {
    const line = project.value.lyrics[lineIndex]
    if (line && line.words && wordIndex >= 0 && wordIndex < line.words.length) {
      const word = line.words[wordIndex]
      // Only finalize if the word has timing assigned and syllables that need timing
      if (word.startTime !== undefined && word.syllables && word.syllables.length > 0) {
        // Check if syllables need timing (have undefined or 0 timing)
        const needsTiming = word.syllables.some(s => s.startTime === undefined || s.endTime === undefined)
        if (needsTiming) {
          project.value.lyrics = finalizePendingSyllableTiming(project.value.lyrics, lineIndex, wordIndex)
          console.log('🔄 Finalized syllables for current word:', word.word)
        }
      }
    }
  }
}

const selectLine = (lineIndex: number) => {
  if (!project.value || lineIndex >= project.value.lyrics.length) {
    currentLine.value = lineIndex
    return
  }

  const selectedLine = project.value.lyrics[lineIndex]

  // If selecting a metadata line, find the nearest lyric line
  if (isMetadataLine(selectedLine)) {
    // Try to find the next lyric line first, then previous
    let nextLyricIndex = findNextLyricLine(lineIndex + 1)
    if (nextLyricIndex === lineIndex + 1 && nextLyricIndex >= project.value.lyrics.length) {
      nextLyricIndex = findPrevLyricLine(lineIndex - 1)
    }
    currentLine.value = nextLyricIndex
    return
  }

  // Handle regular lyric lines with smart timing behavior
  if (selectedLine.startTime !== undefined && selectedLine.words && selectedLine.words.length > 0) {
    // Case A: Line has timing - focus first word and seek to start time minus word duration as lead-in
    currentLine.value = lineIndex
    currentWordIndex.value = 0

    // Calculate lead-in time: subtract first word's duration from line start time
    const firstWord = selectedLine.words[0]
    const wordDuration = firstWord.endTime && firstWord.startTime
      ? firstWord.endTime - firstWord.startTime
      : 500 // Default 500ms if no word timing

    const leadInTime = Math.max(0, selectedLine.startTime - wordDuration)

    console.log(`📍 Smart line selection: Line ${lineIndex + 1} with timing at ${selectedLine.startTime}ms, seeking to lead-in at ${leadInTime}ms`)
    audioService.seek(leadInTime)

  } else {
    // Case B: Line has no timing - find previous timed line, seek there, select next line and focus first word
    let previousTimedLineIndex = lineIndex - 1
    let previousTimedLine = null

    // Find the closest previous line with timing
    while (previousTimedLineIndex >= 0) {
      const line = project.value.lyrics[previousTimedLineIndex]
      if (!isMetadataLine(line) && line.startTime !== undefined) {
        previousTimedLine = line
        break
      }
      previousTimedLineIndex--
    }

    if (previousTimedLine && previousTimedLine.startTime !== undefined) {
      // Seek to the previous timed line's start time
      console.log(`📍 Smart line selection: Line ${lineIndex + 1} without timing, seeking to previous timed line at ${previousTimedLine.startTime}ms`)
      audioService.seek(previousTimedLine.startTime)

      // Select the line that follows the previous timed line (could be the original selection or the line after the timed line)
      const nextLineIndex = previousTimedLineIndex + 1
      if (nextLineIndex < project.value.lyrics.length && !isMetadataLine(project.value.lyrics[nextLineIndex])) {
        currentLine.value = nextLineIndex
        currentWordIndex.value = 0
        console.log(`📍 Auto-selected next line ${nextLineIndex + 1} for timing continuation`)
      } else {
        // Fallback to original selection
        currentLine.value = lineIndex
        currentWordIndex.value = 0
      }
    } else {
      // No previous timed line found, just select normally
      currentLine.value = lineIndex
      currentWordIndex.value = 0
      console.log(`📍 Line ${lineIndex + 1} selected without timing, no previous timed line found`)
    }
  }
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
  // Reset to first lyric line when seeking to start
  currentLine.value = findNextLyricLine(0)
  currentWordIndex.value = 0
}

const seekToEnd = () => {
  const duration = project.value?.audioFile?.duration || 0
  if (duration > 0) {
    // Seek to actual end, minus just 10ms to avoid potential audio edge issues
    const newTime = Math.max(0, duration - 10)
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

// Clear timing for current line and all subsequent lines
const clearCurrentLineTiming = () => {
  if (!project.value) return

  const lineIndex = currentLine.value
  const lineCount = project.value.lyrics.length - lineIndex
  const message = lineCount === 1
    ? 'Clear timing for the current line?'
    : `Clear timing for the current line and ${lineCount - 1} lines after it?\n\nThis prevents timing inconsistencies by clearing all subsequent timing.`

  if (confirm(message)) {
    project.value.lyrics = clearTimingFromLine(project.value.lyrics, lineIndex)
    console.log(`🗑️ Cleared timing from line ${lineIndex} onwards (${lineCount} lines affected)`)
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
  } else {
    // Find the next lyric line (skip metadata)
    let nextLineIndex = currentLineIndex + 1
    while (nextLineIndex < lyrics.length) {
      const nextLine = lyrics[nextLineIndex]
      if (!isMetadataLine(nextLine) && nextLine.words.length > 0) {
        nextTiming = nextLine.words[0].startTime
        break
      }
      nextLineIndex++
    }
  }

  if (nextTiming) {
    const currentTime = playbackState.value.currentTime
    const timeToNext = nextTiming / 1000 - currentTime // Convert to seconds

    // Use centralized timing rules for auto-timing behavior
    const isLongBreak = TimingUtils.isPhraseBreak(timeToNext)

    if (isLongBreak) {
      // Use centralized phrase break spacing rules
      const duration = timeToNext * TIMING.autoTiming.phraseBreakSpacing * 1000
      return Math.max(TIMING.word.minDuration, Math.min(TIMING.autoTiming.maxPhraseBreakDuration, duration))
    } else {
      // Use centralized normal word spacing rules
      const duration = timeToNext * TIMING.autoTiming.normalWordSpacing * 1000
      return Math.max(TIMING.word.minDuration, Math.min(TIMING.autoTiming.maxNormalDuration, duration))
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
  console.log('🎯 assignTiming called', {
    hasProject: !!project.value,
    isTimingMode: isTimingMode.value,
    isPlaying: playbackState.value.isPlaying,
    currentLine: currentLine.value,
    currentWord: currentWordIndex.value,
    currentTime: playbackState.value.currentTime
  })

  if (!project.value || !isTimingMode.value) {
    console.log('❌ assignTiming aborted: missing project or not in timing mode')
    return
  }

  if (!playbackState.value.isPlaying) {
    console.log('❌ assignTiming aborted: audio not playing')
    return
  }

  const lineIndex = currentLine.value
  const wordIndex = currentWordIndex.value
  const currentTime = playbackState.value.currentTime

  if (lineIndex >= project.value.lyrics.length) {
    console.log('❌ assignTiming aborted: invalid line index')
    return
  }

  const targetLine = project.value.lyrics[lineIndex]
  if (!targetLine || !targetLine.words || wordIndex >= targetLine.words.length) {
    console.log('❌ assignTiming aborted: invalid word index')
    return
  }

  // Calculate smart duration
  const smartDuration = calculateSmartDuration(lineIndex, wordIndex)

  // Assign timing to current word using spacebar with smart duration
  project.value.lyrics = assignWordTiming(project.value.lyrics, lineIndex, wordIndex, currentTime, smartDuration)

  console.log('✅ Smart timing assigned:', {
    word: project.value.lyrics[lineIndex].words[wordIndex].word,
    startTime: currentTime,
    duration: smartDuration,
    calculation: smartDuration > 400 ? 'phrase-break' : 'normal-spacing',
  })

  // Move to next word/line
  moveToNextWord()
}

const moveToNextWord = () => {
  if (!project.value) return

  const currentLyricLine = project.value.lyrics[currentLine.value]
  if (!currentLyricLine) return

  // Store current position before moving
  const prevLineIndex = currentLine.value
  const prevWordIndex = currentWordIndex.value

  if (currentWordIndex.value < currentLyricLine.words.length - 1) {
    // Move to next word in same line
    currentWordIndex.value++
  } else {
    // Find the next line that has words (skip metadata lines)
    let nextLineIndex = currentLine.value + 1
    while (nextLineIndex < project.value.lyrics.length) {
      const nextLine = project.value.lyrics[nextLineIndex]
      // Skip metadata lines (they have no words for timing)
      if (nextLine.words && nextLine.words.length > 0) {
        currentLine.value = nextLineIndex
        currentWordIndex.value = 0
        break
      }
      nextLineIndex++
    }
  }

  // Now that we know the next word position, finalize syllable timing for the previous word
  const actuallyMoved = (currentLine.value !== prevLineIndex || currentWordIndex.value !== prevWordIndex)
  if (actuallyMoved && project.value) {
    // We moved to a new position, so finalize the previous word's syllables
    project.value.lyrics = finalizePendingSyllableTiming(project.value.lyrics, prevLineIndex, prevWordIndex)
  } else if (!actuallyMoved && project.value) {
    // We didn't move (reached the end), so finalize the current word's syllables
    const currentWord = project.value.lyrics[prevLineIndex]?.words?.[prevWordIndex]
    if (currentWord && currentWord.startTime !== undefined && currentWord.syllables && currentWord.syllables.length > 0) {
      project.value.lyrics = finalizePendingSyllableTiming(project.value.lyrics, prevLineIndex, prevWordIndex)
      console.log('🏁 Finalized syllables for final word:', currentWord.word)
    }
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

    // Initialize currentLine to the first lyric line (skip metadata lines)
    currentLine.value = findNextLyricLine(0)
    currentWordIndex.value = 0

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
  let lastTime = 0

  audioService.onTimeUpdate(time => {
    playbackState.value.currentTime = time

    // Detect reset to beginning (time jumped from high to low)
    if (lastTime > 5000 && time < 1000) {
      // Audio was reset to beginning, reset lyrics position too
      currentLine.value = findNextLyricLine(0)
      currentWordIndex.value = 0
      console.log('🔄 Audio reset detected, resetting to first lyric line')
    }
    lastTime = time

    // Update current position based on timing - but NOT when in timing mode
    // In timing mode, we want manual word-by-word control, not automatic syllable tracking
    if (project.value && playbackState.value.isPlaying && !isTimingMode.value) {
      const position = getCurrentPosition(project.value.lyrics, time)

      // Only update if the position returned is actually a lyric line (not metadata)
      const targetLine = project.value.lyrics[position.lineIndex]
      if (targetLine && !isMetadataLine(targetLine)) {
        currentLine.value = position.lineIndex
        currentWordIndex.value = position.wordIndex
      }

      playbackState.value.currentWord = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex,
      }

      playbackState.value.currentSyllable = {
        lineIndex: position.lineIndex,
        wordIndex: position.wordIndex,
        syllableIndex: position.syllableIndex,
      }
    } else if (project.value && playbackState.value.isPlaying && isTimingMode.value) {
      // In timing mode, only update the playback state for preview purposes
      // but don't interfere with manual currentLine/currentWord navigation
      const position = getCurrentPosition(project.value.lyrics, time)

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
          if (playbackState.value.isPlaying) {
            // Only assign timing when audio is actually playing
            assignTiming()
          } else {
            // Start playback if not playing
            togglePlayPause()
          }
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
        event.preventDefault()
        toggleTimingMode()
        break

      case 'Insert':
        event.preventDefault()
        toggleTimingMode()
        break

      case 'KeyP':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          togglePlayPause()
        }
        break

      case 'KeyS':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          saveProject()
        }
        break

      // Removed Ctrl+Q due to Firefox browser conflict - use Escape instead

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

      case 'KeyF':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          // Toggle fast refresh mode for smoother syllable boundary movement
          audioService.toggleFastMode()
          isFastMode.value = audioService.getFastMode()
          console.log('🔄 Toggled fast refresh mode')
        }
        break

      case 'Escape':
        event.preventDefault()
        if (showHotkeyModal.value) {
          closeHotkeyModal()
        } else if (isTimingMode.value) {
          // Finalize any pending syllables before exiting timing mode
          finalizeCurrentWordSyllables()
          // Exit timing mode
          isTimingMode.value = false
        }
        // Removed page exit on Escape - too easy to lose work accidentally
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

// Musical Timing Methods
const applyMusicalTiming = () => {
  if (!project.value?.lyrics) {
    console.log('❌ Musical timing: No project or lyrics available')
    return
  }

  console.log('🎵 Applying musical timing to song...')

  try {
    // Apply musical timing to the entire song (modifies lyrics in-place)
    const analysis = applyMusicalTimingToSong(project.value.lyrics)

    // Update songAnalysis with the returned analysis
    songAnalysis.value = analysis

    console.log('✅ Musical timing applied successfully', analysis)

  } catch (error) {
    console.error('❌ Error applying musical timing:', error)
  }
}

const resetSyllableTiming = () => {
  if (!project.value?.lyrics) {
    console.log('❌ Reset timing: No project or lyrics available')
    return
  }

  console.log('🔄 Resetting all syllable timing...')

  try {
    // Reset all syllable timing in the song
    resetSongSyllableTiming(project.value.lyrics)

    // Clear song analysis
    songAnalysis.value = null

    console.log('✅ Syllable timing reset successfully')

  } catch (error) {
    console.error('❌ Error resetting syllable timing:', error)
  }
}

// Timing Analysis Methods
const analyzeCurrentTiming = () => {
  if (!project.value?.lyrics) {
    console.log('❌ Timing analysis: No project or lyrics available')
    return
  }

  console.log('🔍 Analyzing timing overlaps...')

  try {
    const result = analyzeTimingOverlaps(project.value.lyrics)
    timingAnalysis.value = result

    console.log('✅ Timing analysis completed:', result.summary)

    if (result.overlaps.length > 0) {
      console.warn(`Found ${result.overlaps.length} timing overlaps:`)
      result.overlaps.forEach((overlap, index) => {
        console.warn(`  ${index + 1}. "${overlap.word1.word}" → "${overlap.word2.word}" (${overlap.overlapDuration}ms overlap)`)
      })
    }

  } catch (error) {
    console.error('❌ Error analyzing timing:', error)
  }
}

const fixCurrentOverlaps = async () => {
  if (!project.value?.lyrics) {
    console.log('❌ Fix overlaps: No project or lyrics available')
    return
  }

  console.log('🔧 Fixing timing overlaps...')

  try {
    const result = fixTimingOverlaps(project.value.lyrics)

    if (result.fixCount > 0) {
      console.log(`✅ Fixed ${result.fixCount} timing overlaps:`)
      result.details.forEach(detail => console.log(`  • ${detail}`))

      // Save the project after fixing
      await saveProject()

      // Force visual refresh by incrementing the component key
      visualRefreshKey.value++

      // Wait for the component to re-render
      await nextTick()

      // Re-analyze to update the UI
      analyzeCurrentTiming()

      console.log('🔄 Visual refresh triggered after timing fix')
    } else {
      console.log('✅ No overlaps to fix!')
    }

  } catch (error) {
    console.error('❌ Error fixing timing overlaps:', error)
  }
}

// WordTimingEditor event handlers
const handleTimingEditorWordsUpdate = (updatedWords: any[]) => {
  // console.log('🔄 WordTimingEditor words updated:', updatedWords.length)

  if (!project.value?.lyrics) {
    console.error('❌ No project lyrics to update')
    return
  }

  // Map the updated words back to the lyrics data
  // We need to handle the metadata offset here
  const lyricsOnlyLines = project.value.lyrics.filter(line => !isMetadataLine(line))

  updatedWords.forEach((updatedWord) => {
    // Parse the word ID to get line and word indices
    const match = updatedWord.id.match(/lyrics-(\d+)-word-(\d+)/)
    if (match) {
      const lyricsLineIndex = parseInt(match[1])
      const wordIndex = parseInt(match[2])

      if (lyricsLineIndex < lyricsOnlyLines.length) {
        const lyricsLine = lyricsOnlyLines[lyricsLineIndex]
        if (wordIndex < lyricsLine.words.length) {
          const originalWord = lyricsLine.words[wordIndex]

          // Store old values for smart syllable handling
          const oldStartTime = originalWord.startTime || 0
          const oldEndTime = originalWord.endTime || 0
          const newStartTime = Math.round(updatedWord.startTime * 1000)
          const newEndTime = Math.round(updatedWord.endTime * 1000)

          // console.log(`🔧 Word update: "${originalWord.word}" from ${oldStartTime}ms-${oldEndTime}ms to ${newStartTime}ms-${newEndTime}ms`)

          // Check if syllables have actually changed (s-break drag)
          let syllablesChanged = false
          if (updatedWord.syllables && originalWord.syllables &&
            updatedWord.syllables.length === originalWord.syllables.length) {
            // Compare syllable boundaries to detect s-break changes
            syllablesChanged = updatedWord.syllables.some((syl: any, idx: number) => {
              const origSyl = originalWord.syllables[idx]
              const newSylStart = Math.round(syl.startTime * 1000)
              const newSylEnd = Math.round(syl.endTime * 1000)
              return Math.abs(newSylStart - (origSyl.startTime || 0)) > 1 ||
                Math.abs(newSylEnd - (origSyl.endTime || 0)) > 1
            })
          }

          // If syllables changed (s-break drag), use them directly
          if (syllablesChanged && updatedWord.syllables) {
            // Direct syllable update (s-break drag) - convert seconds to milliseconds
            originalWord.syllables = updatedWord.syllables.map((syl: any) => ({
              syllable: syl.text,
              startTime: Math.round(syl.startTime * 1000),
              endTime: Math.round(syl.endTime * 1000)
            }))
            originalWord.startTime = newStartTime
            originalWord.endTime = newEndTime
            originalWord.duration = newEndTime - newStartTime
            // console.log(`  → Direct syllable update from s-break drag`)
          }

          // Use RelativeSyllableTiming model for word-level timing changes (move/resize)
          else if (originalWord.syllables && originalWord.syllables.length > 0) {
            try {
              // console.log(`🔍 Debug syllable data for "${originalWord.word}":`, originalWord.syllables)

              // Create absolute syllables for conversion
              const absoluteSyllables = originalWord.syllables.map(syl => ({
                text: syl.syllable || '',
                startTime: syl.startTime || 0,
                endTime: syl.endTime || 0
              }))

              // Debug the absolute syllables data before conversion
              // console.log(`🔍 Converting "${originalWord.word}" syllables:`, absoluteSyllables.map(s => `"${s.text}": ${s.startTime}-${s.endTime} (${s.endTime - s.startTime}ms)`))

              // Create RelativeSyllableTiming instance from current word data
              const timing = RelativeSyllableTiming.fromAbsoluteSyllables(
                `word-${lyricsLineIndex}-${wordIndex}`,
                originalWord.word,
                oldStartTime,
                oldEndTime,
                absoluteSyllables
              )

              let updatedTiming: RelativeSyllableTiming

              // Determine the type of change and apply appropriate operation
              const startTimeChanged = Math.abs(newStartTime - oldStartTime) > 10
              const endTimeChanged = Math.abs(newEndTime - oldEndTime) > 10

              if (startTimeChanged && !endTimeChanged) {
                // Moving word: use moveWord method to shift all syllables
                updatedTiming = timing.moveWord(newStartTime)

                // Apply the timing changes
                const updatedWordData = updatedTiming.getWordData()
                const updatedAbsoluteSyllables = updatedTiming.getAbsoluteSyllables()
                originalWord.startTime = updatedWordData.startTime
                originalWord.endTime = updatedWordData.endTime
                originalWord.duration = originalWord.endTime - originalWord.startTime
                originalWord.syllables = updatedAbsoluteSyllables.map(syl => ({
                  syllable: syl.text,
                  startTime: syl.startTime,
                  endTime: syl.endTime,
                  duration: syl.endTime - syl.startTime
                }))
                // console.log(`  → MOVE: "${originalWord.word}" moved to ${newStartTime}ms`)

              } else if (endTimeChanged && !startTimeChanged) {
                // Resizing word end: DON'T redistribute syllables, just update word boundary
                // Keep syllables at their absolute positions (like test rig)
                originalWord.endTime = newEndTime
                originalWord.duration = newEndTime - (originalWord.startTime || 0)
                // console.log(`  → RESIZE: "${originalWord.word}" end changed, syllables unchanged`)

              } else if (startTimeChanged && endTimeChanged) {
                // Both changed: move word (shifts syllables), then update end time
                updatedTiming = timing.moveWord(newStartTime)

                // Apply move, then adjust end time without redistributing syllables
                const updatedAbsoluteSyllables = updatedTiming.getAbsoluteSyllables()
                originalWord.startTime = newStartTime
                originalWord.endTime = newEndTime
                originalWord.duration = newEndTime - newStartTime
                originalWord.syllables = updatedAbsoluteSyllables.map(syl => ({
                  syllable: syl.text,
                  startTime: syl.startTime,
                  endTime: syl.endTime,
                  duration: syl.endTime - syl.startTime
                }))
                // console.log(`  → MOVE & RESIZE: "${originalWord.word}" moved, syllables shifted, end changed`)

              } else {
                // No significant change - no updates needed
              }

              // console.log(`✅ Updated "${originalWord.word}" using RelativeSyllableTiming model`)

            } catch (error) {
              console.error(`❌ Error using RelativeSyllableTiming for "${originalWord.word}":`, error)

              // Fallback: simple update without syllable model
              originalWord.startTime = newStartTime
              originalWord.endTime = newEndTime
              originalWord.duration = originalWord.endTime - originalWord.startTime
              // console.log(`  → Fallback: Basic timing update only`)
            }
          } else {
            // No syllables: simple timing update
            originalWord.startTime = newStartTime
            originalWord.endTime = newEndTime
            originalWord.duration = originalWord.endTime - originalWord.startTime
            // console.log(`  → Simple timing update (no syllables)`)
          }
        }
      }
    }
  })

  // No auto-save: User controls when to save with Ctrl+S
  // (Removed auto-save to prevent unwanted saves during experimentation)
}

const handleWordSelect = (wordId: string | null) => {
  console.log('🎯 Word selected:', wordId)
  // Could be used for highlighting or focus management in the future
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

  // Setup viewport tracking
  const updateViewportSize = () => {
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
  }

  window.addEventListener('resize', updateViewportSize)

  // Store the cleanup function
  const originalCleanup = cleanupGlobalHotkeys
  cleanupGlobalHotkeys = () => {
    if (originalCleanup) originalCleanup()
    window.removeEventListener('resize', updateViewportSize)
  }
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

/* Full-width layout without container constraints */
.full-width-layout {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  padding: 1rem 2rem;
  min-height: 100vh;
}

/* Flexible layout that adapts to viewport */
.flexible-layout {
  display: flex;
  gap: 1.5rem;
  min-height: 80vh;
  max-width: none;
  /* Remove any max-width constraints */
}

.sidebar-column {
  flex: 0 0 320px;
  /* Fixed width sidebar that doesn't shrink */
  min-width: 280px;
  max-width: 400px;
}

.main-content-column {
  flex: 1;
  /* Takes all remaining space */
  min-width: 0;
  /* Allows content to shrink */
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .sidebar-column {
    flex: 0 0 280px;
    max-width: 320px;
  }
}

@media (max-width: 768px) {
  .flexible-layout {
    flex-direction: column;
  }

  .sidebar-column {
    flex: none;
    width: 100%;
    max-width: none;
  }
}

/* Compact sidebar layout */
.card-header h6 {
  font-size: 0.9rem;
  font-weight: 600;
}

.card-header small {
  font-size: 0.75rem;
}

.btn-group-vertical .btn {
  border-radius: 0.25rem !important;
  margin-bottom: 0.25rem;
}

.btn-group-vertical .btn:last-child {
  margin-bottom: 0;
}

/* Hotkey help formatting */
</style>
