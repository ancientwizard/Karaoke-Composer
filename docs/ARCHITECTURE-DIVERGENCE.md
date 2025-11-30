
# ARCHITECTURE DIVERGENCE ANALYSIS

## Critical Issues Found

### 1. TRANSITIONS NOT IMPLEMENTED ✗
**Status**: Major gap - explains why BMP doesn't fully appear

**Reference Behavior**: 
- BMPObject stores `transition_blocks[]` array (768 entries for 50×18 grid)
- Default order: top→bottom→left→right (sequential by column then row)
- Custom order loaded from .cmt files: spiral, circular reveals, etc.
- C++ code iterates through `transition_length()` blocks in transition order
- Each block rendered at: `start_pack + start_offset + draw_delay + (block_index)`

**Our Implementation**: 
- Renders all 900 blocks immediately in spatial order (0→49, 50→99, etc.)
- No transition ordering
- No delay spreading

**Impact**: 
- BMP appears all at once instead of progressively revealing in effect pattern
- Can't achieve spiral reveal, gradient reveals, etc.

**Reference Files**:
- `cdg-projects/transition_gradient_*.cmt` - Example transition patterns
- Sample_project_04.cmp references these files in BMP events

**Fix Required**:
- Pass transition data through converter
- Sort FontBlocks by transition order
- Schedule blocks spread across multiple packets (not all at start_pack)

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
1. Implement transition block ordering
2. Spread FontBlock scheduling across packets
3. Fix text rendering to match C++ output

### P1 - SHOULD FIX (likely significant impact)
1. Palette manipulation sequencing
2. Transparency/composite mode handling
3. MEMORY_PRESET sequencing

### P2 - NICE TO HAVE (polish)
1. Custom font support
2. Advanced XOR effects
3. Performance optimization

---

## Technical Debt

**bmp_to_fontblocks()**: 
- Currently accepts only BMPData
- Needs to accept: BMPObject reference, transition data, draw_delay
- Should return blocks in transition order with timing info

**CDGMagic_CDGExporter.schedule_bmp_clip()**:
- Currently processes all 900 blocks in one shot
- Needs to: spread blocks across packets based on transition timing

**ClipConverter**:
- Currently reads BMP files, but doesn't preserve transition metadata
- Needs to: load .cmt transition files and make available to encoder

---

## C++ Reference Points

- CDGMagic_BMPObject::transition_block(index, x_or_y) - returns transition order
- CDGMagic_BMPObject::transition_length() - returns 768 (50×18)
- CDGMagic_BMPObject::transition_file() - loads custom .cmt files
- CDGMagic_GraphicsEncoder::bmp_to_fonts() lines 554-606 - shows transition loop
- CDGMagic_BMPClip.cpp::serialize() - saves transition file path
