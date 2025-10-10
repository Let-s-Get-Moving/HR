/**
 * Script to update commission importer to add period fields to agent_commission_us and hourly_payout
 * This complements the changes already made to employee_commission_monthly
 */

const fs = require('fs');
const path = require('path');

const importerPath = path.join(__dirname, '../api/src/utils/commissionImporter.js');
let content = fs.readFileSync(importerPath, 'utf8');

console.log('Updating commission importer for agent_commission_us and hourly_payout tables...\n');

// 1. Update processAgentUSCommissionData function to extract period info
const agentFunctionStart = 'async function processAgentUSCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {';
const agentFunctionReplacement = `async function processAgentUSCommissionData(blockData, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    // Extract period info from summary if available
    const periodStart = summary.period_start || null;
    const periodEnd = summary.period_end || null;
    const payday1 = summary.payday_1 || null;
    const payday2 = summary.payday_2 || null;`;

if (content.includes(agentFunctionStart)) {
    const regex = new RegExp(agentFunctionStart.replace(/[()]/g, '\\$&') + '\\s*const queryFn[^;]+;', 's');
    content = content.replace(regex, agentFunctionReplacement);
    console.log('✅ Updated processAgentUSCommissionData to extract period info');
}

// 2. Update agent_commission_us data object
content = content.replace(
    /const data = \{\s*employee_id: employeeId,\s*period_month: periodMonth,\s*name_raw: nameRaw,/g,
    `const data = {
                employee_id: employeeId,
                period_month: periodMonth,
                period_start: periodStart,
                period_end: periodEnd,
                payday_1: payday1,
                payday_2: payday2,
                name_raw: nameRaw,`
);
console.log('✅ Updated agent_commission_us data object');

// 3. Update agent_commission_us INSERT statement
content = content.replace(
    /INSERT INTO agent_commission_us \(\s*employee_id, period_month, name_raw,/g,
    `INSERT INTO agent_commission_us (
                            employee_id, period_month, period_start, period_end, payday_1, payday_2,
                            name_raw,`
);

// Update VALUES clause for agent_commission_us (add 4 more parameters)
content = content.replace(
    /\) VALUES \(\s*\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10,\s*\$11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\s*\)\s*RETURNING id\s*`, Object.values\(data\)\);/g,
    `) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                            $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                        RETURNING id
                    \`, Object.values(data));`
);
console.log('✅ Updated agent_commission_us INSERT statement');

// 4. Update processHourlyPayoutData function
const hourlyFunctionStart = 'async function processHourlyPayoutData(blockData, blockInfo, periodMonth, filename, sheetName, summary, client) {';
const hourlyFunctionReplacement = `async function processHourlyPayoutData(blockData, blockInfo, periodMonth, filename, sheetName, summary, client) {
    const queryFn = client ? 
        (sql, params) => client.query(sql, params) : 
        q;
    
    // Extract period info from summary if available
    const periodStart = summary.period_start || null;
    const periodEnd = summary.period_end || null;
    const payday1 = summary.payday_1 || null;
    const payday2 = summary.payday_2 || null;`;

if (content.includes(hourlyFunctionStart)) {
    const regex = new RegExp(hourlyFunctionStart.replace(/[()]/g, '\\$&') + '\\s*const queryFn[^;]+;', 's');
    content = content.replace(regex, hourlyFunctionReplacement);
    console.log('✅ Updated processHourlyPayoutData to extract period info');
}

// 5. Update hourly_payout INSERT statement  
content = content.replace(
    /INSERT INTO hourly_payout \(\s*employee_id, period_month, name_raw, date_periods, total_for_month,\s*source_file, sheet_name, created_at, updated_at\s*\) VALUES \(\s*\$1, \$2, \$3, \$4::jsonb, \$5, \$6, \$7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\s*\)/g,
    `INSERT INTO hourly_payout (
                        employee_id, period_month, period_start, period_end, payday_1, payday_2,
                        name_raw, date_periods, total_for_month,
                        source_file, sheet_name, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )`
);

// Update the array for hourly_payout VALUES
content = content.replace(
    /\[employeeId, periodMonth, nameRaw, JSON\.stringify\(datePeriods\), totalForMonth, filename, sheetName\]/g,
    `[employeeId, periodMonth, periodStart, periodEnd, payday1, payday2, nameRaw, JSON.stringify(datePeriods), totalForMonth, filename, sheetName]`
);
console.log('✅ Updated hourly_payout INSERT statement');

// Write the updated content
fs.writeFileSync(importerPath, content, 'utf8');
console.log('\n✅ Commission importer updated successfully!');
console.log('All three tables now include period_start, period_end, payday_1, payday_2 fields.');

