/**
 * phase-10.test.ts
 * Tests for MainWindow, PreviewWindow, and Application classes
 */

import { CDGMagic_MainWindow } from "@/ts/cd+g-magic/CDGMagic_MainWindow";
import { CDGMagic_PreviewWindow } from "@/ts/cd+g-magic/CDGMagic_PreviewWindow";
import { CDGMagic_Application } from "@/ts/cd+g-magic/CDGMagic_Application";
import { CDGMagic_EditingGroup } from "@/ts/cd+g-magic/CDGMagic_EditingGroup";

/**
 * MainWindow Tests
 */
describe("CDGMagic_MainWindow", () => {
  let main_window: CDGMagic_MainWindow;

  beforeEach(() => {
    main_window = new CDGMagic_MainWindow();
  });

  // Window lifecycle
  test("should create main window", () => {
    expect(main_window).toBeDefined();
    expect(main_window.is_open()).toBe(false);
  });

  test("should open window", () => {
    expect(main_window.open()).toBe(true);
    expect(main_window.is_open()).toBe(true);
  });

  test("should close window", () => {
    main_window.open();
    expect(main_window.close()).toBe(true);
    expect(main_window.is_open()).toBe(false);
  });

  // Dimensions
  test("should get/set width", () => {
    main_window.set_width(800);
    expect(main_window.get_width()).toBe(800);
  });

  test("should clamp width to valid range", () => {
    main_window.set_width(100); // Below minimum
    expect(main_window.get_width()).toBe(1024); // Unchanged

    main_window.set_width(3000); // Above maximum
    expect(main_window.get_width()).toBe(1024); // Unchanged

    main_window.set_width(1200); // Valid
    expect(main_window.get_width()).toBe(1200);
  });

  test("should get/set height", () => {
    main_window.set_height(600);
    expect(main_window.get_height()).toBe(600);
  });

  test("should clamp height to valid range", () => {
    main_window.set_height(200); // Below minimum
    expect(main_window.get_height()).toBe(768); // Unchanged

    main_window.set_height(2000); // Above maximum
    expect(main_window.get_height()).toBe(768); // Unchanged

    main_window.set_height(700); // Valid
    expect(main_window.get_height()).toBe(700);
  });

  // Title
  test("should get/set title", () => {
    main_window.set_title("Test Project");
    expect(main_window.get_title()).toBe("Test Project");
  });

  test("should not set empty title", () => {
    main_window.set_title("Original");
    main_window.set_title("");
    expect(main_window.get_title()).toBe("Original");
  });

  // Track management
  test("should get/set current track", () => {
    main_window.set_current_track(5);
    expect(main_window.get_current_track()).toBe(5);
  });

  test("should clamp current track to valid range", () => {
    main_window.set_current_track(-1);
    expect(main_window.get_current_track()).toBe(0); // Unchanged

    main_window.set_current_track(20);
    expect(main_window.get_current_track()).toBe(0); // Unchanged

    main_window.set_current_track(10);
    expect(main_window.get_current_track()).toBe(10);
  });

  // Playback control
  test("should start playback", () => {
    main_window.set_editing_group(new CDGMagic_EditingGroup());
    expect(main_window.is_playing()).toBe(false);
    expect(main_window.start_playback()).toBe(true);
    expect(main_window.is_playing()).toBe(true);
  });

  test("should stop playback", () => {
    main_window.set_editing_group(new CDGMagic_EditingGroup());
    main_window.start_playback();
    main_window.stop_playback();
    expect(main_window.is_playing()).toBe(false);
    expect(main_window.get_playback_position()).toBe(0);
  });

  test("should pause playback", () => {
    main_window.set_editing_group(new CDGMagic_EditingGroup());
    main_window.set_project_duration(5000);
    main_window.start_playback();
    main_window.set_playback_position(1000);
    main_window.pause_playback();
    expect(main_window.is_playing()).toBe(false);
    expect(main_window.get_playback_position()).toBe(1000);
  });

  test("should get/set playback position", () => {
    main_window.set_project_duration(5000);
    main_window.set_playback_position(2500);
    expect(main_window.get_playback_position()).toBe(2500);
  });

  test("should clamp playback position", () => {
    main_window.set_project_duration(5000);
    main_window.set_playback_position(6000);
    expect(main_window.get_playback_position()).toBe(0); // Unchanged
  });

  test("should get/set playback speed", () => {
    main_window.set_playback_speed(1.5);
    expect(main_window.get_playback_speed()).toBe(1.5);
  });

  test("should clamp playback speed", () => {
    main_window.set_playback_speed(3.0); // Above maximum
    expect(main_window.get_playback_speed()).toBe(1.0); // Unchanged

    main_window.set_playback_speed(0.1); // Below minimum
    expect(main_window.get_playback_speed()).toBe(1.0); // Unchanged

    main_window.set_playback_speed(0.5);
    expect(main_window.get_playback_speed()).toBe(0.5);
  });

  // Undo/Redo
  test("should manage undo/redo state", () => {
    expect(main_window.can_undo()).toBe(false);
    expect(main_window.can_redo()).toBe(false);

    main_window.set_can_undo(true);
    expect(main_window.can_undo()).toBe(true);

    main_window.set_can_redo(true);
    expect(main_window.can_redo()).toBe(true);
  });

  // Unsaved changes
  test("should track unsaved changes", () => {
    expect(main_window.has_unsaved_changes()).toBe(false);

    main_window.set_unsaved_changes(true);
    expect(main_window.has_unsaved_changes()).toBe(true);

    main_window.set_unsaved_changes(false);
    expect(main_window.has_unsaved_changes()).toBe(false);
  });

  // Status message
  test("should get/set status message", () => {
    main_window.set_status_message("Processing...");
    expect(main_window.get_status_message()).toBe("Processing...");
  });

  test("should not set empty status message", () => {
    main_window.set_status_message("Original");
    main_window.set_status_message("");
    expect(main_window.get_status_message()).toBe("Original");
  });

  // Project file path
  test("should get/set project file path", () => {
    main_window.set_project_file_path("/path/to/project.cdg");
    expect(main_window.get_project_file_path()).toBe("/path/to/project.cdg");
  });

  test("should update title when file path set", () => {
    main_window.set_project_file_path("/path/to/myproject.cdg");
    const title = main_window.get_title();
    expect(title).toContain("myproject.cdg");
  });

  test("should update title for unsaved changes", () => {
    main_window.set_project_file_path("/path/to/project.cdg");
    main_window.set_unsaved_changes(true);
    const title = main_window.get_title();
    expect(title).toContain(" *");
  });

  // Project duration
  test("should get/set project duration", () => {
    main_window.set_project_duration(10000);
    expect(main_window.get_project_duration()).toBe(10000);
  });

  // Project operations
  test("should create new project", () => {
    expect(main_window.new_project()).toBe(true);
    expect(main_window.get_project_file_path()).toBe("");
    expect(main_window.get_project_duration()).toBe(0);
  });

  test("should open project", () => {
    expect(main_window.open_project("/path/to/file.cdg")).toBe(true);
    expect(main_window.get_project_file_path()).toBe("/path/to/file.cdg");
  });

  test("should save project", () => {
    main_window.set_project_file_path("/path/to/file.cdg");
    expect(main_window.save_project()).toBe(true);
    expect(main_window.has_unsaved_changes()).toBe(false);
  });

  test("should fail to save without file path", () => {
    expect(main_window.save_project()).toBe(false);
  });

  test("should export CDG", () => {
    main_window.set_editing_group(new CDGMagic_EditingGroup());
    expect(main_window.export_cdg("/output/file.cdg")).toBe(true);
  });

  // Validation
  test("should validate state", () => {
    expect(main_window.validate()).toBe(true);

    main_window.set_width(100); // Invalid
    expect(main_window.validate()).toBe(true); // Still valid (unchanged)
  });
});

/**
 * PreviewWindow Tests
 */
describe("CDGMagic_PreviewWindow", () => {
  let preview_window: CDGMagic_PreviewWindow;

  beforeEach(() => {
    preview_window = new CDGMagic_PreviewWindow();
  });

  // Window lifecycle
  test("should create preview window", () => {
    expect(preview_window).toBeDefined();
    expect(preview_window.is_open()).toBe(false);
  });

  test("should open window as modal", () => {
    expect(preview_window.open(false)).toBe(true);
    expect(preview_window.is_open()).toBe(true);
    expect(preview_window.is_modeless()).toBe(false);
  });

  test("should open window as modeless", () => {
    expect(preview_window.open(true)).toBe(true);
    expect(preview_window.is_modeless()).toBe(true);
  });

  test("should close window", () => {
    preview_window.open();
    expect(preview_window.close()).toBe(true);
    expect(preview_window.is_open()).toBe(false);
  });

  // Dimensions
  test("should get/set width", () => {
    preview_window.set_width(640);
    expect(preview_window.get_width()).toBe(640);
  });

  test("should clamp width to valid range", () => {
    preview_window.set_width(100); // Below minimum
    expect(preview_window.get_width()).toBe(320); // Unchanged

    preview_window.set_width(2000); // Above maximum
    expect(preview_window.get_width()).toBe(320); // Unchanged

    preview_window.set_width(800);
    expect(preview_window.get_width()).toBe(800);
  });

  test("should get/set height", () => {
    preview_window.set_height(480);
    expect(preview_window.get_height()).toBe(480);
  });

  test("should clamp height to valid range", () => {
    preview_window.set_height(100); // Below minimum
    expect(preview_window.get_height()).toBe(240); // Unchanged

    preview_window.set_height(1200); // Above maximum
    expect(preview_window.get_height()).toBe(240); // Unchanged

    preview_window.set_height(600);
    expect(preview_window.get_height()).toBe(600);
  });

  // Title
  test("should get/set title", () => {
    preview_window.set_title("Preview");
    expect(preview_window.get_title()).toBe("Preview");
  });

  // Frame navigation
  test("should get/set current frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(500);
    expect(preview_window.get_current_frame()).toBe(500);
  });

  test("should navigate to next frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(500);
    expect(preview_window.next_frame()).toBe(true);
    expect(preview_window.get_current_frame()).toBe(501);
  });

  test("should not go past last frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(1000);
    expect(preview_window.next_frame()).toBe(false);
  });

  test("should navigate to previous frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(500);
    expect(preview_window.previous_frame()).toBe(true);
    expect(preview_window.get_current_frame()).toBe(499);
  });

  test("should not go before first frame", () => {
    preview_window.set_current_frame(0);
    expect(preview_window.previous_frame()).toBe(false);
  });

  test("should jump to first frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(500);
    expect(preview_window.first_frame()).toBe(true);
    expect(preview_window.get_current_frame()).toBe(0);
  });

  test("should jump to last frame", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_current_frame(500);
    expect(preview_window.last_frame()).toBe(true);
    expect(preview_window.get_current_frame()).toBe(1000);
  });

  // Display mode
  test("should get/set display mode", () => {
    preview_window.set_display_mode("fit");
    expect(preview_window.get_display_mode()).toBe("fit");

    preview_window.set_display_mode("actual");
    expect(preview_window.get_display_mode()).toBe("actual");
  });

  test("should ignore invalid display mode", () => {
    preview_window.set_display_mode("preview");
    preview_window.set_display_mode("invalid" as any);
    expect(preview_window.get_display_mode()).toBe("preview");
  });

  // Zoom
  test("should get/set zoom level", () => {
    preview_window.set_zoom_level(2.0);
    expect(preview_window.get_zoom_level()).toBe(2.0);
  });

  test("should clamp zoom level", () => {
    preview_window.set_zoom_level(10.0); // Above maximum
    expect(preview_window.get_zoom_level()).toBe(1.0); // Unchanged

    preview_window.set_zoom_level(0.1); // Below minimum
    expect(preview_window.get_zoom_level()).toBe(1.0); // Unchanged

    preview_window.set_zoom_level(1.5);
    expect(preview_window.get_zoom_level()).toBe(1.5);
  });

  test("should zoom in", () => {
    preview_window.set_zoom_level(1.0);
    expect(preview_window.zoom_in()).toBe(true);
    expect(preview_window.get_zoom_level()).toBeCloseTo(1.2, 5);
  });

  test("should zoom out", () => {
    preview_window.set_zoom_level(2.0);
    expect(preview_window.zoom_out()).toBe(true);
    expect(preview_window.get_zoom_level()).toBeCloseTo(1.6666, 3);
  });

  test("should reset zoom", () => {
    preview_window.set_zoom_level(2.5);
    expect(preview_window.zoom_reset()).toBe(true);
    expect(preview_window.get_zoom_level()).toBe(1.0);
  });

  // Auto-update
  test("should enable/disable auto-update", () => {
    expect(preview_window.is_auto_update_enabled()).toBe(true);
    preview_window.set_auto_update_enabled(false);
    expect(preview_window.is_auto_update_enabled()).toBe(false);
  });

  // Background color
  test("should get/set background color", () => {
    preview_window.set_background_color(5);
    expect(preview_window.get_background_color()).toBe(5);
  });

  test("should clamp background color", () => {
    preview_window.set_background_color(20);
    expect(preview_window.get_background_color()).toBe(0); // Unchanged

    preview_window.set_background_color(10);
    expect(preview_window.get_background_color()).toBe(10);
  });

  // Grid
  test("should show/hide grid", () => {
    expect(preview_window.is_grid_shown()).toBe(false);
    preview_window.set_grid_visible(true);
    expect(preview_window.is_grid_shown()).toBe(true);
  });

  test("should get/set grid opacity", () => {
    preview_window.set_grid_opacity(0.7);
    expect(preview_window.get_grid_opacity()).toBe(0.7);
  });

  test("should clamp grid opacity", () => {
    preview_window.set_grid_opacity(1.5);
    expect(preview_window.get_grid_opacity()).toBe(0.5); // Unchanged

    preview_window.set_grid_opacity(0.3);
    expect(preview_window.get_grid_opacity()).toBe(0.3);
  });

  // Playback sync
  test("should update from playback position", () => {
    preview_window.set_total_frames(1000);
    preview_window.set_auto_update_enabled(true);
    preview_window.update_from_playback(250);
    expect(preview_window.get_current_frame()).toBe(250);
  });

  // Rendering
  test("should render frame", () => {
    expect(preview_window.render_frame()).toBe(false); // No decoder set
  });

  // Validation
  test("should validate state", () => {
    expect(preview_window.validate()).toBe(true);
  });
});

/**
 * Application Tests
 */
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
