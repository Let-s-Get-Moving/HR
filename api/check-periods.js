/**
 * Check what periods have data in the system
 */

import { pool } from './src/db.js';

async function checkPeriods() {
    console.log('📅 CHECKING AVAILABLE DATA PERIODS\n');
    
    try {
        // Check Sales Performance periods
        console.log('Sales Performance Staging:');
        const perfResult = await pool.query(`
            SELECT period_start, period_end, COUNT(*) as people_count, SUM(booked_total) as total_revenue
            FROM sales_performance_staging
            GROUP BY period_start, period_end
            ORDER BY period_start DESC
            LIMIT 10
        `);
        
        if (perfResult.rows.length === 0) {
            console.log('  No data found\n');
        } else {
            for (const row of perfResult.rows) {
                console.log(`  ${row.period_start} to ${row.period_end}: ${row.people_count} people, $${parseFloat(row.total_revenue).toLocaleString()}`);
            }
            console.log();
        }
        
        // Check Booked Opportunities date ranges
        console.log('Booked Opportunities (by service_date):');
        const oppResult = await pool.query(`
            SELECT 
                MIN(service_date) as earliest,
                MAX(service_date) as latest,
                COUNT(*) as quote_count,
                COUNT(DISTINCT sales_person_raw) as people_count,
                SUM(invoiced_amount) as total_invoiced
            FROM sales_booked_opportunities_quotes
            WHERE invoiced_amount IS NOT NULL
        `);
        
        if (oppResult.rows.length === 0 || !oppResult.rows[0].earliest) {
            console.log('  No data found\n');
        } else {
            const row = oppResult.rows[0];
            console.log(`  Date range: ${row.earliest} to ${row.latest}`);
            console.log(`  ${row.quote_count} quotes, ${row.people_count} people, $${parseFloat(row.total_invoiced).toLocaleString()}`);
            console.log();
        }
        
        // Check commission calculation results
        console.log('Calculated Commission Periods:');
        const commResult = await pool.query(`
            SELECT DISTINCT period_start, period_end
            FROM sales_agent_commissions
            ORDER BY period_start DESC
            LIMIT 10
        `);
        
        if (commResult.rows.length === 0) {
            console.log('  No calculations found\n');
        } else {
            for (const row of commResult.rows) {
                console.log(`  ${row.period_start} to ${row.period_end}`);
            }
            console.log();
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPeriods().catch(console.error);
