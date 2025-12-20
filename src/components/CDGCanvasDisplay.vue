<template>
  <div class="cdg-canvas-display bg-white p-3 rounded">

    <!-- Size controls -->
    <div class="controls">
      <fieldset class="border rounded p-3 small">
        <div class="row align-items-center g-3">
          <div class="col-auto">
            <legend class="mb-0 fw-semibold h6">Canvas Scale:</legend>
          </div>
          <div class="col-auto">
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                id="scale1x"
                v-model="selectedScale"
                value="1"
              >
              <label class="form-check-label" for="scale1x">
                1x (300×216)
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                id="scale2x"
                v-model="selectedScale"
                value="2"
              >
              <label class="form-check-label" for="scale2x">
                2x (600×432)
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                id="scale3x"
                v-model="selectedScale"
                value="3"
              >
              <label class="form-check-label" for="scale3x">
                3x (900×648)
              </label>
            </div>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- Canvas container -->
    <div class="canvas-container d-flex align-items-center bg-light border rounded p-3">
      <canvas
        ref="displayCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        class="cdg-canvas"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CDGCanvasDisplay
 *
 * A reusable canvas component for displaying CDG screen data.
 * Accepts pixel data (300x216 palette indices) and a 16-color palette.
 * Provides 1x/2x/3x scaling options for convenient viewing.
 *
 * @component
 */
import { ref, computed, watch, onMounted } from 'vue'
import { CDG } from '@/cdg/constants'

interface Props {
  /**
   * Pixel data: Uint8Array of 300*216 elements (palette indices 0-15)
   */
  pixelData?: Uint8Array

  /**
   * Palette: array of 16 12-bit color values [RRRRGGGGBBBB]
   * If not provided, uses default black palette
   */
  palette?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  pixelData: undefined,
  palette: undefined
})

/**
 * Selected display scale: 1, 2, or 3
 */
const selectedScale = ref('3')

/**
 * Computed scale factor as number
 */
const scaleFactor = computed(() => parseInt(selectedScale.value, 10))

/**
 * Computed canvas width based on scale
 */
const canvasWidth = computed(() => CDG.screenWidth * scaleFactor.value)

/**
 * Computed canvas height based on scale
 */
const canvasHeight = computed(() => CDG.screenHeight * scaleFactor.value)

/**
 * Canvas element reference
 */
const displayCanvas = ref<HTMLCanvasElement>()

/**
 * Convert 12-bit CDG color (RRRRGGGGBBBB) to 24-bit RGB
 */
function cdgColorToRgb(color12: number): [number, number, number]
{
  const r4 = (color12 >> 8) & 0x0F
  const g4 = (color12 >> 4) & 0x0F
  const b4 = color12 & 0x0F
  // Expand 4-bit to 8-bit by shifting left 4 and copying to low bits
  const r8 = (r4 << 4) | r4
  const g8 = (g4 << 4) | g4
  const b8 = (b4 << 4) | b4
  return [r8, g8, b8]
}

/**
 * Render the canvas with current pixel data and palette
 */
function render(): void
{
  const canvas = displayCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Create default black palette if not provided
  const palette = props.palette ?? Array(CDG.paletteSize).fill(0)

  // Create image data
  const imgData = ctx.createImageData(CDG.screenWidth, CDG.screenHeight)
  const data = imgData.data

  // Fill pixel data
  if (props.pixelData)
  {
    for (let i = 0; i < CDG.screenWidth * CDG.screenHeight; i++)
    {
      const paletteIdx = props.pixelData[i] & 0x0F
      const color12 = palette[paletteIdx] ?? 0
      const [r, g, b] = cdgColorToRgb(color12)

      data[i * 4 + 0] = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = 255
    }
  }

  // Put image data at 1:1 scale
  ctx.putImageData(imgData, 0, 0)

  // Apply scaling via canvas context if scale > 1
  if (scaleFactor.value > 1)
  {
    // Scale via CSS would blur; instead we scale the image data itself
    // by drawing to a temporary canvas and back
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = CDG.screenWidth
    tempCanvas.height = CDG.screenHeight
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imgData, 0, 0)

    // Clear the main canvas and draw scaled version
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      tempCanvas,
      0, 0,
      CDG.screenWidth, CDG.screenHeight,
      0, 0,
      canvas.width, canvas.height
    )
  }
}

/**
 * Watch for changes to pixel data and re-render
 */
watch(() => props.pixelData, () => {
  render()
}, { deep: false })

/**
 * Watch for changes to palette and re-render
 */
watch(() => props.palette, () => {
  render()
}, { deep: true })

/**
 * Watch for scale changes and update canvas dimensions
 */
watch(scaleFactor, () => {
  render()
})

/**
 * Initial render on mount
 */
onMounted(() => {
  render()
})
</script>

<style scoped>
.cdg-canvas-display
{
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.canvas-container
{
  min-height: 250px;
  overflow: auto;
}

.cdg-canvas
{
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: 1px solid #ddd;
}
</style>

// VIM: set filetype=vue :
// END
