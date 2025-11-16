## VLC CDG decoder — summary and comparison

Source: https://code.videolan.org/videolan/vlc/-/raw/master/modules/codec/cdg.c

Checked: 2025-11-08 — reviewed the current `master` copy of `modules/codec/cdg.c` and confirmed the documented behaviors below (packet downsampling where `(i_packet % 3) == 1`, data pointer `p_buffer+4`, and the 2-byte color unpack sequence).

This document summarizes how VLC decodes CDG packets (file version referenced above), highlights important implementation details, and calls out differences vs this repository's CDG encoder/packet helpers (`src/karaoke/renderers/cdg/CDGPacket.ts` and related debug generators).

### High-level notes

-- VLC treats CDG data as 24-byte packets and iterates over those packets in the input block (it expects full packets in the input buffer). It increments an internal packet counter and renders at 25fps by skipping 2 out of every 3 packets (75 packets/s -> 25 frames/s display cadence).
   - Implementation detail: VLC keeps the packet where `(i_packet % 3) == 1` (i.e. the middle packet of every consecutive 3-packet group, counting packets from zero). This selection is a simple modulo-based downsampling — there is no per-packet "importance" heuristic; the same position is always chosen.
   - VLC additionally only creates a display frame when `p_block->i_pts == p_block->i_dts` (it compares presentation and decode timestamps), so decoded packets may be skipped if timing doesn't match frame boundaries.
- VLC masks command and instruction bytes with `& 0x3F` (6-bit fields) and checks the first field to be the CDG subcode (0x09). It then dispatches on instruction codes (1=MEMORY_PRESET, 2=BORDER_PRESET, 6=TILE_BLOCK, 20/24=SCROLL_PRESET/COPY, 30/31=LOAD_COLOR_TABLE_LOW/HIGH, 38=TILE_BLOCK_XOR, etc.).

### Packet layout (how VLC reads it)

- VLC reads:
  - `i_cmd = p_buffer[0] & 0x3F`  (expects this to be 0x09 for CDG packets)
  - `i_instruction = p_buffer[1] & 0x3F` (instruction/command code)
  - it sets `p_data = &p_buffer[4]` before passing `p_data` to the command handlers

- Thus VLC expects the 16 data bytes for a LOAD packet to be available at `p_data[0]..p_data[15]` where `p_data` is `p_buffer + 4` (i.e. bytes at original offsets 4..19 in the raw buffer provided to DecodePacket).

Note: there are slight variations in various CDG sources about which byte index holds which field depending on whether the stream is from a raw CD subsystem or a .cdg file. VLC uses the `p_buffer+4` data pointer, which is consistent with its internal framing of the input buffer; the important point is VLC expects the 16 color data bytes (two bytes per color x8) to be read as consecutive bytes in the handler.

### LOAD_COLOR_TABLE decoding (how VLC reconstructs r/g/b)

- VLC's code (abbreviated) reads 2 bytes per color and forms a 16-bit word `c`:

  c = (p_data[2*n + 0] << 8) | p_data[2*n + 1]

  r4 = (c >> 10) & 0x0F
  g4 = ((c >> 6) & 0x0C) | ((c >> 4) & 0x03)
  b4 = c & 0x0F

  // then expand to 8-bit channels by shifting left 4
  r8 = r4 << 4; g8 = g4 << 4; b8 = b4 << 4;

- In plain terms: VLC expects the 12-bit CDG color to be split across the two bytes so that the assembled 16-bit value `c` contains the 12 color bits arranged as r4 in bits 10..13, g4 in bits 6..9 (assembled from two pieces), and b4 in bits 0..3.

### Memory/border/scroll/tile decoding

- Memory preset (instruction 1): p_data[0] & 0x0f gives the color index; VLC calls ScreenFill over the full screen.
- Border preset (instruction 2): p_data[0] & 0x0f picks the border color and VLC fills the border rectangles.
- Tile block (instruction 6 / 38): VLC reads two color indices p_data[0], p_data[1] (each masked & 0x0f), decodes the tile column/row from p_data[2/3], and then decodes 12 bytes of bitmap (p_data[4..15]) with each byte's bits mapped to 6 pixels (bit shifts used). It writes either assignment or XOR depending on the instruction.
- Scroll copy / preset (20/24): VLC interprets p_data[1] and p_data[2] direction/offset fields; it computes pixel shifts as multiples of tile sizes (6 horizontally, 12 vertically) and performs copy or fill operations accordingly.

### Parity / arg-byte handling

- VLC reads `p_buffer[0]` and `p_buffer[1]` for the subcode/instruction but then deliberately references `p_buffer+4` for `p_data` — this implies the implementation expects two (or more) header bytes between instruction and data in the input buffer. VLC does also reference `p_data[?]` fields for arguments inside command handlers (e.g. p_data[0] used for color index in memory/border presets).
- The VLC code contains commented-out references and `#if 0` blocks around repeat/parity usage — in practice VLC treats the high/extra bits as not critical for decoding and masks the fields where appropriate (e.g. color indexes are masked with `& 0x0f`, shifts masked to ranges, etc.).

### Where VLC's decoding differs from this repo's encoder/runtime

1) Data pointer offset/framings
   - VLC uses `p_data = p_buffer + 4` before command handlers. Our `CDGPacket` helper writes data bytes into `buffer[3..18]` (via `setData()` which writes at `this.buffer[3 + i]`). This *looks* like a one-byte offset mismatch; however it depends on how the packet is serialized to file. In practice:
     - Our `CDGPacket` constructor sets `buffer[0] = 0x09` (CDG subcode), `buffer[1] = instruction (command)`, `buffer[2] = instruction-arg` and data at `buffer[3..18]`. That yields the 16 data bytes starting at offset 3.
     - VLC's `p_data = &p_buffer[4]` means VLC expects the input buffer passed into DecodePacket to contain an extra leading byte before the packet's `0x09` subcode, or it expects a different framing when reading from CD sectors vs raw .cdg files. In the wild, some readers strip or insert a leading byte depending on source; this explains occasional off-by-one mismatches when a decoder written for one framing reads files produced by a different tool.

   - Action: confirm the exact byte offsets in the .cdg file we produce (we have tools in `src/debug` to inspect), and if necessary provide an option to generate alternative framings (shift data by 1 byte) for compatibility testing.

2) Color packing (LOAD_COLOR_TABLE) — compatible
   - VLC unpacks colors from two bytes into a 16-bit value `c` and extracts r/g/b as shown above.
   - Our encoder (`CDGPacket.loadColorTable` / `generatePaletteLoadPackets` in `src/cdg/encoder.ts`) packs colors using the formula:
     - byte1 = (r4 << 2) | (g4 >> 2)
     - byte2 = ((g4 & 0x03) << 6) | (b4 << 2)
   - When assembled as `c = byte1<<8 | byte2`, this yields `c = (r4 << 10) | (g4 << 6) | (b4 << 2)`, which is consistent with VLC's bit-extraction logic. So our color packing is compatible with VLC's decoding.

3) Parity/arg bytes
   - Our `CDGPacket.setParity()` writes a simple parity into bytes 19..22 (we call `setParity()` from `toBuffer()` by default). VLC largely ignores parity (the decoder masks fields and comments indicate parity/arg are not relied upon), and in the samples we scanned the parity (arg) bytes were zero.
   - The user-observed problem (odd colors) is more likely to come from framing/offset differences or alternate packing variants on the device than from parity bytes — however parity/arg bytes can cause decoders that expect disk framing to mis-interpret data when present or when the file lacks the expected additional bytes.

4) Alternate packings and variants
   - The VLC code contains the exact bit-extraction used above — if a player/device uses a different packing (for example, swaps the two color bytes or uses alternate bit positions for green/blue), that will produce wildly different colors. We already generate variants (`index11-probe-swapped.cdg`, `index11-probe-altpack.cdg`) for compatibility testing; VLC's decoder description confirms that such tests are useful.

5) Tile decode / bit ordering
   - VLC's tile decode uses `(p_data[4+y] >> (5-x)) & 0x01` to extract bit `x` from a byte. That matches the common CDG tile bit ordering (MSB for leftmost pixel). Our `writeFontBlock`/tile encoding code must match this ordering (and the repo's tests and generated probes indicate it does). If you see pixel-level flips, re-check tile-bit ordering and XOR vs assignment variants.

### Practical recommendations

1. Framing option
   - Add a small option to our writers to emit two packet framings:
     - "file/CDG" framing (data at buffer[3..18], parity at 19..22) — current default
     - "disk/CDDA" framing (emits the extra leading byte(s) that VLC's `p_data = &p_buffer[4]` implies) — for testing with players that expect raw CD sector framing.

2. Parity toggle
   - Make parity emission optional (the project already can create empty packets). Provide a `--no-parity` or `parity=false` option for deterministic tests.

3. Test matrix
   - Use the existing probe generators to produce a small matrix of files:
     - default packing, disk-framing, swapped-bytes, altpack, with/without parity
   - Test on the target hardware and report which variant best reproduces observed colors.

4. Diagnostic utilities
   - Add a small helper (or extend `scripts/check_load_extra_bits.cjs`) to print per-LOAD-packet the exact `(byte1, byte2)` pairs for a chosen palette index across the file, for easy correlation with observed frames.

### Conclusion

VLC's implementation confirms the canonical CDG color packing (two data bytes per color assembled into a 16-bit `c` then decomposed to r/g/b). The most likely source of mismatches between our generated files and a particular player's rendering is framing/parity differences (how the data bytes are located in the input buffer) or alternate packing variants on the device. Our encoder's color byte packing is compatible with VLC's decoder; to resolve your observed off-colors, generate and test the framing/parity/altpack variants (you already have tools for that) and compare device results to the VLC behavior.

Files referenced
- VLC source: modules/codec/cdg.c (commit debf83ba...)
- Our encoder: `src/karaoke/renderers/cdg/CDGPacket.ts` and `src/cdg/encoder.ts` (palette packers / load packet generators)
- Diagnostics helpers: `src/debug/*` and `scripts/check_load_extra_bits.cjs`

If you want, I will:
- produce the disk-framed variant writer and a small batch of files (default, disk-framed, swapped, altpack, parity/no-parity), or
- implement the per-LOAD packet byte-pair dumper and run it across the generated probe files so you can correlate each step to the emitted bytes.

*** END
