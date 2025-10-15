<template>
  <div
    class="syllable-word-box"
    :class="{ selected: isSelected }"
    :style="wordStyle"
    @mousedown="handleWordMouseDown"
    @click="handleClick"
  >
    <!-- Syllable sections -->
    <div
      v-for="(syllable, index) in word.syllables"
      :key="index"
      class="syllable-section"
      :style="getSyllableStyle(syllable, index)"
      @mousedown.stop="handleSyllableMouseDown($event, index)"
    >
      <span class="syllable-text">{{ syllable.text }}</span>

      <!-- Syllable divider (except for last syllable) -->
      <div
        v-if="index < word.syllables.length - 1"
        class="syllable-divider"
        @mousedown.stop="handleDividerMouseDown($event, index)"
      ></div>
    </div>

    <!-- Word resize handle for right edge -->
    <div class="resize-handle right" @mousedown.stop="handleWordResizeStart"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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
  word: TimedWord
  duration: number
  viewStart: number
  timelineWidth: number
  isSelected: boolean
  previousWord?: TimedWord | null
  nextWord?: TimedWord | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [wordId: string]
  'update-timing': [wordId: string, startTime: number, endTime: number]
  'update-syllable-timing': [wordId: string, syllableIndex: number, startTime: number, endTime: number]
}>()

// Reactive state
const isDraggingWord = ref(false)
const isResizingWord = ref(false)
const isDraggingDivider = ref(false)
const dragStartX = ref(0)
const initialTimes = ref<number[]>([])
const activeDividerIndex = ref(-1)

// Computed properties
const wordStyle = computed(() => {
  // Calculate position relative to the view window
  const relativeStartTime = props.word.startTime - props.viewStart
  const leftPercent = (relativeStartTime / props.duration) * 100
  const widthPercent = ((props.word.endTime - props.word.startTime) / props.duration) * 100

  return {
    left: `${Math.max(leftPercent, 0)}%`,
    width: `${Math.max(widthPercent, 1)}%`, // Minimum width for visibility
    position: 'absolute' as const,
    top: '0px',
  }
})

const getSyllableStyle = (syllable: Syllable, index: number) => {
  const wordDuration = props.word.endTime - props.word.startTime
  const syllableDuration = syllable.endTime - syllable.startTime
  const widthPercent = (syllableDuration / wordDuration) * 100

  return {
    width: `${Math.max(widthPercent, 10)}%`, // Minimum width
    backgroundColor: `hsl(${200 + index * 20}, 70%, ${50 + index * 5}%)`, // Varied colors
  }
}

// Drag constraints
const getMinStartTime = () => {
  return props.previousWord ? props.previousWord.endTime : 0
}

const getMaxEndTime = () => {
  return props.nextWord ? props.nextWord.startTime : props.duration
}

// Methods
const handleClick = (event: MouseEvent) => {
  event.stopPropagation()
  emit('select', props.word.id)
}

const handleWordMouseDown = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  isDraggingWord.value = true
  dragStartX.value = event.clientX

  // Store initial times for all syllables
  initialTimes.value = props.word.syllables.map(s => s.startTime)
  initialTimes.value.push(props.word.endTime) // Add end time

  emit('select', props.word.id)

  document.addEventListener('mousemove', handleWordDrag)
  document.addEventListener('mouseup', handleWordDragEnd)
}

const handleSyllableMouseDown = (event: MouseEvent, syllableIndex: number) => {
  // For now, just select the word - individual syllable dragging could be added later
  event.stopPropagation()
  emit('select', props.word.id)
}

const handleDividerMouseDown = (event: MouseEvent, dividerIndex: number) => {
  event.preventDefault()
  event.stopPropagation()

  isDraggingDivider.value = true
  activeDividerIndex.value = dividerIndex
  dragStartX.value = event.clientX

  // Store initial times
  initialTimes.value = props.word.syllables.map(s => s.endTime)

  emit('select', props.word.id)

  document.addEventListener('mousemove', handleDividerDrag)
  document.addEventListener('mouseup', handleDividerDragEnd)
}

const handleWordResizeStart = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  isResizingWord.value = true
  dragStartX.value = event.clientX

  document.addEventListener('mousemove', handleWordResize)
  document.addEventListener('mouseup', handleWordResizeEnd)
}

const handleWordDrag = (event: MouseEvent) => {
  if (!isDraggingWord.value) return

  const deltaX = event.clientX - dragStartX.value
  const timePerPixel = props.duration / props.timelineWidth
  const deltaTime = deltaX * timePerPixel

  const newStartTime = Math.max(getMinStartTime(), Math.min(initialTimes.value[0] + deltaTime, getMaxEndTime() - 0.1))

  const wordDuration = props.word.endTime - props.word.startTime
  const newEndTime = Math.min(newStartTime + wordDuration, getMaxEndTime())

  emit('update-timing', props.word.id, newStartTime, newEndTime)
}

const handleDividerDrag = (event: MouseEvent) => {
  if (!isDraggingDivider.value) return

  const deltaX = event.clientX - dragStartX.value
  const timePerPixel = props.duration / props.timelineWidth
  const deltaTime = deltaX * timePerPixel

  const dividerIndex = activeDividerIndex.value
  const leftSyllable = props.word.syllables[dividerIndex]
  const rightSyllable = props.word.syllables[dividerIndex + 1]

  // Calculate new boundary time
  const newBoundaryTime = Math.max(
    leftSyllable.startTime + 0.05, // Minimum syllable duration
    Math.min(
      initialTimes.value[dividerIndex] + deltaTime,
      rightSyllable.endTime - 0.05 // Minimum syllable duration
    )
  )

  // Update both syllables
  emit('update-syllable-timing', props.word.id, dividerIndex, leftSyllable.startTime, newBoundaryTime)
  emit('update-syllable-timing', props.word.id, dividerIndex + 1, newBoundaryTime, rightSyllable.endTime)
}

const handleWordResize = (event: MouseEvent) => {
  if (!isResizingWord.value) return

  const deltaX = event.clientX - dragStartX.value
  const timePerPixel = props.duration / props.timelineWidth
  const deltaTime = deltaX * timePerPixel

  const newEndTime = Math.max(props.word.startTime + 0.1, Math.min(props.word.endTime + deltaTime, getMaxEndTime()))

  emit('update-timing', props.word.id, props.word.startTime, newEndTime)
}

const handleWordDragEnd = () => {
  isDraggingWord.value = false
  document.removeEventListener('mousemove', handleWordDrag)
  document.removeEventListener('mouseup', handleWordDragEnd)
}

const handleDividerDragEnd = () => {
  isDraggingDivider.value = false
  activeDividerIndex.value = -1
  document.removeEventListener('mousemove', handleDividerDrag)
  document.removeEventListener('mouseup', handleDividerDragEnd)
}

const handleWordResizeEnd = () => {
  isResizingWord.value = false
  document.removeEventListener('mousemove', handleWordResize)
  document.removeEventListener('mouseup', handleWordResizeEnd)
}
</script>

<style scoped>
.syllable-word-box {
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: stretch;
  cursor: grab;
  user-select: none;
  border: 2px solid transparent;
  position: relative;
  min-width: 20px;
  transition: all 0.1s ease;
  overflow: hidden;
}

.syllable-word-box:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.syllable-word-box.selected {
  border-color: #ffc107;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
}

.syllable-word-box:active,
.syllable-word-box.dragging {
  cursor: grabbing;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.syllable-section {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 20px;
  background: #007bff;
  transition: background-color 0.1s ease;
}

.syllable-section:hover {
  filter: brightness(1.1);
}

.syllable-text {
  font-size: 11px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
}

.syllable-divider {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: rgba(255, 255, 255, 0.4);
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.syllable-word-box:hover .syllable-divider,
.syllable-word-box.selected .syllable-divider {
  opacity: 1;
}

.syllable-divider:hover {
  background: rgba(255, 255, 255, 0.8);
  width: 6px;
  right: -3px;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.resize-handle.right {
  right: -2px;
}

.syllable-word-box:hover .resize-handle,
.syllable-word-box.selected .resize-handle {
  opacity: 1;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.6);
}
</style>
