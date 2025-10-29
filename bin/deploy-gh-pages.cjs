#!/usr/bin/env node
/*
# deploy-gh-pages

Summary: Build and deploy the `dist/` output to a new `gh-pages/vX.Y.Z` branch.

Usage:
  $ deploy-gh-pages.cjs [--dry-run] [--override-uncommitted] --run

Options:
  --help   Show this help (outputs this comment block as markdown)
  --run    Execute the deployment (without this the script prints usage)
  --dry-run  Do everything except push to remote
  --override-uncommitted  Proceed even with uncommitted changes
*/
const {
 runCommand, git, readScriptMd 
} = require('../src/utils/bin-utils.cjs');
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const minimist = require('minimist');
const { readFileSync } = require('fs');

const rawArgs = minimist(process.argv.slice(2));
if (rawArgs.help) {
  // print the MD header from this file
  const md = readScriptMd(__filename);
  console.log(md.join('\n'))
  process.exit(0)
}
const shouldRun = Boolean(rawArgs.run)
if (!shouldRun) {
  console.log('Usage: deploy-gh-pages.cjs [--dry-run] [--override-uncommitted] --run')
  console.log('Use --help to show extended usage (markdown).')
  process.exit(0)
}
const args = rawArgs
const isDryRun = args['dry-run'];
const overrideUncommitted = args['override-uncommitted'];

const distPath = path.resolve('./dist');

const spinner = ora();

const getVersion = () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  return packageJson.version;
};

const deploy = async () => {
  try {
    spinner.start('Starting deployment to GitHub Pages...');

    // Pre-flight checks
    spinner.text = 'Checking current branch...';
    const currentBranch = git.getCurrentBranch();
    if (currentBranch !== 'main') {
      throw new Error(`You must be on the 'main' branch to deploy. Current branch: ${currentBranch}`);
    }

    spinner.text = 'Checking for uncommitted changes...';
    if (git.hasUncommittedChanges()) {
      if (overrideUncommitted) {
        console.warn('Warning: You have uncommitted changes. Proceeding due to --override-uncommitted flag.');
      } else {
        throw new Error('You have uncommitted changes. Please commit or stash them before deploying.');
      }
    }

    // Get version from package.json
    const version = getVersion();
    const branchName = `gh-pages/v${version}`;

    // Build the project
    spinner.text = 'Building the project for GitHub Pages...';
    runCommand('npm run build');

    if (!fs.existsSync(distPath)) {
      throw new Error('Build failed: dist/ directory does not exist.');
    }

    // Create and switch to the new branch
    spinner.text = `Creating and switching to branch ${branchName}...`;
    runCommand(`git switch -c ${branchName}`);

    // Clean the branch but preserve critical files
    spinner.text = 'Cleaning the branch but preserving critical files...';
    fs.readdirSync('.').forEach((file) => {
      if (file !== '.git' && file !== '.gitignore' && file !== 'node_modules' && file !== 'bin' && file !== 'dist') {
        fs.rmSync(file, {
          recursive: true,
          force: true,
        });
      }
    });

    // Move build files to the root
    spinner.text = 'Moving build files to the root...';
    fs.cpSync(distPath, './', { recursive: true });

    // Stage and commit changes
    spinner.text = 'Staging and committing changes...';
    runCommand('git add .');
    runCommand(`git commit -m "Deploy to ${branchName}"`);

    if (isDryRun) {
      spinner.succeed(`Dry-run mode: All tasks completed except pushing to GitHub. Branch ${branchName} created locally.`);
      console.log('[Dry-run] Skipping push to remote repository.');
      return;
    }

    // Push changes to remote
    spinner.text = `Pushing changes to remote branch ${branchName}...`;
    runCommand(`git push origin ${branchName}`);

    // Switch back to main branch
    spinner.text = 'Switching back to main branch...';
    runCommand('git switch main');

    spinner.succeed(`Deployment to GitHub Pages completed successfully on branch ${branchName}!`);
  } catch (error) {
    spinner.fail('Deployment failed. Rolling back changes...');
    if (!isDryRun) {
      runCommand('git switch main');
    }
    console.error(error);
    process.exit(1);
  }
};

deploy();
