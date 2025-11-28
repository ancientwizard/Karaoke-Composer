/**
 * Unit tests for Phase 8 CD+Graphics Magic TypeScript conversions
 *
 * Tests:
 * - CDGMagic_TimeOutput: Time formatting (MM:SS:FF)
 * - CDGMagic_EditingLanes_PlaybackHead: Playback head position tracking
 * - CDGMagic_MovableClipBox: Draggable clip box UI element
 * - CDGMagic_EditingLanes: Multi-lane timeline display
 * - CDGMagic_EditingGroup: Multi-lane editing controller
 */

import { CDGMagic_TimeOutput } from "@/ts/cd+g-magic/CDGMagic_TimeOutput";
import { CDGMagic_EditingLanes_PlaybackHead } from "@/ts/cd+g-magic/CDGMagic_EditingLanes_PlaybackHead";
import { CDGMagic_MovableClipBox } from "@/ts/cd+g-magic/CDGMagic_MovableClipBox";
import { CDGMagic_EditingLanes } from "@/ts/cd+g-magic/CDGMagic_EditingLanes";
import { CDGMagic_EditingGroup } from "@/ts/cd+g-magic/CDGMagic_EditingGroup";
import { CDGMagic_MediaClip } from "@/ts/cd+g-magic/CDGMagic_MediaClip";

describe("Phase 8: UI/Window Classes", () => {
  describe("CDGMagic_TimeOutput - Time Formatting", () => {
    test("format_frames() converts 0 frames to 00:00:00", () => {
      expect(CDGMagic_TimeOutput.format_frames(0)).toBe("00:00:00");
    });

    test("format_frames() converts 300 frames to 00:01:00 (1 second)", () => {
      expect(CDGMagic_TimeOutput.format_frames(300)).toBe("00:01:00");
    });

    test("format_frames() converts 18000 frames to 01:00:00 (1 minute)", () => {
      expect(CDGMagic_TimeOutput.format_frames(18000)).toBe("01:00:00");
    });

    test("format_frames() converts 54300 frames to 03:01:00 (3 min 1 sec)", () => {
      expect(CDGMagic_TimeOutput.format_frames(54300)).toBe("03:01:00");
    });

    test("format_frames() handles mixed units: 18150 frames = 01:00:150", () => {
      // 18000 (1 min) + 150 (0 sec) = 150 frames offset
      // Actually: 18000 = 1 min exactly, so 18150 = 1 min + 0 sec + 150 frames
      expect(CDGMagic_TimeOutput.format_frames(18150)).toBe("01:00:150");
    });

    test("format_frames() zero-pads all components", () => {
      expect(CDGMagic_TimeOutput.format_frames(1)).toBe("00:00:01");
      expect(CDGMagic_TimeOutput.format_frames(305)).toBe("00:01:05");
    });

    test("format_seconds() converts 1.0 second to 00:01:00", () => {
      expect(CDGMagic_TimeOutput.format_seconds(1.0)).toBe("00:01:00");
    });

    test("format_seconds() converts 60 seconds to 04:00:00", () => {
      // 60 seconds = 18000 frames = 1 minute = 18000 / 18000 = 1 minute
      // But actually 60 seconds × 300 frames/sec = 18000 frames
      // 18000 frames / 18000 frames per minute = 1 minute
      expect(CDGMagic_TimeOutput.format_seconds(60.0)).toBe("01:00:00");
    });

    test("parse_to_frames() parses single number as frames", () => {
      expect(CDGMagic_TimeOutput.parse_to_frames("300")).toBe(300);
    });

    test("parse_to_frames() parses MM:SS format", () => {
      expect(CDGMagic_TimeOutput.parse_to_frames("1:30")).toBe(
        1 * 18000 + 30 * 300
      );
    });

    test("parse_to_frames() parses MM:SS:FF format", () => {
      expect(CDGMagic_TimeOutput.parse_to_frames("01:02:30")).toBe(
        1 * 18000 + 2 * 300 + 30
      );
    });

    test("parse_to_frames() handles invalid format", () => {
      expect(CDGMagic_TimeOutput.parse_to_frames("invalid")).toBe(0);
    });

    test("parse_to_frames() clamps negative values to 0", () => {
      expect(CDGMagic_TimeOutput.parse_to_frames("-100")).toBe(0);
    });

    test("parse_to_seconds() returns time in seconds", () => {
      const result = CDGMagic_TimeOutput.parse_to_seconds("1:00:00");
      expect(result).toBeCloseTo(60.0, 5);
    });

    test("is_valid_format() accepts single number", () => {
      expect(CDGMagic_TimeOutput.is_valid_format("100")).toBe(true);
    });

    test("is_valid_format() accepts MM:SS", () => {
      expect(CDGMagic_TimeOutput.is_valid_format("1:30")).toBe(true);
    });

    test("is_valid_format() accepts MM:SS:FF", () => {
      expect(CDGMagic_TimeOutput.is_valid_format("01:02:30")).toBe(true);
    });

    test("is_valid_format() rejects invalid format", () => {
      expect(CDGMagic_TimeOutput.is_valid_format("invalid")).toBe(false);
    });

    test("frames_per_second() returns 300", () => {
      expect(CDGMagic_TimeOutput.frames_per_second()).toBe(300);
    });

    test("frames_per_minute() returns 18000", () => {
      expect(CDGMagic_TimeOutput.frames_per_minute()).toBe(18000);
    });
  });

  describe("CDGMagic_EditingLanes_PlaybackHead - Playback Position", () => {
    let playback_head: CDGMagic_EditingLanes_PlaybackHead;

    beforeEach(() => {
      playback_head = new CDGMagic_EditingLanes_PlaybackHead(800, 0, 30000);
    });

    test("Constructor initializes at timeline start", () => {
      expect(playback_head.current_frame()).toBe(0);
    });

    test("current_frame() getter/setter works", () => {
      playback_head.current_frame(150);
      expect(playback_head.current_frame()).toBe(150);
    });

    test("current_frame() clamps to timeline range", () => {
      playback_head.current_frame(50000);
      expect(playback_head.current_frame()).toBe(30000);
    });

    test("frame_offset() returns offset from timeline start", () => {
      playback_head.current_frame(100);
      expect(playback_head.frame_offset()).toBe(100);
    });

    test("pixel_position() maps frame to pixel", () => {
      playback_head.current_frame(15000); // Middle of 30000 frame timeline
      const pixel_pos = playback_head.pixel_position();
      expect(pixel_pos).toBeCloseTo(400, 1); // Half of 800 pixels
    });

    test("pixel_position() at start is 0", () => {
      playback_head.current_frame(0);
      expect(playback_head.pixel_position()).toBe(0);
    });

    test("pixel_position() at end is full width", () => {
      playback_head.current_frame(30000);
      expect(playback_head.pixel_position()).toBe(800);
    });

    test("set_timeline_dimensions() updates scaling", () => {
      playback_head.set_timeline_dimensions(1600, 0, 60000);
      playback_head.current_frame(30000);
      expect(playback_head.pixel_position()).toBe(800); // Half of 1600
    });

    test("is_visible() getter/setter", () => {
      expect(playback_head.is_visible()).toBe(true);
      playback_head.is_visible(false);
      expect(playback_head.is_visible()).toBe(false);
    });

    test("is_playing() getter/setter", () => {
      expect(playback_head.is_playing()).toBe(false);
      playback_head.is_playing(true);
      expect(playback_head.is_playing()).toBe(true);
    });

    test("advance() increments position", () => {
      playback_head.current_frame(100);
      playback_head.advance(50);
      expect(playback_head.current_frame()).toBe(150);
    });

    test("reset() returns to start and stops", () => {
      playback_head.current_frame(1000);
      playback_head.is_playing(true);
      playback_head.reset();
      expect(playback_head.current_frame()).toBe(0);
      expect(playback_head.is_playing()).toBe(false);
    });

    test("frame_from_pixel() converts pixel to frame", () => {
      const frame = playback_head.frame_from_pixel(400); // Middle
      expect(frame).toBe(15000);
    });
  });

  describe("CDGMagic_MovableClipBox - Draggable Clip Element", () => {
    let clip: CDGMagic_MediaClip;
    let clip_box: CDGMagic_MovableClipBox;

    beforeEach(() => {
      clip = new CDGMagic_MediaClip(100, 200); // Start 100, duration 200
      clip_box = new CDGMagic_MovableClipBox(clip, 0, 800, 0, 30000);
    });

    test("Constructor initializes clip reference", () => {
      expect(clip_box.clip()).toBe(clip);
    });

    test("clip_index() returns index", () => {
      expect(clip_box.clip_index()).toBe(0);
    });

    test("pixel_x() calculates position", () => {
      // Clip starts at frame 100, timeline is 30000 frames wide in 800 pixels
      // Frame 100 / 30000 * 800 ≈ 2.67 pixels (rounded to 3)
      const pixel_x = clip_box.pixel_x();
      expect(pixel_x).toBeCloseTo(2.67, 0);
    });

    test("pixel_width() calculates clip width", () => {
      // Clip duration is 200 frames, 30000 frames in 800 pixels
      // 200 / 30000 * 800 ≈ 5.33 pixels (rounded to 5)
      const pixel_width = clip_box.pixel_width();
      expect(pixel_width).toBeCloseTo(5.33, 0);
    });

    test("bounding_box() returns x and width", () => {
      const bbox = clip_box.bounding_box();
      expect(bbox.x).toBeCloseTo(2.67, 0);
      expect(bbox.width).toBeCloseTo(5.33, 0);
    });

    test("contains_point() detects clicks inside", () => {
      const bbox = clip_box.bounding_box();
      expect(clip_box.contains_point(bbox.x + 2, 30)).toBe(true);
    });

    test("contains_point() rejects clicks outside", () => {
      expect(clip_box.contains_point(0, 30)).toBe(false);
    });

    test("is_selected() getter/setter", () => {
      expect(clip_box.is_selected()).toBe(false);
      clip_box.is_selected(true);
      expect(clip_box.is_selected()).toBe(true);
    });

    test("is_dragging() getter/setter", () => {
      expect(clip_box.is_dragging()).toBe(false);
      clip_box.is_dragging(true, 100);
      expect(clip_box.is_dragging()).toBe(true);
    });

    test("calculate_drag_position() handles drag", () => {
      const bbox = clip_box.bounding_box();
      clip_box.is_dragging(true, bbox.x);
      const new_pos = clip_box.calculate_drag_position(bbox.x + 100);
      expect(new_pos).toBeGreaterThan(100);
    });

    test("reset_ui_state() clears selection and drag", () => {
      clip_box.is_selected(true);
      clip_box.is_dragging(true, 100);
      clip_box.reset_ui_state();
      expect(clip_box.is_selected()).toBe(false);
      expect(clip_box.is_dragging()).toBe(false);
    });
  });

  describe("CDGMagic_EditingLanes - Timeline Lanes", () => {
    let lanes: CDGMagic_EditingLanes;
    let clip: CDGMagic_MediaClip;

    beforeEach(() => {
      lanes = new CDGMagic_EditingLanes(4, 800);
      clip = new CDGMagic_MediaClip(100, 200);
    });

    test("Constructor initializes lane count", () => {
      expect(lanes.lane_count()).toBe(4);
    });

    test("clip_count() returns 0 for empty lane", () => {
      expect(lanes.clip_count(0)).toBe(0);
    });

    test("add_clip() adds clip to lane", () => {
      lanes.add_clip(0, clip);
      expect(lanes.clip_count(0)).toBe(1);
    });

    test("add_clip() returns clip index", () => {
      const idx1 = lanes.add_clip(0, clip);
      expect(idx1).toBe(0);
      const idx2 = lanes.add_clip(0, clip);
      expect(idx2).toBe(1);
    });

    test("clip_at() retrieves clip box", () => {
      lanes.add_clip(0, clip);
      const clip_box = lanes.clip_at(0, 0);
      expect(clip_box).not.toBeUndefined();
      expect(clip_box?.clip()).toBe(clip);
    });

    test("remove_clip() removes from lane", () => {
      lanes.add_clip(0, clip);
      lanes.add_clip(0, clip);
      lanes.remove_clip(0, 0);
      expect(lanes.clip_count(0)).toBe(1);
    });

    test("clips_on_lane() returns all clips", () => {
      lanes.add_clip(0, clip);
      lanes.add_clip(0, clip);
      const clips = lanes.clips_on_lane(0);
      expect(clips.length).toBe(2);
    });

    test("clear_lane() removes all clips from lane", () => {
      lanes.add_clip(0, clip);
      lanes.add_clip(0, clip);
      lanes.clear_lane(0);
      expect(lanes.clip_count(0)).toBe(0);
    });

    test("clear_all_lanes() removes all clips", () => {
      lanes.add_clip(0, clip);
      lanes.add_clip(1, clip);
      lanes.clear_all_lanes();
      expect(lanes.clip_count(0)).toBe(0);
      expect(lanes.clip_count(1)).toBe(0);
    });

    test("playback_head() returns head", () => {
      const head = lanes.playback_head();
      expect(head).not.toBeUndefined();
    });

    test("lane_height() getter/setter", () => {
      expect(lanes.lane_height()).toBe(60);
      lanes.lane_height(80);
      expect(lanes.lane_height()).toBe(80);
    });

    test("lane_y_position() calculates Y offset", () => {
      lanes.lane_height(60);
      expect(lanes.lane_y_position(0)).toBe(0);
      expect(lanes.lane_y_position(1)).toBe(60);
      expect(lanes.lane_y_position(3)).toBe(180);
    });

    test("total_height() sums all lanes", () => {
      lanes.lane_height(60);
      expect(lanes.total_height()).toBe(240); // 4 lanes × 60
    });

    test("clip_at_position() finds clip at coordinates", () => {
      lanes.add_clip(0, clip);
      const clip_box = lanes.clip_at(0, 0);
      if (clip_box) {
        const bbox = clip_box.bounding_box();
        const result = lanes.clip_at_position(bbox.x + 2, 30);
        expect(result).not.toBeNull();
      }
    });

    test("zoom_level() getter/setter", () => {
      expect(lanes.zoom_level()).toBe(1.0);
      lanes.set_zoom(2.0);
      expect(lanes.zoom_level()).toBe(2.0);
    });

    test("reset() clears UI state but keeps clips", () => {
      lanes.add_clip(0, clip);
      lanes.reset();
      // Clips should still be there
      expect(lanes.clip_count(0)).toBe(1);
    });
  });

  describe("CDGMagic_EditingGroup - Multi-Lane Editing", () => {
    let group: CDGMagic_EditingGroup;

    beforeEach(() => {
      group = new CDGMagic_EditingGroup(4, 800);
    });

    test("Constructor creates editing lanes", () => {
      expect(group.editing_lanes().lane_count()).toBe(4);
    });

    test("track_options() returns options for lane", () => {
      const options = group.track_options(0);
      expect(options).not.toBeNull();
    });

    test("set_track_options() updates options", () => {
      const opts = group.track_options(0)!;
      group.set_track_options(0, opts);
      expect(group.track_options(0)).not.toBeNull();
    });

    test("select_lane() selects single lane", () => {
      group.select_lane(0);
      expect(group.is_lane_selected(0)).toBe(true);
    });

    test("select_lane(exclusive=true) deselects others", () => {
      group.select_lane(0);
      group.select_lane(1);
      expect(group.is_lane_selected(0)).toBe(false);
      expect(group.is_lane_selected(1)).toBe(true);
    });

    test("select_lane(exclusive=false) adds to selection", () => {
      group.select_lane(0);
      group.select_lane(1, false);
      expect(group.is_lane_selected(0)).toBe(true);
      expect(group.is_lane_selected(1)).toBe(true);
    });

    test("deselect_lane() removes from selection", () => {
      group.select_lane(0);
      group.deselect_lane(0);
      expect(group.is_lane_selected(0)).toBe(false);
    });

    test("toggle_lane_selection() toggles state", () => {
      expect(group.is_lane_selected(0)).toBe(false);
      group.toggle_lane_selection(0);
      expect(group.is_lane_selected(0)).toBe(true);
      group.toggle_lane_selection(0);
      expect(group.is_lane_selected(0)).toBe(false);
    });

    test("selected_lanes() returns sorted array", () => {
      group.select_lane(2);
      group.select_lane(0, false);
      group.select_lane(3, false);
      expect(group.selected_lanes()).toEqual([0, 2, 3]);
    });

    test("clear_selection() deselects all", () => {
      group.select_lane(0);
      group.select_lane(1, false);
      group.clear_selection();
      expect(group.selected_lanes()).toEqual([]);
    });

    test("scroll_x() getter/setter", () => {
      expect(group.scroll_x()).toBe(0);
      group.scroll_x(100);
      expect(group.scroll_x()).toBe(100);
    });

    test("scroll_y() getter/setter", () => {
      expect(group.scroll_y()).toBe(0);
      group.scroll_y(200);
      expect(group.scroll_y()).toBe(200);
    });

    test("scroll_by() increments position", () => {
      group.scroll_by(100, 50);
      expect(group.scroll_x()).toBe(100);
      expect(group.scroll_y()).toBe(50);
    });

    test("on_selection_changed() callback fires", (done) => {
      group.on_selection_changed((lanes) => {
        expect(lanes).toEqual([0]);
        done();
      });
      group.select_lane(0);
    });

    test("on_clip_moved() callback fires", (done) => {
      group.on_clip_moved((lane, from, to) => {
        expect(lane).toBe(0);
        expect(from).toBe(100);
        expect(to).toBe(200);
        done();
      });
      group.notify_clip_moved(0, 100, 200);
    });

    test("apply_to_selected_lanes() applies operation", () => {
      group.select_lane(0);
      group.select_lane(2, false);
      const called: number[] = [];
      group.apply_to_selected_lanes((lane) => {
        called.push(lane);
      });
      expect(called).toEqual([0, 2]);
    });

    test("reset() clears all state", () => {
      group.select_lane(0);
      group.scroll_x(100);
      group.reset();
      expect(group.selected_lanes()).toEqual([]);
      expect(group.scroll_x()).toBe(0);
    });
  });

  describe("Phase 8 Integration Scenarios", () => {
    test("Scenario: Timeline with time display", () => {
      const lanes = new CDGMagic_EditingLanes(2, 1200);
      const clip1 = new CDGMagic_MediaClip(0, 300);
      const clip2 = new CDGMagic_MediaClip(400, 600);

      lanes.add_clip(0, clip1);
      lanes.add_clip(0, clip2);

      const head = lanes.playback_head();
      head.current_frame(150);

      const time_str = CDGMagic_TimeOutput.format_frames(head.current_frame());
      expect(time_str).toBe("00:00:150");
    });

    test("Scenario: Multi-lane editing with callbacks", (done) => {
      const group = new CDGMagic_EditingGroup(4, 800);
      let selection_count = 0;

      group.on_selection_changed(() => {
        selection_count++;
        if (selection_count === 2) {
          expect(group.selected_lanes()).toEqual([0, 1]);
          done();
        }
      });

      group.select_lane(0);
      group.select_lane(1, false);
    });

    test("Scenario: Drag and drop clip", () => {
      const clip = new CDGMagic_MediaClip(100, 200);
      const clip_box = new CDGMagic_MovableClipBox(clip, 0, 800, 0, 30000);

      const bbox = clip_box.bounding_box();
      clip_box.is_dragging(true, bbox.x);

      const new_pos = clip_box.calculate_drag_position(bbox.x + 50);
      expect(new_pos).toBeGreaterThan(100);
    });

    test("Scenario: Time formatting roundtrip", () => {
      const original_frames = 18630; // 1:02:30 (1 min + 2 sec + 30 frames)
      const formatted = CDGMagic_TimeOutput.format_frames(original_frames);
      expect(formatted).toBe("01:02:30");

      const parsed_frames = CDGMagic_TimeOutput.parse_to_frames(formatted);
      expect(parsed_frames).toBe(original_frames);
    });
  });
});

// VIM: set ft=typescript :
// END
