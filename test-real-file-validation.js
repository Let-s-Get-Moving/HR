/**
 * REAL FILE VALIDATION TEST
 * Tests the actual file validation with real Excel files from the project
 */

import fs from 'fs';
import path from 'path';
import { validateFileContent } from './api/src/utils/fileValidation.js';

// Color logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  test: (msg) => console.log(`\x1b[35m[TEST]\x1b[0m ${msg}`)
};

async function testRealFileValidation() {
  console.log('🔍 REAL FILE VALIDATION TEST');
  console.log('='.repeat(80));
  
  const testFiles = [
    {
      name: 'August 25, 2025 September 7, 2025.xlsx',
      type: 'excel',
      expected: 'valid'
    },
    {
      name: 'Untitled spreadsheet.xlsx', 
      type: 'excel',
      expected: 'valid'
    }
  ];
  
  let passed = 0;
  let total = testFiles.length;
  
  for (const testFile of testFiles) {
    log.test(`\n📊 Testing: ${testFile.name}`);
    console.log('-'.repeat(60));
    
    try {
      // Check if file exists
      if (!fs.existsSync(testFile.name)) {
        log.error(`❌ File not found: ${testFile.name}`);
        continue;
      }
      
      // Read file
      const fileBuffer = fs.readFileSync(testFile.name);
      log.info(`📁 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
      
      // Create file object for validation
      const fileObj = {
        buffer: fileBuffer,
        originalname: testFile.name,
        size: fileBuffer.length
      };
      
      // Validate file
      log.info('🔍 Running file validation...');
      const validation = await validateFileContent(fileObj, testFile.type);
      
      // Display results
      console.log(`\n📋 Validation Result:`);
      console.log(`   Valid: ${validation.valid}`);
      console.log(`   Message: ${validation.message}`);
      if (validation.details) {
        console.log(`   Details:`, validation.details);
      }
      
      // Check if result matches expectation
      if (testFile.expected === 'valid' && validation.valid) {
        log.success(`✅ ${testFile.name} - PASSED (Valid file correctly identified)`);
        passed++;
      } else if (testFile.expected === 'invalid' && !validation.valid) {
        log.success(`✅ ${testFile.name} - PASSED (Invalid file correctly identified)`);
        passed++;
      } else {
        log.error(`❌ ${testFile.name} - FAILED (Expected ${testFile.expected}, got ${validation.valid ? 'valid' : 'invalid'})`);
      }
      
    } catch (error) {
      log.error(`❌ ${testFile.name} - ERROR: ${error.message}`);
      console.error(error);
    }
  }
  
  // Test with invalid files
  log.test(`\n📊 Testing Invalid Files`);
  console.log('-'.repeat(60));
  
  const invalidTests = [
    {
      name: 'Empty file test',
      buffer: Buffer.alloc(0),
      filename: 'empty.xlsx',
      type: 'excel',
      expected: 'invalid'
    },
    {
      name: 'Wrong signature test',
      buffer: Buffer.from('This is not an Excel file'),
      filename: 'fake.xlsx',
      type: 'excel',
      expected: 'invalid'
    },
    {
      name: 'Too large file test',
      buffer: Buffer.alloc(51 * 1024 * 1024), // 51MB
      filename: 'huge.xlsx',
      type: 'excel',
      expected: 'invalid'
    }
  ];
  
  for (const test of invalidTests) {
    log.test(`\n📊 Testing: ${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const fileObj = {
        buffer: test.buffer,
        originalname: test.filename,
        size: test.buffer.length
      };
      
      const validation = await validateFileContent(fileObj, test.type);
      
      console.log(`   Valid: ${validation.valid}`);
      console.log(`   Message: ${validation.message}`);
      
      if (test.expected === 'invalid' && !validation.valid) {
        log.success(`✅ ${test.name} - PASSED (Invalid file correctly rejected)`);
        passed++;
      } else if (test.expected === 'valid' && validation.valid) {
        log.success(`✅ ${test.name} - PASSED (Valid file correctly accepted)`);
        passed++;
      } else {
        log.error(`❌ ${test.name} - FAILED (Expected ${test.expected}, got ${validation.valid ? 'valid' : 'invalid'})`);
      }
      
    } catch (error) {
      log.error(`❌ ${test.name} - ERROR: ${error.message}`);
    }
  }
  
  total += invalidTests.length;
  
  // Summary
  console.log('\n' + '='.repeat(80));
  log.info('VALIDATION TEST SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`📊 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    log.success('🎉 All file validation tests passed!');
  } else {
    log.error(`⚠️ ${total - passed} file validation tests failed.`);
  }
  
  return { passed, total };
}

// Run the test
testRealFileValidation().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
