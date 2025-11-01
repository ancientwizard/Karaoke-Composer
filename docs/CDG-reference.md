# CD+G / CDG Reference & RFCs
```markdown
# CD+G (CDG) reference — concise facts for encoder/scheduler

This page captures the essential, authoritative facts we rely on while building a byte-for-byte compatible CDG generator and diagnosing rendering/length issues.

Core facts
----------
- Packet unit: 24 bytes per CD+G subcode packet. This is the canonical packet size that players and `.cdg` files use.
-- Rate (physical CDG spec): 75 packets per second (packets/sec). Convert packets -> seconds with `seconds = packets / 75` when aligning to audio/CD timing.
	- Project note: this repository uses a file-generation baseline of 300 packets/second for ms→packet conversions by default. When using the project's tooling, convert packets -> seconds with `seconds = packets / 300` unless you explicitly set a different `pps`.
- File format: A `.cdg` file is a linear stream of 24‑byte packets. Players consume this stream and update VRAM according to packet commands.

Common confusion (96 bytes / grouped buffers)
--------------------------------------------
- Some tools or burning/transport layers group several 24‑byte packets into larger buffers (common grouping: 4 × 24 = 96 bytes) for sector/subcode framing or I/O efficiency. That is a transport/buffering detail and not a change to the canonical 24‑byte CDG packet unit.

Why generated files sometimes appear 1/4 the expected length
-----------------------------------------------------------
-- If a script or tool computes packet count using 96 instead of 24 (e.g. `packets = buf.length / 96`), it will report 1/4 the true number of packets. If you then compute duration using an incorrect `pps` (for example `packets / 75` when your tooling expects 300), the reported duration will be wrong (often 4× off). Always ensure you know which `pps` value is being assumed: the physical CDG spec is 75 pps, this repo's generator defaults to 300 pps for ms→packet mapping.
- Other causes to check:
	- File truncation (the `.cdg` file was cut off during write).
	- Incorrect slicing of the buffer when extracting packets (using a wrong divisor or offset).
	- Missing reserved prelude packets (palette/memory/border) which can shift or shorten visible output in players.

Why generated `.cdg` files might not render correctly
----------------------------------------------------
- Byte-level differences matter: palette packing (RGB→4-bit), CLUT ordering, tile bitplane packing, COPY vs XOR choice, and packet header bytes must match expected values.
- Packet ordering & timing: initialization (palette, border, memory preset) is expected at particular indices; mismatches cause wrong colors or empty VRAM.
- VRAM semantics: incorrect tile packing or wrong tile command codes will yield wrong pixels.

Practical checklist to debug & fix parity
----------------------------------------
1. Treat the packet unit as 24 bytes everywhere. Search for hard-coded `24` or local `PACKET_SIZE` values and consolidate.
2. Verify duration calculations use the intended mapping: `seconds = packets / <pps>` where `<pps>` is either the physical spec (75) when aligning to audio/CD frames, or the project's file baseline (300) when using the generator's default behavior. Prefer reading `CDG_PPS` from the codebase or using the tool's `--pps` flag to avoid ambiguity.
3. Ensure reserved prelude (palette/memory/border) is emitted at the same indices as the reference when attempting byte-for-byte parity.
4. Port the reference encoder's `write_fontblock` and related packet-packing logic exactly (bit packing, packet ordering, COPY/XOR heuristics).
5. Add regression tests that extract packets from a reference `.cdg` and assert exact byte-for-byte equality for the same event window.

Quick diagnostics (from repo root)
```bash
# find files with packet-size math or local PACKET_SIZE
rg "PACKET_SIZE|packetSize|/ 96|/96|packets per second|75 packets" || true

# compute packets and seconds for a .cdg by filename
node -e "const fs=require('fs');const p=fs.readFileSync(process.argv[1]);console.log('bytes',p.length,'packets',p.length/24,'seconds_spec75',p.length/24/75,'seconds_proj300',p.length/24/300)" sample.cdg
```

Authoritative references
------------------------
- CD+G technical overview: https://cdgfix.com/help/3.x/Technical_information/The_CDG_graphics_format.htm
- File extension / high level: https://filext.com/file-extension/CDG
- Wikipedia summary: https://en.wikipedia.org/wiki/CD%2BG


End of concise reference.

```
