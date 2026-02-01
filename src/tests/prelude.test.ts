import synthesizePrelude from '../../src/cdg/prelude'

describe('synthesizePrelude', () => {
  it('is deterministic and produces palette/border packets', () => {
    const parsed = {
      clips: [
        {
          type: 'TextClip',
          start: 0,
          foreground_color: 1,
          background_color: 0,
          text: 'Hello',
          events: [ {
 clip_x_offset: 6, clip_y_offset: 24 
} ]
        }
      ]
    }
    const a = synthesizePrelude(parsed, { pps: 300 })
    const b = synthesizePrelude(parsed, { pps: 300 })
    expect(a).toEqual(b)
    // should include at least palette (non-empty) and some packets
    expect(a.length).toBeGreaterThan(0)
    const first = a[0]
    expect(first && first.length).toBeGreaterThan(0)
  })
})
