/**
 * Excel parsing utilities for commission import
 * 
 * Handles detection and parsing of the three main data blocks:
 * - Main Commission Table
 * - Agent US Commission Table  
 * - Hourly Payout Table
 */

import * as XLSX from 'xlsx';

// Header keywords for detecting each block type - broad variations
const MAIN_COMMISSION_KEYWORDS = [
    "Name", "Employee", "Person", "Agent", "Staff",
    "Hourly Rate", "Rate", "Hour Rate", "Hourly", "HR",
    "Revenue", "Rev", "Sales", "Income", "Earnings", "Smart Moving", "SM",
    "Commission Earned", "Commission", "Comm Earned", "Earned", "Total Comm",
    "Total Revenue", "Total Rev", "Total Sales", "Total Earnings", "Revenue Total",
    "Booking %", "Booking", "Book %", "Booking Percent", "Book Percent",
    "Commission %", "Comm %", "Commission Percent", "Comm Percent",
    "Total due", "Total Due", "Amount Due", "Due", "Owed", "Balance",
    "Remaining amount", "Remaining", "Balance", "Outstanding", "Left", "Remaining Due"
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

// Column mapping for exact field matching
const MAIN_COMMISSION_COLUMN_MAPPING = {
    "Name": "name_raw",
    "Hourly Rate": "hourly_rate",
    "Revenue on Smart Moving (All locations combined )": "rev_sm_all_locations",
    "Revenue Add Ons+": "rev_add_ons",
    "Revenue Deduction": "rev_deduction",
    "Total Revenue(all locations combined )": "total_revenue_all",
    "Booking %": "booking_pct",
    "Commission %": "commission_pct",
    "Commission Earned": "commission_earned",
    " Spiff Bonus ": "spiff_bonus",
    " Revenue Bonus ": "revenue_bonus",
    " Bonuses for booking US jobs  1.25X ": "bonus_us_jobs_125x",
    " $5/$10 Bonus for Booking Bonus ": "booking_bonus_plus",
    " $5/$10 Deduction for Booking Bonus ": "booking_bonus_minus",
    " - Hourly Paid Out ": "hourly_paid_out_minus",
    " -Deduction by Sales Manager ": "deduction_sales_manager_minus",
    " Deductions for missing punch in/out …": "deduction_missing_punch_minus",
    " Deductions from Customer Support ": "deduction_customer_support_minus",
    " Deduction Post Commission collected ": "deduction_post_commission_collected_minus",
    " Deductions from dispatch ": "deduction_dispatch_minus",
    " deduction ": "deduction_other_minus",
    "Total due": "total_due",
    " Amount paid (date included in comment) ": "amount_paid",
    "Remaining amount": "remaining_amount",
    " CORPORATE LOCATIONS JOBS STILL OPEN …": "corporate_open_jobs_note",
    " Paid parking pass fee to be deducted from ": "parking_pass_fee_note"
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
        minMatches = Math.max(2, Math.floor(keywords.length * 0.3));  // Only need 30% matches, minimum 2
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
 * Find data end by looking for consecutive empty name rows
 */
export function findDataEndRow(data, startRow, nameColIdx) {
    let emptyCount = 0;
    
    for (let rowIdx = startRow; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!Array.isArray(row) || nameColIdx >= row.length) {
            break;
        }
        
        const nameValue = row[nameColIdx];
        if (!nameValue || String(nameValue).trim() === '') {
            emptyCount++;
            if (emptyCount >= 2) {
                return rowIdx - 1;
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
export function parseMoney(value) {
    if (value === null || value === undefined || value === '') return null;
    
    try {
        const valueStr = String(value).trim();
        if (!valueStr) return null;
        
        // Check for negative (parentheses)
        const isNegative = valueStr.startsWith('(') && valueStr.endsWith(')');
        
        // Remove monetary formatting
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
    const headerRow = detectHeaderRow(data, AGENT_US_KEYWORDS);
    if (headerRow === null) return null;
    
    const columnMapping = extractColumnMapping(data, headerRow, Object.keys(AGENT_COMMISSION_COLUMN_MAPPING));
    
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
        type: 'agents_us',
        headerRow,
        startRow,
        endRow,
        columns: columnMapping
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
 * Detect all blocks in worksheet
 */
export function detectAllBlocks(data) {
    const mainBlock = detectMainCommissionBlock(data);
    const agentsUSBlock = detectAgentUSCommissionBlock(data);
    const hourlyBlock = detectHourlyPayoutBlock(data);
    
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
