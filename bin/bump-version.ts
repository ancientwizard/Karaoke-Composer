#!/usr/bin/env -S npx tsx

/*
# bump-version

Summary: Interactively bump the package.json version (increments patch by default).

Usage:
  $ bump-version.ts --run [path/to/package.json]

Options:
  --help   Show this help (outputs this comment block as markdown)
  --run    Execute the bump (without this the script prints usage)
*/

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath      } from 'url'
import { readScriptMd, log  } from '@/utils/bin-utils'

const scriptPath = fileURLToPath(import.meta.url)

const args = process.argv.slice(2)
if (args.includes('--help'))
{
  console.log(readScriptMd(scriptPath).join('\n'))
  process.exit(0)
}
const shouldRun = args.includes('--run')
if (!shouldRun)
{
  console.log('Usage: bump-version.ts --run [path/to/package.json]')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}

const files = args.filter(a => !a.startsWith('--'))
const packageJsonPath = files[0]
  ? path.resolve(files[0])
  : path.resolve(__dirname, '../package.json')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const prompt = (query: string) => new Promise<string>((resolve) => rl.question(query, resolve))

const bumpVersion = async () =>
{
  try
  {
    if (!fs.existsSync(packageJsonPath))
    {
      log.warning(`File not found: ${packageJsonPath}`)
      log.info('Copying real package.json to the dummy location...')
      const realPackageJsonPath = path.resolve(__dirname, '../package.json')
      fs.copyFileSync(realPackageJsonPath, packageJsonPath)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const currentVersion = packageJson.version

    log.info(`Current version: ${currentVersion}`)

    const [major, minor, patch] = currentVersion.split('.').map(Number)
    const newVersion = `${major}.${minor}.${patch + 1}`

    const userInput = await prompt(`Enter new version (default: ${newVersion}): `)
    const finalVersion = userInput.trim() || newVersion

    packageJson.version = finalVersion
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

    log.success(`Version updated to ${finalVersion}`)
  }
  catch (error)
  {
    log.error('Failed to bump version')
    console.error(error)
  }
  finally
  {
    rl.close()
  }
}

bumpVersion()

// VIM: set filetype=typescript :
// END