# Deep Analysis: CD+G Magic C++ vs TypeScript Implementation (Session 7)

**Date**: Current Session (Post Session 6)  
**Focus**: Systematic component-by-component comparison between C++ reference implementation and TypeScript port  
**Goal**: Identify ALL missing features and incorrect behaviors to create faithful port  

---

## 1. Executive Summary: Critical Findings

This analysis identifies **5 major categories of differences** between C++ and TypeScript implementations:

1. **Event Processing Engine**: GraphicsEncoder doesn't process media events at all
2. **Screen Clearing Logic**: Event-level border_index and memory_preset_index completely ignored
3. **Text Positioning**: Y-offset calculations don't account for different karaoke modes
4. **Palette Transitions**: No support for palette dissolves or transitions
5. **Special Packets**: No SCROLL(zero) or other special packet handling

**Impact**: Current TypeScript output generates correct packet STRUCTURE but wrong RENDERING BEHAVIOR due to missing event-level control.

---

## 2. Text Clip Rendering Analysis

### 2.1 TITLES Mode Rendering (Lines 81-217 of CDGMagic_TextClip.cpp)

**Purpose**: Single-page or multi-page title text overlay  
**Method**: `render_text_to_bmp()`

**Key Algorithm**:
```cpp
// Line height calculation
int max_border_size = max(internal_square_size, internal_round_size);
int actual_text_height = internal_font_size + max_border_size * 2;
int blk_height = ceiling((actual_text_height + 11.0) / 12.0);
const int line_height = blk_height * 12;

// Lines per page for TITLES only
if (internal_karaoke_mode == KAR_MODE__TITLES && line_height > 0) {
    internal_lines_per_page = 192 / line_height;  // Up to 16 lines possible
}
```

**Screen Clearing Behavior**:
- Line 197: `border_index = (karaoke_mode == TITLES) ? frame_index : 16;`
- Line 198: `memory_preset_index = (karaoke_mode == TITLES) ? box_index : 16;`
- **ONLY SET ON FIRST EVENT** (if curr_line_num == 0)
- Index value 16 means **DO NOT SET** (special "disabled" flag)

**Composite Behavior**:
```cpp
if (curr_line_num > 0) {
    current_image->should_composite(2);  // COMPOSITE_INTO for lines after first
}
```

**Y Offset Calculation**:
```cpp
current_image->y_offset((curr_line_num % internal_lines_per_page) * line_height + 12);
```

### 2.2 KARAOKE Mode Rendering (Lines 261-700+ of CDGMagic_TextClip.cpp)

**Purpose**: Single/multi-page synchronized word highlighting  
**Method**: `render_karaoke_to_bmp()`

**Key Difference**: Generates THREE types of events per line:
1. **KARAOKE_ERASE**: Empty line (if line-by-line mode)
2. **KARAOKE_DRAW**: Full line with text (always)
3. **KARAOKE_WIPE**: Word-by-word highlight xor overlays (multiple per line)

**Line Height**:
```cpp
const int line_height = (internal_lines_per_page == 5) ? 36 : 24;
```

**Top Margin by Mode** (Lines 284-288):
```cpp
switch (internal_karaoke_mode) {
    case KAR_MODE__5BLNCT:  // 5 Line, bottom/line-cut
    case KAR_MODE__5BLNFD:  // 5 Line, bottom/fade
    case KAR_MODE__7MLNCT:  // 7 Line (5 effective), middle/line-cut
    case KAR_MODE__7MLNFD:  // 7 Line (5 effective), middle/fade
    case KAR_MODE__5BLINE:  // 5 Line, bottom, line display
    case KAR_MODE__5BPAGE:  // 5 Line, bottom, page display
        top_margin = 24;    // ← 5-LINE MODES: 24 pixels
        
    case KAR_MODE__6MLINE:  // 8 [6] Line, middle, line display
    case KAR_MODE__6MPAGE:  // 8 [6] Line, middle, page display
        top_margin = 36;    // ← 8/6-LINE MODES: 36 pixels
        
    case KAR_MODE__84BLIN:  // 8 [4] Line, bottom, line display
        top_margin = 108;   // ← 4-LINE MODE: 108 pixels
        
    default:
        top_margin = 12;    // ← STANDARD/LYRICS: 12 pixels
}
```

**Screen Clearing Behavior** (Line 430-431):
```cpp
// Only set on page boundaries
current_event_entry->border_index = 16;  // Default: disabled
current_event_entry->memory_preset_index = 16;  // Default: disabled

// Set only when crossing page boundary in page-mode
if ((internal_page_mode==1) && (curr_line_num>0) && ((curr_line_num%internal_lines_per_page)==0)) {
    border_index = internal_box_index;           // Enable on page boundary
    memory_preset_index = internal_box_index;    // Enable on page boundary
}
```

**Y Offset Calculation**:
```cpp
current_image->y_offset((curr_line_num % lines_per_page) * line_height + top_margin);
```

### 2.3 Palette Index 16 = DISABLED

**Critical Detail**: Throughout the C++ code, palette index 16 (value 0x10) is used as a special "DISABLED" marker:
```cpp
// Line 196-198 (TextClip.cpp):
if (curr_line_num == 0) {
    current_event_entry->border_index = (internal_karaoke_mode == KAR_MODE__TITLES) ? internal_frame_index : 16;
    current_event_entry->memory_preset_index = (internal_karaoke_mode == KAR_MODE__TITLES) ? internal_box_index : 16;
}

// Line 430-431:
if ((internal_page_mode==1)&&(curr_line_num>0)&&((curr_line_num%internal_lines_per_page)==0)) {
    border_index = internal_box_index;
    memory_preset_index = internal_box_index;
}
```

**Meaning**: 
- `16` = "Don't apply this preset" (disabled)
- Valid colors are `0-15` (16-color palette)
- `>16` is also treated as disabled (safe)

---

## 3. Graphics Encoder Analysis

### 3.1 Event Processing in C++ (CDGMagic_GraphicsEncoder.cpp, lines 137-200)

**Event Stream Processing**:
```cpp
while (current_pack < current_length - 300) {
    // 1. Check if next event is ready to play
    if ((current_event < TimeLine_Deque->size()) && 
        (TimeLine_Deque->at(current_event)->start_pack() <= current_pack)) {
        
        // 2. Convert BMP to font blocks
        temp_tl_fq.font_queue = bmp_to_fonts(TimeLine_Deque->at(current_event));
        playout_queue.push_back(temp_tl_fq);
        
        // 3. Extract event's media events (for border/preset/scroll)
        for (each media event in event_queue) {
            Timeline_EventQueue temp_tl_ev;
            temp_tl_ev.start_pack = clip->start_pack() + media_event->start_offset;
            global_queue.push_back(temp_tl_ev);  // ← SORTED BY PACK TIME
        }
        current_event++;
    }
    
    // 4. Process global (border/preset/scroll) events
    while ((global_queue.size() > 0) && (global_queue.front().start_pack <= current_pack)) {
        CDGMagic_MediaEvent* current_mediaevent = global_queue.front().event_obj;
        
        // Handle SCROLL(zero) special case
        if ((current_mediaevent->x_scroll == 0) && (current_mediaevent->y_scroll == 0)) {
            temp_tl_fq.font_queue = set_scroll(current_pack, current_mediaevent);
            playout_queue.push_back(temp_tl_fq);
        }
        
        global_queue.pop_front();
    }
}
```

**Key Points**:
1. Events are sorted by `start_pack` timing
2. Each event's MediaEvent objects are extracted and sorted separately
3. SCROLL(zero) packets are handled specially (not regular scrolls)
4. Border and memory preset are ATTACHED to events, not global
5. Palette transitions can cause palette dissolves (not currently in TS)

### 3.2 SCROLL(zero) Special Handling

The C++ code has special handling for SCROLL(zero):
```cpp
if ((current_mediaevent->x_scroll == 0) && (current_mediaevent->y_scroll == 0)) {
    // This is a SCROLL(zero) packet - special initialization marker
    temp_tl_fq.font_queue = set_scroll(current_pack, current_mediaevent);
    playout_queue.push_back(temp_tl_fq);
}
```

**Meaning**: A scroll offset of (0,0) is treated as special "SCROLL_PRESET" command, not a regular scroll. It's used to trigger screen initialization or mode switching.

---

## 4. Current TypeScript Implementation Gaps

### 4.1 GraphicsEncoder.compute_graphics() is a STUB

**Current Code** (lines 804-833):
```typescript
compute_graphics(): CDGMagic_CDSCPacket[] {
    this.clear_stream();
    
    // ✓ Load palette
    this.load_palette_lo(this.internal_palette);
    this.load_palette_hi(this.internal_palette);
    
    // ✓ Emit border and preset (but GLOBAL, not event-level)
    this.border_preset(this.internal_border_index);
    this.memory_preset(0, 0);  // ← HARDCODED TO 0
    
    // ✓ Transparent color
    this.transparent_color(this.internal_transparent_index);
    
    // ✗ TODO: Event scheduling (NEVER IMPLEMENTED)
    // ✗ TODO: Event sorting (NEVER IMPLEMENTED)
    // ✗ TODO: Per-event rendering (NEVER IMPLEMENTED)
    
    // Fallback: encode current VRAM state
    this.encode_vram_as_packets(false);
    
    return this.internal_cdg_stream;
}
```

**Missing**:
1. ❌ Media clip iteration
2. ❌ Media event sorting by pack time
3. ❌ Event-level border_index handling
4. ❌ Event-level memory_preset_index handling
5. ❌ Palette transitions/dissolves
6. ❌ SCROLL(zero) handling

### 4.2 TextClip.render_text_to_bmp() Likely Missing Karaoke Logic

**Current Implementation**: Probably doesn't distinguish between TITLES and KARAOKE modes with:
- Different top_margin values (12, 24, 36, 108)
- Line-by-line erase events (KARAOKE only)
- Word-by-word wipe events (KARAOKE only)
- Different composite modes and border/preset settings

### 4.3 Event-Level Control Not Implemented

**Current State**: MediaEvent has these fields but they're NEVER READ:
```typescript
export interface CDGMagic_MediaEvent {
    border_index: number;           // ← IGNORED
    memory_preset_index: number;    // ← IGNORED
    x_scroll: number;               // ← IGNORED
    y_scroll: number;               // ← IGNORED
}
```

**What Should Happen**:
1. When event starts, check if `border_index < 16`
   - If yes: emit `border_preset(border_index)`
2. When event starts, check if `memory_preset_index < 16`
   - If yes: emit `memory_preset(memory_preset_index)`
3. When event has scroll values, emit scroll packets
4. Special case: `(x_scroll == 0 && y_scroll == 0)` = SCROLL(zero)

---

## 5. Priority Implementation Order

### Phase A: Core Event Processing (CRITICAL)

**1. Implement real compute_graphics() event loop**
- Input: Array of MediaClip objects
- Sort clips by start time
- For each clip, extract MediaEvent array
- Sort MediaEvents by start_offset
- Generate packets in chronological order

**2. Implement event-level border/memory preset**
- Check `event.border_index < 16` before rendering event
- If true: emit `border_preset(event.border_index)` packet
- Check `event.memory_preset_index < 16` before rendering event
- If true: emit `memory_preset(event.memory_preset_index)` packet

**3. Implement scroll/SCROLL(zero) handling**
- Generate scroll packets for non-zero offsets
- Special case: detect `(x_scroll == 0 && y_scroll == 0)` = SCROLL_PRESET
- Different emission strategy for zero vs non-zero scrolls

### Phase B: Text Rendering Accuracy

**4. Fix TextClip.render_text_to_bmp() karaoke modes**
- Implement different `top_margin` by mode
- Generate line-by-line erase events (karaoke only, line-mode only)
- Generate word-by-word wipe events with XOR blending
- Set correct composite modes per event type

**5. Fix Y-offset calculations by mode**
- TITLES: `y_offset = (line % lines_per_page) * line_height + 12`
- KARAOKE: `y_offset = (line % lines_per_page) * line_height + top_margin`
- Use correct `top_margin` from mode lookup table

### Phase C: Screen Clearing Logic

**6. Implement screen clear timing**
- TITLES: Only clear on first event (memory_preset_index on event 0 only)
- KARAOKE: Only clear on page boundaries (when `(line % lines_per_page) == 0` in page-mode)
- Never generate spurious MEMORY_PRESET commands

**7. Handle border_index=16 (disabled) correctly**
- Skip border_preset() emission if border_index == 16
- Skip memory_preset() emission if memory_preset_index == 16

---

## 6. Visual Impact by Priority

| Fix | Impact | Difficulty |
|-----|--------|------------|
| Event processing (Phase A.1) | **CRITICAL** - enables per-event control | High |
| Event border/preset (Phase A.2) | **CRITICAL** - fixes screen clearing | High |
| Karaoke top_margin (Phase B.4) | **HIGH** - fixes positioning of 5/8-line modes | Medium |
| Y-offset per mode (Phase B.5) | **HIGH** - fixes vertical alignment | Medium |
| SCROLL(zero) handling (Phase A.3) | **MEDIUM** - affects initialization | Medium |
| Font size mapping (done) | **MEDIUM** - already fixed in Session 6 | N/A |

---

## 7. Example: What Should Happen (vs Current Behavior)

### Example: 5-Line Karaoke Mode with 3 Lines of Text

**Current (Wrong)**:
```
Packet 0: LOAD_CLUT_LO (palette 0-7)
Packet 1: LOAD_CLUT_HI (palette 8-15)
Packet 2: BORDER_PRESET(0)    ← Global, from encoder state
Packet 3: MEMORY_PRESET(0)    ← Global, from encoder state
Packet 4-N: COPY_FONT tiles for all 3 lines
```

**Should Be (Right)**:
```
Packet 0: LOAD_CLUT_LO (palette 0-7)
Packet 1: LOAD_CLUT_HI (palette 8-15)
Packet 2: SCROLL(zero)         ← Special init packet for this event
[Line 0]
Packet 3: BORDER_PRESET(15)    ← FROM event.border_index
Packet 4: MEMORY_PRESET(15)    ← FROM event.memory_preset_index
Packet 5-K: COPY_FONT for erase (background only)
Packet K+1-M: COPY_FONT for line 0 text
Packet M+1-P: COPY_FONT for word highlights
[Line 1]
Packet Q-T: COPY_FONT for erase
Packet U-X: COPY_FONT for line 1 text
Packet Y-Z: COPY_FONT for word highlights
[Line 2]
Packet AA-AD: COPY_FONT for erase
Packet AE-AH: COPY_FONT for line 2 text
Packet AI-AJ: COPY_FONT for word highlights
```

**Key Differences**:
1. ✓ SCROLL(zero) packet at event start
2. ✓ Event-specific border/preset (from MediaEvent)
3. ✓ Multiple packet types per line (erase, draw, wipe)
4. ✓ Proper sequencing by timing

---

## 8. Karaoke Mode Constants Reference

From CDGMagic_TextClip.h (lines 0-60):

| Mode | Enum | Lines | Height | Top Margin | Purpose |
|------|------|-------|--------|------------|---------|
| 0x00 | `KAR_MODE__TITLES` | N/A | Auto | 12 | Title overlay (multi-line) |
| 0x01 | `KAR_MODE__LYRICS` | 1 | 24 | 12 | Single-line lyrics |
| 0x02 | `KAR_MODE__KARAOKE` | 1 | 24 | 12 | Standard karaoke (deprecated?) |
| 0x03 | `KAR_MODE__5BLNCT` | 5 | 36 | 24 | 5-line, bottom, line-cut mode |
| 0x04 | `KAR_MODE__5BLNFD` | 5 | 36 | 24 | 5-line, bottom, fade mode |
| 0x05 | `KAR_MODE__5BLINE` | 5 | 36 | 24 | 5-line, bottom, line display |
| 0x06 | `KAR_MODE__5BPAGE` | 5 | 36 | 24 | 5-line, bottom, page display |
| 0x07 | `KAR_MODE__7MLNCT` | 7 | 24 | 24 | 7-line, middle, line-cut (5 visible) |
| 0x08 | `KAR_MODE__7MLNFD` | 7 | 24 | 24 | 7-line, middle, fade (5 visible) |
| 0x09 | `KAR_MODE__6MLINE` | 8 | 24 | 36 | 8-line [6], middle, line display |
| 0x0A | `KAR_MODE__6MPAGE` | 8 | 24 | 36 | 8-line [6], middle, page display |
| 0x0B | `KAR_MODE__84BLIN` | 8 | 24 | 108 | 8-line [4], bottom, line display |

---

## 9. Conclusion: Path Forward

The TypeScript implementation has the **RIGHT STRUCTURE** (packet types, class organization, overall architecture) but is missing the **DYNAMIC CONTROL** that makes rendering work correctly:

1. Events are generated with border/memory settings, but encoder ignores them
2. Y-offsets are calculated incorrectly for karaoke modes (wrong top_margin)
3. Screen clearing happens globally instead of per-event
4. No support for special packets (SCROLL(zero))
5. Karaoke rendering doesn't generate all three event types (erase/draw/wipe)

**Solution**: Implement the event processing loop properly, use event-level attributes, and fix Y-offset calculations. This will transform the output from "structurally correct but visually wrong" to "faithful reproduction of C++ behavior."

---

## 10. Next Steps (Recommended Order)

1. ✅ Review this document
2. 📝 Implement real `compute_graphics()` event loop
3. 📝 Extract and use event-level border/memory settings
4. 📝 Fix TextClip karaoke rendering (3 event types)
5. 📝 Fix Y-offset calculations (top_margin by mode)
6. 📝 Test against reference CDG files
7. 📝 Implement SCROLL(zero) and palette transitions

---

*End of Deep Analysis - Session 7*
