<template>
  <div
    class="word-box"
    :class="{ 
      'selected': isSelected,
      'full-word': word.syllables.length === 1 && word.syllables[0].text === 'FULL',
      'dragging': isDragging || isResizing
    }"
    :style="wordStyle"
    @mousedown="handleMouseDown"
    @click="handleClick"
  >
    <!-- Full words show as dots, regular words show text -->
    <span v-if="isFullWord" class="full-word-dot">•</span>
    <span v-else class="word-text">{{ word.text }}</span>
    
    <!-- Resize handle for right edge -->
    <div 
      v-if="!isFullWord"
      class="resize-handle right"
      @mousedown.stop="handleResizeStart"
    ></div>
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
  'select': [wordId: string]
  'update-timing': [wordId: string, startTime: number, endTime: number]
}>()

// Reactive state
const isDragging = ref(false)
const isResizing = ref(false)
const dragStartX = ref(0)
const initialStartTime = ref(0)
const initialEndTime = ref(0)

// Computed properties
const isFullWord = computed(() => {
  return props.word.syllables.length === 1 && props.word.syllables[0].text === 'FULL'
})

const wordStyle = computed(() => {
  // Calculate position relative to the view window
  const relativeStartTime = props.word.startTime - props.viewStart
  const leftPercent = (relativeStartTime / props.duration) * 100
  const widthPercent = ((props.word.endTime - props.word.startTime) / props.duration) * 100
  
  // Debug logging
  if (props.word.text === 'Meet' || props.word.text === 'me') {
    console.log(`📏 Word "${props.word.text}":`)
    console.log(`  startTime: ${props.word.startTime}, endTime: ${props.word.endTime}`)
    console.log(`  viewStart: ${props.viewStart}, duration: ${props.duration}`)
    console.log(`  relativeStartTime: ${relativeStartTime}, leftPercent: ${leftPercent.toFixed(2)}%`)
    console.log(`  wordDuration: ${props.word.endTime - props.word.startTime}, widthPercent: ${widthPercent.toFixed(2)}%`)
  }
  
  return {
    left: `${Math.max(leftPercent, 0)}%`,
    width: `${Math.max(widthPercent, 0.1)}%`, // Reduced minimum width
    position: 'absolute' as const,
    top: '0px'
  }
})

// Drag constraints
const getMinStartTime = () => {
  return props.previousWord ? props.previousWord.endTime : 0
}

const getMaxEndTime = () => {
  return props.nextWord ? props.nextWord.startTime : props.duration
}

// Methods
const handleClick = (event: MouseEvent) => {
  console.log(`🖱️ Clicked word "${props.word.text}"`)
  event.stopPropagation()
  emit('select', props.word.id)
}

const handleMouseDown = (event: MouseEvent) => {
  if (isFullWord.value) return // Full words can't be dragged
  
  event.preventDefault()
  event.stopPropagation()
  
  console.log(`Starting drag for word "${props.word.text}"`)
  
  isDragging.value = true
  dragStartX.value = event.clientX
  initialStartTime.value = props.word.startTime
  initialEndTime.value = props.word.endTime
  
  emit('select', props.word.id)
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
}

const handleResizeStart = (event: MouseEvent) => {
  if (isFullWord.value) return
  
  event.preventDefault()
  event.stopPropagation()
  
  isResizing.value = true
  dragStartX.value = event.clientX
  initialEndTime.value = props.word.endTime
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', handleResizeEnd)
}

const handleDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const timePerPixel = props.duration / props.timelineWidth
  const deltaTime = deltaX * timePerPixel
  
  const newStartTime = Math.max(
    getMinStartTime(),
    Math.min(initialStartTime.value + deltaTime, getMaxEndTime() - 0.1) // Minimum duration
  )
  
  const wordDuration = initialEndTime.value - initialStartTime.value
  const newEndTime = Math.min(newStartTime + wordDuration, getMaxEndTime())
  
  console.log(`Dragging word "${props.word.text}": ${newStartTime.toFixed(2)}s - ${newEndTime.toFixed(2)}s`)
  emit('update-timing', props.word.id, newStartTime, newEndTime)
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const timePerPixel = props.duration / props.timelineWidth
  const deltaTime = deltaX * timePerPixel
  
  const newEndTime = Math.max(
    props.word.startTime + 0.1, // Minimum duration
    Math.min(initialEndTime.value + deltaTime, getMaxEndTime())
  )
  
  emit('update-timing', props.word.id, props.word.startTime, newEndTime)
}

const handleDragEnd = () => {
  console.log(`Finished dragging word "${props.word.text}"`)
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', handleDragEnd)
}

const handleResizeEnd = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', handleResizeEnd)
}
</script>

<style scoped>
.word-box {
  height: 30px;
  background: #007bff;
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  border: 2px solid transparent;
  position: relative;
  min-width: 8px;
  transition: all 0.1s ease;
  z-index: 5; /* Ensure word boxes are clickable */
}

.word-box:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.word-box.selected {
  border-color: #ffc107;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
}

.word-box:active,
.word-box.dragging {
  cursor: grabbing;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.word-box.dragging {
  z-index: 1000;
  opacity: 0.9;
}

.word-box.full-word {
  background: #6c757d;
  width: 8px !important;
  min-width: 8px;
  border-radius: 50%;
  cursor: default;
}

.word-box.full-word:hover {
  background: #5a6268;
  transform: none;
}

.word-text {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.full-word-dot {
  font-size: 16px;
  line-height: 1;
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
}

.resize-handle.right {
  right: -2px;
}

.word-box:hover .resize-handle,
.word-box.selected .resize-handle {
  opacity: 1;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.6);
}
</style>