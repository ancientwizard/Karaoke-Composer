/**
 * CDG Packet Format Validation Tests
 *
 * Verifies that packets are correctly formatted per CD+G specification
 * and match the reference implementation (CDGMagic_CDGExporter.ts)
 */

import { CDGPacket, CDGCommand, CDGPalette } from '../karaoke/renderers/cdg/CDGPacket'

describe('CDGPacket Format', () => {
  describe('Packet Structure', () => {
    test('packet is exactly 24 bytes', () => {
      const packet = new CDGPacket()
      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer.length).toBe(24)
    })

    test('byte 0 is always 0x09 (CDG command)', () => {
      const packet = new CDGPacket()
      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer[0]).toBe(0x09)
    })

    test('byte 1 contains the instruction', () => {
      const packet = new CDGPacket()
      packet.setCommand(CDGCommand.CDG_MEMORY_PRESET, 0)
      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer[1]).toBe(CDGCommand.CDG_MEMORY_PRESET)
    })

    test('bytes 2-3 are parity Q (should be zero)', () => {
      const packet = new CDGPacket()
      packet.setCommand(CDGCommand.CDG_MEMORY_PRESET, 0)
      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer[2]).toBe(0)
      expect(buffer[3]).toBe(0)
    })

    test('bytes 4-19 contain 16-byte payload', () => {
      const packet = new CDGPacket()
      const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
      packet.setData(testData)
      const buffer = Buffer.from(packet.toBuffer())

      for (let i = 0; i < 16; i++) {
        expect(buffer[4 + i]).toBe(testData[i])
      }
    })

    test('bytes 20-23 are parity P (should be zero)', () => {
      const packet = new CDGPacket()
      packet.setCommand(CDGCommand.CDG_MEMORY_PRESET, 0)
      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer[20]).toBe(0)
      expect(buffer[21]).toBe(0)
      expect(buffer[22]).toBe(0)
      expect(buffer[23]).toBe(0)
    })
  })

  describe('Palette Encoding', () => {
    test('palette has 16 colors', () => {
      const palette = new CDGPalette()
      expect(palette.getColors().length).toBe(16)
    })

    test('rgbToCDG converts 8-bit RGB to 12-bit r4g4b4 format', () => {
      const palette = new CDGPalette()

      // Test white (255, 255, 255) -> (15, 15, 15) = 0xFFF
      const white = (palette as any).rgbToCDG(255, 255, 255)
      expect(white & 0xFFF).toBe(0xFFF)

      // Test black (0, 0, 0) -> (0, 0, 0) = 0x000
      const black = (palette as any).rgbToCDG(0, 0, 0)
      expect(black & 0xFFF).toBe(0x000)

      // Test red (255, 0, 0) -> (15, 0, 0) = 0xF00
      const red = (palette as any).rgbToCDG(255, 0, 0)
      expect((red >> 8) & 0x0F).toBe(15)
      expect((red >> 4) & 0x0F).toBe(0)
      expect(red & 0x0F).toBe(0)
    })

    test('palette load packets have correct structure', () => {
      const palette = new CDGPalette()
      const packets = palette.generateLoadPackets()

      expect(packets.length).toBe(2) // LOW and HIGH

      // Check LOW (colors 0-7)
      const lowBuffer = Buffer.from(packets[0].toBuffer())
      expect(lowBuffer[0]).toBe(0x09)
      expect(lowBuffer[1]).toBe(CDGCommand.CDG_LOAD_COLOR_TABLE_LOW)

      // Check HIGH (colors 8-15)
      const highBuffer = Buffer.from(packets[1].toBuffer())
      expect(highBuffer[0]).toBe(0x09)
      expect(highBuffer[1]).toBe(CDGCommand.CDG_LOAD_COLOR_TABLE_HIGH)
    })

    test('palette color bytes follow CD+G encoding', () => {
      // Test the encoding format per reference:
      // Byte 0: (r4 << 2) | (g4 >> 2)
      // Byte 1: (b4 & 0x0F) | ((g4 & 0x03) << 4)

      const palette = new CDGPalette()
      palette.setColor(0, 255, 255, 255) // White

      const packets = palette.generateLoadPackets()
      const buffer = Buffer.from(packets[0].toBuffer())

      // First color (white = r15, g15, b15)
      const byte0 = buffer[4] // Data[0] is at buffer[4]
      const byte1 = buffer[5] // Data[1] is at buffer[5]

      // byte0 = (15 << 2) | (15 >> 2) = 60 | 3 = 0x3F
      expect(byte0).toBe(0x3F)

      // byte1 = (15 & 0x0F) | ((15 & 0x03) << 4) = 15 | (3 << 4) = 15 | 48 = 63
      expect(byte1).toBe(0x3F)
    })
  })

  describe('Tile Block Packets', () => {
    test('tile block packet has correct structure', () => {
      const pixels = new Array(12).fill(0xFF)
      const packet = CDGPacket.tileBlock(0, 1, 5, 10, pixels, false)

      const buffer = Buffer.from(packet.toBuffer())

      // Check command
      expect(buffer[0]).toBe(0x09)
      expect(buffer[1]).toBe(CDGCommand.CDG_TILE_BLOCK)

      // Check payload layout
      // Data[0] = color0, Data[1] = color1, Data[2] = row, Data[3] = col, Data[4..15] = pixels
      expect(buffer[4]).toBe(0) // color0
      expect(buffer[5]).toBe(1) // color1
      expect(buffer[6]).toBe(5) // row
      expect(buffer[7]).toBe(10) // col

      // Check pixel data (12 bytes) - pixels are at data[4..15] which is buffer[8..19]
      for (let i = 0; i < 12; i++) {
        expect(buffer[8 + i]).toBe(0xFF)
      }
    })

    test('tile block XOR packet uses correct instruction', () => {
      const pixels = new Array(12).fill(0x55)
      const packet = CDGPacket.tileBlock(0, 1, 0, 0, pixels, true)

      const buffer = Buffer.from(packet.toBuffer())
      expect(buffer[1]).toBe(CDGCommand.CDG_TILE_BLOCK_XOR)
    })
  })

  describe('Memory Preset', () => {
    test('memory preset packet clears screen', () => {
      const packet = CDGPacket.memoryPreset(0)
      const buffer = Buffer.from(packet.toBuffer())

      expect(buffer[0]).toBe(0x09)
      expect(buffer[1]).toBe(CDGCommand.CDG_MEMORY_PRESET)
      expect(buffer[4]).toBe(0) // Color index
    })
  })

  describe('Border Preset', () => {
    test('border preset packet sets border color', () => {
      const packet = CDGPacket.borderPreset(5)
      const buffer = Buffer.from(packet.toBuffer())

      expect(buffer[0]).toBe(0x09)
      expect(buffer[1]).toBe(CDGCommand.CDG_BORDER_PRESET)
      expect(buffer[4]).toBe(5) // Color index
    })
  })
})
