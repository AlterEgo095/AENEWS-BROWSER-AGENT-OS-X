/**
 * AENEWS Agent OS X — Atomic IO Utility
 *
 * Provides atomic file write operations using the
 * write-to-temp-then-rename pattern, which is atomic on POSIX systems.
 *
 * Why atomic writes?
 *   - Prevents corrupted files from partial writes (crash mid-write)
 *   - Ensures readers always see either the old or new complete content
 *   - Temp file is created in the same directory to ensure same filesystem
 *     (required for atomic rename — cross-device renames fail)
 *
 * Usage:
 *   import { atomicWriteJSON, atomicWriteFile } from './atomic-io';
 *
 *   await atomicWriteJSON('/data/config.json', { key: 'value' });
 *   await atomicWriteFile('/data/output.txt', 'Hello, world!');
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Atomically write a JSON-serializable object to a file.
 *
 * Writes to a temporary file in the same directory, then renames
 * (atomic on POSIX) to the target path.
 *
 * @param filePath - Absolute path to the target file
 * @param data - Object to serialize as JSON
 * @param replacer - Optional JSON.stringify replacer
 * @param spaces - Number of indentation spaces (default: 2)
 */
export function atomicWriteJSON(
  filePath: string,
  data: any,
  replacer?: (key: string, value: any) => any,
  spaces: number = 2,
): void {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const tmpPath = path.join(dir, `.${basename}.tmp.${process.pid}.${Date.now()}`);

  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file
    const json = JSON.stringify(data, replacer, spaces);
    fs.writeFileSync(tmpPath, json, 'utf-8');

    // Atomic rename (same filesystem guaranteed by same directory)
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Atomically write a string to a file.
 *
 * Writes to a temporary file in the same directory, then renames
 * (atomic on POSIX) to the target path.
 *
 * @param filePath - Absolute path to the target file
 * @param content - String content to write
 * @param encoding - File encoding (default: 'utf-8')
 */
export function atomicWriteFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8',
): void {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const tmpPath = path.join(dir, `.${basename}.tmp.${process.pid}.${Date.now()}`);

  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file
    fs.writeFileSync(tmpPath, content, encoding);

    // Atomic rename (same filesystem guaranteed by same directory)
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
