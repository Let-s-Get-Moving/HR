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
 * Parse 4-week commission period from cell text
 * Example input: "Two pay-periods in June:  May 19- June 1 & June 2- June 15"
 * Returns: { period_start, period_end, payday_1, payday_2 }
 */
function parseCommissionPeriod(cellText, year = new Date().getFullYear()) {
    if (!cellText || typeof cellText !== 'string') {
        return null;
    }
    
    console.log(`[parseCommissionPeriod] Parsing: "${cellText}"`);
    
    // Match patterns like: "May 19- June 1 & June 2- June 15"
    // Or: "May 19-June 1 & June 2-June 15"
    const periodRegex = /([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2})\s*&\s*([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2})/;
    const match = cellText.match(periodRegex);
    
    if (!match) {
        console.log('[parseCommissionPeriod] No match found');
        return null;
    }
    
    const [_, month1, day1, month2, day2, month3, day3, month4, day4] = match;
    
    console.log(`[parseCommissionPeriod] Matched: ${month1} ${day1} - ${month2} ${day2} & ${month3} ${day3} - ${month4} ${day4}`);
    
    // Month name to number mapping
    const monthMap = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    // Parse dates
    const period1Start = new Date(year, monthMap[month1.toLowerCase()], parseInt(day1));
    const period1End = new Date(year, monthMap[month2.toLowerCase()], parseInt(day2));
    const period2Start = new Date(year, monthMap[month3.toLowerCase()], parseInt(day3));
    const period2End = new Date(year, monthMap[month4.toLowerCase()], parseInt(day4));
    
    // Calculate paydays (5 days after each period ends - period ends on Sunday, payday on Friday)
    const payday1 = new Date(period1End);
    payday1.setDate(payday1.getDate() + 5);
    
    const payday2 = new Date(period2End);
    payday2.setDate(payday2.getDate() + 5);
    
    // Format as YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const result = {
        period_start: formatDate(period1Start),
        period_end: formatDate(period2End),
        payday_1: formatDate(payday1),
        payday_2: formatDate(payday2),
        period_month: formatDate(new Date(year, monthMap[month1.toLowerCase()], 1)) // Keep for backwards compat
    };
    
    console.log(`[parseCommissionPeriod] Result:`, result);
    return result;
}

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
 * Find employee by name - DOES NOT CREATE (employees must exist in timecard uploads first)
 */
async function findEmployeeOnly(nameRaw, queryFn) {
    if (!nameRaw || typeof nameRaw !== 'string') {
        throw new Error('Invalid employee name');
    }
    
    const nameKey = normalizeNameKey(nameRaw);
    if (!nameKey) {
        throw new Error('Employee name cannot be empty');
    }
    
    console.log(`[findEmployeeOnly] Searching for: "${nameRaw}" → normalized: "${nameKey}"`);
    
    // Try to find by normalized name
    // SQL applies same normalization: lowercase, trim, collapse spaces, remove special chars
    const existingResult = await queryFn(`
        SELECT id, first_name, last_name
        FROM employees 
        WHERE TRIM(REGEXP_REPLACE(
            REGEXP_REPLACE(
                LOWER(TRIM(first_name || ' ' || last_name)),
                '[^a-z0-9\\s-]', '', 'g'
            ),
            '\\s+', ' ', 'g'
        )) = $1
        LIMIT 1
    `, [nameKey]);
    
    if (existingResult.rows.length > 0) {
        console.log(`[findEmployeeOnly] ✓ FOUND existing ID ${existingResult.rows[0].id} for "${nameRaw}"`);
        return existingResult.rows[0].id;
    }
    
    // Employee not found - DO NOT CREATE
    console.log(`[findEmployeeOnly] ✗ NOT FOUND - "${nameRaw}" must exist in timecard uploads first`);
    throw new Error(`Employee "${nameRaw}" not found. Upload timecards first to create employee records.`);
}

/**
 * Process main commission data block
 */
async function processMainCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    // Extract period info from summary if available
    const periodStart = summary.period_start || null;
    const periodEnd = summary.period_end || null;
    const payday1 = summary.payday_1 || null;
    const payday2 = summary.payday_2 || null;
    
    summary.addDebugLog(`Starting to process ${blockData.length} rows in main commission data`);
    summary.addDebugLog(`Using period: ${periodMonth}`);
    
    // Track parking pass fees - collect names who need to be marked
    const parkingPassNames = new Set();
    
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
            
            // Try to find employee (optional - commission data stored regardless)
            let employeeId = null;
            try {
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Finding employee: "${nameRaw}"`);
                }
                employeeId = await findEmployeeOnly(nameRaw, queryFn);
                // ALWAYS log employee matching to detect duplicate issues
                summary.addDebugLog(`✓ Row ${rowNum}: "${nameRaw}" → Employee ID ${employeeId}`);
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Employee ID: ${employeeId}`);
                }
            } catch (error) {
                // Employee not found - that's OK, store commission with name_raw only
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - Employee not found, storing with name only: "${nameRaw}"`);
                }
                employeeId = null; // Will use name_raw instead
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
            
            // Enable debug logging for first row
            const debug = rowNum === 1 ? 'Row1' : null;
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                period_start: periodStart,
                period_end: periodEnd,
                payday_1: payday1,
                payday_2: payday2,
                name_raw: nameRaw,
                hourly_rate: parseMoney(getColumnValue(row, 'Hourly Rate', ' Hourly Rate '), debug ? `${debug}_hourly_rate` : null),
                rev_sm_all_locations: parseMoney(getColumnValue(row, 'Revenue on Smart Moving (All locations combined )', ' Revenue on Smart Moving (All locations combined ) '), debug ? `${debug}_rev_sm` : null),
                rev_add_ons: parseMoney(getColumnValue(row, 'Revenue Add Ons+', ' Revenue Add Ons+ ', 'Revenue Add Ons'), debug ? `${debug}_rev_add_ons` : null),
                rev_deduction: parseMoney(getColumnValue(row, 'Revenue Deduction', ' Revenue Deduction '), debug ? `${debug}_rev_deduction` : null),
                total_revenue_all: parseMoney(getColumnValue(row, 'Total Revenue(all locations combined )', ' Total Revenue(all locations combined ) '), debug ? `${debug}_total_rev` : null),
                booking_pct: parsePercent(getColumnValue(row, 'Booking %', ' Booking % ')),
                commission_pct: parsePercent(getColumnValue(row, 'Commission %', ' Commission % ')),
                commission_earned: parseMoney(getColumnValue(row, 'Commission Earned', ' Commission Earned '), debug ? `${debug}_commission_earned` : null),
                spiff_bonus: parseMoney(getColumnValue(row, 'Spiff Bonus', ' Spiff Bonus '), debug ? `${debug}_spiff` : null),
                revenue_bonus: parseMoney(getColumnValue(row, 'Revenue Bonus', ' Revenue Bonus '), debug ? `${debug}_rev_bonus` : null),
                bonus_us_jobs_125x: parseMoney(getColumnValue(row, 'Bonuses for booking US jobs  1.25X', ' Bonuses for booking US jobs  1.25X '), debug ? `${debug}_bonus_125x` : null),
                booking_bonus_plus: parseMoney(getColumnValue(row, '$5/$10 Bonus for Booking Bonus', ' $5/$10 Bonus for Booking Bonus '), debug ? `${debug}_booking_plus` : null),
                booking_bonus_minus: parseMoney(getColumnValue(row, '$5/$10 Deduction for Booking Bonus', ' $5/$10 Deduction for Booking Bonus '), debug ? `${debug}_booking_minus` : null),
                hourly_paid_out_minus: parseMoney(getColumnValue(row, '- Hourly Paid Out', ' - Hourly Paid Out '), debug ? `${debug}_hourly_paid_out` : null),
                deduction_sales_manager_minus: parseMoney(getColumnValue(row, '-Deduction by Sales Manager', ' -Deduction by Sales Manager '), debug ? `${debug}_ded_sales_mgr` : null),
                deduction_missing_punch_minus: parseMoney(getColumnValue(row, 'Deductions for missing punch in/out on the time report for all pay periods of the month', ' Deductions for missing punch in/out …', 'Deductions for missing punch in/out'), debug ? `${debug}_ded_punch` : null),
                deduction_customer_support_minus: parseMoney(getColumnValue(row, 'Deductions from Customer Support', ' Deductions from Customer Support '), debug ? `${debug}_ded_cs` : null),
                deduction_post_commission_collected_minus: parseMoney(getColumnValue(row, 'Deduction Post Commission collected', ' Deduction Post Commission collected '), debug ? `${debug}_ded_post_comm` : null),
                deduction_dispatch_minus: parseMoney(getColumnValue(row, 'Deductions from dispatch', ' Deductions from dispatch '), debug ? `${debug}_ded_dispatch` : null),
                deduction_other_minus: parseMoney(getColumnValue(row, 'deduction', ' deduction '), debug ? `${debug}_ded_other` : null),
                total_due: parseMoney(getColumnValue(row, 'Total due', ' Total due '), debug ? `${debug}_total_due` : null),
                amount_paid: parseMoney(getColumnValue(row, 'Amount paid (date included in comment)', ' Amount paid (date included in comment) '), debug ? `${debug}_amount_paid` : null),
                remaining_amount: parseMoney(getColumnValue(row, 'Remaining amount', ' Remaining amount '), debug ? `${debug}_remaining` : null),
                corporate_open_jobs_note: cleanCellValue(getColumnValue(row, 'CORPORATE LOCATIONS JOBS STILL OPEN', ' CORPORATE LOCATIONS JOBS STILL OPEN …')),
                parking_pass_fee_note: null, // Will be set in second pass if this person owes parking fees
                source_file: filename,
                sheet_name: sheetName
            };
            
            // If this row mentions someone who owes parking fees, collect their name
            const parkingPassName = cleanCellValue(getColumnValue(row, 'Paid parking pass fee to be deducted from', ' Paid parking pass fee to be deducted from '));
            if (parkingPassName && parkingPassName.trim()) {
                parkingPassNames.add(parkingPassName.trim());
                summary.addDebugLog(`🅿️ Parking fee: ${parkingPassName} owes parking pass fee`);
            }
            
            // Debug log for first few rows
            if (rowNum <= 3) {
                summary.addDebugLog(`Row ${rowNum} - Prepared data for DB: hourly_rate=${data.hourly_rate}, commission_earned=${data.commission_earned}, total_due=${data.total_due}, amount_paid=${data.amount_paid}`);
            }
            
            // Use savepoint for each row to allow recovery from errors
            try {
                await queryFn('SAVEPOINT row_insert');
                
                // Check if record exists for this name + period
                const existing = await queryFn(`
                    SELECT id FROM employee_commission_monthly
                    WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($1)) AND period_month = $2
                `, [nameRaw, periodMonth]);
                
                let upsertResult;
                if (existing.rows.length > 0) {
                    // UPDATE existing record
                    upsertResult = await queryFn(`
                        UPDATE employee_commission_monthly
                        SET employee_id = $1, name_raw = $3, hourly_rate = $4, rev_sm_all_locations = $5,
                            rev_add_ons = $6, rev_deduction = $7, total_revenue_all = $8, booking_pct = $9, commission_pct = $10,
                            commission_earned = $11, spiff_bonus = $12, revenue_bonus = $13, bonus_us_jobs_125x = $14,
                            booking_bonus_plus = $15, booking_bonus_minus = $16, hourly_paid_out_minus = $17,
                            deduction_sales_manager_minus = $18, deduction_missing_punch_minus = $19,
                            deduction_customer_support_minus = $20, deduction_post_commission_collected_minus = $21,
                            deduction_dispatch_minus = $22, deduction_other_minus = $23, total_due = $24, amount_paid = $25,
                            remaining_amount = $26, corporate_open_jobs_note = $27, parking_pass_fee_note = $28,
                            source_file = $29, sheet_name = $30, updated_at = CURRENT_TIMESTAMP
                        WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($3)) AND period_month = $2
                        RETURNING id
                    `, Object.values(data));
                } else {
                    // INSERT new record
                    upsertResult = await queryFn(`
                        INSERT INTO employee_commission_monthly (
                            employee_id, period_month, period_start, period_end, payday_1, payday_2,
                            name_raw, hourly_rate, rev_sm_all_locations,
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
                            $29, $30, $31, $32, $33, $34, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                        RETURNING id
                    `, Object.values(data));
                }
                
                await queryFn('RELEASE SAVEPOINT row_insert');
                
                if (rowNum <= 5) {
                    summary.addDebugLog(`Row ${rowNum} - SUCCESS: Record created with ID ${upsertResult.rows[0].id}`);
                }
                
                // Record as inserted (we deleted old record if it existed)
                summary.main.inserted++;
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
    
    // Second pass: Mark employees who owe parking pass fees
    if (parkingPassNames.size > 0) {
        summary.addDebugLog(`🅿️ Processing ${parkingPassNames.size} parking pass fee assignments...`);
        
        for (const name of parkingPassNames) {
            try {
                // Find employee by normalized name and update their parking_pass_fee_note
                const employeeId = await findEmployeeOnly(name, queryFn);
                
                await queryFn(`
                    UPDATE employee_commission_monthly
                    SET parking_pass_fee_note = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE employee_id = $2 AND period_month = $3
                `, [name, employeeId, periodMonth]);
                
                summary.addDebugLog(`🅿️ Marked parking fee for: ${name} (Employee ID ${employeeId})`);
            } catch (error) {
                summary.addDebugLog(`⚠️ Failed to mark parking fee for: ${name} - ${error.message}`);
            }
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
    
    // Extract period info from summary if available
    const periodStart = summary.period_start || null;
    const periodEnd = summary.period_end || null;
    const payday1 = summary.payday_1 || null;
    const payday2 = summary.payday_2 || null;
    
    for (let i = 0; i < blockData.length; i++) {
        const row = blockData[i];
        const rowNum = i + 1;
        
        try {
            // Agent US uses "Agents" column for names, not "Name"
            const nameRaw = cleanCellValue(row.Agents || row.Agent || row.Name);
            if (rowNum <= 5) {
                summary.addDebugLog(`Agent US Row ${rowNum} - Name: "${nameRaw}", Raw: "${row.Agents}", Columns: ${Object.keys(row).join(', ')}`);
            }
            if (!nameRaw) {
                if (rowNum <= 5 || summary.agents_us.skipped < 10) {
                    summary.addDebugLog(`Agent US Row ${rowNum} - SKIPPED: Missing employee name`);
                }
                summary.addError('agents_us', rowNum, 'Missing employee name');
                summary.agents_us.skipped++;
                continue;
            }
            
            // Try to find employee (optional - commission data stored regardless)
            let employeeId = null;
            try {
                employeeId = await findEmployeeOnly(nameRaw, queryFn);
                summary.addDebugLog(`✓ Agent US Row ${rowNum}: "${nameRaw}" → Employee ID ${employeeId}`);
            } catch (error) {
                // Employee not found - that's OK, store commission with name_raw only
                summary.addDebugLog(`Agent US Row ${rowNum}: Employee not found, storing with name only: "${nameRaw}"`);
                employeeId = null; // Will use name_raw instead
            }
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                period_start: periodStart,
                period_end: periodEnd,
                payday_1: payday1,
                payday_2: payday2,
                name_raw: nameRaw,
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
                
                // Check if record exists for this name + period
                const existing = await queryFn(`
                    SELECT id FROM agent_commission_us
                    WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($1)) AND period_month = $2
                `, [nameRaw, periodMonth]);
                
                let upsertResult;
                if (existing.rows.length > 0) {
                    // UPDATE existing record
                    upsertResult = await queryFn(`
                        UPDATE agent_commission_us
                        SET employee_id = $1, name_raw = $3, total_us_revenue = $4, commission_pct = $5,
                            commission_earned = $6, commission_125x = $7, bonus = $8, source_file = $9, sheet_name = $10,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($3)) AND period_month = $2
                        RETURNING id
                    `, Object.values(data));
                } else {
                    // INSERT new record
                    upsertResult = await queryFn(`
                        INSERT INTO agent_commission_us (
                            employee_id, period_month, period_start, period_end, payday_1, payday_2,
                            name_raw, total_us_revenue, commission_pct,
                            commission_earned, commission_125x, bonus, source_file, sheet_name,
                            created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id
                    `, Object.values(data));
                }
                
                await queryFn('RELEASE SAVEPOINT agent_row_insert');
                
                // Record as inserted (we deleted old record if it existed)
                summary.agents_us.inserted++;
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
 * Structure: Name | Date1 | cash paid | Date2 | cash paid | TOTAL
 */
async function processHourlyPayoutData(blockData, block, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    // Parse column structure to identify date periods and cash paid flags
    const columnNames = blockData.length > 0 ? Object.keys(blockData[0]) : [];
    const datePeriods = [];
    let totalColumnName = null;
    
    summary.addDebugLog(`📋 All hourly columns: ${columnNames.join(' | ')}`);
    
    // Find the name column name
    let nameColumnName = null;
    for (const [colName, colIdx] of Object.entries(block.columns)) {
        if (colIdx === block.nameColIdx) {
            nameColumnName = colName;
            break;
        }
    }
    
    for (let i = 0; i < columnNames.length; i++) {
        const colName = columnNames[i];
        const colLower = colName.toLowerCase().trim();
        
        // Skip name column
        if (colName === nameColumnName) continue;
        
        // Check if this is the TOTAL column
        if (colLower.includes('total') && colLower.includes('hourly')) {
            totalColumnName = colName;
            summary.addDebugLog(`💰 Found TOTAL column: "${colName}"`);
            continue;
        }
        
        // Skip any column that looks like a total/commission/summary column (but not the main TOTAL)
        if (colLower.includes('total') || colLower.includes('commission')) {
            summary.addDebugLog(`⏩ Skipping summary column: "${colName}"`);
            continue;
        }
        
        // Check if this is a "cash paid" column
        if (colLower.includes('cash') && colLower.includes('paid')) {
            summary.addDebugLog(`💵 Skipping cash paid column: "${colName}"`);
            continue; // Skip, we'll handle this when processing the previous date column
        }
        
        // Skip purely numeric columns (likely Excel date serial numbers or errors)
        // Excel date serials like 14255.42361 should not be treated as date periods
        if (/^\d+\.?\d*$/.test(colName.trim())) {
            summary.addDebugLog(`⚠️ Skipping numeric column (likely Excel error): "${colName}"`);
            continue;
        }
        
        // This is a date period column
        const nextCol = columnNames[i + 1];
        const isCashPaidNext = nextCol && nextCol.toLowerCase().includes('cash') && nextCol.toLowerCase().includes('paid');
        
        summary.addDebugLog(`📅 Date period: "${colName}" ${isCashPaidNext ? '(has cash paid column)' : ''}`);
        datePeriods.push({
            label: colName,
            cashPaidColumn: isCashPaidNext ? nextCol : null
        });
    }
    
    if (datePeriods.length === 0) {
        summary.addDebugLog(`⚠️ No date period columns found in hourly payout block`);
    } else {
        summary.addDebugLog(`📅 Found ${datePeriods.length} date periods: ${datePeriods.map(p => p.label).join(', ')}`);
    }
    
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
                summary.addDebugLog(`Hourly Row ${rowNum} - Name: "${nameRaw}"`);
            }
            
            if (!nameRaw) {
                if (rowNum <= 5 || summary.hourly.skipped < 10) {
                    summary.addDebugLog(`Hourly Row ${rowNum} - SKIPPED: Missing employee name`);
                }
                summary.addError('hourly', rowNum, 'Missing employee name');
                summary.hourly.skipped++;
                continue;
            }
            
            // Try to find employee (optional - hourly data stored regardless)
            let employeeId = null;
            try {
                employeeId = await findEmployeeOnly(nameRaw, queryFn);
                summary.addDebugLog(`✓ Hourly Row ${rowNum}: "${nameRaw}" → Employee ID ${employeeId}`);
            } catch (error) {
                // Employee not found - that's OK, store hourly data with name_raw only
                summary.addDebugLog(`Hourly Row ${rowNum}: Employee not found, storing with name only: "${nameRaw}"`);
                employeeId = null; // Will use name_raw instead
            }
            
            // Extract date period data - ALWAYS include all periods to preserve structure
            const periods = [];
            for (const period of datePeriods) {
                // CRITICAL: Check BOTH date column AND cash paid column for amounts
                // Sometimes the amount is in the date column, sometimes in cash paid column
                let amount = parseMoney(row[period.label]);
                let cashPaid = false;
                
                // If date column is empty/null, check the cash paid column for the amount
                if ((amount === null || amount === 0) && period.cashPaidColumn) {
                    const cashPaidAmount = parseMoney(row[period.cashPaidColumn]);
                    if (cashPaidAmount !== null && cashPaidAmount !== 0) {
                        amount = cashPaidAmount;
                        cashPaid = true; // Mark as cash paid since we got amount from cash column
                    }
                } else if (amount !== null && amount !== 0 && period.cashPaidColumn) {
                    // Amount is in date column, but check if cash paid column has a value/checkmark
                    const cashPaidValue = row[period.cashPaidColumn];
                    cashPaid = Boolean(cashPaidValue);
                }
                
                // Include ALL periods, even if amount is 0, to preserve column structure
                periods.push({
                    label: period.label,
                    amount: amount || 0,
                    cash_paid: cashPaid
                });
                
                if (rowNum <= 3) {
                    summary.addDebugLog(`  Period "${period.label}": amount=${amount}, cash_paid=${cashPaid}, cashPaidCol="${period.cashPaidColumn}"`);
                }
            }
            
            // Get total
            const totalAmount = totalColumnName ? parseMoney(row[totalColumnName]) : null;
            
            if (periods.length === 0 && !totalAmount) {
                if (rowNum <= 5) {
                    summary.addDebugLog(`Hourly Row ${rowNum} - SKIPPED: No payout data`);
                }
                summary.hourly.skipped++;
                continue;
            }
            
            const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                period_start: periodStart,
                period_end: periodEnd,
                payday_1: payday1,
                payday_2: payday2,
                name_raw: nameRaw,
                date_periods: JSON.stringify(periods),
                total_for_month: totalAmount,
                source_file: filename,
                sheet_name: sheetName
            };
            
            try {
                await queryFn('SAVEPOINT hourly_row_insert');
                
                // Check if record exists for this name + period
                const existing = await queryFn(`
                    SELECT id FROM hourly_payout
                    WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($1)) AND period_month = $2
                `, [nameRaw, periodMonth]);
                
                let upsertResult;
                if (existing.rows.length > 0) {
                    // UPDATE existing record
                    upsertResult = await queryFn(`
                        UPDATE hourly_payout
                        SET employee_id = $1, name_raw = $3, date_periods = $4::jsonb, 
                            total_for_month = $5, source_file = $6, sheet_name = $7, updated_at = CURRENT_TIMESTAMP
                        WHERE LOWER(TRIM(name_raw)) = LOWER(TRIM($3)) AND period_month = $2
                        RETURNING id
                    `, Object.values(data));
                } else {
                    // INSERT new record
                    upsertResult = await queryFn(`
                        INSERT INTO hourly_payout (
                        employee_id, period_month, period_start, period_end, payday_1, payday_2,
                        name_raw, date_periods, total_for_month,
                        source_file, sheet_name, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                        RETURNING id
                    `, Object.values(data));
                }
                
                await queryFn('RELEASE SAVEPOINT hourly_row_insert');
                
                // Record as inserted (we deleted old record if it existed)
                summary.hourly.inserted++;
            } catch (insertError) {
                await queryFn('ROLLBACK TO SAVEPOINT hourly_row_insert');
                throw insertError;
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
export async function importCommissionsFromExcel(fileBuffer, filename, sheetName = null, manualPeriodMonth = null) {
    const summary = new ImportSummary(filename, sheetName || 'default');
    
    try {
        // Load Excel workbook
        const workbook = loadExcelWorkbook(fileBuffer);
        const actualSheetName = sheetName || workbook.SheetNames[workbook.SheetNames.length - 1];
        summary.sheet = actualSheetName;
        
        // Get worksheet data
        const data = getWorksheetData(workbook, actualSheetName);
        
        // Try to parse 4-week period from cell A1
        let periodInfo = null;
        if (data && data.length > 0 && data[0]) {
            // Cell A1 should contain period text like "Two pay-periods in June:  May 19- June 1 & June 2- June 15"
            const cellA1 = data[0][Object.keys(data[0])[0]]; // Get first column value of first row
            summary.addDebugLog(`Cell A1 content: "${cellA1}"`);
            
            periodInfo = parseCommissionPeriod(cellA1);
            if (periodInfo) {
                summary.addDebugLog(`Parsed 4-week period from cell A1: ${periodInfo.period_start} to ${periodInfo.period_end}`);
                summary.addDebugLog(`Paydays: ${periodInfo.payday_1}, ${periodInfo.payday_2}`);
                summary.period_month = periodInfo.period_month;
                summary.period_start = periodInfo.period_start;
                summary.period_end = periodInfo.period_end;
                summary.payday_1 = periodInfo.payday_1;
                summary.payday_2 = periodInfo.payday_2;
            }
        }
        
        // Fallback: Determine period month (priority: manual > parsed > default)
        if (!periodInfo) {
            summary.addDebugLog('Failed to parse period from cell A1, falling back to sheet name/filename parsing');
            
            if (manualPeriodMonth) {
                // Manual period provided (e.g., "2025-08-01")
                summary.addDebugLog(`Using manual period override: ${manualPeriodMonth}`);
                summary.period_month = manualPeriodMonth;
            } else {
                // Try to parse from sheet name first
                summary.addDebugLog(`Parsing period from sheet name: "${actualSheetName}"`);
                let periodMonth = parsePeriodFromSheetName(actualSheetName);
                summary.addDebugLog(`Parsed period from sheet name result: ${periodMonth}`);
                
                // If sheet name parsing failed, try filename
                if (!periodMonth) {
                    summary.addDebugLog(`Sheet name parsing failed, trying filename: "${filename}"`);
                    periodMonth = parsePeriodFromSheetName(filename);
                    summary.addDebugLog(`Parsed period from filename result: ${periodMonth}`);
                }
                
                if (!periodMonth) {
                    // Default to July 2025 if both parsing attempts fail
                    const defaultPeriod = '2025-07-01';
                    summary.addDebugLog(`Period parsing failed for both sheet name and filename, using default: ${defaultPeriod}`);
                    summary.period_month = defaultPeriod;
                } else {
                    // parsePeriodFromSheetName now returns a string in 'YYYY-MM-DD' format
                    summary.period_month = periodMonth;
                    summary.addDebugLog(`Using parsed period: ${summary.period_month}`);
                }
            }
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
