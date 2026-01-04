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
            <strong>Song:</strong>
            <select v-model="selectedSongKey" style="margin: 0 0.5rem;">
              <option v-for="key in availableSongs" :key="key" :value="key">
                {{ SongsLibrary.get(key)?.title || key }}
              </option>
            </select>
          </label>

          <label class="checkbox-label" style="margin-top: 0.5rem;">
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
import { SongsLibrary } from '@/lyrics/library'
import { TextLayoutEngine, DEFAULT_LAYOUT_CONFIG } from '@/karaoke/presentation/TextLayoutEngine'
import { TextRenderComposer, type PlaceableLine } from '@/karaoke/presentation/TextRenderComposer'
import { TextAlign } from '@/karaoke/presentation/Command'

import { CDG, DefaultPalette, ColorUtils } from '@/cdg/constants'
import type { GlyphData } from '@/cdg/glyph-renderer'
import { TextRenderQueue } from '@/karaoke/presentation/TextRenderQueue'

/**
 * Build karaoke render plan with intelligent timing
 * 
 * Uses TextRenderComposer to orchestrate all text rendering
 */
const activeTab = ref('Glyph Alignment')
const availableTabs = ['Glyph Alignment']
const font = new CDGFont()
const dynamicRasterizer = new DynamicGlyphRasterizer()
const layoutEngine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
const renderComposer = new TextRenderComposer()  // Core composition engine
const renderQueue = new TextRenderQueue(14)  // 14 pixels per line (12px glyph + 2px gap)
const isPlaying = ref(false)
const autoRepeat = ref(true)
const currentTimeMs = ref(0)
const playbackSpeed = ref(0.5) // Dial from 0.1x to 2x speed

// Song selection
const selectedSongKey = ref('meet-me-in-november')
const availableSongs = computed(() => Object.keys(SongsLibrary.asRecord()))

// Glyph source selection
const glyphSource = ref<'static' | 'dynamic'>('dynamic')  // Use dynamic rasterizer by default
const dynamicFontFamily = ref('Arial')
const dynamicFontSize = ref(16)

// Track placeable lines (compositions of source lyric units)
const placeableLines = ref<PlaceableLine[]>([])

// Timing configuration for syllable display

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
  lineLayoutCache.clear()
  lineRenderBounds.clear()
  lineRowAssignments.clear()
  placeableLines.value = []
  renderComposer.reset()
  renderQueue.reset()

  // Save pristine VRAM state (background before text)
  vramPristine = new VRAM()
  for (let y = 0; y < CDG.screenHeight; y++)
  {
    for (let x = 0; x < CDG.screenWidth; x++)
    {
      vramPristine.setPixel(x, y, vram.getPixel(x, y))
    }
  }

  // Load song from library
  const song = SongsLibrary.get(selectedSongKey.value)
  if (!song)
  {
    console.error(`Song "${selectedSongKey.value}" not found in library!`)
    return
  }

  console.log('🎵 Loaded song:', {
    title: song.title,
    lineCount: song.lines.length
  })

  // Use TextRenderComposer to build all placeable lines
  const composed = renderComposer.composeSong(song, {
    includeTitle: true,
    includeArtist: true,
    includeCredit: true
  })

  placeableLines.value = composed

  console.log('📌 Placeable lines composed:', {
    totalComposed: composed.length,
    details: composed.slice(0, 5).map(p => ({
      id: p.id,
      text: p.text.substring(0, 30),
      startTime: p.startTime,
      yPos: p.leasedYPosition
    }))
  })

  // Calculate duration from last line's end time
  let maxEndTime = 0
  composed.forEach(line =>
  {
    maxEndTime = Math.max(maxEndTime, line.endTime)
  })

  const totalDuration = maxEndTime + 1000
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
      for (const [, bounds] of lineRenderBounds.entries())
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

  const COLOR_UNHIGHLIGHTED = 15  // White (default text color)
  const COLOR_HIGHLIGHTED = 2     // Bright color for highlighted text (different from white for visibility)

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
            charPositions.push(
            {
              x: cursorX,
              y: pixelY
            })
            cursorX += charWidths[i] + charSpacing
          }

          layout =
          {
            lines: [fullText],
            charPositions
          }
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
        
        // For lyrics with a character-to-syllable map, direct lookup
        if (placeable.charToSyllableMap)
        {
          const sourceCharIdx = (placeable.charOffsetInSource || 0) + charIdx
          const syllableInfo = placeable.charToSyllableMap.get(sourceCharIdx)
          
          if (syllableInfo && syllableInfo.startTime !== undefined && syllableInfo.endTime !== undefined)
          {
            // Calculate wipe progress: 0.0 (not started) to 1.0 (complete)
            const wipeProgress = Math.max(0, Math.min(1, (timeMs - syllableInfo.startTime) / (syllableInfo.endTime - syllableInfo.startTime)))
            
            // If we're within the syllable's time window, apply wipe animation
            if (timeMs >= syllableInfo.startTime && timeMs < syllableInfo.endTime)
            {
              // Find the first and last character of this syllable
              let syllableFirstCharIdx = charIdx
              let syllableLastCharIdx = charIdx
              
              for (let i = 0; i < placeable.text.length; i++)
              {
                const syl = placeable.charToSyllableMap.get(i)
                if (syl && syl.syllable === syllableInfo.syllable)
                {
                  syllableFirstCharIdx = Math.min(syllableFirstCharIdx, i)
                  syllableLastCharIdx = Math.max(syllableLastCharIdx, i)
                }
              }
              
              // Get pixel positions of syllable bounds
              const firstCharPos = layout.charPositions[syllableFirstCharIdx]
              const lastCharPos = layout.charPositions[syllableLastCharIdx]
              
              if (firstCharPos && lastCharPos)
              {
                // Syllable spans from first char X to last char X + last glyph width
                const syllableStartX = firstCharPos.x
                const lastGlyph = glyphSource.value === 'dynamic'
                  ? dynamicRasterizer.getGlyph(placeable.text[syllableLastCharIdx], dynamicFontFamily.value, dynamicFontSize.value)
                  : font.getGlyph(placeable.text[syllableLastCharIdx])
                
                if (lastGlyph)
                {
                  const syllableEndX = lastCharPos.x + lastGlyph.width
                  const syllableWidth = syllableEndX - syllableStartX
                  
                  // Calculate wipe position in pixels
                  const wipeX = syllableStartX + (wipeProgress * syllableWidth)
                  
                  // Check if current character position is before or after wipe
                  const charPos = layout.charPositions[charIdx]
                  if (charPos)
                  {
                    const currentGlyph = glyphSource.value === 'dynamic'
                      ? dynamicRasterizer.getGlyph(placeable.text[charIdx], dynamicFontFamily.value, dynamicFontSize.value)
                      : font.getGlyph(placeable.text[charIdx])
                    
                    if (currentGlyph)
                    {
                      // Highlight if character's START position is before the wipe
                      // The wipe is a boundary: everything to the left stays highlighted, everything to the right doesn't
                      if (charPos.x < wipeX)
                      {
                        isHighlighted = true
                      }
                    }
                  }
                }
              }
            }
            else if (timeMs >= syllableInfo.endTime)
            {
              // After syllable ends, keep highlighted (persistence)
              isHighlighted = true
            }
            
            // Debug output (limited to first few frames per line)
            if (charIdx === 0 && timeMs < 5000)
            {
              console.log(`🎯 Line "${placeable.id}" char 0: syl="${syllableInfo.syllable}" startTime=${syllableInfo.startTime} endTime=${syllableInfo.endTime} current=${timeMs} highlighted=${isHighlighted}`)
            }
          }
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
