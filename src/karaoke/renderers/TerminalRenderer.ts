/**
 * Terminal Renderer - Full-Screen Karaoke Display
 *
 * Creates an immersive karaoke experience in the terminal!
 * - Uses full terminal dimensions (rows/cols)
 * - Displays lyrics like a real karaoke screen
 * - Syllable-by-syllable highlighting in bright yellow
 * - Background text in dim white
 * - Smooth visual updates
 *
 * Think: "What you'd see on a karaoke lyrics screen" rendered in your terminal! 🎤
 */

import {
  RealTimeRenderer,
  type RendererCapabilities,
  type RendererConfig
} from './BaseRenderer'

import type {
  PresentationScript,
  AnyPresentationCommand
} from '../presentation/Command'

import { LogicalColor, TextAlign } from '../presentation/Command'

/**
 * ANSI color codes for karaoke display
 */
const ANSI = {
  // Colors for karaoke
  Reset: '\x1b[0m',

  // Background (dark blue like traditional karaoke)
  BgBlue: '\x1b[44m',
  BgBlack: '\x1b[40m',

  // Text colors
  DimWhite: '\x1b[37m',           // Upcoming/past lyrics
  BrightYellow: '\x1b[1;93m',     // Active syllable (singing now!)
  BrightCyan: '\x1b[1;96m',       // Metadata (title/artist)

  // Cursor control
  ClearScreen: '\x1b[2J',
  ClearLine: '\x1b[2K',
  Home: '\x1b[H',
  HideCursor: '\x1b[?25l',
  ShowCursor: '\x1b[?25h',

  // Positioning: \x1b[row;colH
  MoveTo: (row: number, col: number) => `\x1b[${row};${col}H`,

  // Format
  Bold: '\x1b[1m',
  Dim: '\x1b[2m'
}

/**
 * Terminal renderer configuration
 */
export interface TerminalRendererConfig extends RendererConfig {
  rows?: number    // Terminal height (default: 18 for CDG simulation, or process.stdout.rows)
  cols?: number    // Terminal width (default: 50 for CDG simulation, or process.stdout.columns)
  backgroundColor?: 'black' | 'blue'  // Karaoke background color
  showBorder?: boolean  // Draw a border like a karaoke screen
  simulateCDG?: boolean  // Use CDG-like dimensions (18 rows, 50 cols ~= 300px wide)
}

/**
 * Text element currently displayed on screen
 */
interface DisplayedText {
  textId: string
  text: string
  row: number      // Terminal row (1-based)
  col: number      // Terminal col (1-based)
  colors: Map<number, LogicalColor>  // Character index -> color
  align: 'left' | 'center' | 'right'
}

/**
 * Terminal Renderer - Full-Screen Karaoke Display
 *
 * Renders karaoke like you'd see on a real karaoke screen:
 * - Full terminal screen used as display
 * - Lyrics centered on screen
 * - Syllable-by-syllable highlighting in bright yellow
 * - Background color (black or blue)
 * - Smooth visual updates
 */
export class TerminalRenderer extends RealTimeRenderer {
  private rows: number
  private cols: number
  private backgroundColor: 'black' | 'blue'
  private showBorder: boolean

  // Screen state
  private displayedTexts: Map<string, DisplayedText>
  private frameBuffer: string[][]  // [row][col] character buffer
  private nextTextId: number

  constructor(config: TerminalRendererConfig = {}) {
    super(config)

    // CDG simulation mode: use CDG-like dimensions
    // CDG is 300x216 pixels = ~50 chars wide x 18 lines tall
    if (config.simulateCDG) {
      this.rows = 18  // CDG has 18 tile rows
      this.cols = 50  // ~50 characters for 300px width
      this.showBorder = true  // Auto-enable border in CDG mode
    } else {
      // Get terminal dimensions from process.stdout or use defaults
      this.rows = config.rows || (process.stdout.rows || 24)
      this.cols = config.cols || (process.stdout.columns || 80)
      this.showBorder = config.showBorder ?? false
    }

    this.backgroundColor = config.backgroundColor || 'black'

    this.displayedTexts = new Map()
    this.frameBuffer = []
    this.nextTextId = 0
  }

  getCapabilities(): RendererCapabilities {
    return {
      name: 'Terminal Karaoke Display',
      supportsColor: true,
      supportsTransitions: false,
      supportsVariablePositions: true,
      maxWidth: this.cols,
      maxHeight: this.rows,
      colorDepth: 256
    }
  }

  async initialize(): Promise<void> {
    // Set up terminal for karaoke display
    process.stdout.write(ANSI.HideCursor)
    process.stdout.write(ANSI.ClearScreen)
    process.stdout.write(ANSI.Home)

    // Initialize frame buffer
    this.clearFrameBuffer()

    // Draw initial screen
    this.drawBackground()

    if (this.showBorder) {
      this.drawBorder()
    }

    this.renderFrame()
  }

  async render(script: PresentationScript): Promise<string> {
    // Real-time renderer doesn't pre-render
    return `Karaoke Display: ${this.cols}x${this.rows} terminal, ${script.commands.length} commands`
  }

  async renderCommand(command: AnyPresentationCommand): Promise<void> {
    switch (command.type) {
      case 'clear_screen':
        this.handleClearScreen()
        break

      case 'show_text':
        this.handleShowText(command)
        break

      case 'change_color':
        this.handleChangeColor(command)
        break

      case 'remove_text':
        this.handleRemoveText(command)
        break

      case 'show_metadata':
        this.handleShowMetadata(command)
        break

      case 'transition':
        // Terminal doesn't do fancy transitions, just swap text
        break
    }

    // Render the updated frame
    this.renderFrame()
  }

  async finalize(): Promise<void> {
    // Clear screen and show cursor
    process.stdout.write(ANSI.ShowCursor)
    process.stdout.write(ANSI.ClearScreen)
    process.stdout.write(ANSI.Home)
  }

  /**
   * Map logical colors to ANSI codes
   * ONLY sets text (foreground) color, NOT background!
   */
  protected mapColor(color: LogicalColor): string {
    switch (color) {
      case 'background':
        // Text that's not yet sung or already sung - dim white
        return ANSI.DimWhite
      case 'active':
        // Currently singing syllable - bright yellow bold!
        return ANSI.BrightYellow + ANSI.Bold
      case 'transition':
        // Upcoming lyrics - slightly brighter white
        return ANSI.DimWhite
      default:
        return ANSI.Reset
    }
  }

  /**
   * Clear the frame buffer (fill with spaces)
   */
  private clearFrameBuffer(): void {
    this.frameBuffer = []
    for (let row = 0; row < this.rows; row++) {
      this.frameBuffer[row] = new Array(this.cols).fill(' ')
    }
  }

  /**
   * Draw background color
   */
  private drawBackground(): void {
    const bgColor = this.backgroundColor === 'blue' ? ANSI.BgBlue : ANSI.BgBlack
    process.stdout.write(bgColor)
  }

  /**
   * Draw a border around the screen (optional, like karaoke TV frame)
   */
  private drawBorder(): void {
    const border = '═'
    const corner = '╔╗╚╝'

    // Top border
    process.stdout.write(ANSI.MoveTo(1, 1))
    process.stdout.write(ANSI.BrightCyan + corner[0] + border.repeat(this.cols - 2) + corner[1])

    // Side borders
    for (let row = 2; row < this.rows; row++) {
      process.stdout.write(ANSI.MoveTo(row, 1) + '║')
      process.stdout.write(ANSI.MoveTo(row, this.cols) + '║')
    }

    // Bottom border
    process.stdout.write(ANSI.MoveTo(this.rows, 1))
    process.stdout.write(corner[2] + border.repeat(this.cols - 2) + corner[3])

    process.stdout.write(ANSI.Reset)
  }

  /**
   * Render current frame to terminal
   *
   * For color changes (syllable highlighting), we don't clear the screen!
   * We just re-render the text with updated colors.
   * Only clear screen when explicitly commanded or when showing new text.
   */
  private renderFrame(): void {
    // Don't clear screen here - let commands control when to clear!
    // This allows syllable highlighting to update without flickering

    // Clear previous frame buffer
    this.clearFrameBuffer()

    // Draw all text elements to frame buffer
    for (const [, textElem] of this.displayedTexts) {
      this.drawTextToBuffer(textElem)
    }

    // Render frame buffer to terminal with colors
    for (const [, textElem] of this.displayedTexts) {
      this.renderTextElement(textElem)
    }
  }

  /**
   * Draw text element to frame buffer (for positioning calculation)
   */
  private drawTextToBuffer(textElem: DisplayedText): void {
    const {
      text, row, col
    } = textElem

    // Write text to buffer at position
    let bufferCol = col - 1  // Convert to 0-based
    for (let i = 0; i < text.length && bufferCol < this.cols; i++, bufferCol++) {
      if (row - 1 >= 0 && row - 1 < this.rows) {
        this.frameBuffer[row - 1][bufferCol] = text[i]
      }
    }
  }

  /**
   * Render text element with colors
   */
  private renderTextElement(textElem: DisplayedText): void {
    const {
      text, row, col, colors
    } = textElem

    // Move cursor to position
    process.stdout.write(ANSI.MoveTo(row, col))

    // Render text with syllable highlighting
    let currentColor: LogicalColor | null = null

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const charColor = colors.get(i) || LogicalColor.TransitionText  // Default to dim text

      // Change color if needed
      if (charColor !== currentColor) {
        process.stdout.write(this.mapColor(charColor))
        currentColor = charColor
      }

      process.stdout.write(char)
    }

    process.stdout.write(ANSI.Reset)
  }

  /**
   * Convert abstract position (0-1000) to terminal row/col
   */
  private positionToTerminal(position: { x: number; y: number }): { row: number; col: number } {
    // Y: 0-1000 -> 1 to this.rows
    const row = Math.max(1, Math.min(this.rows, Math.floor((position.y / 1000) * this.rows) + 1))

    // X: 0-1000 -> 1 to this.cols
    const col = Math.max(1, Math.min(this.cols, Math.floor((position.x / 1000) * this.cols) + 1))

    return {
      row, col
    }
  }

  /**
   * Center text at given row
   * Simpler version - just centers within total width
   */
  private centerText(text: string, row: number): { row: number; col: number } {
    // Calculate available width (account for border if present)
    const availableWidth = this.showBorder ? this.cols - 4 : this.cols
    const startCol = this.showBorder ? 3 : 1  // Inside border

    // Center within available space
    const col = Math.max(startCol, startCol + Math.floor((availableWidth - text.length) / 2))

    return {
      row, col
    }
  }

  /**
   * Handle clear_screen command
   */
  private handleClearScreen(): void {
    this.displayedTexts.clear()
    process.stdout.write(ANSI.ClearScreen)
    process.stdout.write(ANSI.Home)
    this.drawBackground()

    if (this.showBorder) {
      this.drawBorder()
    }
  }

  /**
   * Handle show_text command
   */
  private handleShowText(command: any): void {
    const {
      textId, text, position, color, align
    } = command

    // Use the textId from the command (not auto-generated!)
    // This is CRITICAL for change_color commands to work

    // Clear screen when showing new lyric line (not metadata)
    // Only clear on the FIRST wrapped line (textId ends with -0)
    if (textId.startsWith('line-') && textId.endsWith('-0')) {
      process.stdout.write(ANSI.ClearScreen)
      process.stdout.write(ANSI.Home)
      this.drawBackground()

      if (this.showBorder) {
        this.drawBorder()
      }

      // Clear old lyric lines (but keep metadata)
      const keysToRemove: string[] = []
      for (const [key] of this.displayedTexts) {
        if (key.startsWith('line-')) {
          keysToRemove.push(key)
        }
      }
      for (const key of keysToRemove) {
        this.displayedTexts.delete(key)
      }
    }

    // Calculate available width (account for border if present)
    const availableWidth = this.showBorder ? this.cols - 4 : this.cols - 2

    // Truncate text if too long for display
    let displayText = text
    if (text.length > availableWidth) {
      displayText = text.substring(0, availableWidth - 3) + '...'
    }

    // Convert position
    let termPos = this.positionToTerminal(position)

    // Adjust for alignment
    if (align === 'center') {
      termPos = this.centerText(displayText, termPos.row)
    } else if (align === 'right') {
      const startCol = this.showBorder ? 2 : 1
      termPos.col = Math.max(startCol, this.cols - displayText.length - (this.showBorder ? 2 : 0))
    } else {
      // Left align
      termPos.col = this.showBorder ? 3 : 1
    }

    // Create text element with initial color for all characters
    const colors = new Map<number, LogicalColor>()
    for (let i = 0; i < displayText.length; i++) {
      colors.set(i, color || 'transition')
    }

    this.displayedTexts.set(textId, {
      textId,
      text: displayText,  // Use truncated text!
      row: termPos.row,
      col: termPos.col,
      colors,
      align: align || 'center'
    })
  }

  /**
   * Handle change_color command (syllable highlighting!)
   */
  private handleChangeColor(command: any): void {
    const {
      textId, startChar, endChar, color
    } = command

    const textElem = this.displayedTexts.get(textId)
    if (!textElem) {
      // DEBUG: Uncomment to see if textIds match
      // console.error(`[DEBUG] textId not found: ${textId}, available: ${Array.from(this.displayedTexts.keys()).join(', ')}`)
      return // Text not found, might have been removed
    }

    // Update colors for character range
    for (let i = startChar; i < endChar && i < textElem.text.length; i++) {
      textElem.colors.set(i, color)
    }
  }

  /**
   * Handle remove_text command
   */
  private handleRemoveText(command: any): void {
    this.displayedTexts.delete(command.textId)
  }

  /**
   * Handle show_metadata command
   */
  private handleShowMetadata(command: any): void {
    const {
      title, artist, message, position
    } = command

    const lines: string[] = []
    if (title) lines.push(title)
    if (artist) lines.push(`by ${artist}`)
    if (message) lines.push(message)

    const textId = 'metadata-0'
    const text = lines.join(' ')

    // Position metadata (usually top-center)
    let termPos = this.positionToTerminal(position)
    termPos = this.centerText(text, termPos.row)

    // Metadata in cyan color
    const colors = new Map<number, LogicalColor>()
    for (let i = 0; i < text.length; i++) {
      colors.set(i, LogicalColor.ActiveText)  // Bright for visibility
    }

    this.displayedTexts.set(textId, {
      textId,
      text,
      row: termPos.row,
      col: termPos.col,
      colors,
      align: 'center'
    })
  }

  /**
   * Create a simple test karaoke display
   */
  static async test(): Promise<void> {
    const renderer = new TerminalRenderer({
      backgroundColor: 'black',
      showBorder: false
    })

    await renderer.initialize()

    console.log('\n🎤 Terminal Karaoke Display Test\n')

    // Show title/artist
    await renderer.renderCommand({
      type: 'show_metadata',
      timestamp: 0,
      title: 'Twinkle Twinkle Little Star',
      artist: 'Traditional',
      position: {
        x: 500,
        y: 100
      },
      align: TextAlign.Center
    })

    await renderer.sleep(2000)

    // Show first line of lyrics (dim)
    const textId = 'line-0'
    await renderer.renderCommand({
      type: 'show_text',
      timestamp: 2000,
      textId,
      text: 'Twinkle twinkle little star',
      position: {
        x: 500,
        y: 400
      },
      color: LogicalColor.TransitionText,
      align: TextAlign.Center
    })

    await renderer.sleep(500)

    // Highlight syllables one by one
    const syllables = [
      {
        start: 0, end: 4, delay: 500
      },  // "Twin"
      {
        start: 4, end: 7, delay: 500
      },  // "kle"
      {
        start: 8, end: 12, delay: 500
      }, // "twin"
      {
        start: 12, end: 15, delay: 500
      }, // "kle"
      {
        start: 16, end: 19, delay: 500
      }, // "lit"
      {
        start: 19, end: 22, delay: 500
      }, // "tle"
      {
        start: 23, end: 27, delay: 500
      }  // "star"
    ]

    for (const syll of syllables) {
      await renderer.sleep(syll.delay)
      await renderer.renderCommand({
        type: 'change_color',
        timestamp: 0,
        textId,
        startChar: syll.start,
        endChar: syll.end,
        color: LogicalColor.ActiveText
      })
    }

    await renderer.sleep(1000)

    // Clear and show next line
    await renderer.renderCommand({
      type: 'clear_screen',
      timestamp: 0,
      color: LogicalColor.Background
    })

    await renderer.renderCommand({
      type: 'show_text',
      timestamp: 0,
      textId: 'line-1',
      text: 'How I wonder what you are',
      position: {
        x: 500,
        y: 500
      },
      color: LogicalColor.TransitionText,
      align: TextAlign.Center
    })

    await renderer.sleep(2000)

    await renderer.finalize()

    console.log('\n✨ Test complete!\n')
  }
}
