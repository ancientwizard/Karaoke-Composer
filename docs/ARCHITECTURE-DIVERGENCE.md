
# ARCHITECTURE DIVERGENCE ANALYSIS

## Critical Issues Found

### 1. TRANSITIONS PARTIALLY IMPLEMENTED ✓ (In Progress)
**Status**: File loading complete, but needs rendering verification

**Reference Behavior**: 
- BMPObject stores `transition_blocks[]` array (768 entries for 50×18 grid)
- Default order: top→bottom→left→right (sequential by column then row)
- Custom order loaded from .cmt files: spiral, circular reveals, etc.
- C++ code iterates through `transition_length()` blocks in transition order
- Each block rendered at: `start_pack + start_offset + draw_delay + (block_index)`

**Our Implementation** (NEW): 
- ✅ TransitionFileReader.ts loads .cmt files correctly (1536 bytes → 768 block pairs)
- ✅ getDefaultTransition() creates sequential order matching C++ default
- ✅ bmp_to_fontblocks() accepts TransitionData parameter
- ✅ BMPToFontBlockConverter iterates in transition order
- ✅ Each block scheduled at: `start_pack + transition_index` (progressive)
- ✅ CDGExporter.schedule_bmp_clip() loads transition files and passes to converter
- ✅ Debug logging shows: "Loaded transition: cdg-projects/transition_gradient_03.cmt (768 blocks)"
- ✅ Converter shows: "Converted BMP to 768 FontBlocks (transition: custom, packets 603-1370)"

**Test Results**:
- All 619 unit tests passing
- Integration test with sample_project_04 successfully loads and applies transitions
- Output file size matches reference (422K)
- Byte accuracy: 71.80% (same as before transitions - no regression)

**Impact**: 
- BMP should now render progressively in effect pattern instead of all at once
- Gradient reveals, spirals, etc. should work when viewed on actual CD+G player
- Progressive rendering spread across 768 packets (packets 603-1370)

**Next Step**: Verify visual output on CD+G player to confirm reveal patterns are correct

**Reference Files**:
- `src/ts/cd+g-magic/TransitionFileReader.ts` - ✅ IMPLEMENTED
- `src/ts/cd+g-magic/BMPToFontBlockConverter.ts` - ✅ UPDATED
- `src/ts/cd+g-magic/CDGMagic_CDGExporter.ts` - ✅ UPDATED

---

### 2. PALETTE MANIPULATION FOR EFFECTS ⚠️
**Status**: Suspected but unconfirmed

**Theory** (from user observation #2):
> "a mix of palette magic may be used to hide some colors making some the background and then change to the right color the moment they need to show"

**Likely Mechanism**:
- Load palette with key colors set to "transparent" or "background"
- Draw BMP blocks using those indices (invisible on screen)
- Later, update palette entry to reveal the color
- Creates impression of progressive reveal without re-drawing blocks

**Reference Support**:
- C++ has `composite_index` and `replacement_transparent_color` / `overlay_transparent_color`
- FontBlock supports transparency modes
- Encoder has `copy_compare_fontblock()` doing VRAM comparison

**Our Implementation**:
- Not using transparency modes
- Drawing all pixels directly
- No palette change sequencing

---

### 3. TEXT RENDERING COMPLETELY DIFFERENT ✗
**Status**: Major architectural mismatch

**Reference Behavior** (from inspection):
- Uses preset font definitions or custom fonts
- Positions text on tile boundaries
- May use multiple MEMORY_PRESET packets for effect

**Our Implementation**:
- Simple text-to-tile rendering
- No preset fonts
- Placement logic differs

**User Observation #5**: 
> "the text is ugly its not formed like the .cpp and not placed like the .cpp"

---

### 4. SCREEN RESET SEQUENCE ISSUE ⚠️
**Status**: Confirmed presence, purpose unclear

**Reference Pattern** (packets 602-609):
- Pkt 602: BORDER_PRESET 0x02
- Pkt 603-609: Multiple MEMORY_PRESET packets with different values

**Our Pattern**:
- Pkt 602: MEMORY_PRESET 0x01
- Pkt 603+: TILE_BLOCK 0x06 immediately

**Why It Matters**:
- Reference sequencing suggests prep work before tile drawing starts
- Multiple presets might be initializing different screen regions
- We might be skipping necessary initialization

---

## Priority Roadmap

### P0 - MUST FIX (blocking accuracy)
1. ✅ DONE: Implement transition block ordering
2. ✅ DONE: Spread FontBlock scheduling across packets
3. 🔴 TODO: Fix text rendering to match C++ output (major impact on accuracy)

### P1 - SHOULD FIX (likely significant impact)
1. 🟡 TODO: Palette manipulation sequencing (color hiding/revealing for effects)
2. 🟡 TODO: Transparency/composite mode handling
3. 🟡 TODO: MEMORY_PRESET sequencing (screen reset before tile block rendering)

### P2 - NICE TO HAVE (polish)
1. Custom font support
2. Advanced XOR effects
3. Performance optimization

---

## Technical Debt

**bmp_to_fontblocks()**: 
- ✅ COMPLETED: Now accepts optional TransitionData parameter
- ✅ COMPLETED: Returns blocks in transition order with timing info
- ✅ COMPLETED: Each block scheduled at unique packet: `start_pack + transition_index`

**CDGMagic_CDGExporter.schedule_bmp_clip()**:
- ✅ COMPLETED: Loads .cmt transition files from BMP event data
- ✅ COMPLETED: Passes TransitionData to converter
- ✅ COMPLETED: Spreads blocks across packets based on transition ordering
- Status: Blocks now scheduled progressively (packets 603-1370 for 768 blocks)

**ClipConverter**:
- ✅ COMPLETED: Reads and preserves transition metadata from CMP files
- Status: ClipConverter already stores `transition_file` and `transition_length` in _bmp_events

**Remaining Architecture Debt**:
- TEXT RENDERING: Still needs architectural overhaul to match C++ output
- PALETTE EFFECTS: Transparency modes and palette sequencing not yet implemented
- SCREEN RESET: Need to understand multi-MEMORY_PRESET sequencing pattern

## C++ Reference Points

- CDGMagic_BMPObject::transition_block(index, x_or_y) - returns transition order
- CDGMagic_BMPObject::transition_length() - returns 768 (50×18)
- CDGMagic_BMPObject::transition_file() - loads custom .cmt files
- CDGMagic_GraphicsEncoder::bmp_to_fonts() lines 554-606 - shows transition loop
- CDGMagic_BMPClip.cpp::serialize() - saves transition file path
