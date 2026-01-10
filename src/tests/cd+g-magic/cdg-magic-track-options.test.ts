/**\n * Tests for Track Options & Media Events\n *\n * This test suite covers track configuration and media event management:\n * - CDGMagic_TrackOptions (Core): Basic track channel and mask configuration\n * - CDGMagic_TrackOptions_UI: Observable/reactive version with observer pattern\n * - CDGMagic_MediaEvent integration: Tests interaction between events and tracks\n * Dependencies: CDGMagic_MediaEvent functions for integration tests\n *\n * Total: 40 tests covering core functionality and reactive patterns\n */

import { createMediaEvent, cloneMediaEvent
  , compareMediaEventsByStart, getMediaEventEnd
  , getMediaEventActualEnd        } from "@/ts/cd+g-magic/CDGMagic_MediaEvent";
import { CDGMagic_TrackOptions    } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_Core";
import { CDGMagic_TrackOptions_UI } from "@/ts/cd+g-magic/CDGMagic_TrackOptions_UI";

// ============================================================================
// MEDIA EVENTS & TRACK OPTIONS CORE
// ============================================================================

describe("Media Events & Track Options", () => {
  describe("CDGMagic_MediaEvent - Media Event Data Structure", () => {
    test("createMediaEvent creates event with default values", () => {
      const event = createMediaEvent(100, 50);

      expect(event.start_offset).toBe(100);
      expect(event.duration).toBe(50);
      expect(event.actual_start_offset).toBe(100);
      expect(event.actual_duration).toBe(50);
      expect(event.PALObject).toBeNull();
      expect(event.BMPObject).toBeNull();
      expect(event.border_index).toBe(0);
      expect(event.memory_preset_index).toBe(0);
      expect(event.x_scroll).toBe(0);
      expect(event.y_scroll).toBe(0);
      expect(event.user_obj).toBeNull();
    });

    test("createMediaEvent accepts all parameters", () => {
      const mockPal = {} as unknown;
      const mockBmp = {} as unknown;

      const event = createMediaEvent(200, 75, mockPal as any, mockBmp as any);

      expect(event.start_offset).toBe(200);
      expect(event.duration).toBe(75);
      expect(event.PALObject).toBe(mockPal);
      expect(event.BMPObject).toBe(mockBmp);
    });

    test("cloneMediaEvent creates independent copy", () => {
      const original = createMediaEvent(100, 50);
      original.border_index = 42;
      original.user_obj = { custom: "data" };

      const cloned = cloneMediaEvent(original);

      expect(cloned.start_offset).toBe(original.start_offset);
      expect(cloned.border_index).toBe(42);
      expect(cloned.user_obj).toBe(original.user_obj); // Shallow copy for objects

      // Modify original
      original.border_index = 99;
      expect(cloned.border_index).toBe(42); // Cloned value unchanged
    });

    test("compareMediaEventsByStart sorts events by start offset", () => {
      const event1 = createMediaEvent(300, 50);
      const event2 = createMediaEvent(100, 50);
      const event3 = createMediaEvent(200, 50);

      const events = [event1, event2, event3];
      events.sort(compareMediaEventsByStart);

      expect(events[0]?.start_offset).toBe(100);
      expect(events[1]?.start_offset).toBe(200);
      expect(events[2]?.start_offset).toBe(300);
    });

    test("getMediaEventEnd returns start + duration", () => {
      const event = createMediaEvent(100, 50);
      expect(getMediaEventEnd(event)).toBe(150);
    });

    test("getMediaEventActualEnd returns actual_start + actual_duration", () => {
      const event = createMediaEvent(100, 50);
      event.actual_start_offset = 120;
      event.actual_duration = 80;

      expect(getMediaEventActualEnd(event)).toBe(200);
    });

    test("MediaEvent object references can be modified", () => {
      const event = createMediaEvent(100, 50);
      const mockPal = { color: "#FF0000" } as unknown;

      event.PALObject = mockPal as any;
      expect(event.PALObject).toBe(mockPal);
    });

    test("MediaEvent timing values can be modified", () => {
      const event = createMediaEvent(100, 50);

      event.start_offset = 200;
      event.duration = 100;
      event.x_scroll = 5;
      event.y_scroll = 10;

      expect(event.start_offset).toBe(200);
      expect(event.duration).toBe(100);
      expect(event.x_scroll).toBe(5);
      expect(event.y_scroll).toBe(10);
    });

    test("cloneMediaEvent preserves user data", () => {
      const original = createMediaEvent(100, 50);
      original.user_obj =
      {
        id: 123,
        name: "test",
      }
      ;

      const cloned = cloneMediaEvent(original);

      expect(cloned.user_obj).toEqual(
      {
        id: 123,
        name: "test",
      }
      );
    });

    test("compareMediaEventsByStart handles equal start offsets", () => {
      const event1 = createMediaEvent(100, 50);
      const event2 = createMediaEvent(100, 75);

      const result = compareMediaEventsByStart(event1, event2);
      expect(result).toBe(0);
    });

    test("MediaEvent supports multiple timing modifications", () => {
      const event = createMediaEvent(100, 50);

      event.actual_start_offset = 105;
      event.actual_duration = 55;
      event.border_index = 7;
      event.memory_preset_index = 3;

      expect(event.actual_start_offset).toBe(105);
      expect(event.actual_duration).toBe(55);
      expect(getMediaEventActualEnd(event)).toBe(160);
    });

    test("cloneMediaEvent handles null object references", () => {
      const event = createMediaEvent(100, 50);
      const cloned = cloneMediaEvent(event);

      expect(cloned.PALObject).toBeNull();
      expect(cloned.BMPObject).toBeNull();
      expect(cloned.user_obj).toBeNull();
    });
  });

  describe("CDGMagic_TrackOptions (Core) - Channel & Mask Configuration", () => {
    it("should initialize with default values", () => {
      const track = new CDGMagic_TrackOptions();
      expect(track.track()).toBe(0);
      expect(track.channel()).toBe(0);
      expect(track.mask_active()).toBe(0);
    });

    it("should initialize with custom track ID", () => {
      const track = new CDGMagic_TrackOptions(42);
      expect(track.track()).toBe(42);
      expect(track.channel()).toBe(0);
      expect(track.mask_active()).toBe(0);
    });

    it("should get and set channel within valid range", () => {
      const track = new CDGMagic_TrackOptions();
      track.channel(7);
      expect(track.channel()).toBe(7);
    });

    it("should clamp channel to 0-15 range on set", () => {
      const track = new CDGMagic_TrackOptions();
      track.channel(-5);
      expect(track.channel()).toBe(0);

      track.channel(20);
      expect(track.channel()).toBe(15);
    });

    it("should get and set mask_active state", () => {
      const track = new CDGMagic_TrackOptions();
      track.mask_active(1);
      expect(track.mask_active()).toBe(1);

      track.mask_active(0);
      expect(track.mask_active()).toBe(0);
    });

    it("should convert truthy/falsy to 0 or 1", () => {
      const track = new CDGMagic_TrackOptions();
      track.mask_active(5); // Truthy
      expect(track.mask_active()).toBe(1);

      track.mask_active(0); // Falsy
      expect(track.mask_active()).toBe(0);
    });

    it("should clone with identical values", () => {
      const track = new CDGMagic_TrackOptions(42);
      track.channel(8);
      track.mask_active(1);

      const cloned = track.clone();
      expect(cloned.track()).toBe(42);
      expect(cloned.channel()).toBe(8);
      expect(cloned.mask_active()).toBe(1);
    });

    it("should allow independent modification of clone", () => {
      const track = new CDGMagic_TrackOptions();
      track.channel(5);

      const cloned = track.clone();
      track.channel(10);

      expect(track.channel()).toBe(10);
      expect(cloned.channel()).toBe(5);
    });
  });

  describe("Integration - MediaEvent + TrackOptions", () => {
    it("should work with media events and track options together", () => {
      const track1 = new CDGMagic_TrackOptions(1);
      const track2 = new CDGMagic_TrackOptions(2);
      track1.channel(0);
      track2.channel(1);

      const event1 = createMediaEvent(100, 50);
      const event2 = createMediaEvent(200, 75);

      const events = [event1, event2];
      events.sort(compareMediaEventsByStart);

      expect(events.length).toBe(2);
      expect(events[0]?.start_offset).toBe(100);
      expect(events[1]?.start_offset).toBe(200);
    });
  });
});

// ============================================================================
// TRACK OPTIONS - OBSERVABLE/REACTIVE VARIANT
// ============================================================================

describe("CDGMagic_TrackOptions_UI - Observable/Reactive Track Configuration", () => {
  describe("initialization", () => {
    it("should initialize with default values", () => {
      const track = new CDGMagic_TrackOptions_UI();
      expect(track.track()).toBe(0);
      expect(track.channel()).toBe(0);
      expect(track.mask_active()).toBe(0);
      expect(track.observer_count()).toBe(0);
    });

    it("should initialize with custom track ID", () => {
      const track = new CDGMagic_TrackOptions_UI(42);
      expect(track.track()).toBe(42);
      expect(track.channel()).toBe(0);
      expect(track.mask_active()).toBe(0);
    });
  });

  describe("channel management", () => {
    it("should trigger observer on channel change", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      track.attach_observer(observer);

      track.channel(5);
      expect(observer).toHaveBeenCalledTimes(1);

      track.channel(10);
      expect(observer).toHaveBeenCalledTimes(2);
    });

    it("should not trigger observer if channel value unchanged", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      track.attach_observer(observer);

      track.channel(5);
      observer.mockClear();
      track.channel(5);
      expect(observer).not.toHaveBeenCalled();
    });

    it("should truncate fractional channels", () => {
      const track = new CDGMagic_TrackOptions_UI();
      track.channel(7.8);
      expect(track.channel()).toBe(7);
    });
  });

  describe("mask management", () => {
    it("should trigger observer on mask_active change", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      track.attach_observer(observer);

      track.mask_active(1);
      expect(observer).toHaveBeenCalledTimes(1);

      track.mask_active(0);
      expect(observer).toHaveBeenCalledTimes(2);
    });

    it("should not trigger observer if mask_active unchanged", () => {
      const track = new CDGMagic_TrackOptions_UI();
      track.mask_active(1);
      const observer = jest.fn();
      track.attach_observer(observer);

      track.mask_active(1);
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("observer management", () => {
    it("should attach and detach observers", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      const detach = track.attach_observer(observer);

      track.channel(5);
      expect(observer).toHaveBeenCalledTimes(1);

      detach();
      track.channel(10);
      expect(observer).toHaveBeenCalledTimes(1); // No additional call
    });

    it("should support multiple observers", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      track.attach_observer(observer1);
      track.attach_observer(observer2);

      track.channel(5);
      expect(observer1).toHaveBeenCalledTimes(1);
      expect(observer2).toHaveBeenCalledTimes(1);
    });

    it("should deduplicate observers using Set", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();

      track.attach_observer(observer);
      track.attach_observer(observer); // Set deduplicates

      expect(track.observer_count()).toBe(1);
      track.channel(5);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("should clear all observers", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      track.attach_observer(observer1);
      track.attach_observer(observer2);
      track.clear_observers();

      track.channel(5);
      expect(observer1).not.toHaveBeenCalled();
      expect(observer2).not.toHaveBeenCalled();
    });
  });

  describe("batch update", () => {
    it("should trigger observer only once for batch update", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      track.attach_observer(observer);

      track.batch_update(
      {
        channel: 5,
        mask_active: 1,
      }
      );
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("should not trigger observer if batch update has no changes", () => {
      const track = new CDGMagic_TrackOptions_UI();
      track.channel(5);
      track.mask_active(1);

      const observer = jest.fn();
      track.attach_observer(observer);

      track.batch_update(
      {
        channel: 5,
        mask_active: 1,
      }
      );
      expect(observer).not.toHaveBeenCalled();
    });

    it("should trigger observer if batch update has partial changes", () => {
      const track = new CDGMagic_TrackOptions_UI();
      track.channel(5);
      track.mask_active(0);

      const observer = jest.fn();
      track.attach_observer(observer);

      track.batch_update(
      {
        channel: 5,
        mask_active: 1,
      }
      );
      expect(observer).toHaveBeenCalledTimes(1);
    });
  });

  describe("cloning", () => {
    it("should clone with empty observer set", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();
      track.attach_observer(observer);

      const cloned = track.clone();
      expect(cloned.observer_count()).toBe(0);

      cloned.channel(5);
      expect(observer).not.toHaveBeenCalled();
    });

    it("cloned instance should have working observers", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const cloned = track.clone();
      const observer = jest.fn();
      cloned.attach_observer(observer);

      cloned.channel(8);
      expect(observer).toHaveBeenCalledTimes(1);
    });
  });

  describe("reactive framework integration", () => {
    it("should support vue-like reactive pattern", () => {
      const track = new CDGMagic_TrackOptions_UI();
      let rendered_times = 0;

      track.attach_observer(() => {
        rendered_times += 1;
      });

      track.channel(3);
      track.mask_active(1);

      expect(rendered_times).toBe(2);
    });

    it("should support cleanup function pattern", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const observer = jest.fn();

      const unsubscribe = track.attach_observer(observer);

      track.channel(5);
      expect(observer).toHaveBeenCalledTimes(1);

      unsubscribe();
      track.channel(8);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid successive updates", () => {
      const track = new CDGMagic_TrackOptions_UI();
      const updates: number[] = [];

      track.attach_observer(() => {
        updates.push(track.channel());
      });

      for (let i = 0; i < 16; i++) {
        track.channel(i);
      }

      expect(updates.length).toBe(15); // 0->0 no change, then 1-15
      expect(updates[0]).toBe(1);
      expect(updates[14]).toBe(15);
    });
  });
});

// VIM: set ft=typescript :
// END