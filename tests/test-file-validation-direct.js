/**
 * DIRECT FILE VALIDATION TEST
 * Tests the file validation utilities directly without HTTP
 */

const path = require('path');

// Import the file validation utilities directly
const { validateFileContent } = require('../api/src/utils/fileValidation.js');

// Color logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  test: (msg) => console.log(`\x1b[35m[TEST]\x1b[0m ${msg}`)
};

// Test file validation directly
function testFileValidation(fileContent, filename, expectedResult, testName) {
  log.test(`Testing: ${testName}`);
  
  try {
    // Create a mock file object
    const mockFile = {
      buffer: fileContent,
      originalname: filename,
      mimetype: getMimeType(filename)
    };
    
    // Determine file type
    let fileType = 'csv';
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      fileType = 'excel';
    } else if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      fileType = 'image';
    }
    
    console.log(`  File: ${filename}, Type: ${fileType}, Size: ${fileContent.length} bytes`);
    
    // Run validation
    const result = validateFileContent(mockFile, fileType);
    
    console.log(`  Validation result:`, result);
    
    if (expectedResult === 'valid' && result.valid) {
      log.success(`✅ ${testName} - VALID (Expected)`);
      return true;
    } else if (expectedResult === 'invalid' && !result.valid) {
      log.success(`✅ ${testName} - INVALID (Expected)`);
      return true;
    } else {
      log.error(`❌ ${testName} - Unexpected result`);
      return false;
    }
    
  } catch (error) {
    log.error(`❌ ${testName} - ERROR: ${error.message}`);
    return false;
  }
}

// Get MIME type based on filename
function getMimeType(filename) {
  if (filename.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (filename.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (filename.endsWith('.csv')) return 'text/csv';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

// Test 1: Valid Excel file
function testValidExcel() {
  const validExcelContent = Buffer.from([
    0x50, 0x4B, 0x03, 0x04, // ZIP signature
    0x14, 0x00, 0x00, 0x00, // Version
    0x08, 0x00, // Flags
    0x00, 0x00, // Compression method
    0x00, 0x00, 0x00, 0x00, // Last mod time/date
    0x00, 0x00, 0x00, 0x00, // CRC32
    0x00, 0x00, 0x00, 0x00, // Compressed size
    0x00, 0x00, 0x00, 0x00, // Uncompressed size
    0x00, 0x00, // Filename length
    0x00, 0x00, // Extra field length
    ...Array(2000).fill(0x00) // Padding
  ]);
  
  return testFileValidation(validExcelContent, 'test-valid.xlsx', 'valid', 'Valid Excel file');
}

// Test 2: Invalid Excel file (wrong signature)
function testInvalidExcel() {
  const invalidExcelContent = Buffer.from([
    0xFF, 0xD8, 0xFF, // JPEG signature (wrong!)
    ...Array(2000).fill(0x00) // Padding
  ]);
  
  return testFileValidation(invalidExcelContent, 'test-invalid.xlsx', 'invalid', 'Invalid Excel file (wrong signature)');
}

// Test 3: Empty file
function testEmptyFile() {
  const emptyContent = Buffer.alloc(0);
  return testFileValidation(emptyContent, 'test-empty.xlsx', 'invalid', 'Empty file');
}

// Test 4: Valid CSV file
function testValidCSV() {
  const validCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
Jane Smith,jane@example.com,Marketing,65000
Bob Johnson,bob@example.com,Sales,70000`;
  
  return testFileValidation(validCSVContent, 'test-valid.csv', 'valid', 'Valid CSV file');
}

// Test 5: Malicious CSV file (SQL injection)
function testMaliciousCSV() {
  const maliciousCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
'; DROP TABLE employees; --,hacker@evil.com,IT,0
Jane Smith,jane@example.com,Marketing,65000`;
  
  return testFileValidation(maliciousCSVContent, 'test-malicious.csv', 'invalid', 'Malicious CSV file (SQL injection)');
}

// Test 6: Valid PNG image
function testValidPNG() {
  const validPNGContent = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x00, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x1D, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Data
    0xE5, 0x90, 0x9A, 0x4C, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return testFileValidation(validPNGContent, 'test-valid.png', 'valid', 'Valid PNG image');
}

// Test 7: File with script content
function testScriptFile() {
  const scriptContent = `<script>alert('XSS')</script>
Name,Email,Department
John Doe,john@example.com,Engineering`;
  
  return testFileValidation(scriptContent, 'test-script.csv', 'invalid', 'CSV file with script content');
}

// Main test runner
function runFileValidationTests() {
  console.log('\n' + '='.repeat(80));
  log.info('DIRECT FILE VALIDATION TEST SUITE');
  console.log('='.repeat(80) + '\n');
  
  const tests = [
    { name: 'Valid Excel file', fn: testValidExcel },
    { name: 'Invalid Excel file', fn: testInvalidExcel },
    { name: 'Empty file', fn: testEmptyFile },
    { name: 'Valid CSV file', fn: testValidCSV },
    { name: 'Malicious CSV file', fn: testMaliciousCSV },
    { name: 'Valid PNG image', fn: testValidPNG },
    { name: 'Script content file', fn: testScriptFile }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) passed++;
    } catch (error) {
      log.error(`❌ ${test.name} - ERROR: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  log.info('FILE VALIDATION TEST SUMMARY:');
  console.log('='.repeat(80));
  const percentage = Math.round((passed / total) * 100);
  console.log(`\n📊 Overall: ${passed}/${total} tests passed (${percentage}%)\n`);
  
  if (passed === total) {
    log.success('🎉 ALL FILE VALIDATION TESTS PASSED!');
    log.success('✅ File content validation is working correctly!');
  } else {
    log.error('⚠️ Some file validation tests failed.');
    log.error('Please check the logs above for details.');
  }
  
  return { passed, total, percentage };
}

// Run tests
runFileValidationTests();
