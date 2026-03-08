/**
 * Glyph Lab Types
 *
 * Strongly-typed models for browser-based glyph creation,
 * including a 12px body box plus configurable descender rows.
 */

export interface GlyphLabRenderConfig
{
  fontFamily: string
  fontWeight: string
  pointSize: number
  bodyWidth: number
  bodyHeight: number
  descenderRows: number
  alphaThreshold: number
  leftPadding: number
  rightPadding: number
  topPadding: number
}

export interface GlyphLabGlyph
{
  char: string
  width: number
  height: number
  baselineY: number
  bodyHeight: number
  rows: number[]
  source: {
    fontFamily: string
    fontWeight: string
    pointSize: number
  }
}

export interface GlyphLabResult
{
  glyph: GlyphLabGlyph
  guide: {
    bodyTopY: number
    baselineY: number
    bodyBottomY: number
    totalHeight: number
  }
}

export interface CDGCompatibleGlyph
{
  char: string
  width: number
  rows: number[]
}

export interface GlyphSetExport
{
  generatedAtIso: string
  config: GlyphLabRenderConfig
  glyphs: GlyphLabGlyph[]
}

// VIM: set filetype=typescript :
// END
