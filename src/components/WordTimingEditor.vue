<template>
  <div class="word-timing-editor">
    <div 
      class="timeline-container"
      ref="timelineRef"
      @mousedown="handleTimelineMouseDown"
    >
      <!-- Timeline background -->
      <div class="timeline-background">
        <!-- Time markers (optional, can be hidden) -->
        <div 
          v-for="marker in timeMarkers" 
          :key="marker.time"
          class="time-marker"
          :style="{ left: `${(marker.time / duration) * 100}%` }"
        >
          <span class="time-label">{{ formatTime(marker.time) }}</span>
        </div>
      </div>

      <!-- Word boxes -->
      <div class="words-container">
        <component
          v-for="(word, index) in visibleWords"
          :key="`${word.id}-${index}`"
          :is="word.syllables.length > 1 ? 'SyllableWordBox' : 'WordBox'"
          :word="word"
          :duration="effectiveViewEnd - viewStart"
          :view-start="viewStart"
          :timeline-width="timelineWidth"
          :is-selected="selectedWordId === word.id"
          :previous-word="index > 0 ? visibleWords[index - 1] : null"
          :next-word="index < visibleWords.length - 1 ? visibleWords[index + 1] : null"
          @select="selectWord"
          @update-timing="updateWordTiming"
          @update-syllable-timing="updateSyllableTiming"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, readonly } from 'vue'
import WordBox from './WordBox.vue'
import SyllableWordBox from './SyllableWordBox.vue'

interface Syllable {
  text: string
  startTime: number
  endTime: number
}

interface TimedWord {
  id: string
  text: string
  startTime: number
  endTime: number
  syllables: Syllable[]
}

interface Props {
  words: TimedWord[]
  duration: number // Total duration in seconds
  viewStart?: number // Start of visible window (seconds)
  viewEnd?: number // End of visible window (seconds)
}

const props = withDefaults(defineProps<Props>(), {
  viewStart: 0,
  viewEnd: undefined
})

const emit = defineEmits<{
  'update-word': [wordId: string, startTime: number, endTime: number]
  'update-syllable': [wordId: string, syllableIndex: number, startTime: number, endTime: number]
  'word-selected': [wordId: string | null]
}>()

// Reactive state
const timelineRef = ref<HTMLElement>()
const selectedWordId = ref<string | null>(null)
const timelineWidth = ref(800) // Will be updated based on container

// Computed properties
const effectiveViewEnd = computed(() => props.viewEnd || props.duration)

const visibleWords = computed(() => {
  return props.words.filter(word => {
    // Show words that overlap with the visible time window
    return word.endTime >= props.viewStart && word.startTime <= effectiveViewEnd.value
  })
})

const timeMarkers = computed(() => {
  const markers = []
  const step = 5 // 5-second intervals
  const start = Math.floor(props.viewStart / step) * step
  const end = Math.ceil(effectiveViewEnd.value / step) * step
  
  for (let time = start; time <= end; time += step) {
    if (time >= props.viewStart && time <= effectiveViewEnd.value) {
      markers.push({ time })
    }
  }
  return markers
})

// Methods
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const selectWord = (wordId: string | null) => {
  selectedWordId.value = wordId
  emit('word-selected', wordId)
}

const updateWordTiming = (wordId: string, startTime: number, endTime: number) => {
  emit('update-word', wordId, startTime, endTime)
}

const updateSyllableTiming = (wordId: string, syllableIndex: number, startTime: number, endTime: number) => {
  emit('update-syllable', wordId, syllableIndex, startTime, endTime)
}

const handleTimelineMouseDown = (event: MouseEvent) => {
  // Clear selection if clicking on empty timeline
  if (event.target === timelineRef.value) {
    selectWord(null)
  }
}

const updateTimelineWidth = () => {
  if (timelineRef.value) {
    timelineWidth.value = timelineRef.value.clientWidth
  }
}

// Lifecycle
onMounted(() => {
  updateTimelineWidth()
  window.addEventListener('resize', updateTimelineWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTimelineWidth)
})

// Export for parent access
defineExpose({
  selectWord,
  selectedWordId: readonly(selectedWordId)
})
</script>

<style scoped>
.word-timing-editor {
  width: 100%;
  height: 80px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  overflow: hidden;
  position: relative;
}

.timeline-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: default;
  user-select: none;
}

.timeline-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.time-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px solid #ccc;
  pointer-events: none;
}

.time-label {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  color: #666;
  background: rgba(255, 255, 255, 0.8);
  padding: 1px 3px;
  border-radius: 2px;
}

.words-container {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10; /* Higher z-index to ensure word boxes are on top */
}
</style>