/**
 * COMPREHENSIVE FILE VALIDATION TEST SUITE
 * 
 * This test suite validates the file content validation system:
 * - Valid file types (Excel, CSV, Images)
 * - Invalid file types (malicious files, corrupted files)
 * - File signature validation
 * - Content structure validation
 * - Security checks
 */

const BASE_URL = 'https://hr-api-wbzs.onrender.com';
const fs = require('fs');
const path = require('path');

// Color logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  test: (msg) => console.log(`\x1b[35m[TEST]\x1b[0m ${msg}`)
};

// Test file creation utilities
function createTestFiles() {
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // 1. Valid Excel file (xlsx)
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
    // Add some content to make it look like a real Excel file
    ...Array(1000).fill(0x00) // Padding
  ]);
  fs.writeFileSync(path.join(testDir, 'valid-excel.xlsx'), validExcelContent);
  
  // 2. Valid CSV file
  const validCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
Jane Smith,jane@example.com,Marketing,65000
Bob Johnson,bob@example.com,Sales,70000`;
  fs.writeFileSync(path.join(testDir, 'valid-csv.csv'), validCSVContent);
  
  // 3. Invalid Excel file (wrong signature)
  const invalidExcelContent = Buffer.from([
    0xFF, 0xD8, 0xFF, // JPEG signature (wrong!)
    ...Array(1000).fill(0x00)
  ]);
  fs.writeFileSync(path.join(testDir, 'invalid-excel.xlsx'), invalidExcelContent);
  
  // 4. Malicious CSV file (SQL injection)
  const maliciousCSVContent = `Name,Email,Department,Salary
John Doe,john@example.com,Engineering,75000
'; DROP TABLE employees; --,hacker@evil.com,IT,0
Jane Smith,jane@example.com,Marketing,65000`;
  fs.writeFileSync(path.join(testDir, 'malicious-csv.csv'), maliciousCSVContent);
  
  // 5. Empty file
  fs.writeFileSync(path.join(testDir, 'empty-file.xlsx'), Buffer.alloc(0));
  
  // 6. Corrupted Excel file (too small)
  const corruptedExcelContent = Buffer.from([0x50, 0x4B]); // Too small
  fs.writeFileSync(path.join(testDir, 'corrupted-excel.xlsx'), corruptedExcelContent);
  
  // 7. Valid PNG image
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
  fs.writeFileSync(path.join(testDir, 'valid-image.png'), validPNGContent);
  
  // 8. File with script content (malicious)
  const scriptContent = `<script>alert('XSS')</script>
Name,Email,Department
John Doe,john@example.com,Engineering`;
  fs.writeFileSync(path.join(testDir, 'script-csv.csv'), scriptContent);
  
  log.info(`✅ Created test files in ${testDir}`);
  return testDir;
}

// Test file upload with validation
async function testFileUpload(filePath, expectedResult, testName) {
  try {
    log.test(`Testing: ${testName}`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('excel_file', fileBuffer, fileName);
    
    const response = await fetch(`${BASE_URL}/api/commissions/import`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const data = await response.json();
    
    if (expectedResult === 'success') {
      if (response.ok && data.message) {
        log.success(`✅ ${testName} - PASSED (Expected success, got success)`);
        return true;
      } else {
        log.error(`❌ ${testName} - FAILED (Expected success, got error: ${data.error})`);
        return false;
      }
    } else {
      if (!response.ok && data.error) {
        log.success(`✅ ${testName} - PASSED (Expected error, got error: ${data.error})`);
        return true;
      } else {
        log.error(`❌ ${testName} - FAILED (Expected error, got success)`);
        return false;
      }
    }
    
  } catch (error) {
    log.error(`❌ ${testName} - ERROR: ${error.message}`);
    return false;
  }
}

// Test CSV file upload
async function testCSVUpload(filePath, expectedResult, testName) {
  try {
    log.test(`Testing: ${testName}`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fileBuffer, fileName);
    
    const response = await fetch(`${BASE_URL}/api/timecard-uploads/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const data = await response.json();
    
    if (expectedResult === 'success') {
      if (response.ok && data.success) {
        log.success(`✅ ${testName} - PASSED (Expected success, got success)`);
        return true;
      } else {
        log.error(`❌ ${testName} - FAILED (Expected success, got error: ${data.error})`);
        return false;
      }
    } else {
      if (!response.ok && data.error) {
        log.success(`✅ ${testName} - PASSED (Expected error, got error: ${data.error})`);
        return true;
      } else {
        log.error(`❌ ${testName} - FAILED (Expected error, got success)`);
        return false;
      }
    }
    
  } catch (error) {
    log.error(`❌ ${testName} - ERROR: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runFileValidationTests() {
  console.log('\n' + '='.repeat(80));
  log.info('COMPREHENSIVE FILE VALIDATION TEST SUITE');
  console.log('='.repeat(80) + '\n');
  
  // Create test files
  const testDir = createTestFiles();
  
  const tests = [
    // Excel file tests
    {
      file: path.join(testDir, 'valid-excel.xlsx'),
      expected: 'success',
      name: 'Valid Excel file upload',
      type: 'excel'
    },
    {
      file: path.join(testDir, 'invalid-excel.xlsx'),
      expected: 'error',
      name: 'Invalid Excel file (wrong signature)',
      type: 'excel'
    },
    {
      file: path.join(testDir, 'empty-file.xlsx'),
      expected: 'error',
      name: 'Empty Excel file',
      type: 'excel'
    },
    {
      file: path.join(testDir, 'corrupted-excel.xlsx'),
      expected: 'error',
      name: 'Corrupted Excel file (too small)',
      type: 'excel'
    },
    
    // CSV file tests
    {
      file: path.join(testDir, 'valid-csv.csv'),
      expected: 'success',
      name: 'Valid CSV file upload',
      type: 'csv'
    },
    {
      file: path.join(testDir, 'malicious-csv.csv'),
      expected: 'error',
      name: 'Malicious CSV file (SQL injection)',
      type: 'csv'
    },
    {
      file: path.join(testDir, 'script-csv.csv'),
      expected: 'error',
      name: 'CSV file with script content',
      type: 'csv'
    }
  ];
  
  let passed = 0;
  let total = 0;
  
  for (const test of tests) {
    total++;
    let result;
    
    if (test.type === 'excel') {
      result = await testFileUpload(test.file, test.expected, test.name);
    } else if (test.type === 'csv') {
      result = await testCSVUpload(test.file, test.expected, test.name);
    }
    
    if (result) passed++;
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Cleanup test files
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
    log.info('🧹 Cleaned up test files');
  } catch (error) {
    log.warn(`⚠️ Could not clean up test files: ${error.message}`);
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
runFileValidationTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
});
