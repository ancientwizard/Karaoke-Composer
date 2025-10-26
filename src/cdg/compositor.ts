// Minimal compositor: multi-layer comp buffer and helpers to obtain composited 6x12 font block
import { VRAM } from './encoder';

export const COMP_LAYERS = 8;

export class Compositor {
  compWidth: number;
  compHeight: number;
  layers: number;
  buffer: Uint16Array; // comp_width * comp_height * layers, values 0..255 or 256 transparent
  lastPreset = 0;

  constructor(compWidth = 300, compHeight = 216, layers = COMP_LAYERS) {
    this.compWidth = compWidth;
    this.compHeight = compHeight;
    this.layers = layers;
    this.buffer = new Uint16Array(this.compWidth * this.compHeight * this.layers);
    // default transparent value = 256
    this.buffer.fill(256);
  }

  clearToPreset(presetIndex: number) {
    this.buffer.fill(256);
    this.lastPreset = presetIndex;
  }

  // Return a composited 6x12 pixel block (array of rows) at block coordinates
  getCompositedBlock(blockX: number, blockY: number): number[][] {
    const out: number[][] = [];
    const px = blockX * 6;
    const py = blockY * 12;
    const layerSpan = this.compWidth * this.compHeight;
    for (let y = 0; y < 12; y++) {
      const row: number[] = [];
      for (let x = 0; x < 6; x++) {
        const pixelOffset = (py + y) * this.compWidth + (px + x);
        // default to last preset (virtual layer 0)
        let value = this.lastPreset;
        for (let z = 0; z < this.layers; z++) {
          const layerVal = this.buffer[layerSpan * z + pixelOffset];
          if (layerVal < 256) { value = layerVal; break; }
        }
        row.push(value & 0xFF);
      }
      out.push(row);
    }
    return out;
  }

  // Copy a 6x12 block into VRAM at block coords (for finalizing after font writes)
  copyBlockToVram(vram: VRAM, blockX: number, blockY: number, blockPixels: number[][]) {
    vram.writeBlock(blockX, blockY, blockPixels);
  }

  // Apply a block into a given compositor layer (0..layers-1)
  applyBlockToLayer(layer: number, blockX: number, blockY: number, blockPixels: number[][]) {
    const px = blockX * 6;
    const py = blockY * 12;
    const layerSpan = this.compWidth * this.compHeight;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 6; x++) {
        const pixelOffset = (py + y) * this.compWidth + (px + x);
        this.buffer[layerSpan * layer + pixelOffset] = blockPixels[y][x] & 0xFF;
      }
    }
  }
}

export default Compositor;
