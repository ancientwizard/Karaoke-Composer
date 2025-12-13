import fs from 'fs';
import { CMPParser } from '../ts/cd+g-magic/CMPParser';

const buffer = fs.readFileSync('cdg-projects/sample_project_03b.cmp');
const parser = new CMPParser(new Uint8Array(buffer));
const project = parser.parse();

// Find all text clips
for (const clip of project.clips) {
  if (clip.type === 'TextClip') {
    console.log(`\n===== TextClip at packet ${clip.start}, duration ${clip.duration} =====`);
    console.log(`Font: ${clip.data.fontFace}`);
    console.log(`Size: ${clip.data.fontSize}pt`);
    console.log(`Karaoke mode: ${clip.data.karaokeMode}`);
    console.log(`Text: "${clip.data.textContent}"`);
    console.log(`Events: ${clip.data.events.length}`);
    
    for (let i = 0; i < Math.min(3, clip.data.events.length); i++) {
      const event = clip.data.events[i];
      console.log(`  Event ${i}:`);
      console.log(`    Time offset: ${event.clipTimeOffset} packets`);
      console.log(`    Duration: ${event.clipTimeDuration} packets`);
      console.log(`    Position: (${event.xOffset}, ${event.yOffset})`);
      console.log(`    Size: ${event.width}×${event.height}`);
      console.log(`    Line: ${event.clipLineNum}, Word: ${event.clipWordNum}`);
    }
  }
}
