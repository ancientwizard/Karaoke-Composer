<template>
  <div>
    <h6><i class="bi bi-question-circle"></i> Hotkeys</h6>
    <div class="small">
      <div class="hotkey-list mb-2">
        <div class="hotkey-item">
          <kbd>Space</kbd><span>Play/Timing</span>
        </div>
        <div class="hotkey-item">
          <kbd>Enter</kbd><span>Play/Pause</span>
        </div>
        <div class="hotkey-item">
          <kbd>0</kbd><kbd>.</kbd><span>Assign timing</span>
        </div>
        <div class="hotkey-item">
          <kbd>+</kbd><kbd>-</kbd><span>Skip short</span>
        </div>
        <div class="hotkey-item">
          <kbd>Ctrl</kbd><kbd>←</kbd><kbd>→</kbd><span>Skip 5s</span>
        </div>
        <div class="hotkey-item">
          <kbd>Alt</kbd><kbd>T</kbd><span>Toggle mode</span>
        </div>
        <div class="hotkey-item">
          <kbd>Home</kbd><kbd>End</kbd><span>Start/End</span>
        </div>
        <div class="hotkey-item">
          <kbd>Esc</kbd><span>Exit mode</span>
        </div>
      </div>
      <div class="timing-steps">
        <strong>Workflow:</strong>
        <ol class="small-steps">
          <li>Start timing mode</li>
          <li>Press Space to play & assign word starts</li>
          <li>Edit word boxes manually</li>
          <li>Adjust syllable timings</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotkey-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.hotkey-item kbd {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
  min-width: auto;
}

.hotkey-item span {
  flex: 1;
  font-size: 0.75rem;
}

.timing-steps {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
  font-size: 1.2rem;
}

.small-steps {
  margin: 0.25rem 0 0 1rem;
  padding-left: 0;
  line-height: 1.3;
}
</style>
