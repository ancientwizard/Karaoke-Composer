# render-cdg: CD+G File Generation Tool

## Overview

`render-cdg.ts` converts CD+Graphics Magic project files (.cmp) to binary CD+G files (.cdg) using the TypeScript CDGMagic_CDGExporter.

## Basic Usage

```bash
npx tsx bin/render-cdg.ts <input.cmp> <output.cdg> [reference.cdg]
```

## Examples

### Generate CDG from project
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_03b.cmp /tmp/output.cdg
```

### Generate and compare with reference
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_04.cmp /tmp/output.cdg cdg-projects/sample_project_04.cdg
```

## Options

### `--no-text-clips`

Exclude all text clips from rendering. Useful for testing BMP and transition rendering without text layer interference.

**Example:**
```bash
npx tsx bin/render-cdg.ts cdg-projects/sample_project_03b.cmp /tmp/output_no_text.cdg --no-text-clips
```

**Use Cases:**
- Debug transition patterns without text occlusion
- Verify BMP rendering is correct
- Isolate text rendering issues
- Compare text vs. no-text output

**Output:**
```
[render-cdg] Mode: Text clips DISABLED (--no-text-clips)
[render-cdg] Registered 4 clips, skipped 10
```

## Options Placement

Flags can appear after positional arguments:

```bash
# ✓ Correct
npx tsx bin/render-cdg.ts input.cmp output.cdg --no-text-clips
npx tsx bin/render-cdg.ts input.cmp output.cdg reference.cdg --no-text-clips

# ✗ Invalid (flag must come after positional args)
npx tsx bin/render-cdg.ts --no-text-clips input.cmp output.cdg
```

## Environment Variables

### `VERBOSE=1`

Enable detailed logging:

```bash
VERBOSE=1 npx tsx bin/render-cdg.ts input.cmp output.cdg
```

## Output

The tool generates informational messages at each stage:

```
[render-cdg] Starting CDG generation
[render-cdg] Input:  cdg-projects/sample_project_03b.cmp
[render-cdg] Output: /tmp/output.cdg
[render-cdg] Loading CMP project...
[render-cdg] Loaded project with 14 clips, audio: ...
[render-cdg] Generating CDG...
[render-cdg] Loaded palette from BMP: ...
[render-cdg] Registered 14 clips, skipped 0
[render-cdg] Scheduled 18000 total packets
[render-cdg] Generated 432000 bytes of CDG data (18000 packets)
[render-cdg] Writing output to /tmp/output.cdg...
[render-cdg] ✓ Complete
```

## Validation

If a reference CDG file is provided, the tool compares:
- File size
- Byte-by-byte content
- Reports first 20 mismatches if differences found

```bash
npx tsx bin/render-cdg.ts input.cmp output.cdg reference.cdg
```

**Output on match:**
```
[compare] ✓ Generated CDG matches reference file EXACTLY
```

## Technical Details

### Default Duration
- 18,000 packets (60 seconds)
- Standard CD+G frame rate: 300 packets/second

### Supported Clip Types
- BMPClip - Background images with transitions
- TextClip - Text overlays (skipped with `--no-text-clips`)
- ScrollClip - Scrolling text
- PALGlobalClip - Global palette commands
- VectorClip - Vector graphics

### Font Initialization
Fonts are loaded asynchronously at startup:
- Real TTF fonts (Arial, Courier, Times) if available
- Falls back to bitmap fonts if real fonts unavailable
- Does not block CDG generation

## Exit Codes

- `0` - Success
- `1` - Validation failure (if reference file provided)
- `1` - Error (file not found, invalid input, etc.)

## Debugging Transition Rendering

To debug transitions without text interference:

```bash
# Generate without text
npx tsx bin/render-cdg.ts project.cmp /tmp/no_text.cdg --no-text-clips

# Generate with text
npx tsx bin/render-cdg.ts project.cmp /tmp/with_text.cdg

# Compare outputs (same structure, different block data)
ls -la /tmp/*.cdg
md5sum /tmp/*.cdg
```

The `--no-text-clips` version will render:
- Background BMP with full transition pattern
- No text layer rendering
- Cleaner visualization of transition effects

---

**Last Updated:** 2025-12-11  
**Status:** Production Ready
