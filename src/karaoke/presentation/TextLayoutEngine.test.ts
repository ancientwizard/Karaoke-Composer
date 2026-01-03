/**
 * TextLayoutEngine Debug Test
 *
 * Uses TileScreenModel to visualize layout output
 * Helps identify and fix alignment/positioning issues
 */

import { TextLayoutEngine, DEFAULT_LAYOUT_CONFIG } from './TextLayoutEngine'
import { TileScreenModel, TILE_CONFIGS } from './TileScreenModel'
import { TextAlign } from './Command'

/**
 * Test helper: visualize layout on tile screen
 */
function visualizeLayout(
  text: string,
  align: TextAlign,
  tileConfigName: keyof typeof TILE_CONFIGS = 'LARGE_FONT_3x2'
): string
{
  const engine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
  const tileScreen = new TileScreenModel(TILE_CONFIGS[tileConfigName])

  // Get layout from engine
  const layout = engine.layoutText(text, align)

  // Visualize on tile screen
  // Mark each character position
  for (let i = 0; i < layout.charPositions.length && i < text.length; i++)
  {
    const pos = layout.charPositions[i]
    const char = text[i]
    const displayChar = char === ' ' ? '·' : char
    tileScreen.placeCharacter(Math.floor(pos.x), Math.floor(pos.y), displayChar, 15)
  }

  return tileScreen.renderASCII(true)
}

/**
 * Run debug tests
 */
export function runLayoutTests(): void
{
  console.log('\n====== TEXTLAYOUTENGINE DEBUG TESTS ======\n')

  // Test 1: Simple centered text
  console.log('TEST 1: Simple centered text (LARGE_FONT_3x2)')
  console.log('Text: "Hello World"')
  console.log('Align: CENTER')
  const test1 = visualizeLayout('Hello World', TextAlign.Center, 'LARGE_FONT_3x2')
  console.log(test1)
  console.log()

  // Test 2: Longer text (should wrap)
  console.log('TEST 2: Longer text with wrapping')
  console.log('Text: "The quick brown fox jumps over the lazy dog"')
  console.log('Align: CENTER')
  const test2 = visualizeLayout('The quick brown fox jumps over the lazy dog', TextAlign.Center, 'LARGE_FONT_3x2')
  console.log(test2)
  console.log()

  // Test 3: Left align
  console.log('TEST 3: Left aligned')
  console.log('Text: "Left align test"')
  console.log('Align: LEFT')
  const test3 = visualizeLayout('Left align test', TextAlign.Left, 'LARGE_FONT_3x2')
  console.log(test3)
  console.log()

  // Test 4: Right align
  console.log('TEST 4: Right aligned')
  console.log('Text: "Right align test"')
  console.log('Align: RIGHT')
  const test4 = visualizeLayout('Right align test', TextAlign.Right, 'LARGE_FONT_3x2')
  console.log(test4)
  console.log()

  // Test 5: Multiple lines
  console.log('TEST 5: Multiple lines (with spaces)')
  console.log('Text: "Line one here\\nLine two here"')
  const multiLineText = 'Line one here Line two here Line three here'
  console.log('Align: CENTER')
  const test5 = visualizeLayout(multiLineText, TextAlign.Center, 'LARGE_FONT_3x2')
  console.log(test5)
  console.log()

  // Test 6: Detailed view with STANDARD tiles
  console.log('TEST 6: Same text with STANDARD tiles (2x2)')
  console.log('Text: "Centered"')
  console.log('Align: CENTER')
  const test6 = visualizeLayout('Centered', TextAlign.Center, 'STANDARD')
  console.log(test6)
  console.log()

  // Test 7: Character position analysis
  console.log('TEST 7: Character position analysis')
  const engine = new TextLayoutEngine(DEFAULT_LAYOUT_CONFIG)
  const testText = 'Test'
  const layout = engine.layoutText(testText, TextAlign.Center)

  console.log(`Text: "${testText}"`)
  console.log(`Layout dimensions: ${layout.width}x${layout.height}`)
  console.log(`Position: (${layout.position.x}, ${layout.position.y})`)
  console.log(`Wrapped lines: [${layout.lines.map(l => `"${l}"`).join(', ')}]`)
  console.log('Character positions:')
  for (let i = 0; i < layout.charPositions.length; i++)
  {
    const pos = layout.charPositions[i]
    console.log(`  [${i}] '${testText[i]}' @ (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
  }
  console.log()
}

// Run tests if this file is executed directly
if (require.main === module)
{
  runLayoutTests()
}

// VIM: set filetype=typescript :
// END
