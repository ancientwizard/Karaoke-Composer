/**
 * CDGMagic_PreviewWindow: Media Preview Window
 *
 * Preview window for CD+G media playback and frame navigation:
 * - Window lifecycle management (modal and modeless)
 * - Dimension and title management
 * - Frame-accurate navigation (first, last, next, previous, jump)
 * - Display modes and zoom control
 * - Grid overlay and background color management
 * - Auto-update synchronization with playback
 * - Frame rendering
 *
 * 32 comprehensive tests covering window lifecycle, dimensions, title,
 * frame navigation, display modes, zoom, grid settings, playback sync,
 * rendering, and validation.
 */

import { CDGMagic_PreviewWindow } from "@/ts/cd+g-magic/CDGMagic_PreviewWindow";

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

// vim: ts=2 sw=2 et
// END
