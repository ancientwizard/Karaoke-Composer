# Terminal Karaoke Display Demos

Welcome to the terminal karaoke experience! These demos show how the Presentation Engine renders karaoke to your terminal like a real karaoke screen.

## What You're Seeing

The terminal isn't just showing logs - it's acting as a **karaoke display**! Just like a TV screen at a karaoke bar, using:
- **Full terminal dimensions** (rows and columns)
- **ANSI escape codes** for cursor positioning and colors
- **Real-time rendering** with syllable-by-syllable highlighting
- **Centered text** like traditional karaoke

## Demos

### 1. Quick Demo (`quickDemo.ts`) ⭐ RECOMMENDED!
**Fast preview** - Play first 30 seconds of any song:
- Quick way to test exported LRC files
- No waiting through entire song
- Perfect for validation during development

```bash
# Play first 30 seconds (default)
npx tsx src/karaoke/demo/quickDemo.ts src/utils/meet_me_in_november.lrc

# Play first 60 seconds
npx tsx src/karaoke/demo/quickDemo.ts src/utils/meet_me_in_november.lrc 60
```

### 2. LRC Player (`lrcPlayer.ts`) ⭐ FULL PLAYBACK
**Play exported LRC files** - Load and play your timed songs:
- Reads .lrc files exported from Karaoke Composer
- Parses LRC V2+ format with syllable timing
- Real-time karaoke playback in terminal (FULL SONG)
- Perfect for final testing!

```bash
# Export your project from Karaoke Composer first
# Then play it:
npx tsx src/karaoke/demo/lrcPlayer.ts meet_me_in_november.lrc
npx tsx src/karaoke/demo/lrcPlayer.ts path/to/your/song.lrc
```

**What it shows:**
- File loading and parsing
- Syllable count and timing stats (305 syllables validated!)
- Real-time synchronized playback
- Metadata display (title/artist)
- Debug output (first 5 commands)

### 3. Live Terminal Demo (`liveTerminalDemo.ts`)
**Simplest demo** - Shows basic karaoke display features:
- Display title/artist centered on screen
- Show lyrics line
- Highlight syllables one by one in bright yellow
- Dim text for upcoming lyrics

```bash
npx tsx src/karaoke/demo/liveTerminalDemo.ts
```

### 4. Full Playback Demo (`fullPlaybackDemo.ts`)
**Complete karaoke experience** - Real-time playback with timing:
- Generates PresentationScript from KaraokeProject
- Executes commands at their scheduled timestamps
- Shows metadata intro (title/artist)
- Preview lyrics before singing starts
- Syllable-by-syllable highlighting synchronized to timing
- Automatic line transitions

```bash
npx tsx src/karaoke/demo/fullPlaybackDemo.ts
```

### 5. Terminal Demo (`terminalDemo.ts`)
**Pipeline demonstration** - Shows the full architecture:
- KaraokeProject → PresentationEngine → TerminalRenderer
- Validates project before rendering
- Analyzes generated commands
- Explains the presentation system

```bash
npx tsx src/karaoke/demo/terminalDemo.ts
```

## How It Works

### Terminal as a Display

The terminal is treated like a display screen with **rows** and **columns**:

```typescript
const renderer = new TerminalRenderer({
  rows: process.stdout.rows,      // Terminal height (e.g., 24)
  cols: process.stdout.columns,   // Terminal width (e.g., 80)
  backgroundColor: 'black',        // Black background like karaoke
  showBorder: false                // Optional decorative border
})
```

### Positioning System

Abstract coordinates (0-1000) are converted to terminal row/col:
- **Y: 0-1000** → Row 1 to terminal height
- **X: 0-1000** → Column 1 to terminal width
- **Text alignment**: Left, center (default), right

### Color System

ANSI escape codes create the karaoke look:
- **Dim White** (`\x1b[37m`) - Upcoming/past lyrics
- **Bright Yellow Bold** (`\x1b[1;93m`) - Active syllable (singing NOW!)
- **Bright Cyan** (`\x1b[1;96m`) - Metadata (title/artist)
- **Background** - Black or blue like traditional karaoke

### Real-Time Rendering

Commands are executed at their timestamps:
```typescript
for (const command of script.commands) {
  // Wait until command timestamp
  await sleep(command.timestamp - elapsed)

  // Execute: show text, change color, remove text, etc.
  await renderer.renderCommand(command)
}
```

## Visual Effects

### Syllable Highlighting
```
Before: Twinkle twinkle little star    (dim white)
During: Twin|kle twinkle little star   (Twin = bright yellow)
        Twinkle twin|kle little star   (twin = bright yellow)
        ...and so on
```

### Line Transitions
```
Line 1: Twinkle twinkle little star    (visible, highlighting syllables)
        ↓ (transition at timestamp)
        (line 1 removed)
        ↓
Line 2: How I wonder what you are      (appears, starts highlighting)
```

## Terminal Requirements

Works best on:
- ✅ **Linux terminals** (xterm, gnome-terminal, konsole)
- ✅ **Mac terminals** (Terminal.app, iTerm2)
- ✅ **VS Code integrated terminal**
- ⚠️ **Windows**: Use Windows Terminal or WSL (not cmd.exe)

Minimum terminal size: 80x24 (standard)
Recommended: 100x30 or larger for best experience

## Customization

You can customize the karaoke display:

```typescript
const renderer = new TerminalRenderer({
  rows: 30,                    // Custom terminal height
  cols: 100,                   // Custom terminal width
  backgroundColor: 'blue',     // Traditional karaoke blue background
  showBorder: true             // Draw decorative border
})
```

## Next Steps

1. **Try the demos** - See karaoke in your terminal!
2. **Modify timing** - Edit syllable timestamps in the demo projects
3. **Add more lyrics** - Create your own KaraokeProject
4. **Real audio sync** - Integrate with actual audio playback
5. **CDG export** - Use the same PresentationScript to generate CDG files

## Architecture

```
KaraokeProject (with syllable timing)
         ↓
KaraokePresentationEngine
         ↓
PresentationScript (format-agnostic commands)
         ↓
TerminalRenderer (ANSI terminal display)
         ↓
Your Terminal Screen! 🎤
```

The beauty: **Same PresentationScript** can drive:
- TerminalRenderer (what you see here)
- CDGRenderer (binary karaoke format)
- HTMLRenderer (web browser)
- VideoRenderer (MP4 export)
- PowerShellRenderer (Windows)

All using the exact same timing and command data!

## Enjoy!

This is karaoke rendering at its finest - using nothing but text and ANSI codes to create an immersive singing experience. 🎵✨
