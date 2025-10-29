import fs from 'fs'
import { VRAM } from './encoder'
// Note: numeric CDG command codes are used directly (e.g. 1=MEMORY_PRESET, 6=TILE_BLOCK, 38=TILE_BLOCK_XOR)

export class ReferenceReplayer {
  refBuf: Buffer
  pktSize: number
  refPktCount: number
  snapshotInterval: number
  snapshots: { idx: number; data: Uint8Array }[]

  constructor(refPath: string, pktSize = 24, snapshotInterval = 512) {
    this.refBuf = fs.readFileSync(refPath)
    this.pktSize = pktSize
    this.refPktCount = Math.floor(this.refBuf.length / this.pktSize)
    this.snapshotInterval = Math.max(1, snapshotInterval)
    this.snapshots = []
    this.buildSnapshots()
  }

  buildSnapshots() {
    const v = new VRAM()
    // initial snapshot at index 0
    this.snapshots.push(
      {
        idx: 0,
        data: new Uint8Array(v.data),
      }
    )
    for (let i = 0; i < this.refPktCount; i++) {
      this.applyPacketToVRAM(i, v)
      if ((i + 1) % this.snapshotInterval === 0) {
        this.snapshots.push(
          {
            idx: i + 1,
            data: new Uint8Array(v.data),
          }
        )
      }
    }
  }

  applyPacketToVRAM(pktIndex: number, v: VRAM) {
    const base = pktIndex * this.pktSize
    if (base + this.pktSize > this.refBuf.length) return
    const buf = this.refBuf
  const cmd = (buf[base + 1] & 0x3F) as number
    // MEMORY_PRESET
  if (cmd === 1 /* CDG_MEMORY_PRESET */) {
      const color = buf[base + 3] & 0x3F
      v.clear(color & 0x0F)
      return
    }
    // TILE BLOCK normal / xor
  if (cmd === 6 /* CDG_TILE_BLOCK */ || cmd === 38 /* CDG_TILE_BLOCK_XOR */) {
      const row = buf[base + 5] & 0x3F
      const col = buf[base + 6] & 0x3F
      const colorA = buf[base + 3] & 0x3F
      const colorB = buf[base + 4] & 0x3F
  const isXor = (cmd === 38)
      const blockPixels: number[][] = []
      for (let y = 0; y < 12; y++) {
        const lineMask = buf[base + 7 + y] & 0x3F
        const rowArr: number[] = []
        for (let x = 0; x < 6; x++) {
          const bit = (lineMask >> (5 - x)) & 0x01
          if (isXor) {
            const prev = v.getPixel(col * 6 + x, row * 12 + y) & 0xFF
            rowArr.push((prev ^ (colorB & 0x0F)) & 0x0F)
          } else {
            rowArr.push(bit ? (colorB & 0x0F) : (colorA & 0x0F))
          }
        }
        blockPixels.push(rowArr)
      }
      v.writeBlock(col, row, blockPixels)
      return
    }
    // other commands ignored for VRAM
  }

  // Return a copy of VRAM state after applying packets [0..pktIndex-1]
  getVRAMAt(pktIndex: number): VRAM {
    if (pktIndex <= 0) return new VRAM()
    if (pktIndex > this.refPktCount) pktIndex = this.refPktCount
    // find nearest snapshot with idx <= pktIndex
    let snap = this.snapshots[0]
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].idx <= pktIndex) { snap = this.snapshots[i]; break }
    }
    const v = new VRAM()
    v.data = new Uint8Array(snap.data)
    // apply remaining packets from snap.idx up to pktIndex-1
    for (let i = snap.idx; i < pktIndex; i++) this.applyPacketToVRAM(i, v)
    return v
  }

  // Return raw packet slice Buffer for index..index+len-1
  getPacketSlice(index: number, len: number) {
    const start = index * this.pktSize
    const end = Math.min(this.refBuf.length, start + len * this.pktSize)
    return this.refBuf.slice(start, end)
  }
}

export default ReferenceReplayer
