# Song Data Format

## Overview

Songs are defined in a **simple, human-readable format** in TypeScript files under `src/lyrics/`. The `SongParser` converts the simple format to the `Song` data structure for testing.

## Why This Approach?

Rather than manually constructing huge TypeScript objects, songs are defined in a compact, readable format that:

1. **Human-Maintainable**: Easy to read and edit by hand (78 lines vs 1600+ lines)
2. **Mirrors LRC Format**: Natural extension of the standard LRC timing format
3. **Version Control Friendly**: Diffs are readable, not thousands of lines
4. **Type-Safe After Parse**: Converts to typed `Song` objects
5. **Easy to Batch-Generate**: Script can auto-convert LRC → simple format → Song

## File Naming Convention

Songs use **kebab-case** filename based on the song title:

```
src/lyrics/
  meet-me-in-november.ts    # "Meet Me In November"
  amazing-grace.ts          # "Amazing Grace"
  swing-low-sweet-chariot.ts # "Swing Low, Sweet Chariot"
```

## Simple Song Format

Each song file contains a `RAW_SONG` string with simple markup:

```
@title: Song Title
@artist: Songwriter/Lyricist
@duration: mm:ss.xx

[Section Caption]
mm:ss.xx <mm:ss.xx>syl<mm:ss.xx>la<mm:ss.xx>ble text here
mm:ss.xx another line

[Another Section]
mm:ss.xx text for next section
```

### Format Details

- **Metadata lines** (optional): `@title:`, `@artist:`, `@duration:`
- **Caption lines** (optional): `[Section Name]` marks verse/chorus/bridge/etc.
- **Lyric lines**: `mm:ss.xx text with optional syllable markers`
- **Syllable markers**: `<mm:ss.xx>syllable` marks start time of each syllable
- **Spacing**: Lines without syllable markers get rough timing estimates

### Example

```
@title: Amazing Grace
@artist: John Newton
@duration: 03:00.00

[Verse 1]
00:00.00 <00:00.00>A<00:00.20>maz<00:00.40>ing <00:01.00>grace,
00:02.00 <00:02.00>how <00:02.30>sweet <00:02.60>the <00:02.90>sound

[Verse 2]
00:05.00 That saved a wretch like me
```

This parses to:

```typescript
{
  title: 'Amazing Grace',
  artist: 'John Newton',
  duration: 180000,  // 03:00.00 → ms
  lines: [
    {
      caption: 'Verse 1',
      text: 'Amazing grace, how sweet the sound',
      startTime: 0,
      words: [
        {
          text: 'Amazing',
          startTime: 0,
          syllables: [
            { text: 'A', startTime: 0 },
            { text: 'maz', startTime: 200 },
            { text: 'ing', startTime: 400 }
          ]
        },
        // ... more words
      ]
    },
    // ... more lines
  ]
}
```

## Typing & Conversion

The parser automatically converts simple format to typed structures:

```typescript
// From src/lyrics/types.ts
export interface SongSyllable {
  text: string          // e.g., "No", "vem", "ber"
  startTime: number     // milliseconds when syllable begins
}

export interface SongWord {
  text: string          // e.g., "November"
  startTime: number     // milliseconds when word begins
  syllables: SongSyllable[]
}

export interface SongLine {
  text: string          // full line text
  startTime: number     // milliseconds when line begins
  caption?: string      // optional: "Verse 1", "Chorus", etc.
  words: SongWord[]
}

export interface Song {
  title: string
  artist: string        // songwriter/lyricist
  duration: number      // milliseconds
  lines: SongLine[]
}
```

## Converting from LRC Files

The project includes LRC V2+ parser at `src/formats/LRCFormat.ts` that reads timing data.

### Process for Adding Public Domain Songs

1. **Obtain LRC file** with syllable-level timing
   - Standard format: `[mm:ss.xx]<mm:ss.xx>syl<mm:ss.xx>la<mm:ss.xx>ble`
   - Metadata: `[ti:Title]`, `[au:Artist]`, `[duration:mm:ss.xx]`

2. **Convert LRC to simple format**:
   - Copy line structure: timestamps and syllable markers
   - Add `@metadata` tags at top
   - Add `[CAPTIONS]` for sections
   - Save as `src/lyrics/song-title.ts`

3. **Wrap in parser**:
   ```typescript
   import { SongParser } from './parser'
   import type { Song } from './types'

   const RAW_SONG = `
   @title: Song Title
   @artist: Songwriter
   @duration: mm:ss.xx
   
   [Verse 1]
   00:00.00 <00:00.00>syl<00:00.20>la<00:00.40>ble text
   `
   
   export const songName: Song = SongParser.parse(RAW_SONG)
   ```

4. **Register in index**: Add to `src/lyrics/index.ts`

## Timing Format

All timestamps are in `mm:ss.xx` format (centiseconds):

```
00:08.14  = 8 seconds, 14 centiseconds  = 8140 ms
01:23.45  = 1:23.45                     = 83450 ms
05:08.11  = 5 minutes, 8.11 seconds     = 308110 ms
```

The parser converts to milliseconds automatically.

## Example: Adding "Amazing Grace"

```typescript
// src/lyrics/amazing-grace.ts
import { SongParser } from './parser'
import type { Song } from './types'

const RAW_SONG = `
@title: Amazing Grace
@artist: John Newton
@duration: 03:00.00

[Verse 1]
00:00.00 <00:00.00>A<00:00.20>maz<00:00.40>ing <00:01.00>grace,
00:02.00 <00:02.00>how <00:02.30>sweet <00:02.60>the <00:02.90>sound

[Verse 2]
00:05.00 That saved a wretch like me
`

export const amazingGrace: Song = SongParser.parse(RAW_SONG)
```

Then in `src/lyrics/index.ts`:

```typescript
export { amazingGrace } from './amazing-grace'

export const SONGS: Record<string, Song> = {
  'meet-me-in-november': meetMeInNovember,
  'amazing-grace': amazingGrace  // ← Add here
}
```

## Usage in Tests

```typescript
import { meetMeInNovember } from '@/lyrics'

describe('TextLayoutEngine', () => {
  it('should layout song lyrics correctly', () => {
    const engine = new TextLayoutEngine()
    const layout = engine.layout(meetMeInNovember)
    
    expect(layout.lines).toHaveLength(28)
    expect(layout.lines[0].text).toBe('Meet me in November...')
  })
})
```

## Usage in Tests

```typescript
import { meetMeInNovember, SONGS } from '@/lyrics'

describe('TextLayoutEngine', () => {
  it('should layout song lyrics correctly', () => {
    const engine = new TextLayoutEngine()
    const layout = engine.layout(meetMeInNovember)
    
    expect(layout.lines).toHaveLength(28)
    expect(layout.lines[0].text).toContain('Meet me in November')
  })
  
  it('should handle all test songs', () => {
    const songs = Object.values(SONGS)
    
    for (const song of songs) {
      const layout = new TextLayoutEngine().layout(song)
      expect(layout.lines.length).toBeGreaterThan(0)
    }
  })
})
```

## File Structure

```
src/lyrics/
├── types.ts                      # Song data type definitions
├── parser.ts                     # SongParser class
├── index.ts                      # Export all songs
├── meet-me-in-november.ts        # First test song (78 lines!)
├── amazing-grace.ts              # Next song (~80 lines)
├── swing-low-sweet-chariot.ts    # And so on...
└── SONG-FORMAT.md                # This file
```

## Building the Complete Library

**Target**: 50-100 public domain songs for comprehensive testing.

**Estimated candidates** (with typical durations):
- **Hymns**: Amazing Grace (3:00), Swing Low Sweet Chariot (2:30), Rock of Ages (2:45)
- **Folk Songs**: Yankee Doodle (1:45), Home on the Range (3:15), Wayfaring Stranger (3:30)
- **Christmas**: O Come All Ye Faithful (2:00), Joy to the World (2:15), Silent Night (2:30)
- **Jazz Standards**: Fly Me to the Moon (3:00), The Way You Look Tonight (3:20), Autumn Leaves (3:45)
- **American Songbook**: Summertime (2:45), Over the Rainbow (3:00), As Time Goes By (2:40)

Each addition follows:
1. Get LRC file (find or create with timing)
2. Copy to simple format (~80 lines max)
3. Add one line to index.ts
4. Done!

## Comparison: Old vs New Format

| Aspect | Old Format | New Format |
|--------|-----------|-----------|
| File Size (per song) | 1,600+ lines | ~80 lines |
| Readability | Poor (deeply nested) | Excellent (readable markup) |
| Editability | Hard (large structures) | Easy (copy-paste from LRC) |
| Maintainability | Poor (error-prone) | Excellent (human-friendly) |
| 50 Songs Total | 80,000+ lines | ~4,000 lines |
| Type Safety | Full (TS objects) | Full (parsed to TS objects) |

## VIM: set ts=2 sw=2 et:
## END
