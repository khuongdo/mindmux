#!/usr/bin/env node

/**
 * Fix ESM imports by adding .js extensions to relative imports
 * Required for Node.js ESM modules
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (extname(file) === '.ts' && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function fixImports(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // Match import statements with relative paths
  // Patterns:
  // - import ... from './path'
  // - import ... from '../path'
  // Don't match if already has .js extension

  const patterns = [
    // import { x } from './path'
    /from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g,
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, importPath) => {
      // Skip if already has .js extension
      if (importPath.endsWith('.js')) {
        return match;
      }

      // Add .js extension
      modified = true;
      return match.replace(importPath, importPath + '.js');
    });
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// Main execution
const srcDir = 'src';
const tsFiles = getAllTsFiles(srcDir);

console.log(`Found ${tsFiles.length} TypeScript files`);
console.log('Adding .js extensions to relative imports...\n');

let fixedCount = 0;
tsFiles.forEach(file => {
  if (fixImports(file)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} files`);
