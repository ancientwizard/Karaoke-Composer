import { BaseRenderer, type RendererConfig, type RendererCapabilities } from './BaseRenderer'
import type { PresentationScript, AnyPresentationCommand } from '../presentation/PresentationCommand'
import { LogicalColor } from '../presentation/PresentationCommand'
import { CDG_SCREEN } from './cdg/CDGPacket'
import { CDGCore } from './cdg/CDGCore'

/**
 * Browser-friendly CDG renderer
 * Produces a Blob containing CDG binary data suitable for download
 */
export interface CDGBrowserRendererConfig extends RendererConfig {
  backgroundColor?: number
  activeColor?: number
  transitionColor?: number
}

// TrackedText handled inside CDGCore

export class CDGBrowserRenderer extends BaseRenderer {
  private core: CDGCore

  constructor(config: CDGBrowserRendererConfig = {}) {
    super(config)
    this.core = new CDGCore({
      backgroundColor: config.backgroundColor,
      activeColor: config.activeColor,
      transitionColor: config.transitionColor
    })
  }

  getCapabilities(): RendererCapabilities {
    return {
      name: 'CDG (browser)',
      supportsColor: true,
      supportsTransitions: false,
      supportsVariablePositions: true,
      maxWidth: CDG_SCREEN.WIDTH,
      maxHeight: CDG_SCREEN.HEIGHT,
      colorDepth: 16
    }
  }

  protected mapColor(color: LogicalColor): number {
    return this.core.mapColor(color)
  }

  async initialize(): Promise<void> {
    this.core.initialize()
  }

  async render(
    script: PresentationScript,
    // backward-compatible: accept either a progress callback function or an object { onProgress, onDebug }
    callbacks?:
      | ((progress: { commandsProcessed: number; totalCommands: number; packets: number; totalPackets?: number }) => void)
      | ({
          onProgress?: (progress: { commandsProcessed: number; totalCommands: number; packets: number; totalPackets?: number }) => void
          onDebug?: (msg: string) => void
        })
  ): Promise<Blob> {
    const chunks: Uint8Array[] = []

    const onProgress = typeof callbacks === 'function' ? callbacks : callbacks?.onProgress
    const onDebug = typeof callbacks === 'function' ? undefined : callbacks?.onDebug

    if (onDebug) onDebug('CDGBrowserRenderer: starting incremental render')

    await this.core.renderIncremental(script, onProgress, {
      commandsPerChunk: 20,
      packetsPerChunk: 1024,
      onChunk: (chunk) => {
        // collect chunk; avoid keeping tiny chunks if possible
        chunks.push(chunk)
      },
      onDebug: onDebug
    })
    if (onDebug) onDebug(`CDGBrowserRenderer: finished incremental render, chunks=${chunks.length}`)

    // Concatenate collected chunks into a single Blob
    // Note: this still holds all bytes in memory; for very large outputs consider streaming to disk (Streamsaver)
    const totalLength = chunks.reduce((s, c) => s + c.length, 0)
    const out = new Uint8Array(totalLength)
    let off = 0
    for (const c of chunks) {
      out.set(c, off)
      off += c.length
    }

    return new Blob([out], { type: 'application/octet-stream' })
  }

  async renderCommand(command: AnyPresentationCommand): Promise<void> {
    this.core.renderCommand(command)
  }

  async finalize(): Promise<void> {
    // Nothing
  }
  // packet generation delegated to CDGCore
}
