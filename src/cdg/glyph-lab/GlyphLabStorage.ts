/**
 * Glyph Lab Storage
 *
 * Browser persistence helpers for captured glyph sets.
 */

import type { GlyphSetExport } from './types'

export class GlyphLabStorage
{
  public static readonly STORAGE_KEY = 'karaoke-composer:glyph-lab:set:v1'

  public static save(data: GlyphSetExport): void
  {
    if (typeof window === 'undefined' || !window.localStorage)
    {
      throw new Error('Local storage is not available in this environment')
    }

    window.localStorage.setItem(GlyphLabStorage.STORAGE_KEY, JSON.stringify(data))
  }

  public static load(): GlyphSetExport | null
  {
    if (typeof window === 'undefined' || !window.localStorage)
    {
      return null
    }

    const raw = window.localStorage.getItem(GlyphLabStorage.STORAGE_KEY)
    if (!raw)
    {
      return null
    }

    return GlyphLabStorage.parse(raw)
  }

  public static clear(): void
  {
    if (typeof window === 'undefined' || !window.localStorage)
    {
      return
    }

    window.localStorage.removeItem(GlyphLabStorage.STORAGE_KEY)
  }

  public static parse(raw: string): GlyphSetExport | null
  {
    try
    {
      const parsed = JSON.parse(raw) as GlyphSetExport
      if (!parsed || !Array.isArray(parsed.glyphs) || !parsed.config)
      {
        return null
      }

      return parsed
    }
    catch
    {
      return null
    }
  }
}

// VIM: set filetype=typescript :
// END
