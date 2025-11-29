<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">
        <i class="bi bi-type"></i>
        TextClip Properties
      </h5>
      <div class="d-flex gap-3">
        <div class="form-check form-switch">
          <input
            v-model="showPreview"
            class="form-check-input"
            type="checkbox"
            id="textPreviewToggle"
          />
          <label class="form-check-label" for="textPreviewToggle">
            <small>Preview</small>
          </label>
        </div>
        <div class="form-check form-switch">
          <input
            v-model="showDebug"
            class="form-check-input"
            type="checkbox"
            id="textDebugToggle"
          />
          <label class="form-check-label" for="textDebugToggle">
            <small>Debug JSON</small>
          </label>
        </div>
      </div>
    </div>

    <div class="card-body">
      <div v-if="!localClip" class="alert alert-secondary">
        <i class="bi bi-info-circle"></i>
        Select a TextClip to edit its properties
      </div>

      <template v-else>
        <!-- Basic Properties Row -->
        <div class="row mb-4">
          <div class="col-md-3">
            <label class="form-label">Track</label>
            <input v-model.number="localClip.track" type="number" class="form-control" min="0" max="15" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Start (ms)</label>
            <input v-model.number="localClip.start_ms" type="number" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Duration (ms)</label>
            <input v-model.number="localClip.duration_ms" type="number" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Font Size</label>
            <input v-model.number="fontSize" type="number" class="form-control" min="8" max="72" />
          </div>
        </div>

        <!-- Text Content -->
        <div class="mb-4">
          <label class="form-label">
            <strong>Text Content</strong>
          </label>
          <textarea
            v-model="textContent"
            class="form-control"
            rows="3"
            placeholder="Enter text to display..."
            @input="onTextContentChange"
          ></textarea>
          <small class="form-text text-muted">
            {{ textContent.length }} characters
          </small>
        </div>

        <!-- Font Controls -->
        <div class="row mb-4">
          <div class="col-md-6">
            <label class="form-label">
              <strong>Font Face</strong>
            </label>
            <select v-model="fontFace" class="form-select">
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">
              <strong>Karaoke Mode</strong>
            </label>
            <select v-model.number="karaokeMode" class="form-select">
              <option :value="0">TITLES (0x00) - Single page, multiline</option>
              <option :value="1">LYRICS (0x01) - Multipage, single line</option>
              <option :value="2">5 Lines Top (0x02) - 5 Lines (36px), Top, Line-by-line</option>
              <option :value="3">5 Lines Bottom (0x03) - 5 Lines (36px), Bottom, Line-by-line</option>
              <option :value="4">5 Lines Top Page (0x04) - 5 Lines (36px), Top, Page-by-page</option>
              <option :value="5">5 Lines Bottom Page (0x05) - 5 Lines (36px), Bottom, Page-by-page</option>
            </select>
          </div>
        </div>

        <!-- Color Controls -->
        <div class="row mb-4">
          <div class="col-md-4">
            <label class="form-label">
              <strong>Foreground Color</strong>
            </label>
            <div class="input-group">
              <input
                v-model.number="foregroundColor"
                type="number"
                class="form-control"
                min="0"
                max="255"
              />
              <div
                class="input-group-text"
                :style="{ backgroundColor: getPaletteColor(foregroundColor), width: '40px' }"
              ></div>
            </div>
            <small class="form-text text-muted">Palette index: {{ foregroundColor }}</small>
          </div>
          <div class="col-md-4">
            <label class="form-label">
              <strong>Background Color</strong>
            </label>
            <div class="input-group">
              <input
                v-model.number="backgroundColor"
                type="number"
                class="form-control"
                min="0"
                max="255"
              />
              <div
                class="input-group-text"
                :style="{ backgroundColor: getPaletteColor(backgroundColor), width: '40px' }"
              ></div>
            </div>
            <small class="form-text text-muted">Palette index: {{ backgroundColor }}</small>
          </div>
          <div class="col-md-4">
            <label class="form-label">
              <strong>Outline Color</strong>
            </label>
            <div class="input-group">
              <input
                v-model.number="outlineColor"
                type="number"
                class="form-control"
                min="0"
                max="255"
              />
              <div
                class="input-group-text"
                :style="{ backgroundColor: getPaletteColor(outlineColor), width: '40px' }"
              ></div>
            </div>
            <small class="form-text text-muted">Palette index: {{ outlineColor }}</small>
          </div>
        </div>

        <!-- Karaoke Events (Syllables/Words) -->
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">
              <strong>Karaoke Events (Syllables/Words)</strong>
            </h6>
            <button class="btn btn-sm btn-success" @click="addKaraokeEvent">
              <i class="bi bi-plus"></i>
              Add Event
            </button>
          </div>

          <div v-if="karaokeEvents.length === 0" class="alert alert-info small">
            No karaoke events defined. Timing events define when/how text highlights during playback.
          </div>

          <div v-else class="table-responsive">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th style="width: 20%">Start (ms)</th>
                  <th style="width: 15%">Duration (ms)</th>
                  <th style="width: 45%">Text</th>
                  <th style="width: 20%">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(event, idx) in karaokeEvents" :key="idx" class="align-middle">
                  <td>
                    <input
                      v-model.number="event.start_ms"
                      type="number"
                      class="form-control form-control-sm"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="event.duration_ms"
                      type="number"
                      class="form-control form-control-sm"
                      min="1"
                    />
                  </td>
                  <td>
                    <input
                      v-model="event.text"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Syllable text..."
                    />
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger" @click="removeKaraokeEvent(idx)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <small class="form-text text-muted d-block mt-2">
            💡 <strong>Tip:</strong> Each event represents a syllable or word that highlights during playback.
            Set start and duration in milliseconds. The highlighted text animates as each event plays.
          </small>
        </div>

        <!-- Preview Area -->
        <div v-if="showPreview" class="mb-4">
          <label class="form-label">
            <strong>Preview</strong>
          </label>
          <div
            class="border rounded bg-dark p-3"
            :style="{
              minHeight: '120px',
              position: 'relative',
              overflow: 'hidden',
              aspectRatio: '320/192',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }"
          >
            <div
              class="text-light font-monospace"
              :style="{
                fontSize: fontSize + 'px',
                textAlign: 'center',
                color: getPaletteColor(foregroundColor),
                backgroundColor: getPaletteColor(backgroundColor),
                padding: '10px',
                borderRadius: '4px',
                maxWidth: '90%',
                wordWrap: 'break-word',
              }"
            >
              {{ previewText }}
            </div>
          </div>
          <small class="form-text text-muted">
            Mode: {{ getKaraokeModeLabel() }} | Font: {{ fontFace }} {{ fontSize }}px | Events: {{ karaokeEvents.length }}
          </small>
        </div>

        <!-- Debug Panel -->
        <div v-if="showDebug" class="mt-4 pt-3 border-top">
          <div class="mb-2">
            <small class="text-muted">
              <strong>Debug: Full Clip Definition (JSON)</strong>
            </small>
          </div>
          <div v-if="events.length > 0" class="alert alert-info small mb-3">
            <i class="bi bi-exclamation-triangle"></i>
            <strong>Note:</strong> This clip has <strong>{{ events.length }} binaryEvents</strong> from the CMP file. These events contain positioning, sizing, and rendering data that the editor doesn't yet handle. They are preserved in save but not editable yet.
          </div>
          <pre
            class="bg-dark text-light p-3 rounded"
            style="max-height: 300px; overflow-y: auto; font-size: 11px"
          ><code>{{ JSON.stringify(getDebugData(), null, 2) }}</code></pre>
        </div>

        <button class="btn btn-primary btn-sm" @click="saveChanges">
          <i class="bi bi-check"></i>
          Save Changes
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface KaraokeEvent {
  start_ms: number;
  duration_ms: number;
  text: string;
}

interface TextClip {
  type: 'TextClip';
  track: number;
  start_ms: number;
  duration_ms: number;
  start_packets: number;
  duration_packets: number;
  data: {
    textContent?: string;
    fontFace?: string;
    fontSize?: number;
    karaokeMode?: number;
    foregroundColor?: number;
    backgroundColor?: number;
    outlineColor?: number;
    karaokeEvents?: KaraokeEvent[];
    highlightMode?: number;
    squareSize?: number;
    roundSize?: number;
    frameColor?: number;
    boxColor?: number;
    fillColor?: number;
    compositeColor?: number;
    shouldComposite?: number;
    xorBandwidth?: number;
    antialiasMode?: number;
    defaultPaletteNumber?: number;
    events?: any[];
  };
}

interface Props {
  clip: TextClip | null;
}

interface Emits {
  (e: 'update:clip', clip: TextClip): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDebug = ref(false);
const showPreview = ref(false);
const localClip = ref<TextClip | null>(null);
const textContent = ref('');
const fontFace = ref('Arial');
const fontSize = ref(16);
const karaokeMode = ref(0); // TITLES
const foregroundColor = ref(15); // White
const backgroundColor = ref(0); // Black
const outlineColor = ref(0); // Black
const karaokeEvents = ref<KaraokeEvent[]>([]);

// Additional rendering properties
const highlightMode = ref(0);
const squareSize = ref(0);
const roundSize = ref(0);
const frameColor = ref(0);
const boxColor = ref(0);
const fillColor = ref(0);
const compositeColor = ref(0);
const shouldComposite = ref(0);
const xorBandwidth = ref(0);
const antialiasMode = ref(1);
const defaultPaletteNumber = ref(0);
const events = ref<any[]>([]);

watch(
  () => props.clip,
  (newClip) => {
    if (newClip) {
      localClip.value = JSON.parse(JSON.stringify(newClip));
      textContent.value = (newClip.data.textContent as string) || '';
      fontFace.value = (newClip.data.fontFace as string) || 'Arial';
      fontSize.value = (newClip.data.fontSize as number) || 16;
      karaokeMode.value = (newClip.data.karaokeMode as number) || 0;
      foregroundColor.value = (newClip.data.foregroundColor as number) || 15;
      backgroundColor.value = (newClip.data.backgroundColor as number) || 0;
      outlineColor.value = (newClip.data.outlineColor as number) || 0;
      karaokeEvents.value = JSON.parse(JSON.stringify((newClip.data.karaokeEvents as KaraokeEvent[]) || []));

      // Load additional properties if they exist
      highlightMode.value = (newClip.data.highlightMode as number) || 0;
      squareSize.value = (newClip.data.squareSize as number) || 0;
      roundSize.value = (newClip.data.roundSize as number) || 0;
      frameColor.value = (newClip.data.frameColor as number) || 0;
      boxColor.value = (newClip.data.boxColor as number) || 0;
      fillColor.value = (newClip.data.fillColor as number) || 0;
      compositeColor.value = (newClip.data.compositeColor as number) || 0;
      shouldComposite.value = (newClip.data.shouldComposite as number) || 0;
      xorBandwidth.value = (newClip.data.xorBandwidth as number) || 0;
      antialiasMode.value = (newClip.data.antialiasMode as number) || 1;
      defaultPaletteNumber.value = (newClip.data.defaultPaletteNumber as number) || 0;
      events.value = JSON.parse(JSON.stringify((newClip.data.events as any[]) || []));
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

const previewText = computed(() => {
  const text = textContent.value || 'Preview text...';
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
});

/**
 * Get a simple palette color approximation
 * CD+G uses a 16-color palette (0-15 are system colors, 16-255 are user-defined)
 * For demonstration, we'll use a simple mapping
 */
const getPaletteColor = (index: number): string => {
  const standardColors: Record<number, string> = {
    0: '#000000', // Black
    1: '#ff0000', // Red
    2: '#00ff00', // Green
    3: '#ffff00', // Yellow
    4: '#0000ff', // Blue
    5: '#ff00ff', // Magenta
    6: '#00ffff', // Cyan
    7: '#ffffff', // White
    8: '#808080', // Gray
    9: '#ff8080', // Light Red
    10: '#80ff80', // Light Green
    11: '#ffff80', // Light Yellow
    12: '#8080ff', // Light Blue
    13: '#ff80ff', // Light Magenta
    14: '#80ffff', // Light Cyan
    15: '#c0c0c0', // Light Gray
  };

  if (index in standardColors) {
    return standardColors[index];
  }

  // For custom colors (16-255), generate a pseudo-color based on index
  const hue = ((index - 16) * 360) / 240;
  return `hsl(${hue}, 70%, 50%)`;
};

const getKaraokeModeLabel = (): string => {
  const modes: Record<number, string> = {
    0: 'TITLES',
    1: 'LYRICS',
    2: '5 Lines Top (Line)',
    3: '5 Lines Bottom (Line)',
    4: '5 Lines Top (Page)',
    5: '5 Lines Bottom (Page)',
  };
  return modes[karaokeMode.value] || 'Unknown';
};

const onTextContentChange = () => {
  // Optionally: auto-generate syllable breaks if needed
  // For now, just track changes
};

const addKaraokeEvent = () => {
  const lastEvent = karaokeEvents.value[karaokeEvents.value.length - 1];
  const nextStart = lastEvent ? lastEvent.start_ms + lastEvent.duration_ms : 0;

  karaokeEvents.value.push({
    start_ms: nextStart,
    duration_ms: 200,
    text: '',
  });
};

const removeKaraokeEvent = (idx: number) => {
  karaokeEvents.value.splice(idx, 1);
};

const getDebugData = () => {
  return {
    type: 'TextClip',
    track: localClip.value?.track,
    start_ms: localClip.value?.start_ms,
    start_packets: localClip.value?.start_packets,
    duration_ms: localClip.value?.duration_ms,
    duration_packets: localClip.value?.duration_packets,
    // Basic properties
    textContent: textContent.value,
    fontFace: fontFace.value,
    fontSize: fontSize.value,
    karaokeMode: karaokeMode.value,
    karaokeModeLabel: getKaraokeModeLabel(),
    foregroundColor: foregroundColor.value,
    backgroundColor: backgroundColor.value,
    outlineColor: outlineColor.value,
    // Rendering properties
    highlightMode: highlightMode.value,
    squareSize: squareSize.value,
    roundSize: roundSize.value,
    frameColor: frameColor.value,
    boxColor: boxColor.value,
    fillColor: fillColor.value,
    compositeColor: compositeColor.value,
    shouldComposite: shouldComposite.value,
    xorBandwidth: xorBandwidth.value,
    antialiasMode: antialiasMode.value,
    defaultPaletteNumber: defaultPaletteNumber.value,
    // Events
    karaokeEventsCount: karaokeEvents.value.length,
    karaokeEvents: karaokeEvents.value,
    binaryEventsCount: events.value.length,
    binaryEvents: events.value,
  };
};

const saveChanges = () => {
  if (localClip.value) {
    emit('update:clip', {
      ...localClip.value,
      data: {
        // User-editable properties
        textContent: textContent.value,
        fontFace: fontFace.value,
        fontSize: fontSize.value,
        karaokeMode: karaokeMode.value,
        foregroundColor: foregroundColor.value,
        backgroundColor: backgroundColor.value,
        outlineColor: outlineColor.value,
        karaokeEvents: karaokeEvents.value,
        // Preserved rendering properties from binary data
        highlightMode: highlightMode.value,
        squareSize: squareSize.value,
        roundSize: roundSize.value,
        frameColor: frameColor.value,
        boxColor: boxColor.value,
        fillColor: fillColor.value,
        compositeColor: compositeColor.value,
        shouldComposite: shouldComposite.value,
        xorBandwidth: xorBandwidth.value,
        antialiasMode: antialiasMode.value,
        defaultPaletteNumber: defaultPaletteNumber.value,
        // Preserve binary events
        events: events.value,
      },
    });
  }
};
</script>

<style scoped>
.table-sm td {
  vertical-align: middle;
  padding: 0.4rem !important;
}

.table-sm input {
  width: 100%;
}

/* Preview styling */
.bg-dark {
  background-color: #1a1a1a !important;
}
</style>

// VIM: set ft=vue :
// END
