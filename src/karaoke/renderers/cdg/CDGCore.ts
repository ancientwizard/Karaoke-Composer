import { CDGPacket, CDGPalette, CDG_SCREEN } from './CDGPacket'
import { CDGTextRenderer, CDGFont } from './CDGFont'
import { renderGlyphToVRAM } from '@/cdg/glyph-renderer'
import { VRAM } from '@/cdg/encoder'
import { DynamicGlyphRasterizer } from '@/cdg/DynamicGlyphRasterizer'
import type { AnyPresentationCommand, PresentationScript, LogicalColor } from '../../presentation/Command'

export interface CDGCoreConfig {
  backgroundColor?: number
  activeColor?: number
  transitionColor?: number
  fontFamily?: string
  fontSize?: number
}

interface TrackedText {
  textId: string
  text: string
  pixelY: number  // Actual pixel Y position (not tile-based)
  pixelX: number  // Actual pixel X position (not tile-based)
  color: LogicalColor
  tiles: Array<{ pixelX: number; pixelY: number; width: number; rows: number[] }>
  // Map character index to glyph data for color changes
  charToGlyph: Map<number, { pixelX: number; pixelY: number; width: number; height?: number; rows: number[]; yOffset?: number }>
}

/**
 * CDGCore: platform-agnostic packet generation for CDG
 * Both file and browser renderers can use this to build the packet list.
 */
export class CDGCore
{
  private palette: CDGPalette
  private textRenderer: CDGTextRenderer
  private packets: CDGPacket[]
  private displayedTexts: Map<string, TrackedText>
  private vram: VRAM  // VRAM buffer for rendering glyphs
  private cdgConfig: { backgroundColor: number; activeColor: number; transitionColor: number; fontFamily: string; fontSize: number }
  private colorMapping: Map<LogicalColor, number>
  private dynamicRasterizer: DynamicGlyphRasterizer
  // running count of packets emitted (includes emitted and padding)
  private packetCount: number

  constructor(config: CDGCoreConfig = {})
  {
    this.cdgConfig = {
      backgroundColor: config.backgroundColor ?? 0,
      activeColor: config.activeColor ?? 1,
      transitionColor: config.transitionColor ?? 2,
      fontFamily: config.fontFamily ?? 'Arial',
      fontSize: config.fontSize ?? 16
    }

    this.palette = new CDGPalette()
    this.textRenderer = new CDGTextRenderer(new CDGFont())
    this.packets = []
    this.displayedTexts = new Map()
    this.packetCount = 0
    this.vram = new VRAM()
    this.vram.clear(this.cdgConfig.backgroundColor)
    this.dynamicRasterizer = new DynamicGlyphRasterizer()

    this.colorMapping = new Map([
      ['background' as any, this.cdgConfig.backgroundColor],
      ['active' as any, this.cdgConfig.activeColor],
      ['transition' as any, this.cdgConfig.transitionColor]
    ])
  }

  initialize(): void
  {
    this.packets = []
    this.displayedTexts.clear()
    this.vram.clear(this.cdgConfig.backgroundColor)

    // Add palette load packets
    const palettePackets = this.palette.generateLoadPackets()
    this.packets.push(...palettePackets)

    // Clear screen
    const clearPacket = CDGPacket.memoryPreset(this.cdgConfig.backgroundColor)
    this.packets.push(clearPacket)

    // Set border color
    const borderPacket = CDGPacket.borderPreset(this.cdgConfig.backgroundColor)
    this.packets.push(borderPacket)
  }

  /**
   * Render a complete presentation script into packets
   */
  render(script: PresentationScript): CDGPacket[]
  {
    for (const command of script.commands)
    {
      this.renderCommand(command)
    }

    // Extract final tile packets from VRAM (for any last-minute changes)
    // Most tiles will have been extracted already during command processing
    // This just ensures we capture the final state
    // (We don't extract all tiles here - that's done per-command)

    this.padToTime(script.durationMs)

    return this.packets
  }

  /**
   * Incrementally render a PresentationScript in small async chunks to avoid
   * blocking the browser event loop. Calls onProgress with the fraction [0..1].
   */
  async renderIncremental(
    script: PresentationScript,
    onProgress?: (
      progress: {
        commandsProcessed: number
        totalCommands: number
        packets: number
        // optional: total packet count for the whole script (useful so UI can compute percent)
        totalPackets?: number
      }
    ) => void,
    options: {
      commandsPerChunk?: number
      packetsPerChunk?: number
      onChunk?: (chunk: Uint8Array) => void | Promise<void>
      // optional debug hook for instrumentation
      onDebug?: (msg: string) => void
    } = {}
  ): Promise<void>
  {
    const commandsPerChunk = options.commandsPerChunk ?? 10
    const packetsPerChunk = options.packetsPerChunk ?? 500
    const onChunk = options.onChunk
    const onDebug = options.onDebug

    const totalCommands = script.commands.length
    // number of packets determined by the duration (does NOT include initial palette/clear/border packets)
    const durationPackets = Math.floor((script.durationMs / 1000) * CDG_SCREEN.PACKETS_PER_SECOND)
    // we'll compute the final totalPackets (including any initial packets) after we know initial packet count
    let totalPackets = durationPackets
    let commandsProcessed = 0
    // guardLimit will be computed after totalPackets is finalized (so it accounts for initial packets)

    // temporary buffer of CDGPacket objects to be emitted as binary chunks
    let pendingPackets: CDGPacket[] = []

    const emitPending = async () =>
    {
      if (pendingPackets.length === 0) return
      const buffers = pendingPackets.map(p => p.toBuffer() as unknown as Uint8Array)
      const totalLength = buffers.reduce((s, b) => s + b.length, 0)
      const out = new Uint8Array(totalLength)
      let off = 0
      for (const b of buffers) {
        out.set(b, off)
        off += b.length
      }
      pendingPackets = []
      if (onChunk) await onChunk(out)
    }

    // if initialize() populated packets (palette/clear/border), emit them first
    if (this.packets.length > 0)
    {
      const initial = this.packets.splice(0, this.packets.length)
      pendingPackets.push(...initial)
      // account for initial packets in packetCount
      this.packetCount += initial.length
      // include initial packets in the totalPackets so progress percentages are computed against
      // the full expected packet count (duration-based packets + initial setup packets)
      totalPackets += initial.length
      await emitPending()
    }

    // compute guard limit now that totalPackets includes initial packets
    const guardLimit = Math.ceil(totalPackets * 1.1)

    if (onDebug) onDebug(`CDGCore: renderIncremental start commands=${totalCommands} totalPackets=${totalPackets} guard=${guardLimit}`)

    for (let i = 0; i < totalCommands; i++)
    {
      const cmd = script.commands[i]

      // Ensure we have produced packets up to the command timestamp
      const targetForCmd = Math.floor((cmd.timestamp / 1000) * CDG_SCREEN.PACKETS_PER_SECOND)

      if (this.packetCount < targetForCmd)
      {
        // emit empty packets to reach targetForCmd
        let need = targetForCmd - this.packetCount
        while (need > 0)
        {
          const chunk = Math.min(need, packetsPerChunk)
          const emptyPacket = CDGPacket.empty().toBuffer() as unknown as Uint8Array
          const out = new Uint8Array(emptyPacket.length * chunk)
          for (let e = 0; e < chunk; e++) {
            out.set(emptyPacket, e * emptyPacket.length)
          }
          // If this would exceed the guard limit, trim the chunk
          const allowed = Math.max(0, Math.min(chunk, guardLimit - this.packetCount))

          if (allowed <= 0)
          {
            const msg = `CDGCore: reached guard limit (${guardLimit}) — skipping further padding.`
            if (options.onDebug) options.onDebug(msg)
            else console.warn(msg)
            // stop padding entirely
            need = 0
            break
          }

          if (allowed !== chunk)
          {
            // rebuild out with allowed size
            const out2 = new Uint8Array(emptyPacket.length * allowed)
            for (let e = 0; e < allowed; e++)
            {
              out2.set(emptyPacket, e * emptyPacket.length)
            }
            this.packetCount += allowed
            need -= allowed
            if (onChunk) await onChunk(out2)
          }
          else
          {
            this.packetCount += chunk
            need -= chunk
            if (onChunk) await onChunk(out)
          }

          onProgress?.({
            commandsProcessed,
            totalCommands,
            packets: this.packetCount,
            totalPackets
          })

          // yield to UI
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      // Call the specific handler (avoid renderCommand which pads)
      // Record packet count before handlers so we can detect how many packets they add
      const before = this.packets.length
      switch (cmd.type)
      {
        case 'clear_screen':
          this.handleClearScreen(cmd)
          break
        case 'show_text':
          this.handleShowText(cmd)
          break
        case 'show_metadata':
          this.handleShowMetadata(cmd)
          break
        case 'change_color':
          this.handleChangeColor(cmd)
          break
        case 'remove_text':
          this.handleRemoveText(cmd)
          break
        default:
          // unknown
          break
      }

      // move new packets into pendingPackets and account for them
      const after = this.packets.length
      if (after > before)
      {
        const moved = this.packets.splice(before, after - before)
        // If adding moved packets would exceed guard, trim and notify
        const allowed = Math.max(0, Math.min(moved.length, guardLimit - this.packetCount))
        if (allowed < moved.length)
        {
          const msg = `CDGCore: trimming ${moved.length - allowed} command-generated packets to respect guard limit (${guardLimit}).`
          if (options.onDebug) options.onDebug(msg)
          else console.warn(msg)
        }

        if (allowed > 0)
        {
          const toPush = moved.splice(0, allowed)
          pendingPackets.push(...toPush)
          this.packetCount += toPush.length
          if (onDebug) onDebug(`CDGCore: moved ${toPush.length} command packets into pending`)
        }
      }

      commandsProcessed++

      if (commandsProcessed % commandsPerChunk === 0)
      {
        await emitPending()
        onProgress?.({
          commandsProcessed,
          totalCommands,
          packets: this.packetCount,
          totalPackets
        })
        if (onDebug) onDebug(`CDGCore: progress commands=${commandsProcessed} packets=${this.packetCount}`)

        // yield to UI
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // emit any remaining command packets
    await emitPending()

    // Now pad to final duration, emitting empty-packet chunks directly via onChunk
    const targetPackets = durationPackets
    const emptyPacket = CDGPacket.empty().toBuffer() as unknown as Uint8Array

    let remaining = targetPackets - this.packetCount
    while (remaining > 0)
    {
      const chunkCount = Math.min(remaining, packetsPerChunk)
      // clamp to guard
      const allowed = Math.max(0, Math.min(chunkCount, guardLimit - this.packetCount))

      if (allowed <= 0)
      {
        const msg = `CDGCore: reached guard limit (${guardLimit}) during final padding — stopping.`
        if (options.onDebug) options.onDebug(msg)
        else console.warn(msg)
        break
      }
      // build a chunk that repeats emptyPacket allowed times
      const out = new Uint8Array(emptyPacket.length * allowed)
      for (let i = 0; i < allowed; i++)
      {
        out.set(emptyPacket, i * emptyPacket.length)
      }
      // update internal packet count (we do not store empty packet objects)
      this.packetCount += allowed
      remaining -= allowed

      if (onChunk) await onChunk(out)

      onProgress?.({
        commandsProcessed: totalCommands,
        totalCommands,
        packets: this.packetCount,
        totalPackets
      })
      // suppressed verbose padding logs to reduce noise; guard messages remain
      // yield
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    onProgress?.({
      commandsProcessed: totalCommands,
      totalCommands,
      packets: this.packetCount,
      totalPackets
    })
    if (onDebug) onDebug(`CDGCore: renderIncremental complete (packets=${this.packetCount})`)
  }

  renderCommand(command: AnyPresentationCommand): void
  {
    this.padToTime(command.timestamp)

    switch (command.type)
    {
      case 'clear_screen':
        this.handleClearScreen(command)
        break
      case 'show_text':
        this.handleShowText(command)
        break
      case 'show_metadata':
        this.handleShowMetadata(command)
        break
      case 'change_color':
        this.handleChangeColor(command)
        break
      case 'remove_text':
        this.handleRemoveText(command)
        break
      default:
        // unknown
        break
    }
  }

  mapColor(color: LogicalColor): number
  {
    return this.colorMapping.get(color as any) ?? this.cdgConfig.transitionColor
  }

  getPackets(): CDGPacket[]
  {
    return this.packets
  }

  private handleClearScreen(command: any): void
  {
    const colorIndex = this.colorMapping.get(command.color) ?? this.cdgConfig.backgroundColor
    const clearPacket = CDGPacket.memoryPreset(colorIndex)
    this.packets.push(clearPacket)
    this.displayedTexts.clear()
  }

  private handleShowText(command: any): void
  {
    const {
        textId, text, position, color 
      } = command

    // Convert from abstract 0-1000 coordinate space to pixel space
    // Match DeveloperView's approach for consistency
    const pixelY = Math.round((position.y / 1000) * CDG_SCREEN.HEIGHT)

    const colorIndex = this.colorMapping.get(color) ?? this.cdgConfig.transitionColor

    // Use DynamicGlyphRasterizer to get glyphs with actual font metrics
    const charWidths: number[] = []
    const glyphData: any[] = []

    for (const char of text)
    {
      const glyph = this.dynamicRasterizer.getGlyph(char, this.cdgConfig.fontFamily, this.cdgConfig.fontSize)
      glyphData.push(glyph)
      charWidths.push(glyph.width)
    }

    // Calculate total width with spacing
    const charSpacing = Math.max(1, Math.ceil(this.cdgConfig.fontSize * 0.15))  // ~15% of font size
    const widthInPixels = charWidths.reduce((sum, w) => sum + w, 0) + 
                         (charWidths.length - 1) * charSpacing
    const totalPixelWidth = CDG_SCREEN.WIDTH
    const startPixelX = Math.floor((totalPixelWidth - widthInPixels) / 2)

    // Track character-to-glyph mapping
    const charToGlyph = new Map<number, { pixelX: number; pixelY: number; width: number; rows: number[] }>()

    // Track affected tiles
    const affectedTiles = new Set<number>()

    // Render each glyph to VRAM and track its character index
    let cursorX = startPixelX
    for (let charIdx = 0; charIdx < text.length; charIdx++)
    {
      const glyph = glyphData[charIdx]
      const screenX = cursorX
      const screenY = pixelY

      renderGlyphToVRAM(this.vram, screenX, screenY, glyph, colorIndex)

      // Track which tiles are affected
      // Glyphs can span multiple tile rows (tiles are 12px, glyphs are ~16px)
      const startTileCol = Math.floor(screenX / CDG_SCREEN.TILE_WIDTH)
      const endTileCol = Math.floor((screenX + glyph.width) / CDG_SCREEN.TILE_WIDTH)
      const glyphHeight = glyph.height || glyph.rows.length
      const startTileRow = Math.floor(screenY / CDG_SCREEN.TILE_HEIGHT)
      const endTileRow = Math.floor((screenY + glyphHeight - 1) / CDG_SCREEN.TILE_HEIGHT)

      for (let tr = startTileRow; tr <= endTileRow; tr++)
      {
        for (let tc = startTileCol; tc <= endTileCol; tc++)
          affectedTiles.add(tr * CDG_SCREEN.COLS + tc)
      }

      // Store glyph data for this character
      charToGlyph.set(charIdx, {
 pixelX: screenX, pixelY: screenY, ...glyph 
})

      cursorX += glyph.width + charSpacing
    }

    // Extract tile packets for affected tiles
    for (const tileIndex of affectedTiles)
    {
      const tileRow = Math.floor(tileIndex / CDG_SCREEN.COLS)
      const tileCol = tileIndex % CDG_SCREEN.COLS

      const pixelData = this.extractTilePixels(tileRow, tileCol)
      const packet = CDGPacket.tileBlock(
        this.cdgConfig.backgroundColor,
        colorIndex,
        tileRow,
        tileCol,
        pixelData,
        false
      )
      this.packets.push(packet)
    }

    this.displayedTexts.set(textId, {
      textId,
      text,
      pixelY,
      pixelX: startPixelX,  // Store the calculated start position for color changes
      color,
      tiles: Array.from(affectedTiles).map(tileIndex => ({
        pixelX: (tileIndex % CDG_SCREEN.COLS) * CDG_SCREEN.TILE_WIDTH,
        pixelY: Math.floor(tileIndex / CDG_SCREEN.COLS) * CDG_SCREEN.TILE_HEIGHT,
        width: CDG_SCREEN.TILE_WIDTH,
        rows: []
      })),
      charToGlyph
    })
  }

  private handleShowMetadata(command: any): void
  {
    const {
        title, artist, position 
      } = command
    const metadataText = artist ? `${title} by ${artist}` : title

    this.handleShowText({
      type: 'show_text',
      timestamp: command.timestamp,
      textId: 'metadata-0',
      text: metadataText,
      position,
      color: 'active' as any,
      align: 'center'
    })
  }

  private handleChangeColor(command: any): void
  {
    const {
        textId, startChar, endChar, color
      } = command

    const trackedText = this.displayedTexts.get(textId)
    if (!trackedText) return

    trackedText.color = color

    const colorIndex = this.colorMapping.get(color as any) ?? this.cdgConfig.activeColor

    // Track affected tiles
    const affectedTiles = new Set<number>()

    // Re-render affected glyphs with new color
    for (let charIdx = startChar; charIdx < endChar; charIdx++)
    {
      const glyph = trackedText.charToGlyph.get(charIdx)
      if (!glyph) continue

      // Use stored pixel positions (already calculated with centering/spacing)
      const screenX = glyph.pixelX
      const screenY = glyph.pixelY

      renderGlyphToVRAM(this.vram, screenX, screenY, glyph, colorIndex)

      // Track affected tiles (glyphs can span multiple tile rows)
      const startTileCol = Math.floor(screenX / CDG_SCREEN.TILE_WIDTH)
      const endTileCol = Math.floor((screenX + glyph.width) / CDG_SCREEN.TILE_WIDTH)
      const glyphHeight = glyph.height || glyph.rows.length
      const startTileRow = Math.floor(screenY / CDG_SCREEN.TILE_HEIGHT)
      const endTileRow = Math.floor((screenY + glyphHeight - 1) / CDG_SCREEN.TILE_HEIGHT)

      for (let tr = startTileRow; tr <= endTileRow; tr++)
        for (let tc = startTileCol; tc <= endTileCol; tc++)
          affectedTiles.add(tr * CDG_SCREEN.COLS + tc)
    }

    // Extract tile packets for affected tiles
    for (const tileIndex of affectedTiles)
    {
      const tileRow = Math.floor(tileIndex / CDG_SCREEN.COLS)
      const tileCol = tileIndex % CDG_SCREEN.COLS

      const pixelData = this.extractTilePixels(tileRow, tileCol)
      const packet = CDGPacket.tileBlock(
        this.cdgConfig.backgroundColor,
        colorIndex,
        tileRow,
        tileCol,
        pixelData,
        false
      )
      this.packets.push(packet)
    }
  }

  private handleRemoveText(command: any): void
  {
    const { textId } = command

    const trackedText = this.displayedTexts.get(textId)
    if (!trackedText) return

    const emptyTile = new Array(12).fill(0)
    for (const glyph of trackedText.tiles)
    {
      const glyphTileRow = Math.floor(glyph.pixelY / CDG_SCREEN.TILE_HEIGHT)
      const glyphTileCol = Math.floor(glyph.pixelX / CDG_SCREEN.TILE_WIDTH)
      const packet = CDGPacket.tileBlock(
        this.cdgConfig.backgroundColor,
        this.cdgConfig.backgroundColor,
        glyphTileRow,
        glyphTileCol,
        emptyTile,
        false
      )
      this.packets.push(packet)
    }

    this.displayedTexts.delete(textId)
  }

  private padToTime(timestampMs: number): void
  {
    const targetPackets = Math.floor((timestampMs / 1000) * CDG_SCREEN.PACKETS_PER_SECOND)
    while (this.packets.length < targetPackets)
      this.packets.push(CDGPacket.empty())
  }

  /**
   * Extract tile packets from VRAM
   * Converts pixel data in VRAM to CDG tile packets
   * Each 6x12 tile is one packet
   */
  private extractTilesFromVRAM(): void
  {
    // Iterate through all tiles (50 columns x 18 rows)
    for (let tileRow = 0; tileRow < CDG_SCREEN.ROWS; tileRow++)
      for (let tileCol = 0; tileCol < CDG_SCREEN.COLS; tileCol++)
      {
        // Extract 6x12 pixels for this tile from VRAM
        const pixelData = this.extractTilePixels(tileRow, tileCol)

        // Create packet for this tile
        const packet = CDGPacket.tileBlock(
          this.cdgConfig.backgroundColor,
          1,  // Color doesn't matter since we're encoding the actual pixel pattern
          tileRow,
          tileCol,
          pixelData,
          false
        )

        this.packets.push(packet)
      }
  }

  /**
   * Extract 6x12 pixels for a specific tile from VRAM
   * Returns array of 12 bytes (one per row, 6 pixels per row = 6 bits)
   */
  private extractTilePixels(tileRow: number, tileCol: number): number[]
  {
    const pixelData: number[] = []
    const startPixelX = tileCol * CDG_SCREEN.TILE_WIDTH
    const startPixelY = tileRow * CDG_SCREEN.TILE_HEIGHT

    // Extract 12 rows of pixel data
    for (let y = 0; y < CDG_SCREEN.TILE_HEIGHT; y++)
    {
      let rowByte = 0

      // Extract 6 pixels in this row (each pixel is 1 bit)
      for (let x = 0; x < CDG_SCREEN.TILE_WIDTH; x++)
      {
        const pixelX = startPixelX + x
        const pixelY = startPixelY + y

        // Get pixel color index from VRAM
        const colorIndex = this.vram.getPixel(pixelX, pixelY)

        // Encode as bit: 0 = background, 1 = foreground (non-zero = foreground)
        if (colorIndex !== this.cdgConfig.backgroundColor)
          rowByte |= (1 << (5 - x))  // Set bit for this pixel
      }

      pixelData.push(rowByte)
    }

    return pixelData
  }
}

// VIM: set filetype=typescript :
// END