/**
 * Font Manager - Handles loading real fonts from various sources
 *
 * This system loads actual TTF font files for high-quality CD+G rendering.
 * - Attempts to download fonts from reliable sources (Liberation Fonts)
 * - Supports local font files
 * - Caches fonts locally for performance
 * - Fallback to bitmap if real fonts unavailable
 *
 * Font Installation (Optional - for best results):
 * Place real font files in ./font-cache/ directory:
 *   - arial.ttf (or use Liberation Sans)
 *   - courier.ttf (or use Liberation Mono)
 *   - times.ttf (or use Liberation Serif)
 *
 * Alternative: Fonts can be downloaded from:
 * https://github.com/liberationfonts/liberation-fonts/releases
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

/**
 * Interface for font file info
 */
export interface FontFileInfo {
  name: string;           // e.g., "Arial"
  index: number;          // 0-7 for CDG font indices
  path: string;          // Path to TTF file
  url?: string;          // Optional download URL
}

/**
 * Font library manager
 */
export class FontManager {
  private fontCacheDir: string;
  private fontsInfo: Map<number, FontFileInfo> = new Map();

  /**
   * Initialize font manager
   * @param cacheDir Directory to store cached fonts (default: ./font-cache)
   */
  constructor(cacheDir: string = './font-cache') {
    this.fontCacheDir = cacheDir;
    this.initializeFontRegistry();
  }

  /**
   * Register fonts and their sources
   */
  private initializeFontRegistry(): void {
    // Font index 0 = Arial (fallback to local DejaVuSans)
    this.fontsInfo.set(0, {
      name: 'Arial',
      index: 0,
      path: path.join(this.fontCacheDir, 'arial.ttf'),
      url: undefined  // Will use local fonts only
    });

    // Font index 1 = Courier (fallback to local DejaVuSansMono)
    this.fontsInfo.set(1, {
      name: 'Courier',
      index: 1,
      path: path.join(this.fontCacheDir, 'courier.ttf'),
      url: undefined  // Will use local fonts only
    });

    // Font index 2 = Times New Roman (fallback to local DejaVuSerif)
    this.fontsInfo.set(2, {
      name: 'Times New Roman',
      index: 2,
      path: path.join(this.fontCacheDir, 'times.ttf'),
      url: undefined  // Will use local fonts only
    });
  }

  /**
   * Get font data for a specific index
   * @param fontIndex 0-7
   * @returns Font file buffer or null if unavailable
   */
  async getFontData(fontIndex: number): Promise<ArrayBuffer | null> {
    const fontInfo = this.fontsInfo.get(fontIndex);
    if (!fontInfo) {
      return null;
    }

    // Check if font exists in cache directory first
    if (fs.existsSync(fontInfo.path)) {
      try {
        const buffer = fs.readFileSync(fontInfo.path);
        console.log(`[FontManager] Loaded ${fontInfo.name} from cache`);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      } catch (e) {
        console.warn(`Failed to read font from ${fontInfo.path}:`, e);
      }
    }

    // Try local fonts directory as fallback
    const localFontPath = path.join('./fonts', this.getLocalFontFilename(fontIndex));
    if (fs.existsSync(localFontPath)) {
      try {
        const buffer = fs.readFileSync(localFontPath);
        console.log(`[FontManager] Using local font ${fontInfo.name} from ./fonts`);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      } catch (e) {
        console.warn(`Failed to read local font from ${localFontPath}:`, e);
      }
    }

    // Try to download if URL provided
    if (fontInfo.url) {
      return await this.downloadFont(fontIndex, fontInfo);
    }

    return null;
  }

  /**
   * Get the local font filename for a given font index
   */
  private getLocalFontFilename(fontIndex: number): string {
    switch (fontIndex) {
      case 0: return 'DejaVuSans.ttf';       // Arial → DejaVuSans
      case 1: return 'DejaVuSansMono.ttf';   // Courier → DejaVuSansMono
      case 2: return 'DejaVuSerif.ttf';      // Times → DejaVuSerif
      default: return 'DejaVuSans.ttf';
    }
  }

  /**
   * Download font from URL and cache it
   */
  private async downloadFont(fontIndex: number, info: FontFileInfo): Promise<ArrayBuffer | null> {
    // Ensure cache directory exists
    if (!fs.existsSync(this.fontCacheDir)) {
      fs.mkdirSync(this.fontCacheDir, { recursive: true });
    }

    if (!info.url) {
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`[FontManager] Download timeout for ${info.name}`);
        resolve(null);
      }, 10000);  // 10 second timeout

      https.get(info.url!, (res) => {
        clearTimeout(timeout);
        
        if (res.statusCode !== 200) {
          console.warn(`[FontManager] Download failed for ${info.name}: HTTP ${res.statusCode}`);
          resolve(null);
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(info.path, buffer);
            console.log(`[FontManager] Downloaded and cached ${info.name}`);
            resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
          } catch (e) {
            console.warn(`[FontManager] Failed to cache ${info.name}:`, e);
            resolve(null);
          }
        });
      }).on('error', (e) => {
        clearTimeout(timeout);
        console.warn(`[FontManager] Download error for ${info.name}:`, e.message);
        resolve(null);
      });
    });
  }

  /**
   * Get font name for display
   */
  getFontName(fontIndex: number): string {
    return this.fontsInfo.get(fontIndex)?.name ?? `Font ${fontIndex}`;
  }

  /**
   * Get font path (local only, no download)
   */
  getFontPath(fontIndex: number): string | null {
    const info = this.fontsInfo.get(fontIndex);
    if (info && fs.existsSync(info.path)) {
      return info.path;
    }
    return null;
  }
}

// VIM: set et sw=2 ts=2 :
// END
