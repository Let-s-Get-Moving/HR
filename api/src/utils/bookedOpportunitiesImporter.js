/**
 * Booked Opportunities by Service Date Report Importer
 * 
 * Imports Booked Opportunities Excel files into sales_booked_opportunities_quotes table.
 * 
 * Expected Excel columns:
 *   Quote #, Status, Customer Name, Email, Phone Number, Branch Name, Moving From, Moving to,
 *   Service Date, Service Type, Weight, Volume, Hourly Rate, Estimated Amount, Invoiced Amount,
 *   Referral Source, Estimator, Sales Person, Move Coordinator, Booked Date
 * 
 * Key behaviors:
 *   - Upserts by quote_id (extracted from "Quote #" column)
 *   - Service Date is required and used for period filtering
 *   - Invoiced Amount is the authoritative value for calculations
 */

import { pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    parseMoney,
    cleanCellValue
} from './excelParser.js';

// Expected headers for Booked Opportunities report
const EXPECTED_HEADERS = [
    'Quote #',
    'Status',
    'Service Date',
    'Invoiced Amount'
];

/**
 * Extract quote ID from "Quote #" cell
 * Examples: "278752 open_in_new" -> 278752, "278752" -> 278752
 */
export function extractQuoteId(value) {
    if (!value) return null;
    const str = String(value).trim();
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalize status string for matching (trim + lowercase)
 */
function normalizeStatus(status) {
    if (!status) return null;
    return String(status).trim().toLowerCase();
}

/**
 * Parse date from various formats
 * Returns YYYY-MM-DD string
 */
function parseDate(value) {
    if (!value) return null;
    
    const str = String(value).trim();
    if (!str) return null;
    
    // Handle MM/DD/YYYY format
    const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle YYYY-MM-DD format
    const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        return str;
    }
    
    // Try parsing as date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Detect if the worksheet has expected Booked Opportunities headers
 */
export function detectBookedOpportunitiesHeaders(headerRow) {
    if (!headerRow || !Array.isArray(headerRow)) {
        return { valid: false, message: 'No header row found' };
    }
    
    // Normalize header values
    const normalizedHeaders = headerRow.map(h => 
        h ? String(h).trim() : ''
    );
    
    // Check for required headers
    const missingHeaders = [];
    for (const expected of EXPECTED_HEADERS) {
        const found = normalizedHeaders.some(h => 
            h.toLowerCase() === expected.toLowerCase() ||
            h.toLowerCase().startsWith(expected.toLowerCase())
        );
        if (!found) {
            missingHeaders.push(expected);
        }
    }
    
    if (missingHeaders.length > 0) {
        return {
            valid: false,
            message: `Missing required headers: ${missingHeaders.join(', ')}`,
            foundHeaders: normalizedHeaders.filter(h => h)
        };
    }
    
    return { valid: true, headers: normalizedHeaders };
}

/**
 * Build column index map from header row
 */
function buildColumnMap(headerRow) {
    const map = {};
    headerRow.forEach((header, index) => {
        if (header) {
            const key = String(header).trim();
            map[key] = index;
            // Also store lowercase version for case-insensitive lookup
            map[key.toLowerCase()] = index;
        }
    });
    return map;
}

/**
 * Get cell value by column name (case-insensitive)
 */
function getCellByColumn(row, columnMap, columnName) {
    const index = columnMap[columnName] ?? columnMap[columnName.toLowerCase()];
    if (index === undefined || index >= row.length) return null;
    return row[index];
}

/**
 * Import summary class
 */
class ImportSummary {
    constructor(filename, sheetName) {
        this.file = filename;
        this.sheet = sheetName;
        this.inserted = 0;
        this.updated = 0;
        this.skipped = 0;
        this.errors = [];
        this.warnings = [];
    }

    addError(row, reason, data = {}) {
        if (this.errors.length < 20) {
            this.errors.push({ row, reason, ...data });
        }
    }

    addWarning(message) {
        if (this.warnings.length < 20) {
            this.warnings.push(message);
        }
    }
}

/**
 * Main import function
 * 
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} filename - Original filename
 * @param {string|null} sheetName - Optional sheet name (defaults to first sheet)
 * @returns {Promise<ImportSummary>} - Import summary
 */
export async function importBookedOpportunitiesFromExcel(fileBuffer, filename, sheetName = null) {
    // Load workbook
    const workbook = loadExcelWorkbook(fileBuffer, filename);
    const actualSheetName = sheetName || workbook.SheetNames[0];
    
    const summary = new ImportSummary(filename, actualSheetName);
    
    // Get worksheet data as 2D array
    const data = getWorksheetData(workbook, actualSheetName);
    
    if (!data || data.length < 2) {
        throw new Error('File contains no data rows');
    }
    
    // Find header row (first non-empty row)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.some(cell => cell !== null)) {
            // Check if this looks like a header row
            const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
            if (rowStr.includes('quote') && rowStr.includes('status') && rowStr.includes('service date')) {
                headerRowIndex = i;
                break;
            }
        }
    }
    
    const headerRow = data[headerRowIndex];
    
    // Validate headers
    const headerCheck = detectBookedOpportunitiesHeaders(headerRow);
    if (!headerCheck.valid) {
        throw new Error(`Invalid Booked Opportunities file format: ${headerCheck.message}`);
    }
    
    // Build column index map
    const columnMap = buildColumnMap(headerRow);
    
    console.log(`[importBookedOpportunities] Processing ${data.length - headerRowIndex - 1} data rows`);
    
    // Start transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Process each data row (skip header row)
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 1; // 1-based for logging
            
            try {
                // Extract Quote #
                const quoteRaw = getCellByColumn(row, columnMap, 'Quote #');
                const quoteId = extractQuoteId(quoteRaw);
                
                if (!quoteId) {
                    summary.addError(rowNum, 'Missing or invalid Quote #', { quoteRaw });
                    summary.skipped++;
                    continue;
                }
                
                // Extract Service Date (required)
                const serviceDateRaw = getCellByColumn(row, columnMap, 'Service Date');
                const serviceDate = parseDate(serviceDateRaw);
                
                if (!serviceDate) {
                    summary.addError(rowNum, 'Missing or invalid Service Date', { quoteId, serviceDateRaw });
                    summary.skipped++;
                    continue;
                }
                
                // Extract other fields
                const statusRaw = cleanCellValue(getCellByColumn(row, columnMap, 'Status'));
                const customerName = cleanCellValue(getCellByColumn(row, columnMap, 'Customer Name'));
                const branchName = cleanCellValue(getCellByColumn(row, columnMap, 'Branch Name'));
                const serviceType = cleanCellValue(getCellByColumn(row, columnMap, 'Service Type'));
                const bookedDateRaw = getCellByColumn(row, columnMap, 'Booked Date');
                const estimatedAmountRaw = getCellByColumn(row, columnMap, 'Estimated Amount');
                const invoicedAmountRaw = getCellByColumn(row, columnMap, 'Invoiced Amount');
                const salesPersonRaw = cleanCellValue(getCellByColumn(row, columnMap, 'Sales Person'));
                
                // Normalize and parse
                const statusNorm = normalizeStatus(statusRaw);
                const bookedDate = parseDate(bookedDateRaw);
                const estimatedAmount = parseMoney(estimatedAmountRaw);
                const invoicedAmount = parseMoney(invoicedAmountRaw);
                
                // Prepare row data
                const rowData = {
                    quote_id: quoteId,
                    status_raw: statusRaw,
                    status_norm: statusNorm,
                    customer_name: customerName,
                    branch_name: branchName,
                    service_type: serviceType,
                    service_date: serviceDate,
                    booked_date: bookedDate,
                    estimated_amount: estimatedAmount,
                    invoiced_amount: invoicedAmount,
                    sales_person_raw: salesPersonRaw,
                    source_file: filename,
                    sheet_name: actualSheetName
                };
                
                // Upsert into table
                const result = await client.query(`
                    INSERT INTO sales_booked_opportunities_quotes (
                        quote_id, status_raw, status_norm, customer_name, branch_name, service_type,
                        service_date, booked_date, estimated_amount, invoiced_amount, sales_person_raw,
                        source_file, sheet_name, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (quote_id)
                    DO UPDATE SET
                        status_raw = EXCLUDED.status_raw,
                        status_norm = EXCLUDED.status_norm,
                        customer_name = EXCLUDED.customer_name,
                        branch_name = EXCLUDED.branch_name,
                        service_type = EXCLUDED.service_type,
                        service_date = EXCLUDED.service_date,
                        booked_date = EXCLUDED.booked_date,
                        estimated_amount = EXCLUDED.estimated_amount,
                        invoiced_amount = EXCLUDED.invoiced_amount,
                        sales_person_raw = EXCLUDED.sales_person_raw,
                        source_file = EXCLUDED.source_file,
                        sheet_name = EXCLUDED.sheet_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    rowData.quote_id,
                    rowData.status_raw,
                    rowData.status_norm,
                    rowData.customer_name,
                    rowData.branch_name,
                    rowData.service_type,
                    rowData.service_date,
                    rowData.booked_date,
                    rowData.estimated_amount,
                    rowData.invoiced_amount,
                    rowData.sales_person_raw,
                    rowData.source_file,
                    rowData.sheet_name
                ]);
                
                // Track insert vs update
                if (result.rows[0].inserted) {
                    summary.inserted++;
                } else {
                    summary.updated++;
                }
                
            } catch (rowError) {
                console.error(`[importBookedOpportunities] Error processing row ${rowNum}:`, rowError.message);
                summary.addError(rowNum, rowError.message);
                summary.skipped++;
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`[importBookedOpportunities] Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[importBookedOpportunities] Transaction rolled back:', error.message);
        throw error;
    } finally {
        client.release();
    }
    
    return summary;
}
