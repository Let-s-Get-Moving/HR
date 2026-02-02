#!/usr/bin/env node
/**
 * CI script to check for missing i18n translation keys.
 * 
 * Scans all JSX/TSX files for t('...') usages and validates
 * that each key exists in the locale JSON files.
 * 
 * Usage:
 *   node scripts/check-i18n-keys.mjs           # Check en.json only
 *   node scripts/check-i18n-keys.mjs --all     # Check all locales (en, es, fr)
 * 
 * Exit codes:
 *   0 - All keys found
 *   1 - Missing keys detected
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, '..', 'src');
const LOCALES_DIR = join(SRC_DIR, 'i18n', 'locales');

// File extensions to scan
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Regex to match t('key') or t("key") patterns
// Captures the key inside the quotes
const T_PATTERN = /\bt\(\s*['"]([^'"]+)['"]/g;

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, files = []) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and test directories
      if (entry !== 'node_modules' && entry !== '__tests__' && entry !== 'test') {
        getAllFiles(fullPath, files);
      }
    } else if (EXTENSIONS.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract all t() keys from a file
 */
function extractKeys(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const keys = [];
  let match;
  
  while ((match = T_PATTERN.exec(content)) !== null) {
    keys.push({
      key: match[1],
      file: filePath.replace(SRC_DIR, 'src')
    });
  }
  
  return keys;
}

/**
 * Check if a key exists in a locale object (dot-path traversal)
 */
function keyExists(locale, key) {
  const parts = key.split('.');
  let current = locale;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = current[part];
  }
  
  return current !== undefined;
}

/**
 * Load a locale JSON file
 */
function loadLocale(localeName) {
  const localePath = join(LOCALES_DIR, `${localeName}.json`);
  const content = readFileSync(localePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Main function
 */
function main() {
  const checkAllLocales = process.argv.includes('--all');
  const localesToCheck = checkAllLocales ? ['en', 'es', 'fr'] : ['en'];
  
  console.log(`\n[i18n Check] Scanning source files for translation keys...\n`);
  
  // Get all source files
  const files = getAllFiles(SRC_DIR);
  console.log(`Found ${files.length} source files to scan.`);
  
  // Extract all keys
  const allKeys = [];
  for (const file of files) {
    const keys = extractKeys(file);
    allKeys.push(...keys);
  }
  
  // Deduplicate keys
  const uniqueKeys = [...new Set(allKeys.map(k => k.key))];
  console.log(`Found ${uniqueKeys.length} unique translation keys.\n`);
  
  // Check each locale
  let hasErrors = false;
  
  for (const localeName of localesToCheck) {
    console.log(`Checking ${localeName}.json...`);
    
    const locale = loadLocale(localeName);
    const missingKeys = [];
    
    for (const keyInfo of allKeys) {
      if (!keyExists(locale, keyInfo.key)) {
        // Only add unique missing keys
        if (!missingKeys.some(m => m.key === keyInfo.key)) {
          missingKeys.push(keyInfo);
        }
      }
    }
    
    if (missingKeys.length > 0) {
      hasErrors = true;
      console.log(`  Missing ${missingKeys.length} key(s):`);
      
      // Group by key for cleaner output
      const groupedByKey = {};
      for (const { key, file } of missingKeys) {
        if (!groupedByKey[key]) {
          groupedByKey[key] = [];
        }
        groupedByKey[key].push(file);
      }
      
      for (const [key, files] of Object.entries(groupedByKey)) {
        console.log(`    - "${key}"`);
        // Show first file where it's used
        console.log(`      Used in: ${files[0]}`);
      }
    } else {
      console.log(`  All keys present.`);
    }
    
    console.log('');
  }
  
  // Summary
  if (hasErrors) {
    console.log(`[i18n Check] FAILED - Missing translation keys detected.`);
    console.log(`Add the missing keys to the locale files or remove unused t() calls.\n`);
    process.exit(1);
  } else {
    console.log(`[i18n Check] PASSED - All translation keys exist.\n`);
    process.exit(0);
  }
}

main();
