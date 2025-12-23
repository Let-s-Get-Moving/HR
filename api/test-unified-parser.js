/**
 * Test Unified File Parser
 * 
 * Tests CSV and Excel parsing to ensure identical output
 * Does NOT write to database - only tests parsing logic
 */

import { loadFileAsWorkbook, detectFileType } from './src/utils/unifiedFileParser.js';
import { getWorksheetData } from './src/utils/excelParser.js';
import { readFileSync, writeFileSync } from 'fs';
import XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

// Test data - simple employee data
const testEmployeeData = [
  ['first_name', 'last_name', 'email', 'phone', 'hire_date', 'employment_type', 'department_id', 'hourly_rate'],
  ['John', 'Doe', 'john.doe@example.com', '555-0101', '2024-01-15', 'Full-time', '1', '25.50'],
  ['Jane', 'Smith', 'jane.smith@example.com', '555-0102', '2024-02-01', 'Part-time', '2', '20.00'],
  ['Bob', 'Johnson', 'bob.johnson@example.com', '555-0103', '2024-03-10', 'Full-time', '1', '30.00']
];

// Test data - commission data
const testCommissionData = [
  ['Name', 'Hourly Rate', 'Commission Earned', 'Total Due'],
  ['John Doe', '25.50', '1500.00', '2000.00'],
  ['Jane Smith', '20.00', '1200.00', '1500.00'],
  ['Bob Johnson', '30.00', '1800.00', '2200.00']
];

// Test data - timecard data
const testTimecardData = [
  ['Employee', '', '', 'John Doe'],
  ['Date', 'IN', 'OUT', 'Work Time', 'Daily Total', 'Note'],
  ['2024-01-15', '09:00', '17:00', '8:00', '8.0', ''],
  ['2024-01-16', '09:00', '17:30', '8:30', '8.5', ''],
  ['Employee', '', '', 'Jane Smith'],
  ['Date', 'IN', 'OUT', 'Work Time', 'Daily Total', 'Note'],
  ['2024-01-15', '10:00', '14:00', '4:00', '4.0', ''],
];

console.log('🧪 Starting Unified Parser Tests\n');
console.log('=' .repeat(60));

// Helper function to create CSV file content
function createCSV(data) {
  return data.map(row => row.map(cell => {
    // Handle cells with commas - wrap in quotes
    const cellStr = String(cell || '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }).join(',')).join('\n');
}

// Helper function to create Excel workbook buffer
function createExcelBuffer(data) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Helper function to compare two 2D arrays
function compareArrays(arr1, arr2, label = 'Arrays') {
  if (arr1.length !== arr2.length) {
    console.error(`❌ ${label}: Length mismatch - CSV: ${arr1.length}, Excel: ${arr2.length}`);
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    const row1 = arr1[i] || [];
    const row2 = arr2[i] || [];
    
    if (row1.length !== row2.length) {
      console.error(`❌ ${label} Row ${i}: Column count mismatch - CSV: ${row1.length}, Excel: ${row2.length}`);
      console.error(`   CSV: ${JSON.stringify(row1)}`);
      console.error(`   Excel: ${JSON.stringify(row2)}`);
      return false;
    }

    for (let j = 0; j < row1.length; j++) {
      const val1 = row1[j] === null || row1[j] === undefined ? '' : String(row1[j]).trim();
      const val2 = row2[j] === null || row2[j] === undefined ? '' : String(row2[j]).trim();
      
      if (val1 !== val2) {
        console.error(`❌ ${label} Cell [${i},${j}]: Value mismatch`);
        console.error(`   CSV: "${val1}"`);
        console.error(`   Excel: "${val2}"`);
        return false;
      }
    }
  }

  return true;
}

// Test 1: Employee Data Parsing
console.log('\n📋 Test 1: Employee Data Parsing');
console.log('-'.repeat(60));

try {
  const csvContent = createCSV(testEmployeeData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(testEmployeeData);

  // Parse CSV
  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-employees.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  // Parse Excel
  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-employees.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  // Compare
  const match = compareArrays(csvData, excelData, 'Employee Data');
  if (match) {
    console.log('✅ Employee data parsing: CSV and Excel produce identical results');
    console.log(`   Rows: ${csvData.length}, Columns: ${csvData[0]?.length || 0}`);
  } else {
    console.error('❌ Employee data parsing: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Employee data parsing failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 2: Commission Data Parsing
console.log('\n💰 Test 2: Commission Data Parsing');
console.log('-'.repeat(60));

try {
  const csvContent = createCSV(testCommissionData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(testCommissionData);

  // Parse CSV
  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-commissions.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  // Parse Excel
  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-commissions.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  // Compare
  const match = compareArrays(csvData, excelData, 'Commission Data');
  if (match) {
    console.log('✅ Commission data parsing: CSV and Excel produce identical results');
    console.log(`   Rows: ${csvData.length}, Columns: ${csvData[0]?.length || 0}`);
  } else {
    console.error('❌ Commission data parsing: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Commission data parsing failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 3: Timecard Data Parsing
console.log('\n⏰ Test 3: Timecard Data Parsing');
console.log('-'.repeat(60));

try {
  const csvContent = createCSV(testTimecardData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(testTimecardData);

  // Parse CSV
  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-timecards.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  // Parse Excel
  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-timecards.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  // Compare
  const match = compareArrays(csvData, excelData, 'Timecard Data');
  if (match) {
    console.log('✅ Timecard data parsing: CSV and Excel produce identical results');
    console.log(`   Rows: ${csvData.length}, Columns: ${csvData[0]?.length || 0}`);
  } else {
    console.error('❌ Timecard data parsing: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Timecard data parsing failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 4: Edge Cases
console.log('\n🔍 Test 4: Edge Cases');
console.log('-'.repeat(60));

// Test 4a: Quoted fields with commas
console.log('   Testing quoted fields with commas...');
try {
  const edgeCaseData = [
    ['name', 'description', 'amount'],
    ['John Doe', 'Salary, bonus, and benefits', '5000.00'],
    ['Jane Smith', 'Regular pay', '3000.00']
  ];

  const csvContent = createCSV(edgeCaseData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(edgeCaseData);

  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-edge.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-edge.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  const match = compareArrays(csvData, excelData, 'Edge Case: Quoted Fields');
  if (match) {
    console.log('   ✅ Quoted fields with commas: Handled correctly');
  } else {
    console.error('   ❌ Quoted fields with commas: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ Edge case test failed:', error.message);
  process.exit(1);
}

// Test 4b: Empty cells
console.log('   Testing empty cells...');
try {
  const edgeCaseData = [
    ['col1', 'col2', 'col3'],
    ['value1', '', 'value3'],
    ['', 'value2', '']
  ];

  const csvContent = createCSV(edgeCaseData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(edgeCaseData);

  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-empty.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-empty.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  const match = compareArrays(csvData, excelData, 'Edge Case: Empty Cells');
  if (match) {
    console.log('   ✅ Empty cells: Handled correctly');
  } else {
    console.error('   ❌ Empty cells: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ Edge case test failed:', error.message);
  process.exit(1);
}

// Test 4c: Special characters
console.log('   Testing special characters...');
try {
  const edgeCaseData = [
    ['name', 'notes'],
    ['José García', 'Salary: $1,000.00'],
    ['Mary O\'Brien', 'Bonus: 10%']
  ];

  const csvContent = createCSV(edgeCaseData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(edgeCaseData);

  const csvWorkbook = loadFileAsWorkbook(csvBuffer, 'test-special.csv');
  const csvData = getWorksheetData(csvWorkbook, 'Sheet1');

  const excelWorkbook = loadFileAsWorkbook(excelBuffer, 'test-special.xlsx');
  const excelData = getWorksheetData(excelWorkbook, 'Sheet1');

  const match = compareArrays(csvData, excelData, 'Edge Case: Special Characters');
  if (match) {
    console.log('   ✅ Special characters: Handled correctly');
  } else {
    console.error('   ❌ Special characters: Results differ');
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ Edge case test failed:', error.message);
  process.exit(1);
}

// Test 5: File Type Detection
console.log('\n🔎 Test 5: File Type Detection');
console.log('-'.repeat(60));

try {
  const csvContent = createCSV(testEmployeeData);
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const excelBuffer = createExcelBuffer(testEmployeeData);

  const csvType = detectFileType(csvBuffer, 'test.csv');
  const excelType = detectFileType(excelBuffer, 'test.xlsx');

  if (csvType === 'csv' && excelType === 'excel') {
    console.log('✅ File type detection: Working correctly');
    console.log(`   CSV detected as: ${csvType}`);
    console.log(`   Excel detected as: ${excelType}`);
  } else {
    console.error(`❌ File type detection failed: CSV=${csvType}, Excel=${excelType}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ File type detection test failed:', error.message);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All tests passed!');
console.log('='.repeat(60));
console.log('\n📊 Summary:');
console.log('   - Employee data: CSV and Excel produce identical results');
console.log('   - Commission data: CSV and Excel produce identical results');
console.log('   - Timecard data: CSV and Excel produce identical results');
console.log('   - Edge cases: All handled correctly');
console.log('   - File type detection: Working correctly');
console.log('\n🎉 Unified parser is working as expected!\n');

