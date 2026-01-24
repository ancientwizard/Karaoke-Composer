<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col">
        <h1 class="mb-0">
          <i class="bi bi-pencil"></i>
          Editor
        </h1>
        <small class="text-muted">Edit clips with audio synchronization</small>
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" @click="showAddClipDialog = true">
          <i class="bi bi-plus"></i>
          Add Clip
        </button>
      </div>
    </div>

    <!-- Add Clip Dialog -->
    <div v-if="showAddClipDialog" class="modal d-block bg-dark bg-opacity-50" style="display: block">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Clip</h5>
            <button type="button" class="btn-close" @click="showAddClipDialog = false"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Select Clip Type</label>
            <select v-model="newClipType" class="form-select">
              <option value="TextClip">Text Clip</option>
              <option value="BMPClip">BMP Clip</option>
              <option value="ScrollClip">Scroll Clip</option>
              <option value="PALGlobalClip">PAL Global Clip</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddClipDialog = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="confirmAddClip">
              <i class="bi bi-plus"></i>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- Timeline/Editing Lanes Panel (Left) -->
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Timeline</h5>
          </div>
          <div class="card-body" style="min-height: 300px; max-height: 500px; overflow-y: auto">
            <div v-if="clips.length === 0" class="alert alert-info">
              <i class="bi bi-info-circle"></i>
              No clips added yet. Create a new clip to get started.
            </div>

            <!-- Clips Container (for EditingLanes integration) -->
            <div id="editing-lanes" style="display: flex; flex-direction: column; gap: 10px">
              <div
                v-for="(clip, index) in clips"
                :key="index"
                class="clip-lane d-flex align-items-center p-3 border rounded bg-light"
              >
                <div class="flex-grow-1">
                  <h6 class="mb-1">{{ clip.type }} (Track {{ clip.track }})</h6>
                  <small class="text-muted">
                    Start: {{ clip.start_ms.toFixed(0) }}ms | Duration: {{ clip.duration_ms.toFixed(0) }}ms
                  </small>
                  <div v-if="getClipTextContent(clip)" class="mt-1 text-info">
                    <small><strong>Text:</strong> {{ getClipTextContent(clip).substring(0, 50) }}...</small>
                  </div>
                  <div v-if="getClipFileRefs(clip).length > 0" class="mt-1">
                    <small
                      v-for="(ref, idx) in getClipFileRefs(clip)"
                      :key="idx"
                      class="d-block text-success text-break"
                    >
                      📁 {{ ref }}
                    </small>
                  </div>
                </div>
                <button class="btn btn-sm btn-outline-primary me-2" @click="editClip(index)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="removeClip(index)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Window (Right, next to Timeline) -->
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">Preview</h5>
          </div>
          <div class="card-body d-flex flex-column">
            <canvas
              id="graphics-canvas"
              ref="graphicsCanvas"
              width="312"
              height="216"
              style="border: 2px solid #ddd; background: black; flex: 1; min-height: 300px; image-rendering: pixelated;"
            ></canvas>
          </div>
        </div>
      </div>

      <!-- Clip Editor Panel -->
      <div class="col-lg-12">
        <BMPClipEditor
          v-if="selectedClipIndex !== null && clips[selectedClipIndex].type === 'BMPClip'"
          :clip="(clips[selectedClipIndex] as any)"
          :available-files="allAvailableFiles"
          @update:clip="updateClip"
        />
        <TextClipEditor
          v-else-if="selectedClipIndex !== null && clips[selectedClipIndex].type === 'TextClip'"
          :clip="(clips[selectedClipIndex] as any)"
          @update:clip="updateClip"
        />
        <ScrollClipEditor
          v-else-if="selectedClipIndex !== null && clips[selectedClipIndex].type === 'ScrollClip'"
          :clip="(clips[selectedClipIndex] as any)"
          @update:clip="updateClip"
        />
        <div v-else-if="selectedClipIndex === null" class="card">
          <div class="card-header">
            <h5 class="mb-0">Clip Properties</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-secondary">
              Select a clip to edit its properties
            </div>
          </div>
        </div>
        <div v-else class="card">
          <div class="card-header">
            <h5 class="mb-0">{{ clips[selectedClipIndex]?.type }} - Not Yet Implemented</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-warning">
              <i class="bi bi-wrench"></i>
              Editor for {{ clips[selectedClipIndex]?.type }} is not yet implemented. Coming soon!
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="row mt-4">
      <div class="col">
        <div class="card">
          <div class="card-body d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm"
              :class="isPlaying ? 'btn-warning' : 'btn-success'"
              @click="togglePlayback"
            >
              <i :class="['bi', isPlaying ? 'bi-pause' : 'bi-play']"></i>
              {{ isPlaying ? 'Pause' : 'Play' }}
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="stopPlayback">
              <i class="bi bi-stop"></i>
              Stop
            </button>
            <div class="flex-grow-1">
              <div class="progress">
                <div class="progress-bar" role="progressbar" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            <small class="text-muted">{{ currentTime }}ms / {{ totalTime }}ms</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Panel: File References -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">
              <i class="bi bi-bug"></i>
              Debug - File References
            </h5>
          </div>
          <div class="card-body" style="max-height: 250px; overflow-y: auto">
            <div class="mb-3">
              <strong>Audio File:</strong>
              <code class="d-block text-break">{{ audioFile }}</code>
            </div>
            <div>
              <strong>Asset Files:</strong>
              <div v-if="fileReferences.size === 0" class="text-muted">
                No file references found
              </div>
              <ul v-else class="mb-0">
                <li v-for="[file, type] in fileReferences" :key="file">
                  <code class="text-break">{{ file }}</code>
                  <span class="badge bg-info ms-2">{{ type }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ProjectLoader } from '@/ts/project/ProjectLoader';
import type { LoadedProject } from '@/ts/project/ProjectLoader';
import BMPClipEditor from '@/components/editor/BMPClipEditor.vue';
import TextClipEditor from '@/components/editor/TextClipEditor.vue';
import ScrollClipEditor from '@/components/editor/ScrollClipEditor.vue';
import { CDGMagic_GraphicsEncoder } from '@/ts/cd+g-magic/CDGMagic_GraphicsEncoder';
import { CDGMagic_GraphicsDecoder } from '@/ts/cd+g-magic/CDGMagic_GraphicsDecoder';
import { CDGMagic_CDGExporter } from '@/ts/cd+g-magic/CDGMagic_CDGExporter';
import { CDGMagic_CDSCPacket } from '@/ts/cd+g-magic/CDGMagic_CDSCPacket';
import { convertToMediaClip } from '@/ts/cd+g-magic/ClipConverter';

interface Clip {
  type: string;
  track: number;
  start_ms: number;
  start_packets: number;
  duration_ms: number;
  duration_packets: number;
  data: Record<string, unknown>;
}

const clips = ref<Clip[]>([]);
const selectedClipIndex = ref<number | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const totalTime = ref(10000);
const progressPercent = ref(0);
const fileReferences = ref<Map<string, 'audio' | 'bmp' | 'transition' | 'cdg'>>(new Map());
const audioFile = ref<string>('');
const projectPath = ref<string>('');
const showAddClipDialog = ref(false);
const newClipType = ref<'BMPClip' | 'TextClip' | 'ScrollClip' | 'PALGlobalClip'>('TextClip');

// Graphics rendering state
const graphicsEncoder = ref<CDGMagic_GraphicsEncoder | null>(null);
const graphicsDecoder = ref<CDGMagic_GraphicsDecoder | null>(null);
const graphicsExporter = ref<CDGMagic_CDGExporter | null>(null);
const canvasContext = ref<CanvasRenderingContext2D | null>(null);
const graphicsCanvas = ref<HTMLCanvasElement | null>(null);

const allAvailableFiles = computed(() => {
  // List all files from fileReferences
  return Array.from(fileReferences.value.keys());
});

onMounted(() => {
  // Setup canvas context FIRST (before graphics engine init)
  if (graphicsCanvas.value) {
    const ctx = graphicsCanvas.value.getContext('2d');
    if (ctx) {
      canvasContext.value = ctx;
    }
  }

  // Load project from sessionStorage
  const projectData = sessionStorage.getItem('currentProject');
  if (projectData) {
    try {
      const project = JSON.parse(projectData) as LoadedProject;

      // Store project path for BMP resolution
      projectPath.value = project.projectPath || '';

      // Project data already has normalized paths (one-time fix-up during load)
      // UI sees paths as-is, no need for dual-path system
      const projectData_obj = ProjectLoader.getProject(project);

      // Convert clips
      clips.value = ProjectLoader.projectToClips({
        ...project,
        rawData: projectData_obj,
      });

      totalTime.value = project.duration * (1000 / 300); // Convert packets to ms
      audioFile.value = projectData_obj.audioFile;

      // Extract file references (already correct paths from load-time normalization)
      fileReferences.value = ProjectLoader.extractFileReferences(project);

      // Initialize graphics rendering pipeline (now canvasContext is ready)
      initializeGraphicsEngine();
    } catch (error) {
      console.error('Failed to load project from session:', error);
      // Fallback: create empty state
      clips.value = [];
      drawSplashScreen();
    }
  } else {
    // No project loaded - show splash screen
    drawSplashScreen();
  }
});

const initializeGraphicsEngine = () => {
  try {
    // Get the directory path from the CMP file path
    let cmpDir = '';
    if (projectPath.value) {
      // Extract directory from file path (remove filename)
      const lastSlash = Math.max(projectPath.value.lastIndexOf('/'), projectPath.value.lastIndexOf('\\'));
      cmpDir = lastSlash >= 0 ? projectPath.value.substring(0, lastSlash) : '';
    }

    // Create exporter with CMP directory for resolving BMP paths
    graphicsExporter.value = new CDGMagic_CDGExporter(0, cmpDir);

    // Create decoder with initial palette
    graphicsDecoder.value = new CDGMagic_GraphicsDecoder();

    console.debug('[initializeGraphicsEngine] Starting with', clips.value?.length ?? 0, 'clips', 'cmpDir:', cmpDir);

    // Register all clips with the exporter
    if (clips.value && graphicsExporter.value) {
      for (let clipIdx = 0; clipIdx < clips.value.length; clipIdx++) {
        const clip = clips.value[clipIdx];
        try {
          console.debug(`[initializeGraphicsEngine] Processing clip ${clipIdx}:`, {
            type: clip.type,
            track: clip.track,
            start: clip.start_packets,
            duration: clip.duration_packets,
          });

          const mediaClip = convertToMediaClip({
            type: clip.type as 'BMPClip' | 'TextClip' | 'ScrollClip' | 'PALGlobalClip',
            track: clip.track,
            start: clip.start_packets,
            duration: clip.duration_packets,
            data: clip.data,
          });

          console.debug(`[initializeGraphicsEngine] Converted clip ${clipIdx}:`, mediaClip);

          if (mediaClip && graphicsExporter.value) {
            // Type assertion needed because BMPClip doesn't extend MediaClip
            // but has the required interface (start_pack(), duration())
            graphicsExporter.value.register_clip(mediaClip as any);
            console.debug(`[initializeGraphicsEngine] Registered clip ${clipIdx}`);
          } else {
            console.warn(`[initializeGraphicsEngine] Clip ${clipIdx} conversion failed:`, {
              mediaClip: !!mediaClip,
              exporter: !!graphicsExporter.value,
            });
          }
        } catch (err) {
          console.warn(`Failed to register clip ${clipIdx}:`, err);
        }
      }
    }

    console.debug('[initializeGraphicsEngine] About to render initial frame');
    // Render initial frame
    renderPreview(0);
  } catch (error) {
    console.error('Failed to initialize graphics engine:', error);
  }
};

const drawSplashScreen = () => {
  if (!canvasContext.value) {
    return;
  }

  // Fill with gradient pattern to prove canvas works
  const ctx = canvasContext.value;
  const width = 312;
  const height = 216;

  // Create a simple gradient splash screen
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw a simple pattern with colors
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const blockWidth = width / colors.length;
  colors.forEach((color, idx) => {
    ctx.fillStyle = color;
    ctx.fillRect(idx * blockWidth, 0, blockWidth, height / 2);
  });

  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Preview Canvas Ready', width / 2, height / 2 + 20);
  ctx.font = '12px monospace';
  ctx.fillText('Load a project to display graphics', width / 2, height / 2 + 40);
};

const renderPreview = (packetTime: number) => {
  if (!graphicsDecoder.value || !canvasContext.value || !graphicsExporter.value) {
    console.warn('[renderPreview] Missing dependencies:', {
      decoder: !!graphicsDecoder.value,
      context: !!canvasContext.value,
      exporter: !!graphicsExporter.value,
    });
    return;
  }

  try {
    // Create a fresh decoder for each frame
    graphicsDecoder.value = new CDGMagic_GraphicsDecoder();

    // Schedule packets from all registered clips
    const totalPackets = graphicsExporter.value.schedule_packets();
    console.debug('[renderPreview] Total packets scheduled:', totalPackets);

    // Get the packet schedule from exporter (private member access via type assertion)
    const packetSchedule = (graphicsExporter.value as any).internal_packet_schedule as Map<number, any[]>;

    // Process packets in order from packet 0 up to a reasonable limit
    // In a real player, we'd only process packets up to the current playback time
    // NOTE: BMPClip test patterns can be at packet 11000+, so we need to process more
    const MAX_PACKETS_TO_PROCESS = Math.min(totalPackets, 15000); // Process up to 15000 packets
    let processedCount = 0;
    let decodedCount = 0;
    for (let pktIdx = 0; pktIdx < MAX_PACKETS_TO_PROCESS; pktIdx++) {
      const packets = packetSchedule.get(pktIdx);
      if (packets && packets.length > 0) {
        for (const rawPacket of packets) {
          // Convert plain packet object to CDGMagic_CDSCPacket instance
          const packet = new CDGMagic_CDSCPacket();
          packet.command(rawPacket.command);
          packet.instruction(rawPacket.instruction);
          packet.set_data(rawPacket.payload);
          
          graphicsDecoder.value.process_packet(packet);
          decodedCount++;
          processedCount++;
        }
      }
    }
    console.debug('[renderPreview] Packets processed:', processedCount, 'decoded:', decodedCount);

    // Debug: Check VRAM and palette state
    const palette = graphicsDecoder.value.palette();
    const paletteColors = Array.from({length: 16}, (_, i) => {
      const rgba = palette.color(i);
      return {
        index: i,
        hex: '0x' + rgba.toString(16).padStart(8, '0'),
        r: (rgba >> 24) & 0xff,
        g: (rgba >> 16) & 0xff,
        b: (rgba >> 8) & 0xff,
        a: rgba & 0xff
      };
    });
    console.debug('[renderPreview] Palette after loading:', paletteColors);

    // Get RGB framebuffer (3 bytes per pixel, 312×216)
    const rgbData = graphicsDecoder.value.to_rgba_framebuffer();
    console.debug('[renderPreview] RGB framebuffer size:', rgbData.length, 'expected:', 312 * 216 * 3);

    // Check if framebuffer has any non-zero data
    let nonZeroPixels = 0;
    const pixelSamples: Array<{index: number; rgb: string}> = [];
    for (let i = 0; i < rgbData.length; i++) {
      if (rgbData[i] !== 0) {
        nonZeroPixels++;
        if (pixelSamples.length < 20) {
          pixelSamples.push({
            index: i,
            rgb: `rgb(${rgbData[i]}, ${rgbData[i+1]}, ${rgbData[i+2]})`
          });
        }
      }
    }
    console.debug('[renderPreview] Non-zero bytes in framebuffer:', nonZeroPixels);
    if (pixelSamples.length > 0) {
      console.debug('[renderPreview] Sample non-zero pixels:', pixelSamples);
    }

    // Convert RGB to RGBA for ImageData (JavaScript requires RGBA format)
    // RGB data: 312*216*3 = 202,176 bytes
    // RGBA data: 312*216*4 = 269,568 bytes
    const rgbaData = new Uint8ClampedArray(312 * 216 * 4);
    for (let i = 0; i < rgbData.length; i += 3) {
      const rgbaIdx = (i / 3) * 4;
      rgbaData[rgbaIdx] = rgbData[i];         // Red
      rgbaData[rgbaIdx + 1] = rgbData[i + 1]; // Green
      rgbaData[rgbaIdx + 2] = rgbData[i + 2]; // Blue
      rgbaData[rgbaIdx + 3] = 0xFF;           // Alpha (fully opaque)
    }

    // Create ImageData and render to canvas
    const imageData = new ImageData(
      rgbaData,
      312,
      216
    );
    canvasContext.value.putImageData(imageData, 0, 0);
    console.debug('[renderPreview] Canvas updated with ImageData');
  } catch (error) {
    console.error('[renderPreview] Failed to render preview:', error);
    console.error('[renderPreview] Error stack:', (error as Error).stack);
  }
};

const getClipFileRefs = (clip: Clip): string[] => {
  const refs: string[] = [];

  if (clip.type === 'BMPClip' && clip.data.events) {
    const events = clip.data.events as Array<{ bmpPath?: string; transitionFile?: string }>;
    for (const evt of events) {
      if (evt.bmpPath) refs.push(evt.bmpPath);
      if (evt.transitionFile) refs.push(evt.transitionFile);
    }
  }

  return refs;
};

const getClipTextContent = (clip: Clip): string => {
  if (clip.type === 'TextClip' && clip.data.textContent) {
    return String(clip.data.textContent);
  }
  return '';
};

const addClip = () => {
  const newClip: Clip = {
    type: newClipType.value,
    track: 0,
    start_ms: currentTime.value,
    start_packets: Math.floor((currentTime.value / 1000) * 300),
    duration_ms: 1000,
    duration_packets: 300,
    data: {},
  };
  clips.value.push(newClip);
};

const confirmAddClip = () => {
  addClip();
  showAddClipDialog.value = false;
};

const editClip = (index: number) => {
  selectedClipIndex.value = index;
};

const removeClip = (index: number) => {
  clips.value.splice(index, 1);
  if (selectedClipIndex.value === index) {
    selectedClipIndex.value = null;
  }
};

const saveClipChanges = () => {
  // Changes are already saved via v-model binding
  console.log('Clip changes saved');
};

const updateClip = (updatedClip: Clip) => {
  if (selectedClipIndex.value !== null) {
    clips.value[selectedClipIndex.value] = updatedClip;
    // Re-render preview after clip change
    renderPreview(Math.floor((currentTime.value / 1000) * 300));
  }
};

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    simulatePlayback();
  }
};

const stopPlayback = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  progressPercent.value = 0;
  renderPreview(0);
};

const simulatePlayback = () => {
  const interval = setInterval(() => {
    if (!isPlaying.value) {
      clearInterval(interval);
      return;
    }

    currentTime.value += 100;
    progressPercent.value = (currentTime.value / totalTime.value) * 100;

    // Convert time to packets and render preview
    const currentPackets = Math.floor((currentTime.value / 1000) * 300);
    renderPreview(currentPackets);

    if (currentTime.value >= totalTime.value) {
      isPlaying.value = false;
      currentTime.value = totalTime.value;
      progressPercent.value = 100;
      clearInterval(interval);
    }
  }, 100);
};
</script>

<style scoped>
.clip-lane {
  transition: all 0.2s;
}

.clip-lane:hover {
  background-color: #e9ecef;
  border-color: #0d6efd !important;
}

#graphics-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}
</style>
