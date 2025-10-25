<template>
  <div class="hotkey-help">

    <div class="hotkey-group">
      <div class="hotkey-trigger" role="button" aria-haspopup="true">
        <i class="bi bi-question-circle"></i>
        <span class="hotkey-title">Hotkeys</span>
      </div>

      <div class="hotkey-panel" role="region" aria-label="Hotkeys reference">
        <strong>Hotkeys:</strong>
        <div class="hotkey-steps">
          <div class="small">
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
              <kbd>Ctrl</kbd><kbd>F</kbd><span>Fast refresh (smoother)</span>
            </div>
            <div class="hotkey-item">
              <kbd>Home</kbd><kbd>End</kbd><span>Start/End</span>
            </div>
            <div class="hotkey-item">
              <kbd>Esc</kbd><span>Exit "Add Timing" mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="workflow-group ms-2">

      <div class="workflow-trigger" role="button" aria-haspopup="true">
        <i class="bi bi-clipboard-check" aria-hidden="true" />
        <span class="workflow-title">Workflow</span>
      </div>

      <div class="workflow-panel" role="region" aria-label="Workflow reference">
        <strong>Workflow:</strong>
        <div class="workflow-steps">
          <div class="small">
            <ol class="small-steps">
              <li>Start timing mode</li>
              <li>Press Space to play, then Space during playback to assign "word" timings</li>
              <li>Edit word boxes manually</li>
              <li>Adjust syllable timings</li>
              <li>Save your work</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Layout for items inside the panels */
.hotkey-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.hotkey-item kbd {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
}

.hotkey-item span {
  flex: 1;
  font-size: 0.75rem;
}

/* Workflow block styling (used in template) */
.hotkey-panel,
.workflow-panel {
  display: none;
  position: absolute;
  /* panels are anchored above triggers by default; use a CSS variable to nudge them higher */
  bottom: calc(100% + var(--hotkey-panel-offset, 1rem));
  left: 0;   /* left-align to the parent container */
  min-width: 18rem;
  max-width: calc(100% - 1rem); /* never overflow parent/viewport */
  width: min(18rem, 100%);
  background: var(--bs-body-bg);
  border-radius: 0.4rem;
  padding: 0.5rem;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  z-index: 30;
  box-sizing: border-box;
}

.hotkey-help {
  display: inline-flex;
  gap: 0.5rem;
  position: relative; /* anchor panels to this container */
}

.hotkey-group,
.workflow-group {
  position: relative;
  display: inline-block;
}

.hotkey-trigger, .workflow-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--bs-body-color);
}

.workflow-panel {
  left: -105%; /* It's magic but leave as is! */
}

/* show panel only when its group is hovered */
.hotkey-group:hover .hotkey-panel {
  display: block;
}

.workflow-group:hover .workflow-panel {
  display: block;
}

.hotkey-title, .workflow-title {
  font-weight: 600;
}

/* caret/arrow that visually links the panel to its trigger */
.hotkey-panel::before,
.workflow-panel::before {
  content: "";
  position: absolute;
  bottom: -10px; /* sit below the panel, pointing to trigger (panels are displayed above triggers) */
  left: 1rem; /* default offset, overridden for workflow below */
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid var(--bs-body-bg);
  pointer-events: none;
}

/* soft shadow under the caret to make it more visible */
.hotkey-panel::after,
.workflow-panel::after {
  content: "";
  position: absolute;
  bottom: -11px;
  left: 1rem;
  width: 0;
  height: 0;
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-top: 11px solid rgba(0,0,0,0.08);
  pointer-events: none;
  z-index: 0;
}

/* position caret closer to the workflow trigger (panel is offset) */
.workflow-panel::before,
.workflow-panel::after {
  left: auto;
  right: 1rem;
}

.hotkey-steps,
.workflow-steps {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.small-steps {
  margin: 0.25rem 0 0 1rem;
  padding-left: 0;
  line-height: 1.3;
  font-size: 0.9rem;
}

</style>
