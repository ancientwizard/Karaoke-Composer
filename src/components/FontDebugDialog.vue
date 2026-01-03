<template>
  <div v-if="isOpen" class="font-debug-overlay">
    <div class="font-debug-dialog">
      <div class="dialog-header">
        <h2>Font Glyph Debug</h2>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="dialog-content">
        <!-- Tab Navigation -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            :class="{ active: activeTab === tab }"
            class="tab-btn"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Glyph Atlas Tab -->
        <div v-if="activeTab === 'Glyphs'" class="tab-content">
          <h3>Character Set</h3>
          <div class="glyph-controls">
            <label class="case-toggle">
              <input
                type="checkbox"
                v-model="showUppercase"
              />
              <span>{{ showUppercase ? 'UPPERCASE' : 'lowercase' }}</span>
            </label>
          </div>
          <div class="glyph-grid">
            <div
              v-for="char in displayedChars"
              :key="char"
              class="glyph-cell"
              :title="`${char} (${char.charCodeAt(0)})`"
            >
              <div class="glyph-display">
                <canvas
                  :key="`canvas-${char}`"
                  :data-char="char"
                  class="glyph-canvas"
                />
              </div>
              <div class="glyph-label">{{ char === ' ' ? '·' : char }}</div>
            </div>
          </div>
        </div>

        <!-- Text Preview Tab -->
        <div v-if="activeTab === 'Preview'" class="tab-content">
          <h3>Text Rendering</h3>
          <div class="preview-controls">
            <label>
              Text:
              <input
                v-model="previewText"
                type="text"
                placeholder="Enter text to preview"
                @input="onTextChange"
              />
            </label>
            <button @click="previewText = 'Hello World'" class="preset-btn">
              Hello World
            </button>
            <button @click="previewText = 'CDG Composer'" class="preset-btn">
              CDG Composer
            </button>
            <button @click="previewText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" class="preset-btn">
              ABC (Upper)
            </button>
            <button @click="previewText = 'abcdefghijklmnopqrstuvwxyz'" class="preset-btn">
              abc (Lower)
            </button>
            <button @click="previewText = '0123456789!?.,' + &quot;'&quot;" class="preset-btn">
              0-9 Punct
            </button>
          </div>

          <div class="preview-display">
            <div class="preview-label">Rendered Output:</div>
            <canvas
              ref="previewCanvas"
              class="preview-canvas"
              :width="previewCanvasWidth"
              :height="previewCanvasHeight"
            />
            <div class="preview-info">
              <small>Text: "{{ previewText }}"</small>
              <small>Length: {{ previewText.length }} chars</small>
              <small>Canvas: {{ previewCanvasWidth }}×{{ previewCanvasHeight }}px</small>
            </div>
          </div>
        </div>

        <!-- Font Info Tab -->
        <div v-if="activeTab === 'Info'" class="tab-content">
          <h3>Font System Information</h3>
          <div class="info-box">
            <h4>Character Coverage</h4>
            <p>
              <strong>Total Characters:</strong> {{ totalChars }}<br />
              <strong>Uppercase:</strong> 26 (A-Z)<br />
              <strong>Lowercase:</strong> 26 (a-z)<br />
              <strong>Digits:</strong> 10 (0-9)<br />
              <strong>Punctuation:</strong> 17 symbols
            </p>

            <h4>Character Size</h4>
            <p>
              <strong>Tile Height:</strong> 12 pixels (CDG tile)<br />
              <strong>Width:</strong> 2-5 pixels per character (variable)<br />
              <strong>Format:</strong> 12-row bitmap (6-bit rows)
            </p>

            <h4>Implementation Details</h4>
            <p>
              <strong>File:</strong> CDGFont.ts<br />
              <strong>Storage:</strong> Map&lt;string, CDGGlyph&gt;<br />
              <strong>Encoding:</strong> Binary bitmap (0bXXXXXX per row)
            </p>

            <h4>Supported Characters</h4>
            <div class="char-list">
              <strong>Uppercase:</strong> A-Z<br />
              <strong>Lowercase:</strong> a-z<br />
              <strong>Digits:</strong> 0-9<br />
              <strong>Punctuation:</strong> . , ! ? : ; ' " - + / ( ) &<br />
              <strong>Whitespace:</strong> Space, fallback for undefined
            </div>

            <h4>Usage in CDG Export</h4>
            <ol>
              <li>Text is converted to individual characters</li>
              <li>Each character looked up in font glyph map</li>
              <li>Glyph bitmap converted to CDG tile blocks</li>
              <li>Tile blocks encoded into CDG packets</li>
              <li>Packets written to .cdg file</li>
            </ol>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <small>Font Debug Tool • Real-time Glyph Visualization</small>
        <button @click="close" class="close-btn-footer">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { CDGFont } from '../karaoke/renderers/cdg/CDGFont'

const isOpen = ref(false)
const activeTab = ref('Glyphs')
const tabs = ['Glyphs', 'Preview', 'Info']
const showUppercase = ref(false)

// Character set to display
const charSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  punct: '.!?:;\'",-+/()\\'
}

const displayedChars = ref<string[]>([])
const totalChars = ref(0)

const previewText = ref('Hello World')
const previewCanvasWidth = 400
const previewCanvasHeight = 150

const fontInstance = new CDGFont()

// Compute displayed characters (uppercase or lowercase + digits + punctuation)
function computeDisplayedChars() {
  const letterSet = showUppercase.value ? charSets.uppercase : charSets.lowercase
  const chars = [
    ...letterSet.split(''),
    ...charSets.digits.split(''),
    ...charSets.punct.split(''),
    ' '
  ]
  displayedChars.value = chars
  totalChars.value = chars.length
}

// Draw a single glyph to canvas
function drawGlyph(canvas: HTMLCanvasElement, char: string) {
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = 16
  const height = 24
  canvas.width = width
  canvas.height = height

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Get glyph from font
  const glyph = (fontInstance as any).getGlyph(char)

  if (!glyph) {
    ctx.fillStyle = '#cccccc'
    ctx.font = '10px monospace'
    ctx.fillText('?', 2, 18)
    return
  }

  // Calculate proper scaling to fit 6x12 CDG tile into 16x24 canvas
  // with 1px margins on all sides
  const offsetX = 1
  const offsetY = 1
  const availWidth = width - 2 * offsetX
  const availHeight = height - 2 * offsetY
  
  // CDG tile is 6x12, so scale each axis separately
  const pixelScaleX = availWidth / 6
  const pixelScaleY = availHeight / 12
  
  // Use uniform scaling (square pixels) - use minimum to fit both axes
  const pixelSize = Math.min(pixelScaleX, pixelScaleY)

  // Draw pixel rows as grid
  ctx.fillStyle = '#0066ff'
  for (let row = 0; row < 12; row++) {
    const pixelRow = glyph.rows[row] || 0

    // Check all 6 bits (CDG standard format: bit 5-0 maps to pixel positions left-to-right)
    for (let col = 0; col < 6; col++) {
      const bit = (pixelRow >> (5 - col)) & 1
      if (bit) {
        const x = offsetX + col * pixelSize
        const y = offsetY + row * pixelSize
        ctx.fillRect(x, y, pixelSize, pixelSize)
      }
    }
  }

  // Border
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, width, height)
}

// Draw preview text to canvas
function drawPreview() {
  nextTick(() => {
    const canvas = document.querySelector('.preview-canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= canvas.height; i += 12) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // Draw text
    let x = 8
    let y = 20
    const lineHeight = 24

    ctx.fillStyle = '#0066ff'
    const charWidth = 8

    for (const char of previewText.value) {
      if (char === '\n') {
        x = 8
        y += lineHeight
        continue
      }

      const glyph = (fontInstance as any).getGlyph(char)
      if (!glyph) continue

      // Draw simple representation
      ctx.fillStyle = '#0066ff'
      ctx.font = '12px monospace'
      ctx.fillText(char, x, y)

      x += charWidth
      if (x > canvas.width - charWidth) {
        x = 8
        y += lineHeight
      }
    }

    // Border
    ctx.strokeStyle = '#999999'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
  })
}

function onTextChange() {
  drawPreview()
}

// Redraw all glyphs when component mounts or active tab changes
function redrawGlyphs() {
  nextTick(() => {
    // Get all canvas elements with data-char attribute
    const canvases = document.querySelectorAll('[data-char].glyph-canvas')
    if (canvases.length === 0) {
      console.warn('FontDebugDialog: No glyph canvases found in DOM')
      return
    }

    canvases.forEach((canvas: Element) => {
      const charAttr = (canvas as HTMLCanvasElement).getAttribute('data-char')
      if (charAttr) {
        drawGlyph(canvas as HTMLCanvasElement, charAttr)
      }
    })
  })
}

function open() {
  isOpen.value = true
  // Trigger redraw after dialog is rendered and visible
  // Use nextTick twice: first for Vue to render, second to ensure actual DOM painting
  nextTick(() => {
    nextTick(() => {
      if (activeTab.value === 'Glyphs') {
        redrawGlyphs()
      } else if (activeTab.value === 'Preview') {
        drawPreview()
      }
    })
  })
}

function close() {
  isOpen.value = false
}

// Expose to parent
defineExpose({
  open,
  close
})

onMounted(() => {
  computeDisplayedChars()
  // Don't redraw on mount - dialog is hidden, DOM doesn't exist yet
  // redrawGlyphs() will be called when dialog opens
})

watch(activeTab, () => {
  if (activeTab.value === 'Glyphs') {
    redrawGlyphs()
  } else if (activeTab.value === 'Preview') {
    drawPreview()
  }
})

watch(previewText, () => {
  drawPreview()
})

watch(showUppercase, () => {
  computeDisplayedChars()
  redrawGlyphs()
})
</script>

<style scoped>
.font-debug-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.font-debug-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #000;
}

.dialog-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  padding: 0 20px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #000;
}

.tab-btn.active {
  color: #0066ff;
  border-bottom-color: #0066ff;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.glyph-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.glyph-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s;
}

.glyph-cell:hover {
  background: #f0f7ff;
  border-color: #0066ff;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.2);
}

.glyph-display {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 32px;
}

.glyph-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.glyph-label {
  font-size: 11px;
  font-weight: 500;
  color: #666;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glyph-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.case-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.case-toggle input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.case-toggle input[type="checkbox"]:checked {
  accent-color: #0066ff;
}

.preview-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.preview-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.preview-controls input {
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  min-width: 200px;
}

.preview-controls input:focus {
  outline: none;
  border-color: #0066ff;
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.1);
}

.preset-btn {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #0066ff;
  color: white;
  border-color: #0066ff;
}

.preview-display {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
}

.preview-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.preview-canvas {
  width: 100%;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: white;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
}

.preview-info {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.preview-info small {
  display: block;
}

.info-box {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
}

.info-box h4 {
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.info-box h4:first-child {
  margin-top: 0;
}

.info-box p {
  margin: 0 0 12px 0;
}

.info-box ol {
  margin: 8px 0;
  padding-left: 20px;
}

.info-box li {
  margin: 4px 0;
}

.char-list {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.8;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.close-btn-footer {
  padding: 6px 16px;
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.close-btn-footer:hover {
  background: #0066ff;
  color: white;
  border-color: #0066ff;
}

h3 {
  margin-top: 0;
  font-size: 16px;
  font-weight: 600;
}
</style>
