# CD+Graphics Magic - TypeScript Conversion Order

Based on UML dependency analysis, this document outlines the optimal conversion order from C++ to TypeScript, starting with the least dependent modules and progressing to those with the most dependencies.

## Conversion Strategy

**Bottom-Up Approach**: Convert foundation classes first (low dependencies), then build up to higher-level classes that depend on them. This allows each module to be tested independently as dependencies become available.

---

## Phase 1: Core Data Structures & Enums (No Dependencies)

### Priority 1.1: CDGMagic_PALObject
**File**: `CDGMagic_PALObject.{h,cpp}`  
**Dependencies**: None (standard library only)  
**Complexity**: Low  
**Responsibilities**:
- Palette color management (RGBA values)
- 16-color and 256-color palette support
- Dissolve/fade effects
- Update masking

**Why first**: Pure data structure with no internal class dependencies. Perfect starting point.

```typescript
// Minimal dependencies:
- ulong[] for palette
- dissolve timing
- update masks
```

---

### Priority 1.2: CDGMagic_FontBlock
**File**: `CDGMagic_FontBlock.{h,cpp}`  
**Dependencies**: None (internal only)  
**Complexity**: Low  
**Responsibilities**:
- 12×6 pixel font glyph data
- Color indexing and transparency
- Z-order and channel tracking
- Color prominence calculation

**Why next**: Self-contained, minimal external dependencies despite complex internal logic.

```typescript
// Dependencies:
- uchar[] for bitmap data
- Palette_Entry struct (internal)
```

---

## Phase 2: Media Event Structures (Minimal Dependencies)

### Priority 2.1: CDGMagic_MediaEvent (Struct)
**File**: `CDGMagic_MediaClip.h` (struct definition)  
**Dependencies**: PALObject, BMPObject references  
**Complexity**: Very Low  
**Responsibilities**:
- Event timing (start, duration)
- Media object references
- Scroll offsets
- Border/memory settings

**Why here**: Depends on Phase 1 classes but is primarily a data container.

```typescript
// Dependencies:
- CDGMagic_PALObject (reference)
- CDGMagic_BMPObject (reference)
```

---

### Priority 2.2: CDGMagic_TrackOptions
**File**: `CDGMagic_TrackOptions.{h,cpp}`  
**Dependencies**: None identified  
**Complexity**: Low  
**Responsibilities**:
- Track-level configuration
- Mask window settings
- Track-specific parameters

**Why here**: Independent configuration class, minimal dependencies.

---

## Phase 3: Bitmap & Graphics Objects (Depends on Phase 1-2)

### Priority 3.1: CDGMagic_BMPObject
**File**: `CDGMagic_BMPObject.{h,cpp}`  
**Dependencies**: PALObject  
**Complexity**: Medium  
**Responsibilities**:
- Bitmap data storage and access
- Palette association
- Pixel manipulation (get/set)
- Bilinear resize
- Transition blocks
- XOR settings

**Why here**: Depends on PALObject (Phase 1), needed by MediaEvent.

```typescript
// Dependencies:
- CDGMagic_PALObject ✓
- Bitmap pixel operations
```

---

### Priority 3.2: CDGMagic_BMPClip (extends BMPObject)
**File**: `CDGMagic_BMPClip.{h,cpp}`  
**Dependencies**: BMPObject  
**Complexity**: Low  
**Responsibilities**:
- Specialization of BMPObject for clip use
- Clip-specific behavior

**Why here**: Direct subclass of BMPObject, ready after Phase 3.1.

---

### Priority 3.3: CDGMagic_PALGlobalClip (extends BMPObject)
**File**: `CDGMagic_PALGlobalClip.{h,cpp}`  
**Dependencies**: BMPObject  
**Complexity**: Low  
**Responsibilities**:
- Global palette clip specialization
- Palette-specific operations

---

### Priority 3.4: CDGMagic_TextClip (extends BMPObject)
**File**: `CDGMagic_TextClip.{h,cpp}`  
**Dependencies**: BMPObject  
**Complexity**: Medium  
**Responsibilities**:
- Text rendering to bitmap
- Font properties
- Text-specific transformations

---

### Priority 3.5: CDGMagic_ScrollClip (extends BMPObject)
**File**: `CDGMagic_ScrollClip.{h,cpp}`  
**Dependencies**: BMPObject  
**Complexity**: Low  
**Responsibilities**:
- Scrolling bitmap specialization
- Scroll direction and speed

---

## Phase 4: Packet & Stream Structures

### Priority 4.1: CD_SCPacket (Struct)
**File**: `CDGMagic_GraphicsEncoder.h` / `CDGMagic_GraphicsDecoder.h`  
**Dependencies**: None  
**Complexity**: Very Low  
**Responsibilities**:
- 24-byte CD+G subcode packet structure
- Command and instruction fields
- Parity fields

**Why here**: Simple struct, can be done anytime but useful before graphics processing.

```typescript
// 24 bytes total:
- command: 1 byte
- instruction: 1 byte
- parityQ: 2 bytes
- data: 16 bytes
- parityP: 4 bytes
```

---

## Phase 5: Graphics Processing (Heavy Dependencies)

### Priority 5.1: CDGMagic_GraphicsDecoder
**File**: `CDGMagic_GraphicsDecoder.{h,cpp}`  
**Dependencies**: CD_SCPacket, BMPObject  
**Complexity**: High  
**Responsibilities**:
- Decode CD+G packets to RGBA
- VRAM management (300×216)
- RGBA screen rendering (312×216)
- Palette handling (16-color and 256-color)
- Font rendering (copy/XOR)
- Scroll operations
- Channel masking

**Why here**: Complex but input-focused (packets → screen). Can validate with static test data.

```typescript
// Dependencies:
- CD_SCPacket ✓
- Palette operations ✓
- RGBA color operations
- Screen buffer management
```

---

### Priority 5.2: CDGMagic_GraphicsEncoder
**File**: `CDGMagic_GraphicsEncoder.{h,cpp}`  
**Dependencies**: MediaClip, FontBlock, BMPObject, PALObject  
**Complexity**: Very High  
**Responsibilities**:
- Convert media clips to CD+G packets
- VRAM composition (8 layers)
- Font block generation from BMPs
- XOR operations
- Scroll handling
- Palette preset commands
- Memory preset commands
- Compositing engine

**Why later**: Depends on multiple Phase 3 classes. Most complex conversion.

```typescript
// Dependencies:
- CDGMagic_MediaClip (Phase 6)
- CDGMagic_FontBlock ✓
- CDGMagic_BMPObject ✓
- CDGMagic_PALObject ✓
- Composition logic (complex)
```

---

## Phase 6: Media Management (Depends on Phase 3-5)

### Priority 6.1: CDGMagic_MediaClip
**File**: `CDGMagic_MediaClip.{h,cpp}`  
**Dependencies**: MediaEvent, TrackOptions, BMPObject, PALObject  
**Complexity**: Medium  
**Responsibilities**:
- Media event queue management
- Clip timing (start, duration)
- Track options association
- Event sorting
- Serialization/deserialization

**Why here**: Depends on Phase 2-3. Needs to be ready before GraphicsEncoder.

```typescript
// Dependencies:
- CDGMagic_MediaEvent ✓
- CDGMagic_TrackOptions ✓
- Deque/Queue implementation
- Sorting algorithms
```

---

## Phase 7: Audio (Independent, Can Parallel)

### Priority 7.1: CDGMagic_AudioPlayback
**File**: `CDGMagic_AudioPlayback.{h,cpp}`  
**Dependencies**: None (PortAudio external library)  
**Complexity**: High (Audio specifics)  
**Responsibilities**:
- WAVE file loading
- Audio playback control
- Sample rate handling (44,100 Hz)
- Frame buffering (1,176 frames)
- Waveform visualization bitmap
- Latency tracking

**Why here**: Can be developed in parallel. Minimal dependencies with codebase.

```typescript
// Dependencies:
- Web Audio API (instead of PortAudio)
- WAVE format parsing
- Audio buffer management
```

---

## Phase 8: UI/Window Classes (Depends on Phase 1-7)

### Priority 8.1: CDGMagic_EditingLanes_PlaybackHead
**File**: `CDGMagic_EditingLanes_PlaybackHead.{h,cpp}`  
**Dependencies**: None identified  
**Complexity**: Low  
**Responsibilities**:
- Timeline playback head visualization
- Position tracking

---

### Priority 8.2: CDGMagic_EditingLanes
**File**: `CDGMagic_EditingLanes.{h,cpp}`  
**Dependencies**: EditingLanes_PlaybackHead, MediaClip  
**Complexity**: Medium  
**Responsibilities**:
- Timeline lanes display
- Multiple clips on lanes
- Playback head management
- Lane positioning

---

### Priority 8.3: CDGMagic_EditingGroup
**File**: `CDGMagic_EditingGroup.{h,cpp}`  
**Dependencies**: EditingLanes, TrackOptions  
**Complexity**: Medium  
**Responsibilities**:
- Group editing controls
- Multi-lane management
- Callback handling

---

### Priority 8.4: CDGMagic_MovableClipBox
**File**: `CDGMagic_MovableClipBox.{h,cpp}`  
**Dependencies**: MediaClip  
**Complexity**: Low  
**Responsibilities**:
- Draggable clip box UI element
- Position tracking
- Mouse interaction

---

### Priority 8.5: CDGMagic_TimeOutput
**File**: `CDGMagic_TimeOutput.{h,cpp}`  
**Dependencies**: None identified  
**Complexity**: Low  
**Responsibilities**:
- Time display formatting
- MM:SS:FF format (minutes:seconds:frames)

---

## Phase 9: Specialized Clip Windows (UI Layer)

### Priority 9.1-9.5: Clip Editor Windows
**Files**:
- `CDGMagic_BMPClip_Window.{h,cpp}`
- `CDGMagic_TextClip_Window.{h,cpp}` + `__Editor`, `__CtrlButton`
- `CDGMagic_PALGlobalClip_Window.{h,cpp}`
- `CDGMagic_ScrollClip_Window.{h,cpp}`
- `CDGMagic_VectorClip_Window.{h,cpp}`
- `CDGMagic_TrackOptions_MaskWindow.{h,cpp}`

**Dependencies**: Respective clip types + UI framework  
**Complexity**: Medium-High  
**Responsibilities**:
- Edit dialogs for each clip type
- Property panels
- Preview windows
- User input handling

**Why late**: UI-specific, builds on all other components.

---

## Phase 10: Main Application (Top-level, Last)

### Priority 10.1: CDGMagic_MainWindow
**File**: `CDGMagic_MainWindow.{h,cpp}`  
**Dependencies**: EditingGroup, PreviewWindow  
**Complexity**: Medium  
**Responsibilities**:
- Main application window
- Menu bar integration
- Layout management

---

### Priority 10.2: CDGMagic_PreviewWindow
**File**: `CDGMagic_PreviewWindow.{h,cpp}`  
**Dependencies**: GraphicsDecoder, AudioPlayback  
**Complexity**: Medium  
**Responsibilities**:
- Live preview of CD+G output
- Real-time graphics rendering
- Audio/video synchronization

---

### Priority 10.3: CDGMagic_MainWindow_MenuBar
**File**: `CDGMagic_MainWindow_MenuBar.{h,cpp}`  
**Dependencies**: None (callback-based)  
**Complexity**: Low  
**Responsibilities**:
- Menu bar creation
- Menu items
- Callback dispatching

---

### Priority 10.4: CDGMagic_Application
**File**: `CDGMagic_Application.{h,cpp}`  
**Dependencies**: MainWindow, PreviewWindow  
**Complexity**: Medium  
**Responsibilities**:
- Application entry point
- Window lifecycle
- Global callbacks
- Resource management

---

## Summary: Conversion Order by Phase

| Phase | Classes | Total Dependencies | Est. Effort |
|-------|---------|-------------------|-------------|
| **1** | 2 | 0 (foundational) | ⭐ Easy |
| **2** | 2 | ✓ Phase 1 | ⭐ Easy |
| **3** | 5 | ✓ Phase 1-2 | ⭐⭐ Medium |
| **4** | 1 | None | ⭐ Easy |
| **5** | 2 | ✓ Phase 1-4 | ⭐⭐⭐ Hard |
| **6** | 1 | ✓ Phase 2-5 | ⭐⭐ Medium |
| **7** | 1 | External only | ⭐⭐⭐ Hard |
| **8** | 6 | ✓ Phase 1-7 | ⭐⭐ Medium |
| **9** | 6 | ✓ Phase 1-8 | ⭐⭐ Medium |
| **10** | 4 | ✓ Phase 1-9 | ⭐⭐ Medium |

---

## Testing Strategy

**Per-Phase Testing**:
- Phase 1: Unit tests for data structure operations
- Phase 2: Test event creation and timing
- Phase 3: Bitmap operations and transformations
- Phase 4: Packet structure validation
- Phase 5: Decoder with static test packets, Encoder with known media
- Phase 6: Media clip serialization and event queue
- Phase 7: Audio loading and playback (Web Audio context)
- Phase 8: UI event handlers
- Phase 9: Dialog windows with mock data
- Phase 10: Integration tests end-to-end

---

## Parallelization Opportunities

**Can work on simultaneously** (separate branches):
- Phase 7 (Audio) - independent subsystem
- Phase 9 (Clip Windows) - once their clip types are done
- Phase 8 (Base UI) - once core logic is ready

**Recommended approach**: 
1. Complete Phase 1-2 (foundation)
2. Parallelize Phase 3, 4, 7
3. Do Phase 5 (graphics) - core complexity
4. Complete Phase 6 (media management)
5. Parallelize Phase 8-10 (UI layer)

---

## Files Breakdown by C++ Source

Total: ~50 header files across 5 subsystems

**Foundation (Phase 1-2)**:
- CDGMagic_PALObject.{h,cpp}
- CDGMagic_FontBlock.{h,cpp}
- CDGMagic_TrackOptions.{h,cpp}

**Graphics Objects (Phase 3)**:
- CDGMagic_BMPObject.{h,cpp}
- CDGMagic_BMPClip.{h,cpp}
- CDGMagic_PALGlobalClip.{h,cpp}
- CDGMagic_TextClip.{h,cpp}
- CDGMagic_ScrollClip.{h,cpp}

**Processing (Phase 4-6)**:
- CDGMagic_GraphicsEncoder.{h,cpp} + helpers
- CDGMagic_GraphicsDecoder.{h,cpp}
- CDGMagic_MediaClip.{h,cpp}
- CDGMagic_AudioPlayback.{h,cpp}

**UI (Phase 8-10)**:
- CDGMagic_EditingLanes*.{h,cpp}
- CDGMagic_MainWindow*.{h,cpp}
- CDGMagic_PreviewWindow.{h,cpp}
- CDGMagic_*Clip_Window.{h,cpp} (6 variants)
- CDGMagic_Application.{h,cpp}

---

## VIM: vim: set ft=markdown :
## END
