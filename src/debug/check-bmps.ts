#!/usr/bin/env -S tsx
import fs from 'fs'
import path from 'path'

async function loadImage(filePath: string) {
  const jm = await import('jimp')
  const dataBuf = fs.readFileSync(filePath)
  async function tryRead(arg: any) {
    if (typeof (jm as any).read === 'function') return await (jm as any).read(arg)
    if ((jm as any).default && typeof (jm as any).default.read === 'function') return await (jm as any).default.read(arg)
    if ((jm as any).Jimp && typeof (jm as any).Jimp.read === 'function') return await (jm as any).Jimp.read(arg)
    throw new Error('No readable Jimp API found')
  }
  try {
    return await tryRead(filePath)
  } catch (e) {
    return await tryRead(dataBuf)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 1) { console.error('Usage: npx tsx src/debug/check-bmps.ts <parsed.json>'); process.exit(2) }
  const inPath = argv[0]
  const parsed = JSON.parse(fs.readFileSync(inPath, 'utf8'))
  const seen = new Set<string>()
  const results: Array<{file: string, ok: boolean, reason?: string, width?: number, height?: number}> = []
  for (const clip of parsed.clips || []) {
    if (clip.type === 'BMPClip') {
      for (const ev of clip.events || []) {
        const bmpRel = ev.bmp_path || clip.bmp_path
        if (!bmpRel) continue
        const relNorm = bmpRel.replace(/\\/g, '/')
        const candidates = [
          path.join(path.dirname(inPath), relNorm),
          path.join(path.dirname(inPath), path.basename(relNorm)),
          path.join('reference', 'cd+g-magic', 'Sample_Files', path.basename(relNorm)),
        ]
        let bmpPath: string | null = null
        for (const c of candidates) if (fs.existsSync(c)) { bmpPath = c; break }
        if (!bmpPath) {
          results.push({
            file: bmpRel,
            ok: false,
            reason: 'not found',
          })
          continue
        }
        if (seen.has(bmpPath)) continue
        seen.add(bmpPath)
        try {
          const img: any = await loadImage(bmpPath)
          results.push({
            file: bmpPath,
            ok: true,
            width: img.bitmap.width,
            height: img.bitmap.height,
          })
        } catch (e) {
          results.push({
            file: bmpPath,
            ok: false,
            reason: (e as any).message || String(e),
          })
        }
      }
    }
  }
  console.log('BMP load results:')
  for (const r of results) {
    if (r.ok) console.log(' OK ', r.file, `${r.width}x${r.height}`)
    else console.log('FAIL', r.file, r.reason)
  }
}

main().catch((e) => { console.error(e); process.exit(2) })

export default main
