<template>
  <div class="glyph-lab-view">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Glyph Lab</h2>
      <span class="badge text-bg-primary">12pt Body + Descender Workflow</span>
    </div>

    <div class="alert alert-info py-2" role="alert">
      12pt is treated as a <strong>12x12 body box</strong>; extra rows below baseline are used for descenders.
    </div>

    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-header">Raster Controls</div>
          <div class="card-body">
            <div class="mb-3">
              <label for="charInput" class="form-label">Character</label>
              <input
                id="charInput"
                v-model="currentChar"
                type="text"
                maxlength="1"
                class="form-control"
                placeholder="Type one character"
                @input="onCharacterInput"
              />
            </div>

            <div class="row g-2 mb-2">
              <div class="col-7">
                <label for="fontFamily" class="form-label">Font Family</label>
                <input id="fontFamily" v-model="fontFamily" type="text" class="form-control" />
              </div>
              <div class="col-5">
                <label for="fontWeight" class="form-label">Weight</label>
                <input id="fontWeight" v-model="fontWeight" type="text" class="form-control" />
              </div>
            </div>

            <div class="row g-2 mb-2">
              <div class="col-4">
                <label for="pointSize" class="form-label">Point Size</label>
                <input id="pointSize" v-model.number="pointSize" type="number" min="1" class="form-control" />
              </div>
              <div class="col-4">
                <label for="bodyWidth" class="form-label">Body Width</label>
                <input id="bodyWidth" v-model.number="bodyWidth" type="number" min="1" class="form-control" />
              </div>
              <div class="col-4">
                <label for="bodyHeight" class="form-label">Body Height</label>
                <input id="bodyHeight" v-model.number="bodyHeight" type="number" min="1" class="form-control" />
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label for="descenders" class="form-label">Descender Rows</label>
                <input id="descenders" v-model.number="descenderRows" type="number" min="0" class="form-control" />
              </div>
              <div class="col-6">
                <label for="threshold" class="form-label">Alpha Threshold</label>
                <input id="threshold" v-model.number="alphaThreshold" type="number" min="0" max="255" class="form-control" />
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-primary" @click="addOrUpdateCurrentGlyph">Add/Update Glyph</button>
              <button class="btn btn-outline-secondary" @click="refreshPreview">Refresh Preview</button>
              <button class="btn btn-outline-danger" @click="clearGlyphSet">Clear Set</button>
            </div>

            <div class="d-flex gap-2 flex-wrap mt-2">
              <button class="btn btn-outline-warning" :disabled="isAutoBuilding" @click="autoBuildGlyphSet">
                {{ isAutoBuilding ? 'Auto-Building…' : `Auto-Build Printable Set (${AUTO_BUILD_CHARS.length})` }}
              </button>
              <button class="btn btn-outline-success" @click="saveToBrowser">Save to Browser</button>
              <button class="btn btn-outline-primary" @click="loadFromBrowser">Load Saved Set</button>
              <button class="btn btn-outline-dark" @click="downloadJson">Download JSON</button>
            </div>

            <hr />

            <div class="small text-muted" v-if="lastResult">
              <div>Rendered size: {{ lastResult.glyph.width }}x{{ lastResult.glyph.height }}</div>
              <div>Baseline (cropped): y={{ lastResult.glyph.baselineY }}</div>
              <div>Guide baseline: y={{ lastResult.guide.baselineY }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-header">Preview Canvas</div>
          <div class="card-body d-flex flex-column align-items-center">
            <canvas ref="previewCanvas" width="240" height="240" class="preview-canvas" />
            <div class="small text-muted mt-2">
              Blue box = 12pt body region, red line = baseline, below line = descender area.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Glyph Set</span>
            <span class="badge text-bg-secondary">{{ glyphs.length }} glyphs</span>
          </div>
          <div class="card-body glyph-list">
            <div v-if="glyphs.length === 0" class="text-muted">No glyphs added yet.</div>
            <div
              v-for="glyph in glyphs"
              :key="glyph.char"
              class="glyph-row"
              :class="{ selected: glyph.char === selectedGlyphChar }"
              @click="selectGlyph(glyph.char)"
            >
              <div>
                <strong>{{ formatChar(glyph.char) }}</strong>
                <small class="text-muted ms-2">{{ glyph.width }}x{{ glyph.height }}</small>
              </div>
              <button class="btn btn-sm btn-outline-danger" @click.stop="removeGlyph(glyph.char)">Remove</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Export</span>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn" :class="exportMode === 'json' ? 'btn-primary' : 'btn-outline-primary'" @click="exportMode = 'json'">
                JSON
              </button>
              <button class="btn" :class="exportMode === 'register' ? 'btn-primary' : 'btn-outline-primary'" @click="exportMode = 'register'">
                registerGlyph
              </button>
            </div>
          </div>
          <div class="card-body d-flex flex-column gap-2">
            <textarea readonly class="form-control export-box" :value="exportText" />
            <div class="d-flex gap-2">
              <button class="btn btn-success" @click="copyExportText">Copy Export</button>
              <span class="small text-muted align-self-center">{{ copyStatus }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Glyph Lab View
 *
 * Browser-based glyph builder for creating a 12pt body-box glyph set
 * with configurable descender rows, suitable for replacing static glyphs.
 */

import { computed, onMounted, ref, watch } from 'vue'
import {
  DEFAULT_GLYPH_LAB_CONFIG,
  GlyphLabRasterizer,
  GlyphSetBuilder,
  GlyphLabStorage,
  type GlyphLabResult,
  type GlyphLabGlyph
} from '@/cdg/glyph-lab'

const rasterizer = new GlyphLabRasterizer()
const glyphSetBuilder = new GlyphSetBuilder()

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const currentChar = ref('a')

const fontFamily = ref(DEFAULT_GLYPH_LAB_CONFIG.fontFamily)
const fontWeight = ref(DEFAULT_GLYPH_LAB_CONFIG.fontWeight)
const pointSize = ref(DEFAULT_GLYPH_LAB_CONFIG.pointSize)
const bodyWidth = ref(DEFAULT_GLYPH_LAB_CONFIG.bodyWidth)
const bodyHeight = ref(DEFAULT_GLYPH_LAB_CONFIG.bodyHeight)
const descenderRows = ref(DEFAULT_GLYPH_LAB_CONFIG.descenderRows)
const alphaThreshold = ref(DEFAULT_GLYPH_LAB_CONFIG.alphaThreshold)

const glyphs = ref<GlyphLabGlyph[]>([])
const lastResult = ref<GlyphLabResult | null>(null)

const exportMode = ref<'json' | 'register'>('json')
const copyStatus = ref('')
const isAutoBuilding = ref(false)
const selectedGlyphChar = ref('')

const AUTO_BUILD_CHARS = Array.from({ length: 95 }, (_, idx) => String.fromCharCode(32 + idx))

const renderConfig = computed(() => ({
  fontFamily: fontFamily.value,
  fontWeight: fontWeight.value,
  pointSize: pointSize.value,
  bodyWidth: bodyWidth.value,
  bodyHeight: bodyHeight.value,
  descenderRows: descenderRows.value,
  alphaThreshold: alphaThreshold.value
}))

const exportText = computed(() =>
{
  if (exportMode.value === 'register')
  {
    return glyphSetBuilder.exportRegisterGlyphCalls(6, 12)
  }

  return JSON.stringify(glyphSetBuilder.exportJson(renderConfig.value), null, 2)
})

function onCharacterInput(): void
{
  if (currentChar.value.length === 0)
  {
    currentChar.value = ' '
  }
  else if (currentChar.value.length > 1)
  {
    currentChar.value = currentChar.value.slice(0, 1)
  }

  refreshPreview()
}

function refreshPreview(): void
{
  if (!previewCanvas.value)
  {
    return
  }

  copyStatus.value = ''
  lastResult.value = rasterizer.drawPreview(previewCanvas.value, currentChar.value, renderConfig.value)
}

function syncGlyphList(): void
{
  glyphs.value = glyphSetBuilder.getAllGlyphs()
}

function addOrUpdateCurrentGlyph(): void
{
  const result = rasterizer.renderGlyph(currentChar.value, renderConfig.value)
  glyphSetBuilder.upsertGlyph(result.glyph)
  selectedGlyphChar.value = result.glyph.char
  lastResult.value = result
  syncGlyphList()
}

function removeGlyph(char: string): void
{
  glyphSetBuilder.removeGlyph(char)
  if (selectedGlyphChar.value === char)
  {
    selectedGlyphChar.value = ''
  }
  syncGlyphList()
}

function clearGlyphSet(): void
{
  glyphSetBuilder.clear()
  selectedGlyphChar.value = ''
  syncGlyphList()
  copyStatus.value = ''
}

function selectGlyph(char: string): void
{
  selectedGlyphChar.value = char
  currentChar.value = char
  refreshPreview()
}

function autoBuildGlyphSet(): void
{
  isAutoBuilding.value = true

  glyphSetBuilder.clear()

  for (const char of AUTO_BUILD_CHARS)
  {
    const result = rasterizer.renderGlyph(char, renderConfig.value)
    glyphSetBuilder.upsertGlyph(result.glyph)
  }

  currentChar.value = 'A'
  selectedGlyphChar.value = 'A'
  refreshPreview()
  syncGlyphList()
  copyStatus.value = `Auto-built ${AUTO_BUILD_CHARS.length} glyphs`
  isAutoBuilding.value = false
}

function saveToBrowser(): void
{
  try
  {
    GlyphLabStorage.save(glyphSetBuilder.exportJson(renderConfig.value))
    copyStatus.value = 'Saved to browser storage'
  }
  catch (error)
  {
    console.error('Save failed:', error)
    copyStatus.value = 'Save failed'
  }
}

function loadFromBrowser(): void
{
  const saved = GlyphLabStorage.load()
  if (!saved)
  {
    copyStatus.value = 'No saved set found'
    return
  }

  glyphSetBuilder.clear()
  for (const glyph of saved.glyphs)
  {
    glyphSetBuilder.upsertGlyph(glyph)
  }
  syncGlyphList()
  copyStatus.value = `Loaded ${saved.glyphs.length} glyphs`
}

function downloadJson(): void
{
  const payload = JSON.stringify(glyphSetBuilder.exportJson(renderConfig.value), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'glyph-lab-set.json'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  copyStatus.value = 'Downloaded glyph-lab-set.json'
}

function formatChar(char: string): string
{
  return char === ' ' ? '␠ (space)' : char
}

async function copyExportText(): Promise<void>
{
  try
  {
    await navigator.clipboard.writeText(exportText.value)
    copyStatus.value = 'Copied'
  }
  catch (error)
  {
    console.error('Copy failed:', error)
    copyStatus.value = 'Copy failed'
  }
}

watch(renderConfig, () => refreshPreview(), { deep: true })

onMounted(() =>
{
  refreshPreview()
  syncGlyphList()
  const saved = GlyphLabStorage.load()
  if (saved)
  {
    for (const glyph of saved.glyphs)
    {
      glyphSetBuilder.upsertGlyph(glyph)
    }
    selectedGlyphChar.value = currentChar.value
    syncGlyphList()
    copyStatus.value = `Auto-loaded ${saved.glyphs.length} saved glyphs`
  }
})
</script>

<style scoped>
.glyph-lab-view {
  width: 100%;
}

.preview-canvas {
  border: 1px solid #dee2e6;
  image-rendering: pixelated;
}

.glyph-list {
  max-height: 320px;
  overflow: auto;
}

.glyph-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f1f3f5;
  cursor: pointer;
}

.glyph-row.selected {
  background-color: #e7f1ff;
}

.export-box {
  min-height: 260px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
}
</style>
