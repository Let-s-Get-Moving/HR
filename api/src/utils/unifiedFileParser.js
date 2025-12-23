/**
 * Unified File Parser
 * 
 * Handles both CSV and Excel files, normalizing them to the same workbook structure.
 * This ensures identical parsing logic works for both formats.
 */

import XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

/**
 * Detect file type from buffer and filename
 * Returns: 'csv' | 'excel' | null
 */
export function detectFileType(fileBuffer, filename) {
  // First check filename extension
  if (filename) {
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.csv')) {
      return 'csv';
    }
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      return 'excel';
    }
  }

  // Check file signature (magic numbers)
  if (fileBuffer.length < 4) {
    return null;
  }

  // Excel signatures
  const excelSignatures = [
    [0x50, 0x4B, 0x03, 0x04], // ZIP-based (xlsx)
    [0xD0, 0xCF, 0x11, 0xE0], // OLE2 (xls)
  ];

  for (const sig of excelSignatures) {
    if (fileBuffer.length >= sig.length) {
      const matches = sig.every((byte, index) => fileBuffer[index] === byte);
      if (matches) {
        return 'excel';
      }
    }
  }

  // CSV is text-based, check if it's valid UTF-8 text
  try {
    const text = fileBuffer.toString('utf8');
    // CSV typically has commas, newlines, and printable characters
    if (text.includes(',') && text.includes('\n')) {
      return 'csv';
    }
  } catch (e) {
    // Not valid UTF-8, probably not CSV
  }

  return null;
}

/**
 * Convert CSV content to Excel workbook structure
 * This allows CSV files to be processed identically to Excel files
 */
function csvToWorkbook(csvContent, filename) {
  try {
    // Parse CSV using csv-parse (handles quoted fields, commas in values, etc.)
    const records = parse(csvContent, {
      columns: false, // Return as array of arrays
      skip_empty_lines: false, // Keep empty rows for consistency
      relax_column_count: true, // Allow inconsistent column counts
      trim: false, // Preserve whitespace for exact matching
    });

    if (records.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Find max column count to determine sheet dimensions
    const maxCols = Math.max(...records.map(row => row ? row.length : 0), 1);
    const numRows = records.length;

    // Use XLSX utility to create proper worksheet structure
    // Convert 2D array directly to worksheet using XLSX.utils.aoa_to_sheet
    // Normalize empty strings to null to match Excel behavior
    const normalizedRecords = records.map(row => 
      row.map(cell => {
        if (cell === '' || cell === null || cell === undefined) {
          return null;
        }
        return cell;
      })
    );
    
    const sheet = XLSX.utils.aoa_to_sheet(normalizedRecords, {
      defval: null, // Empty cells return null
      raw: false,   // Format values as strings
      dateNF: 'yyyy-mm-dd'
    });

    // Create workbook structure matching XLSX library format
    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        'Sheet1': sheet
      }
    };

    return workbook;
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}

/**
 * Load file as workbook (handles both CSV and Excel)
 * Returns workbook structure compatible with XLSX library
 * 
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Object} Workbook object with SheetNames and Sheets properties
 */
export function loadFileAsWorkbook(fileBuffer, filename) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('File buffer is empty');
  }

  const fileType = detectFileType(fileBuffer, filename);
  
  if (!fileType) {
    throw new Error(`Unable to detect file type. Expected CSV or Excel file.`);
  }

  if (fileType === 'csv') {
    // Parse CSV and convert to workbook structure
    const csvContent = fileBuffer.toString('utf8');
    return csvToWorkbook(csvContent, filename);
  } else if (fileType === 'excel') {
    // Use existing XLSX library for Excel files
    return XLSX.read(fileBuffer, { 
      type: 'buffer', 
      cellDates: false, 
      cellText: false 
    });
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

