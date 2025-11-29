/**
 * CMP Parser Round-Trip Fidelity Tests
 *
 * Verifies that .cmp files can be read and serialized back to binary-identical output.
 * This proves the parser and serializer are faithful to the original format.
 *
 * Test Flow:
 * 1. Find all *.cmp files in cdg-projects/
 * 2. For each file:
 *    - Read the binary data
 *    - Parse into CMPProject object
 *    - Serialize back to binary
 *    - Write to tmp/ directory
 *    - Compare: original vs serialized (should be identical)
 *    - Delete tmp file
 * 3. Report results
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { resolve      } from 'path';
import { CMPParser    } from '@/ts/cd+g-magic/CMPParser';

describe('CMP Parser - Round-Trip Fidelity', () => {
  const CDG_PROJECTS_DIR = resolve(__dirname, '../../../cdg-projects');
  const TMP_DIR = resolve(__dirname, '../../../tmp');

  /**
   * Ensure tmp directory exists
   */
  beforeAll(() => {
    const fs = require('fs');
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  /**
   * Find all .cmp files in cdg-projects
   */
  const findCMPFiles = (): string[] => {
    try {
      const files = readdirSync(CDG_PROJECTS_DIR);
      return files
        .filter((f) => f.endsWith('.cmp'))
        .map((f) => resolve(CDG_PROJECTS_DIR, f));
    } catch (error) {
      // Silently return empty array if directory not found
      return [];
    }
  };

  /**
   * Compare two Uint8Array buffers
   */
  const buffersEqual = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  };

  /**
   * Get a detailed comparison of differences
   */
  const compareBuffers = (original: Uint8Array, serialized: Uint8Array): string => {
    const lines: string[] = [];

    lines.push(`Length: original=${original.length}, serialized=${serialized.length}`);

    if (original.length !== serialized.length) {
      lines.push(`⚠️  Length mismatch!`);
    }

    // Find first difference
    const minLen = Math.min(original.length, serialized.length);
    for (let i = 0; i < minLen; i++) {
      if (original[i] !== serialized[i]) {
        lines.push(`First difference at byte ${i}:`);
        lines.push(`  Original:  0x${original[i].toString(16).padStart(2, '0')}`);
        lines.push(`  Serialized: 0x${serialized[i].toString(16).padStart(2, '0')}`);

        // Show context
        const start = Math.max(0, i - 5);
        const end = Math.min(minLen, i + 5);
        lines.push(`Context around byte ${i}:`);
        lines.push(
          `  Original:    ${Array.from(original.slice(start, end))
            .map((b) => '0x' + b.toString(16).padStart(2, '0'))
            .join(' ')}`
        );
        lines.push(
          `  Serialized:  ${Array.from(serialized.slice(start, end))
            .map((b) => '0x' + b.toString(16).padStart(2, '0'))
            .join(' ')}`
        );
        break;
      }
    }

    if (original.length === serialized.length && buffersEqual(original, serialized)) {
      lines.push('✅ Buffers are identical');
    }

    return lines.join('\n');
  };

  /**
   * Test each .cmp file for round-trip fidelity
   */
  test('should perform round-trip fidelity on all .cmp files', () => {
    const cmpFiles = findCMPFiles();
    expect(cmpFiles.length).toBeGreaterThan(0);

    const results: Array<{
      filename: string;
      success: boolean;
      message: string;
    }> = [];

    for (const cmpFilePath of cmpFiles) {
      const filename = cmpFilePath.split('/').pop() || 'unknown';

      try {
        // Read original binary
        const originalBinary = readFileSync(cmpFilePath);
        const originalUint8 = new Uint8Array(originalBinary);

        // Parse into CMPProject
        const parser = new CMPParser(originalUint8);
        const project = parser.parse();

        // Serialize back to binary
        const serializedBinary = parser.serialize(project);

        // Compare
        const identical = buffersEqual(originalUint8, serializedBinary);

        if (!identical) {
          // Only print detailed comparison on failure
          console.error(compareBuffers(originalUint8, serializedBinary));
          results.push({
            filename,
            success: false,
            message: 'Binary mismatch after serialization',
          });
        } else {
          results.push({
            filename,
            success: true,
            message: `${originalUint8.length} bytes, ${project.clips.length} clips`,
          });
        }

        // Write to tmp for inspection (only if there were issues)
        if (!identical) {
          const tmpFilePath = resolve(TMP_DIR, `serialized_${filename}`);
          writeFileSync(tmpFilePath, serializedBinary);
          unlinkSync(tmpFilePath);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          filename,
          success: false,
          message: errorMsg,
        });
      }
    }

    const passCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    // Only report on failures
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.error('Round-trip fidelity failures:');
      for (const result of failures) {
        console.error(`  ❌ ${result.filename}: ${result.message}`);
      }
    }

    // Expect all to pass
    expect(passCount).toBe(totalCount);
  });
});

// VIM: set ft=typescript :
// END