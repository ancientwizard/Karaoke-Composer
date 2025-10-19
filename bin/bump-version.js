import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { log } from './utils.js';

// Get the file path from arguments or default to the real package.json
const packageJsonPath = process.argv[2] || path.resolve(path.dirname(import.meta.url), '../package.json');

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt user for input
const prompt = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Function to bump version
const bumpVersion = async () => {
  try {
    if (!fs.existsSync(packageJsonPath)) {
      log.warning(`File not found: ${packageJsonPath}`);
      log.info('Copying real package.json to the dummy location...');
      const realPackageJsonPath = path.resolve(path.dirname(import.meta.url), '../package.json');
      fs.copyFileSync(realPackageJsonPath, packageJsonPath);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    log.info(`Current version: ${currentVersion}`);

    const [major, minor, patch] = currentVersion.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    const userInput = await prompt(`Enter new version (default: ${newVersion}): `);
    const finalVersion = userInput.trim() || newVersion;

    packageJson.version = finalVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    log.success(`Version updated to ${finalVersion}`);
  } catch (error) {
    log.error('Failed to bump version');
    console.error(error);
  } finally {
    rl.close();
  }
};

bumpVersion();
