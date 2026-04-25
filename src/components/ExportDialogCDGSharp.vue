<template>
  <div>
    <h5>CDG-B Export <small class="text-muted fs-6">(CDGSharp engine)</small></h5>
    <p class="text-muted">
      Export as CD+G using the CDGSharp pipeline. Renders directly from the current project
      timing data via the browser canvas rasterizer.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Colors</strong>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-4">
            <div class="row align-items-center mb-2">
              <label class="col-sm-6 col-form-label">Background:</label>
              <div class="col-sm-6">
                <input type="color" class="form-control form-control-color" v-model="settings.bgColor" />
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="row align-items-center mb-2">
              <label class="col-sm-6 col-form-label">Text:</label>
              <div class="col-sm-6">
                <input type="color" class="form-control form-control-color" v-model="settings.textColor" />
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="row align-items-center mb-2">
              <label class="col-sm-6 col-form-label">Sung / highlight:</label>
              <div class="col-sm-6">
                <input type="color" class="form-control form-control-color" v-model="settings.sungTextColor" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Font</strong>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Font family:</label>
              <div class="col-sm-7">
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control"
                    v-model="settings.font"
                    placeholder="Arial"
                    @input="onFontInput"
                    list="cdgb-font-datalist"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    :disabled="loadingFonts"
                    @click="loadLocalFonts"
                    title="Browse system fonts"
                  >{{ loadingFonts ? '⏳' : '🔤' }}</button>
                </div>
                <datalist id="cdgb-font-datalist">
                  <option v-for="f in fontSuggestions" :key="f" :value="f" />
                </datalist>
                <div class="mt-1">
                  <span v-if="fontStatus === 'available'" class="badge bg-success">✓ Available in canvas</span>
                  <span v-else-if="fontStatus === 'fallback'" class="badge bg-warning text-dark">
                    ⚠ Not found – canvas will use {{ resolvedFont }}
                  </span>
                  <span v-else class="text-muted small">Type a font name or click 🔤 to browse system fonts</span>
                </div>
              </div>
            </div>
            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Font size (px):</label>
              <div class="col-sm-7">
                <input type="number" class="form-control" v-model.number="settings.fontSize" min="8" max="48" step="1" />
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Font style:</label>
              <div class="col-sm-7">
                <select class="form-select" v-model="settings.fontStyle">
                  <option value="regular">Regular</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" v-model="settings.uppercaseText" id="cdgbUppercase" />
              <label class="form-check-label" for="cdgbUppercase">Uppercase text</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Layout &amp; Timing</strong>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <div class="row align-items-center mb-2">
              <label class="col-sm-7 col-form-label">Wrap grace (px):</label>
              <div class="col-sm-5">
                <input type="number" class="form-control" v-model.number="settings.wrapGracePx" min="0" max="50" step="1" />
              </div>
              <small class="text-muted offset-sm-0 col-12 mt-1">Extra px allowed before word-wrapping</small>
            </div>
            <div class="row align-items-center mb-2">
              <label class="col-sm-7 col-form-label">Max lines:</label>
              <div class="col-sm-5">
                <input
                  type="number"
                  class="form-control"
                  v-model.number="settings.maxLines"
                  min="1"
                  max="10"
                  step="1"
                  placeholder="auto"
                />
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="row align-items-center mb-2">
              <label class="col-sm-7 col-form-label">Timestamp offset (s):</label>
              <div class="col-sm-5">
                <input
                  type="number"
                  class="form-control"
                  v-model.number="settings.modifyTimestamps"
                  step="0.05"
                  placeholder="0"
                />
              </div>
              <small class="text-muted col-12 mt-1">Shift all lyric timestamps by this amount</small>
            </div>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" v-model="settings.allBreaks" id="cdgbAllBreaks" />
              <label class="form-check-label" for="cdgbAllBreaks">Force all line breaks</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Transition</strong>
      </div>
      <div class="card-body">
        <div class="row align-items-center mb-2">
          <label class="col-sm-4 col-form-label">Transition mode:</label>
          <div class="col-sm-8">
            <select class="form-select" v-model="settings.transitionMode">
              <option value="trailing-wipe">Trailing wipe</option>
              <option value="clear">Clear</option>
            </select>
          </div>
        </div>

        <template v-if="settings.transitionMode === 'trailing-wipe'">
          <div class="row align-items-center mb-2">
            <label class="col-sm-4 col-form-label">Wipe delay (ms):</label>
            <div class="col-sm-8">
              <input
                type="number"
                class="form-control"
                v-model.number="settings.trailingWipeDelayMs"
                min="0"
                max="10000"
                step="100"
              />
            </div>
          </div>
          <div class="row align-items-center mb-2">
            <label class="col-sm-4 col-form-label">Ready threshold:</label>
            <div class="col-sm-8">
              <input
                type="number"
                class="form-control"
                v-model.number="settings.trailingWipeRegionReadyThreshold"
                min="0"
                max="1"
                step="0.05"
              />
              <small class="text-muted">0.0 – 1.0 fraction of region that must be sung before wipe starts</small>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Validation alerts -->
    <div v-if="exportError" class="alert alert-danger" role="alert">
      <h6 class="alert-heading">Export error</h6>
      {{ exportError }}
    </div>
    <div v-else-if="exportSuccess" class="alert alert-success" role="alert">
      {{ exportSuccess }}
    </div>

    <!-- Progress -->
    <div v-if="exporting" class="my-3">
      <div class="mb-1 small text-muted">Generating CD+G data…</div>
      <div class="progress">
        <div class="progress-bar progress-bar-striped progress-bar-animated w-100" role="progressbar"></div>
      </div>
    </div>

    <button class="btn btn-primary w-100 mt-2" @click="doExport" :disabled="exporting">
      <span v-if="!exporting">💿 Export CDG-B File</span>
      <span v-else>⏳ Generating…</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { KaraokeProject } from '@/types/karaoke'
import { LRCWriter } from '@/formats/LRCFormat'
import { CdgConvertLrcBrowserFlow } from '@/CDGSharp/convert/CdgConvertLrcBrowserFlow'

const props = defineProps<{
  project: KaraokeProject
}>()

const exporting     = ref(false)
const exportError   = ref<string | null>(null)
const exportSuccess = ref<string | null>(null)

// ─── font detection ───────────────────────────────────────────────────────────

/** Curated list of fonts reliably available on Linux / Windows / macOS */
const COMMON_FONTS = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'DejaVu Sans',
  'DejaVu Sans Mono',
  'DejaVu Serif',
  'Georgia',
  'Impact',
  'Liberation Mono',
  'Liberation Sans',
  'Liberation Serif',
  'Noto Sans',
  'Noto Serif',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Ubuntu',
  'Verdana'
]

const fontSuggestions = ref<string[]>(COMMON_FONTS)
const loadingFonts    = ref(false)
const fontStatus      = ref<'unknown' | 'available' | 'fallback'>('unknown')
const resolvedFont    = ref('')

/**
 * Detect whether `name` is actually available in an OffscreenCanvas by
 * comparing its rendered glyph width against the "monospace" fallback baseline.
 * If the widths differ, the font is distinct from the fallback → it resolved.
 */
function isFontAvailable(name: string): boolean
{
  if (typeof OffscreenCanvas === 'undefined') return true
  try
  {
    const probe  = 'mmmmmmmmmmlli'
    const size   = 24
    const canvas = new OffscreenCanvas(1, 1)
    const ctx    = canvas.getContext('2d')
    if (ctx === null) return false

    ctx.font = `${size}px monospace`
    const wMono = ctx.measureText(probe).width

    ctx.font = `${size}px "${name}", monospace`
    const wTest = ctx.measureText(probe).width

    return wTest !== wMono
  }
  catch
  {
    return false
  }
}

/** Read back what the canvas actually resolved the font to (best-effort). */
function resolveFont(name: string): string
{
  if (typeof OffscreenCanvas === 'undefined') return name
  try
  {
    const canvas = new OffscreenCanvas(1, 1)
    const ctx    = canvas.getContext('2d')
    if (ctx === null) return name
    ctx.font = `16px "${name}"`
    // After assignment ctx.font is the browser-normalised string
    const match = /\s(.+)$/.exec(ctx.font)
    return match?.[1] ?? ctx.font
  }
  catch
  {
    return name
  }
}

function checkFont(name: string): void
{
  const trimmed = (name ?? '').trim()
  if (!trimmed) { fontStatus.value = 'unknown'; return }
  if (isFontAvailable(trimmed))
  {
    fontStatus.value = 'available'
  }
  else
  {
    fontStatus.value = 'fallback'
    resolvedFont.value = resolveFont(trimmed)
  }
}

function onFontInput(): void
{
  checkFont(settings.value.font)
}

/** Use the Local Font Access API (Chrome 103+) to populate the datalist */
async function loadLocalFonts(): Promise<void>
{
  const qf = (window as unknown as Record<string, unknown>).queryLocalFonts as
    | undefined
    | (() => Promise<Array<{ family: string }>>)

  if (!qf)
  {
    // API not available — filter common list to those canvas can detect
    const detected = COMMON_FONTS.filter(isFontAvailable)
    fontSuggestions.value = detected.length > 0 ? detected : COMMON_FONTS
    return
  }

  loadingFonts.value = true
  try
  {
    const fonts    = await qf()
    const families = [...new Set(fonts.map((f) => f.family))].sort()
    fontSuggestions.value = families
  }
  catch
  {
    // Permission denied or API error
    fontSuggestions.value = COMMON_FONTS.filter(isFontAvailable)
  }
  finally
  {
    loadingFonts.value = false
  }
}

// Re-check availability whenever the font name changes
// (defined BELOW settings so the getter is never called before settings exists)

const settings = ref({
  bgColor:      '#000088',
  textColor:    '#ffffff',
  sungTextColor: '#ffff00',
  font:         'DejaVu Sans',
  fontSize:     17,
  fontStyle:    'regular' as 'regular' | 'bold',
  uppercaseText: false,
  modifyTimestamps: undefined as number | undefined,
  wrapGracePx:  4,
  allBreaks:    false,
  maxLines:     undefined as number | undefined,
  transitionMode: 'trailing-wipe' as 'clear' | 'trailing-wipe',
  trailingWipeDelayMs: 2000,
  trailingWipeRegionReadyThreshold: 0.8
})

// Watch for font name changes; initial check deferred to onMounted so the DOM
// and OffscreenCanvas are fully available before we probe system fonts.
watch(() => settings.value.font, (name) => { try { checkFont(name) } catch { /* ignore */ } })
onMounted(() => { try { checkFont(settings.value.font) } catch { /* ignore */ } })

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToNibble(htmlColor: string): string {
  // convert #rrggbb → #rgb nibble form that CDGSharp expects
  const hex = htmlColor.replace('#', '').toLowerCase()
  if (hex.length === 3) return `#${hex}`
  // Round each channel to nibble
  const r = Math.round(parseInt(hex.slice(0, 2), 16) / 17).toString(16)
  const g = Math.round(parseInt(hex.slice(2, 4), 16) / 17).toString(16)
  const b = Math.round(parseInt(hex.slice(4, 6), 16) / 17).toString(16)
  return `#${r}${g}${b}`
}

function toKebabFileBase(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'karaoke'
}

async function saveCdgBlob(bytes: Uint8Array, fileName: string): Promise<void>
{
  const blob    = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' })
  const picker  = (window as unknown as Record<string, unknown>).showSaveFilePicker as
    | undefined
    | ((options?: Record<string, unknown>) => Promise<FileSystemFileHandle>)

  if (picker)
  {
    const handle = await picker({
      suggestedName: fileName,
      types: [{ description: 'CD+G file', accept: { 'application/octet-stream': ['.cdg'] } }],
      excludeAcceptAllOption: false
    })

    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return
  }

  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── export ───────────────────────────────────────────────────────────────────

async function doExport(): Promise<void>
{
  exporting.value    = true
  exportError.value  = null
  exportSuccess.value = null

  try
  {
    const lrcContent = LRCWriter.toLRC(props.project)

    const flow  = new CdgConvertLrcBrowserFlow()
    const s     = settings.value

    // CDGSharp color validation expects nibble (#rgb) form
    const bytes = flow.execute(lrcContent, {
      bgColor:       hexToNibble(s.bgColor),
      textColor:     hexToNibble(s.textColor),
      sungTextColor: hexToNibble(s.sungTextColor),
      font:          s.font || undefined,
      fontSize:      s.fontSize,
      fontStyle:     s.fontStyle,
      uppercaseText: s.uppercaseText || undefined,
      modifyTimestamps: s.modifyTimestamps ?? undefined,
      wrapGracePx:   s.wrapGracePx,
      allBreaks:     s.allBreaks || undefined,
      maxLines:      s.maxLines ?? undefined,
      transitionMode: s.transitionMode,
      trailingWipeDelayMs: s.trailingWipeDelayMs,
      trailingWipeRegionReadyThreshold: s.trailingWipeRegionReadyThreshold
    })

    const safeName = toKebabFileBase(props.project.name || 'karaoke')
    await saveCdgBlob(bytes, `${safeName}.cdg`)

    exportSuccess.value = `✅ CDG-B exported (${bytes.length.toLocaleString()} bytes)`
  }
  catch (err: unknown)
  {
    if ((err as { name?: string })?.name === 'AbortError') {
      return
    }
    exportError.value = (err instanceof Error) ? err.message : String(err)
  }
  finally
  {
    exporting.value = false
  }
}
</script>

<!-- vim: set ft=vue: -->
