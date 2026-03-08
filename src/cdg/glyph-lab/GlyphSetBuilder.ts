/**
 * Glyph Set Builder
 *
 * Stores and exports generated glyphs from Glyph Lab.
 * Includes helpers to convert glyphs into CDG-compatible 6x12 rows.
 */

import type {
  CDGCompatibleGlyph,
  GlyphLabGlyph,
  GlyphLabRenderConfig,
  GlyphSetExport
} from './types'
import { DEFAULT_GLYPH_LAB_CONFIG } from './GlyphLabRasterizer'

export class GlyphSetBuilder
{
  private readonly glyphs = new Map<string, GlyphLabGlyph>()

  public upsertGlyph(glyph: GlyphLabGlyph): void
  {
    this.glyphs.set(glyph.char, glyph)
  }

  public removeGlyph(char: string): void
  {
    this.glyphs.delete(char)
  }

  public getGlyph(char: string): GlyphLabGlyph | undefined
  {
    return this.glyphs.get(char)
  }

  public getAllGlyphs(): GlyphLabGlyph[]
  {
    return Array.from(this.glyphs.values()).sort((a, b) => a.char.localeCompare(b.char))
  }

  public clear(): void
  {
    this.glyphs.clear()
  }

  public exportJson(config: Partial<GlyphLabRenderConfig> = {}): GlyphSetExport
  {
    const resolvedConfig: GlyphLabRenderConfig = {
      ...DEFAULT_GLYPH_LAB_CONFIG,
      ...config
    }

    return {
      generatedAtIso: new Date().toISOString(),
      config: resolvedConfig,
      glyphs: this.getAllGlyphs()
    }
  }

  public exportAsCDGCompatibleGlyphs(targetWidth = 6, targetHeight = 12): CDGCompatibleGlyph[]
  {
    return this.getAllGlyphs().map((glyph) =>
    {
      const rows = this.scaleRows(glyph.rows, glyph.width, glyph.height, targetWidth, targetHeight)
      const extents = this.findHorizontalExtents(rows, targetWidth)

      if (!extents)
      {
        return {
          char: glyph.char,
          width: 1,
          rows
        }
      }

      const width = Math.max(1, extents.maxSetX - extents.minSetX + 1)
      const rightShift = Math.max(0, (targetWidth - 1) - extents.maxSetX)
      const alignedRows = rows.map((row) => (row >> rightShift) & ((1 << targetWidth) - 1))

      return {
        char: glyph.char,
        width,
        rows: alignedRows
      }
    })
  }

  public exportRegisterGlyphCalls(targetWidth = 6, targetHeight = 12): string
  {
    const glyphs = this.exportAsCDGCompatibleGlyphs(targetWidth, targetHeight)
    const lines: string[] = []

    for (const glyph of glyphs)
    {
      lines.push(`this.registerGlyph('${this.escapeChar(glyph.char)}', ${glyph.width}, [`)
      for (const row of glyph.rows)
      {
        lines.push(`  0b${row.toString(2).padStart(targetWidth, '0')},`)
      }
      lines.push('])')
      lines.push('')
    }

    return lines.join('\n').trim()
  }

  private scaleRows(
    rows: number[],
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): number[]
  {
    const scaledRows: number[] = []

    for (let y = 0; y < targetHeight; y++)
    {
      const sourceY = Math.min(sourceHeight - 1, Math.floor((y / targetHeight) * sourceHeight))
      let targetRow = 0

      for (let x = 0; x < targetWidth; x++)
      {
        const sourceX = Math.min(sourceWidth - 1, Math.floor((x / targetWidth) * sourceWidth))
        const sourceRow = rows[sourceY] ?? 0
        const sourceBit = (sourceRow >> (sourceWidth - 1 - sourceX)) & 1
        if (sourceBit === 1)
        {
          targetRow |= 1 << (targetWidth - 1 - x)
        }
      }

      scaledRows.push(targetRow)
    }

    return scaledRows
  }

  private findHorizontalExtents(
    rows: number[],
    maxWidth: number
  ): { minSetX: number; maxSetX: number } | null
  {
    let minSetX = maxWidth
    let maxSetX = -1

    for (const row of rows)
    {
      for (let x = 0; x < maxWidth; x++)
      {
        const bit = (row >> (maxWidth - 1 - x)) & 1
        if (bit === 1)
        {
          minSetX = Math.min(minSetX, x)
          maxSetX = Math.max(maxSetX, x)
        }
      }
    }

    if (maxSetX < minSetX)
    {
      return null
    }

    return { minSetX, maxSetX }
  }

  private escapeChar(char: string): string
  {
    return char.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  }
}

// VIM: set filetype=typescript :
// END
