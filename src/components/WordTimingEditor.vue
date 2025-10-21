<!--
WORD TIMING EDITOR COMPONENT - Design & Behavior Notes

VISION:
- Single unified timeline component (like a train track with word cars)
- Horizontal 1px black line with word rectangles sitting on top (kabob-case style)
- Positioned above waveform viewer for synchronized time viewing
- Musical timing intelligence: captures word starts via spacebar, assumes note patterns

DURATION-BASED WORKFLOW:
- Think in terms of DURATIONS rather than end times (more musical/natural)
- Move operations: preserve duration, change start time
- Resize operations: preserve start time, change duration
- Syllable proportions: stored as percentages of word duration
- Visual width directly represents time duration

BEHAVIORS:
- Each word box width represents duration visually (start + duration = end)
- Hot spots: move entire word (preserves duration), resize duration, syllable dividers
- Smart syllable distribution: first syllables shorter, last longer (NOT equal triplets)
- Time-locked with waveform: same scale, synchronized scrolling/zooming

INTERACTION PATTERNS:
- Spacebar tap captures word start times during playback
- Dragging resize handle changes word duration intelligently
- Moving words preserves their musical duration
- Future: keyboard shortcuts for common duration adjustments (quarter note, eighth note, etc.)
- Cursor feedback shows interaction type (grab/resize/divide)

MUSICAL ASSUMPTIONS:
- Words have natural durations that should be preserved when moving
- Duration changes redistribute syllables proportionally (musical phrasing)
- Start time capture + duration-based editing = natural musical workflow
- Syllable timing follows musical phrasing (not mechanical equal spacing)
-->

<template>
  <div class="word-timing-editor">
    <!-- Main timeline track with horizontal reference line -->
    <div class="timeline-track" :class="{
      'with-background': showBackground,
      'with-border': showBorder
    }" ref="timelineTrack">
      <!-- 1px black horizontal line (the "track" for word "train cars") -->
      <div class="timeline-baseline"></div>

      <!-- Word boxes positioned as train cars on the track -->
      <div v-for="word in visibleWords" :key="word.id" class="word-car" :class="{
        selected: selectedWordId === word.id,
        dragging: isDragging && draggedWordId === word.id,
        untimed: word.startTime === 0 && word.endTime === 0
      }" :style="getWordCarStyle(word)" @mousedown="handleWordMouseDown(word, $event)">
        <!-- Word text -->
        <div class="word-text">{{ word.text }}</div>

        <!-- Hot spots for interaction -->
        <div class="hotspot hotspot-move" title="Drag to move word" @mousedown.stop="startDrag('move', word, $event)">
        </div>
        <div class="hotspot hotspot-resize-end" title="Drag to adjust end time"
          @mousedown.stop="startDrag('resize', word, $event)"></div>

        <!-- Syllable dividers for multi-syllable words -->
        <template v-if="word.syllables && word.syllables.length > 1">
          <div v-for="(syllable, index) in word.syllables.slice(0, -1)" :key="`syllable-${index}`"
            class="hotspot hotspot-syllable-divider" :style="getSyllableDividerStyle(word, index)"
            :title="`Adjust syllable ${index + 1}/${index + 2} boundary`"
            @mousedown.stop="startDrag('syllable', word, $event, index)"></div>
        </template>
      </div>
    </div>

    <!-- Debug panel -->
    <div v-if="showDebug" class="debug-panel">
      <h4>Word Timing Editor Debug</h4>
      <p>Timeline Duration: {{ duration.toFixed(2) }}s</p>
      <p>
        View Window: {{ props.viewStart.toFixed(2) }}s - {{ effectiveViewEnd.toFixed(2) }}s ({{ viewDuration.toFixed(2)
        }}s span)
      </p>
      <p>Pixels/Second: {{ pixelsPerSecond.toFixed(1) }}</p>
      <p>Track Width: {{ trackWidth }}px</p>
      <p>Total Words: {{ props.words.length }} | Visible: {{ visibleWords.length }}</p>
      <p>Selected Word: {{ selectedWordId || 'None' }}</p>
      <p>Drag State: {{ isDragging ? `${dragType} on ${draggedWordId}` : 'None' }}</p>
      <p v-if="isDragging">Drag Start Time: {{ dragStartTime.toFixed(3) }}s</p>
      <div v-if="selectedWordId" class="selected-word-debug">
        <strong>Selected Word Details:</strong>
        <div class="word-timing-summary">
          <p v-if="visibleWords.find(w => w.id === selectedWordId)" class="timing-info">
            Word: "{{visibleWords.find(w => w.id === selectedWordId)?.text}}" | Start:
            {{visibleWords.find(w => w.id === selectedWordId)?.startTime.toFixed(3)}}s | Duration:
            {{getWordDuration(visibleWords.find(w => w.id === selectedWordId)!).toFixed(3)}}s
          </p>
          <div v-if="visibleWords.find(w => w.id === selectedWordId)?.syllables" class="syllable-durations">
            <strong>Syllable Durations:</strong>
            <div v-for="(syllable, index) in visibleWords.find(w => w.id === selectedWordId)?.syllables" :key="index"
              class="syllable-info">
              "{{ syllable.text }}": {{ getSyllableDuration(syllable).toFixed(3) }}s ({{
                (
                  (getSyllableDuration(syllable) / getWordDuration(visibleWords.find(w => w.id === selectedWordId)!)) *
                  100
                ).toFixed(1)
              }}%)
            </div>
          </div>
        </div>
        <details>
          <summary>Raw JSON Data</summary>
          <pre>{{
            JSON.stringify(
              visibleWords.find(w => w.id === selectedWordId),
              null,
              2
            )
          }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { TIMING } from '@/models/TimingConstants'

interface Syllable {
  text: string
  startTime: number
  endTime: number
  // Note: We'll calculate duration as endTime - startTime when needed
}

interface Word {
  id: string
  text: string
  startTime: number
  endTime: number // Keep for compatibility, but think in terms of startTime + duration
  syllables?: Syllable[]
  // Internal: We'll work with duration = endTime - startTime
}

interface Props {
  words: Word[]
  duration: number
  viewStart?: number
  viewEnd?: number
  showDebug?: boolean
  showBackground?: boolean
  showBorder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  viewStart: 0,
  viewEnd: undefined,
  showDebug: false,
  showBackground: false,
  showBorder: false,
})

// console.log('🔧 WordTimingEditor props received:', {
//   words: props.words.length,
//   duration: props.duration,
//   viewStart: props.viewStart,
//   viewEnd: props.viewEnd,
//   showDebug: props.showDebug
// })

const emit = defineEmits<{
  'update:words': [words: Word[]]
  'select-word': [wordId: string | null]
}>()

// Refs
const timelineTrack = ref<HTMLElement>()
const selectedWordId = ref<string | null>(null)

// Drag state
const isDragging = ref(false)
const draggedWordId = ref<string | null>(null)
const dragType = ref<'move' | 'resize' | 'syllable'>('move')
const dragStartX = ref(0)
const dragStartTime = ref(0)
const dragSyllableIndex = ref(0)

// Timeline calculations
const trackWidth = ref(800) // Will be updated on mount
const effectiveViewEnd = computed(() => props.viewEnd || props.duration)
const viewDuration = computed(() => effectiveViewEnd.value - props.viewStart)
const pixelsPerSecond = computed(() => trackWidth.value / viewDuration.value)

// Visible words - Strict to show only word fully within viewport
const visibleWords = computed(() => {
  const buffer = 0.02 // No buffer - words appear/disappear exactly at viewport edges

  // console.log('👁️ Calculating visibleWords:', {
  //   totalWords: props.words.length,
  //   viewStart: props.viewStart,
  //   viewEnd: effectiveViewEnd.value,
  //   duration: props.duration,
  //   firstFewWords: props.words.slice(0, 3).map(w => ({
  //     text: w.text,
  //     startTime: w.startTime,
  //     endTime: w.endTime,
  //     isUntimed: w.startTime === 0 && w.endTime === 0
  //   }))
  // })

  const filtered = props.words.filter(word => {
    // Skip words with no timing (startTime and endTime both 0) - they clutter the interface
    const isUntimed = word.startTime === 0 && word.endTime === 0
    if (isUntimed) {
      // console.log('👁️ Skipping untimed word:', word.text)
      return false // Hide untimed words
    }

    // For words with timing, check if they're COMPLETELY within the visible time range
    // Only show words where BOTH start and end are within the viewport
    // This prevents visual issues where partial words "stick" at viewport edges
    const wordStart = word.startTime
    const wordEnd = word.endTime
    const viewWindowStart = props.viewStart - buffer
    const viewWindowEnd = effectiveViewEnd.value + buffer

    // A word is visible only if it's completely contained in the viewport
    const inRange = wordStart >= viewWindowStart && wordEnd <= viewWindowEnd

    // console.log('👁️ Word range check:', {
    //   text: word.text,
    //   wordStart,
    //   wordEnd,
    //   viewWindowStart,
    //   viewWindowEnd,
    //   inRange,
    //   viewStart: props.viewStart,
    //   viewEnd: effectiveViewEnd.value
    // })

    return inRange
  })

  // console.log('👁️ Visible words result:', {
  //   visible: filtered.length,
  //   words: filtered.map(w => w.text)
  // })

  return filtered
})

// Convert time to pixels with proper bounds checking
const timeToPixels = (time: number): number => {
  const relativeTime = time - props.viewStart
  return relativeTime * pixelsPerSecond.value
}

// Convert pixels to time with proper bounds checking
// const pixelsToTime = (pixels: number): number => {
//   return props.viewStart + pixels / pixelsPerSecond.value
// }

// Get CSS style for word car positioning with bounds checking
const getWordCarStyle = (word: Word) => {
  // Special handling for untimed words (both startTime and endTime are 0)
  if (word.startTime === 0 && word.endTime === 0) {
    // Position untimed words sequentially at the beginning
    const untimedWords = props.words.filter(w => w.startTime === 0 && w.endTime === 0)
    const wordIndex = untimedWords.findIndex(w => w.id === word.id)
    const wordWidth = Math.max(word.text.length * 8 + 20, 60) // Width based on text length, minimum 60px
    const leftPosition = wordIndex * (wordWidth + 5) // 5px gap between untimed words

    return {
      left: `${leftPosition}px`,
      width: `${wordWidth}px`,
    }
  }

  // Normal handling for timed words
  const startPixels = timeToPixels(word.startTime)
  const endPixels = timeToPixels(word.endTime)
  const width = endPixels - startPixels

  // Ensure minimum width and proper positioning
  const safeLeft = Math.max(0, startPixels)
  const safeWidth = Math.max(width, 24) // Minimum 24px for usable hotspots

  // Clamp to track bounds but allow slight overflow for edge cases
  const maxLeft = trackWidth.value - 24
  const finalLeft = Math.min(safeLeft, maxLeft)
  const finalWidth = Math.min(safeWidth, trackWidth.value - finalLeft)

  return {
    left: `${finalLeft}px`,
    width: `${finalWidth}px`,
  }
}

// Get CSS style for syllable divider positioning with bounds checking
const getSyllableDividerStyle = (word: Word, syllableIndex: number) => {
  if (!word.syllables || syllableIndex >= word.syllables.length - 1) return { display: 'none' }

  const wordStartPixels = timeToPixels(word.startTime)
  const syllableEndPixels = timeToPixels(word.syllables[syllableIndex].endTime)
  const wordWidth = timeToPixels(word.endTime) - wordStartPixels

  // Calculate position relative to word start, with bounds checking
  const relativePosition = syllableEndPixels - wordStartPixels
  const safePosition = Math.max(6, Math.min(relativePosition, wordWidth - 6)) // Keep within word bounds

  return {
    left: `${safePosition}px`,
    display: wordWidth > 20 ? 'block' : 'none', // Hide dividers in very narrow words
  }
}

// Mouse event handlers
const handleWordMouseDown = (word: Word, event: MouseEvent) => {
  event.preventDefault()
  selectedWordId.value = word.id
  emit('select-word', word.id)
}

// Store original syllable proportions for move operations
const originalSyllableProportions = ref<{ [wordId: string]: number[] }>({})

// Duration-based helper functions for more natural workflow
const getWordDuration = (word: Word): number => Math.max(TIMING.word.minDuration / 1000, word.endTime - word.startTime)
const getSyllableDuration = (syllable: Syllable): number => syllable.endTime - syllable.startTime

// Validate and fix word timing to prevent negative durations
const validateWordTiming = (word: Word): Word => {
  if (word.endTime <= word.startTime) {
    const minEndTime = word.startTime + TIMING.word.minDuration / 1000
    return {
      ...word,
      endTime: minEndTime
    }
  }
  return word
}

const setWordDuration = (word: Word, newDuration: number): Word => ({
  ...word,
  endTime: word.startTime + newDuration,
})

const moveWord = (word: Word, newStartTime: number): Word => {
  const duration = getWordDuration(word)
  return {
    ...word,
    startTime: newStartTime,
    endTime: newStartTime + duration,
  }
}

const startDrag = (type: 'move' | 'resize' | 'syllable', word: Word, event: MouseEvent, syllableIndex?: number) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  draggedWordId.value = word.id
  dragType.value = type
  dragStartX.value = event.clientX
  // Set drag start time based on operation type
  if (type === 'move') {
    dragStartTime.value = word.startTime
  } else if (type === 'resize') {
    dragStartTime.value = word.endTime
  } else if (type === 'syllable' && typeof syllableIndex === 'number' && word.syllables) {
    dragStartTime.value = word.syllables[syllableIndex].endTime
    dragSyllableIndex.value = syllableIndex
    console.log(`🎯 Starting syllable drag: word="${word.text}", syllable=${syllableIndex}, boundary=${dragStartTime.value.toFixed(3)}s`)
  }

  // Store original syllable proportions for this word (duration-based)
  if (word.syllables && word.syllables.length > 1) {
    const wordDuration = getWordDuration(word)
    originalSyllableProportions.value[word.id] = word.syllables.map(syllable => getSyllableDuration(syllable) / wordDuration)
  }

  selectedWordId.value = word.id
  emit('select-word', word.id)

  // Add global mouse event listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Add visual feedback
  document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !draggedWordId.value) return

  const deltaX = event.clientX - dragStartX.value
  const deltaTime = deltaX / pixelsPerSecond.value

  const wordIndex = props.words.findIndex(w => w.id === draggedWordId.value)
  if (wordIndex === -1) return

  const updatedWords = [...props.words]
  const word = { ...updatedWords[wordIndex] }

  // Get neighboring words for collision detection
  const previousWord = wordIndex > 0 ? props.words[wordIndex - 1] : null
  const nextWord = wordIndex < props.words.length - 1 ? props.words[wordIndex + 1] : null

  if (dragType.value === 'move') {
    // Move entire word - duration stays the same, only start time changes
    const wordDuration = getWordDuration(word)
    let newStartTime = Math.max(0, dragStartTime.value + deltaTime)

    // Debug: log original and calculated values
    console.log(`🔧 Moving "${word.text}": original=${word.startTime}-${word.endTime} (${wordDuration}s), newStart=${newStartTime}`)

    // Smart collision detection - allow swapping when words are overlapped
    const isMovingLeft = newStartTime < word.startTime
    const isMovingRight = newStartTime > word.startTime

    // Check if we're trying to move past an overlapped word
    const isPreviousOverlapped = previousWord && previousWord.endTime > word.startTime
    const isNextOverlapped = nextWord && nextWord.startTime < word.endTime

    console.log(`🔧 Collision check: movingLeft=${isMovingLeft}, movingRight=${isMovingRight}, prevOverlapped=${isPreviousOverlapped}, nextOverlapped=${isNextOverlapped}`)

    // Apply constraints, but allow swapping past overlapped words
    if (previousWord && !isPreviousOverlapped) {
      // Normal case: prevent overlap with non-overlapped previous word
      newStartTime = Math.max(newStartTime, previousWord.endTime + TIMING.word.collisionMargin / 1000)
    } else if (previousWord && isPreviousOverlapped && isMovingLeft) {
      // Allow moving left past overlapped previous word, but not too far
      const minStartTime = Math.max(0, previousWord.startTime - wordDuration - TIMING.word.collisionMargin / 1000)
      newStartTime = Math.max(newStartTime, minStartTime)
    }

    if (nextWord && !isNextOverlapped) {
      // Normal case: prevent overlap with non-overlapped next word
      const maxStartTime = nextWord.startTime - wordDuration - TIMING.word.collisionMargin / 1000
      newStartTime = Math.min(newStartTime, maxStartTime)
    } else if (nextWord && isNextOverlapped && isMovingRight) {
      // Allow moving right past overlapped next word, but not too far
      const maxStartTime = nextWord.endTime + TIMING.word.collisionMargin / 1000
      newStartTime = Math.min(newStartTime, maxStartTime)
    }

    // Also constrain to view window to prevent disappearing
    const viewportBuffer = TIMING.editor.viewportBuffer / 1000
    const maxViewStartTime = effectiveViewEnd.value - wordDuration - viewportBuffer
    newStartTime = Math.min(newStartTime, maxViewStartTime)
    newStartTime = Math.max(newStartTime, props.viewStart - viewportBuffer)

    // Apply the move (preserving duration)
    const movedWord = moveWord(word, newStartTime)
    console.log(`🔧 After moveWord: ${movedWord.startTime}-${movedWord.endTime}`)

    word.startTime = movedWord.startTime
    word.endTime = movedWord.endTime

    // Update syllable timings using stored proportions (preserving their durations)
    if (word.syllables && originalSyllableProportions.value[word.id]) {
      const proportions = originalSyllableProportions.value[word.id]
      let syllableStartTime = newStartTime

      word.syllables = word.syllables.map((syllable, index) => {
        const syllableDuration = proportions[index] * wordDuration
        const result = {
          ...syllable,
          startTime: syllableStartTime,
          endTime: syllableStartTime + syllableDuration,
        }
        syllableStartTime += syllableDuration
        return result
      })
    }
  } else if (dragType.value === 'resize') {
    // Resize duration - drag the end time directly
    let newEndTime = Math.max(word.startTime + TIMING.word.minDuration / 1000, dragStartTime.value + deltaTime)
    let newDuration = newEndTime - word.startTime

    // Constrain resize to not overlap with next word
    if (nextWord) {
      const maxDuration = nextWord.startTime - word.startTime - TIMING.word.collisionMargin / 1000
      newDuration = Math.min(newDuration, maxDuration)
      newEndTime = word.startTime + newDuration
    }

    // Constrain to reasonable view bounds
    const maxEndTime = effectiveViewEnd.value + TIMING.editor.viewportBuffer / 1000
    if (newEndTime > maxEndTime) {
      newDuration = maxEndTime - word.startTime
      newEndTime = maxEndTime
    }

    // Apply the new duration
    const resizedWord = setWordDuration(word, newDuration)
    word.endTime = resizedWord.endTime

    // DON'T redistribute syllables - keep them at absolute positions (like test rig)
    // User has carefully placed s-breaks and they should not move during word resize
    // if (word.syllables && word.syllables.length > 1) {
    //   word.syllables = distributeSyllableTiming(word, newDuration, word.syllables.length)
    // }
  } else if (dragType.value === 'syllable') {
    // Adjust syllable boundary
    if (word.syllables && dragSyllableIndex.value < word.syllables.length - 1) {
      const syllableMargin = TIMING.syllable.minDuration / 1000 / 2 // Half of min duration in seconds for boundary adjustment
      const newBoundaryTime = Math.max(
        word.syllables[dragSyllableIndex.value].startTime + syllableMargin,
        Math.min(word.syllables[dragSyllableIndex.value + 1].endTime - syllableMargin, dragStartTime.value + deltaTime)
      )

      // Debug logging for syllable boundary adjustment
      console.log(`🔧 Syllable boundary: "${word.syllables[dragSyllableIndex.value].text}" | "${word.syllables[dragSyllableIndex.value + 1].text}" → ${newBoundaryTime.toFixed(3)}s`)

      word.syllables[dragSyllableIndex.value].endTime = newBoundaryTime
      word.syllables[dragSyllableIndex.value + 1].startTime = newBoundaryTime
    }
  }

  // Validate and fix word timing before updating
  const validatedWord = validateWordTiming(word)

  updatedWords[wordIndex] = validatedWord

  // Emit immediately so parent gets syllable changes for s-break drags
  // Performance is now acceptable with direct syllable updates (no RelativeSyllableTiming recalc)
  const validatedWords = updatedWords.map(validateWordTiming)
  emit('update:words', validatedWords)
}

const handleMouseUp = () => {
  // Clear stored proportions for completed drag
  if (draggedWordId.value && originalSyllableProportions.value[draggedWordId.value]) {
    delete originalSyllableProportions.value[draggedWordId.value]
  }

  isDragging.value = false
  draggedWordId.value = null

  // Remove global listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // Reset cursor
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Smart syllable timing distribution (musical pattern: shorter first, longer last)
// const distributeSyllableTiming = (word: Word, totalDuration: number, syllableCount: number): Syllable[] => {
//   if (!word.syllables || syllableCount <= 1) return word.syllables || []

//   // Use centralized syllable weighting system
//   const weights = TimingUtils.calculateSyllableWeights(syllableCount)

//   const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
//   const syllableDurations = weights.map(weight => (weight / totalWeight) * totalDuration)

//   let currentTime = word.startTime
//   return word.syllables
//     .map((syllable, index) => ({
//       ...syllable,
//       startTime: currentTime,
//       endTime: currentTime + syllableDurations[index],
//     }))
//     .map((syllable, index, array) => {
//       currentTime = syllable.endTime
//       // Ensure last syllable ends exactly at word end
//       if (index === array.length - 1) {
//         syllable.endTime = word.endTime
//       }
//       return syllable
//     })
// }

// Setup timeline width on mount
onMounted(async () => {
  await nextTick() // Wait for DOM to be fully rendered

  const updateTrackWidth = () => {
    if (timelineTrack.value) {
      const newWidth = timelineTrack.value.clientWidth
      if (newWidth > 0) {
        trackWidth.value = newWidth
        // console.log('📏 Track width updated:', newWidth)
      }
    }
  }

  updateTrackWidth()

  // Also update after another tick in case the parent container is still sizing
  setTimeout(updateTrackWidth, 100)

  window.addEventListener('resize', updateTrackWidth)

  onUnmounted(() => {
    window.removeEventListener('resize', updateTrackWidth)
  })
})

// Watch for changes that might affect layout
watch([() => props.viewStart, () => props.viewEnd, () => props.duration], () => {
  // console.log('🔄 WordTimingEditor props changed:', {
  //   viewStart: {
  //     old: oldValues?.[0], new: newValues[0]
  //   },
  //   viewEnd: {
  //     old: oldValues?.[1], new: newValues[1]
  //   },
  //   duration: {
  //     old: oldValues?.[2], new: newValues[2]
  //   }
  // })

  // Update track width when view parameters change
  nextTick(() => {
    if (timelineTrack.value) {
      const newWidth = timelineTrack.value.clientWidth
      if (newWidth > 0 && newWidth !== trackWidth.value) {
        trackWidth.value = newWidth
        // console.log('📏 Track width updated (via watcher):', newWidth)
      }
    }
  })
}, { flush: 'post' })

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.word-timing-editor {
  width: 100%;
  margin: 5px 0px;
  padding: 0px 4px
}

.timeline-track {
  position: relative;
  height: 40px;
  overflow: hidden;
}

/* Optional background styling */
.timeline-track.with-background {
  background: linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Optional border styling */
.timeline-track.with-border {
  border: 1px solid #c4c4c4;
  border-radius: 6px;
}

/* The 1px black horizontal line (train track) */
.timeline-baseline {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #bbbbbb;
  z-index: 1;
}

/* Word boxes (train cars) */
.word-car {
  position: absolute;
  top: 50%;
  height: 28px;
  transform: translateY(-50%);
  background: #e3f2fd;
  border: 1px solid #1976d2;
  border-radius: 3px;
  cursor: grab;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.word-car:hover {
  background: #bbdefb;
  border-color: #1565c0;
  z-index: 15;
}

.word-car:hover .word-text {
  color: #0a3a7a;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 1);
}

.word-car.untimed {
  background: #fff8e1;
  border: 2px dashed #ff8f00;
  border-color: #ff8f00;
  opacity: 0.8;
}

.word-car.untimed:hover {
  background: #fff3e0;
  opacity: 1;
  border-style: solid;
}

.word-car.selected {
  background: #fff3e0;
  border-color: #f57c00;
  box-shadow: 0 0 0 2px rgba(245, 124, 0, 0.4);
  z-index: 20;
}

.word-car.selected .word-text {
  color: #bf360c;
  font-weight: 600;
  text-shadow: none;
}

.word-car.dragging {
  cursor: grabbing;
  z-index: 25;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background: #fff8e1;
  border-color: #ff8f00;
}

.word-car.dragging .word-text {
  color: #ef6c00;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 1);
}

.word-text {
  color: #0d47a1;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
  padding: 0 6px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
}

/* Hot spots for interaction */
.hotspot {
  position: absolute;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 2px;
  z-index: 30;
}

.hotspot-move {
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  cursor: grab;
}

.hotspot-move:hover {
  background: rgba(255, 255, 255, 0.9);
}

.hotspot-resize-end {
  top: -2px;
  right: -4px;
  width: 8px;
  height: calc(100% + 4px);
  cursor: col-resize;
  background: rgba(76, 175, 80, 0.8);
  border-radius: 0 3px 3px 0;
  border: 1px solid rgba(76, 175, 80, 1);
}

.hotspot-resize-end:hover {
  background: rgba(76, 175, 80, 1);
  width: 10px;
  right: -5px;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
}

.hotspot-syllable-divider {
  top: -2px;
  width: 6px;
  height: calc(100% + 4px);
  cursor: col-resize;
  background: rgba(255, 152, 0, 0.8);
  transform: translateX(-3px);
  border-radius: 2px;
  border: 1px solid rgba(255, 152, 0, 1);
}

.hotspot-syllable-divider:hover {
  background: rgba(255, 152, 0, 1);
  width: 8px;
  transform: translateX(-4px);
  box-shadow: 0 0 4px rgba(255, 152, 0, 0.6);
}

/* Debug panel */
.debug-panel {
  margin-top: 10px;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.debug-panel h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-family: inherit;
}

.debug-panel p {
  margin: 2px 0;
  line-height: 1.4;
}

.selected-word-debug {
  margin-top: 8px;
  padding: 8px;
  background: #e9ecef;
  border-radius: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.selected-word-debug pre {
  margin: 4px 0 0 0;
  font-size: 10px;
  line-height: 1.2;
}

.word-timing-summary {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.timing-info {
  background: #d1ecf1;
  padding: 4px 6px;
  border-radius: 3px;
  margin: 4px 0;
  border-left: 3px solid #0c5460;
}

.syllable-durations {
  margin-top: 6px;
}

.syllable-info {
  padding: 2px 4px;
  margin: 1px 0;
  background: #fff3cd;
  border-radius: 2px;
  font-size: 10px;
}

details {
  margin-top: 8px;
}

summary {
  cursor: pointer;
  font-size: 10px;
  color: #6c757d;
}
</style>
