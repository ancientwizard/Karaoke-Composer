/**
 * CDGMagic_Application.ts
 * Main application orchestrator
 */

import { CDGMagic_AudioPlayback   } from "@/ts/cd+g-magic/CDGMagic_AudioPlayback";
import { CDGMagic_GraphicsDecoder } from "@/ts/cd+g-magic/CDGMagic_GraphicsDecoder";
import { CDGMagic_MainWindow      } from "@/ts/cd+g-magic/CDGMagic_MainWindow";
import { CDGMagic_PreviewWindow   } from "@/ts/cd+g-magic/CDGMagic_PreviewWindow";
import { CDGMagic_EditingGroup    } from "@/ts/cd+g-magic/CDGMagic_EditingGroup";
import { CDGEnv } from "@/ts/cd+g-magic/CDGMagic_Environment";

/**
 * Application: Main orchestrator for CD+Graphics Magic
 *
 * Contains:
 * - Application lifecycle management
 * - Main window and preview window coordination
 * - Audio playback management
 * - Graphics decoding coordination
 * - Project state management
 * - Undo/redo history
 *
 * Responsibilities:
 * - Manage application startup/shutdown
 * - Coordinate between UI components
 * - Handle file I/O
 * - Manage audio/video synchronization
 * - Maintain editing history
 *
 * Use Cases:
 * 1. Initialize application
 * 2. Open/create/save projects
 * 3. Play projects with audio
 * 4. Edit content
 * 5. Export to CDG
 */
export
class CDGMagic_Application {
  // Application state
  private internal_is_running: boolean;
  private internal_version: string;

  // Window management
  private internal_main_window: CDGMagic_MainWindow | null;
  private internal_preview_window: CDGMagic_PreviewWindow | null;

  // Audio and graphics
  private internal_audio_playback: CDGMagic_AudioPlayback | null;
  private internal_graphics_decoder: CDGMagic_GraphicsDecoder | null;

  // Project state
  private internal_current_project: CDGMagic_EditingGroup | null;
  private internal_project_modified: boolean;
  private internal_project_file_path: string;

  // Edit history
  private internal_undo_history: Array<unknown>;
  private internal_redo_history: Array<unknown>;
  private internal_max_undo_levels: number;

  // Playback synchronization
  private internal_is_playing: boolean;
  private internal_playback_position: number;
  private internal_playback_timer: ReturnType<typeof setInterval> | null;

  /**
   * Create application instance
   */
  constructor() {
    this.internal_is_running = false;
    this.internal_version = "1.0.0";

    this.internal_main_window = null;
    this.internal_preview_window = null;

    this.internal_audio_playback = null;
    this.internal_graphics_decoder = null;

    this.internal_current_project = null;
    this.internal_project_modified = false;
    this.internal_project_file_path = "";

    this.internal_undo_history = [];
    this.internal_redo_history = [];
    this.internal_max_undo_levels = 100;

    this.internal_is_playing = false;
    this.internal_playback_position = 0;
    this.internal_playback_timer = null;
  }

  /**
   * Initialize application
   *
   * @returns True if initialized successfully
   */
  initialize(): boolean {
    try {
      this.internal_main_window = new CDGMagic_MainWindow();
      this.internal_preview_window = new CDGMagic_PreviewWindow();
      this.internal_audio_playback = new CDGMagic_AudioPlayback();
      this.internal_graphics_decoder = new CDGMagic_GraphicsDecoder();

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to initialize application:", error);
      return false;
    }
  }

  /**
   * Start application
   *
   * @returns True if started successfully
   */
  start(): boolean {
    try {
      if (!this.initialize()) {
        return false;
      }

      if (!this.internal_main_window || !this.internal_preview_window) {
        return false;
      }

      if (!this.internal_main_window.open()) {
        return false;
      }

      this.internal_is_running = true;
      return true;
    } catch (error) {
      CDGEnv.logError("Failed to start application:", error);
      this.internal_is_running = false;
      return false;
    }
  }

  /**
   * Stop application
   *
   * @returns True if stopped successfully
   */
  stop(): boolean {
    try {
      // Stop playback
      if (this.internal_is_playing) {
        this.stop_playback();
      }

      // Close windows
      if (this.internal_main_window) {
        this.internal_main_window.close();
      }

      if (this.internal_preview_window && this.internal_preview_window.is_open()) {
        this.internal_preview_window.close();
      }

      this.internal_is_running = false;
      return true;
    } catch (error) {
      CDGEnv.logError("Failed to stop application:", error);
      return false;
    }
  }

  /**
   * Check if application is running
   *
   * @returns True if running
   */
  is_running(): boolean {
    return this.internal_is_running;
  }

  /**
   * Get application version
   *
   * @returns Version string
   */
  get_version(): string {
    return this.internal_version;
  }

  /**
   * Get main window
   *
   * @returns MainWindow instance or null
   */
  get_main_window(): CDGMagic_MainWindow | null {
    return this.internal_main_window;
  }

  /**
   * Get preview window
   *
   * @returns PreviewWindow instance or null
   */
  get_preview_window(): CDGMagic_PreviewWindow | null {
    return this.internal_preview_window;
  }

  /**
   * Get audio playback
   *
   * @returns AudioPlayback instance or null
   */
  get_audio_playback(): CDGMagic_AudioPlayback | null {
    return this.internal_audio_playback;
  }

  /**
   * Get graphics decoder
   *
   * @returns GraphicsDecoder instance or null
   */
  get_graphics_decoder(): CDGMagic_GraphicsDecoder | null {
    return this.internal_graphics_decoder;
  }

  /**
   * Get current project
   *
   * @returns EditingGroup or null
   */
  get_current_project(): CDGMagic_EditingGroup | null {
    return this.internal_current_project;
  }

  /**
   * Set current project
   *
   * @param project EditingGroup instance
   */
  set_current_project(project: CDGMagic_EditingGroup): void {
    this.internal_current_project = project;
    if (this.internal_main_window) {
      this.internal_main_window.set_editing_group(project);
    }
  }

  /**
   * Check if project has been modified
   *
   * @returns True if modified
   */
  is_project_modified(): boolean {
    return this.internal_project_modified;
  }

  /**
   * Mark project as modified
   *
   * @param modified Modified state
   */
  set_project_modified(modified: boolean): void {
    this.internal_project_modified = modified;
    if (this.internal_main_window) {
      this.internal_main_window.set_unsaved_changes(modified);
    }
  }

  /**
   * Get project file path
   *
   * @returns File path or empty string
   */
  get_project_file_path(): string {
    return this.internal_project_file_path;
  }

  /**
   * Create new project
   *
   * @returns True if successful
   */
  new_project(): boolean {
    try {
      this.internal_current_project = new CDGMagic_EditingGroup();
      this.internal_project_file_path = "";
      this.internal_project_modified = false;
      this.internal_undo_history = [];
      this.internal_redo_history = [];

      if (this.internal_main_window) {
        this.internal_main_window.new_project();
        if (this.internal_current_project) {
          this.internal_main_window.set_editing_group(this.internal_current_project);
        }
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to create new project:", error);
      return false;
    }
  }

  /**
   * Open project from file
   *
   * @param path File path
   * @returns True if successful
   */
  open_project(path: string): boolean {
    try {
      if (path.length === 0) {
        return false;
      }

      // Load project (would read from file)
      this.internal_current_project = new CDGMagic_EditingGroup();
      this.internal_project_file_path = path;
      this.internal_project_modified = false;
      this.internal_undo_history = [];
      this.internal_redo_history = [];

      if (this.internal_main_window) {
        this.internal_main_window.open_project(path);
        if (this.internal_current_project) {
          this.internal_main_window.set_editing_group(this.internal_current_project);
        }
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to open project:", error);
      return false;
    }
  }

  /**
   * Save current project
   *
   * @returns True if successful
   */
  save_project(): boolean {
    try {
      if (this.internal_project_file_path.length === 0) {
        return false;
      }

      // Save to file (would write)
      this.internal_project_modified = false;

      if (this.internal_main_window) {
        this.internal_main_window.save_project();
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to save project:", error);
      return false;
    }
  }

  /**
   * Start playback with audio
   *
   * @returns True if started
   */
  start_playback(): boolean {
    try {
      if (!this.internal_current_project) {
        return false;
      }

      this.internal_is_playing = true;
      this.internal_playback_position = 0;

      if (this.internal_main_window) {
        this.internal_main_window.start_playback();
      }

      if (this.internal_audio_playback) {
        this.internal_audio_playback.play();
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to start playback:", error);
      return false;
    }
  }

  /**
   * Stop playback
   *
   * @returns True if stopped
   */
  stop_playback(): boolean {
    try {
      this.internal_is_playing = false;
      this.internal_playback_position = 0;

      if (this.internal_main_window) {
        this.internal_main_window.stop_playback();
      }

      if (this.internal_audio_playback) {
        this.internal_audio_playback.stop();
      }

      if (this.internal_playback_timer) {
        clearInterval(this.internal_playback_timer);
        this.internal_playback_timer = null;
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to stop playback:", error);
      return false;
    }
  }

  /**
   * Pause playback
   *
   * @returns True if paused
   */
  pause_playback(): boolean {
    try {
      this.internal_is_playing = false;

      if (this.internal_main_window) {
        this.internal_main_window.pause_playback();
      }

      if (this.internal_audio_playback) {
        this.internal_audio_playback.pause();
      }

      if (this.internal_playback_timer) {
        clearInterval(this.internal_playback_timer);
        this.internal_playback_timer = null;
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to pause playback:", error);
      return false;
    }
  }

  /**
   * Check if playing
   *
   * @returns True if playing
   */
  is_playing(): boolean {
    return this.internal_is_playing;
  }

  /**
   * Check if undo available
   *
   * @returns True if can undo
   */
  can_undo(): boolean {
    return this.internal_undo_history.length > 0;
  }

  /**
   * Check if redo available
   *
   * @returns True if can redo
   */
  can_redo(): boolean {
    return this.internal_redo_history.length > 0;
  }

  /**
   * Perform undo
   *
   * @returns True if successful
   */
  undo(): boolean {
    try {
      if (!this.can_undo()) {
        return false;
      }

      const action = this.internal_undo_history.pop();
      if (action) {
        this.internal_redo_history.push(action);
        this.set_project_modified(true);
        return true;
      }

      return false;
    } catch (error) {
      CDGEnv.logError("Failed to undo:", error);
      return false;
    }
  }

  /**
   * Perform redo
   *
   * @returns True if successful
   */
  redo(): boolean {
    try {
      if (!this.can_redo()) {
        return false;
      }

      const action = this.internal_redo_history.pop();
      if (action) {
        this.internal_undo_history.push(action);
        this.set_project_modified(true);
        return true;
      }

      return false;
    } catch (error) {
      CDGEnv.logError("Failed to redo:", error);
      return false;
    }
  }

  /**
   * Add action to undo history
   *
   * @param action Action to record
   */
  record_undo_action(action: unknown): void {
    this.internal_undo_history.push(action);

    if (this.internal_undo_history.length > this.internal_max_undo_levels) {
      this.internal_undo_history.shift();
    }

    // Clear redo history when new action recorded
    this.internal_redo_history = [];
  }

  /**
   * Export project to CDG format
   *
   * @param output_path Output file path
   * @returns True if successful
   */
  export_cdg(output_path: string): boolean {
    try {
      if (!this.internal_current_project) {
        return false;
      }

      if (output_path.length === 0) {
        return false;
      }

      if (this.internal_main_window) {
        this.internal_main_window.export_cdg(output_path);
      }

      return true;
    } catch (error) {
      CDGEnv.logError("Failed to export CDG:", error);
      return false;
    }
  }

  /**
   * Get max undo levels
   *
   * @returns Max undo levels
   */
  get_max_undo_levels(): number {
    return this.internal_max_undo_levels;
  }

  /**
   * Set max undo levels
   *
   * @param levels Max undo levels
   */
  set_max_undo_levels(levels: number): void {
    if (levels > 0 && levels <= 1000) {
      this.internal_max_undo_levels = levels;
    }
  }

  /**
   * Validate application state
   *
   * @returns True if valid
   */
  validate(): boolean {
    return (
      this.internal_version.length > 0 &&
      this.internal_max_undo_levels > 0 &&
      this.internal_max_undo_levels <= 1000
    );
  }
}

// VIM: set tabstop=2 shiftwidth=2 expandtab:
// END