/**
 * Tests for CDGMagic_Application
 *
 * This test suite covers the main application lifecycle, project management,
 * playback control, undo/redo functionality, and media handling.
 */

import { CDGMagic_Application } from "@/ts/cd+g-magic/CDGMagic_Application";

describe("CDGMagic_Application", () => {
  let app: CDGMagic_Application;

  beforeEach(() => {
    app = new CDGMagic_Application();
  });

  // Application lifecycle
  test("should create application", () => {
    expect(app).toBeDefined();
    expect(app.is_running()).toBe(false);
  });

  test("should initialize application", () => {
    expect(app.initialize()).toBe(true);
    expect(app.get_main_window()).toBeDefined();
    expect(app.get_preview_window()).toBeDefined();
  });

  test("should start application", () => {
    expect(app.start()).toBe(true);
    expect(app.is_running()).toBe(true);
    expect(app.get_main_window()).toBeDefined();
  });

  test("should stop application", () => {
    app.start();
    expect(app.stop()).toBe(true);
    expect(app.is_running()).toBe(false);
  });

  // Version
  test("should get version", () => {
    expect(app.get_version()).toBe("1.0.0");
  });

  // Window access
  test("should get main window", () => {
    app.initialize();
    expect(app.get_main_window()).toBeDefined();
  });

  test("should get preview window", () => {
    app.initialize();
    expect(app.get_preview_window()).toBeDefined();
  });

  test("should get audio playback", () => {
    app.initialize();
    expect(app.get_audio_playback()).toBeDefined();
  });

  test("should get graphics decoder", () => {
    app.initialize();
    expect(app.get_graphics_decoder()).toBeDefined();
  });

  // Project management
  test("should create new project", () => {
    app.initialize();
    expect(app.new_project()).toBe(true);
    expect(app.get_current_project()).toBeDefined();
  });

  test("should open project", () => {
    app.initialize();
    expect(app.open_project("/path/to/file.cdg")).toBe(true);
    expect(app.get_project_file_path()).toBe("/path/to/file.cdg");
  });

  test("should fail to open empty path", () => {
    app.initialize();
    expect(app.open_project("")).toBe(false);
  });

  test("should save project", () => {
    app.initialize();
    app.open_project("/path/to/file.cdg");
    expect(app.save_project()).toBe(true);
  });

  test("should track project modified state", () => {
    app.initialize();
    expect(app.is_project_modified()).toBe(false);
    app.set_project_modified(true);
    expect(app.is_project_modified()).toBe(true);
  });

  // Playback
  test("should start playback", () => {
    app.initialize();
    app.new_project();
    expect(app.start_playback()).toBe(true);
    expect(app.is_playing()).toBe(true);
  });

  test("should stop playback", () => {
    app.initialize();
    app.new_project();
    app.start_playback();
    expect(app.stop_playback()).toBe(true);
    expect(app.is_playing()).toBe(false);
  });

  test("should pause playback", () => {
    app.initialize();
    app.new_project();
    app.start_playback();
    expect(app.pause_playback()).toBe(true);
    expect(app.is_playing()).toBe(false);
  });

  // Undo/Redo
  test("should track undo availability", () => {
    expect(app.can_undo()).toBe(false);
    app.record_undo_action({ type: "edit" });
    expect(app.can_undo()).toBe(true);
  });

  test("should perform undo", () => {
    app.record_undo_action({ type: "edit" });
    expect(app.undo()).toBe(true);
    expect(app.can_redo()).toBe(true);
  });

  test("should perform redo", () => {
    app.record_undo_action({ type: "edit" });
    app.undo();
    expect(app.redo()).toBe(true);
    expect(app.can_undo()).toBe(true);
  });

  test("should clear redo history on new action", () => {
    app.record_undo_action({ type: "edit1" });
    app.undo();
    expect(app.can_redo()).toBe(true);
    app.record_undo_action({ type: "edit2" });
    expect(app.can_redo()).toBe(false);
  });

  test("should respect max undo levels", () => {
    app.set_max_undo_levels(10);
    for (let i = 0; i < 20; i++) {
      app.record_undo_action({
        type: "edit",
        index: i,
      });
    }
    // Should not exceed max levels
    let undo_count = 0;
    while (app.can_undo()) {
      app.undo();
      undo_count++;
    }
    expect(undo_count).toBeLessThanOrEqual(10);
  });

  // Max undo levels
  test("should get/set max undo levels", () => {
    app.set_max_undo_levels(50);
    expect(app.get_max_undo_levels()).toBe(50);
  });

  test("should clamp max undo levels", () => {
    app.set_max_undo_levels(2000); // Above maximum
    expect(app.get_max_undo_levels()).toBe(100); // Unchanged

    app.set_max_undo_levels(0); // Below minimum
    expect(app.get_max_undo_levels()).toBe(100); // Unchanged
  });

  // Export
  test("should export CDG", () => {
    app.initialize();
    app.new_project();
    expect(app.export_cdg("/output/file.cdg")).toBe(true);
  });

  test("should fail export without project", () => {
    app.initialize();
    expect(app.export_cdg("/output/file.cdg")).toBe(false);
  });

  // Validation
  test("should validate state", () => {
    expect(app.validate()).toBe(true);
  });
});

// vim: ts=2 sw=2 et
// END
