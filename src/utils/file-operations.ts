/**
 * Atomic file operations with validation
 * Prevents data corruption during file writes
 */

import { writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';

/**
 * Atomically write JSON to file
 * Uses write-to-temp + rename pattern for atomicity
 *
 * @param filePath - Target file path
 * @param data - Data to write (will be JSON.stringify'd)
 * @throws Error if write fails or JSON is invalid
 */
export function atomicWriteJSON(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  const tempPath = join(dir, `.${randomUUID()}.tmp`);

  try {
    // Step 1: Serialize to JSON string
    const jsonString = JSON.stringify(data, null, 2);

    // Step 2: Validate JSON is parsable (round-trip test)
    try {
      JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(`Invalid JSON structure: ${parseError}`);
    }

    // Step 3: Write to temporary file
    writeFileSync(tempPath, jsonString, 'utf-8');

    // Step 4: Validate written file is parsable
    const writtenContent = require('fs').readFileSync(tempPath, 'utf-8');
    try {
      JSON.parse(writtenContent);
    } catch (parseError) {
      unlinkSync(tempPath);
      throw new Error(`Written file validation failed: ${parseError}`);
    }

    // Step 5: Atomic rename (overwrites target)
    renameSync(tempPath, filePath);

  } catch (error) {
    // Cleanup temp file on any error
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors, focus on original error
      }
    }

    throw new Error(`Atomic write failed for ${filePath}: ${error}`);
  }
}

/**
 * Safely read and parse JSON file
 *
 * @param filePath - File path to read
 * @returns Parsed JSON object or null if file doesn't exist
 * @throws Error if file exists but is invalid JSON
 */
export function safeReadJSON<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = require('fs').readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to read/parse JSON from ${filePath}: ${error}`);
  }
}
