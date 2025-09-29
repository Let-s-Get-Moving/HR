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
        this.debug_logs = [];
    }

    addError(section, row, reason, data = {}) {
        this[section].errors.push({ row, reason, ...data });
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    addDebugLog(message) {
        this.debug_logs.push(`[${new Date().toISOString()}] ${message}`);
        console.log(message); // Keep server logs too
    }
}

/**
 * Flexibly get column value by trying multiple name variations
 */
function getColumnValue(row, ...possibleNames) {
    for (const name of possibleNames) {
        if (row[name] !== undefined) {
            return row[name];
        }
        // Try trimmed version
        const trimmedName = name.trim();
        if (row[trimmedName] !== undefined) {
            return row[trimmedName];
        }
    }
    return null;
}

/**
 * Find or create employee by name
 */
async function findOrCreateEmployee(nameRaw, queryFn) {
    if (!nameRaw || typeof nameRaw !== 'string') {
        throw new Error('Invalid employee name');
    }
    
    const nameKey = normalizeNameKey(nameRaw);
    if (!nameKey) {
        throw new Error('Employee name cannot be empty');
    }
    
    // First try to find by normalized name
    const existingResult = await queryFn(`
        SELECT id, first_name, last_name, LOWER(TRIM(first_name || ' ' || last_name)) as name_key
        FROM employees 
        WHERE LOWER(TRIM(first_name || ' ' || last_name)) = $1
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
        INSERT INTO employees (
            first_name, last_name, email, role_title, status, 
            hire_date, employment_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `, [
        firstName,
        lastName,
        `${nameKey.replace(/\s/g, '.')}@imported.local`, // Placeholder email
        'Sales Representative', // Default role
        'Active',
        new Date().toISOString().split('T')[0], // Today's date as hire_date
        'Full-time' // Default employment type
    ]);
    
    return createResult.rows[0].id;
}

/**
 * Process main commission data block
 */
async function processMainCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    summary.addDebugLog(`Starting to process ${blockData.length} rows in main commission data`);
    summary.addDebugLog(`Using period: ${periodMonth}`);
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        // Only log first few rows to avoid overwhelming output
        if (rowNum <= 5) {
            summary.addDebugLog(`Row ${rowNum} - Processing keys: ${Object.keys(row).slice(0, 5).join(', ')}...`);
            summary.addDebugLog(`Row ${rowNum} - Sample data: Name="${row.Name}", HourlyRate="${row['Hourly Rate']}", Commission="${row['Commission Earned']}"`);
        }
        
        try {
            // Validate required fields
            const nameRaw = cleanCellValue(row.Name);
            
            if (rowNum <= 5) {
                summary.addDebugLog(`Row ${rowNum} - Extracted name: "${nameRaw}"`);
            }
            
            if (!nameRaw) {
                if (rowNum <= 5 || summary.main.skipped < 10) {
                    summary.addDebugLog(`Row ${rowNum} - SKIPPED: Missing employee name`);
                }
                summary.addError('main', rowNum, 'Missing employee name');
                summary.main.skipped++;
                continue;
            }
            
            // Find or create employee
            let employeeId;
            try {
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Finding/creating employee: "${nameRaw}"`);
                }
                employeeId = await findOrCreateEmployee(nameRaw, queryFn);
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Employee ID: ${employeeId}`);
                }
            } catch (error) {
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - SKIPPED: Employee creation failed: ${error.message}`);
                }
                summary.addError('main', rowNum, 'Failed to find/create employee', { error: error.message });
                summary.main.skipped++;
                continue;
            }
            
            // Parse all numeric fields with flexible column matching
            if (rowNum === 1) {
                // Log all available columns for debugging
                summary.addDebugLog(`Row ${rowNum} - ALL available columns: ${Object.keys(row).join(', ')}`);
                const sampleValues = {
                    hourlyRate: getColumnValue(row, 'Hourly Rate', ' Hourly Rate '),
                    commissionEarned: getColumnValue(row, 'Commission Earned', ' Commission Earned '),
                    totalDue: getColumnValue(row, 'Total due', ' Total due ')
                };
                summary.addDebugLog(`Row ${rowNum} - Sample extracted values: ${JSON.stringify(sampleValues)}`);
            }
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                name_raw: nameRaw,
                hourly_rate: parseMoney(getColumnValue(row, 'Hourly Rate', ' Hourly Rate ')),
                rev_sm_all_locations: parseMoney(getColumnValue(row, 'Revenue on Smart Moving (All locations combined )', ' Revenue on Smart Moving (All locations combined ) ')),
                rev_add_ons: parseMoney(getColumnValue(row, 'Revenue Add Ons+', ' Revenue Add Ons+ ', 'Revenue Add Ons')),
                rev_deduction: parseMoney(getColumnValue(row, 'Revenue Deduction', ' Revenue Deduction ')),
                total_revenue_all: parseMoney(getColumnValue(row, 'Total Revenue(all locations combined )', ' Total Revenue(all locations combined ) ')),
                booking_pct: parsePercent(getColumnValue(row, 'Booking %', ' Booking % ')),
                commission_pct: parsePercent(getColumnValue(row, 'Commission %', ' Commission % ')),
                commission_earned: parseMoney(getColumnValue(row, 'Commission Earned', ' Commission Earned ')),
                spiff_bonus: parseMoney(getColumnValue(row, 'Spiff Bonus', ' Spiff Bonus ')),
                revenue_bonus: parseMoney(getColumnValue(row, 'Revenue Bonus', ' Revenue Bonus ')),
                bonus_us_jobs_125x: parseMoney(getColumnValue(row, 'Bonuses for booking US jobs  1.25X', ' Bonuses for booking US jobs  1.25X ')),
                booking_bonus_plus: parseMoney(getColumnValue(row, '$5/$10 Bonus for Booking Bonus', ' $5/$10 Bonus for Booking Bonus ')),
                booking_bonus_minus: parseMoney(getColumnValue(row, '$5/$10 Deduction for Booking Bonus', ' $5/$10 Deduction for Booking Bonus ')),
                hourly_paid_out_minus: parseMoney(getColumnValue(row, '- Hourly Paid Out', ' - Hourly Paid Out ')),
                deduction_sales_manager_minus: parseMoney(getColumnValue(row, '-Deduction by Sales Manager', ' -Deduction by Sales Manager ')),
                deduction_missing_punch_minus: parseMoney(getColumnValue(row, 'Deductions for missing punch in/out on the time report for all pay periods of the month', ' Deductions for missing punch in/out …', 'Deductions for missing punch in/out')),
                deduction_customer_support_minus: parseMoney(getColumnValue(row, 'Deductions from Customer Support', ' Deductions from Customer Support ')),
                deduction_post_commission_collected_minus: parseMoney(getColumnValue(row, 'Deduction Post Commission collected', ' Deduction Post Commission collected ')),
                deduction_dispatch_minus: parseMoney(getColumnValue(row, 'Deductions from dispatch', ' Deductions from dispatch ')),
                deduction_other_minus: parseMoney(getColumnValue(row, 'deduction', ' deduction ')),
                total_due: parseMoney(getColumnValue(row, 'Total due', ' Total due ')),
                amount_paid: parseMoney(getColumnValue(row, 'Amount paid (date included in comment)', ' Amount paid (date included in comment) ')),
                remaining_amount: parseMoney(getColumnValue(row, 'Remaining amount', ' Remaining amount ')),
                corporate_open_jobs_note: cleanCellValue(getColumnValue(row, 'CORPORATE LOCATIONS JOBS STILL OPEN', ' CORPORATE LOCATIONS JOBS STILL OPEN …')),
                parking_pass_fee_note: cleanCellValue(getColumnValue(row, 'Paid parking pass fee to be deducted from', ' Paid parking pass fee to be deducted from ')),
                source_file: filename,
                sheet_name: sheetName
            };
            
            // Use savepoint for each row to allow recovery from errors
            try {
                await queryFn('SAVEPOINT row_insert');
                
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
                
                await queryFn('RELEASE SAVEPOINT row_insert');
                
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Database result: ${JSON.stringify(upsertResult.rows[0])}`);
                }
                
                if (upsertResult.rows[0].inserted) {
                    if (rowNum <= 5) {
                        summary.addDebugLog(`Row ${rowNum} - SUCCESS: Record inserted`);
                    }
                    summary.main.inserted++;
                } else {
                    if (rowNum <= 5) {
                        summary.addDebugLog(`Row ${rowNum} - SUCCESS: Record updated`);
                    }
                    summary.main.updated++;
                }
            } catch (insertError) {
                // Rollback to savepoint to recover transaction
                await queryFn('ROLLBACK TO SAVEPOINT row_insert');
                throw insertError;
            }
            
        } catch (error) {
            // Log first 5 and every 100th row, plus sample of errors
            if (rowNum <= 5 || rowNum % 100 === 0 || summary.main.skipped < 10) {
                summary.addDebugLog(`Row ${rowNum} - ERROR: Processing failed: ${error.message}`);
            }
            summary.addError('main', rowNum, 'Processing error', { error: error.message });
            summary.main.skipped++;
        }
    }
}

/**
 * Process agent US commission data block
 */
async function processAgentUSCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        try {
            const nameRaw = cleanCellValue(row.Name);
            if (rowNum <= 5) {
                summary.addDebugLog(`Agent US Row ${rowNum} - Name: "${nameRaw}", Columns: ${Object.keys(row).join(', ')}`);
            }
            if (!nameRaw) {
                if (rowNum <= 5 || summary.agents_us.skipped < 10) {
                    summary.addDebugLog(`Agent US Row ${rowNum} - SKIPPED: Missing employee name`);
                }
                summary.addError('agents_us', rowNum, 'Missing employee name');
                summary.agents_us.skipped++;
                continue;
            }
            
            const employeeId = await findOrCreateEmployee(nameRaw, queryFn);
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                total_us_revenue: parseMoney(getColumnValue(row, 'total US revenue', ' total US revenue ')),
                commission_pct: parsePercent(getColumnValue(row, 'commission %', ' commission % ', 'Commission %')),
                commission_earned: parseMoney(getColumnValue(row, 'Commission earned', ' Commission earned ', 'Commission Earned')),
                commission_125x: parseMoney(getColumnValue(row, '1.25X', ' 1.25X ')),
                bonus: parseMoney(getColumnValue(row, 'Bonus', ' Bonus ')),
                source_file: filename,
                sheet_name: sheetName
            };
            
            try {
                await queryFn('SAVEPOINT agent_row_insert');
                
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
                
                await queryFn('RELEASE SAVEPOINT agent_row_insert');
                
                if (upsertResult.rows[0].inserted) {
                    summary.agents_us.inserted++;
                } else {
                    summary.agents_us.updated++;
                }
            } catch (insertError) {
                await queryFn('ROLLBACK TO SAVEPOINT agent_row_insert');
                throw insertError;
            }
            
        } catch (error) {
            if (rowNum <= 5 || summary.agents_us.skipped < 10) {
                summary.addDebugLog(`Agent US Row ${rowNum} - ERROR: ${error.message}`);
            }
            summary.addError('agents_us', rowNum, 'Processing error', { error: error.message });
            summary.agents_us.skipped++;
        }
    }
}

/**
 * Process hourly payout data block
 */
async function processHourlyPayoutData(blockData, block, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
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
            
            if (rowNum <= 5) {
                summary.addDebugLog(`Hourly Row ${rowNum} - Name: "${nameRaw}", NameColIdx: ${block.nameColIdx}, Columns: ${Object.keys(row).slice(0, 5).join(', ')}...`);
            }
            
            if (!nameRaw) {
                if (rowNum <= 5 || summary.hourly.skipped < 10) {
                    summary.addDebugLog(`Hourly Row ${rowNum} - SKIPPED: Missing employee name`);
                }
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
                
                try {
                    await queryFn('SAVEPOINT hourly_row_insert');
                    
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
                    
                    await queryFn('RELEASE SAVEPOINT hourly_row_insert');
                    
                    if (upsertResult.rows[0].inserted) {
                        summary.hourly.inserted++;
                    } else {
                        summary.hourly.updated++;
                    }
                } catch (insertError) {
                    await queryFn('ROLLBACK TO SAVEPOINT hourly_row_insert');
                    throw insertError;
                }
            }
            
        } catch (error) {
            if (rowNum <= 5 || summary.hourly.skipped < 10) {
                summary.addDebugLog(`Hourly Row ${rowNum} - ERROR: ${error.message}`);
            }
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
        summary.addDebugLog(`Parsing period from sheet name: "${actualSheetName}"`);
        const periodMonth = parsePeriodFromSheetName(actualSheetName);
        summary.addDebugLog(`Parsed period result: ${periodMonth}`);
        
        if (!periodMonth) {
            // Default to July 2025 if parsing fails
            const defaultPeriod = '2025-07-01';
            summary.addDebugLog(`Period parsing failed, using default: ${defaultPeriod}`);
            summary.period_month = defaultPeriod;
        } else {
            summary.period_month = periodMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
            summary.addDebugLog(`Using parsed period: ${summary.period_month}`);
        }
        
        // Detect all blocks
        const blocks = detectAllBlocks(data);
        
        summary.addDebugLog(`Block detection results: Main=${blocks.main ? 'Row ' + blocks.main.headerRow : 'Not found'}, Agent US=${blocks.agents_us ? 'Row ' + blocks.agents_us.headerRow : 'Not found'}, Hourly=${blocks.hourly ? 'Row ' + blocks.hourly.headerRow : 'Not found'}`);
        
        // Start database transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Process each block if detected
            if (blocks.main) {
                summary.addDebugLog('Processing main commission block...');
                const mainBlockData = extractBlockData(data, blocks.main);
                summary.addDebugLog(`Extracted ${mainBlockData.length} rows from main block`);
                summary.addDebugLog(`First 2 main rows: ${JSON.stringify(mainBlockData.slice(0, 2))}`);
                
                await processMainCommissionData(mainBlockData, summary.period_month, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed main commission block with ${mainBlockData.length} rows`);
                summary.addDebugLog(`Main block results: ${summary.main.inserted} inserted, ${summary.main.updated} updated, ${summary.main.skipped} skipped`);
            } else {
                summary.addWarning('Main commission block not detected');
                summary.addDebugLog('WARNING: Main commission block not detected');
            }
            
            if (blocks.agents_us) {
                summary.addDebugLog('Processing agents US commission block...');
                const agentsUSBlockData = extractBlockData(data, blocks.agents_us);
                summary.addDebugLog(`Extracted ${agentsUSBlockData.length} rows from agents US block`);
                
                await processAgentUSCommissionData(agentsUSBlockData, summary.period_month, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed agents US commission block with ${agentsUSBlockData.length} rows`);
                summary.addDebugLog(`Agents US block results: ${summary.agents_us.inserted} inserted, ${summary.agents_us.updated} updated, ${summary.agents_us.skipped} skipped`);
            } else {
                summary.addWarning('Agents US commission block not detected');
                summary.addDebugLog('WARNING: Agents US commission block not detected');
            }
            
            if (blocks.hourly) {
                summary.addDebugLog('Processing hourly payout block...');
                const hourlyBlockData = extractBlockData(data, blocks.hourly);
                summary.addDebugLog(`Extracted ${hourlyBlockData.length} rows from hourly block`);
                
                await processHourlyPayoutData(hourlyBlockData, blocks.hourly, summary.period_month, filename, actualSheetName, summary, client);
                summary.addWarning(`Processed hourly payout block with ${hourlyBlockData.length} rows`);
                summary.addDebugLog(`Hourly block results: ${summary.hourly.inserted} inserted, ${summary.hourly.updated} updated, ${summary.hourly.skipped} skipped`);
            } else {
                summary.addWarning('Hourly payout block not detected');
                summary.addDebugLog('WARNING: Hourly payout block not detected');
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
