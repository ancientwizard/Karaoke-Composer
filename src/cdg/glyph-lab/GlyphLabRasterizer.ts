/**
 * Glyph Lab Rasterizer
 *
 * Browser-canvas glyph rasterization focused on a fixed body box
 * (default 12x12) with optional rows below baseline for descenders.
 */

import type { GlyphLabRenderConfig, GlyphLabResult } from './types'

export const DEFAULT_GLYPH_LAB_CONFIG: GlyphLabRenderConfig = {
  fontFamily: 'Arial',
  fontWeight: '700',
  pointSize: 12,
  bodyWidth: 12,
  bodyHeight: 12,
  descenderRows: 4,
  alphaThreshold: 96,
  leftPadding: 1,
  rightPadding: 1,
  topPadding: 1
}

export class GlyphLabRasterizer
{
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  constructor()
  {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
    {
      throw new Error('Failed to create glyph lab canvas context')
    }

    this.ctx = context
  }

  public renderGlyph(char: string, config: Partial<GlyphLabRenderConfig> = {}): GlyphLabResult
  {
    const resolved = this.resolveConfig(config)
    const totalHeight = resolved.bodyHeight + resolved.descenderRows
    const canvasWidth = resolved.bodyWidth + resolved.leftPadding + resolved.rightPadding
    const canvasHeight = totalHeight + resolved.topPadding

    this.canvas.width = canvasWidth
    this.canvas.height = canvasHeight

    const bodyTopY = resolved.topPadding
    const baselineY = bodyTopY + resolved.bodyHeight
    const bodyBottomY = baselineY - 1

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    this.ctx.fillStyle = '#000000'
    this.ctx.textBaseline = 'alphabetic'
    this.ctx.font = `${resolved.fontWeight} ${resolved.pointSize}px "${resolved.fontFamily}", sans-serif`

    const printableChar = char.length > 0 ? char[0] : ' '
    const drawX = resolved.leftPadding
    this.ctx.fillText(printableChar, drawX, baselineY)

    const imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight)
    const bounds = this.findOpaqueBounds(imageData.data, canvasWidth, canvasHeight, resolved.alphaThreshold)

    if (!bounds)
    {
      return {
        glyph: {
          char: printableChar,
          width: 1,
          height: totalHeight,
          baselineY: baselineY - bodyTopY,
          bodyHeight: resolved.bodyHeight,
          rows: Array.from({ length: totalHeight }, () => 0),
          source: {
            fontFamily: resolved.fontFamily,
            fontWeight: resolved.fontWeight,
            pointSize: resolved.pointSize
          }
        },
        guide: {
          bodyTopY,
          baselineY,
          bodyBottomY,
          totalHeight
        }
      }
    }

    const cropLeft = Math.max(0, bounds.minX)
    const cropRight = Math.min(canvasWidth - 1, bounds.maxX)
    const cropTop = bodyTopY
    const cropBottom = Math.min(canvasHeight - 1, bodyTopY + totalHeight - 1)

    const cropWidth = Math.max(1, cropRight - cropLeft + 1)
    const cropHeight = Math.max(1, cropBottom - cropTop + 1)
    const rows = this.packRows(imageData.data, canvasWidth, cropLeft, cropTop, cropWidth, cropHeight, resolved.alphaThreshold)

    return {
      glyph: {
        char: printableChar,
        width: cropWidth,
        height: cropHeight,
        baselineY: baselineY - cropTop,
        bodyHeight: resolved.bodyHeight,
        rows,
        source: {
          fontFamily: resolved.fontFamily,
          fontWeight: resolved.fontWeight,
          pointSize: resolved.pointSize
        }
      },
      guide: {
        bodyTopY,
        baselineY,
        bodyBottomY,
        totalHeight
      }
    }
  }

  public drawPreview(
    canvas: HTMLCanvasElement,
    char: string,
    config: Partial<GlyphLabRenderConfig> = {}
  ): GlyphLabResult
  {
    const result = this.renderGlyph(char, config)
    const resolved = this.resolveConfig(config)

    const context = canvas.getContext('2d')
    if (!context)
    {
      throw new Error('Failed to create preview context')
    }

    const totalHeight = resolved.bodyHeight + resolved.descenderRows
    const scale = Math.max(1, Math.floor(Math.min(canvas.width / resolved.bodyWidth, canvas.height / totalHeight)))
    const drawWidth = resolved.bodyWidth * scale
    const drawHeight = totalHeight * scale
    const offsetX = Math.floor((canvas.width - drawWidth) / 2)
    const offsetY = Math.floor((canvas.height - drawHeight) / 2)

    context.clearRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = '#f8f9fa'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.strokeStyle = '#adb5bd'
    context.lineWidth = 1
    context.strokeRect(offsetX + 0.5, offsetY + 0.5, drawWidth, drawHeight)

    context.strokeStyle = '#0d6efd'
    context.strokeRect(offsetX + 0.5, offsetY + 0.5, drawWidth, resolved.bodyHeight * scale)

    const baselineY = offsetY + resolved.bodyHeight * scale
    context.strokeStyle = '#dc3545'
    context.beginPath()
    context.moveTo(offsetX, baselineY + 0.5)
    context.lineTo(offsetX + drawWidth, baselineY + 0.5)
    context.stroke()

    context.fillStyle = '#212529'
    for (let y = 0; y < result.glyph.height; y++)
    {
      const row = result.glyph.rows[y] ?? 0
      for (let x = 0; x < result.glyph.width; x++)
      {
        const bitPosition = result.glyph.width - 1 - x
        const bit = (row >> bitPosition) & 1
        if (bit === 1)
        {
          const drawPixelX = offsetX + x * scale
          const drawPixelY = offsetY + y * scale
          context.fillRect(drawPixelX, drawPixelY, scale, scale)
        }
      }
    }

    return result
  }

  private resolveConfig(config: Partial<GlyphLabRenderConfig>): GlyphLabRenderConfig
  {
    const merged = { ...DEFAULT_GLYPH_LAB_CONFIG, ...config }

    return {
      ...merged,
      pointSize: Math.max(1, merged.pointSize),
      bodyWidth: Math.max(1, merged.bodyWidth),
      bodyHeight: Math.max(1, merged.bodyHeight),
      descenderRows: Math.max(0, merged.descenderRows),
      alphaThreshold: Math.min(255, Math.max(0, merged.alphaThreshold)),
      leftPadding: Math.max(0, merged.leftPadding),
      rightPadding: Math.max(0, merged.rightPadding),
      topPadding: Math.max(0, merged.topPadding)
    }
  }

  private findOpaqueBounds(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    alphaThreshold: number
  ): { minX: number; minY: number; maxX: number; maxY: number } | null
  {
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y++)
    {
      for (let x = 0; x < width; x++)
      {
        const index = (y * width + x) * 4
        const alpha = data[index + 3]
        if (alpha > alphaThreshold)
        {
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX < minX || maxY < minY)
    {
      return null
    }

    return { minX, minY, maxX, maxY }
  }

  private packRows(
    data: Uint8ClampedArray,
    sourceWidth: number,
    cropLeft: number,
    cropTop: number,
    cropWidth: number,
    cropHeight: number,
    alphaThreshold: number
  ): number[]
  {
    const rows: number[] = []

    for (let y = 0; y < cropHeight; y++)
    {
      let row = 0
      for (let x = 0; x < cropWidth && x < 31; x++)
      {
        const sourceIndex = ((cropTop + y) * sourceWidth + (cropLeft + x)) * 4
        const alpha = data[sourceIndex + 3]
        if (alpha > alphaThreshold)
        {
          row |= 1 << (cropWidth - 1 - x)
        }
      }
      rows.push(row)
    }

    return rows
  }
}

// VIM: set filetype=typescript :
// END
