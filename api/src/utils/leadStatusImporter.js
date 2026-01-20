/**
 * Lead Status Report Importer
 * 
 * Imports Lead Status Report Excel files into sales_lead_status_quotes table.
 * 
 * Expected Excel columns:
 *   Quote #, Branch Name, Status, Lead Status, Service Type, Volume/Weight,
 *   Received at, Service Date, Quote Sent, Sales Person, Estimator, 
 *   Move Coordinator, Time to Contact, Last Communication, Referral Source, Estimated Revenue
 * 
 * Key behaviors:
 *   - Upserts by quote_id (extracted from "Quote #" column)
 *   - Parses Lead Status directives into structured fields
 *   - Only rows with Status = "Completed" or "Closed" (exact) are used for calculations
 */

import { pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    parseMoney,
    normalizeNameKey,
    cleanCellValue
} from './excelParser.js';

// Expected headers for Lead Status report (in order)
const EXPECTED_HEADERS = [
    'Quote #',
    'Branch Name',
    'Status',
    'Lead Status',
    'Service Type'
    // Remaining columns are optional
];

/**
 * Extract quote ID from "Quote #" cell
 * Examples: "285137 open_in_new" -> 285137, "285137" -> 285137
 */
export function extractQuoteId(value) {
    if (!value) return null;
    const str = String(value).trim();
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse Lead Status directive string into structured fields
 * 
 * Returns: { directive_type, target_name_raw, target_name_key, pct, amount }
 * 
 * Supported patterns:
 *   - "Split with X" / "Split the move with X" -> percent_split, pct=50
 *   - "40% of the move to X" / "40% of move to X" -> percent_split, pct=40
 *   - "$100 deduction off revenue goes to X" -> fixed_rev_transfer, amount=100
 *   - "$10 bonus to X" / "$10 Bonus for X" -> fixed_booking_transfer, amount=10
 */
export function parseLeadStatusDirective(leadStatus) {
    const result = {
        directive_type: 'none',
        target_name_raw: null,
        target_name_key: null,
        pct: null,
        amount: null
    };
    
    if (!leadStatus) return result;
    
    const str = String(leadStatus).trim();
    if (!str || str.toLowerCase() === 'default') return result;
    
    // Pattern 1: "Split with X" or "Split the move with X"
    // Matches: "Split with Sam", "Split the move with John"
    const splitPattern = /^Split(?:\s+the\s+move)?\s+with\s+(.+)$/i;
    const splitMatch = str.match(splitPattern);
    if (splitMatch) {
        const targetName = splitMatch[1].trim();
        return {
            directive_type: 'percent_split',
            target_name_raw: targetName,
            target_name_key: normalizeNameKey(targetName),
            pct: 50,
            amount: null
        };
    }
    
    // Pattern 2: "40% of the move to X" or "40% of move to X"
    // Matches: "40% of the move to Jimmy", "40% of move to Alejo"
    const percentPattern = /^(\d+)%\s+of(?:\s+the)?\s+move\s+to\s+(.+)$/i;
    const percentMatch = str.match(percentPattern);
    if (percentMatch) {
        const pct = parseInt(percentMatch[1], 10);
        const targetName = percentMatch[2].trim();
        return {
            directive_type: 'percent_split',
            target_name_raw: targetName,
            target_name_key: normalizeNameKey(targetName),
            pct: pct,
            amount: null
        };
    }
    
    // Pattern 3: "$100 deduction off revenue goes to X"
    // Matches: "$100 deduction off revenue goes to Sam"
    const deductionPattern = /^\$(\d+(?:\.\d{2})?)\s+deduction\s+off\s+revenue\s+goes\s+to\s+(.+)$/i;
    const deductionMatch = str.match(deductionPattern);
    if (deductionMatch) {
        const amount = parseFloat(deductionMatch[1]);
        const targetName = deductionMatch[2].trim();
        return {
            directive_type: 'fixed_rev_transfer',
            target_name_raw: targetName,
            target_name_key: normalizeNameKey(targetName),
            pct: null,
            amount: amount
        };
    }
    
    // Pattern 4: "$10 bonus to X" or "$10 Bonus for X"
    // Matches: "$10 bonus to Sebastian", "$10 Bonus for Rae"
    const bonusPattern = /^\$(\d+(?:\.\d{2})?)\s+[Bb]onus\s+(?:to|for)\s+(.+)$/i;
    const bonusMatch = str.match(bonusPattern);
    if (bonusMatch) {
        const amount = parseFloat(bonusMatch[1]);
        const targetName = bonusMatch[2].trim();
        return {
            directive_type: 'fixed_booking_transfer',
            target_name_raw: targetName,
            target_name_key: normalizeNameKey(targetName),
            pct: null,
            amount: amount
        };
    }
    
    // No recognized pattern
    return result;
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
 */
function parseDate(value) {
    if (!value) return null;
    
    const str = String(value).trim();
    if (!str) return null;
    
    // Try parsing as date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Parse datetime from various formats
 */
function parseDateTime(value) {
    if (!value) return null;
    
    const str = String(value).trim();
    if (!str) return null;
    
    // Try parsing as date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }
    
    return null;
}

/**
 * Detect if the worksheet has expected Lead Status headers
 */
export function detectLeadStatusHeaders(headerRow) {
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
export async function importLeadStatusFromExcel(fileBuffer, filename, sheetName = null) {
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
            if (rowStr.includes('quote') && rowStr.includes('status')) {
                headerRowIndex = i;
                break;
            }
        }
    }
    
    const headerRow = data[headerRowIndex];
    
    // Validate headers
    const headerCheck = detectLeadStatusHeaders(headerRow);
    if (!headerCheck.valid) {
        throw new Error(`Invalid Lead Status file format: ${headerCheck.message}`);
    }
    
    // Build column index map
    const columnMap = buildColumnMap(headerRow);
    
    console.log(`[importLeadStatus] Processing ${data.length - headerRowIndex - 1} data rows`);
    
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
                
                // Extract other fields
                const branchName = cleanCellValue(getCellByColumn(row, columnMap, 'Branch Name'));
                const statusRaw = cleanCellValue(getCellByColumn(row, columnMap, 'Status'));
                const leadStatusRaw = cleanCellValue(getCellByColumn(row, columnMap, 'Lead Status'));
                const serviceType = cleanCellValue(getCellByColumn(row, columnMap, 'Service Type'));
                const receivedAtRaw = getCellByColumn(row, columnMap, 'Received at');
                const serviceDateRaw = getCellByColumn(row, columnMap, 'Service Date');
                const salesPersonRaw = cleanCellValue(getCellByColumn(row, columnMap, 'Sales Person'));
                const estimatedRevenueRaw = getCellByColumn(row, columnMap, 'Estimated Revenue');
                
                // Normalize and parse
                const statusNorm = normalizeStatus(statusRaw);
                const salesPersonKey = normalizeNameKey(salesPersonRaw);
                const receivedAt = parseDateTime(receivedAtRaw);
                const serviceDateLeadReport = parseDate(serviceDateRaw);
                const estimatedRevenue = parseMoney(estimatedRevenueRaw);
                
                // Parse lead status directive
                const directive = parseLeadStatusDirective(leadStatusRaw);
                
                // Prepare row data
                const rowData = {
                    quote_id: quoteId,
                    branch_name: branchName,
                    status_raw: statusRaw,
                    lead_status_raw: leadStatusRaw,
                    service_type: serviceType,
                    received_at: receivedAt,
                    service_date_lead_report: serviceDateLeadReport,
                    sales_person_raw: salesPersonRaw,
                    estimated_revenue: estimatedRevenue,
                    status_norm: statusNorm,
                    sales_person_key: salesPersonKey,
                    directive_type: directive.directive_type,
                    target_name_raw: directive.target_name_raw,
                    target_name_key: directive.target_name_key,
                    pct: directive.pct,
                    amount: directive.amount,
                    source_file: filename,
                    sheet_name: actualSheetName
                };
                
                // Upsert into table
                const result = await client.query(`
                    INSERT INTO sales_lead_status_quotes (
                        quote_id, branch_name, status_raw, lead_status_raw, service_type,
                        received_at, service_date_lead_report, sales_person_raw, estimated_revenue,
                        status_norm, sales_person_key, directive_type, target_name_raw, target_name_key,
                        pct, amount, source_file, sheet_name, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (quote_id)
                    DO UPDATE SET
                        branch_name = EXCLUDED.branch_name,
                        status_raw = EXCLUDED.status_raw,
                        lead_status_raw = EXCLUDED.lead_status_raw,
                        service_type = EXCLUDED.service_type,
                        received_at = EXCLUDED.received_at,
                        service_date_lead_report = EXCLUDED.service_date_lead_report,
                        sales_person_raw = EXCLUDED.sales_person_raw,
                        estimated_revenue = EXCLUDED.estimated_revenue,
                        status_norm = EXCLUDED.status_norm,
                        sales_person_key = EXCLUDED.sales_person_key,
                        directive_type = EXCLUDED.directive_type,
                        target_name_raw = EXCLUDED.target_name_raw,
                        target_name_key = EXCLUDED.target_name_key,
                        pct = EXCLUDED.pct,
                        amount = EXCLUDED.amount,
                        source_file = EXCLUDED.source_file,
                        sheet_name = EXCLUDED.sheet_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    rowData.quote_id,
                    rowData.branch_name,
                    rowData.status_raw,
                    rowData.lead_status_raw,
                    rowData.service_type,
                    rowData.received_at,
                    rowData.service_date_lead_report,
                    rowData.sales_person_raw,
                    rowData.estimated_revenue,
                    rowData.status_norm,
                    rowData.sales_person_key,
                    rowData.directive_type,
                    rowData.target_name_raw,
                    rowData.target_name_key,
                    rowData.pct,
                    rowData.amount,
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
                console.error(`[importLeadStatus] Error processing row ${rowNum}:`, rowError.message);
                summary.addError(rowNum, rowError.message);
                summary.skipped++;
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`[importLeadStatus] Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[importLeadStatus] Transaction rolled back:', error.message);
        throw error;
    } finally {
        client.release();
    }
    
    return summary;
}
