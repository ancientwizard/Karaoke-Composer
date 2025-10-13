<template>
  <div class="lyrics-editor">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">📝 Lyrics Editor</h5>
        <div class="editor-controls">
          <button 
            class="btn btn-sm btn-outline-primary me-2" 
            @click="addLine"
            title="Add new line"
          >
            <i class="bi bi-plus"></i>
          </button>
          <button 
            class="btn btn-sm btn-outline-secondary me-2" 
            @click="toggleEditMode"
            :class="{ active: isEditMode }"
            title="Toggle edit mode"
          >
            <i class="bi bi-pencil"></i>
          </button>
          <span class="badge" :class="isTimingMode ? 'bg-success' : 'bg-secondary'">
            {{ isTimingMode ? 'Timing Mode' : 'Edit Mode' }}
          </span>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="lyrics-container" ref="lyricsContainer">
          <div 
            v-for="(lyric, index) in lyrics" 
            :key="lyric.id"
            class="lyric-line"
            :class="{
              'active': index === currentLine,
              'has-timing': lyric.startTime !== undefined,
              'timing-mode': isTimingMode
            }"
            @click="selectLine(index)"
          >
            <!-- Line Number -->
            <div class="line-number">
              {{ lyric.lineNumber }}
            </div>

            <!-- Timing Display -->
            <div class="timing-display">
              <small v-if="lyric.startTime !== undefined" class="text-success">
                {{ formatTime(lyric.startTime) }}
              </small>
              <small v-else class="text-muted">--:--</small>
            </div>

            <!-- Lyrics Text -->
            <div class="lyric-text-container">
              <input 
                v-if="isEditMode && editingLine === index"
                type="text"
                class="form-control form-control-sm"
                v-model="lyric.text"
                @blur="finishEditing"
                @keyup.enter="finishEditing"
                @keyup.esc="cancelEditing"
                ref="editInput"
                placeholder="Use / to separate syllables: Hel/lo world a/maz/ing"
              />
              <div 
                v-else
                class="lyric-text"
                @dblclick="startEditing(index)"
                :class="{ 'empty': !lyric.text.trim() }"
              >
                <!-- Show words with syllable breakdown -->
                <div v-if="lyric.words.length > 0" class="words-display">
                  <span 
                    v-for="(word, wordIndex) in lyric.words" 
                    :key="wordIndex"
                    class="word-item"
                    :class="{ 
                      'current-word': index === currentLine && wordIndex === currentWord,
                      'timed-word': word.startTime !== undefined 
                    }"
                  >
                    <span 
                      v-for="(syllable, sylIndex) in word.syllables"
                      :key="sylIndex"
                      class="syllable-item"
                      :class="{ 'timed-syllable': syllable.startTime !== undefined }"
                    >
                      {{ syllable.syllable }}
                    </span>
                  </span>
                </div>
                <div v-else class="empty-text">
                  Empty line - double click to edit
                </div>
              </div>
            </div>

            <!-- Line Actions -->
            <div class="line-actions">
              <button 
                v-if="!isTimingMode"
                class="btn btn-sm btn-outline-danger"
                @click="deleteLine(index)"
                title="Delete line"
              >
                <i class="bi bi-trash3"></i>
              </button>
              <button 
                v-if="isTimingMode && lyric.startTime !== undefined"
                class="btn btn-sm btn-outline-warning"
                @click="clearTiming(index)"
                title="Clear timing"
              >
                <i class="bi bi-clock-history"></i>
              </button>
            </div>
          </div>

          <!-- Add line placeholder -->
          <div v-if="lyrics.length === 0" class="empty-state text-center py-4">
            <p class="text-muted">No lyrics yet. Click "+" to add your first line.</p>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <small class="text-muted">
              {{ lyrics.length }} lines • 
              {{ completedTimings }}/{{ lyrics.length }} timed
            </small>
          </div>
          <div class="col-sm-6 text-end">
            <small class="text-muted" v-if="isTimingMode">
              Press <kbd>Space</kbd> to assign timing to current line
            </small>
            <small class="text-muted" v-else>
              Double-click to edit lyrics
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { LyricLine } from '@/types/karaoke'
import { parseLyricsLine, lyricLineToText, getTimingStats } from '@/utils/lyricsParser'

// Props
interface Props {
  lyrics: LyricLine[]
  currentLine: number
  currentWord: number
  isTimingMode: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'line-select': [lineIndex: number]
  'lyrics-update': [lyrics: LyricLine[]]
}>()

// Reactive state
const isEditMode = ref(false)
const editingLine = ref(-1)
const lyricsContainer = ref<HTMLElement>()
const editInput = ref<HTMLInputElement[]>()

// Computed properties
const completedTimings = computed(() => {
  return props.lyrics.filter(lyric => lyric.startTime !== undefined).length
})

// Methods
const selectLine = (index: number) => {
  emit('line-select', index)
}

const addLine = () => {
  const newLine = parseLyricsLine('', props.lyrics.length + 1, `line-${Date.now()}`)
  
  const updatedLyrics = [...props.lyrics, newLine]
  updateLineNumbers(updatedLyrics)
  emit('lyrics-update', updatedLyrics)
  
  // Start editing the new line
  nextTick(() => {
    startEditing(updatedLyrics.length - 1)
  })
}

const deleteLine = (index: number) => {
  if (confirm('Are you sure you want to delete this line?')) {
    const updatedLyrics = props.lyrics.filter((_, i) => i !== index)
    updateLineNumbers(updatedLyrics)
    emit('lyrics-update', updatedLyrics)
  }
}

const startEditing = (index: number) => {
  if (props.isTimingMode) return
  
  editingLine.value = index
  nextTick(() => {
    const input = editInput.value?.[0]
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const finishEditing = () => {
  // Re-parse the edited line to update word/syllable structure
  if (editingLine.value >= 0) {
    const updatedLyrics = [...props.lyrics]
    const line = updatedLyrics[editingLine.value]
    if (line) {
      const parsedLine = parseLyricsLine(line.text, line.lineNumber, line.id)
      // Preserve any existing timing data
      parsedLine.startTime = line.startTime
      parsedLine.endTime = line.endTime
      parsedLine.duration = line.duration
      updatedLyrics[editingLine.value] = parsedLine
      emit('lyrics-update', updatedLyrics)
    }
  }
  editingLine.value = -1
}

const cancelEditing = () => {
  editingLine.value = -1
  // Reset the text value if needed
}

const clearTiming = (index: number) => {
  const updatedLyrics = [...props.lyrics]
  updatedLyrics[index] = {
    ...updatedLyrics[index],
    startTime: undefined,
    endTime: undefined,
    duration: undefined
  }
  emit('lyrics-update', updatedLyrics)
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (!isEditMode.value) {
    editingLine.value = -1
  }
}

const updateLineNumbers = (lyrics: LyricLine[]) => {
  lyrics.forEach((lyric, index) => {
    lyric.lineNumber = index + 1
  })
}

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Watch for current line changes to scroll into view
watch(() => props.currentLine, (newLine) => {
  nextTick(() => {
    const container = lyricsContainer.value
    if (container) {
      const activeElement = container.querySelector('.lyric-line.active')
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  })
})

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (props.isTimingMode) {
    if (event.code === 'Space') {
      event.preventDefault()
      // This will be handled by the parent component
    } else if (event.code === 'ArrowUp') {
      event.preventDefault()
      if (props.currentLine > 0) {
        emit('line-select', props.currentLine - 1)
      }
    } else if (event.code === 'ArrowDown') {
      event.preventDefault()
      if (props.currentLine < props.lyrics.length - 1) {
        emit('line-select', props.currentLine + 1)
      }
    }
  }
}

// Add keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<style scoped>
.lyrics-container {
  max-height: 500px;
  overflow-y: auto;
}

.lyric-line {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.lyric-line:hover {
  background-color: #f8f9fa;
}

.lyric-line.active {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.lyric-line.has-timing {
  border-left: 4px solid #4caf50;
}

.lyric-line.timing-mode.active {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
}

.line-number {
  min-width: 40px;
  text-align: center;
  font-weight: bold;
  color: #666;
  font-size: 0.875rem;
}

.timing-display {
  min-width: 60px;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.lyric-text-container {
  flex: 1;
  padding: 0 1rem;
}

.lyric-text {
  min-height: 1.5rem;
  padding: 0.25rem 0;
}

.empty-text {
  color: #999;
  font-style: italic;
}

.words-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.word-item {
  display: inline-flex;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.word-item.current-word {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
}

.word-item.timed-word {
  background-color: #d1edff;
  border: 1px solid #0d6efd;
}

.syllable-item {
  position: relative;
}

.syllable-item:not(:last-child)::after {
  content: '·';
  color: #ccc;
  margin: 0 1px;
}

.syllable-item.timed-syllable {
  color: #0d6efd;
  font-weight: 500;
}

.line-actions {
  min-width: 50px;
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-controls .btn.active {
  background-color: #0d6efd;
  color: white;
}

kbd {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
}

/* Scrollbar styling */
.lyrics-container::-webkit-scrollbar {
  width: 8px;
}

.lyrics-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.lyrics-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.lyrics-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>