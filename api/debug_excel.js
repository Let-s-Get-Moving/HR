/**
 * Debug script to analyze the Excel file structure
 */
import * as XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel file
const buffer = fs.readFileSync('Untitled spreadsheet.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('Sheet names:', workbook.SheetNames);

// Analyze each sheet
workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== SHEET: ${sheetName} ===`);
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    
    console.log(`Total rows: ${data.length}`);
    
    // Show first 20 rows
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (row && row.length > 0) {
            const nonEmptyCount = row.filter(cell => cell && cell.toString().trim()).length;
            if (nonEmptyCount > 0) {
                console.log(`Row ${i}: [${row.map(cell => cell ? `"${cell}"` : 'null').join(', ')}]`);
            }
        }
    }
    
    // Look for potential headers in first 15 rows
    console.log('\n--- Potential headers ---');
    for (let i = 0; i < Math.min(15, data.length); i++) {
        const row = data[i];
        if (row && row.length > 3) { // Must have at least 4 columns
            const textCells = row.filter(cell => cell && typeof cell === 'string' && cell.trim().length > 2).length;
            if (textCells >= 3) { // Must have at least 3 text cells
                console.log(`Potential header row ${i}: [${row.map(cell => cell ? `"${cell}"` : 'null').join(', ')}]`);
            }
        }
    }
});
