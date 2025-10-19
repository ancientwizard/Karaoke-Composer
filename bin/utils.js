import chalk from 'chalk';
import { execSync } from 'child_process';

// Utility for colored console output
export const log = {
  info: (msg) => console.log(chalk.blue(msg)),
  success: (msg) => console.log(chalk.green(msg)),
  warning: (msg) => console.log(chalk.yellow(msg)),
  error: (msg) => console.log(chalk.red(msg)),
};

// Utility for running shell commands
export const runCommand = (command) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log.error(`Command failed: ${command}`);
    throw error;
  }
};

// Utility for handling git commands
export const git = {
  getCurrentBranch: () => execSync('git branch --show-current').toString().trim(),
  hasUncommittedChanges: () => {
    const status = execSync('git status --porcelain').toString().trim();
    return status.length > 0;
  },
};
