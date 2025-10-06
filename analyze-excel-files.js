/**
 * ANALYZE EXCEL FILES
 * This script examines the actual Excel files to understand their structure
 * and content for proper validation
 */

const XLSX = require('xlsx');
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

function analyzeExcelFile(filePath) {
  log.info(`\n📊 Analyzing: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    console.log(`📋 Sheet Names: ${workbook.SheetNames.join(', ')}`);
    console.log(`📊 Number of Sheets: ${workbook.SheetNames.length}`);
    
    // Analyze each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n📄 Sheet ${index + 1}: "${sheetName}"`);
      console.log('-'.repeat(40));
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the range of the sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log(`📍 Range: ${worksheet['!ref'] || 'Empty'}`);
      console.log(`📏 Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
      
      // Get first 10 rows of data
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log(`📊 Total Data Rows: ${jsonData.length}`);
      
      if (jsonData.length > 0) {
        console.log('\n🔍 First 5 rows of data:');
        jsonData.slice(0, 5).forEach((row, i) => {
          console.log(`  Row ${i + 1}:`, row);
        });
        
        // Analyze column headers
        if (jsonData.length > 0) {
          const headers = jsonData[0];
          console.log(`\n📋 Column Headers (${headers.length}):`);
          headers.forEach((header, i) => {
            console.log(`  ${i + 1}. "${header}"`);
          });
        }
        
        // Check for data types in columns
        if (jsonData.length > 1) {
          console.log('\n🔍 Data Type Analysis:');
          const headers = jsonData[0];
          const sampleRow = jsonData[1];
          
          headers.forEach((header, i) => {
            const value = sampleRow[i];
            const type = typeof value;
            console.log(`  "${header}": ${type} (${value})`);
          });
        }
      }
      
      // Check for merged cells
      if (worksheet['!merges']) {
        console.log(`\n🔗 Merged Cells: ${worksheet['!merges'].length}`);
        worksheet['!merges'].slice(0, 3).forEach((merge, i) => {
          console.log(`  Merge ${i + 1}: ${XLSX.utils.encode_range(merge)}`);
        });
      }
      
      // Check for formulas
      const formulaCells = Object.keys(worksheet).filter(key => 
        key.startsWith('!') === false && worksheet[key].f
      );
      if (formulaCells.length > 0) {
        console.log(`\n🧮 Formula Cells: ${formulaCells.length}`);
        formulaCells.slice(0, 3).forEach(cell => {
          console.log(`  ${cell}: ${worksheet[cell].f}`);
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
      sheets: workbook.SheetNames.length,
      totalRows: workbook.SheetNames.reduce((total, sheetName) => {
        const ws = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        return total + jsonData.length;
      }, 0),
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
      const result = analyzeExcelFile(file);
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
      console.log(`✅ ${result.file}: ${result.sheets} sheets, ${result.totalRows} total rows, ${(result.fileSize / 1024).toFixed(2)} KB`);
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
