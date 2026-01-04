<template>
  <div>
    <h5>CDG Export</h5>
    <p class="text-muted">
      Export as CD+G format for professional karaoke machines. Creates binary .cdg file with graphics data.
    </p>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Settings</strong>
      </div>
      <div class="card-body">
        <div class="row">
          <!-- Left column: Colors and options -->
          <div class="col-md-6">
            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Background color:</label>
              <div class="col-sm-7">
                <input type="color" class="form-control form-control-color" v-model="cdgSettings.backgroundColor" />
              </div>
            </div>

            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Text color:</label>
              <div class="col-sm-7">
                <input type="color" class="form-control form-control-color" v-model="cdgSettings.textColor" />
              </div>
            </div>

            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Highlight color:</label>
              <div class="col-sm-7">
                <input type="color" class="form-control form-control-color" v-model="cdgSettings.highlightColor" />
              </div>
            </div>

            <div class="form-check mb-2">
              <input class="form-check-input" type="checkbox" v-model="cdgSettings.showBorder" id="cdgBorder" />
              <label class="form-check-label" for="cdgBorder">
                Show decorative border
              </label>
            </div>

            <div class="form-check mb-2">
              <input class="form-check-input" type="checkbox" v-model="cdgSettings.centerText" id="cdgCenter" />
              <label class="form-check-label" for="cdgCenter">
                Center text on screen
              </label>
            </div>

            <div class="form-check mb-2">
              <input class="form-check-input" type="checkbox" v-model="cdgSettings.showCaptions" id="cdgCaptions" />
              <label class="form-check-label" for="cdgCaptions">
                Show captions (e.g., "Verse 1", "Chorus")
              </label>
            </div>

            <div v-if="cdgSettings.showCaptions" class="row align-items-center mb-2 ms-4">
              <label class="col-sm-7 col-form-label small">Caption duration (sec):</label>
              <div class="col-sm-5">
                <input type="number" class="form-control form-control-sm" v-model.number="cdgSettings.captionDuration" min="1" max="10" step="0.5" />
              </div>
            </div>
          </div>

          <!-- Right column: Font settings -->
          <div class="col-md-6 ps-md-3 border-start-md">
            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Font family:</label>
              <div class="col-sm-7">
                <input type="text" class="form-control" v-model="cdgSettings.fontFamily" placeholder="Arial" />
                <small class="text-muted d-block mt-1">e.g., Arial, Courier New</small>
              </div>
            </div>

            <div class="row align-items-center mb-2">
              <label class="col-sm-5 col-form-label">Font size (px):</label>
              <div class="col-sm-7">
                <input type="number" class="form-control" v-model.number="cdgSettings.fontSize" min="8" max="48" step="1" />
                <small class="text-muted d-block mt-1">Range: 8–48</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>File Information</strong>
      </div>
      <div class="card-body">
        <p class="mb-1"><strong>Format:</strong> CD+G Binary</p>
        <p class="mb-1"><strong>Estimated size:</strong> {{ estimatedCDGSize }} KB</p>
        <p class="mb-1"><strong>Resolution:</strong> 288×192 pixels (6-bit color)</p>
  <p class="mb-0"><strong>Packet rate:</strong> 300 packets/second (project baseline)</p>
      </div>
    </div>

    <!-- Validation alerts -->
    <div v-if="validation.errors.length > 0" class="alert alert-danger" role="alert">
      <h6 class="alert-heading">Cannot export CDG</h6>
      <p>The project has blocking issues that must be fixed before exporting:</p>
      <ul>
        <li v-for="(err, i) in validation.errors" :key="i">{{ err }}</li>
      </ul>
      <small class="text-muted">Fix the errors in the editor (add audio, add timing data, etc.) and try again.</small>
    </div>

    <div v-else-if="validation.warnings.length > 0" class="alert alert-warning" role="alert">
      <h6 class="alert-heading">Warnings</h6>
      <p>There are some warnings for this project. CDG export may still work, but results could be degraded:</p>
      <ul>
        <li v-for="(w, i) in validation.warnings" :key="i">{{ w }}</li>
      </ul>
      <div class="form-check mt-2">
        <input class="form-check-input" type="checkbox" id="overrideWarnings" v-model="proceedDespiteWarnings" />
        <label class="form-check-label" for="overrideWarnings">Proceed despite warnings</label>
      </div>
    </div>

    <div v-if="exporting" class="mt-3">
      <div class="mb-2">Rendering CDG: {{ displayPercent }}%</div>
      <div class="progress mb-2">
        <div class="progress-bar" role="progressbar" :style="{ width: displayPercent + '%' }" :aria-valuenow="displayPercent" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      
    </div>

    <div v-if="showLogs" class="mt-3">
      <div class="small text-muted">Commands: {{ progress.commandsProcessed }} / {{ progress.totalCommands }} — Packets: {{ progress.packets }}</div>
      <div class="small text-muted mt-2" v-if="debugMessages.length > 0">
        <strong>Renderer messages:</strong>
        <!-- Use `white-space: pre` and remove Bootstrap's text-wrap so each message stays on its own line
             (pre-wrap will wrap long lines; that produced the blob-like wrapping behavior). -->
        <pre
          ref="debugPre"
          class="bg-light p-2 mt-2"
          style="white-space: pre; font-family: monospace; max-height: 200px; overflow:auto; word-break: normal;">
{{ debugMessages.join('\n') }}</pre>
      </div>
    </div>

    <button class="btn btn-primary w-100" @click="exportCDG" :disabled="exporting || validation.errors.length > 0 || (validation.warnings.length > 0 && !proceedDespiteWarnings)">
      <span v-if="!exporting">💿 Export CDG File</span>
      <span v-else>⏳ Exporting...</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { CDG_PPS } from '@/cdg/constants'
import type { KaraokeProject        } from '@/types/karaoke'
import { getProjectStats            } from '@/services/projectExportService'
import { KaraokePresentationEngine  } from '@/karaoke/presentation/KaraokePresentationEngine'
import { CDGBrowserRenderer         } from '@/karaoke/renderers/CDGBrowserRenderer'

const props = defineProps<{
  project: KaraokeProject
}>()

const exporting = ref(false)
const showLogs = ref(false)

// Validation state
const validation = ref<{ valid: boolean; errors: string[]; warnings: string[] }>({
  valid: true,
  errors: [],
  warnings: []
})

// Allow user to explicitly proceed despite warnings (not errors)
const proceedDespiteWarnings = ref(false)

// Re-validate whenever the project prop changes
const engine = new KaraokePresentationEngine()
function runValidation() {
  const result = engine.validateProject(props.project, { allowMissingAudio: true })
  validation.value = result
  // reset override if warnings resolved
  if (!validation.value.warnings || validation.value.warnings.length === 0) {
    proceedDespiteWarnings.value = false
  }
}

watch(() => props.project, runValidation, { immediate: true })

const cdgSettings = ref({
  backgroundColor: '#000080',
  textColor: '#FFFFFF',
  highlightColor: '#FFFF00',
  showBorder: true,
  centerText: true,
  showMetadata: true,
  metadataDuration: 3,
  showCaptions: true,
  captionDuration: 2,
  fontFamily: 'Arial',
  fontSize: 16
})

// Progress state for incremental rendering
const progress = ref<{
  commandsProcessed: number
  totalCommands: number
  packets: number
  totalPackets?: number
}>({
  commandsProcessed: 0,
  totalCommands: 0,
  packets: 0,
  totalPackets: undefined
})
const progressPercent = ref(0)

// Unified display percent (0..100) used for both text and progress-bar width to
// avoid any transient mismatch between numeric value and rendered width.
const displayPercent = computed(() => Math.min(100, Math.max(0, Math.round(progressPercent.value))))

// Use a simple CSS transition on the progress bar for a smooth, slightly
// lagging visual that closely matches the numeric percent. This keeps the
// implementation minimal and avoids extra imperative animation logic.

// debug messages from renderer (shown in dialog)
const debugMessages = ref<string[]>([])
const debugCounter = ref(0)
const debugPre = ref<HTMLElement | null>(null)

async function pushDebug(msg: string) {
  if ( !showLogs.value ) return

  debugCounter.value += 1
  const entry = `${debugCounter.value}: ${msg}`
  debugMessages.value.push(entry)

  // wait for DOM update then autoscroll to show latest messages
  await nextTick()
  const el = debugPre.value
  if (el) {
    try {
      el.scrollTop = el.scrollHeight
    } catch (e) {
      /* ignore */
    }
  }
}

const stats = computed(() => getProjectStats(props.project))

const estimatedCDGSize = computed(() => {
  const duration = stats.value.duration
  const packets = Math.ceil(duration * CDG_PPS)
  const bytes = packets * 24
  return Math.ceil(bytes / 1024)
})

function showStatus(type: 'success' | 'error', message: string) {
  console[type === 'success' ? 'log' : 'error'](message)
}

async function exportCDG() {
  exporting.value = true
  try {
    // Re-run validation right before export
  const validationResult = engine.validateProject(props.project, { allowMissingAudio: true })
    if (!validationResult.valid) {
      showStatus('error', 'Project is not valid for CDG export: ' + validationResult.errors.join('; '))
      return
    }

    if (validationResult.warnings && validationResult.warnings.length > 0 && !proceedDespiteWarnings.value) {
      showStatus('error', 'There are warnings. Check the dialog and enable "Proceed despite warnings" to continue.')
      return
    }

    // Generate presentation script and render CDG in-browser
    const script = engine.generateScript(props.project)

    const renderer = new CDGBrowserRenderer({
      backgroundColor: 0,
      activeColor: 1,
      transitionColor: 2,
      fontFamily: cdgSettings.value.fontFamily,
      fontSize: cdgSettings.value.fontSize
    })

    await renderer.initialize()
    // reset progress
    progress.value = {
      commandsProcessed: 0,
      totalCommands: script.commands.length,
  packets: 0,
  totalPackets: Math.max(1, Math.floor((script.durationMs / 1000) * CDG_PPS))
    }
    progressPercent.value = 0

    // clear debug messages and counter for a fresh run
    debugMessages.value = []
    debugCounter.value = 0


    const blob = await renderer.render(script, {
      onProgress: (p) => {
        // update progress object (p may contain totalPackets)
        progress.value = p as any
        // Compute a robust denominator for percent. We prefer the renderer-provided
        // totalPackets when it agrees with our duration-based estimate; if it's an
        // outlier (very different), fall back to the duration estimate so the UI
        // isn't held back by anomalous totals.
  const estTotal = Math.max(1, Math.floor((script.durationMs / 1000) * CDG_PPS))
        let denom = estTotal
        if (p.totalPackets && p.totalPackets > 0) {
          const diff = Math.abs(p.totalPackets - estTotal) / estTotal
          // Accept renderer total when it's within 20% of our estimate
          if (diff <= 0.2) denom = p.totalPackets
          else denom = estTotal
        }

        // Prefer packet-based progress when possible, otherwise fall back to commands
        if (p.packets !== undefined) {
          progressPercent.value = Math.min(100, (p.packets / denom) * 100)
        } else if (p.totalCommands && p.totalCommands > 0) {
          progressPercent.value = Math.min(100, (p.commandsProcessed / p.totalCommands) * 100)
        } else {
          progressPercent.value = 0
        }
        // Emit a compact diagnostic message occasionally to help debug UI mismatch.
        // Limit noise: emit every 50 commands or when we reach >=99%.
        try {
          const pct = Math.round(progressPercent.value)
          if ((p.commandsProcessed && p.commandsProcessed % 50 === 0) || pct >= 99) {
            pushDebug(`DBG: pct=${pct} packets=${p.packets || 0} denom=${denom} est=${estTotal} totalPackets=${p.totalPackets || 0}`)
          }
        } catch (e) {
          /* ignore diagnostics failure */
        }
      },
      onDebug: (msg: string) => {
        pushDebug(msg)
      }
    })

  // Trigger download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeName = (props.project.name || 'karaoke').replace(/[^a-z0-9]+/gi, '_')
  link.download = `${safeName}.cdg`

  // Force UI reconciliation so the progress bar reliably animates to 100% and
  // doesn't visually lag behind the numeric label. This waits one animation
  // frame after setting the percent to allow the DOM/CSS to catch up.
  progressPercent.value = 100
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 40))

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  // debug messages are already in top-level `debugMessages` ref and used by the template

    showStatus('success', `✅ CDG generated: ${props.project.name}.cdg`)
  } catch (error: any) {
    progressPercent.value = 0
    showStatus('error', `❌ Export failed: ${error?.message || error}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
/* Smooth progress bar: keep a modest transition so the bar lags slightly
   for a pleasing, non-bumpy feel when the percent jumps quickly. */
.progress-bar {
  transition: width 420ms cubic-bezier(0.2, 0.9, 0.2, 1);
  will-change: width;
}
</style>
