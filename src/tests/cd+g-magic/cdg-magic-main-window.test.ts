/**
 * CDGMagic_MainWindow: Main Application Window Management
 *
 * Main window for CD+G Magic application providing:
 * - Window lifecycle management (open/close)
 * - Dimension and title management
 * - Track and playback control
 * - Undo/redo and unsaved changes tracking
 * - Project file management and metadata
 * - Project creation, opening, saving, and export
 *
 * 32 comprehensive tests covering window lifecycle, dimensions, title,
 * track management, playback control, undo/redo, state tracking, project
 * file operations, and validation.
 */

import { CDGMagic_MainWindow } from "@/ts/cd+g-magic/CDGMagic_MainWindow";
import { CDGMagic_EditingGroup } from "@/ts/cd+g-magic/CDGMagic_EditingGroup";

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

// vim: ts=2 sw=2 et
// END
