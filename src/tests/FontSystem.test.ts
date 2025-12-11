/**
 * Font System Tests
 *
 * Tests for UnifiedFontSystem, FallbackBitmapFontRenderer, and FontGlyphRenderer
 */

import { UnifiedFontSystem } from '@/ts/cd+g-magic/UnifiedFontSystem';
import { FallbackBitmapFontRenderer } from '@/ts/cd+g-magic/FallbackBitmapFontRenderer';

describe('FallbackBitmapFontRenderer', () => {
  let renderer: FallbackBitmapFontRenderer;

  beforeEach(() => {
    renderer = new FallbackBitmapFontRenderer();
  });

  test('should render space character', () => {
    const glyph = renderer.renderGlyph(' ');
    expect(glyph).not.toBeNull();
    expect(glyph!.width).toBeGreaterThan(0);
    expect(glyph!.height).toBeGreaterThan(0);
  });

  test('should render uppercase letter', () => {
    const glyph = renderer.renderGlyph('A');
    expect(glyph).not.toBeNull();
    expect(glyph!.data).toBeInstanceOf(Uint8Array);
    expect(glyph!.data.length).toBe(glyph!.width * glyph!.height);
  });

  test('should render digit', () => {
    const glyph = renderer.renderGlyph('5');
    expect(glyph).not.toBeNull();
    expect(glyph!.advanceWidth).toBeGreaterThan(0);
  });

  test('should scale glyph with font size', () => {
    renderer.setFontSize(12);
    const small = renderer.renderGlyph('A');
    
    renderer.setFontSize(24);
    const large = renderer.renderGlyph('A');
    
    expect(large!.width).toBeGreaterThan(small!.width);
    expect(large!.height).toBeGreaterThan(small!.height);
  });

  test('should cache glyphs', () => {
    renderer.setFontSize(12);
    const glyph1 = renderer.renderGlyph('B');
    const glyph2 = renderer.renderGlyph('B');
    
    // Should be same instance from cache
    expect(glyph1).toBe(glyph2);
  });

  test('should clear cache', () => {
    renderer.setFontSize(12);
    const glyph1 = renderer.renderGlyph('C');
    
    renderer.clearCache();
    renderer.setFontSize(12);
    const glyph2 = renderer.renderGlyph('C');
    
    // Should be different instances after cache clear
    expect(glyph1).not.toBe(glyph2);
  });

  test('should handle unknown characters gracefully', () => {
    const glyph = renderer.renderGlyph('€');  // Not in font
    expect(glyph).not.toBeNull();  // Should return space
  });
});

describe('UnifiedFontSystem', () => {
  let fonts: UnifiedFontSystem;

  beforeEach(() => {
    fonts = new UnifiedFontSystem();
  });

  test('should initialize with fallback', () => {
    expect(fonts.hasRealFont(0)).toBe(false);  // No real fonts loaded initially
  });

  test('should render character with default fallback', () => {
    fonts.setFontSize(12);
    const glyph = fonts.renderChar('X');
    
    expect(glyph).not.toBeNull();
    expect(glyph!.data).toBeInstanceOf(Uint8Array);
  });

  test('should measure text width', () => {
    fonts.setFontSize(12);
    const width = fonts.measureText('HELLO');
    
    expect(width).toBeGreaterThan(0);
  });

  test('should handle size override in renderChar', () => {
    fonts.setFontSize(12);
    const glyph12 = fonts.renderChar('A', 12);
    
    const glyph24 = fonts.renderChar('A', 24);
    
    expect(glyph24!.width).toBeGreaterThan(glyph12!.width);
  });

  test('should handle size override in measureText', () => {
    const width12 = fonts.measureText('TEST', 12);
    const width24 = fonts.measureText('TEST', 24);
    
    expect(width24).toBeGreaterThan(width12);
  });

  test('should support font index parameter', () => {
    fonts.setFontSize(12);
    const glyph0 = fonts.renderChar('A', undefined, 0);
    const glyph1 = fonts.renderChar('A', undefined, 1);
    
    expect(glyph0).not.toBeNull();
    expect(glyph1).not.toBeNull();
  });

  test('should clear cache', () => {
    fonts.setFontSize(12);
    const glyph1 = fonts.renderChar('A');
    
    fonts.clearCache();
    const glyph2 = fonts.renderChar('A');
    
    // Should be different instances after cache clear
    expect(glyph1).not.toBe(glyph2);
  });
});

// VIM: set ft=typescript :
// END
