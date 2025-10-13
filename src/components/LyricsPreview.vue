<template>
  <div class="lyrics-preview">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">👁️ Lyrics Preview</h5>
        <div class="preview-controls">
          <button 
            class="btn btn-sm btn-outline-secondary me-2"
            @click="toggleKaraokeMode"
            :class="{ active: isKaraokeMode }"
            title="Toggle karaoke mode"
          >
            <i class="bi bi-display"></i>
          </button>
          <div class="btn-group" role="group">
            <button 
              class="btn btn-sm btn-outline-primary"
              :class="{ active: fontSize === 'small' }"
              @click="setFontSize('small')"
            >
              A
            </button>
            <button 
              class="btn btn-sm btn-outline-primary"
              :class="{ active: fontSize === 'medium' }"
              @click="setFontSize('medium')"
            >
              A
            </button>
            <button 
              class="btn btn-sm btn-outline-primary"
              :class="{ active: fontSize === 'large' }"
              @click="setFontSize('large')"
            >
              A
            </button>
          </div>
        </div>
      </div>
      <div class="card-body preview-container" :class="[`font-${fontSize}`, { 'karaoke-mode': isKaraokeMode }]">
        <div v-if="lyrics.length === 0" class="empty-state text-center py-4">
          <p class="text-muted">No lyrics to preview</p>
        </div>
        <div v-else class="lyrics-display" ref="lyricsDisplay">
          <!-- Karaoke Mode - Large display with current line prominent -->
          <div v-if="isKaraokeMode" class="karaoke-display">
            <div class="context-lines">
              <!-- Previous lines -->
              <div 
                v-for="(lyric, index) in previousLines" 
                :key="`prev-${lyric.id}`"
                class="context-line previous"
              >
                {{ getCleanText(lyric) }}
              </div>
            </div>

            <!-- Current Line - Prominent -->
            <div 
              v-if="currentLyric"
              class="current-line-display"
              :class="{ 'highlighted': isCurrentLinePlaying }"
            >
              <div class="line-text">
                <!-- Show word/syllable highlighting -->
                <span 
                  v-for="(word, wordIndex) in currentLyric.words" 
                  :key="wordIndex"
                  class="karaoke-word"
                  :class="{ 
                    'current-word': wordIndex === currentWord,
                    'past-word': isWordPast(currentLyric, wordIndex),
                    'future-word': isWordFuture(currentLyric, wordIndex)
                  }"
                >
                  <span 
                    v-for="(syllable, sylIndex) in word.syllables"
                    :key="sylIndex"
                    class="karaoke-syllable"
                    :class="{ 
                      'current-syllable': wordIndex === currentWord && sylIndex === currentSyllable,
                      'past-syllable': isSyllablePast(syllable),
                      'future-syllable': isSyllableFuture(syllable)
                    }"
                  >
                    {{ syllable.syllable }}
                  </span>
                  {{ ' ' }}
                </span>
              </div>
              <div v-if="currentLyric.startTime !== undefined" class="line-timing">
                {{ formatTime(currentLyric.startTime) }}
              </div>
            </div>

            <div class="context-lines">
              <!-- Next lines -->
              <div 
                v-for="(lyric, index) in nextLines" 
                :key="`next-${lyric.id}`"
                class="context-line next"
              >
                {{ getCleanText(lyric) }}
              </div>
            </div>
          </div>

          <!-- Normal Mode - All lyrics visible -->
          <div v-else class="normal-display">
            <div 
              v-for="(lyric, index) in lyrics" 
              :key="lyric.id"
              class="preview-line"
              :class="{
                'current': index === currentLine,
                'has-timing': lyric.startTime !== undefined,
                'past': lyric.startTime !== undefined && lyric.startTime < currentTime,
                'future': lyric.startTime !== undefined && lyric.startTime > currentTime,
                'playing': isLinePlaying(lyric, index)
              }"
            >
              <div class="line-content">
                <span class="line-number">{{ lyric.lineNumber }}</span>
                <span class="line-text">{{ getCleanText(lyric) }}</span>
                <span v-if="lyric.startTime !== undefined" class="line-timing">
                  {{ formatTime(lyric.startTime) }}
                </span>
              </div>
              
              <!-- Progress bar for current playing line -->
              <div 
                v-if="isLinePlaying(lyric, index) && lyric.duration"
                class="line-progress"
              >
                <div 
                  class="progress-bar"
                  :style="{ width: getLineProgress(lyric) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <small class="text-muted">
              Line {{ currentLine + 1 }} of {{ lyrics.length }}
              <span v-if="currentTime > 0"> • {{ formatTime(currentTime) }}</span>
            </small>
          </div>
          <div class="col-sm-6 text-end">
            <small class="text-muted">
              {{ timedLines }}/{{ lyrics.length }} lines timed
              <span v-if="completionPercentage > 0">({{ completionPercentage }}%)</span>
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { LyricLine } from '@/types/karaoke'

// Props
interface Props {
  lyrics: LyricLine[]
  currentTime: number
  currentLine: number
  currentWord?: number
  currentSyllable?: number
}

const props = defineProps<Props>()

// Reactive state
const isKaraokeMode = ref(false)
const fontSize = ref<'small' | 'medium' | 'large'>('medium')
const lyricsDisplay = ref<HTMLElement>()

// Computed properties
const currentLyric = computed(() => {
  return props.lyrics[props.currentLine] || null
})

const previousLines = computed(() => {
  const start = Math.max(0, props.currentLine - 2)
  return props.lyrics.slice(start, props.currentLine)
})

const nextLines = computed(() => {
  const end = Math.min(props.lyrics.length, props.currentLine + 3)
  return props.lyrics.slice(props.currentLine + 1, end)
})

const isCurrentLinePlaying = computed(() => {
  if (!currentLyric.value || currentLyric.value.startTime === undefined) {
    return false
  }
  
  const startTime = currentLyric.value.startTime
  const endTime = currentLyric.value.endTime || (startTime + (currentLyric.value.duration || 3000))
  
  return props.currentTime >= startTime && props.currentTime <= endTime
})

const timedLines = computed(() => {
  return props.lyrics.filter(lyric => lyric.startTime !== undefined).length
})

const completionPercentage = computed(() => {
  if (props.lyrics.length === 0) return 0
  return Math.round((timedLines.value / props.lyrics.length) * 100)
})

// Methods
const toggleKaraokeMode = () => {
  isKaraokeMode.value = !isKaraokeMode.value
}

const setFontSize = (size: 'small' | 'medium' | 'large') => {
  fontSize.value = size
}

const isLinePlaying = (lyric: LyricLine, index: number): boolean => {
  if (lyric.startTime === undefined) return false
  
  const startTime = lyric.startTime
  const endTime = lyric.endTime || (startTime + (lyric.duration || 3000))
  
  return props.currentTime >= startTime && props.currentTime <= endTime
}

const getLineProgress = (lyric: LyricLine): number => {
  if (!lyric.startTime || !lyric.duration) return 0
  
  const elapsed = props.currentTime - lyric.startTime
  const progress = (elapsed / lyric.duration) * 100
  
  return Math.max(0, Math.min(100, progress))
}

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const getCleanText = (lyric: LyricLine): string => {
  // Return clean text without syllable markers for preview
  return lyric.words.map(word => word.word).join(' ')
}

const isWordPast = (line: LyricLine, wordIndex: number): boolean => {
  const word = line.words[wordIndex]
  if (!word?.endTime) return false
  return props.currentTime > word.endTime
}

const isWordFuture = (line: LyricLine, wordIndex: number): boolean => {
  const word = line.words[wordIndex]
  if (!word?.startTime) return false
  return props.currentTime < word.startTime
}

const isSyllablePast = (syllable: any): boolean => {
  if (!syllable?.endTime) return false
  return props.currentTime > syllable.endTime
}

const isSyllableFuture = (syllable: any): boolean => {
  if (!syllable?.startTime) return false
  return props.currentTime < syllable.startTime
}

// Auto-scroll to current line in normal mode
watch(() => props.currentLine, () => {
  if (!isKaraokeMode.value) {
    nextTick(() => {
      const display = lyricsDisplay.value
      if (display) {
        const currentElement = display.querySelector('.preview-line.current')
        if (currentElement) {
          currentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }
    })
  }
})
</script>

<style scoped>
.preview-container {
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.preview-container.karaoke-mode {
  background: #1a1a1a;
  color: white;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Font sizes */
.font-small {
  font-size: 0.875rem;
}

.font-medium {
  font-size: 1rem;
}

.font-large {
  font-size: 1.25rem;
}

/* Karaoke Mode Styles */
.karaoke-display {
  width: 100%;
  max-width: 600px;
}

.context-lines {
  margin: 1rem 0;
}

.context-line {
  padding: 0.5rem 0;
  opacity: 0.6;
  font-size: 0.9em;
}

.context-line.previous {
  color: #999;
}

.context-line.next {
  color: #ccc;
}

.current-line-display {
  padding: 2rem 1rem;
  border: 2px solid #444;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  margin: 2rem 0;
  transition: all 0.3s ease;
}

.current-line-display.highlighted {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
  transform: scale(1.05);
}

.current-line-display .line-text {
  font-size: 1.5em;
  font-weight: bold;
  display: block;
  margin-bottom: 0.5rem;
}

.current-line-display .line-timing {
  font-size: 0.9em;
  color: #ffd700;
}

/* Word and syllable highlighting */
.karaoke-word {
  display: inline-block;
  margin: 0 0.25rem;
  transition: all 0.3s ease;
}

.karaoke-word.current-word {
  color: #ffd700;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  transform: scale(1.1);
}

.karaoke-word.past-word {
  color: #90ee90;
  opacity: 0.8;
}

.karaoke-word.future-word {
  color: #ddd;
  opacity: 0.6;
}

.karaoke-syllable {
  transition: all 0.2s ease;
}

.karaoke-syllable.current-syllable {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  padding: 0.1rem 0.2rem;
  border-radius: 0.25rem;
  animation: syllable-highlight 0.5s ease-in-out;
}

.karaoke-syllable.past-syllable {
  color: #90ee90;
}

.karaoke-syllable.future-syllable {
  color: #ccc;
}

@keyframes syllable-highlight {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Normal Mode Styles */
.normal-display {
  padding: 1rem;
}

.preview-line {
  padding: 0.75rem;
  margin: 0.25rem 0;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.preview-line.current {
  background-color: rgba(33, 150, 243, 0.1);
  border-left-color: #2196f3;
}

.preview-line.has-timing {
  border-left-color: #4caf50;
}

.preview-line.playing {
  background-color: rgba(255, 193, 7, 0.2);
  border-left-color: #ffc107;
  animation: pulse 1.5s ease-in-out infinite alternate;
}

.preview-line.past {
  opacity: 0.7;
  color: #666;
}

.preview-line.future {
  opacity: 0.8;
}

.line-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.line-number {
  min-width: 30px;
  font-weight: bold;
  color: #666;
  font-size: 0.875rem;
}

.line-text {
  flex: 1;
}

.line-timing {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #28a745;
  font-weight: bold;
}

.line-progress {
  height: 3px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffc107, #ff9800);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.empty-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-controls .btn.active {
  background-color: #0d6efd;
  color: white;
}

/* Button sizing for font controls */
.btn-group .btn {
  min-width: 32px;
}

.btn-group .btn:nth-child(1) {
  font-size: 0.75rem;
}

.btn-group .btn:nth-child(2) {
  font-size: 0.875rem;
}

.btn-group .btn:nth-child(3) {
  font-size: 1rem;
}

/* Animation */
@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.02);
  }
}

/* Scrollbar styling */
.preview-container::-webkit-scrollbar {
  width: 8px;
}

.preview-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.preview-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.preview-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>