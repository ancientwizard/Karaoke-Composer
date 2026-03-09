#!/usr/bin/env -S npx tsx

/*
# deploy-gh-pages

Summary: Build and deploy the `dist/` output to the `gh-pages` branch.

Usage:
  $ deploy-gh-pages.ts [--dry-run] [--override-uncommitted] --run

Options:
  --help   Show this help (outputs this comment block as markdown)
  --run    Execute the deployment (without this the script prints usage)
  --dry-run  Do everything except push to remote
  --override-uncommitted  Proceed even with uncommitted changes
*/
import { runCommand, git, readScriptMd } from '../src/utils/bin-utils'
import fs from 'fs'
import path from 'path'
import os from 'os'
import ora from 'ora'
import minimist from 'minimist'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const scriptPath = fileURLToPath(import.meta.url)

const rawArgs = minimist(process.argv.slice(2))
if (rawArgs.help)
{
  const md = readScriptMd(scriptPath)
  console.log(md.join('\n'))
  process.exit(0)
}
const shouldRun = Boolean(rawArgs.run)
if (!shouldRun)
{
  console.log('Usage: deploy-gh-pages.ts [--dry-run] [--override-uncommitted] --run')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}
const args = rawArgs
const isDryRun = args['dry-run']
const overrideUncommitted = args['override-uncommitted']

const distPath = path.resolve('./dist')
const spinner = ora()
const deployBranch = 'gh-pages'
const dryRunBranch = 'gh-pages-dry-run'

const getVersion = () =>
{
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
  return packageJson.version
}

const deploy = async () =>
{
  try
  {
    spinner.start('Starting deployment to GitHub Pages...')

    spinner.text = 'Checking current branch...'
    const currentBranch = git.getCurrentBranch()
    if (currentBranch !== 'main')
    {
      throw new Error(`You must be on the 'main' branch to deploy. Current branch: ${currentBranch}`)
    }

    spinner.text = 'Checking for uncommitted changes...'
    if (git.hasUncommittedChanges())
    {
      if (overrideUncommitted)
      {
        console.warn('Warning: You have uncommitted changes. Proceeding due to --override-uncommitted flag.')
      }
      else
      {
        throw new Error('You have uncommitted changes. Please commit or stash them before deploying.')
      }
    }

    const version = getVersion()

    spinner.text = 'Building the project for GitHub Pages...'
    runCommand('npm run build')

    if (!fs.existsSync(distPath))
    {
      throw new Error('Build failed: dist/ directory does not exist.')
    }

    spinner.text = 'Snapshotting dist/ to a temporary staging directory...'
    const stagedDistPath = fs.mkdtempSync(path.join(os.tmpdir(), 'karaoke-composer-gh-pages-'))
    fs.readdirSync(distPath).forEach((entry: string) =>
    {
      const src = path.join(distPath, entry)
      const dst = path.join(stagedDistPath, entry)
      fs.cpSync(src, dst, { recursive: true })
    })

    const targetBranch = isDryRun ? dryRunBranch : deployBranch
    if (isDryRun)
    {
      spinner.text = `Preparing dry-run branch ${dryRunBranch} from ${deployBranch}...`
      runCommand(`git switch -C ${dryRunBranch} ${deployBranch}`)
    }
    else
    {
      spinner.text = `Switching to deployment branch ${deployBranch}...`
      runCommand(`git switch ${deployBranch}`)
    }

    spinner.text = 'Cleaning tracked files from deployment branch...'
    runCommand('git rm -rf .')

    spinner.text = 'Cleaning untracked files while preserving .git and node_modules/...'
    fs.readdirSync('.').forEach((file: string) =>
    {
      if (file !== '.git' && file !== 'node_modules')
      {
        fs.rmSync(file, { recursive: true, force: true })
      }
    })

    spinner.text = 'Moving build files to the root...'
    fs.readdirSync(stagedDistPath).forEach((entry: string) =>
    {
      const src = path.join(stagedDistPath, entry)
      const dst = path.resolve(entry)
      fs.cpSync(src, dst, { recursive: true })
    })

    spinner.text = 'Removing temporary staging directory...'
    fs.rmSync(stagedDistPath, { recursive: true, force: true })

    spinner.text = 'Staging and committing changes...'
    runCommand("git add -A . ':(exclude)node_modules'")
    runCommand(`git commit -m "Deploy GitHub Pages v${version}"`)

    if (isDryRun)
    {
      spinner.succeed(`Dry-run mode: All tasks completed except pushing to GitHub. Review ${dryRunBranch} locally.`)
      console.log('[Dry-run] Skipping push to remote repository.')
      return
    }

    spinner.text = `Pushing changes to remote branch ${targetBranch}...`
    runCommand(`git push origin ${targetBranch}`)

    spinner.text = 'Switching back to main branch...'
    runCommand('git switch main')

    spinner.succeed(`Deployment to GitHub Pages completed successfully on branch ${deployBranch}!`)
  }
  catch (error)
  {
    spinner.fail('Deployment failed. Rolling back changes...')
    if (!isDryRun) runCommand('git switch main')
    console.error(error)
    process.exit(1)
  }
}

deploy()

// VIM: set filetype=typescript :
// END
