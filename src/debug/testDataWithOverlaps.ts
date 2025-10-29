#!/usr/bin/env -S npx tsx

/**
 * Test Script for Timing Overlap Analysis UI
 *
 * This creates sample data with intentional overlaps for testing the new UI buttons
 */

import type { LyricLine } from '../types/karaoke'

// Sample song data with intentional timing overlaps
export const createTestSongWithOverlaps = (): LyricLine[] => {
  return [
    {
      id: 'line-1',
      lineNumber: 1,
      text: 'Happy Birthday to you',
      words: [
        {
          word: 'Happy',
          syllables: [
            {
              syllable: 'Hap',
              startTime: 0,
              endTime: 200,
              duration: 200
            },
            {
              syllable: 'py',
              startTime: 200,
              endTime: 500,
              duration: 300
            }
          ],
          startTime: 0,
          endTime: 500,
          duration: 500
        },
        {
          word: 'Birthday',
          syllables: [
            {
              syllable: 'Birth',
              startTime: 450,
              endTime: 650,
              duration: 200
            }, // OVERLAP with "Happy"!
            {
              syllable: 'day',
              startTime: 650,
              endTime: 1000,
              duration: 350
            }
          ],
          startTime: 450, // OVERLAP: starts before "Happy" ends at 500ms
          endTime: 1000,
          duration: 550
        },
        {
          word: 'to',
          syllables: [
            {
              syllable: 'to',
              startTime: 950,
              endTime: 1100,
              duration: 150
            } // OVERLAP with "Birthday"!
          ],
          startTime: 950, // OVERLAP: starts before "Birthday" ends at 1000ms
          endTime: 1100,
          duration: 150
        },
        {
          word: 'you',
          syllables: [
            {
              syllable: 'you',
              startTime: 1100,
              endTime: 1500,
              duration: 400
            }
          ],
          startTime: 1100, // Clean - no overlap
          endTime: 1500,
          duration: 400
        }
      ]
    },
    {
      id: 'line-2',
      lineNumber: 2,
      text: 'Happy Birthday dear friend',
      words: [
        {
          word: 'Happy',
          syllables: [
            {
              syllable: 'Hap',
              startTime: 2000,
              endTime: 2200,
              duration: 200
            },
            {
              syllable: 'py',
              startTime: 2200,
              endTime: 2500,
              duration: 300
            }
          ],
          startTime: 2000,
          endTime: 2500,
          duration: 500
        },
        {
          word: 'Birthday',
          syllables: [
            {
              syllable: 'Birth',
              startTime: 2480,
              endTime: 2680,
              duration: 200
            }, // Small overlap for testing
            {
              syllable: 'day',
              startTime: 2680,
              endTime: 3000,
              duration: 320
            }
          ],
          startTime: 2480, // 20ms overlap
          endTime: 3000,
          duration: 520
        },
        {
          word: 'dear',
          syllables: [
            {
              syllable: 'dear',
              startTime: 3000,
              endTime: 3300,
              duration: 300
            }
          ],
          startTime: 3000, // Clean
          endTime: 3300,
          duration: 300
        },
        {
          word: 'friend',
          syllables: [
            {
              syllable: 'friend',
              startTime: 3300,
              endTime: 3800,
              duration: 500
            }
          ],
          startTime: 3300, // Clean
          endTime: 3800,
          duration: 500
        }
      ]
    }
  ]
}

console.log('🧪 TEST DATA: Created sample song with timing overlaps')
console.log('Expected overlaps:')
console.log('  1. "Happy" (0-500ms) → "Birthday" (450-1000ms) = 50ms overlap')
console.log('  2. "Birthday" (450-1000ms) → "to" (950-1100ms) = 50ms overlap')
console.log('  3. "Happy" (2000-2500ms) → "Birthday" (2480-3000ms) = 20ms overlap')
console.log('')
console.log('To test:')
console.log('1. Load this test data into your app')
console.log('2. Click "Check for Overlaps" button')
console.log('3. Should show 3 overlaps detected')
console.log('4. Click "Fix Overlaps" button')
console.log('5. Should automatically fix all overlaps')
console.log('6. Click "Check for Overlaps" again - should show "Clean timing"')

export default createTestSongWithOverlaps
