<template>
  <div class="test-timing-page">
    <!-- Header -->
    <div class="header bg-light p-3 mb-4">
      <div class="container">
        <div class="row align-items-center">
          <div class="col">
            <nav aria-label="breadcrumb" class="mb-2">
              <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">
                  <router-link to="/compose" class="text-decoration-none">
                    <i class="bi bi-arrow-left"></i> Back to Projects
                  </router-link>
                </li>
                <li class="breadcrumb-item active">Word Timing Test</li>
              </ol>
            </nav>
            <h2 class="mb-1">Word Timing Editor Test</h2>
            <p class="mb-0 text-muted">Testing drag & drop word timing with "November" lyrics</p>
          </div>
          <div class="col-auto">
            <button class="btn btn-primary btn-sm me-2" @click="resetTiming"><i class="bi bi-arrow-clockwise"></i>
              Reset</button>
            <button class="btn btn-info btn-sm" @click="showDebugInfo = !showDebugInfo"><i class="bi bi-bug"></i>
              Debug</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <!-- Slide-in Help Panel -->
    <div class="help-panel-container">
      <div class="help-panel" :class="{ visible: showHelp }" @mouseenter="showHelp = true"
        @mouseleave="showHelp = false">
        <div class="help-tab">
          <i class="bi bi-question-circle"></i>
          <span>Help</span>
        </div>
        <div class="help-content">
          <h5><i class="bi bi-info-circle"></i> Word Timing Editor</h5>
          <ul class="help-list">
            <li><strong>Select:</strong> Click on any word box to select it</li>
            <li><strong>Move:</strong> Drag a word box left/right to change its start time</li>
            <li><strong>Resize:</strong> Drag the green handle on the right edge to change duration</li>
            <li><strong>Syllables:</strong> Drag orange dividers within multi-syllable words</li>
            <li><strong>View:</strong> Adjust the view window controls above to zoom in/out</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container">
      <!-- Word Timing Editor -->
      <div class="timing-editor-section mb-4">
        <h4>Word Timing Editor</h4>
        <WordTimingEditor :words="words" :duration="duration" :view-start="viewStart" :view-end="viewEnd"
          :show-debug="showDebug" :show-background="true" :show-border="true" @update:words="handleWordsUpdate"
          @select-word="handleWordSelect" />
      </div>

      <!-- Controls -->
      <div class="controls-section mb-4">
        <div class="row">
          <div class="col-md-4">
            <label class="form-label">View Window (seconds)</label>
            <div class="row">
              <div class="col">
                <input v-model.number="viewStartInput" type="number" class="form-control form-control-sm" min="0"
                  :max="duration" step="0.5" placeholder="Start" />
              </div>
              <div class="col">
                <input v-model.number="viewDurationInput" type="number" class="form-control form-control-sm" min="0.1"
                  :max="duration - viewStart" step="0.5" placeholder="Duration" />
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Selected Word</label>
            <div class="form-control form-control-sm bg-light">
              {{
                selectedWord
                  ? `"${selectedWord.text}" (${selectedWord.startTime.toFixed(1)}s - ${selectedWord.endTime.toFixed(1)}s)`
                  : 'None'
              }}
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Total Duration</label>
            <div class="form-control form-control-sm bg-light">
              {{ duration.toFixed(1) }} seconds ({{ Math.floor(duration / 60) }}:{{
                Math.floor(duration % 60)
                  .toString()
                  .padStart(2, '0')
              }})
            </div>
          </div>
        </div>
      </div>

      <!-- Lyrics Display -->
      <div class="lyrics-section mb-4">
        <h5>Current Lyrics with Timing</h5>
        <div class="lyrics-display p-3 border rounded bg-light">
          <div v-for="(line, lineIndex) in lyricsLines" :key="lineIndex" class="lyrics-line mb-2">
            <span v-for="word in line" :key="word.id" class="lyrics-word me-1"
              :class="{ 'selected-word': selectedWordId === word.id }" @click="handleWordSelected(word.id)">
              {{ word.text }}
              <small class="text-muted">({{ word.startTime.toFixed(1) }}s)</small>
            </span>
          </div>
        </div>
      </div>

      <!-- Debug Info -->
      <div v-if="showDebugInfo" class="debug-section">
        <h5>Debug Information</h5>
        <div class="row">
          <div class="col-md-6">
            <h6>Words in View ({{ visibleWords.length }})</h6>
            <div class="debug-box">
              <div v-for="word in visibleWords" :key="word.id" class="debug-word mb-1">
                <strong>{{ word.text }}</strong>: {{ word.startTime.toFixed(2) }}s - {{ word.endTime.toFixed(2) }}s
                <span v-if="word.syllables.length > 1" class="text-muted"> ({{ word.syllables.length }} syllables)
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <h6>Selected Word Details</h6>
            <div class="debug-box">
              <pre v-if="selectedWord">{{ JSON.stringify(selectedWord, null, 2) }}</pre>
              <div v-else class="text-muted">No word selected</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Close container -->
  </div>
  <!-- Close test-timing-page -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import WordTimingEditor from '@/components/WordTimingEditor.vue'
import { parseNovemberLyrics, getTestDuration, type TimedWord } from '@/utils/novemberLyrics'

// Reactive state
const words = ref<TimedWord[]>([])
const duration = ref(60)
const viewStartInput = ref(0)
const viewDurationInput = ref(3)
const selectedWordId = ref<string | null>(null)
const showDebugInfo = ref(false)
const showHelp = ref(false)
const showDebug = computed(() => showDebugInfo.value)

// Computed properties for safe input handling
const viewStart = computed(() => {
  const value = Number(viewStartInput.value)
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, duration.value))
})

const viewDuration = computed(() => {
  const value = Number(viewDurationInput.value)
  return isNaN(value) ? 3 : Math.max(0.1, Math.min(value, duration.value - viewStart.value))
})

const viewEnd = computed(() => {
  return viewStart.value + viewDuration.value
})

// Computed properties
const selectedWord = computed(() => {
  return selectedWordId.value ? words.value.find(w => w.id === selectedWordId.value) : null
})

const visibleWords = computed(() => {
  return words.value.filter(word => {
    return word.endTime >= viewStart.value && word.startTime <= viewEnd.value
  })
})

const lyricsLines = computed(() => {
  // Group words into lines for display (rough approximation)
  const lines: TimedWord[][] = []
  let currentLine: TimedWord[] = []
  let lastEndTime = 0

  for (const word of words.value) {
    // New line if there's a significant gap or we have too many words
    if (word.startTime - lastEndTime > 1.0 || currentLine.length > 8) {
      if (currentLine.length > 0) {
        lines.push([...currentLine])
        currentLine = []
      }
    }

    currentLine.push(word)
    lastEndTime = word.endTime
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
})

// Methods
const handleWordUpdate = (wordId: string, startTime: number, endTime: number) => {
  const wordIndex = words.value.findIndex(w => w.id === wordId)
  if (wordIndex !== -1) {
    const word = words.value[wordIndex]
    const duration = endTime - startTime

    // Update word timing
    word.startTime = startTime
    word.endTime = endTime

    // Update syllable timing proportionally
    const syllableDuration = duration / word.syllables.length
    word.syllables.forEach((syllable, index) => {
      syllable.startTime = startTime + index * syllableDuration
      syllable.endTime = startTime + (index + 1) * syllableDuration
    })

    console.log(`Updated word "${word.text}": ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`)
  }
}

const handleSyllableUpdate = (wordId: string, syllableIndex: number, startTime: number, endTime: number) => {
  const word = words.value.find(w => w.id === wordId)
  if (word && word.syllables[syllableIndex]) {
    word.syllables[syllableIndex].startTime = startTime
    word.syllables[syllableIndex].endTime = endTime

    // Update word boundaries if needed
    word.startTime = Math.min(word.startTime, startTime)
    word.endTime = Math.max(word.endTime, endTime)

    console.log(`Updated syllable "${word.syllables[syllableIndex].text}": ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`)
  }
}

const handleWordSelected = (wordId: string | null) => {
  selectedWordId.value = wordId

  if (wordId) {
    const word = words.value.find(w => w.id === wordId)
    if (word) {
      console.log(`Selected word: "${word.text}"`)
    }
  }
}

// New handlers for the simplified component
const handleWordsUpdate = (updatedWords: any[]) => {
  words.value = updatedWords as TimedWord[]
  console.log('Words updated:', updatedWords.length)
}

const handleWordSelect = (wordId: string | null) => {
  handleWordSelected(wordId)
}

const resetTiming = () => {
  words.value = parseNovemberLyrics()
  duration.value = getTestDuration()
  selectedWordId.value = null
  console.log('Timing data reset')
}

// Lifecycle
onMounted(() => {
  resetTiming()
})
</script>

<style scoped>
.test-timing-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.timing-editor-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.lyrics-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.lyrics-display {
  max-height: 300px;
  overflow-y: auto;
}

.lyrics-word {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
  display: inline-block;
}

.lyrics-word:hover {
  background-color: rgba(0, 123, 255, 0.1);
}

.lyrics-word.selected-word {
  background-color: rgba(255, 193, 7, 0.3);
  font-weight: bold;
}

.debug-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.debug-box {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.debug-word {
  padding: 2px 0;
  border-bottom: 1px solid #eee;
}

.lyrics-line {
  line-height: 1.8;
}

/* Slide-in Help Panel */
.help-panel-container {
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 1000;
  transform: translateY(-50%);
}

.help-panel {
  position: relative;
  width: 250px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 8px 8px 0;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
  transform: translateX(-230px);
  transition: transform 0.3s ease-in-out;
  color: white;
}

.help-panel.visible {
  transform: translateX(0);
}

.help-tab {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 8px 12px 8px 8px;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.help-tab i {
  margin-bottom: 4px;
  font-size: 14px;
}

.help-content {
  padding: 20px;
}

.help-content h5 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.help-content h5 i {
  margin-right: 8px;
  color: #ffd700;
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-list li {
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.help-list li:last-child {
  border-bottom: none;
}

.help-list li strong {
  color: #ffd700;
  font-weight: 600;
}

/* Hover effects */
.help-tab:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.help-panel:hover .help-tab {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}
</style>
