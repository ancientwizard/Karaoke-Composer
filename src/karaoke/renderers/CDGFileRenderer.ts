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
import { CDG_SCREEN } from './cdg/CDGPacket'
import type { CDGPacket } from './cdg/CDGPacket'
import { CDGCore } from './cdg/CDGCore'

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
// TrackedText handled by CDGCore

/**
 * CDG File Renderer
 *
 * Renders karaoke presentation to binary CDG format
 */
export class CDGFileRenderer extends FileRenderer {
  private core: CDGCore

  constructor(outputPath: string, config: CDGRendererConfig = {}) {
    super(outputPath, config)

    this.core = new CDGCore({
      backgroundColor: config.backgroundColor,
      activeColor: config.activeColor,
      transitionColor: config.transitionColor
    })
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
    return this.core.mapColor(color)
  }

  /**
   * Initialize renderer
   */
  async initialize(): Promise<void> {
    this.core.initialize()
  }

  /**
   * Render complete presentation script to CDG file
   */
  async render(script: PresentationScript): Promise<Buffer> {
    console.log(`\n📀 CDG Renderer`)
    console.log(`📊 ${script.commands.length} commands to render`)
    console.log(`⏱️  Duration: ${(script.durationMs / 1000).toFixed(2)}s`)
    // Delegate to core to build packets
    const packets = this.core.render(script)

    const buffers = packets.map(packet => Buffer.from(packet.toBuffer()))
    const finalBuffer = Buffer.concat(buffers)

    console.log(`📦 ${packets.length} packets (${(packets.length / CDG_SCREEN.PACKETS_PER_SECOND).toFixed(2)}s)`)

    return finalBuffer
  }

  /**
   * Render a single presentation command
   */
  async renderCommand(command: AnyPresentationCommand): Promise<void> {
    // Delegate to core
    this.core.renderCommand(command)
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
  getPackets(): CDGPacket[] {
    return this.core.getPackets()
  }
}
