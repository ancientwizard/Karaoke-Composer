#!/usr/bin/env node
/*
# bin-utils

Utilities for command-line tools. Read script header and output markdown format.
*/
const fs = require('fs')

/**
 * Extract markdown help from a .cjs file's header comment block.
 * @param {string} filePath - Path to the .cjs file
 * @returns {string[]} Array of lines from the comment block (without /* and *)
 */
function readScriptMd(filePath)
{
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const result = []
  let inComment = false

  for (const line of lines) {
    if (line.includes('/*')) {
      inComment = true
      continue
    }
    if (line.includes('*/')) {
      inComment = false
      break
    }
    if (inComment) {
      // Remove leading /* and */ and trim
      const trimmed = line.replace(/^\s*\*\s?/, '').replace(/\s*$/, '')
      result.push(trimmed)
    }
  }

  return result
}

module.exports = { readScriptMd }

// END
