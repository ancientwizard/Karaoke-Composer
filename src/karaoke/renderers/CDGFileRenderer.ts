/**
 * CDG File Renderer
 *
 * Converts PresentationCommands to binary CDG format
 * Generates .cdg files that can be played on real karaoke machines
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  FileRenderer,
  type RendererConfig,
  type RendererCapabilities
} from './BaseRenderer'
import type {
  PresentationScript,
  AnyPresentationCommand
} from '../presentation/PresentationCommand'
import { LogicalColor } from '../presentation/PresentationCommand'
import {
  CDGPacket,
  CDGPalette,
  CDG_SCREEN
} from './cdg/CDGPacket'
import { CDGTextRenderer, CDGFont } from './cdg/CDGFont'

/**
 * CDG renderer configuration
 */
export interface CDGRendererConfig extends RendererConfig {
  backgroundColor?: number  // Background color index (default: 0 = black)
  activeColor?: number      // Active text color index (default: 1 = yellow)
  transitionColor?: number  // Transition text color index (default: 2 = light gray)
}

/**
 * Text element being tracked for rendering
 */
interface TrackedText {
  textId: string
  text: string
  row: number      // CDG tile row (0-17)
  col: number      // CDG tile column (0-49)
  color: LogicalColor
  tiles: Array<{
    row: number
    col: number
    tileData: number[]
  }>
}

/**
 * CDG File Renderer
 *
 * Renders karaoke presentation to binary CDG format
 */
export class CDGFileRenderer extends FileRenderer {
  private palette: CDGPalette
  private textRenderer: CDGTextRenderer
  private packets: CDGPacket[]
  private displayedTexts: Map<string, TrackedText>
  private cdgConfig: {
    backgroundColor: number
    activeColor: number
    transitionColor: number
  }

  // Color mapping
  private colorMapping: Map<LogicalColor, number>

  constructor(outputPath: string, config: CDGRendererConfig = {}) {
    super(outputPath, config)

    this.cdgConfig = {
      backgroundColor: config.backgroundColor ?? 0,
      activeColor: config.activeColor ?? 1,
      transitionColor: config.transitionColor ?? 2
    }

    this.palette = new CDGPalette()
    this.textRenderer = new CDGTextRenderer(new CDGFont())
    this.packets = []
    this.displayedTexts = new Map()

    // Map logical colors to palette indices
    this.colorMapping = new Map([
      [LogicalColor.Background, this.cdgConfig.backgroundColor],
      [LogicalColor.ActiveText, this.cdgConfig.activeColor],
      [LogicalColor.TransitionText, this.cdgConfig.transitionColor]
    ])
  }

  /**
   * Get renderer capabilities
   */
  getCapabilities(): RendererCapabilities {
    return {
      name: 'CDG',
      supportsColor: true,
      supportsTransitions: false,  // Simple transitions only
      supportsVariablePositions: true,
      maxWidth: CDG_SCREEN.WIDTH,
      maxHeight: CDG_SCREEN.HEIGHT,
      colorDepth: 16  // 16-color palette
    }
  }

  /**
   * Map logical color to CDG palette index
   */
  protected mapColor(color: LogicalColor): number {
    return this.colorMapping.get(color) ?? this.cdgConfig.transitionColor
  }

  /**
   * Initialize renderer
   */
  async initialize(): Promise<void> {
    this.packets = []
    this.displayedTexts.clear()

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
   * Render complete presentation script to CDG file
   */
  async render(script: PresentationScript): Promise<Buffer> {
    console.log(`\n📀 CDG Renderer`)
    console.log(`📊 ${script.commands.length} commands to render`)
    console.log(`⏱️  Duration: ${(script.durationMs / 1000).toFixed(2)}s`)

    // Convert commands to packets
    for (const command of script.commands) {
      await this.renderCommand(command)
    }

    // Pad to final duration
    this.padToTime(script.durationMs)

    // Return as buffer
    const buffers = this.packets.map(packet => packet.toBuffer())
    const finalBuffer = Buffer.concat(buffers)

    console.log(`📦 ${this.packets.length} packets (${(this.packets.length / CDG_SCREEN.PACKETS_PER_SECOND).toFixed(2)}s)`)

    return finalBuffer
  }

  /**
   * Render a single presentation command
   */
  async renderCommand(command: AnyPresentationCommand): Promise<void> {
    // Pad packets to command timestamp
    this.padToTime(command.timestamp)

    switch (command.type) {
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
        console.warn(`Unknown command type: ${(command as any).type}`)
    }
  }

  /**
   * Finalize rendering
   */
  async finalize(): Promise<void> {
    // Nothing to finalize for CDG
  }

  /**
   * Write CDG buffer to file
   */
  protected async writeOutput(output: Buffer): Promise<void> {
    const dir = path.dirname(this.outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(this.outputPath, output)
    console.log(`✅ CDG file written: ${this.outputPath}`)
  }

  /**
   * Handle clear_screen command
   */
  private handleClearScreen(command: any): void {
    const colorIndex = this.colorMapping.get(command.color) ?? this.cdgConfig.backgroundColor
    const clearPacket = CDGPacket.memoryPreset(colorIndex)
    this.packets.push(clearPacket)
    this.displayedTexts.clear()
  }

  /**
   * Handle show_text command
   */
  private handleShowText(command: any): void {
    const {
      textId, text, position, color
    } = command

    // Convert position to CDG tile coordinates
    // Position is in normalized coordinates (0-1000)
    // CDG screen is 18 rows x 50 columns
    const row = Math.floor((position.y / 1000) * CDG_SCREEN.ROWS)
    const col = Math.floor((position.x / 1000) * CDG_SCREEN.COLS)

    // Render text to tiles
    const tiles = this.textRenderer.renderCentered(text, row)

    // Get color index
    const colorIndex = this.colorMapping.get(color) ?? this.cdgConfig.transitionColor

    // Generate tile packets
    for (const tile of tiles) {
      const packet = CDGPacket.tileBlock(
        this.cdgConfig.backgroundColor,  // Background color
        colorIndex,                       // Foreground color
        tile.row,
        tile.col,
        tile.tileData,
        false  // Normal mode (not XOR)
      )
      this.packets.push(packet)
    }

    // Track text for color changes
    this.displayedTexts.set(textId, {
      textId,
      text,
      row,
      col,
      color,
      tiles
    })
  }

  /**
   * Handle show_metadata command
   */
  private handleShowMetadata(command: any): void {
    const {
      title, artist, position
    } = command

    // Render metadata as text
    // Create a combined text string
    const metadataText = artist ? `${title} by ${artist}` : title

    // Treat as show_text
    this.handleShowText({
      type: 'show_text',
      timestamp: command.timestamp,
      textId: 'metadata-0',
      text: metadataText,
      position,
      color: LogicalColor.ActiveText,
      align: 'center'
    })
  }

  /**
   * Handle change_color command
   */
  private handleChangeColor(command: any): void {
    const { textId, color } = command

    const trackedText = this.displayedTexts.get(textId)
    if (!trackedText) {
      console.warn(`Text not found for color change: ${textId}`)
      return
    }

    // Update color in tracked text
    trackedText.color = color

    // For now, re-render the entire text with new color
    // A more sophisticated approach would render only changed characters
    const colorIndex = this.colorMapping.get(color) ?? this.cdgConfig.activeColor

    for (const tile of trackedText.tiles) {
      const packet = CDGPacket.tileBlock(
        this.cdgConfig.backgroundColor,
        colorIndex,
        tile.row,
        tile.col,
        tile.tileData,
        false
      )
      this.packets.push(packet)
    }
  }

  /**
   * Handle remove_text command
   */
  private handleRemoveText(command: any): void {
    const { textId } = command

    const trackedText = this.displayedTexts.get(textId)
    if (!trackedText) {
      return
    }

    // Clear tiles by drawing empty tiles (all zeros)
    const emptyTile = new Array(12).fill(0)

    for (const tile of trackedText.tiles) {
      const packet = CDGPacket.tileBlock(
        this.config.backgroundColor,
        this.config.backgroundColor,
        tile.row,
        tile.col,
        emptyTile,
        false
      )
      this.packets.push(packet)
    }

    this.displayedTexts.delete(textId)
  }

  /**
   * Pad packets to specific timestamp
   */
  private padToTime(timestampMs: number): void {
    const targetPackets = Math.floor(
      (timestampMs / 1000) * CDG_SCREEN.PACKETS_PER_SECOND
    )

    while (this.packets.length < targetPackets) {
      this.packets.push(CDGPacket.empty())
    }
  }

  /**
   * Write CDG packets to file
   */
  private async writeToFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const buffers = this.packets.map(packet => packet.toBuffer())
    const finalBuffer = Buffer.concat(buffers)

    fs.writeFileSync(filePath, finalBuffer)
  }

  /**
   * Get generated packets (for testing)
   */
  getPackets(): CDGPacket[] {
    return this.packets
  }
}
