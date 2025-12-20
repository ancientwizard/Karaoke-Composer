<template>
  <div class="developer-view">
    <div class="tabs">
      <button
        v-for="tab in availableTabs"
        :key="tab"
        class="tab-button"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <section class="section" v-show="activeTab === 'Glyph Alignment'">
      <div class="playback-controls">
        <button @click="togglePlayback" class="play-btn">
          {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
        </button>
        <button @click="generateGlyphTest">Generate Test</button>
        <button @click="clearCanvas">Clear</button>
        
        <label class="checkbox-label">
          <input v-model="autoRepeat" type="checkbox" />
          Auto-repeat (1.1s rest)
        </label>

        <label class="checkbox-label">
          Playback Speed:
          <input 
            v-model.number="playbackSpeed" 
            type="range" 
            min="0.1" 
            max="2" 
            step="0.1"
            style="width: 100px; margin: 0 0.5rem;"
          />
          {{ (playbackSpeed * 100).toFixed(0) }}%
        </label>

        <div class="playback-time">
          {{ formatTime(currentTimeMs) }} / {{ formatTime(totalDurationMs) }}
          (Packet {{ currentPacketIndex }} / {{ totalPackets }})
        </div>
      </div>

      <div class="demo-container">
        <CDGCanvasDisplay
          :pixel-data="vramPixelData"
          :palette="glyphPalette"
        />
      </div>

      <div>
        Lyrics:
          <div style="font-family: monospace; white-space: nowrap; padding: 8px; background: #1e1e1e; border: 1px solid #444; min-height: 60px; color: #0f0;">
            <div v-for="(line, idx) in visibleLyricLines" :key="idx">
              {{ line.words.map(word => word.word).join(' ') }}
            </div>
            <div v-if="visibleLyricLines.length === 0" style="color: #888;">
              (no lyrics visible at {{ formatTime(currentTimeMs) }})
            </div>
          </div>
      </div>

      <div class="info-panel">
        <div>Total Packets: {{ totalPackets }}</div>
        <div>Total Duration: {{ formatTime(totalDurationMs) }}</div>
        <div>Current Packet: {{ currentPacketIndex }}</div>
        <div>Packets per second: 300</div>
        <div>Display refresh: 75 fps</div>
        <div>Pixels set: {{ diagnostics.pixelCount }}</div>
        <div>Colors: {{ Object.keys(diagnostics.colorCounts).join(', ') || 'none' }}</div>
        <div>Last render: {{ diagnostics.lastRender }}</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * DeveloperView - Glyph Alignment Testing
 *
 * Real-time glyph rendering playground:
 * - Renders glyphs at various positions
 * - Validates pixel/tile alignment
 * - Plays packets with proper timing
 * - Auto-repeat with configurable rest period
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CDGCanvasDisplay from '@/components/CDGCanvasDisplay.vue'
import { VRAM } from '@/cdg/encoder'
import { renderGlyphToVRAM } from '@/cdg/glyph-renderer'
import { CDGFont } from '@/karaoke/renderers/cdg/CDGFont'
import { parseLyricsWithMetadata } from '@/utils/lyricsParser'
import type { LyricLine } from '@/types/karaoke'
import { NOVEMBER_LYRICS } from '@/utils/novemberLyrics'
import { TextLayoutEngine, DEFAULT_LAYOUT_CONFIG } from '@/karaoke/presentation/TextLayoutEngine'
import { LineLeaseManager } from '@/karaoke/presentation/LineLeaseManager'
import { TextAlign } from '@/karaoke/presentation/PresentationCommand'
import type { Position } from '@/karaoke/presentation/PresentationCommand'

import { CDG, DefaultPalette, ColorUtils } from '@/cdg/constants'
import type { GlyphData } from '@/cdg/glyph-renderer'

const activeTab = ref('Glyph Alignment')
const availableTabs = ['Glyph Alignment']
const font = new CDGFont()
const layoutEngine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
const leaseManager = new LineLeaseManager()
const lyricLines = ref<LyricLine[]>([])
const isPlaying = ref(false)
const autoRepeat = ref(true)
const currentTimeMs = ref(0)
const playbackSpeed = ref(1.0) // Dial from 0.1x to 2x speed

// Timing configuration for syllable display
// Adjust these values to change pacing, gaps, and breaks
const TIMING_CONFIG = {
  // Syllable durations (in milliseconds)
  syllableDurationFirst:  100,   // First syllable in a word (quicker start)
  syllableDurationMiddle: 200,   // Middle syllables
  syllableDurationLast:   250,   // Last syllable (lingering)
  
  // Gaps and breaks (in milliseconds)
  gapBetweenSyllables:  25,      // Breathing space between syllables
  gapBetweenWords:     150,      // Space between words
  // Large gap between actual lines/phrases/ a verse, bridge for example
  //  (NOT! applied to line wraps where our modlel breaks lines as a natural behavior to make things fit nicely)
  gapBetweenLines:     800
}

const vramPixelData = ref(new Uint8Array(CDG.screenWidth * CDG.screenHeight).fill(0))
const canvasRefreshKey = ref(0)
const diagnostics = ref({
  pixelCount: 0,
  colorCounts: {} as Record<number, number>,
  lastRender: ''
})
// Cache layout positions for each line to avoid recalculating every frame
const lineLayoutCache = new Map<string, any>()

let vram: VRAM | null = null
let animationFrameId: number | null = null
let lastFrameTime = 0
const packets = ref<Uint8Array[]>([])

const PACKETS_PER_SECOND = 300
const MS_PER_PACKET = 1000 / PACKETS_PER_SECOND

const glyphPalette = computed(() =>
{
  const toHex = (rgb: any) =>
  {
    const cdg = ColorUtils.rgb8ToCDG4(rgb)
    return (cdg.r4 << 8) | (cdg.g4 << 4) | cdg.b4
  }
  return [
    toHex(DefaultPalette.black),
    toHex(DefaultPalette.yellow),
    toHex(DefaultPalette.lightGray),
    toHex(DefaultPalette.white),
    0x0048, 0x048F, 0x08FF, 0x0FFF,
    0x0888, 0x0F88, 0x088F, 0x0F8F,
    0x0888, 0x0F88, 0x088F, 0x0FFF
  ]
})

const totalPackets = computed(() => packets.value.length)
const totalDurationMs = computed(() => totalPackets.value * MS_PER_PACKET)
const currentPacketIndex = computed(() => Math.floor(currentTimeMs.value / MS_PER_PACKET))

// Show only lines that are currently playing or near current time
const visibleLyricLines = computed(() =>
{
  const lines = lyricLines.value.filter(line =>
  {
    const lineStart = line.startTime ?? 0
    const lineEnd = line.endTime ?? 0
    // Show lines that are currently playing or up to 2 seconds after they end
    const showWindow = 2000
    return currentTimeMs.value >= lineStart - 500 && currentTimeMs.value <= lineEnd + showWindow
  })
  return lines
})

function formatTime(ms: number): string
{
  const sec = Math.floor(ms / 1000)
  const msec = Math.floor(ms % 1000)
  return `${sec}.${msec.toString().padStart(3, '0')}s`
}

function togglePlayback(): void
{
  isPlaying.value = !isPlaying.value
  if (isPlaying.value)
  {
    lastFrameTime = performance.now()
    scheduleFrame()
  }
}

function resetPlayback(): void
{
  isPlaying.value = false
  currentTimeMs.value = 0
}

function clearCanvas(): void
{
  if (vram)
  {
    vram.clear(0)
    updateCanvasFromVRAM()
  }
  resetPlayback()
}

function generateGlyphTest(): void
{
  if (!vram)
  {
    vram = new VRAM()
  }

  packets.value = []
  vram.clear(0)
  lineLayoutCache.clear()  // Clear cached layouts for new test
  leaseManager.reset()  // Reset line leasing for new song

  // Use the COMPLETE "Meet Me In November" song from the source file
  const { lyrics } = parseLyricsWithMetadata(NOVEMBER_LYRICS)
  lyricLines.value = lyrics.filter(line => line.type === 'lyrics' || !line.type)

  // Assign SYLLABLE timing with realistic durations
  // Slower, readable pace: 300-500ms per syllable depending on word position
  let currentTime = 0

  lyricLines.value.forEach((line) =>
  {
    line.words.forEach((word) =>
    {
      word.syllables.forEach((syllable, sylIdx) =>
      {
        // Use TIMING_CONFIG to set syllable duration
        let duration: number
        if (sylIdx === 0 && word.syllables.length > 1)
        {
          duration = TIMING_CONFIG.syllableDurationFirst
        }
        else
        if (sylIdx === word.syllables.length - 1)
        {
          duration = TIMING_CONFIG.syllableDurationLast
        }
        else
          duration = TIMING_CONFIG.syllableDurationMiddle

        syllable.startTime = currentTime
        syllable.endTime = currentTime + duration
        currentTime += duration + TIMING_CONFIG.gapBetweenSyllables
      })

      // Word's timing is span of its syllables
      if (word.syllables.length > 0)
      {
        word.startTime = word.syllables[0].startTime
        word.endTime = word.syllables[word.syllables.length - 1].endTime
      }

      // Add extra gap after each word
      currentTime += TIMING_CONFIG.gapBetweenWords
    })

    // Line's timing is span of its words
    if (line.words.length > 0)
    {
      line.startTime = line.words[0].startTime
      line.endTime = line.words[line.words.length - 1].endTime
    }

    // Lease a Y position for this line based on its timing
    // This implements the "page view" model where lines flow from bottom to top
    leaseManager.leasePosition(line.id, line.startTime || 0, line.endTime || 0)

    // Larger gap between ACTUAL lyric lines (phrases/verses)
    // This is a property of the lyrics structure, NOT screen line wrapping
    currentTime += TIMING_CONFIG.gapBetweenLines
  })

  // Calculate total duration
  const maxTime = Math.max(...lyricLines.value.flatMap(line =>
    line.words.flatMap(word =>
      word.syllables.map(s => s.endTime || 0)
    )
  ))
  const totalDuration = maxTime + 1000
  const totalPktCount = Math.floor(totalDuration * 300 / 1000) + 100

  for (let i = 0; i < totalPktCount; i++)
  {
    packets.value.push(new Uint8Array(24).fill(0))
  }

  isPlaying.value = false
  currentTimeMs.value = 0
}

function createCharGlyph(char: string): GlyphData
{
  const glyph = font.getGlyph(char)
  return {
    width: glyph.width,
    rows: glyph.rows
  }
}

function updateCanvasFromVRAM(): void
{
  if (!vram)
    return

  const pixels = new Uint8Array(CDG.screenWidth * CDG.screenHeight)
  const colorCounts: Record<number, number> = {}
  let pixelCount = 0

  for (let y = 0; y < CDG.screenHeight; y++)
  {
    for (let x = 0; x < CDG.screenWidth; x++)
    {
      const color = vram.getPixel(x, y)
      pixels[y * CDG.screenWidth + x] = color
      if (color !== 0)
      {
        pixelCount++
        colorCounts[color] = (colorCounts[color] || 0) + 1
      }
    }
  }
  vramPixelData.value = pixels
  diagnostics.value = {
    pixelCount,
    colorCounts,
    lastRender: new Date().toLocaleTimeString()
  }
  canvasRefreshKey.value++
}

function scheduleFrame(): void
{
  animationFrameId = requestAnimationFrame(onFrame)
}

function onFrame(now: number): void
{
  if (!isPlaying.value || !vram)
    return

  const elapsed = now - lastFrameTime
  lastFrameTime = now
  // Apply playback speed multiplier to slow things down
  currentTimeMs.value += elapsed * playbackSpeed.value

  if (currentTimeMs.value >= totalDurationMs.value)
  {
    if (autoRepeat.value)
    {
      currentTimeMs.value = 0
    }
    else
    {
      isPlaying.value = false
      return
    }
  }

  vram.clear(0)

  const timeMs = currentTimeMs.value
  const COLOR_UNHIGHLIGHTED = 15  // White
  const COLOR_HIGHLIGHTED = 15    // Also white (will use intensity for highlighting)

  // Render only visible lines to avoid overlapping/breaking
  const linesToRender = visibleLyricLines.value
  
  if (linesToRender.length > 0)
  {
    // Use TextLayoutEngine + LineLeaseManager to position lyrics
    linesToRender.forEach((line) =>
    {
      // Get full text for this line
      const fullText = line.words.map(word => word.word).join(' ')
      
      // Get the leased Y position for this line (in abstract 0-1000 space)
      // If no lease, fall back to default position (for backward compatibility)
      const leasedYPosition = leaseManager.getPosition(line.id) ?? layoutEngine.getDefaultVerticalPosition()
      
      // Use cached layout or create new one with the leased Y position
      let layout = lineLayoutCache.get(line.id)
      if (!layout)
      {
        // Calculate layout using the Y position (consistent across frames)
        layout = layoutEngine.layoutText(fullText, TextAlign.Center, leasedYPosition)
        lineLayoutCache.set(line.id, layout)
      }

      // TextLayoutEngine already returns pixel coordinates (0-300 x 0-216)
      // No need to scale; use positions directly

      // Render the full text using positions from layout
      // We iterate through fullText to match the character positions calculated by TextLayoutEngine
      let positionIndex = 0 // Track position in layout.charPositions
      for (let charIdx = 0; charIdx < fullText.length; charIdx++)
      {
        const char = fullText[charIdx]
        
        // Spaces have positions but we don't render them visually
        if (char === ' ')
        {
          positionIndex++ // Skip the position for this space
          continue
        }
        
        const glyph = createCharGlyph(char)

        // Determine if this character is highlighted based on syllable timing
        let isHighlighted = false
        let charCountSoFar = 0
        
        // Find which syllable this character belongs to
        for (const word of line.words)
        {
          for (const syl of word.syllables)
          {
            const sylStart = charCountSoFar
            const sylEnd = charCountSoFar + syl.syllable.length
            
            if (charIdx >= sylStart && charIdx < sylEnd)
            {
              // This character is in this syllable
              if (syl.startTime !== undefined && syl.endTime !== undefined &&
                  timeMs >= syl.startTime && timeMs <= syl.endTime)
              {
                isHighlighted = true
              }
              break
            }
            charCountSoFar += syl.syllable.length
          }
          if (isHighlighted) break // Found the syllable, no need to continue
          charCountSoFar++ // Account for space between words
        }

        const colorIndex = isHighlighted ? COLOR_HIGHLIGHTED : COLOR_UNHIGHLIGHTED

        // Get character position from layout using the position index (not charIdx, since we skip spaces)
        if (positionIndex < layout.charPositions.length)
        {
          const charPos = layout.charPositions[positionIndex]
          const screenX = Math.floor(charPos.x)
          const screenY = Math.floor(charPos.y)

          if (vram && screenX >= 0 && screenX < CDG.screenWidth && screenY >= 0 && screenY < CDG.screenHeight)
          {
            renderGlyphToVRAM(vram, screenX, screenY, glyph, colorIndex)
          }
        }
        
        positionIndex++ // Move to next position in layout
      }
    })
  }

  updateCanvasFromVRAM()

  scheduleFrame()
}

onMounted(() =>
{
  vram = new VRAM()
  generateGlyphTest()
})

onUnmounted(() =>
{
  if (animationFrameId !== null)
  {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.developer-view
{
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.tabs
{
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--color-border, #ddd);
}

.tab-button
{
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  color: var(--color-text-muted, #666);
  font-weight: 500;
  transition: all 0.2s;
}

.tab-button:hover
{
  color: var(--color-text, #333);
}

.tab-button.active
{
  color: var(--color-text, #333);
  border-bottom-color: #007bff;
}

.section
{
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  background: var(--color-surface, #fafafa);
}

.playback-controls
{
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: var(--color-background, #fff);
  border-radius: 4px;
}

.play-btn
{
  min-width: 100px;
  font-weight: bold;
}

.checkbox-label
{
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input
{
  cursor: pointer;
}

.playback-time
{
  font-family: monospace;
  font-size: 0.75rem;
  color: #007bff;
  min-width: 300px;
  background: #f0f8ff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.demo-container
{
  margin: 1.5rem 0;
  background: var(--color-background, #fff);
  border-radius: 4px;
  overflow: auto;
  border: 2px solid var(--color-border, #ddd);
}

.info-panel
{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-background, #fff);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
}

.info-panel div
{
  padding: 0.5rem;
  border-left: 3px solid var(--color-border, #ddd);
  padding-left: 0.75rem;
}

button
{
  padding: 0.5rem 1rem;
  background: var(--color-button-bg, #007bff);
  color: var(--color-button-text, #fff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

button:hover
{
  background: var(--color-button-hover, #0056b3);
}

button:active
{
  opacity: 0.8;
}
</style>

// VIM: set filetype=vue :
// END
