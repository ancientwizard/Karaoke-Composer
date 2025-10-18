# Export Feature Guide 📤

## Overview

The export feature allows you to download your complete Karaoke project with all timing data and test it with the terminal renderer!

## How to Use

### Step 1: Complete Your Timing
1. Open your project in the Compose view
2. Add lyrics and time all syllables
3. Make sure your project is complete

### Step 2: Export Your Project
1. In the **Compose** view, find your project in the list
2. Click the **green download button** (📥) next to your project
3. A TypeScript file will be downloaded

### Step 3: Add to Demo
1. Save the exported `.ts` file to `src/karaoke/demo/`
2. Example: `meet_me_in_november_export.ts`

### Step 4: Create a Demo Script

Create a new demo file (e.g., `src/karaoke/demo/novemberDemo.ts`):

```typescript
#!/usr/bin/env node
import { KaraokePresentationEngine } from '../presentation/KaraokePresentationEngine'
import { TerminalRenderer } from '../renderers/TerminalRenderer'
import { meet_me_in_november } from './meet_me_in_november_export'

async function runDemo() {
  console.log('\n🎤 Terminal Karaoke Playback\n')
  console.log(`Song: ${meet_me_in_november.name}`)
  console.log(`Artist: ${meet_me_in_november.artist}\n`)
  console.log('Starting in 2 seconds...\n')

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Generate presentation script
  const engine = new KaraokePresentationEngine()
  const script = engine.generateScript(meet_me_in_november)

  console.log(`Generated ${script.commands.length} commands\n`)

  // Create renderer
  const renderer = new TerminalRenderer({
    backgroundColor: 'black',
    showBorder: false
  })

  await renderer.initialize()

  // REAL-TIME PLAYBACK!
  const startTime = Date.now()

  for (const command of script.commands) {
    const executeAt = startTime + command.timestamp
    const delay = executeAt - Date.now()

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    await renderer.renderCommand(command)
  }

  // Hold final display
  await new Promise(resolve => setTimeout(resolve, 2000))

  await renderer.finalize()

  console.log('\n✨ Karaoke playback complete!\n')
}

runDemo().catch(console.error)
```

### Step 5: Run Your Demo

```bash
npx tsx src/karaoke/demo/novemberDemo.ts
```

Watch your song come to life in the terminal with real syllable-by-syllable highlighting! 🎵

## Export Format

The exported TypeScript file contains:
- **Project metadata** (name, artist, genre)
- **Complete lyrics** with word structure
- **All syllable timing** (startTime, endTime)
- **Line timing** data
- **Project completion status**

Example structure:
```typescript
export const meet_me_in_november: KaraokeProject = {
  id: "...",
  name: "Meet Me In November",
  artist: "Ancient Wizard",
  lyrics: [
    {
      lineNumber: 1,
      text: "Meet me in No/vem/ber...",
      words: [
        {
          word: "Meet",
          syllables: [
            {
              syllable: "Meet",
              startTime: 1000,  // milliseconds
              endTime: 1500
            }
          ]
        },
        // ... more words
      ]
    }
  ]
  // ... more data
}
```

## Testing Flow

1. **Develop in UI** - Use the visual editor to time your syllables
2. **Export** - Download your project with all timing data
3. **Test in Terminal** - See it render with the terminal karaoke display
4. **Validate** - Make sure timing looks good before CDG export
5. **Iterate** - Go back to UI, adjust timing, re-export, re-test

## Tips

- **Complete timing first**: Export works best with fully-timed projects
- **Test early**: Export and test in terminal before finishing all verses
- **Check syllable counts**: Terminal rendering shows if timing data is correct
- **Watch for gaps**: Terminal playback reveals timing gaps or overlaps
- **Performance validation**: See your work come to life before CDG generation!

## Benefits

✅ **Validate timing** before generating CDG files
✅ **See your work** in a real karaoke display
✅ **Debug issues** quickly with visual feedback
✅ **Share projects** with other developers
✅ **Backup** your work as code
✅ **Version control** friendly format

## What's Next?

Once you've validated your project in the terminal:
1. **Generate CDG** - Export to binary CDG format for hardware
2. **Create Video** - Render to MP4 with audio sync
3. **Web Player** - Deploy to HTML5 karaoke player

The terminal renderer is your **testing ground** before committing to final output formats! 🎤✨
