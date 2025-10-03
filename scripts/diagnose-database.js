import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    const client = await pool.connect();
    
    try {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 DATABASE DIAGNOSIS - TIME TRACKING');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Check timecard_uploads table
        console.log('📋 TIMECARD_UPLOADS TABLE:');
        const uploads = await client.query(`
            SELECT id, filename, pay_period_start, pay_period_end, 
                   employee_count, total_hours, status, upload_date
            FROM timecard_uploads
            ORDER BY upload_date DESC
            LIMIT 5
        `);
        console.log(`   Total uploads: ${uploads.rows.length}`);
        uploads.rows.forEach(u => {
            console.log(`   - Upload #${u.id}: ${u.filename}`);
            console.log(`     Period: ${u.pay_period_start} to ${u.pay_period_end}`);
            console.log(`     Employee count: ${u.employee_count}, Hours: ${u.total_hours}`);
            console.log(`     Status: ${u.status}`);
        });
        
        // Check timecards table
        console.log('\n📊 TIMECARDS TABLE:');
        const timecardsCount = await client.query(`SELECT COUNT(*) as count FROM timecards`);
        console.log(`   Total timecards: ${timecardsCount.rows[0].count}`);
        
        if (timecardsCount.rows[0].count > 0) {
            const timecardsSample = await client.query(`
                SELECT id, employee_id, upload_id, pay_period_start, pay_period_end, 
                       total_hours, status
                FROM timecards
                ORDER BY id DESC
                LIMIT 5
            `);
            console.log(`   Sample timecards:`);
            timecardsSample.rows.forEach(tc => {
                console.log(`   - Timecard #${tc.id}: Employee ${tc.employee_id}`);
                console.log(`     Upload ID: ${tc.upload_id || 'NULL (ORPHANED!)'}`);
                console.log(`     Period: ${tc.pay_period_start} to ${tc.pay_period_end}`);
                console.log(`     Hours: ${tc.total_hours}`);
            });
            
            // Check for orphaned timecards
            const orphaned = await client.query(`
                SELECT COUNT(*) as count FROM timecards WHERE upload_id IS NULL
            `);
            console.log(`\n   ⚠️ Orphaned timecards (upload_id = NULL): ${orphaned.rows[0].count}`);
            
            // Check upload_id distribution
            const uploadDist = await client.query(`
                SELECT upload_id, COUNT(*) as count
                FROM timecards
                GROUP BY upload_id
                ORDER BY upload_id
            `);
            console.log(`   Upload ID distribution:`);
            uploadDist.rows.forEach(d => {
                console.log(`     - Upload ID ${d.upload_id || 'NULL'}: ${d.count} timecards`);
            });
        } else {
            console.log('   ❌ TABLE IS COMPLETELY EMPTY!');
        }
        
        // Check timecard_entries table
        console.log('\n📝 TIMECARD_ENTRIES TABLE:');
        const entriesCount = await client.query(`SELECT COUNT(*) as count FROM timecard_entries`);
        console.log(`   Total entries: ${entriesCount.rows[0].count}`);
        
        if (entriesCount.rows[0].count > 0) {
            const entriesSample = await client.query(`
                SELECT tce.id, tce.timecard_id, tce.employee_id, tce.work_date, 
                       tce.hours_worked, tc.upload_id
                FROM timecard_entries tce
                LEFT JOIN timecards tc ON tce.timecard_id = tc.id
                ORDER BY tce.id DESC
                LIMIT 5
            `);
            console.log(`   Sample entries:`);
            entriesSample.rows.forEach(e => {
                console.log(`   - Entry #${e.id}: Employee ${e.employee_id}, Date ${e.work_date}`);
                console.log(`     Timecard ID: ${e.timecard_id}, Upload ID: ${e.upload_id || 'NULL'}`);
                console.log(`     Hours: ${e.hours_worked}`);
            });
        }
        
        // Check JOIN between uploads and timecards
        console.log('\n🔗 JOIN ANALYSIS (uploads <-> timecards):');
        const joinCheck = await client.query(`
            SELECT 
                tu.id as upload_id,
                tu.filename,
                tu.employee_count as expected_employees,
                COUNT(DISTINCT t.id) as actual_timecards,
                COUNT(DISTINCT t.employee_id) as unique_employees
            FROM timecard_uploads tu
            LEFT JOIN timecards t ON t.upload_id = tu.id
            WHERE tu.status = 'processed'
            GROUP BY tu.id, tu.filename, tu.employee_count
        `);
        joinCheck.rows.forEach(j => {
            console.log(`   Upload #${j.upload_id} (${j.filename})`);
            console.log(`     Expected: ${j.expected_employees} employees`);
            console.log(`     Found: ${j.actual_timecards} timecards, ${j.unique_employees} unique employees`);
            if (j.unique_employees === '0') {
                console.log(`     ❌ BROKEN LINK! No timecards linked to this upload!`);
            }
        });
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔍 DATABASE DIAGNOSIS - COMMISSIONS');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Check hourly_payout table
        console.log('💰 HOURLY_PAYOUT TABLE:');
        const hourlyCount = await client.query(`SELECT COUNT(*) as count FROM hourly_payout`);
        console.log(`   Total records: ${hourlyCount.rows[0].count}`);
        
        if (hourlyCount.rows[0].count > 0) {
            const hourlyPeriods = await client.query(`
                SELECT DISTINCT period_month, COUNT(*) as count
                FROM hourly_payout
                GROUP BY period_month
                ORDER BY period_month DESC
            `);
            console.log(`   Available periods:`);
            hourlyPeriods.rows.forEach(p => {
                console.log(`     - ${p.period_month}: ${p.count} records`);
            });
            
            const hourlySample = await client.query(`
                SELECT id, employee_id, name_raw, period_month, 
                       total_for_month, date_periods
                FROM hourly_payout
                ORDER BY id DESC
                LIMIT 5
            `);
            console.log(`   Sample records:`);
            hourlySample.rows.forEach(h => {
                console.log(`   - Record #${h.id}: ${h.name_raw || 'NO NAME'}`);
                console.log(`     Employee ID: ${h.employee_id || 'NULL'}`);
                console.log(`     Period: ${h.period_month}`);
                console.log(`     Total: $${h.total_for_month}`);
                console.log(`     Date periods: ${h.date_periods ? JSON.stringify(h.date_periods).substring(0, 100) : 'NULL'}`);
            });
        } else {
            console.log('   ❌ TABLE IS COMPLETELY EMPTY!');
            console.log('   This confirms hourly_payout was wiped by migration 038.');
        }
        
        // Check other commission tables
        console.log('\n💼 EMPLOYEE_COMMISSION_MONTHLY TABLE:');
        const monthlyCount = await client.query(`SELECT COUNT(*) as count FROM employee_commission_monthly`);
        console.log(`   Total records: ${monthlyCount.rows[0].count}`);
        
        console.log('\n🌎 AGENT_COMMISSION_US TABLE:');
        const agentsCount = await client.query(`SELECT COUNT(*) as count FROM agent_commission_us`);
        console.log(`   Total records: ${agentsCount.rows[0].count}`);
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ DIAGNOSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose().catch(console.error);

