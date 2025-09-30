/**
 * Excel Parser V2 - Multi-Position Table Detection
 * 
 * Handles commission tables located anywhere in the spreadsheet:
 * - Main Commission can be in columns A-H, rows 1-100
 * - Agent US can be in columns J-T, rows 150-200
 * - Hourly Payout can be in columns A-F, rows 50-100
 * 
 * Searches entire sheet for headers, not just column A
 */

import XLSX from 'xlsx';

/**
 * Load Excel workbook from buffer or file
 */
export function loadExcelWorkbook(fileBuffer) {
    return XLSX.read(fileBuffer, { type: 'buffer', cellDates: false, cellText: false });
}

/**
 * Get worksheet data as 2D array
 */
export function getWorksheetData(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    
    // Get the sheet range to ensure we capture all columns including empty ones
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,           // Return array of arrays
        defval: null,        // Empty cells return null (not undefined)
        raw: false,          // Format values as strings
        dateNF: 'yyyy-mm-dd',
        range: range,        // CRITICAL: Include full range to preserve empty cells
        blankrows: true      // Include blank rows (don't skip them)
    });
}

/**
 * Search entire sheet for a header row containing specific keywords
 * Returns { row, col, matchedKeywords } or null
 */
function findHeaderAnywhere(data, requiredKeywords, blockName) {
    console.log(`[findHeaderAnywhere:${blockName}] Searching for keywords:`, requiredKeywords.slice(0, 5));
    
    for (let rowIdx = 0; rowIdx < Math.min(300, data.length); rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;
        
        // Check all columns in this row
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx];
            if (!cell) continue;
            
            const cellStr = String(cell).trim().toLowerCase();
            
            // Check if this cell matches a key identifier
            let isHeaderMatch = false;
            
            if (blockName === 'main') {
                // Main header: Look for "Name" + commission-related columns nearby
                if (cellStr === 'name' || cellStr === 'employee') {
                    // Check next few cells for commission keywords
                    const nextCells = row.slice(colIdx, colIdx + 10).map(c => 
                        c ? String(c).toLowerCase() : ''
                    ).join(' ');
                    if (nextCells.includes('commission') || nextCells.includes('hourly rate') || nextCells.includes('total due')) {
                        isHeaderMatch = true;
                        console.log(`[findHeaderAnywhere:${blockName}] ✅ Found at Row ${rowIdx + 1}, Col ${String.fromCharCode(65 + colIdx)}`);
                    }
                }
            } else if (blockName === 'agents_us') {
                // Agent US header: Look for "Agents" or similar
                if (cellStr === 'agents' || cellStr === 'agent' || cellStr === 'agents us') {
                    isHeaderMatch = true;
                    console.log(`[findHeaderAnywhere:${blockName}] ✅ Found at Row ${rowIdx + 1}, Col ${String.fromCharCode(65 + colIdx)}`);
                }
            } else if (blockName === 'hourly') {
                // Hourly header: Look for "hourly paid out"
                if (cellStr === 'hourly paid out' || cellStr.startsWith('hourly paid')) {
                    isHeaderMatch = true;
                    console.log(`[findHeaderAnywhere:${blockName}] ✅ Found at Row ${rowIdx + 1}, Col ${String.fromCharCode(65 + colIdx)}`);
                }
            }
            
            if (isHeaderMatch) {
                // Found header! Now map all columns in this row
                const columnMapping = {};
                const columnCounts = {}; // Track duplicate column names
                let nameColIdx = null;
                
                for (let c = 0; c < row.length; c++) {
                    const headerCell = row[c];
                    if (headerCell) {
                        let headerStr = String(headerCell).trim();
                        
                        // Handle duplicate column names by adding suffix
                        if (columnMapping.hasOwnProperty(headerStr)) {
                            columnCounts[headerStr] = (columnCounts[headerStr] || 1) + 1;
                            headerStr = `${headerStr}__${columnCounts[headerStr]}`;
                            console.log(`[findHeaderAnywhere:${blockName}] Duplicate column "${String(headerCell).trim()}" → renamed to "${headerStr}"`);
                        }
                        
                        columnMapping[headerStr] = c;
                        
                        // Identify name column (use original name for matching)
                        const headerLower = String(headerCell).trim().toLowerCase();
                        if (headerLower === 'name' || headerLower === 'employee' || 
                            headerLower === 'agents' || headerLower === 'agent' ||
                            headerLower === 'hourly paid out') {
                            nameColIdx = c;
                        }
                    }
                }
                
                // If no name column found, use the first column with data
                if (nameColIdx === null) {
                    nameColIdx = colIdx;
                }
                
                console.log(`[findHeaderAnywhere:${blockName}] Name column: ${String.fromCharCode(65 + nameColIdx)} (index ${nameColIdx})`);
                console.log(`[findHeaderAnywhere:${blockName}] Total columns mapped: ${Object.keys(columnMapping).length}`);
                
                return {
                    headerRow: rowIdx,
                    startRow: rowIdx + 1,
                    nameColIdx,
                    columns: columnMapping
                };
            }
        }
    }
    
    console.log(`[findHeaderAnywhere:${blockName}] ❌ Not found`);
    return null;
}

/**
 * Find where the data ends for a table starting at startRow in column nameColIdx
 */
function findDataEndRowFlexible(data, startRow, nameColIdx) {
    let emptyCount = 0;
    const REQUIRED_EMPTY = 3;
    
    console.log(`[findDataEndRow] Starting at row ${startRow + 1}, name column ${String.fromCharCode(65 + nameColIdx)}`);
    
    for (let rowIdx = startRow; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!Array.isArray(row)) {
            break;
        }
        
        // PRIMARY STOP CONDITION: Check ALL cells in this row for section headers
        // (not just the name column, since headers can be in different columns)
        let foundSectionHeader = false;
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cellValue = row[colIdx];
            const cellStr = cellValue ? String(cellValue).trim().toLowerCase() : '';
            
            if (cellStr && (
                cellStr === 'agents' || 
                cellStr === 'agent' ||
                cellStr === 'agents us' ||
                cellStr === 'hourly paid out' ||
                cellStr === 'hourly paid' ||
                cellStr === 'hourly payout' ||
                cellStr.includes('hourly paid out') ||
                cellStr.includes('paid parking pass'))) {
                console.log(`[findDataEndRow] ✅ Detected section header at row ${rowIdx + 1}, col ${String.fromCharCode(65 + colIdx)}: "${cellStr}" - ending block`);
                foundSectionHeader = true;
                break;
            }
        }
        
        if (foundSectionHeader) {
            return rowIdx;
        }
        
        // Check if name column is empty (for empty row counting)
        const nameValue = nameColIdx < row.length ? row[nameColIdx] : null;
        const nameStr = nameValue ? String(nameValue).trim().toLowerCase() : '';
        
        if (!nameStr) {
            // BACKUP STOP CONDITION: Count empty rows
            emptyCount++;
            if (emptyCount >= REQUIRED_EMPTY) {
                const endRow = rowIdx - REQUIRED_EMPTY + 1;
                console.log(`[findDataEndRow] Found ${REQUIRED_EMPTY} empty rows, ending at row ${endRow + 1}`);
                return endRow;
            }
        } else {
            emptyCount = 0;
        }
    }
    
    console.log(`[findDataEndRow] Reached end of sheet at row ${data.length}`);
    return data.length;
}

/**
 * Detect all commission blocks anywhere in the sheet
 */
export function detectAllBlocks(data) {
    console.log('\n[detectAllBlocks] Starting full-sheet scan...');
    console.log(`[detectAllBlocks] Sheet has ${data.length} rows`);
    
    // Detect Main Commission Block
    const mainResult = findHeaderAnywhere(data, ['Name', 'Commission Earned', 'Total due'], 'main');
    let mainBlock = null;
    if (mainResult) {
        const endRow = findDataEndRowFlexible(data, mainResult.startRow, mainResult.nameColIdx);
        mainBlock = {
        type: 'main',
            headerRow: mainResult.headerRow,
            startRow: mainResult.startRow,
            endRow: endRow,
            columns: mainResult.columns,
            nameColIdx: mainResult.nameColIdx
        };
        console.log(`[detectAllBlocks] Main block: ${endRow - mainResult.startRow} data rows`);
    }
    
    // Detect Agent US Block
    const agentsResult = findHeaderAnywhere(data, ['Agents', 'total US revenue'], 'agents_us');
    let agentsUSBlock = null;
    if (agentsResult) {
        const endRow = findDataEndRowFlexible(data, agentsResult.startRow, agentsResult.nameColIdx);
        agentsUSBlock = {
        type: 'agents_us',
            headerRow: agentsResult.headerRow,
            startRow: agentsResult.startRow,
            endRow: endRow,
            columns: agentsResult.columns,
            nameColIdx: agentsResult.nameColIdx
        };
        console.log(`[detectAllBlocks] Agent US block: ${endRow - agentsResult.startRow} data rows`);
    }
    
    // Detect Hourly Payout Block
    const hourlyResult = findHeaderAnywhere(data, ['hourly paid out'], 'hourly');
    let hourlyBlock = null;
    if (hourlyResult) {
        const endRow = findDataEndRowFlexible(data, hourlyResult.startRow, hourlyResult.nameColIdx);
        hourlyBlock = {
            type: 'hourly',
            headerRow: hourlyResult.headerRow,
            startRow: hourlyResult.startRow,
            endRow: endRow,
            columns: hourlyResult.columns,
            nameColIdx: hourlyResult.nameColIdx
        };
        console.log(`[detectAllBlocks] Hourly block: ${endRow - hourlyResult.startRow} data rows`);
    }
    
    return {
        main: mainBlock,
        agents_us: agentsUSBlock,
        hourly: hourlyBlock
    };
}

/**
 * Extract data from detected block
 */
export function extractBlockData(data, block) {
    if (!block) return [];
    
    const result = [];
    for (let rowIdx = block.startRow; rowIdx < block.endRow && rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!Array.isArray(row)) continue;
        
        const extractedRow = {};
        for (const [colName, colIdx] of Object.entries(block.columns)) {
            extractedRow[colName] = colIdx < row.length ? row[colIdx] : null;
        }
        
        result.push(extractedRow);
    }
    
    return result;
}

/**
 * Parse monetary value
 */
export function parseMoney(value, debugLabel = null) {
    if (value === null || value === undefined || value === '') return null;
    
    try {
        const valueStr = String(value).trim();
        if (!valueStr) return null;
        
        const isNegative = valueStr.startsWith('(') && valueStr.endsWith(')');
        const cleanValue = valueStr.replace(/[\$,\s\(\)]/g, '');
        if (!cleanValue || cleanValue === '-') return null;
        
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) return null;
        
        return isNegative ? -numValue : numValue;
    } catch (error) {
        return null;
    }
}

/**
 * Parse percentage value
 */
export function parsePercent(value) {
    if (value === null || value === undefined || value === '') return null;
    
    try {
        const valueStr = String(value).trim();
        if (!valueStr) return null;
        
        const cleanValue = valueStr.replace(/[%\s]/g, '');
        if (!cleanValue || cleanValue === '-') return null;
        
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) return null;
        
        // Excel often stores percentages as decimals (0.035 for 3.5%)
        // If value is between 0 and 1, multiply by 100
        if (numValue > 0 && numValue < 1) {
            return numValue * 100;
        }
        
        return numValue;
    } catch (error) {
        return null;
    }
}

/**
 * Parse period from sheet name (e.g., "July 2025" -> "2025-07-01")
 * Returns a string in format "YYYY-MM-01" to avoid timezone issues
 */
export function parsePeriodFromSheetName(sheetName) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    
    const nameLower = sheetName.toLowerCase().trim();
    const yearMatch = nameLower.match(/20\d{2}/);
    
    if (!yearMatch) return null;
    const year = yearMatch[0];
    
    for (let i = 0; i < monthNames.length; i++) {
        if (nameLower.includes(monthNames[i])) {
            const month = String(i + 1).padStart(2, '0');
            // Return string to avoid timezone conversion issues
            return `${year}-${month}-01`;
        }
    }
    
    return null;
}

/**
 * Normalize employee name for matching
 * Handles: case, spaces, underscores, special chars
 */
export function normalizeNameKey(name) {
    if (!name) return '';
    
    return name
        .trim()                          // Remove leading/trailing whitespace
        .toLowerCase()                   // Convert to lowercase for case-insensitive matching
        .replace(/^_+|_+$/g, '')        // Remove leading/trailing underscores
        .replace(/\s+/g, ' ')           // Collapse multiple spaces to single space
        .replace(/[^\w\s-]/g, '')       // Remove special chars except letters, numbers, spaces, hyphens
        .trim();                         // Final trim after removals
}

/**
 * Clean cell value
 */
export function cleanCellValue(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim();
    return cleaned || null;
}
