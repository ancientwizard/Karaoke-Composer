/**
 * Base Renderer - Abstract interface for all karaoke renderers
 *
 * Each renderer (CDG, Terminal, PowerShell, HTML) implements this interface
 * to convert presentation commands into their specific output format.
 */

import type {
  PresentationScript,
  AnyPresentationCommand,
  LogicalColor
} from '../presentation/Command'

/**
 * Renderer capabilities - describes what a renderer supports
 */
export interface RendererCapabilities {
  name: string
  supportsColor: boolean
  supportsTransitions: boolean
  supportsVariablePositions: boolean
  maxWidth: number   // Native display width
  maxHeight: number  // Native display height
  colorDepth: number // Number of colors supported
}

/**
 * Renderer configuration options
 */
export interface RendererConfig {
  // Output destination (file path, stdout, etc.)
  output?: string

  // Color mapping (renderer-specific)
  colorMap?: Map<LogicalColor, any>

  // Performance/quality trade-offs
  optimize?: boolean

  // Renderer-specific options
  [key: string]: any
}

/**
 * Abstract base class for all renderers
 *
 * Subclasses implement format-specific rendering logic
 */
export abstract class BaseRenderer {
  protected config: RendererConfig

  constructor(config: RendererConfig = {}) {
    this.config = config
  }

  /**
   * Get this renderer's capabilities
   */
  abstract getCapabilities(): RendererCapabilities

  /**
   * Initialize the renderer (setup, allocate resources, etc.)
   */
  abstract initialize(): Promise<void>

  /**
   * Render a complete presentation script
   *
   * @param script - The presentation script to render
   * @returns Renderer-specific output (Buffer, string, etc.)
   */
  abstract render(script: PresentationScript): Promise<any>

  /**
   * Render a single presentation command
   *
   * Used for real-time rendering (e.g., terminal playback)
   *
   * @param command - The command to render
   */
  abstract renderCommand(command: AnyPresentationCommand): Promise<void>

  /**
   * Finalize rendering (cleanup, write output, etc.)
   */
  abstract finalize(): Promise<void>

  /**
   * Map a logical color to renderer-specific color
   */
  protected abstract mapColor(color: LogicalColor): any

  /**
   * Validate that a presentation script is compatible with this renderer
   *
   * @param script - The script to validate
   * @returns Array of warnings/errors (empty if valid)
   */
  validate(script: PresentationScript): string[] {
    const warnings: string[] = []
    const capabilities = this.getCapabilities()

    // Check color support
    if (!capabilities.supportsColor) {
      const colorCommands = script.commands.filter(
        cmd => cmd.type === 'change_color' || cmd.type === 'show_text'
      )
      if (colorCommands.length > 0) {
        warnings.push(`Renderer ${capabilities.name} doesn't support colors, but script uses color commands`)
      }
    }

    // Check transition support
    if (!capabilities.supportsTransitions) {
      const transitionCommands = script.commands.filter(cmd => cmd.type === 'transition')
      if (transitionCommands.length > 0) {
        warnings.push(`Renderer ${capabilities.name} doesn't support transitions, these will be simplified`)
      }
    }

    return warnings
  }

  /**
   * Helper: Sort commands by timestamp
   */
  protected sortCommands(commands: AnyPresentationCommand[]): AnyPresentationCommand[] {
    return [...commands].sort((a, b) => a.timestamp - b.timestamp)
  }
}

/**
 * Base class for real-time renderers (Terminal, PowerShell)
 *
 * These renderers play back in real-time, executing commands as time progresses
 */
export abstract class RealTimeRenderer extends BaseRenderer {
  private startTime: number = 0
  private isPlaying: boolean = false

  /**
   * Start real-time playback of a presentation script
   *
   * @param script - The presentation script to play
   * @param onComplete - Callback when playback completes
   */
  async playback(script: PresentationScript, onComplete?: () => void): Promise<void> {
    await this.initialize()

    const sortedCommands = this.sortCommands(script.commands)
    this.startTime = Date.now()
    this.isPlaying = true

    // Execute commands in sequence with timing
    for (const command of sortedCommands) {
      if (!this.isPlaying) break

      // Wait until it's time for this command
      const elapsedMs = Date.now() - this.startTime
      const waitMs = command.timestamp - elapsedMs

      if (waitMs > 0) {
        await this.sleep(waitMs)
      }

      // Execute the command
      await this.renderCommand(command)
    }

    await this.finalize()

    if (onComplete) {
      onComplete()
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false
  }

  /**
   * Sleep for a specified duration
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Base class for file-based renderers (CDG, HTML, Video)
 *
 * These renderers generate complete output files upfront
 */
export abstract class FileRenderer extends BaseRenderer {
  protected outputPath: string

  constructor(outputPath: string, config: RendererConfig = {}) {
    super(config)
    this.outputPath = outputPath
  }

  /**
   * Render to file
   *
   * @param script - The presentation script to render
   * @returns Path to the output file
   */
  async renderToFile(script: PresentationScript): Promise<string> {
    await this.initialize()
    const output = await this.render(script)
    await this.writeOutput(output)
    await this.finalize()
    return this.outputPath
  }

  /**
   * Write renderer output to file
   * Subclasses implement format-specific file writing
   */
  protected abstract writeOutput(output: any): Promise<void>
}
