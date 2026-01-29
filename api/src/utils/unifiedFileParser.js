/**
 * Unified File Parser
 * 
 * Handles both CSV and Excel (.xlsx) files, normalizing them to the same workbook structure.
 * This ensures identical parsing logic works for both formats.
 * 
 * NOTE: .xls (legacy Excel) support has been removed for security reasons.
 * Only .xlsx and .csv files are supported.
 */

import { parse } from 'csv-parse/sync';
import {
  loadXlsxWorkbookFromBuffer,
  workbookToSheetNames,
  getSheetAoa
} from './excelWorkbook.js';

/**
 * Detect file type from buffer and filename
 * Returns: 'csv' | 'excel' | null
 * 
 * NOTE: Only .xlsx (ZIP-based) Excel files are supported. Legacy .xls is rejected.
 */
export function detectFileType(fileBuffer, filename) {
  // First check filename extension
  if (filename) {
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.csv')) {
      return 'csv';
    }
    if (lowerName.endsWith('.xlsx')) {
      return 'excel';
    }
    // Explicitly reject .xls
    if (lowerName.endsWith('.xls')) {
      console.warn('[detectFileType] Legacy .xls files are not supported. Please convert to .xlsx');
      return null;
    }
  }

  // Check file signature (magic numbers)
  if (fileBuffer.length < 4) {
    return null;
  }

  // Only accept ZIP-based Excel (.xlsx) - 4 bytes: PK\x03\x04
  const xlsxSignature = [0x50, 0x4B, 0x03, 0x04];
  if (fileBuffer.length >= xlsxSignature.length) {
    const isXlsx = xlsxSignature.every((byte, index) => fileBuffer[index] === byte);
    if (isXlsx) {
      return 'excel';
    }
  }

  // Explicitly reject OLE2 (legacy .xls) signature: D0 CF 11 E0
  const oleSignature = [0xD0, 0xCF, 0x11, 0xE0];
  if (fileBuffer.length >= oleSignature.length) {
    const isOle = oleSignature.every((byte, index) => fileBuffer[index] === byte);
    if (isOle) {
      console.warn('[detectFileType] Legacy .xls (OLE2) files are not supported. Please convert to .xlsx');
      return null;
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
 * Convert CSV content to a normalized workbook structure
 * Returns AoA (Array of Arrays) for consistency with Excel parsing
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

    // Normalize empty strings to null to match Excel behavior
    const normalizedRecords = records.map(row => 
      row.map(cell => {
        if (cell === '' || cell === null || cell === undefined) {
          return null;
        }
        return cell;
      })
    );
    
    // Return a workbook-like structure that matches our Excel output
    return {
      SheetNames: ['Sheet1'],
      Sheets: {
        'Sheet1': normalizedRecords // Store AoA directly
      },
      _isAoA: true // Flag to indicate this is already AoA format
    };
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}

/**
 * Load file as workbook (handles both CSV and Excel)
 * Returns workbook structure with consistent interface
 * 
 * For Excel files: Returns exceljs Workbook with added SheetNames property
 * For CSV files: Returns normalized structure with AoA data
 * 
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} Workbook object with SheetNames and Sheets properties
 */
export async function loadFileAsWorkbook(fileBuffer, filename) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('File buffer is empty');
  }

  const fileType = detectFileType(fileBuffer, filename);
  
  if (!fileType) {
    throw new Error(`Unable to detect file type. Expected CSV or Excel (.xlsx) file. Legacy .xls files are not supported.`);
  }

  if (fileType === 'csv') {
    // Parse CSV and convert to workbook structure
    const csvContent = fileBuffer.toString('utf8');
    return csvToWorkbook(csvContent, filename);
  } else if (fileType === 'excel') {
    // Use exceljs for Excel files
    const workbook = await loadXlsxWorkbookFromBuffer(fileBuffer);
    
    // Add SheetNames property for backwards compatibility
    workbook.SheetNames = workbookToSheetNames(workbook);
    
    // Add Sheets property that returns AoA when accessed
    // This provides compatibility with existing code that accesses workbook.Sheets[name]
    workbook.Sheets = {};
    for (const sheetName of workbook.SheetNames) {
      // Store the AoA data directly for compatibility
      workbook.Sheets[sheetName] = getSheetAoa(workbook, sheetName, {
        includeEmpty: true,
        normalizeEmptyToNull: true
      });
    }
    workbook._isAoA = true; // Flag to indicate Sheets contain AoA data
    
    return workbook;
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Get worksheet data as 2D array from a loaded workbook
 * Works with both CSV and Excel workbooks
 * 
 * @param {Object} workbook - Workbook from loadFileAsWorkbook
 * @param {string} sheetName - Name of the sheet
 * @returns {Array<Array<any>>} - 2D array of cell values
 */
export function getWorksheetDataFromWorkbook(workbook, sheetName) {
  if (!workbook || !workbook.Sheets) {
    return [];
  }
  
  const sheetData = workbook.Sheets[sheetName];
  if (!sheetData) {
    return [];
  }
  
  // If it's already AoA (from our new format), return directly
  if (workbook._isAoA || Array.isArray(sheetData)) {
    return sheetData;
  }
  
  // Fallback: shouldn't happen with new code, but handle legacy format
  return [];
}

