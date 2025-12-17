import GeneratorByFunction from '@/debug/generate-by-function'
import { CDGPalette, CDGCommand } from '@/karaoke/renderers/cdg/CDGPacket'
import { COPY_FONT } from '@/cdg/encoder'

describe('GeneratorByFunction basic usage', () => {
  test('produces a non-empty packet stream and packets are 24 bytes', () => {
    const g = new GeneratorByFunction({ pps: 300 })
    // Confirm default palette matches the project's CDGPalette default
    const defaultPal = new CDGPalette().getColors()
    expect(g.getPalette()).toEqual(defaultPal)
    // console.log('Default palette:', g.getPalette())
    // Mutate palette and use reset to restore defaults
    g.setLowerColor(1, 10, 20, 30)
    expect(g.getPalette()).not.toEqual(defaultPal)
    g.resetPaletteToDefault()
    expect(g.getPalette()).toEqual(defaultPal)
    // tweak a couple of palette colors
    g.setLowerColor(1, 255, 255, 0)
    g.setUpperColor(0, 128, 0, 255)
    // set border and memory preset
    g.setBorderColor(1)
    g.clearScreen(0)
    // draw a tiny pattern into one block
    g.setBlockBit(10, 5, 0, 0, 1)
    g.setBlockBit(10, 5, 1, 0, 1)
    g.setBlockBit(10, 5, 2, 0, 1)
    // render blocks and get packet stream
    g.renderAllBlocks()
    const packets = g.getPacketStream()
    expect(packets.length).toBeGreaterThan(0)
    for (const p of packets) {
      expect(p).toBeInstanceOf(Uint8Array)
      expect(p.length).toBe(24)
    }
  })

  test.skip('palette setters emit palette packets into the timeline', () => {
    const g = new GeneratorByFunction({ pps: 300 })
    const defaultPal = new CDGPalette().getColors()
    expect(g.getPalette()).toEqual(defaultPal)

    // Mutate a lower color which should append palette load packets to timeline
    g.setLowerColor(1, 10, 20, 30)
    const pkts = g.getPacketStream()
    // count palette load packet occurrences (low=30, high=31)
    const palCount = pkts.filter((p) => (p[1] === CDGCommand.CDG_LOAD_COLOR_TABLE_LOW || p[1] === CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH)).length
    expect(palCount).toBeGreaterThanOrEqual(2)
  })

  test('advancePacks/advanceSeconds inserts empty packets before block packets', () => {
    const g = new GeneratorByFunction({ pps: 300 })
    // insert 5 empty packets
    g.advancePacks(5)
    // then draw a small block and render
    g.setBlockBit(1, 1, 0, 0, 1)
    g.renderAllBlocks()
    const pkts = g.getPacketStream()
    // find index of first COPY_FONT packet
    const firstCopyIdx = pkts.findIndex((p) => p[1] === COPY_FONT)
    expect(firstCopyIdx).toBeGreaterThanOrEqual(0)
    // count how many empty packets (all zeros) appear before that index
    const emptiesBefore = pkts.slice(0, firstCopyIdx).filter((p) => p.every((b: number) => b === 0)).length
    expect(emptiesBefore).toBeGreaterThanOrEqual(5)
  })

  test('clearScreen and setBorderColor emit correct preset packets', () => {
    const g = new GeneratorByFunction({ pps: 300 })
    g.clearScreen(3)
    g.setBorderColor(2)
    const pkts = g.getPacketStream()
    const hasMemoryPreset = pkts.some((p) => p[1] === CDGCommand.CDG_MEMORY_PRESET)
    const hasBorderPreset = pkts.some((p) => p[1] === CDGCommand.CDG_BORDER_PRESET)
    expect(hasMemoryPreset).toBeTruthy()
    expect(hasBorderPreset).toBeTruthy()
  })

  test('prependEmptyPacks and scheduleScrollCopy produce expected preamble and scroll packet', () => {
    const g = new GeneratorByFunction({
      pps: 300,
      autoRenderBlocks: false,
      emitPaletteOnWrite: false,
      emitBorderOnWrite: false,
      autoEmitPaletteOnChange: false,
    })

  g.advancePacks(250)
    g.scheduleScrollCopy()

    const pkts = g.getPacketStream()
    expect(pkts.length).toBeGreaterThanOrEqual(251)

    // first 250 packets should be zero-filled
    for (let i = 0; i < 250; i++) {
      expect(pkts[i].every((b: number) => b === 0)).toBe(true)
    }

    const scrollIdx = pkts.findIndex((p) => ((p[1] & 0x3F) === CDGCommand.CDG_SCROLL_COPY))
    expect(scrollIdx).toBeGreaterThanOrEqual(0)
    const sp = pkts[scrollIdx]
    expect(sp[0]).toBe(0x09)
    expect((sp[1] & 0x3F)).toBe(CDGCommand.CDG_SCROLL_COPY)
    expect(sp[3]).toBe(0)
    expect(sp[4]).toBe(0)
    expect(sp[5]).toBe(0)
  })
})
