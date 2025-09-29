/**
 * Excel parsing utilities for commission import
 * 
 * Handles detection and parsing of the three main data blocks:
 * - Main Commission Table
 * - Agent US Commission Table  
 * - Hourly Payout Table
 */

import * as XLSX from 'xlsx';

// Header keywords for detecting each block type - exact matches from real file
const MAIN_COMMISSION_KEYWORDS = [
    // Core identification columns (these must exist)
    "Name",
    "Hourly Rate", 
    "Commission Earned",
    "Total due",
    
    // Supporting columns (nice to have)
    "Revenue on Smart Moving", "Smart Moving", "Revenue",
    "Total Revenue", "Revenue Total", 
    "Booking %", "Booking", "Commission %", "Commission",
    "Remaining amount", "Remaining", "Amount paid",
    "Spiff Bonus", "Revenue Bonus", "Bonus", "Bonuses",
    "Hourly Paid Out", "Paid Out", "Deduction", "Deductions"
];

const AGENT_US_KEYWORDS = [
    "Agents", "Agent", "Name", "Employee", "Person", "Staff",
    "US revenue", "total US revenue", "US Rev", "Revenue US", "US Sales",
    "commission %", "Commission", "Comm %", "Commission Percent", "Comm Percent",
    "Commission earned", "Commission Earned", "Earned", "Comm Earned", "Total Comm",
    "1.25X", "125X", "1.25", "125", "Bonus Multiplier", "Multiplier",
    "Bonus", "Bonuses", "Extra", "Premium", "Incentive"
];

const HOURLY_PAYOUT_KEYWORDS = [
    "hourly paid out", "hourly paid", "hourly", "paid out", "payout", 
    "cash paid", "cash", "payment", "paid", "pay",
    "TOTAL HOURLY PAID", "total hourly", "hourly total", "total paid",
    "hours", "time", "worked", "labor"
];

// Column mapping - flexible fuzzy matching
const MAIN_COMMISSION_COLUMN_MAPPING = {
    // Exact matches first
    "Name": "name_raw",
    "Hourly Rate": "hourly_rate", 
    "Commission Earned": "commission_earned",
    "Total due": "total_due",
    "Remaining amount": "remaining_amount",
    "Amount paid": "amount_paid",
    
    // Flexible patterns for revenue columns
    "Revenue on Smart Moving": "rev_sm_all_locations",
    "Total Revenue": "total_revenue_all",
    "Revenue Add Ons": "rev_add_ons",
    "Revenue Deduction": "rev_deduction",
    
    // Percentage and rate columns
    "Booking %": "booking_pct",
    "Commission %": "commission_pct",
    
    // Bonus columns
    "Spiff Bonus": "spiff_bonus",
    "Revenue Bonus": "revenue_bonus", 
    "Bonuses for booking US jobs": "bonus_us_jobs_125x",
    "Bonus for Booking": "booking_bonus_plus",
    
    // Deduction columns  
    "Hourly Paid Out": "hourly_paid_out_minus",
    "Deduction by Sales Manager": "deduction_sales_manager_minus",
    "Deductions for missing punch": "deduction_missing_punch_minus",
    "Deductions from Customer Support": "deduction_customer_support_minus", 
    "Deduction Post Commission": "deduction_post_commission_collected_minus",
    "Deductions from dispatch": "deduction_dispatch_minus",
    "deduction": "deduction_other_minus"
};

const AGENT_COMMISSION_COLUMN_MAPPING = {
    "Name": "name_raw",
    "total US revenue": "total_us_revenue",
    "commission %": "commission_pct", 
    "Commission earned": "commission_earned",
    "1.25X": "commission_125x",
    "Bonus": "bonus"
};

/**
 * Load Excel workbook from buffer
 */
export function loadExcelWorkbook(buffer) {
    return XLSX.read(buffer, { type: 'buffer', cellDates: true });
}

/**
 * Get worksheet data as array of arrays
 */
export function getWorksheetData(workbook, sheetName = null) {
    const sheet = sheetName ? 
        workbook.Sheets[sheetName] : 
        workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 1]]; // Last sheet by default
        
    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    // Convert to array of arrays with header=false equivalent 
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    return data;
}

/**
 * Normalize header text for comparison
 */
export function normalizeHeaderText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if header fuzzy matches target keyword
 */
export function fuzzyMatchHeader(header, target, threshold = 0.3) {
    const headerNorm = normalizeHeaderText(header);
    const targetNorm = normalizeHeaderText(target);
    
    if (!headerNorm || !targetNorm) return false;
    
    // Exact match
    if (headerNorm === targetNorm) return true;
    
    // Substring match
    if (targetNorm.includes(headerNorm) || headerNorm.includes(targetNorm)) return true;
    
    // Word matching
    const targetWords = targetNorm.split(' ');
    const headerWords = headerNorm.split(' ');
    
    if (targetWords.length === 0) return false;
    
    const matches = targetWords.filter(word => headerWords.includes(word)).length;
    return matches / targetWords.length >= threshold;
}

/**
 * Detect header row by finding row with most keyword matches
 */
export function detectHeaderRow(data, keywords, minMatches = null) {
    if (minMatches === null) {
        minMatches = Math.max(3, Math.floor(keywords.length * 0.25));  // Need 25% matches, minimum 3 core columns
    }
    
    console.log(`Looking for keywords: ${keywords.join(', ')}, min matches needed: ${minMatches}`);
    
    let bestRow = null;
    let bestScore = 0;
    
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!Array.isArray(row)) continue;
        
        let score = 0;
        const matchedHeaders = [];
        
        for (const cellValue of row) {
            if (cellValue === null || cellValue === undefined) continue;
            
            const cellStr = String(cellValue);
            for (const keyword of keywords) {
                if (fuzzyMatchHeader(cellStr, keyword)) {
                    score++;
                    matchedHeaders.push(`"${cellStr}" matches "${keyword}"`);
                    break; // Only count each cell once
                }
            }
        }
        
        if (score > 0) {
            console.log(`Row ${rowIdx}: score ${score}, matches: ${matchedHeaders.join(', ')}`);
        }
        
        if (score >= minMatches && score > bestScore) {
            bestScore = score;
            bestRow = rowIdx;
        }
    }
    
    if (bestRow !== null) {
        console.log(`Best header row: ${bestRow} with score ${bestScore}`);
    } else {
        console.log(`No header row found with minimum ${minMatches} matches`);
        console.log('First 10 rows of data for debugging:');
        for (let i = 0; i < Math.min(10, data.length); i++) {
            console.log(`Row ${i}:`, data[i]);
        }
    }
    
    return bestRow;
}

/**
 * Extract column mapping for detected header row
 */
export function extractColumnMapping(data, headerRow, keywords) {
    const mapping = {};
    const headerData = data[headerRow];
    
    if (!Array.isArray(headerData)) return mapping;
    
    for (let colIdx = 0; colIdx < headerData.length; colIdx++) {
        const cellValue = headerData[colIdx];
        if (cellValue === null || cellValue === undefined) continue;
        
        const cellStr = String(cellValue).trim();
        if (!cellStr) continue;
        
        // Find best matching keyword
        for (const keyword of keywords) {
            if (fuzzyMatchHeader(cellStr, keyword)) {
                mapping[cellStr] = colIdx;
                break;
            }
        }
    }
    
    return mapping;
}

/**
 * Extract ALL columns from header row (not just matching keywords)
 */
export function extractAllColumns(data, headerRow) {
    const mapping = {};
    const headerData = data[headerRow];
    
    if (!Array.isArray(headerData)) return mapping;
    
    for (let colIdx = 0; colIdx < headerData.length; colIdx++) {
        const cellValue = headerData[colIdx];
        if (cellValue === null || cellValue === undefined) continue;
        
        const cellStr = String(cellValue).trim();
        if (!cellStr) continue;
        
        // Map ALL columns, not just matching ones
        mapping[cellStr] = colIdx;
    }
    
    return mapping;
}

/**
 * Find data end by looking for consecutive empty name rows OR a new header row
 */
export function findDataEndRow(data, startRow, nameColIdx) {
    let emptyCount = 0;
    const REQUIRED_EMPTY_ROWS = 10; // Require 10 consecutive empty rows to end block (max gap between blocks is 14)
    
    for (let rowIdx = startRow; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!Array.isArray(row) || nameColIdx >= row.length) {
            break;
        }
        
        const nameValue = row[nameColIdx];
        const nameStr = nameValue ? String(nameValue).trim() : '';
        
        // Check if this looks like a header row (e.g., "Agents", "hourly paid out", etc.)
        if (nameStr && (
            nameStr.toLowerCase().includes('agent') && nameStr.length < 20 ||
            nameStr.toLowerCase().includes('hourly') && nameStr.length < 30 ||
            nameStr.toLowerCase() === 'name' ||
            nameStr.toLowerCase() === 'employee'
        )) {
            // Likely hit a new section header
            console.log(`[findDataEndRow] Detected potential header at row ${rowIdx}: "${nameStr}" - ending block`);
            return rowIdx;
        }
        
        if (!nameStr) {
            emptyCount++;
            if (emptyCount >= REQUIRED_EMPTY_ROWS) {
                return rowIdx - REQUIRED_EMPTY_ROWS + 1;
            }
        } else {
            emptyCount = 0;
        }
    }
    
    return data.length;
}

/**
 * Detect date range columns for hourly payout
 */
export function detectDateRangeColumns(headerData) {
    const mapping = {};
    const dateRangePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}\s*[-–—]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}/i;
    
    if (!Array.isArray(headerData)) return mapping;
    
    for (let colIdx = 0; colIdx < headerData.length; colIdx++) {
        const cellValue = headerData[colIdx];
        if (!cellValue) continue;
        
        const cellStr = String(cellValue).trim();
        if (dateRangePattern.test(cellStr)) {
            mapping[cellStr] = colIdx;
        }
    }
    
    return mapping;
}

/**
 * Parse monetary value handling various formats
 */
export function parseMoney(value, debugLabel = null) {
    if (value === null || value === undefined || value === '') {
        if (debugLabel) console.log(`[parseMoney:${debugLabel}] Input is null/undefined/empty`);
        return null;
    }
    
    try {
        const valueStr = String(value).trim();
        if (!valueStr) {
            if (debugLabel) console.log(`[parseMoney:${debugLabel}] String is empty after trim`);
            return null;
        }
        
        // Check for negative (parentheses)
        const isNegative = valueStr.startsWith('(') && valueStr.endsWith(')');
        
        // Remove monetary formatting
        const cleanValue = valueStr.replace(/[\$,\s\(\)]/g, '');
        if (!cleanValue || cleanValue === '-') {
            if (debugLabel) console.log(`[parseMoney:${debugLabel}] Clean value is empty or dash: "${cleanValue}"`);
            return null;
        }
        
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) {
            if (debugLabel) console.log(`[parseMoney:${debugLabel}] parseFloat returned NaN for: "${cleanValue}"`);
            return null;
        }
        
        const result = isNegative ? -numValue : numValue;
        if (debugLabel) console.log(`[parseMoney:${debugLabel}] Input="${valueStr}" -> Parsed=${result}`);
        return result;
    } catch (error) {
        if (debugLabel) console.log(`[parseMoney:${debugLabel}] Error: ${error.message}`);
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
        
        // Remove % and spaces
        const cleanValue = valueStr.replace(/[%\s]/g, '');
        if (!cleanValue) return null;
        
        const numValue = parseFloat(cleanValue);
        return isNaN(numValue) ? null : numValue;
    } catch (error) {
        return null;
    }
}

/**
 * Normalize name for matching
 */
export function normalizeNameKey(name) {
    if (!name) return '';
    return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parse period from sheet name
 */
export function parsePeriodFromSheetName(sheetName) {
    if (!sheetName) return null;
    
    const monthPatterns = [
        { pattern: /\b(jan(?:uary)?)[a-z]*\s*(\d{4})\b/i, month: 1 },
        { pattern: /\b(feb(?:ruary)?)[a-z]*\s*(\d{4})\b/i, month: 2 },
        { pattern: /\b(mar(?:ch)?)[a-z]*\s*(\d{4})\b/i, month: 3 },
        { pattern: /\b(apr(?:il)?)[a-z]*\s*(\d{4})\b/i, month: 4 },
        { pattern: /\b(may)[a-z]*\s*(\d{4})\b/i, month: 5 },
        { pattern: /\b(jun(?:e)?)[a-z]*\s*(\d{4})\b/i, month: 6 },
        { pattern: /\b(jul(?:y)?)[a-z]*\s*(\d{4})\b/i, month: 7 },
        { pattern: /\b(aug(?:ust)?)[a-z]*\s*(\d{4})\b/i, month: 8 },
        { pattern: /\b(sep(?:tember)?)[a-z]*\s*(\d{4})\b/i, month: 9 },
        { pattern: /\b(oct(?:ober)?)[a-z]*\s*(\d{4})\b/i, month: 10 },
        { pattern: /\b(nov(?:ember)?)[a-z]*\s*(\d{4})\b/i, month: 11 },
        { pattern: /\b(dec(?:ember)?)[a-z]*\s*(\d{4})\b/i, month: 12 }
    ];
    
    for (const { pattern, month } of monthPatterns) {
        const match = sheetName.match(pattern);
        if (match) {
            const year = parseInt(match[2]);
            return new Date(year, month - 1, 1); // JavaScript months are 0-indexed
        }
    }
    
    // Try numeric pattern YYYY-MM
    const numericMatch = sheetName.match(/\b(\d{4})-(\d{1,2})\b/);
    if (numericMatch) {
        const year = parseInt(numericMatch[1]);
        const month = parseInt(numericMatch[2]);
        if (month >= 1 && month <= 12) {
            return new Date(year, month - 1, 1);
        }
    }
    
    return null;
}

/**
 * Detect main commission data block
 */
export function detectMainCommissionBlock(data) {
    const headerRow = detectHeaderRow(data, MAIN_COMMISSION_KEYWORDS);
    if (headerRow === null) return null;
    
    const columnMapping = extractColumnMapping(data, headerRow, Object.keys(MAIN_COMMISSION_COLUMN_MAPPING));
    
    // Find name column
    let nameColIdx = null;
    for (const [colName, colIdx] of Object.entries(columnMapping)) {
        if (fuzzyMatchHeader(colName, "Name")) {
            nameColIdx = colIdx;
            break;
        }
    }
    
    if (nameColIdx === null) return null;
    
    const startRow = headerRow + 1;
    const endRow = findDataEndRow(data, startRow, nameColIdx);
    
    return {
        type: 'main',
        headerRow,
        startRow,
        endRow,
        columns: columnMapping
    };
}

/**
 * Detect agent US commission data block
 */
export function detectAgentUSCommissionBlock(data) {
    return detectAgentUSCommissionBlockFrom(data, 0);
}

/**
 * Detect agent US commission data block starting from a specific row
 */
export function detectAgentUSCommissionBlockFrom(data, startSearchRow = 0) {
    // Search only from the specified start row
    const searchData = data.slice(startSearchRow);
    const headerRow = detectHeaderRow(searchData, AGENT_US_KEYWORDS);
    if (headerRow === null) return null;
    
    // Adjust header row to original data array index
    const actualHeaderRow = startSearchRow + headerRow;
    
    const columnMapping = extractColumnMapping(data, actualHeaderRow, Object.keys(AGENT_COMMISSION_COLUMN_MAPPING));
    
    // Find name column
    let nameColIdx = null;
    for (const [colName, colIdx] of Object.entries(columnMapping)) {
        if (fuzzyMatchHeader(colName, "Name") || fuzzyMatchHeader(colName, "Agents") || fuzzyMatchHeader(colName, "Agent")) {
            nameColIdx = colIdx;
            break;
        }
    }
    
    if (nameColIdx === null) {
        // Default to first column if no name column found
        nameColIdx = 0;
    }
    
    const startRow = actualHeaderRow + 1;
    const endRow = findDataEndRow(data, startRow, nameColIdx);
    
    return {
        type: 'agents_us',
        headerRow: actualHeaderRow,
        startRow,
        endRow,
        columns: columnMapping,
        nameColIdx
    };
}

/**
 * Detect hourly payout data block
 */
export function detectHourlyPayoutBlock(data) {
    const headerRow = detectHeaderRow(data, HOURLY_PAYOUT_KEYWORDS);
    if (headerRow === null) return null;
    
    const headerData = data[headerRow];
    if (!Array.isArray(headerData)) return null;
    
    const columnMapping = {};
    let nameColIdx = null;
    
    // Find name column (usually first column)
    for (let colIdx = 0; colIdx < headerData.length; colIdx++) {
        const cellValue = headerData[colIdx];
        if (cellValue && fuzzyMatchHeader(String(cellValue), "Name")) {
            columnMapping[String(cellValue)] = colIdx;
            nameColIdx = colIdx;
            break;
        }
    }
    
    // If no explicit name column, use first column
    if (nameColIdx === null) {
        nameColIdx = 0;
        if (headerData[0]) {
            columnMapping[String(headerData[0])] = 0;
        }
    }
    
    // Find date range columns
    const dateColumns = detectDateRangeColumns(headerData);
    Object.assign(columnMapping, dateColumns);
    
    const startRow = headerRow + 1;
    const endRow = findDataEndRow(data, startRow, nameColIdx);
    
    return {
        type: 'hourly',
        headerRow,
        startRow,
        endRow,
        columns: columnMapping,
        nameColIdx
    };
}

/**
 * Detect hourly payout data block starting from a specific row
 */
export function detectHourlyPayoutBlockFrom(data, startSearchRow = 0) {
    // Search only from the specified start row
    const searchData = data.slice(startSearchRow);
    const headerRow = detectHeaderRow(searchData, HOURLY_PAYOUT_KEYWORDS);
    if (headerRow === null) return null;
    
    // Adjust header row to original data array index
    const actualHeaderRow = startSearchRow + headerRow;
    
    const headerData = data[actualHeaderRow];
    if (!Array.isArray(headerData)) return null;
    
    const columnMapping = {};
    let nameColIdx = null;
    
    // Find name column (usually first column)
    for (let colIdx = 0; colIdx < headerData.length; colIdx++) {
        const cellValue = headerData[colIdx];
        if (cellValue && fuzzyMatchHeader(String(cellValue), "Name")) {
            columnMapping[String(cellValue)] = colIdx;
            nameColIdx = colIdx;
            break;
        }
    }
    
    // If no explicit name column, use first column
    if (nameColIdx === null) {
        nameColIdx = 0;
        if (headerData[0]) {
            columnMapping[String(headerData[0])] = 0;
        }
    }
    
    // Find date range columns
    const dateColumns = detectDateRangeColumns(headerData);
    Object.assign(columnMapping, dateColumns);
    
    const startRow = actualHeaderRow + 1;
    const endRow = findDataEndRow(data, startRow, nameColIdx);
    
    return {
        type: 'hourly',
        headerRow: actualHeaderRow,
        startRow,
        endRow,
        columns: columnMapping,
        nameColIdx
    };
}

/**
 * Detect all blocks in worksheet - search sequentially to avoid overlaps
 */
export function detectAllBlocks(data) {
    console.log(`[detectAllBlocks] Starting detection with ${data.length} total rows`);
    
    const mainBlock = detectMainCommissionBlock(data);
    console.log(`[detectAllBlocks] Main block:`, mainBlock ? `Found at row ${mainBlock.headerRow}, data rows ${mainBlock.startRow} to ${mainBlock.endRow}` : 'Not found');
    
    // Search for Agent US block starting AFTER main block ends
    let searchStartRow = mainBlock ? mainBlock.endRow + 1 : 0;
    console.log(`[detectAllBlocks] Searching for Agent US starting from row ${searchStartRow}`);
    
    // Log a sample of rows around the search area
    if (searchStartRow < data.length) {
        for (let i = searchStartRow; i < Math.min(searchStartRow + 5, data.length); i++) {
            console.log(`[detectAllBlocks] Row ${i} sample:`, data[i] ? data[i].slice(0, 5) : 'empty');
        }
    }
    
    const agentsUSBlock = detectAgentUSCommissionBlockFrom(data, searchStartRow);
    console.log(`[detectAllBlocks] Agent US block:`, agentsUSBlock ? `Found at row ${agentsUSBlock.headerRow}, data rows ${agentsUSBlock.startRow} to ${agentsUSBlock.endRow}` : 'Not found');
    
    // Search for Hourly block starting AFTER agent US block ends
    searchStartRow = agentsUSBlock ? agentsUSBlock.endRow + 1 : searchStartRow;
    console.log(`[detectAllBlocks] Searching for Hourly starting from row ${searchStartRow}`);
    
    // Log a sample of rows around the search area
    if (searchStartRow < data.length) {
        for (let i = searchStartRow; i < Math.min(searchStartRow + 5, data.length); i++) {
            console.log(`[detectAllBlocks] Row ${i} sample:`, data[i] ? data[i].slice(0, 5) : 'empty');
        }
    }
    
    const hourlyBlock = detectHourlyPayoutBlockFrom(data, searchStartRow);
    console.log(`[detectAllBlocks] Hourly block:`, hourlyBlock ? `Found at row ${hourlyBlock.headerRow}, data rows ${hourlyBlock.startRow} to ${hourlyBlock.endRow}` : 'Not found');
    
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
 * Clean cell value for processing
 */
export function cleanCellValue(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim();
    return cleaned || null;
}
