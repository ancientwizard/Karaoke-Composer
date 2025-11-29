<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">
        <i class="bi bi-arrow-repeat"></i>
        Scroll Clip Properties
      </h5>
      <div class="form-check form-switch">
        <input
          v-model="showDebug"
          class="form-check-input"
          type="checkbox"
          id="scrollDebugToggle"
        />
        <label class="form-check-label" for="scrollDebugToggle">
          <small>Debug JSON</small>
        </label>
      </div>
    </div>

    <div class="card-body">
      <div v-if="!localClip" class="alert alert-secondary">
        <i class="bi bi-info-circle"></i>
        Select a Scroll clip to edit its properties
      </div>

      <template v-else>
        <!-- Basic Properties -->
        <div class="row mb-4">
          <div class="col-md-6">
            <label class="form-label">Track</label>
            <input v-model.number="localClip.track" type="number" class="form-control" min="0" max="15" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Start (ms)</label>
            <input v-model.number="localClip.start_ms" type="number" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Duration (ms)</label>
            <input v-model.number="localClip.duration_ms" type="number" class="form-control" />
          </div>
        </div>

        <!-- Scroll Content -->
        <div class="mb-4">
          <label class="form-label">
            <strong>Scroll Text</strong>
          </label>
          <textarea
            v-model="textContent"
            class="form-control"
            rows="5"
            placeholder="Enter text to scroll..."
          ></textarea>
          <small class="form-text text-muted">
            {{ textContent.length }} characters
          </small>
        </div>

        <!-- Scroll Direction -->
        <div class="mb-4">
          <label class="form-label">
            <strong>Scroll Direction</strong>
          </label>
          <div class="btn-group w-100" role="group">
            <input
              type="radio"
              class="btn-check"
              name="scrollDirection"
              id="scrollUp"
              value="0"
              v-model="scrollDirection"
            />
            <label class="btn btn-outline-primary" for="scrollUp">
              <i class="bi bi-arrow-up"></i>
              Up
            </label>

            <input
              type="radio"
              class="btn-check"
              name="scrollDirection"
              id="scrollDown"
              value="1"
              v-model="scrollDirection"
            />
            <label class="btn btn-outline-primary" for="scrollDown">
              <i class="bi bi-arrow-down"></i>
              Down
            </label>

            <input
              type="radio"
              class="btn-check"
              name="scrollDirection"
              id="scrollLeft"
              value="2"
              v-model="scrollDirection"
            />
            <label class="btn btn-outline-primary" for="scrollLeft">
              <i class="bi bi-arrow-left"></i>
              Left
            </label>

            <input
              type="radio"
              class="btn-check"
              name="scrollDirection"
              id="scrollRight"
              value="3"
              v-model="scrollDirection"
            />
            <label class="btn btn-outline-primary" for="scrollRight">
              <i class="bi bi-arrow-right"></i>
              Right
            </label>
          </div>
        </div>

        <!-- Scroll Speed -->
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0">
              <strong>Scroll Speed</strong>
            </label>
            <span class="badge bg-info">{{ scrollSpeed }} px/frame</span>
          </div>
          <input
            v-model.number="scrollSpeed"
            type="range"
            class="form-range"
            min="1"
            max="32"
            step="1"
          />
          <small class="form-text text-muted">
            Adjust scroll speed: 1 (slow) to 32 (fast) pixels per frame
          </small>
        </div>

        <!-- Preview Area -->
        <div class="mb-4">
          <label class="form-label">
            <strong>Preview</strong>
          </label>
          <div
            class="border rounded bg-dark p-3"
            style="min-height: 120px; position: relative; overflow: hidden; aspect-ratio: 320/192"
          >
            <div
              class="text-light font-monospace"
              :style="getScrollPreviewStyle()"
            >
              {{ previewText }}
            </div>
          </div>
          <small class="form-text text-muted">
            Animation preview (direction: {{ getDirectionLabel() }})
          </small>
        </div>

        <!-- Debug Panel -->
        <div v-if="showDebug" class="mt-4 pt-3 border-top">
          <div class="mb-2">
            <small class="text-muted">
              <strong>Debug: Full Clip Definition (JSON)</strong>
            </small>
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

interface ScrollClip {
  type: 'ScrollClip';
  track: number;
  start_ms: number;
  duration_ms: number;
  start_packets: number;
  duration_packets: number;
  data: {
    textContent?: string;
    scrollDirection?: number;
    scrollSpeed?: number;
  };
}

interface Props {
  clip: ScrollClip | null;
}

interface Emits {
  (e: 'update:clip', clip: ScrollClip): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDebug = ref(false);
const localClip = ref<ScrollClip | null>(null);
const textContent = ref('');
const scrollDirection = ref('0');
const scrollSpeed = ref(2);

watch(
  () => props.clip,
  (newClip) => {
    if (newClip) {
      localClip.value = JSON.parse(JSON.stringify(newClip));
      textContent.value = (newClip.data.textContent as string) || '';
      scrollDirection.value = String((newClip.data.scrollDirection as number) || 0);
      scrollSpeed.value = (newClip.data.scrollSpeed as number) || 2;
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

const previewText = computed(() => {
  const text = textContent.value || 'Preview text here...';
  // Truncate for preview
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
});

const getDirectionLabel = (): string => {
  switch (scrollDirection.value) {
    case '0':
      return 'Up';
    case '1':
      return 'Down';
    case '2':
      return 'Left';
    case '3':
      return 'Right';
    default:
      return 'Unknown';
  }
};

const getScrollPreviewStyle = () => {
  // Simple animation preview based on direction
  const baseStyle = {
    animation: 'scroll-animation 2s linear infinite',
    textAlign: 'center' as const,
  };

  // Direction affects the starting position
  const dir = scrollDirection.value;
  if (dir === '0' || dir === '2') {
    // Up or Left: start from bottom/right
    return {
      ...baseStyle,
      animation: `scroll-${['up', 'none', 'left', 'none'][Number(dir)] || 'up'} 2s linear infinite`,
    };
  }

  return baseStyle;
};

const getDebugData = () => {
  return {
    type: 'ScrollClip',
    track: localClip.value?.track,
    start_ms: localClip.value?.start_ms,
    start_packets: localClip.value?.start_packets,
    duration_ms: localClip.value?.duration_ms,
    duration_packets: localClip.value?.duration_packets,
    scrollDirection: Number(scrollDirection.value),
    scrollDirectionName: getDirectionLabel(),
    scrollSpeed: scrollSpeed.value,
    textLength: textContent.value.length,
    textPreview: textContent.value.substring(0, 50) + (textContent.value.length > 50 ? '...' : ''),
  };
};

const saveChanges = () => {
  if (localClip.value) {
    emit('update:clip', {
      ...localClip.value,
      data: {
        textContent: textContent.value,
        scrollDirection: Number(scrollDirection.value),
        scrollSpeed: scrollSpeed.value,
      },
    });
  }
};
</script>

<style scoped>
.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

@keyframes scroll-up {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(-100px);
    opacity: 1;
  }
}

@keyframes scroll-down {
  from {
    transform: translateY(-100px);
    opacity: 0;
  }
  to {
    transform: translateY(100px);
    opacity: 1;
  }
}

@keyframes scroll-left {
  from {
    transform: translateX(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-100px);
    opacity: 1;
  }
}

@keyframes scroll-right {
  from {
    transform: translateX(-100px);
    opacity: 0;
  }
  to {
    transform: translateX(100px);
    opacity: 1;
  }
}
</style>

// VIM: set ft=vue :
// END
