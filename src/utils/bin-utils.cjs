const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const log = {
  info: (...args) => console.log('[info]', ...args),
  warning: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
  success: (...args) => console.log('[ok]', ...args),
};

function runCommand(cmd, opts = {}) {
  // Simple synchronous runner, throws on non-zero exit
  const shell = process.platform === 'win32' ? true : '/bin/sh';
  const res = spawnSync(cmd, {
 stdio: 'inherit', shell: true, env: process.env, ...opts 
});
  if (res.error) throw res.error;
  if (res.status && res.status !== 0) {
    const err = new Error(`Command failed: ${cmd}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

const git = {
  getCurrentBranch: () => {
    try {
      const out = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
      if (out.status === 0) return out.stdout.trim();
    } catch (e) {}
    return null;
  },
  hasUncommittedChanges: () => {
    try {
      const out = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
      return Boolean(out.stdout && out.stdout.trim().length > 0);
    } catch (e) { return false }
  }
};

/**
 * Read the first multiline comment from a file and return its contents
 * as an array of lines (trimmed). If no comment is found, returns []
 *
 * It matches /* ... *\/ and /** ... *\/ style comments at the top of the file.
 */
function readScriptMd(filePath) {
  try {
    const abs = path.resolve(filePath);
    const src = fs.readFileSync(abs, 'utf8');
    const m = src.match(/\/\*\*?([\s\S]*?)\*\//);
    if (!m) return [];
    const raw = m[1];
    const lines = raw.split(/\r?\n/).map(l => {
      // strip leading whitespace and optional leading '*'
      return l.replace(/^\s*\*?\s?/, '').replace(/\s+$/,'');
    });
    // trim leading/trailing blank lines
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length-1].trim() === '') lines.pop();
    return lines;
  } catch (e) {
    return [];
  }
}

/**
 * Given an argv-style array (e.g. process.argv.slice(2)), return only
 * the positional arguments (those that don't start with a dash).
 */
function positionalArgs(argv) {
  if (!Array.isArray(argv)) return [];
  return argv.filter(a => typeof a === 'string' && !a.startsWith('-'));
}

module.exports = {
 log, runCommand, git, readScriptMd, positionalArgs 
};
