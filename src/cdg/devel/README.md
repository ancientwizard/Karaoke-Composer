# Glyph Testing Architecture

## Organization

**Reusable Code (src/cdg/)**
- `glyph-renderer.ts` - Core glyph-to-VRAM rendering
- `tile-extractor.ts` - VRAM-to-tile extraction & CDG packet conversion

**Diagnostic/Dev Code (src/cdg/devel/)**
- `test-patterns.ts` - Visual test patterns (pixel grid, boundaries, checkerboard, gradient)

**Usage Locations**
- `tmp/scripts/generate-glyph-test-cdg.ts` - Will import from `src/cdg/glyph-renderer.ts` and `src/cdg/tile-extractor.ts`
- `src/views/DeveloperView.vue` - Will use diagnostic patterns and rendering functions

## Next Steps

1. **Update DeveloperView.vue** to display:
   - Glyph test patterns (alignment grid, boundaries)
   - Rendered glyphs at various positions
   - Live VRAM visualization
   - Tile extraction preview

2. **Add toggle between:**
   - Pre-CDG visualization (raw VRAM pixels)
   - CDG packet visualization (tiles with extracted data)

3. **Integrate CDGTextRenderer** from existing codebase to render actual glyphs

4. **Update tmp/scripts/generate-glyph-test-cdg.ts** to use extracted reusable modules

## Alignment Verification Goals

- ✓ Pixel-to-tile alignment (no shifting)
- ✓ Arbitrary glyph positioning (tile-aligned and non-aligned)
- ✓ 100% boundary accuracy (no out-of-bounds clipping)
- ✓ Tile extraction fidelity (pixels correctly mapped)

This is the FOUNDATION for all downstream rendering work.
