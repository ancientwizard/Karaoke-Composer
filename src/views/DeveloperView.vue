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

        <div style="flex: 1; min-width: 300px; border-left: 1px solid #ccc; padding-left: 1rem;">
          <label class="checkbox-label">
            <strong>Glyph Source:</strong>
            <select v-model="glyphSource" style="margin: 0 0.5rem;">
              <option value="static">Static CDGFont (Fixed)</option>
              <option value="dynamic">Dynamic Rasterizer (Browser Font)</option>
            </select>
          </label>
          <div v-if="glyphSource === 'dynamic'" style="margin-top: 0.5rem;">
            <label>
              Font:
              <input v-model="dynamicFontFamily" type="text" placeholder="Arial" style="width: 100px; margin: 0 0.5rem;" />
            </label>
            <label>
              Size:
              <input v-model.number="dynamicFontSize" type="range" min="8" max="48" step="2" style="width: 80px; margin: 0 0.5rem;" />
              {{ dynamicFontSize }}px
            </label>
          </div>
        </div>

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
        Lyrics (Placeable Lines):
          <div style="font-family: monospace; white-space: nowrap; padding: 8px; background: #1e1e1e; border: 1px solid #444; min-height: 60px; color: #0f0;">
            <div v-for="(line, idx) in visibleLyricLines" :key="idx" style="margin: 2px 0;">
              [Y{{ line.leasedYPosition.toFixed(0) }}] {{ line.text }}
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
        <div style="grid-column: 1 / -1; padding-top: 1rem; border-top: 1px solid #ccc; margin-top: 1rem;">
          <strong>Glyph Source:</strong> {{ glyphSource === 'static' ? 'Static CDGFont (Fixed)' : `Dynamic Rasterizer (${dynamicFontFamily}, ${dynamicFontSize}px)` }}
        </div>
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
import { DynamicGlyphRasterizer } from '@/cdg/DynamicGlyphRasterizer'
import { parseLyricsWithMetadata } from '@/utils/lyricsParser'
import type { LyricLine } from '@/types/karaoke'
import { NOVEMBER_LYRICS } from '@/utils/novemberLyrics'
import { TextLayoutEngine, DEFAULT_LAYOUT_CONFIG } from '@/karaoke/presentation/TextLayoutEngine'
import { LineLeaseManager } from '@/karaoke/presentation/LineLeaseManager'
import { TextAlign } from '@/karaoke/presentation/Command'

import { CDG, DefaultPalette, ColorUtils } from '@/cdg/constants'
import type { GlyphData } from '@/cdg/glyph-renderer'
import { TextRenderQueue } from '@/karaoke/presentation/TextRenderQueue'

/**
 * Placeable Line - A unit of text that will occupy one screen row
 * When a lyric unit (from source lyrics) is too long to fit one row,
 * it's split into multiple placeable lines, each with its own timing and row lease.
 */
interface PlaceableLine
{
  id: string                    // Unique ID for this placeable line
  sourceId: string              // Original lyric unit ID
  text: string                  // The text to render on this row
  startTime: number
  endTime: number
  words: any[]                  // References to word objects for syllable highlighting
  leasedYPosition: number       // Y position (in abstract 0-1000 space) assigned during composition
}

const activeTab = ref('Glyph Alignment')
const availableTabs = ['Glyph Alignment']
const font = new CDGFont()
const dynamicRasterizer = new DynamicGlyphRasterizer()
const layoutEngine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
const leaseManager = new LineLeaseManager()
const renderQueue = new TextRenderQueue(14)  // 14 pixels per line (12px glyph + 2px gap)
const isPlaying = ref(false)
const autoRepeat = ref(true)
const currentTimeMs = ref(0)
const playbackSpeed = ref(0.5) // Dial from 0.1x to 2x speed

// Glyph source selection
const glyphSource = ref<'static' | 'dynamic'>('dynamic')  // Use dynamic rasterizer by default
const dynamicFontFamily = ref('Arial')
const dynamicFontSize = ref(16)

// Track placeable lines (compositions of source lyric units)
const placeableLines = ref<PlaceableLine[]>([])

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
// Track actual rendered bounding boxes for each line (for precise clearing)
const lineRenderBounds = new Map<string, { minY: number; maxY: number }>()
// Track which Y position (row) each line is using for display
const lineRowAssignments = new Map<string, number>()

let vram: VRAM | null = null
let vramPristine: VRAM | null = null  // Pristine copy (before text rendering)
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
  const lines = placeableLines.value.filter((line) =>
  {
    const lineStart = line.startTime
    const lineEnd = line.endTime
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

/**
 * Pre-compose lyric units into placeable lines
 * 
 * A lyric unit (from source) may be too long to fit on one screen row.
 * This function detects that and splits it into multiple placeable lines,
 * each guaranteed to fit on its own row.
 * 
 * Uses LOOK-AHEAD to detect when multiple lines from the same source
 * won't fit together at the current scroll position, and leaps them to
 * the top together to keep related content grouped.
 * 
 * During composition, we also REQUEST a screen row lease from LineLeaseManager
 * for each placeable line. This lease is assigned ONCE and stored in the
 * placeable line object. This ensures consistent positioning throughout playback.
 * 
 * Each placeable line gets:
 * - Its own unique ID (sourceId + row number)
 * - A leased Y position (from LineLeaseManager)
 * - The same timing as its source (so all parts highlight together)
 * - A reference to the word/syllable structure for proper highlighting
 */
function composeSourceLyricsToPlaceableLines(lyricUnits: LyricLine[]): PlaceableLine[]
{
  const placeable: PlaceableLine[] = []

  lyricUnits.forEach((unit, unitIdx) =>
  {
    const fullText = unit.words.map(w => w.word).join(' ')
    
    // Use TextLayoutEngine to detect if this text will wrap
    // (i.e., break into multiple layout lines)
    const layout = layoutEngine.layoutText(fullText, TextAlign.Center, 0)
    
    if (layout.lines.length === 1)
    {
      // Fits on one row - straightforward
      // Lease a Y position for this placeable line
      const leasedYPosition = leaseManager.leasePosition(unit.id, unit.startTime || 0, unit.endTime || 0)
      
      placeable.push({
        id: `${unit.id}:0`,
        sourceId: unit.id,
        text: fullText,
        startTime: unit.startTime || 0,
        endTime: unit.endTime || 0,
        words: unit.words,
        leasedYPosition  // Store the leased position
      })
    }
    else
    {
      // Text spans multiple rows
      const numLinesThisUnit = layout.lines.length
      
      // Check if leasing these lines individually would cause them to wrap across boundary
      // by peeking at available positions starting from next lease point
      const wouldSplitAcrossBoundary = leaseManager.wouldSplitAcrossBoundary(
        unit.id,
        unit.startTime || 0,
        unit.endTime || 0,
        numLinesThisUnit
      )
      
      let positions: number[]
      
      if (wouldSplitAcrossBoundary)
      {
        // Lines would split - request grouped lease to keep them together
        positions = leaseManager.leasePositionGroup(
          unit.id,
          unit.startTime || 0,
          unit.endTime || 0,
          numLinesThisUnit
        )
      }
      else
      {
        // Lines fit contiguously - lease individually
        positions = []
        for (let i = 0; i < numLinesThisUnit; i++)
        {
          const yPos = leaseManager.leasePosition(
            `${unit.id}:${i}`,
            unit.startTime || 0,
            unit.endTime || 0
          )
          positions.push(yPos)
        }
      }

      // Assign lines to placeable array using leased positions
      layout.lines.forEach((lineText, lineIdx) =>
      {
        placeable.push({
          id: `${unit.id}:${lineIdx}`,
          sourceId: unit.id,
          text: lineText,
          startTime: unit.startTime || 0,
          endTime: unit.endTime || 0,
          words: unit.words,  // Keep reference for highlighting
          leasedYPosition: positions[lineIdx]  // Use leased position
        })
      })
    }
  })

  return placeable
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
  renderQueue.reset()
  lineRenderBounds.clear()
  lineRowAssignments.clear()
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
  lineRenderBounds.clear() // Clear tracked render bounds for new test
  lineRowAssignments.clear() // Clear row assignments for new test
  placeableLines.value = [] // Clear placeable lines
  leaseManager.reset()  // Reset line leasing for new song
  renderQueue.reset()  // Reset render queue for new test

  // IMPORTANT: After background setup (palettes, tiles, etc.) we save pristine state
  // This pristine copy will be restored each frame before rendering text
  // This allows expired text to vanish without destroying background imagery
  vramPristine = new VRAM()
  for (let y = 0; y < CDG.screenHeight; y++)
  {
    for (let x = 0; x < CDG.screenWidth; x++)
    {
      vramPristine.setPixel(x, y, vram.getPixel(x, y))
    }
  }

  // Use the COMPLETE "Meet Me In November" song from the source file
  const { lyrics } = parseLyricsWithMetadata(NOVEMBER_LYRICS)
  const sourcelyricUnits = lyrics.filter(line => line.type === 'lyrics' || !line.type)

  // Assign SYLLABLE timing with realistic durations
  // Slower, readable pace: 300-500ms per syllable depending on word position
  let currentTime = 0

  sourcelyricUnits.forEach((unit) =>
  {
    unit.words.forEach((word) =>
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

    // Unit's timing is span of its words
    if (unit.words.length > 0)
    {
      unit.startTime = unit.words[0].startTime
      unit.endTime = unit.words[unit.words.length - 1].endTime
    }

    // Larger gap between ACTUAL lyric units (phrases/verses)
    currentTime += TIMING_CONFIG.gapBetweenLines
  })

  // Pre-compose source lyric units into placeable lines
  // This detects which units are too long and splits them into multiple rows
  const composed = composeSourceLyricsToPlaceableLines(sourcelyricUnits)
  placeableLines.value = composed

  // Calculate total duration from source lyric units
  const maxTime = Math.max(...sourcelyricUnits.flatMap(line =>
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
  if (glyphSource.value === 'dynamic')
  {
    return dynamicRasterizer.getGlyph(char, dynamicFontFamily.value, dynamicFontSize.value)
  }
  else
  {
    // Static CDGFont
    const glyph = font.getGlyph(char)
    return {
      width: glyph.width,
      rows: glyph.rows
    }
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
      // Before restarting, clear all remaining rendered lines from lineRenderBounds
      // Ensure a clean slate for the next cycle
      for (const [lineId, bounds] of lineRenderBounds.entries())
      {
        if (vramPristine)
        {
          for (let y = bounds.minY; y <= bounds.maxY; y++)
          {
            for (let x = 0; x < CDG.screenWidth; x++)
            {
              const bgPixel = vramPristine.getPixel(x, y)
              vram.setPixel(x, y, bgPixel)
            }
          }
        }
      }
      // Clear all tracking after cleaning screen
      lineRenderBounds.clear()
      lineLayoutCache.clear()
      lineRowAssignments.clear()
      leaseManager.reset()
      
      // Reset to start of song
      currentTimeMs.value = 0
    }
    else
    {
      isPlaying.value = false
      return
    }
  }

  const timeMs = currentTimeMs.value

  // LIFECYCLE STEP 1: Clear expired text regions using ACTUAL rendered bounds
  // Use the real Y ranges where text was actually rendered, not estimated positions
  for (const [lineId, bounds] of lineRenderBounds.entries())
  {
    // Check if this line has expired
    const line = placeableLines.value.find(l => l.id === lineId)
    if (line && timeMs > line.endTime)
    {
      // Clear the actual region where this line was rendered
      if (vramPristine)
      {
        for (let y = bounds.minY; y <= bounds.maxY; y++)
        {
          for (let x = 0; x < CDG.screenWidth; x++)
          {
            const bgPixel = vramPristine.getPixel(x, y)
            vram.setPixel(x, y, bgPixel)
          }
        }
      }
      // Mark for removal (don't modify map while iterating)
      lineRenderBounds.delete(lineId)
    }
  }

  const COLOR_UNHIGHLIGHTED = 15  // White
  const COLOR_HIGHLIGHTED = 15    // Also white (will use intensity for highlighting)

  // LIFECYCLE STEP 2: Render only VISIBLE (non-expired) lines
  // These write into VRAM, modifying its state
  const linesToRender = visibleLyricLines.value
  
  if (linesToRender.length > 0)
  {
    // Render each placeable line at its pre-assigned Y position
    // (assigned during composition phase, not re-leased each frame)
    linesToRender.forEach((placeable) =>
    {
      // Use the Y position assigned during composition
      const leasedYPosition = placeable.leasedYPosition
      
      // Store for display in Lyrics box
      lineRowAssignments.set(placeable.id, leasedYPosition)
      
      // Get full text for this placeable line
      const fullText = placeable.text
      
      // Use cached layout or create new one with the assigned Y position
      let layout = lineLayoutCache.get(placeable.id)
      if (!layout)
      {
        // For dynamic glyphs, calculate positions using actual glyph widths
        // For static glyphs, use TextLayoutEngine estimation
        if (glyphSource.value === 'dynamic')
        {
          // Convert abstract Y position (0-1000) to pixel Y coordinate
          const pixelY = Math.round((leasedYPosition / 1000) * CDG.screenHeight)
          
          // Build custom layout with actual rasterized glyph widths
          const charPositions: Array<{ x: number; y: number }> = []
          const charWidths: number[] = []
          const charSpacing = Math.max(1, Math.ceil(dynamicFontSize.value * 0.15))  // ~15% of font size

          // First pass: measure each character
          for (let i = 0; i < fullText.length; i++)
          {
            const char = fullText[i]
            const glyph = createCharGlyph(char)
            charWidths.push(glyph.width)
          }

          // Calculate total width with spacing
          const totalWidth = charWidths.reduce((sum, w) => sum + w, 0) + 
                           (charWidths.length - 1) * charSpacing

          // Start position (centered horizontally)
          let cursorX = Math.max(0, (CDG.screenWidth - totalWidth) / 2)

          // Build positions
          for (let i = 0; i < fullText.length; i++)
          {
            charPositions.push({ x: cursorX, y: pixelY })
            cursorX += charWidths[i] + charSpacing
          }

          layout = { lines: [fullText], charPositions }
        }
        else
        {
          // Use TextLayoutEngine for static glyphs
          layout = layoutEngine.layoutText(fullText, TextAlign.Center, leasedYPosition)
        }
        lineLayoutCache.set(placeable.id, layout)
      }

      // TextLayoutEngine already returns pixel coordinates (0-300 x 0-216)
      // No need to scale; use positions directly

      // Track bounds of actual rendered glyphs for this placeable line
      let lineMinY = CDG.screenHeight
      let lineMaxY = 0

      // Render the text using positions from layout
      // charPositions array includes positions for ALL characters (including spaces)
      // We iterate through fullText and use charIdx to access charPositions directly
      for (let charIdx = 0; charIdx < fullText.length; charIdx++)
      {
        const char = fullText[charIdx]
        
        // Spaces have positions but we don't render them visually
        if (char === ' ')
        {
          continue
        }
        
        const glyph = createCharGlyph(char)

        // Determine if this character is highlighted based on syllable timing
        let isHighlighted = false
        let charCountSoFar = 0
        
        // Find which syllable this character belongs to
        // Need to search through the source lyric unit's words since placeable.words is the reference
        for (const word of placeable.words)
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

        // Get character position from layout using charIdx directly (1:1 mapping)
        if (charIdx < layout.charPositions.length)
        {
          const charPos = layout.charPositions[charIdx]
          const screenX = Math.floor(charPos.x)
          const screenY = Math.floor(charPos.y)

          if (vram && screenX >= 0 && screenX < CDG.screenWidth && screenY >= 0 && screenY < CDG.screenHeight)
          {
            renderGlyphToVRAM(vram, screenX, screenY, glyph, colorIndex)
            
            // Track actual bounds including yOffset and glyph height
            const glyphHeight = glyph.height || glyph.rows.length
            const yOffset = glyph.yOffset || 0
            const glyphTop = screenY + yOffset
            const glyphBottom = glyphTop + glyphHeight
            lineMinY = Math.min(lineMinY, glyphTop)
            lineMaxY = Math.max(lineMaxY, glyphBottom)
          }
        }
      }

      // Store actual bounds for later clearing
      if (lineMinY <= lineMaxY)
      {
        lineRenderBounds.set(placeable.id, {
          minY: lineMinY,
          maxY: lineMaxY
        })
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
