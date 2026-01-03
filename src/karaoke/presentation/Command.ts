/**
 * Presentation Commands - Format-Agnostic Karaoke Display Instructions
 *
 * These commands represent WHAT to display and WHEN, independent of
 * HOW it's encoded (CDG, Terminal, PowerShell, HTML, etc.)
 */

/**
 * Logical colors used in presentation
 * Renderers map these to their specific color systems
 */
export enum LogicalColor {
  Background      = 'background', // Black or dark blue
  ActiveText      = 'active',     // Bright yellow (currently singing)
  TransitionText  = 'transition'  // Used during fade effects between lines
}

/**
 * Screen position in abstract coordinates
 * Renderers scale to their native resolution
 */
export interface Position {
  x: number  // Horizontal position (0-1000 abstract units)
  y: number  //   Vertical position (0-1000 abstract units)
}

/**
 * Text alignment options
 */
export enum TextAlign {
  Left    = 'left',
  Center  = 'center',
  Right   = 'right'
}

/**
 * Base interface for all presentation commands
 */
export interface PresentationCommand {
  type: string
  timestamp: number  // When to execute this command (milliseconds)
}

/**
 * Clear the entire screen
 */
export interface ClearScreenCommand extends PresentationCommand {
  type: 'clear_screen'
  color: LogicalColor
}

/**
 * Display text at a specific position
 */
export interface ShowTextCommand extends PresentationCommand {
  type: 'show_text'
  textId: string       // Unique identifier for this text element (for later color changes)
  text: string
  position: Position
  color: LogicalColor
  align: TextAlign
  fontSize?: number  // Optional, renderer-specific default if not provided
}

/**
 * Change color of specific character range
 * Used for syllable-level highlighting
 */
export interface ChangeColorCommand extends PresentationCommand {
  type: 'change_color'
  textId: string       // Identifies which text element to modify
  startChar: number    // Character index to start color change
  endChar: number      // Character index to end color change (exclusive)
  color: LogicalColor
}

/**
 * Remove text from screen
 */
export interface RemoveTextCommand extends PresentationCommand {
  type: 'remove_text'
  textId: string
}

/**
 * Transition effect between two text elements
 * Simulates fade by gradually changing pixels
 */
export interface TransitionCommand extends PresentationCommand {
  type: 'transition'
  fromTextId: string
  toTextId: string
  durationMs: number
  fromPosition: Position
  toPosition: Position
}

/**
 * Display metadata (title, artist) - typically for intro/outro
 */
export interface ShowMetadataCommand extends PresentationCommand {
  type: 'show_metadata'
  title?: string
  artist?: string
  message?: string  // e.g., "Thank you!"
  position: Position
  align: TextAlign
}

/**
 * Union type of all possible commands
 */
export type AnyPresentationCommand =
  | ClearScreenCommand
  | ShowTextCommand
  | ChangeColorCommand
  | RemoveTextCommand
  | TransitionCommand
  | ShowMetadataCommand

/**
 * Complete presentation script
 * Sorted array of commands to be executed in sequence
 */
export interface PresentationScript {
  commands: AnyPresentationCommand[]
  durationMs: number  // Total duration of presentation
  metadata: {
    title?: string
    artist?: string
    songDurationMs?: number
  }
}

/**
 * Helper to create presentation commands with proper types
 */
export const PresentationCommands = {
  clearScreen: (timestamp: number, color: LogicalColor = LogicalColor.Background): ClearScreenCommand => ({
    type: 'clear_screen',
    timestamp,
    color
  }),

  showText: (
    timestamp: number,
    textId: string,
    text: string,
    position: Position,
    color: LogicalColor = LogicalColor.ActiveText,
    align: TextAlign = TextAlign.Center
  ): ShowTextCommand => ({
    type: 'show_text',
    timestamp,
    textId,
    text,
    position,
    color,
    align
  }),

  changeColor: (
    timestamp: number,
    textId: string,
    startChar: number,
    endChar: number,
    color: LogicalColor
  ): ChangeColorCommand => ({
    type: 'change_color',
    timestamp,
    textId,
    startChar,
    endChar,
    color
  }),

  removeText: (timestamp: number, textId: string): RemoveTextCommand => ({
    type: 'remove_text',
    timestamp,
    textId
  }),

  transition: (
    timestamp: number,
    fromTextId: string,
    toTextId: string,
    durationMs: number,
    fromPosition: Position,
    toPosition: Position
  ): TransitionCommand => ({
    type: 'transition',
    timestamp,
    fromTextId,
    toTextId,
    durationMs,
    fromPosition,
    toPosition
  }),

  showMetadata: (
    timestamp: number,
    position: Position,
    metadata: { title?: string; artist?: string; message?: string },
    align: TextAlign = TextAlign.Center
  ): ShowMetadataCommand => ({
    type: 'show_metadata',
    timestamp,
    position,
    align,
    ...metadata
  })
}

// VIM: set filetype=typescript :
// END