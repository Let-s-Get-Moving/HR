/**
 * Sales Performance Import Tests
 * 
 * Tests the sales-person-performance.xlsx ingestion pipeline:
 * - Header detection
 * - Row parsing
 * - Data type conversion
 * 
 * NOTE: Uses exceljs adapter instead of SheetJS xlsx.
 * 
 * Run: node tests/test-sales-performance-import.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test file path
const TEST_FILE_PATH = join(__dirname, '..', 'sales-person-performance (2).xlsx');

// Expected headers (must match salesPerformanceImporter.js)
const EXPECTED_HEADERS = [
    'Name',
    '# Leads Received',
    'Bad',
    '% Bad',
    'Sent',
    '% Sent',
    'Pending',
    '% Pending',
    'Booked',
    '% Booked',
    'Lost',
    '% Lost',
    'Cancelled',
    '% Cancelled',
    'Booked Total',
    'Average Booking'
];

/**
 * Detect if the worksheet has the expected sales performance headers
 */
function detectSalesPerformanceHeaders(firstRow) {
    if (!firstRow || !Array.isArray(firstRow)) {
        return false;
    }
    
    for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
        const expected = EXPECTED_HEADERS[i];
        const actual = firstRow[i];
        
        if (!actual || String(actual).trim() !== expected) {
            console.log(`  Header mismatch at column ${i}: expected "${expected}", got "${actual}"`);
            return false;
        }
    }
    
    return true;
}

/**
 * Parse an integer from a cell value
 */
function parseInt_(value) {
    if (value === null || value === undefined || value === '') return null;
    
    const cleaned = String(value).replace(/,/g, '').trim();
    if (!cleaned || cleaned === '-') return null;
    
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
}

/**
 * Parse percentage value
 */
function parsePercent(value) {
    if (value === null || value === undefined || value === '') return null;
    
    const valueStr = String(value).trim();
    if (!valueStr) return null;
    
    const cleanValue = valueStr.replace(/[%\s]/g, '');
    if (!cleanValue || cleanValue === '-') return null;
    
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return null;
    
    // If value is between 0 and 1 (decimal), multiply by 100
    if (numValue > 0 && numValue < 1) {
        return numValue * 100;
    }
    
    return numValue;
}

/**
 * Parse monetary value
 */
function parseMoney(value) {
    if (value === null || value === undefined || value === '') return null;
    
    const valueStr = String(value).trim();
    if (!valueStr) return null;
    
    const isNegative = valueStr.startsWith('(') && valueStr.endsWith(')');
    const cleanValue = valueStr.replace(/[\$,\s\(\)]/g, '');
    if (!cleanValue || cleanValue === '-') return null;
    
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return null;
    
    return isNegative ? -numValue : numValue;
}

/**
 * Normalize employee name for matching
 */
function normalizeNameKey(name) {
    if (!name) return '';
    
    return name
        .trim()
        .toLowerCase()
        .replace(/^_+|_+$/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim();
}

// Test results tracking
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
}

// Run tests
async function runTests() {
    console.log('\n🧪 Sales Performance Import Tests\n');
    console.log('=' .repeat(50));

    // Test 1: File exists and is readable
    test('File exists and is readable', () => {
        const buffer = readFileSync(TEST_FILE_PATH);
        assert(buffer.length > 0, 'File should not be empty');
        console.log(`   File size: ${buffer.length} bytes`);
    });

    // Test 2: Excel file can be parsed with exceljs
    let workbook;
    let sheetData;
    await testAsync('Excel file can be parsed', async () => {
        const buffer = readFileSync(TEST_FILE_PATH);
        workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        assert(workbook.worksheets.length > 0, 'Workbook should have at least one sheet');
        console.log(`   Sheets: ${workbook.worksheets.map(s => s.name).join(', ')}`);
    });

    // Test 3: First sheet has expected name
    test('First sheet is named "data"', () => {
        assertEqual(workbook.worksheets[0].name, 'data', 'First sheet should be named "data"');
    });

    // Test 4: Sheet data can be extracted
    test('Sheet data can be extracted as array', () => {
        const worksheet = workbook.getWorksheet('data');
        sheetData = [];
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            const rowData = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                while (rowData.length < colNumber - 1) {
                    rowData.push(null);
                }
                let value = cell.value;
                if (value && typeof value === 'object' && value.result !== undefined) {
                    value = value.result;
                }
                rowData.push(value === null || value === undefined ? null : value);
            });
            sheetData.push(rowData);
        });
        assert(sheetData.length > 0, 'Sheet should have data');
        console.log(`   Total rows: ${sheetData.length}`);
    });

    // Test 5: Header row matches expected format
    test('Header row matches sales-person-performance format', () => {
        const headerRow = sheetData[0];
        assert(detectSalesPerformanceHeaders(headerRow), 'Headers should match expected format');
        console.log(`   Detected ${EXPECTED_HEADERS.length} columns`);
    });

    // Test 6: Data rows exist (excluding header)
    test('Data rows exist', () => {
        const dataRowCount = sheetData.length - 1;
        assert(dataRowCount > 0, 'Should have at least one data row');
        console.log(`   Data rows: ${dataRowCount}`);
    });

    // Test 7: Parse first data row
    test('First data row parses correctly', () => {
        const row = sheetData[1]; // First data row
        const name = row[0];
        const leadsReceived = parseInt_(row[1]);
        const badPct = parsePercent(row[3]);
        const bookedTotal = parseMoney(row[14]);
        
        assert(name !== null, 'Name should not be null');
        assert(typeof leadsReceived === 'number' || leadsReceived === null, 'Leads received should be number or null');
        assert(typeof badPct === 'number' || badPct === null, 'Bad % should be number or null');
        console.log(`   First row: name="${name}", leads=${leadsReceived}, badPct=${badPct}%, bookedTotal=$${bookedTotal}`);
    });

    // Test 8: Name normalization works
    test('Name normalization works correctly', () => {
        const testCases = [
            { input: ' Alejandro', expected: 'alejandro' },
            { input: ' Bobby', expected: 'bobby' },
            { input: ' Colin C', expected: 'colin c' },
            { input: "Let's Get Moving Edmonton - Danylo Z", expected: 'lets get moving edmonton - danylo z' },
            { input: ' Accountant LGM', expected: 'accountant lgm' }
        ];
        
        for (const tc of testCases) {
            const result = normalizeNameKey(tc.input);
            assertEqual(result, tc.expected, `normalizeNameKey("${tc.input}")`);
        }
        console.log(`   Tested ${testCases.length} name normalizations`);
    });

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
