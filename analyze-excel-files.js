/**
 * ANALYZE EXCEL FILES
 * This script examines the actual Excel files to understand their structure
 * and content for proper validation
 * 
 * NOTE: Uses exceljs instead of SheetJS xlsx.
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// Color logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  test: (msg) => console.log(`\x1b[35m[TEST]\x1b[0m ${msg}`)
};

async function analyzeExcelFile(filePath) {
  log.info(`\n📊 Analyzing: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  try {
    // Read the Excel file using exceljs
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const sheetNames = workbook.worksheets.map(ws => ws.name);
    console.log(`📋 Sheet Names: ${sheetNames.join(', ')}`);
    console.log(`📊 Number of Sheets: ${sheetNames.length}`);
    
    // Analyze each sheet
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`\n📄 Sheet ${index + 1}: "${worksheet.name}"`);
      console.log('-'.repeat(40));
      
      // Get the range of the sheet
      const rowCount = worksheet.rowCount;
      const columnCount = worksheet.columnCount;
      console.log(`📏 Rows: ${rowCount}, Columns: ${columnCount}`);
      
      // Get first 5 rows of data
      console.log('\n🔍 First 5 rows of data:');
      for (let i = 1; i <= Math.min(5, rowCount); i++) {
        const row = worksheet.getRow(i);
        const values = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          while (values.length < colNumber - 1) {
            values.push(null);
          }
          values.push(cell.value);
        });
        console.log(`  Row ${i}:`, values.slice(0, 10));
      }
      
      // Check for merged cells
      const mergedCells = worksheet.model?.merges || [];
      if (mergedCells.length > 0) {
        console.log(`\n🔗 Merged Cells: ${mergedCells.length}`);
        mergedCells.slice(0, 3).forEach((merge, i) => {
          console.log(`  Merge ${i + 1}: ${merge}`);
        });
      }
    });
    
    // File size and metadata
    const stats = fs.statSync(filePath);
    console.log(`\n📁 File Info:`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Created: ${stats.birthtime}`);
    console.log(`  Modified: ${stats.mtime}`);
    
    return {
      success: true,
      sheets: sheetNames.length,
      fileSize: stats.size
    };
    
  } catch (error) {
    log.error(`❌ Error analyzing ${filePath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main analysis
async function analyzeAllExcelFiles() {
  console.log('🔍 EXCEL FILE ANALYSIS');
  console.log('='.repeat(80));
  
  const excelFiles = [
    'August 25, 2025 September 7, 2025.xlsx',
    'Untitled spreadsheet.xlsx'
  ];
  
  const results = [];
  
  for (const file of excelFiles) {
    if (fs.existsSync(file)) {
      const result = await analyzeExcelFile(file);
      results.push({ file, ...result });
    } else {
      log.warn(`⚠️ File not found: ${file}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  log.info('ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.file}: ${result.sheets} sheets, ${(result.fileSize / 1024).toFixed(2)} KB`);
    } else {
      console.log(`❌ ${result.file}: Error - ${result.error}`);
    }
  });
  
  // Validation requirements based on analysis
  console.log('\n' + '='.repeat(80));
  log.info('VALIDATION REQUIREMENTS');
  console.log('='.repeat(80));
  
  console.log('\n📋 Based on the Excel files, validation should check:');
  console.log('1. ✅ File signature (ZIP-based for .xlsx)');
  console.log('2. ✅ Minimum file size (> 1KB)');
  console.log('3. ✅ Valid ZIP structure');
  console.log('4. ✅ Contains at least one worksheet');
  console.log('5. ✅ Worksheet has data (not empty)');
  console.log('6. ✅ Column headers are present');
  console.log('7. ✅ Data rows follow expected format');
  console.log('8. ✅ No malicious content (scripts, executables)');
  console.log('9. ✅ Reasonable file size limits');
  console.log('10. ✅ Proper Excel file structure');
  
  return results;
}

// Run analysis
analyzeAllExcelFiles().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
});
