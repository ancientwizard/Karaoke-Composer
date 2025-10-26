/**
 * High-level types for the TypeScript CDG engine.
 */
export type Time = number // seconds

export interface RenderOptions {
  durationSeconds?: number // total render duration (seconds)
  packetsPerSecond?: number // default 75
}

export interface RenderResult {
  buffer: Uint8Array // complete CDG file bytes (24-byte packets)
  packets: number
  durationSeconds: number
}

// Simple tile coordinate
export interface TileCoord {
  row: number // 0..17
  col: number // 0..49
}

// A minimal representation of a static tile to draw at a given time.
export interface TileDraw {
  at: Time // when this tile should first appear (seconds)
  coord: TileCoord
  color0: number
  color1: number
  pixels: number[] // 12 bytes of tile pixel rows
  xor?: boolean
}
