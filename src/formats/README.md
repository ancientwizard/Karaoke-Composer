# Karaoke File Formats

This directory contains implementations for reading and writing various karaoke file formats.

## Supported Formats

### LRC (Lyrics) Format - V2+
Enhanced LRC format with syllable-level timing and metadata extensions.

### CDG (Compact Disc + Graphics) Format
Binary format for karaoke machines with graphics and synchronized lyrics.

## Design Philosophy

- **Small, focused classes**: Each format gets its own parser and writer
- **Testable**: Every format handler includes comprehensive tests
- **Extensible**: Easy to add new formats without touching existing code
- **Type-safe**: Full TypeScript support with proper interfaces
