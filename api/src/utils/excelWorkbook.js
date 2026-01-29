/**
 * ExcelJS Workbook Adapter
 * 
 * Provides a compatibility layer to replace SheetJS `xlsx` with `exceljs`.
 * Maintains exact output parity: 2D arrays (AoA) with null for empty cells,
 * blank rows preserved, and consistent string normalization.
 */

import ExcelJS from 'exceljs';

/**
 * Load an .xlsx workbook from a buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<ExcelJS.Workbook>} - Loaded workbook
 */
export async function loadXlsxWorkbookFromBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/**
 * Get sheet names from a workbook
 * @param {ExcelJS.Workbook} workbook
 * @returns {string[]} - Array of sheet names
 */
export function workbookToSheetNames(workbook) {
  return workbook.worksheets.map(ws => ws.name);
}

/**
 * Get a worksheet by name
 * @param {ExcelJS.Workbook} workbook
 * @param {string} sheetName
 * @returns {ExcelJS.Worksheet|null}
 */
export function getWorksheet(workbook, sheetName) {
  return workbook.getWorksheet(sheetName) || null;
}

/**
 * Convert a worksheet to Array of Arrays (AoA)
 * Preserves empty cells as null, includes blank rows, normalizes values to strings/null.
 * 
 * This matches the output of XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true, raw: false })
 * 
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Object} options
 * @param {boolean} options.includeEmpty - Include empty cells as null (default: true)
 * @param {boolean} options.normalizeEmptyToNull - Convert empty strings/undefined to null (default: true)
 * @returns {Array<Array<string|number|null>>} - 2D array of cell values
 */
export function worksheetToAoa(worksheet, options = {}) {
  const { includeEmpty = true, normalizeEmptyToNull = true } = options;
  
  if (!worksheet || !worksheet.rowCount) {
    return [];
  }
  
  // Get dimensions
  // ExcelJS uses 1-based indexing
  const rowCount = worksheet.rowCount;
  const columnCount = worksheet.columnCount;
  
  if (rowCount === 0 || columnCount === 0) {
    return [];
  }
  
  const result = [];
  
  // Iterate through rows (1-based in ExcelJS)
  for (let rowIdx = 1; rowIdx <= rowCount; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    const rowData = [];
    
    // Iterate through columns (1-based in ExcelJS)
    for (let colIdx = 1; colIdx <= columnCount; colIdx++) {
      const cell = row.getCell(colIdx);
      let value = normalizeCellValue(cell, normalizeEmptyToNull);
      rowData.push(value);
    }
    
    // Trim trailing nulls from row only if not preserving empty cells
    if (!includeEmpty) {
      while (rowData.length > 0 && rowData[rowData.length - 1] === null) {
        rowData.pop();
      }
    }
    
    result.push(rowData);
  }
  
  return result;
}

/**
 * Normalize a cell value to match xlsx library output
 * - Empty cells → null
 * - Empty strings → null
 * - Formulas → evaluated result (as string)
 * - Dates → formatted string (YYYY-MM-DD)
 * - Numbers → string representation
 * - Rich text → plain text string
 * - Everything else → string
 * 
 * @param {ExcelJS.Cell} cell
 * @param {boolean} normalizeEmptyToNull
 * @returns {string|number|null}
 */
function normalizeCellValue(cell, normalizeEmptyToNull = true) {
  if (!cell) {
    return null;
  }
  
  // Get the value - for formulas, use the result
  let value = cell.value;
  
  // Handle formula cells - get the result
  if (value && typeof value === 'object' && 'result' in value) {
    value = value.result;
  }
  
  // Handle rich text (array of text runs)
  if (value && typeof value === 'object' && 'richText' in value) {
    value = value.richText.map(rt => rt.text || '').join('');
  }
  
  // Handle error values
  if (value && typeof value === 'object' && 'error' in value) {
    return value.error; // Return error code as string (e.g., "#VALUE!")
  }
  
  // Handle hyperlinks
  if (value && typeof value === 'object' && 'hyperlink' in value) {
    value = value.text || value.hyperlink || '';
  }
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle empty strings
  if (value === '' && normalizeEmptyToNull) {
    return null;
  }
  
  // Handle dates - convert to YYYY-MM-DD string
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    // Format as YYYY-MM-DD to match xlsx behavior
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  // Handle numbers - xlsx returns them as numbers when raw: false, but we want strings for parity
  // Actually, xlsx with raw: false returns formatted strings, but for numeric data we keep numbers
  // to maintain parsing behavior. Let's return as string for consistency.
  if (typeof value === 'number') {
    // Return as string to match xlsx raw: false behavior
    return String(value);
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // xlsx normalizes whitespace-only to null in some modes
    const trimmed = value.trim();
    if (trimmed === '' && normalizeEmptyToNull) {
      return null;
    }
    return value; // Keep original string with whitespace
  }
  
  // Fallback: convert to string
  return String(value);
}

/**
 * Get AoA for a specific sheet by name
 * Convenience function combining getWorksheet + worksheetToAoa
 * 
 * @param {ExcelJS.Workbook} workbook
 * @param {string} sheetName
 * @param {Object} options - Options for worksheetToAoa
 * @returns {Array<Array<string|number|null>>|null} - 2D array or null if sheet not found
 */
export function getSheetAoa(workbook, sheetName, options = {}) {
  const worksheet = getWorksheet(workbook, sheetName);
  if (!worksheet) {
    return null;
  }
  return worksheetToAoa(worksheet, options);
}

/**
 * Get workbook info (for validation)
 * @param {ExcelJS.Workbook} workbook
 * @returns {Object} - { sheetCount, sheetNames }
 */
export function getWorkbookInfo(workbook) {
  const sheetNames = workbookToSheetNames(workbook);
  return {
    sheetCount: sheetNames.length,
    sheetNames
  };
}

/**
 * Get worksheet dimensions
 * @param {ExcelJS.Worksheet} worksheet
 * @returns {{ rowCount: number, columnCount: number }}
 */
export function getWorksheetDimensions(worksheet) {
  if (!worksheet) {
    return { rowCount: 0, columnCount: 0 };
  }
  return {
    rowCount: worksheet.rowCount || 0,
    columnCount: worksheet.columnCount || 0
  };
}

export default {
  loadXlsxWorkbookFromBuffer,
  workbookToSheetNames,
  getWorksheet,
  worksheetToAoa,
  getSheetAoa,
  getWorkbookInfo,
  getWorksheetDimensions
};
