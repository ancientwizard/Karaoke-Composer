// Utility helpers for bin scripts (logging, git checks, markdown extraction).

import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

export const log = {
  info: (...args: any[]) => console.log('[info]', ...args),
  warning: (...args: any[]) => console.warn('[warn]', ...args),
  error: (...args: any[]) => console.error('[error]', ...args),
  success: (...args: any[]) => console.log('[ok]', ...args),
}

export function runCommand(cmd: string, opts: any = {})
{
  const res = spawnSync(cmd, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    ...opts
  } as any)
  if ((res as any).error)
  {
    throw (res as any).error
  }
  if ((res as any).status && (res as any).status !== 0)
  {
    const err: any = new Error(`Command failed: ${cmd}`)
    err.status = (res as any).status
    throw err
  }
  return res
}

export const git = {
  getCurrentBranch: (): string | null =>
  {
    try
    {
      const out = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' })
      if ((out as any).status === 0)
      {
        return (out as any).stdout.trim()
      }
    }
    catch (e)
    {
      return null
    }
    return null
  },
  hasUncommittedChanges: (): boolean =>
  {
    try
    {
      const out = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
      return Boolean((out as any).stdout && (out as any).stdout.trim().length > 0)
    }
    catch (e)
    {
      return false
    }
  }
}

export function readScriptMd(filePath: string): string[]
{
  try
  {
    const abs = path.resolve(filePath)
    const src = fs.readFileSync(abs, 'utf8')
    const m = src.match(/\/\*\*?([\s\S]*?)\*\//)
    if (!m)
    {
      return []
    }
    const raw = m[1]
    const lines = raw
      .split(/\r?\n/)
      .map(l => l.replace(/^\s*\*?\s?/, '').replace(/\s+$/, ''))
    while (lines.length && lines[0].trim() === '') lines.shift()
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    return lines
  }
  catch (e)
  {
    return []
  }
}

export function positionalArgs(argv: any[]): string[]
{
  if (!Array.isArray(argv))
  {
    return []
  }
  return argv.filter(a => typeof a === 'string' && !a.startsWith('-'))
}

export default { log, runCommand, git, readScriptMd, positionalArgs }

// VIM: set filetype=typescript :
// END
