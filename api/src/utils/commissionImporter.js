/**
 * Commission Import Service
 * 
 * Main orchestration service for importing Excel commission data
 * into the database with proper validation, normalization, and error handling.
 */

import { q, pool } from '../db.js';
import {
    loadExcelWorkbook,
    getWorksheetData,
    detectAllBlocks,
    extractBlockData,
    parseMoney,
    parsePercent,
    normalizeNameKey,
    parsePeriodFromSheetName,
    cleanCellValue
} from './excelParser.js';

/**
 * Import summary structure
 */
class ImportSummary {
    constructor(filename, sheetName) {
        this.file = filename;
        this.sheet = sheetName;
        this.period_month = null;
        this.main = { inserted: 0, updated: 0, skipped: 0, errors: [] };
        this.agents_us = { inserted: 0, updated: 0, skipped: 0, errors: [] };
        this.hourly = { inserted: 0, updated: 0, skipped: 0, errors: [] };
        this.warnings = [];
    }

    addError(section, row, reason, data = {}) {
        this[section].errors.push({ row, reason, ...data });
    }

    addWarning(message) {
        this.warnings.push(message);
    }
}

/**
 * Find or create employee by name
 */
async function findOrCreateEmployee(nameRaw, client = null) {
    const queryFn = client || q;
    
    if (!nameRaw || typeof nameRaw !== 'string') {
        throw new Error('Invalid employee name');
    }
    
    const nameKey = normalizeNameKey(nameRaw);
    if (!nameKey) {
        throw new Error('Employee name cannot be empty');
    }
    
    // First try to find by normalized name
    const existingResult = await queryFn(`
        SELECT id, first_name, last_name, LOWER(TRIM(CONCAT(first_name, ' ', last_name))) as name_key
        FROM employees 
        WHERE LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = $1
        LIMIT 1
    `, [nameKey]);
    
    if (existingResult.rows.length > 0) {
        return existingResult.rows[0].id;
    }
    
    // If not found, create new employee record
    // Split name into first/last (simple approach)
    const nameParts = nameRaw.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const createResult = await queryFn(`
        INSERT INTO employees (first_name, last_name, email, role_title, status, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id
    `, [
        firstName,
        lastName,
        `${nameKey.replace(/\s/g, '.')}@imported.local`, // Placeholder email
        'Sales Representative', // Default role
        'Active'
    ]);
    
    return createResult.rows[0].id;
}

/**
 * Process main commission data block
 */
async function processMainCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client || q;
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        try {
            // Validate required fields
            const nameRaw = cleanCellValue(row.Name);
            if (!nameRaw) {
                summary.addError('main', rowNum, 'Missing employee name');
                summary.main.skipped++;
                continue;
            }
            
            // Find or create employee
            let employeeId;
            try {
                employeeId = await findOrCreateEmployee(nameRaw, queryFn);
            } catch (error) {
                summary.addError('main', rowNum, 'Failed to find/create employee', { error: error.message });
                summary.main.skipped++;
                continue;
            }
            
            // Parse all numeric fields
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                name_raw: nameRaw,
                hourly_rate: parseMoney(row['Hourly Rate']),
                rev_sm_all_locations: parseMoney(row['Revenue on Smart Moving (All locations combined )']),
                rev_add_ons: parseMoney(row['Revenue Add Ons+']),
                rev_deduction: parseMoney(row['Revenue Deduction']),
                total_revenue_all: parseMoney(row['Total Revenue(all locations combined )']),
                booking_pct: parsePercent(row['Booking %']),
                commission_pct: parsePercent(row['Commission %']),
                commission_earned: parseMoney(row['Commission Earned']),
                spiff_bonus: parseMoney(row[' Spiff Bonus ']),
                revenue_bonus: parseMoney(row[' Revenue Bonus ']),
                bonus_us_jobs_125x: parseMoney(row[' Bonuses for booking US jobs  1.25X ']),
                booking_bonus_plus: parseMoney(row[' $5/$10 Bonus for Booking Bonus ']),
                booking_bonus_minus: parseMoney(row[' $5/$10 Deduction for Booking Bonus ']),
                hourly_paid_out_minus: parseMoney(row[' - Hourly Paid Out ']),
                deduction_sales_manager_minus: parseMoney(row[' -Deduction by Sales Manager ']),
                deduction_missing_punch_minus: parseMoney(row[' Deductions for missing punch in/out …']),
                deduction_customer_support_minus: parseMoney(row[' Deductions from Customer Support ']),
                deduction_post_commission_collected_minus: parseMoney(row[' Deduction Post Commission collected ']),
                deduction_dispatch_minus: parseMoney(row[' Deductions from dispatch ']),
                deduction_other_minus: parseMoney(row[' deduction ']),
                total_due: parseMoney(row['Total due']),
                amount_paid: parseMoney(row[' Amount paid (date included in comment) ']),
                remaining_amount: parseMoney(row['Remaining amount']),
                corporate_open_jobs_note: cleanCellValue(row[' CORPORATE LOCATIONS JOBS STILL OPEN …']),
                parking_pass_fee_note: cleanCellValue(row[' Paid parking pass fee to be deducted from ']),
                source_file: filename,
                sheet_name: sheetName
            };
            
            // Upsert data
            const upsertResult = await queryFn(`
                INSERT INTO employee_commission_monthly (
                    employee_id, period_month, name_raw, hourly_rate, rev_sm_all_locations,
                    rev_add_ons, rev_deduction, total_revenue_all, booking_pct, commission_pct,
                    commission_earned, spiff_bonus, revenue_bonus, bonus_us_jobs_125x,
                    booking_bonus_plus, booking_bonus_minus, hourly_paid_out_minus,
                    deduction_sales_manager_minus, deduction_missing_punch_minus,
                    deduction_customer_support_minus, deduction_post_commission_collected_minus,
                    deduction_dispatch_minus, deduction_other_minus, total_due, amount_paid,
                    remaining_amount, corporate_open_jobs_note, parking_pass_fee_note,
                    source_file, sheet_name, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19,
                    $20, $21, $22, $23, $24, $25, $26, $27, $28,
                    $29, $30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                ON CONFLICT (employee_id, period_month)
                DO UPDATE SET
                    name_raw = EXCLUDED.name_raw,
                    hourly_rate = EXCLUDED.hourly_rate,
                    rev_sm_all_locations = EXCLUDED.rev_sm_all_locations,
                    rev_add_ons = EXCLUDED.rev_add_ons,
                    rev_deduction = EXCLUDED.rev_deduction,
                    total_revenue_all = EXCLUDED.total_revenue_all,
                    booking_pct = EXCLUDED.booking_pct,
                    commission_pct = EXCLUDED.commission_pct,
                    commission_earned = EXCLUDED.commission_earned,
                    spiff_bonus = EXCLUDED.spiff_bonus,
                    revenue_bonus = EXCLUDED.revenue_bonus,
                    bonus_us_jobs_125x = EXCLUDED.bonus_us_jobs_125x,
                    booking_bonus_plus = EXCLUDED.booking_bonus_plus,
                    booking_bonus_minus = EXCLUDED.booking_bonus_minus,
                    hourly_paid_out_minus = EXCLUDED.hourly_paid_out_minus,
                    deduction_sales_manager_minus = EXCLUDED.deduction_sales_manager_minus,
                    deduction_missing_punch_minus = EXCLUDED.deduction_missing_punch_minus,
                    deduction_customer_support_minus = EXCLUDED.deduction_customer_support_minus,
                    deduction_post_commission_collected_minus = EXCLUDED.deduction_post_commission_collected_minus,
                    deduction_dispatch_minus = EXCLUDED.deduction_dispatch_minus,
                    deduction_other_minus = EXCLUDED.deduction_other_minus,
                    total_due = EXCLUDED.total_due,
                    amount_paid = EXCLUDED.amount_paid,
                    remaining_amount = EXCLUDED.remaining_amount,
                    corporate_open_jobs_note = EXCLUDED.corporate_open_jobs_note,
                    parking_pass_fee_note = EXCLUDED.parking_pass_fee_note,
                    source_file = EXCLUDED.source_file,
                    sheet_name = EXCLUDED.sheet_name,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) as inserted
            `, Object.values(data));
            
            if (upsertResult.rows[0].inserted) {
                summary.main.inserted++;
            } else {
                summary.main.updated++;
            }
            
        } catch (error) {
            summary.addError('main', rowNum, 'Processing error', { error: error.message });
            summary.main.skipped++;
        }
    }
}

/**
 * Process agent US commission data block
 */
async function processAgentUSCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client || q;
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        try {
            const nameRaw = cleanCellValue(row.Name);
            if (!nameRaw) {
                summary.addError('agents_us', rowNum, 'Missing employee name');
                summary.agents_us.skipped++;
                continue;
            }
            
            const employeeId = await findOrCreateEmployee(nameRaw, queryFn);
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                total_us_revenue: parseMoney(row['total US revenue']),
                commission_pct: parsePercent(row['commission %']),
                commission_earned: parseMoney(row['Commission earned']),
                commission_125x: parseMoney(row['1.25X']),
                bonus: parseMoney(row['Bonus']),
                source_file: filename,
                sheet_name: sheetName
            };
            
            const upsertResult = await queryFn(`
                INSERT INTO agent_commission_us (
                    employee_id, period_month, total_us_revenue, commission_pct,
                    commission_earned, commission_125x, bonus, source_file, sheet_name,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (employee_id, period_month)
                DO UPDATE SET
                    total_us_revenue = EXCLUDED.total_us_revenue,
                    commission_pct = EXCLUDED.commission_pct,
                    commission_earned = EXCLUDED.commission_earned,
                    commission_125x = EXCLUDED.commission_125x,
                    bonus = EXCLUDED.bonus,
                    source_file = EXCLUDED.source_file,
                    sheet_name = EXCLUDED.sheet_name,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) as inserted
            `, Object.values(data));
            
            if (upsertResult.rows[0].inserted) {
                summary.agents_us.inserted++;
            } else {
                summary.agents_us.updated++;
            }
            
        } catch (error) {
            summary.addError('agents_us', rowNum, 'Processing error', { error: error.message });
            summary.agents_us.skipped++;
        }
    }
}

/**
 * Process hourly payout data block
 */
async function processHourlyPayoutData(blockData, block, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client || q;
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        try {
            // Get name from the designated name column
            let nameRaw = null;
            for (const [colName, colIdx] of Object.entries(block.columns)) {
                if (colIdx === block.nameColIdx && row[colName]) {
                    nameRaw = cleanCellValue(row[colName]);
                    break;
                }
            }
            
            if (!nameRaw) {
                summary.addError('hourly', rowNum, 'Missing employee name');
                summary.hourly.skipped++;
                continue;
            }
            
            const employeeId = await findOrCreateEmployee(nameRaw, queryFn);
            
            // Process each date range column as separate payout records
            for (const [colName, colIdx] of Object.entries(block.columns)) {
                if (colIdx === block.nameColIdx) continue; // Skip name column
                
                const amount = parseMoney(row[colName]);
                if (amount === null) continue; // Skip empty amounts
                
                const data = {
                    employee_id: employeeId,
                    period_month: periodMonth,
                    period_label: colName,
                    amount: amount,
                    total_for_month: null, // Could be calculated later
                    source_file: filename,
                    sheet_name: sheetName
                };
                
                const upsertResult = await queryFn(`
                    INSERT INTO hourly_payout (
                        employee_id, period_month, period_label, amount, total_for_month,
                        source_file, sheet_name, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (employee_id, period_month, period_label)
                    DO UPDATE SET
                        amount = EXCLUDED.amount,
                        total_for_month = EXCLUDED.total_for_month,
                        source_file = EXCLUDED.source_file,
                        sheet_name = EXCLUDED.sheet_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) as inserted
                `, Object.values(data));
                
                if (upsertResult.rows[0].inserted) {
                    summary.hourly.inserted++;
                } else {
                    summary.hourly.updated++;
                }
            }
            
        } catch (error) {
            summary.addError('hourly', rowNum, 'Processing error', { error: error.message });
            summary.hourly.skipped++;
        }
    }
}

/**
 * Main import function
 */
export async function importCommissionsFromExcel(fileBuffer, filename, sheetName = null) {
    const summary = new ImportSummary(filename, sheetName || 'default');
    
    try {
        // Load Excel workbook
        const workbook = loadExcelWorkbook(fileBuffer);
        const actualSheetName = sheetName || workbook.SheetNames[workbook.SheetNames.length - 1];
        summary.sheet = actualSheetName;
        
        // Get worksheet data
        const data = getWorksheetData(workbook, actualSheetName);
        
        // Parse period from sheet name
        const periodMonth = parsePeriodFromSheetName(actualSheetName);
        if (!periodMonth) {
            throw new Error(`Could not parse period from sheet name: ${actualSheetName}`);
        }
        
        summary.period_month = periodMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Detect all blocks
        const blocks = detectAllBlocks(data);
        
        // Start database transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Process each block if detected
            if (blocks.main) {
                const mainBlockData = extractBlockData(data, blocks.main);
                await processMainCommissionData(mainBlockData, periodMonth, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed main commission block with ${mainBlockData.length} rows`);
            } else {
                summary.addWarning('Main commission block not detected');
            }
            
            if (blocks.agents_us) {
                const agentsUSBlockData = extractBlockData(data, blocks.agents_us);
                await processAgentUSCommissionData(agentsUSBlockData, periodMonth, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed agents US commission block with ${agentsUSBlockData.length} rows`);
            } else {
                summary.addWarning('Agents US commission block not detected');
            }
            
            if (blocks.hourly) {
                const hourlyBlockData = extractBlockData(data, blocks.hourly);
                await processHourlyPayoutData(hourlyBlockData, blocks.hourly, periodMonth, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed hourly payout block with ${hourlyBlockData.length} rows`);
            } else {
                summary.addWarning('Hourly payout block not detected');
            }
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        summary.addWarning(`Import failed: ${error.message}`);
        throw error;
    }
    
    return summary;
}
